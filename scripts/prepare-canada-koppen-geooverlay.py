"""Build Canada Köppen polygons from the preserved official 1991–2020 TIFF.

Offline inputs only. Requires Python 3.12+, NumPy, Pillow and Shapely 2.1+.
Same-class original 0.1-degree cells are merged without class resampling or
geometry simplification, then intersected with Canada's cartographic land mask.
GeoJSON preserves publisher RGB; the manifest uses the existing US display palette.
"""
from __future__ import annotations

import argparse
import ast
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
MEMBER_SHA = "7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361"
BOUNDARY_SHA = "28966276a200b7c88f97cc4d1e770588e161e2fe63aa85ca9b736015aaeddd57"
LAKES_SHA = "d350b75978b26fe839b797c2c529b2fb8f47fb3983c03f4964e36d5df9378a52"
SOURCE_PATH = ROOT / "data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif"
BOUNDARY_PATH = ROOT / "data-source/atlas/canada/industry/province-boundaries-2021.geojson.gz"
LAKES_PATH = ROOT / "data-source/atlas/canada/lakes.geojson"
DATA = ROOT / "data-source/atlas/canada-climate-elevation-v1/beck"
OUT = ROOT / "public/assets/atlas/canada-climate-elevation-v1"
PALETTE_REFERENCE = ROOT / "scripts/refine-atlas-nature.py"
US_LEGEND = ROOT / "public/assets/atlas/nature-v1/climate-legend.json"
SOURCE_LEGEND = ROOT / "public/assets/atlas/asia-climate-v1/legend.json"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value, compact=False):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False,
                       separators=(",", ":") if compact else None,
                       indent=None if compact else 2) + "\n").encode("utf8")


def record(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": sha(raw)}


def polygon_parts(geometry):
    return len(geometry.geoms) if geometry.geom_type == "MultiPolygon" else (0 if geometry.is_empty else 1)


def text_digest(path):
    return sha(path.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n"))


def display_palette():
    """Read all 30 approved US colors without executing its asset generator."""
    module = ast.parse(PALETTE_REFERENCE.read_text(encoding="utf8"))
    function = next(node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == "climate")
    literals = {}
    for node in function.body:
        if not isinstance(node, ast.Assign) or not isinstance(node.targets[0], ast.Name):
            continue
        name = node.targets[0].id
        if name not in ("codes", "palette"):
            continue
        call = node.value
        if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute)
                and call.func.attr == "split" and not call.args and not call.keywords):
            raise ValueError("US climate palette must use literal split assignments")
        literals[name] = ast.literal_eval(call.func.value).split()
    if len(literals.get("codes", [])) != 30 or len(literals.get("palette", [])) != 30 or len(set(literals["codes"])) != 30:
        raise ValueError("Expected all 30 US climate codes and display colors")
    colors = dict(zip(literals["codes"], ["#" + color for color in literals["palette"]]))
    for color in colors.values():
        if len(color) != 7 or len(bytes.fromhex(color[1:])) != 3:
            raise ValueError("Invalid US display color")
    for item in json.loads(US_LEGEND.read_text(encoding="utf8")):
        if colors.get(item["code"]) != item["color"]:
            raise ValueError("US display palette differs from its published legend")
    return colors


