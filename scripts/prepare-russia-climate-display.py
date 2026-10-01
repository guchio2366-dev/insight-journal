"""Find original climate classes intersecting the displayed Russia boundary.

Every 0.1-degree source-cell rectangle is tested with Shapely intersects.
Boundary touches are retained; cell-centre selection is deliberately not used.
The source grid, PNG, full legend and climate manifest are never modified.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "public/assets/atlas/russia-climate-v1"
GEOGRAPHY = ROOT / "src/data/atlas/russia-countries.json"


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def unwrap(ring):
    points = []
    for longitude, latitude in ring:
        lon = longitude
        if points:
            while lon - points[-1][0] > 180:
                lon -= 360
            while lon - points[-1][0] < -180:
                lon += 360
        points.append([lon, latitude])
    if not points:
        return points
    # Math.round in the TypeScript geometry helper is floor(x + 0.5).
    mean = sum(point[0] for point in points) / len(points)
    shift = math.floor((105 - mean) / 360 + 0.5) * 360
    return [[lon + shift, lat] for lon, lat in points]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shapely-path", type=Path, help="Optional authorized runtime module directory")
    args = parser.parse_args()
    if args.shapely_path:
        sys.path.insert(0, str(args.shapely_path.resolve()))
    import shapely
    from shapely.geometry import Polygon

    immutable_names = ["climate.png", "climate-grid.bin.gz", "legend.json", "manifest.json"]
    before = {name: sha((ASSET / name).read_bytes()) for name in immutable_names}
    manifest = json.loads((ASSET / "manifest.json").read_bytes())
    if manifest["boundsUnwrapped"] != [18, 40, 191, 83] or (manifest["width"], manifest["height"]) != (1730, 430):
        raise ValueError("Unexpected pinned source-cell window")
    compressed = (ASSET / "climate-grid.bin.gz").read_bytes()
    if sha(compressed) != manifest["files"]["climate-grid.bin.gz"]["sha256"]:
        raise ValueError("Climate grid differs from the declared pinned asset")
    grid = np.frombuffer(gzip.decompress(compressed), dtype=np.uint8).reshape(430, 1730)
    geography_bytes = GEOGRAPHY.read_bytes()
    geography = json.loads(geography_bytes)
    targets = [feature for feature in geography["features"] if feature["properties"].get("kind") == "russia"]
    if len(targets) != 1 or targets[0]["properties"]["code"] != "RUS":
        raise ValueError("Expected exactly one displayed RUS feature")
    source_geometry = targets[0]["geometry"]
    polygons = source_geometry["coordinates"] if source_geometry["type"] == "MultiPolygon" else [source_geometry["coordinates"]]
    shapes = []
    for rings in polygons:
        polygon = Polygon(unwrap(rings[0]), [unwrap(ring) for ring in rings[1:]])
        if not polygon.is_valid:
            raise ValueError("Source polygon is invalid; do not invent a repaired display boundary")
        shapes.append(polygon)
    geometry = shapely.union_all(shapes)
    if not geometry.is_valid:
        raise ValueError("Unwrapped union is invalid")
    # The declared window fully contains the RUS feature. GEOS clipping also
    # handles source boundary edges without altering the original grid.
    geometry = shapely.intersection(geometry, shapely.box(18, 40, 191, 83))
    shapely.prepare(geometry)
    columns = np.concatenate((np.arange(1980, 3600), np.arange(110)))
    left = -180 + columns * 0.1
    right = -180 + (columns + 1) * 0.1
    left[1620:] += 360
    right[1620:] += 360
    counts = np.zeros(31, dtype=np.int64)
    selected = np.zeros(grid.shape, dtype=np.uint8)
    for row in range(430):
        source_row = row + 70
        north, south = 90 - source_row * 0.1, 90 - (source_row + 1) * 0.1
        cells = shapely.box(left, south, right, north)
        hits = shapely.intersects(geometry, cells)
        selected[row] = hits
        counts += np.bincount(grid[row, hits], minlength=31)
    ids = [int(identifier) for identifier in np.flatnonzero(counts) if identifier != 0]
    after = {name: sha((ASSET / name).read_bytes()) for name in immutable_names}
    if before != after:
        raise ValueError("Immutable climate source assets changed")
    value = {
        "schemaVersion": 1, "ids": ids, "actualClassIds": ids,
        "purpose": "Full UI legend for original source cells intersecting the displayed RUS boundary; no changes to source values",
        "period": "1991-2020", "sourceResolutionDegrees": 0.1,
        "boundsUnwrapped": [18, 40, 191, 83], "width": 1730, "height": 430,
        "geometry": {"file": GEOGRAPHY.relative_to(ROOT).as_posix(),
                     "sha256": sha(geography_bytes.replace(b"\r\n", b"\n").replace(b"\r", b"\n")),
                     "digestMethod": "SHA256 of UTF-8 source text with CRLF/CR converted to LF",
                     "selection": "kind=russia, code=RUS; all exterior rings and holes retained",
                     "source": geography.get("source"), "unwrappedBounds": list(geometry.bounds)},
        "classGrid": {"file": "climate-grid.bin.gz", "sha256": sha(compressed),
                      "uncompressedSha256": sha(grid.tobytes()), "manifestSha256": before["manifest.json"]},
        "algorithm": "Unwrap every ring continuously across 180 degrees, then shift by JavaScript Math.round((105-ringMeanLongitude)/360)*360. Construct polygons with holes, union, intersect with [18,40,191,83]. For all 743900 original source cells, construct their full source-affine rectangles (west columns1980..3599 then east columns0..109 +360) and use prepared Shapely GEOS intersects. Include any contact, including boundary-only touches. No centre test, buffer, imputation or numerical-value masking.",
        "crossedCellCount": int(counts.sum()), "classifiedCrossedCellCount": int(counts[1:].sum()),
        "noDataCrossedCellCount": int(counts[0]),
        "classCellCounts": [{"id": int(identifier), "cells": int(counts[identifier])} for identifier in np.flatnonzero(counts)],
        "selectionMaskSha256": sha(selected.tobytes()),
        "verification": {"allOriginalSourceCellsTested": int(grid.size),
                         "classCountsSumToCrossedCells": int(counts.sum()) == int(selected.sum()),
                         "allClimateAssetsUnchanged": before == after,
                         "shapelyVersion": shapely.__version__, "geosVersion": shapely.geos_version_string},
        "processing": {"script": "scripts/prepare-russia-climate-display.py",
                       "scriptSha256": sha(Path(__file__).read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")),
                       "scriptDigestMethod": "SHA256 of UTF-8 source text normalized to LF"},
        "limitations": ["Intersection is with the fixed displayed source boundary, not a current or internationally recognized border determination.",
                        "Counts are source-cell contact diagnostics, not land area or climate percentages.",
                        "NoData class 0 remains a separate missing legend entry. This record only filters unused nonzero class labels.",
                        "The UI must retain nearest-neighbour raster rendering and the same source geometry; interpolated edge colours are not additional classes."],
    }
    (ASSET / "display-classes.json").write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"ids": ids, "crossedCellCount": value["crossedCellCount"],
                      "classifiedCrossedCellCount": value["classifiedCrossedCellCount"],
                      "noDataCrossedCellCount": value["noDataCrossedCellCount"], "immutableAssetsUnchanged": before == after}))


if __name__ == "__main__":
    main()
