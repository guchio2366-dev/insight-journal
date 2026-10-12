#!/usr/bin/env python3
"""Prepare Canada's audited 2020 JRC GHSL population-density grid.

Requires NumPy, Pillow and Rasterio. Only --download enables normal HTTPS.
Raw source ZIPs stay in --cache outside the repository. --pin-inputs records
the first reviewed source snapshot; subsequent runs verify every original hash.
The script creates no national, municipal or urban-centre population totals.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys
from urllib.request import Request, urlopen
import zipfile

SCRIPT_ROOT = Path(__file__).resolve().parents[1]
# A separately retained fallback can be invoked from the repository working
# directory without adding the candidate script to the published repository.
ROOT = SCRIPT_ROOT if (SCRIPT_ROOT / "src/data/atlas/regional-countries.json").is_file() else Path.cwd()
OUT = ROOT / "public/assets/atlas/canada-population-grid-v1"
PRODUCT = "GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0"
BASE = "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/tiles/"
BOUNDS = [-141, 41, -52, 83]
WIDTH = 1000
RADIUS = 6378137.0
BREAKS = [1, 10, 50, 100, 500, 1000]
COLORS = ['#f4f6f3', '#c0dce6', '#87b8d0', '#579bc0', '#247cad', '#0e567e', '#07324f']
NO_DATA = -1


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def project(lon: float, lat: float) -> tuple[float, float]:
    return RADIUS * math.radians(lon), RADIUS * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def ring_mask(ring: list, width: int, height: int, bounds: list, np):
    """Even-odd polygon inclusion at actual output pixel centres, including holes."""
    west, south, east, north = bounds
    points = [((project(lon, lat)[0] - west) / (east - west) * width,
               (north - project(lon, lat)[1]) / (north - south) * height) for lon, lat in ring]
    intersections = [[] for _ in range(height)]
    for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]):
        if y1 == y2:
            continue
        for row in range(max(0, math.ceil(min(y1, y2) - .5)), min(height, math.ceil(max(y1, y2) - .5))):
            intersections[row].append(x1 + (row + .5 - y1) * (x2 - x1) / (y2 - y1))
    mask = np.zeros((height, width), dtype=bool)
    for row, positions in enumerate(intersections):
        positions.sort()
        if len(positions) % 2:
            raise ValueError(f"Unpaired Canada polygon intersections in row {row}")
        for left, right in zip(positions[::2], positions[1::2]):
            mask[row, max(0, math.ceil(left - .5)):min(width, math.ceil(right - .5))] = True
    return mask


def country_mask(feature: dict, width: int, height: int, bounds: list, np):
    geometry = feature["geometry"]
    if geometry["type"] not in {"Polygon", "MultiPolygon"}:
        raise ValueError("Canada outline must contain source polygon rings")
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    result = np.zeros((height, width), dtype=bool)
    for rings in polygons:
        polygon = ring_mask(rings[0], width, height, bounds, np)
        for hole in rings[1:]:
            polygon &= ~ring_mask(hole, width, height, bounds, np)
        result |= polygon
    return result


def aggregate_source(data, np):
    """Aligned 5×5 source population sum / valid source-cell area in km²."""
    valid = np.isfinite(data) & (data != -200)
    if np.any(data[valid] < 0):
        raise ValueError("Unexpected negative GHSL source values distinct from -200 NoData")
    sums = np.where(valid, data, 0).astype("float64").reshape(200, 5, 200, 5).sum(axis=(1, 3))
    area = valid.reshape(200, 5, 200, 5).sum(axis=(1, 3))
    density = np.divide(sums, area, out=np.full((200, 200), NO_DATA, dtype="float64"), where=area > 0).astype("float32")
    return density, valid, area


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--deps", type=Path, help="Optional isolated Python package directory")
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--pin-inputs", action="store_true")
    args = parser.parse_args()
    if args.deps:
        sys.path.insert(0, str(args.deps.resolve()))
    sys.dont_write_bytecode = True
    import numpy as np
    import rasterio
    from rasterio.io import MemoryFile
    from rasterio.warp import transform
    from PIL import Image, __version__ as pillow_version

    cache = args.cache.resolve()
    if cache == ROOT or ROOT in cache.parents:
        raise ValueError("Original GHSL cache must stay outside the repository")
    cache.mkdir(parents=True, exist_ok=True)
    boundary_path = ROOT / "src/data/atlas/regional-countries.json"
    boundary_raw = boundary_path.read_bytes()
    features = [f for f in json.loads(boundary_raw)["features"] if f["properties"]["code"] == "CAN"]
    if len(features) != 1:
        raise ValueError("Expected exactly one existing Canada country outline")
    xmin, ymin = project(*BOUNDS[:2])
    xmax, ymax = project(*BOUNDS[2:])
    bounds3857 = [xmin, ymin, xmax, ymax]
    height = math.ceil((ymax - ymin) / ((xmax - xmin) / WIDTH))
    mask = country_mask(features[0], WIDTH, height, bounds3857, np)
    rows, cols = np.where(mask)
    xs = xmin + (cols + .5) * (xmax - xmin) / WIDTH
    ys = ymax - (rows + .5) * (ymax - ymin) / height
    mx, my = transform("EPSG:3857", "ESRI:54009", xs.tolist(), ys.tolist())
    mx, my = np.asarray(mx), np.asarray(my)
    if not np.all(np.isfinite(mx)) or not np.all(np.isfinite(my)):
        raise ValueError("Nonfinite display-to-source coordinate transform")
    tile_rows = np.floor((9000000 - my) / 1000000).astype(int) + 1
    tile_cols = np.floor((mx + 18041000) / 1000000).astype(int) + 1
    needed = sorted(set(zip(tile_rows.tolist(), tile_cols.tolist())))
    print(json.dumps({"plannedTiles": len(needed), "tiles": needed, "displaySize": [WIDTH, height], "maskedPixels": int(mask.sum())}), flush=True)
    pin_path = OUT / "source-inputs.json"
    old_pin = json.loads(pin_path.read_text(encoding="utf-8")) if pin_path.exists() else None
    if old_pin and old_pin.get("product") != PRODUCT:
        raise ValueError("Pinned source product does not match 2020 GHSL R2023A")
    previous = {item["file"]: item for item in old_pin["tiles"]} if old_pin else {}
    if not previous and not args.pin_inputs:
        raise ValueError("No pinned source inputs; initial acquisition requires --pin-inputs")
    sampled = np.full(len(rows), NO_DATA, dtype="float32")
    sources = []
    density_tiles = {}
    for tile_row, tile_col in needed:
        name = f"{PRODUCT}_R{tile_row}_C{tile_col}.zip"
        target = cache / name
        if not target.exists() and args.download:
            request = Request(BASE + name, headers={"User-Agent": "InsightJournal/1.0 Canada GHSL source audit"})
            # Keep certificate verification/default HTTPS and fail on any HTTP error.
            with urlopen(request, timeout=45) as response:
                raw = response.read()
            temporary = target.with_suffix(".zip.partial")
            temporary.write_bytes(raw)
            temporary.replace(target)
        raw = target.read_bytes()
        raw_hash = digest(raw)
        if not args.pin_inputs and (name not in previous or raw_hash != previous[name]["sha256"]):
            raise ValueError(f"Unpinned original ZIP or SHA-256 mismatch: {name}")
        member = name[:-4] + ".tif"
        with zipfile.ZipFile(target) as archive:
            if archive.namelist().count(member) != 1:
                raise ValueError(f"Unexpected original TIFF member in {name}")
            tif = archive.read(member)
        with MemoryFile(tif) as memory:
            with memory.open() as source:
                expected = rasterio.Affine(1000, 0, -18041000 + (tile_col - 1) * 1000000, 0, -1000, 9000000 - (tile_row - 1) * 1000000)
                if not (source.driver == "GTiff" and source.crs.to_string() == "ESRI:54009" and source.width == source.height == 1000 and source.count == 1 and source.nodata == -200 and source.res == (1000., 1000.) and source.transform.almost_equals(expected) and source.dtypes[0] in {"float32", "float64"}):
                    raise ValueError(f"GHSL original metadata mismatch: {name}: {source.profile}")
                source_bounds = list(source.bounds)
                metadata = {"driver": source.driver, "width": source.width, "height": source.height, "bands": source.count, "dtype": source.dtypes[0], "crs": source.crs.to_string(), "crsWkt": source.crs.to_wkt(), "transform": list(source.transform), "resolutionMetres": list(source.res), "noData": source.nodata, "tags": source.tags()}
                data = source.read(1)
        density, valid, valid_area = aggregate_source(data, np)
        density_tiles[(tile_row, tile_col)] = density
        selected = (tile_rows == tile_row) & (tile_cols == tile_col)
        block_col = np.floor((mx[selected] - source_bounds[0]) / 5000).astype(int)
        block_row = np.floor((source_bounds[3] - my[selected]) / 5000).astype(int)
        if not np.all((block_col >= 0) & (block_col < 200) & (block_row >= 0) & (block_row < 200)):
            raise ValueError(f"Source-block sample escaped tile {name}")
        sampled[selected] = density[block_row, block_col]
        sources.append({"file": name, "url": BASE + name, "bytes": len(raw), "sha256": raw_hash, "member": member, "memberBytes": len(tif), "memberSha256": digest(tif), "originalRasterMetadata": metadata, "bounds54009": source_bounds, "validSourceCells": int(valid.sum()), "sourceZeroCells": int((valid & (data == 0)).sum()), "sourceNoDataCells": int((data == -200).sum()), "sourceNonfiniteCells": int((~np.isfinite(data)).sum()), "partialAggregatedBlocks": int(((valid_area > 0) & (valid_area < 25)).sum())})
        print(f"Verified {name}", flush=True)

    values = np.full((height, WIDTH), NO_DATA, dtype="float32")
    values[rows, cols] = sampled
    if np.any(values[~mask] != NO_DATA):
        raise ValueError("Non-Canada output pixels must stay missing")
    classes = np.searchsorted(BREAKS, values, side="right")
    palette = np.asarray([[int(color[i:i + 2], 16) for i in (1, 3, 5)] + [255] for color in COLORS], dtype="uint8")
    rgba = palette[classes]
    rgba[values < 0] = 0
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(OUT / "density.png", optimize=True)
    encoded = values.astype("<f4").tobytes()
    (OUT / "density.bin.gz").write_bytes(gzip.compress(encoded, mtime=0))
    if not np.array_equal(np.asarray(Image.open(OUT / "density.png")), rgba):
        raise ValueError("PNG colors differ from the classified Float32 grid")
    if gzip.decompress((OUT / "density.bin.gz").read_bytes()) != encoded:
        raise ValueError("Float32 grid gzip does not roundtrip exactly")

    population_path = ROOT / "src/data/atlas/canada/population.json"
    geometry_path = ROOT / "src/data/atlas/canada/population-geometry.json"
    cities = json.loads(population_path.read_bytes())["cmas"][:10]
    geometries = {item["id"]: item for item in json.loads(geometry_path.read_bytes())["features"]}
    city_samples = []
    for city in cities:
        lon, lat = geometries[city["id"]]["anchor"]
        x, y = project(lon, lat)
        col = math.floor((x - xmin) / (xmax - xmin) * WIDTH)
        row = math.floor((ymax - y) / (ymax - ymin) * height)
        if not (0 <= col < WIDTH and 0 <= row < height):
            raise ValueError(f"Existing CMA anchor outside output: {city['id']}")
        center_x = xmin + (col + .5) * (xmax - xmin) / WIDTH
        center_y = ymax - (row + .5) * (ymax - ymin) / height
        smx, smy = transform("EPSG:3857", "ESRI:54009", [center_x], [center_y])
        tr, tc = math.floor((9000000 - smy[0]) / 1000000) + 1, math.floor((smx[0] + 18041000) / 1000000) + 1
        br = math.floor((9000000 - (tr - 1) * 1000000 - smy[0]) / 5000)
        bc = math.floor((smx[0] - (-18041000 + (tc - 1) * 1000000)) / 5000)
        original = float(density_tiles[(tr, tc)][br, bc]) if mask[row, col] else NO_DATA
        value = float(values[row, col])
        if value != original:
            raise ValueError(f"CMA pixel query differs from the nearest source aggregate: {city['id']}")
        city_samples.append({"id": city["id"], "name": city["name"], "coordinates4326": [lon, lat], "coordinateMeaning": "Existing CMA display anchor; not municipal centre, household or observation site", "pixel": [col, row], "pixelCenter3857": [center_x, center_y], "insideCanadaMask": bool(mask[row, col]), "densityPeoplePerKm2": value if value >= 0 else None, "noData": value < 0, "sourceTile": f"R{tr}_C{tc}", "source5kmBlock": [bc, br], "classificationColor": COLORS[int(classes[row, col])] if value >= 0 else None})
    retrieved = datetime.now(timezone.utc).date().isoformat() if args.pin_inputs else old_pin["retrievedAt"]
    write_json(pin_path, {"schemaVersion": 1, "product": PRODUCT, "period": 2020, "retrievedAt": retrieved, "tiles": sources})
    available = values >= 0
    if not np.any(available):
        raise ValueError("Canada grid has no available source values")
    manifest = {"schemaVersion": 1, "countryCode": "CAN", "populationYear": 2020, "period": 2020, "projection": "EPSG:3857", "crs": "EPSG:3857", "bounds": BOUNDS, "bounds4326": BOUNDS, "bounds3857": bounds3857, "width": WIDTH, "height": height, "imageCoordinates": [[BOUNDS[0], BOUNDS[3]], [BOUNDS[2], BOUNDS[3]], [BOUNDS[2], BOUNDS[1]], [BOUNDS[0], BOUNDS[1]]], "image": "density.png", "grid": "density.bin.gz", "unit": "people/km²", "noData": NO_DATA, "breaks": BREAKS, "colors": COLORS, "sourceName": "JRC GHSL GHS-POP R2023A（2020年人口推計）", "sourceUrl": "https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "attribution": "European Commission, Joint Research Centre (JRC), GHS-POP R2023A; Canada aggregation and cartography by Insight Journal.", "source": {"product": PRODUCT, "release": "R2023A V1-0", "referenceYear": 2020, "dataNature": "Published spatial population model informed by census/administrative estimates and built-up information; not direct household observations", "crs": "ESRI:54009", "resolutionMetres": 1000, "noData": -200, "valueUnit": "estimated persons per original 1 km² equal-area cell", "datasetUrl": "https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe", "doi": "10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE", "citation": "Schiavina, Freire, Carioli and MacManus, GHS-POP R2023A, European Commission Joint Research Centre", "licenseEvidenceUrl": "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/copyright.txt", "inputManifest": "source-inputs.json", "tileCount": len(sources), "retrievedAt": retrieved}, "lookup": {"encoding": "float32-le-gzip", "order": "row-major; north-to-south rows; west-to-east columns", "cellReference": "output pixel centre", "noData": NO_DATA, "zero": 0}, "processing": {"script": "scripts/prepare-canada-population-grid.py", "scriptSha256": digest(Path(__file__).read_bytes()), "rasterioVersion": rasterio.__version__, "numpyVersion": np.__version__, "pillowVersion": pillow_version, "aggregation": "Aligned 5×5 original 1 km Mollweide cells: sum source population in float64 / count of valid original 1 km² cells; -200/nonfinite excluded from both; all-missing blocks stay -1; valid zeros remain zero. Convert aggregate once to Float32.", "sourceAggregation": [5, 5], "sourceAggregationMetres": 5000, "display": "Each Canada-masked Web Mercator output pixel centre selects the containing aligned 5 km source block (nearest aggregate). No continuous interpolation, national averages or independent population allocation.", "displayPixelMetres3857": [(xmax - xmin) / WIDTH, (ymax - ymin) / height], "mask": "Existing Canada country outline, even-odd polygon/hole inclusion at output pixel centres; outside pixels transparent and -1. No coastline expansion or nearest-land fill.", "boundaryFile": str(boundary_path.relative_to(ROOT)), "boundarySha256": digest(boundary_raw), "boundarySource": "Natural Earth public domain; existing site country geometry", "citySampleCoordinatesFile": str(geometry_path.relative_to(ROOT)), "citySampleCoordinatesSha256": digest(geometry_path.read_bytes()), "cityOrderFile": str(population_path.relative_to(ROOT)), "cityOrderSha256": digest(population_path.read_bytes()), "pngGridEquality": "Every lossless PNG pixel classifies the same Float32 sample stored in the lossless gzip lookup; both exact roundtrips checked."}, "coverage": {"maskPixels": int(mask.sum()), "validPixels": int(available.sum()), "positivePixels": int((values > 0).sum()), "zeroPixels": int((values == 0).sum()), "noDataInsideCanadaPixels": int((mask & (values < 0)).sum()), "outsideCanadaPixels": int((~mask).sum()), "densityRange": [float(values[available].min()), float(values[available].max())]}, "knownPlaceSamples": city_samples, "limitations": ["2020 modelled source population distribution; not 2021 Census counts or a 2026 population measure.", "The original source is 1 km, the chosen aggregate is 5 km; approximately 9.9 km Web Mercator display pixels do not increase detail, and their ground scale varies by latitude.", "Density denominator is valid equal-area source cells, including valid zero/water cells, not administrative land area. Aggregated border cells can cross water or neighbouring territory.", "The destination Canada outline masks surrounding countries but is generalized; small islands/coasts or concentrations between display pixel centres may be omitted. No invented population is added to gaps.", "A CMA display-anchor pixel is a local modelled density sample, not that city's/CMA's population or mean density.", "Do not sum display pixels or densities to infer Canada, provincial, municipal or urban-centre population totals."]}
    manifest["files"] = {name: {"sha256": digest((OUT / name).read_bytes()), "bytes": (OUT / name).stat().st_size} for name in ["density.png", "density.bin.gz", "source-inputs.json"]}
    write_json(OUT / "manifest.json", manifest)
    print(json.dumps({"size": [WIDTH, height], "tiles": len(sources), "validPixels": int(available.sum()), "zeroPixels": int((values == 0).sum()), "citySamples": len(city_samples), "pngGridEquality": True, "populationTotalsGenerated": False}), flush=True)


if __name__ == "__main__":
    main()