def apply_display_palette(manifest):
    """Adapt manifest styling while preserving publisher RGB and all geometry."""
    colors = display_palette()
    source = {item["code"]: item for item in json.loads(SOURCE_LEGEND.read_text(encoding="utf8"))}
    for item in manifest["classes"]:
        original = source[item["id"]]
        source_color = item.get("sourceColor", item["color"])
        if item["code"] != original["id"] or source_color != original["color"]:
            raise ValueError("Canada class identity or original publisher color differs")
        item["sourceColor"] = source_color
        item["color"] = colors[item["id"]]
    processing = manifest["processing"]
    script_hash = text_digest(Path(__file__))
    if processing["scriptSha256"] != script_hash:
        processing.setdefault("geometryScriptSha256", processing["scriptSha256"])
    processing["scriptSha256"] = script_hash
    processing["palette"] = "North America 30-class display palette. Original publisher RGB retained in classes[].sourceColor and GeoJSON properties.color; class IDs, source cells and geometry unchanged."
    processing["displayPalette"] = {
        "reference": PALETTE_REFERENCE.relative_to(ROOT).as_posix(),
        "referenceSha256": text_digest(PALETTE_REFERENCE),
        "referenceDigestMethod": "UTF-8 text normalized from CRLF/CR to LF",
        "legend": US_LEGEND.relative_to(ROOT).as_posix(), "legendSha256": sha(US_LEGEND.read_bytes()),
        "sourceLegend": SOURCE_LEGEND.relative_to(ROOT).as_posix(), "sourceLegendSha256": sha(SOURCE_LEGEND.read_bytes()),
        "classCount": 30, "colors": colors, "sourceColorField": "classes[].sourceColor",
        "method": "Reuse the existing US climate() display palette for every code. Only manifest display colors change; publisher definitions, numeric IDs, station samples, masks and the source-colored GeoJSON remain unchanged.",
    }
    manifest["version"] = "1.1.0"
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dependency-dir", type=Path)
    parser.add_argument("--mask-only", action="store_true")
    parser.add_argument("--palette-only", action="store_true", help="Update only the existing manifest display palette; no geometry or original raster reads or writes are performed")
    args = parser.parse_args()
    if args.palette_only:
        if args.mask_only:
            parser.error("--palette-only and --mask-only are mutually exclusive")
        manifest_path = OUT / "koppen-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf8"))
        manifest_path.write_bytes(encoded(apply_display_palette(manifest)))
        print(json.dumps({"manifest": manifest_path.relative_to(ROOT).as_posix(), "classes": len(manifest["classes"]), "displayPalette": "US 30-class", "geometryWritten": False}))
        return
    if args.dependency_dir:
        sys.path.insert(0, str(args.dependency_dir.resolve()))
    import numpy as np
    from PIL import Image
    import shapely
    from shapely.geometry import shape, mapping, box, Point, MultiPolygon
    from shapely import make_valid, union_all

    started = time.monotonic()
    DATA.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    boundary_raw = gzip.decompress(BOUNDARY_PATH.read_bytes())
    lakes_raw = LAKES_PATH.read_bytes()
    if sha(boundary_raw) != BOUNDARY_SHA or sha(lakes_raw) != LAKES_SHA:
        raise ValueError("Boundary or lake input differs from preserved source")
    boundary_fc = json.loads(boundary_raw)
    if len(boundary_fc["features"]) != 13:
        raise ValueError("Expected all 13 official provinces and territories")
    repaired = []
    province_geometries = []
    for feature in boundary_fc["features"]:
        geometry = shape(feature["geometry"])
        if not geometry.is_valid:
            geometry = make_valid(geometry, method="structure", keep_collapsed=False)
            repaired.append(feature["properties"]["PRUID"])
        if geometry.geom_type not in ("Polygon", "MultiPolygon") or not geometry.is_valid:
            raise ValueError("Boundary repair did not produce valid polygon geometry")
        province_geometries.append(geometry)
    print("province validation", repaired, round(time.monotonic() - started, 1), flush=True)
    country = union_all(province_geometries)
    if not country.is_valid:
        raise ValueError("Country union invalid")
    print("country union", round(time.monotonic() - started, 1), flush=True)
    lakes_fc = json.loads(lakes_raw)
    lake_geometries = []
    for feature in lakes_fc["features"]:
        geometry = shape(feature["geometry"])
        if not geometry.is_valid:
            geometry = make_valid(geometry, method="structure", keep_collapsed=False)
        if geometry.intersects(country):
            lake_geometries.append(geometry)
    lake_union = union_all(lake_geometries)
    land = country.difference(lake_union)
    if not land.is_valid or land.is_empty:
        raise ValueError("Canada land-minus-lakes mask invalid")
    mask_fc = {"type": "FeatureCollection", "features": [{"type": "Feature",
               "properties": {"id": "CAN", "name": "Canada", "boundaryYear": 2021},
               "geometry": mapping(land)}]}
    mask_path = DATA / "land-mask.geojson.gz"
    mask_path.write_bytes(gzip.compress(encoded(mask_fc, compact=True), mtime=0))
    mask_record = {
        "schemaVersion": 1, "region": "canada", "crs": "EPSG:4326",
        "mask": record(mask_path), "bounds": list(land.bounds),
        "geometry": {"polygonParts": polygon_parts(land), "coordinateCount": int(shapely.get_num_coordinates(land))},
        "boundary": {**record(BOUNDARY_PATH), "uncompressedSha256": BOUNDARY_SHA,
            "source": "Statistics Canada 2021 Census Cartographic Boundary Files, PR - lpr_000b21s_e",
            "sourceUrl": "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/0",
            "requestRecord": "data-source/atlas/canada/industry/boundary-request.json",
            "referenceDate": "2021-01-01", "license": "Open Government Licence - Canada",
            "licenseUrl": "https://open.canada.ca/en/open-government-licence-canada",
            "guideUrl": "https://www150.statcan.gc.ca/n1/pub/92-160-g/92-160-g2021001-eng.htm",
            "sourceQueryGeneralization": "Existing official Esri query used maxAllowableOffset=0.02 and geometryPrecision=5; no further simplification performed here.",
            "provinceCount": 13, "repairedProvinceIds": repaired,
            "repair": "Shapely make_valid(method='structure', keep_collapsed=False) on source invalid rings; retain polygonal land, discard only collapsed zero-area geometry."},
        "water": {**record(LAKES_PATH), "publisher": "Natural Earth", "version": "5.1.2",
            "sourceUrl": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_lakes.geojson",
            "license": "Public domain", "sourceScale": "1:50m", "intersectingLakeFeatures": len(lake_geometries),
            "method": "Subtract all preserved 1:50m lake polygons intersecting Canadian cartographic boundaries, including cross-border lakes. Smaller water bodies absent from this source are unresolved."},
        "method": "Union all 13 Canadian cartographic province/territory polygons; subtract intersecting preserved lake polygons. Coastal waters, neighboring countries and represented lakes excluded.",
        "limitations": ["Boundary and water scales do not support cadastral precision.",
                         "Natural Earth 1:50m lake data do not resolve every small water body."]}
    (DATA / "land-mask-provenance.json").write_bytes(encoded(mask_record))
    print("land mask", record(mask_path), round(time.monotonic() - started, 1), flush=True)
    if args.mask_only:
        return

    source_raw = SOURCE_PATH.read_bytes()
    if sha(source_raw) != MEMBER_SHA:
        raise ValueError("Official Beck source TIFF SHA256 differs")
    with Image.open(io.BytesIO(source_raw)) as image:
        if image.size != (3600, 1800) or image.mode != "L":
            raise ValueError("Expected publisher global 0.1-degree uint8 raster")
        scale, tie, keys = list(image.tag_v2[33550]), list(image.tag_v2[33922]), list(image.tag_v2[34735])
        key_values = {keys[i]: keys[i+3] for i in range(4, len(keys), 4)}
        if scale != [0.1, 0.1, 0.0] or tie != [0.0, 0.0, 0.0, -180.0, 90.0, 0.0]:
            raise ValueError("Unexpected source transform")
        if key_values.get(2048) != 4326 or key_values.get(1025) != 1 or str(image.tag_v2[42113]) != "0":
            raise ValueError("Expected EPSG:4326 pixel-is-area raster with noData=0")
        source = np.asarray(image, dtype=np.uint8).copy()
    if source.max() > 30:
        raise ValueError("Unexpected original climate class")
    min_x, min_y, max_x, max_y = land.bounds
    col_start = math.floor((min_x + 180) * 10)
    col_stop = math.ceil((max_x + 180) * 10)
    row_start = math.floor((90 - max_y) * 10)
    row_stop = math.ceil((90 - min_y) * 10)
    grid = source[row_start:row_stop, col_start:col_stop]

    legend_path = SOURCE_LEGEND
    definitions = json.loads(legend_path.read_text(encoding="utf8"))
    classes = {item["id"]: {"id": item["code"], "code": item["id"], "name": item["name"],
               "color": item["color"], "description": item["description"],
               "sourceLabel": item["sourceLabel"]} for item in definitions}
    if set(classes) != set(range(1,31)):
        raise ValueError("Expected original 30-class legend")

    rectangles = {identifier: [] for identifier in range(1,31)}
    for local_row, row in enumerate(grid):
        starts = np.r_[0, np.flatnonzero(row[1:] != row[:-1]) + 1]
        stops = np.r_[starts[1:], len(row)]
        global_row = row_start + local_row
        north, south = 90 - global_row / 10, 90 - (global_row + 1) / 10
        for start, stop in zip(starts, stops):
            identifier = int(row[start])
            if identifier == 0:
                continue
            west, east = -180 + (col_start + int(start)) / 10, -180 + (col_start + int(stop)) / 10
            rectangles[identifier].append(box(west, south, east, north))
    print("original row runs", sum(map(len, rectangles.values())), round(time.monotonic() - started, 1), flush=True)
    features = []
    raw_polygons = {}
    clipped_polygons = {}
    geometry_counts = []
    for identifier in range(1,31):
        if not rectangles[identifier]:
            continue
        original = union_all(rectangles[identifier])
        clipped = original.intersection(land)
        if clipped.is_empty:
            continue
        # Polygon clipping can retain zero-area point/line contacts; they are not zones.
        if clipped.geom_type == "GeometryCollection":
            pieces = [g for g in clipped.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
            clipped = union_all(pieces)
        if clipped.geom_type not in ("Polygon", "MultiPolygon") or not clipped.is_valid:
            raise ValueError("Class clip did not produce a valid polygon")
        if clipped.difference(land).area > 1e-10 or clipped.intersection(lake_union).area > 1e-10:
            raise ValueError("Climate geometry escaped land mask or crossed represented water")
        raw_polygons[identifier] = original
        clipped_polygons[identifier] = clipped
        item = classes[identifier]
        geometry_counts.append({"id": item["id"], "rawWindowCells": int(np.count_nonzero(grid == identifier)),
            "rowRuns": len(rectangles[identifier]), "preMaskUnionParts": polygon_parts(original),
            "postMaskParts": polygon_parts(clipped)})
        features.append({"type": "Feature", "id": item["id"], "properties": {
            **item, "period": "1991-2020", "sourceResolutionDegrees": 0.1}, "geometry": mapping(clipped)})
        print("class", item["id"], round(time.monotonic() - started, 1), flush=True)
    # No geometry precision rounding: keep exact clipped boundaries and original grid edges.
    geojson = {"type": "FeatureCollection", "features": features}
    output_path = OUT / "koppen.geojson"
    output_path.write_bytes(encoded(geojson, compact=True))
    roundtrip = json.loads(output_path.read_bytes())
    for feature in roundtrip["features"]:
        geometry = shape(feature["geometry"])
        identifier = feature["properties"]["code"]
        if not geometry.equals(clipped_polygons[identifier]) or not geometry.is_valid:
            raise ValueError("GeoJSON roundtrip changed geometry")
    stations = json.loads((ROOT / "src/data/atlas/canada/climate.json").read_text(encoding="utf8"))["stations"]
    checks = []
    for station in stations:
        longitude, latitude = station["coordinates"]
        # Cells are half-open west/east and north/south, as in the source transform.
        col = math.floor((longitude + 180) * 10 + 1e-10)
        row = math.floor((90 - latitude) * 10 + 1e-10)
        identifier = int(source[row,col])
        point = Point(longitude, latitude)
        displayed = [class_id for class_id, polygon in clipped_polygons.items() if polygon.covers(point)]
        if identifier not in displayed:
            raise ValueError(f"Station overlay/source identity failed: {station['id']} {identifier} {displayed}")
        # GeoJSON rings are closed; an exact grid edge may touch both classes.
        # The original raster uses half-open cells. Probe infinitesimally toward
        # the cell's east/south interior, without replacing station coordinates.
        probe = Point(longitude + 1e-8, latitude - 1e-8)
        probe_row = math.floor((90 - probe.y) * 10 + 1e-10)
        probe_col = math.floor((probe.x + 180) * 10 + 1e-10)
        if int(source[probe_row,probe_col]) != identifier:
            raise ValueError("Station interior probe left original source cell")
        probe_displayed = [class_id for class_id, polygon in clipped_polygons.items() if polygon.covers(probe)]
        if probe_displayed != [identifier]:
            raise ValueError("Station source-cell interior overlay identity failed")
        checks.append({"stationId": station["id"], "name": station["name"], "station": station["station"],
            "climateId": station["climateId"], "coordinates": station["coordinates"],
            "sourceRow": row, "sourceColumn": col, "code": identifier, "id": classes[identifier]["id"],
            "overlayMatchesRawCell": True, "coordinateSourceUrl": station["sourceUrl"],
            "boundaryCandidates": [classes[candidate]["id"] for candidate in displayed],
            "interiorProbe": [probe.x,probe.y], "interiorProbeMatchesRawCell": True})
    excluded_checks = []
    for name, longitude, latitude in [
        ("Alaska", -149.9, 61.2), ("Contiguous United States", -100, 48),
        ("Greenland", -45, 70), ("Hudson Bay", -85, 60),
        ("Great Bear Lake", -120, 66), ("Lake Winnipeg", -97, 52),
        ("Lake Superior", -88, 47.8)]:
        point = Point(longitude,latitude)
        if any(g.covers(point) for g in clipped_polygons.values()):
            raise ValueError("Excluded neighbor/water check failed: " + name)
        excluded_checks.append({"name": name, "coordinates": [longitude,latitude], "excluded": True})
    union_class = union_all(list(clipped_polygons.values()))
    sum_area = sum(g.area for g in clipped_polygons.values())
    if abs(sum_area - union_class.area) > 1e-8:
        raise ValueError("Class polygons overlap in area")
    source_record = {
        "publisher": "Beck et al. (2023)", "dataset": "Köppen-Geiger maps for 1901–2099",
        "title": "Köppen-Geiger 気候区分（1991–2020、0.1°）",
        "brief": "公式 GeoTIFF の元の分類をカナダ陸域で切り出した広域向けの図。",
        "period": "1991-2020", "sourceUrl": "https://www.gloh2o.org/koppen/",
        "citation": "https://doi.org/10.1038/s41597-023-02549-6",
        "metadataUrl": "https://api.figshare.com/v2/articles/21789074/versions/1",
        "catalogueUrl": "https://figshare.com/articles/dataset/21789074/1",
        "datasetDoi": "https://doi.org/10.6084/m9.figshare.21789074.v1",
        "archiveUrl": "https://ndownloader.figshare.com/files/45057352",
        "archiveSha256": "d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d",
        "member": "1991_2020/koppen_geiger_0p1.tif", "raw": record(SOURCE_PATH),
        "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        "licence": "CC BY 4.0", "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
        "attribution": "Beck, H.E. et al. (2023), Scientific Data 10, 724. Adapted into clipped polygons by Insight Journal.",
        "reuse": "Existing preserved original global source member; no second download. Archive hash retained from prior source acquisition, member hash verified in this run.",
        "crs": "EPSG:4326", "sourceWidth": 3600, "sourceHeight": 1800,
        "resolutionDegrees": 0.1, "resolutionDescription": "Publisher 0.1-degree broad-view product; this overlay is not the 1 km (0.01-degree) product.",
        "pixelScale": scale, "tiepoint": tie, "pixelInterpretation": "area", "noData": 0}
    (DATA / "source-record.json").write_bytes(encoded(source_record))
    script_hash = sha(Path(__file__).read_bytes().replace(b"\r\n",b"\n").replace(b"\r",b"\n"))
    manifest = {
        "schemaVersion": 1, "region": "canada", "version": "1.0.0", "period": "1991-2020",
        "crs": "EPSG:4326", "sourceResolutionDegrees": 0.1, "bounds": list(union_class.bounds),
        "unit": "Köppen-Geiger categorical class, not numerical magnitude", "source": source_record,
        "mask": mask_record, "classes": [classes[f["properties"]["code"]] for f in features],
        "stationSamples": [{**check, "id": check["stationId"], "code": check["id"],
                            "class": check["id"], "classCode": check["code"]} for check in checks],
        "file": "koppen.geojson", "files": {"koppen.geojson": record(output_path)},
        "processing": {"script": Path(__file__).relative_to(ROOT).as_posix(),
            "scriptSha256": script_hash, "scriptDigestMethod": "UTF-8 text normalized from CRLF/CR to LF",
            "method": "Read exact original 0.1-degree categorical cells; form horizontal runs of identical IDs; losslessly union cell rectangles by ID; intersect with Canadian land-minus-lakes mask. No interpolation, averaging, class merging, coordinate rounding, polygon simplification, minimum-area filtering or imputation.",
            "sourceRows": [row_start,row_stop], "sourceColumns": [col_start,col_stop],
            "rowRunCount": sum(map(len,rectangles.values())), "shapelyVersion": shapely.__version__,
            "sharedGridEdges": "All rectangle corners use the same global integer grid indices: longitude=-180+column/10, latitude=90-row/10. No repeated x+0.1 or y-0.1 accumulation; adjacent same-class source cell edges dissolve in the union.",
            "classGeometryCounts": geometry_counts,
            "classGeometryCountsScope": "Raw window cell/run/pre-mask counts may include neighboring countries and water; post-mask parts chiefly represent real islands and coast/lake fragmentation. These are geometry diagnostics, not Canadian land-area statistics.",
            "legendReference": record(legend_path), "palette": "Original publisher RGB colors retained; no recoloring."},
        "verification": {"rawSourceHashVerified": True, "sourceTransformAndCrsVerified": True,
            "allOutputPolygonsValid": True, "allPolygonsWithinCanadaLandMask": True,
            "representedLakesExcluded": True, "neighborAndWaterSpotchecks": excluded_checks,
            "allGeojsonGeometriesRoundTripUnchanged": True, "classAreasDoNotOverlap": True,
            "stationSpotchecks": checks},
        "lookup": {"cellRule": "Original raster half-open cells: column=floor((longitude+180)*10), row=floor((90-latitude)*10). On an exact east/south grid boundary the east/south cell wins.",
                   "polygonBoundary": "Closed GeoJSON rings can touch adjacent classes at an exact cell edge. Station samples use the original raster cell rule and disclose all touching polygon candidates."},
        "limitations": [
            "0.1-degree cells describe broad regional climate; narrow islands and coasts may have source no-data. Zooming does not create finer data.",
            "No-data 0 is omitted and never assigned a climate class. Land not classified by the source remains uncolored.",
            "Canada boundaries are 2021 cartographic statistical boundaries; small lakes not represented by Natural Earth 1:50m remain unresolved.",
            "Grid class at an ECCC station coordinate is independent of the station monthly normal. It is not a classification recalculated from that station's temperatures or precipitation.",
            "Classes describe the 1991–2020 reference climate, not current weather, rainfall totals, temperatures, crop suitability or national averages."]}
    (OUT / "koppen-manifest.json").write_bytes(encoded(apply_display_palette(manifest)))
    print(json.dumps({"features": len(features), "classes": [f["properties"]["id"] for f in features],
                      "file": record(output_path), "stations": checks, "seconds": round(time.monotonic()-started,1)}, ensure_ascii=True),flush=True)


if __name__ == "__main__":
    main()
