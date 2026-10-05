"""Prepare checked Canada climate-code label candidates from published polygons.

Offline only. Requires Shapely 2.1+. --check validates the committed candidates
without writing. No source geometry, climate classification or display palette
is changed; coordinates come only from polygon representative points.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/atlas/canada-climate-elevation-v1/koppen.geojson"
MANIFEST = ROOT / "public/assets/atlas/canada-climate-elevation-v1/koppen-manifest.json"
FAMILY_REFERENCE = ROOT / "src/data/atlas/natural-environment.ts"
OUTPUT = ROOT / "public/assets/atlas/canada-climate-elevation-v1/climate-labels.json"
STUDY_BOUNDS = [-143, 40, -50, 67]
MAX_LABELS_PER_CODE = 3
MIN_OTHER_PART_FRACTION = 0.02


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def file_record(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def generator_record():
    path = Path(__file__)
    return {"path": path.relative_to(ROOT).as_posix(),
            "sha256": digest(path.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")),
            "digestMethod": "UTF-8 text normalized from CRLF/CR to LF"}


def families():
    text = FAMILY_REFERENCE.read_text(encoding="utf8")
    block = re.search(r"export const climateFamilies = \[(.*?)\];", text, re.S).group(1)
    values = [{"id": identifier, "label": label, "color": color}
              for identifier, label, color in re.findall(r"id:'([ABCDE])',label:'([^']+)',color:'([^']+)'", block)]
    if [value["id"] for value in values] != list("ABCDE"):
        raise ValueError("Expected the US A/B/C/D/E family legend")
    return values


def polygon_parts(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry] if not geometry.is_empty and geometry.area > 0 else []
    if hasattr(geometry, "geoms"):
        return [part for child in geometry.geoms for part in polygon_parts(child)]
    return []


def coordinate(polygon):
    point = polygon.representative_point()
    if not polygon.contains(point):
        raise ValueError("Representative point is not strictly inside its polygon")
    return [point.x, point.y]


def alternatives(polygon, primary, box):
    """Offer two checked points from data-derived thirds of the same component."""
    west, south, east, north = polygon.bounds
    horizontal = east - west >= north - south
    pieces = []
    for third in range(3):
        if horizontal:
            left = west + (east - west) * third / 3
            right = west + (east - west) * (third + 1) / 3
            clip = box(left, south, right, north)
        else:
            bottom = south + (north - south) * third / 3
            top = south + (north - south) * (third + 1) / 3
            clip = box(west, bottom, east, top)
        parts = polygon_parts(polygon.intersection(clip))
        if parts:
            piece = max(parts, key=lambda part: part.area)
            if piece.area < max(1e-12, polygon.area * 0.005):
                continue
            # A clipping edge can leave a floating-point sliver. Such pieces
            # cannot provide a checked interior anchor and are not alternatives.
            if not piece.contains(piece.representative_point()) or not polygon.contains(piece.representative_point()):
                continue
            point = coordinate(piece)
            if point != primary and point not in [item[1] for item in pieces]:
                pieces.append((piece.area, point))
    return [point for _, point in sorted(pieces, key=lambda item: -item[0])[:2]]


def zoom_for_area(area):
    # Label visibility thresholds only. They never filter or modify class geometry.
    return 0 if area >= 0.2 else 4 if area >= 0.02 else 5.5 if area >= 0.002 else 8


def source_data(shape):
    raw = SOURCE.read_bytes()
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    if digest(raw) != manifest["files"]["koppen.geojson"]["sha256"]:
        raise ValueError("Climate geometry differs from its published manifest")
    collection = json.loads(raw)
    result = []
    for feature in collection["features"]:
        geometry = shape(feature["geometry"])
        if not geometry.is_valid:
            raise ValueError("Invalid source climate polygon")
        parts = polygon_parts(geometry)
        result.append({"code": feature["properties"]["id"],
                       "gridId": feature["properties"]["code"], "geometry": geometry, "parts": parts})
    return result


def build(sources, box):
    study = box(*STUDY_BOUNDS)
    labels, coverage = [], []
    for source in sources:
        whole = sorted([{"polygon": polygon, "sourcePolygonIndex": index,
                         "scope": "whole", "scopePolygonIndex": 0}
                        for index, polygon in enumerate(source["parts"])],
                       key=lambda item: (-item["polygon"].area, item["sourcePolygonIndex"]))
        southern = []
        for item in whole:
            polygon = item["polygon"]
            if not polygon.intersects(study):
                continue
            for index, piece in enumerate(polygon_parts(polygon.intersection(study))):
                southern.append({"polygon": piece, "sourcePolygonIndex": item["sourcePolygonIndex"],
                                 "scope": "study", "scopePolygonIndex": index})
        southern.sort(key=lambda item: (-item["polygon"].area, item["sourcePolygonIndex"], item["scopePolygonIndex"]))
        selected = []

        def choose(candidates, limit):
            if not candidates:
                return
            largest = candidates[0]["polygon"].area
            for item in candidates:
                if len(selected) >= limit:
                    return
                if item["polygon"].area < largest * MIN_OTHER_PART_FRACTION:
                    continue
                point = coordinate(item["polygon"])
                # A source polygon can be split by the study rectangle. Keep its
                # separate representative points, but avoid duplicate anchors.
                if any(point == chosen["coordinate"] for chosen in selected):
                    continue
                selected.append({**item, "coordinate": point})

        choose(southern, 2)
        choose(whole, MAX_LABELS_PER_CODE)
        choose(southern, MAX_LABELS_PER_CODE)
        if not selected:
            raise ValueError("No representative point for climate code " + source["code"])
        for rank, item in enumerate(selected):
            point = item["coordinate"]
            polygon = item["polygon"]
            source_polygon = source["parts"][item["sourcePolygonIndex"]]
            label = {"id": f"{source['code']}-{item['scope']}-{item['sourcePolygonIndex']}-{item['scopePolygonIndex']}",
                     "code": source["code"], "family": source["code"][0], "gridId": source["gridId"],
                     "coordinate": point, "alternatives": alternatives(polygon, point, box),
                     "minZoom": zoom_for_area(polygon.area), "priority": rank,
                     "scope": item["scope"], "sourcePolygonIndex": item["sourcePolygonIndex"],
                     "scopePolygonIndex": item["scopePolygonIndex"],
                     "candidatePolygonAreaDegrees2": polygon.area,
                     "sourcePolygonAreaDegrees2": source_polygon.area}
            labels.append(label)
        coverage.append({"code": source["code"], "gridId": source["gridId"],
                         "sourcePolygonCount": len(whole), "studyPolygonCount": len(southern),
                         "hasStudyPolygon": bool(southern), "labelCount": len(selected)})
    all_bounds = [item["geometry"].bounds for item in sources]
    return {"schemaVersion": 1, "region": "canada", "studyBounds": STUDY_BOUNDS,
            "wholeBounds": [min(bounds[0] for bounds in all_bounds), min(bounds[1] for bounds in all_bounds),
                            max(bounds[2] for bounds in all_bounds), max(bounds[3] for bounds in all_bounds)],
            "source": file_record(SOURCE), "families": families(),
            "processing": {"generator": generator_record(), "familyReference": file_record(FAMILY_REFERENCE),
                "method": "Use representative_point() of connected source polygons and their intersections with the southern study rectangle. Prefer two large study components, then distinct whole-country components, with at most three label entries per code. Alternatives are representative points of data-derived thirds of the same candidate polygon.",
                "coordinateCrs": "EPSG:4326", "coordinateRounding": "None; preserve Shapely representative-point doubles.",
                "maxLabelsPerCode": MAX_LABELS_PER_CODE, "maxAlternativesPerLabel": 2,
                "minimumOtherComponentAreaFraction": MIN_OTHER_PART_FRACTION,
                "areaMeaning": "Planar longitude/latitude degrees squared, used only to rank label candidates; not Canadian surface area.",
                "minZoomMethod": "0 for candidate polygon >=0.2 degrees squared; 4 for >=0.02; 5.5 for >=0.002; 8 for smaller polygons. Label visibility only; no source polygons are removed.",
                "familyMethod": "Code initial A/B/C/D/E maps to the existing US climateFamilies legend. All five families remain in the key even when no Canadian source polygon has that family.",
                "sourceGeometryChanged": False, "manualCoordinates": False},
            "coverage": coverage,
            "labels": sorted(labels, key=lambda item: (item["minZoom"], item["priority"], -item["candidatePolygonAreaDegrees2"], item["id"]))}


def validate(data, sources, box, Point):
    if data["source"] != file_record(SOURCE) or data["studyBounds"] != STUDY_BOUNDS:
        raise ValueError("Candidate source or study bounds differ")
    if data["processing"]["generator"] != generator_record() or data["families"] != families():
        raise ValueError("Candidate generator or family reference differs")
    if data["processing"]["familyReference"] != file_record(FAMILY_REFERENCE):
        raise ValueError("US family reference hash differs")
    by_code = {item["code"]: item for item in sources}
    if {label["code"] for label in data["labels"]} != set(by_code):
        raise ValueError("Label coverage differs from source climate codes")
    if len({label["id"] for label in data["labels"]}) != len(data["labels"]):
        raise ValueError("Duplicate climate label ID")
    study = box(*STUDY_BOUNDS)
    for code, source in by_code.items():
        entries = [label for label in data["labels"] if label["code"] == code]
        if not 1 <= len(entries) <= MAX_LABELS_PER_CODE:
            raise ValueError("Invalid label candidate count for " + code)
        for label in entries:
            if label["gridId"] != source["gridId"] or label["family"] != code[0]:
                raise ValueError("Label class identity differs")
            component = source["parts"][label["sourcePolygonIndex"]]
            candidate = component
            if label["scope"] == "study":
                candidate = polygon_parts(component.intersection(study))[label["scopePolygonIndex"]]
            if label["coordinate"] != coordinate(candidate):
                raise ValueError("Label primary is not the source component representative point")
            if label["alternatives"] != alternatives(candidate, label["coordinate"], box):
                raise ValueError("Label alternatives are not derived from the source component")
            for pair in [label["coordinate"], *label["alternatives"]]:
                point = Point(pair)
                if not candidate.contains(point) or not component.contains(point) or not source["geometry"].contains(point):
                    raise ValueError("Label escaped its connected class polygon or entered a hole")
                if label["scope"] == "study" and not study.contains(point):
                    raise ValueError("Study label escaped the southern rectangle")
                if any(other["geometry"].contains(point) for other in sources if other["code"] != code):
                    raise ValueError("Label lies in a different climate class")
            if label["minZoom"] != zoom_for_area(candidate.area):
                raise ValueError("Label minZoom does not reflect its actual polygon")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dependency-dir", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.dependency_dir:
        sys.path.insert(0, str(args.dependency_dir.resolve()))
    from shapely.geometry import shape, box, Point
    sources = source_data(shape)
    if args.check:
        data = json.loads(OUTPUT.read_text(encoding="utf8"))
    else:
        data = build(sources, box)
    validate(data, sources, box, Point)
    if not args.check:
        OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf8", newline="\n")
    print(json.dumps({"checked": args.check, "codes": len(sources), "labels": len(data["labels"]),
                      "anchors": sum(1 + len(label["alternatives"]) for label in data["labels"]),
                      "output": file_record(OUTPUT), "sourceGeometryUnchanged": True,
                      "everyPointStrictlyInsideItsSourceClassAndOutsideHoles": True}, ensure_ascii=True))


if __name__ == "__main__":
    main()
