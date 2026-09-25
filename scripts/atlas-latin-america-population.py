#!/usr/bin/env python3
"""Create an audited regional 2020 GHSL density image and query grid.

Requires NumPy, Pillow and Rasterio. Raw ZIPs stay in --cache outside the repo.
Only --download permits network access; --pin-inputs deliberately records a new
reviewed input snapshot. Normal regeneration verifies every cached ZIP hash.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
from urllib.request import Request, urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/atlas/latin-america-population-v1"
BASE = "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/tiles/"
PRODUCT = "GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0"
BOUNDS = [-93, -56, -33, 28]
CLASSES = [
    {"id": 1, "minInclusive": 0, "maxExclusive": 1, "label": "1人/km²未満", "color": "#f7fbff"},
    {"id": 2, "minInclusive": 1, "maxExclusive": 10, "label": "1～10人/km²未満", "color": "#deebf7"},
    {"id": 3, "minInclusive": 10, "maxExclusive": 50, "label": "10～50人/km²未満", "color": "#c6dbef"},
    {"id": 4, "minInclusive": 50, "maxExclusive": 100, "label": "50～100人/km²未満", "color": "#9ecae1"},
    {"id": 5, "minInclusive": 100, "maxExclusive": 500, "label": "100～500人/km²未満", "color": "#6baed6"},
    {"id": 6, "minInclusive": 500, "maxExclusive": 1000, "label": "500～1,000人/km²未満", "color": "#4292c6"},
    {"id": 7, "minInclusive": 1000, "maxExclusive": 5000, "label": "1,000～5,000人/km²未満", "color": "#2171b5"},
    {"id": 8, "minInclusive": 5000, "maxExclusive": None, "label": "5,000人/km²以上", "color": "#084594"},
]


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--deps", type=Path, help="Optional isolated Python package directory")
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--pin-inputs", action="store_true")
    args = parser.parse_args()
    if args.deps:
        sys.path.insert(0, str(args.deps.resolve()))
    import numpy as np
    from PIL import Image
    import rasterio
    from rasterio.io import MemoryFile
    from rasterio.warp import transform

    sys.dont_write_bytecode = True
    helper_path = ROOT / "scripts/atlas-latin-america-climate.py"
    spec = importlib.util.spec_from_file_location("latin_climate_helpers", helper_path)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    west, south, east, north = BOUNDS
    xmin, ymin = helper.project(west, south)
    xmax, ymax = helper.project(east, north)
    bounds3857 = [xmin, ymin, xmax, ymax]
    width = 480
    height = math.ceil((ymax - ymin) / ((xmax - xmin) / width))
    countries_path = ROOT / "src/data/atlas/regional-countries.json"
    features = [f for f in json.loads(countries_path.read_text(encoding="utf-8"))["features"]
                if f["properties"]["code"] != "MEX"
                and (f["properties"].get("region") == "South America"
                     or f["properties"].get("subregion") in {"Central America", "Caribbean"})]
    country_masks = {f["properties"]["code"]: helper.feature_mask(f, width, height, bounds3857) for f in features}
    mask = np.logical_or.reduce(list(country_masks.values()))
    rows, cols = np.where(mask)
    xs = xmin + (cols + 0.5) * (xmax - xmin) / width
    ys = ymax - (rows + 0.5) * (ymax - ymin) / height
    mx, my = transform("EPSG:3857", "ESRI:54009", xs.tolist(), ys.tolist())
    mx, my = np.asarray(mx), np.asarray(my)
    # GHSL Mollweide tile origin is (-18041000, 9000000), 1000 km per tile.
    tile_rows = np.floor((9000000 - my) / 1000000).astype(int) + 1
    tile_cols = np.floor((mx + 18041000) / 1000000).astype(int) + 1
    needed = sorted(set(zip(tile_rows.tolist(), tile_cols.tolist())))
    OUT.mkdir(parents=True, exist_ok=True)
    args.cache.mkdir(parents=True, exist_ok=True)
    pin_path = OUT / "source-inputs.json"
    previous = {row["file"]: row for row in json.loads(pin_path.read_text(encoding="utf-8"))["tiles"]} if pin_path.exists() else {}
    if not previous and not args.pin_inputs:
        raise ValueError("No pinned inputs; initial reviewed acquisition needs --pin-inputs")
    sampled = np.full(len(rows), -1.0)
    sources = []
    for tile_row, tile_col in needed:
        name = f"{PRODUCT}_R{tile_row}_C{tile_col}.zip"
        target = args.cache / name
        if not target.exists() and args.download:
            request = Request(BASE + name, headers={"User-Agent": "InsightJournal/1.0 population source audit"})
            with urlopen(request, timeout=45) as response:
                target.write_bytes(response.read())
        raw = target.read_bytes()
        if not args.pin_inputs and (name not in previous or digest(raw) != previous[name]["sha256"]):
            raise ValueError(f"Unreviewed input or hash mismatch: {name}")
        with zipfile.ZipFile(target) as archive:
            member = name[:-4] + ".tif"
            tif = archive.read(member)
        with MemoryFile(tif) as mem:
            with mem.open() as source:
                assert source.crs.to_string() == "ESRI:54009", source.crs
                assert source.width == source.height == 1000
                assert source.nodata == -200 and source.res == (1000.0, 1000.0)
                assert source.bounds.left == -18041000 + (tile_col - 1) * 1000000
                assert source.bounds.top == 9000000 - (tile_row - 1) * 1000000
                data = source.read(1)
                source_bounds = list(source.bounds)
        valid = np.isfinite(data) & (data != -200)
        assert np.all(data[valid] >= 0)
        # Source values are persons per 1 km² equal-area cell. Each output block
        # sums population and divides by its available 1 km² source-cell area.
        sums = np.where(valid, data, 0).reshape(100, 10, 100, 10).sum(axis=(1, 3))
        valid_area = valid.reshape(100, 10, 100, 10).sum(axis=(1, 3))
        density = np.divide(sums, valid_area, out=np.full((100, 100), -1.0), where=valid_area > 0)
        selected = (tile_rows == tile_row) & (tile_cols == tile_col)
        block_col = np.floor((mx[selected] - source_bounds[0]) / 10000).astype(int)
        block_row = np.floor((source_bounds[3] - my[selected]) / 10000).astype(int)
        assert np.all((block_col >= 0) & (block_col < 100) & (block_row >= 0) & (block_row < 100))
        sampled[selected] = density[block_row, block_col]
        sources.append({"file": name, "url": BASE + name, "sha256": digest(raw), "bytes": len(raw),
                        "member": member, "memberSha256": digest(tif), "memberBytes": len(tif),
                        "bounds54009": source_bounds, "validSourceCells": int(valid.sum()),
                        "sourceNoDataCells": int((~valid).sum()), "partialAggregatedBlocks": int(((valid_area > 0) & (valid_area < 100)).sum())})
    # Three significant digits preserve positive very-low-density values. Exact
    # source zeros remain zero and are distinct from unavailable (-1) cells.
    sampled = np.asarray([float(f"{v:.3g}") if v >= 0 else -1 for v in sampled])
    values = np.full((height, width), -1.0)
    values[rows, cols] = sampled
    classes = np.where(values >= 0, np.searchsorted([1, 10, 50, 100, 500, 1000, 5000], values, side="right") + 1, 0).astype(np.uint8)
    palette = np.zeros((9, 4), dtype=np.uint8)
    for item in CLASSES:
        palette[item["id"]] = [int(item["color"][i:i+2], 16) for i in (1, 3, 5)] + [255]
    Image.fromarray(palette[classes], mode="RGBA").save(OUT / "latin-america.png", optimize=True)
    grid = {"schemaVersion": 1, "regionId": "latin-america", "period": "2020", "unit": "people/km²",
            "width": width, "height": height, "bounds4326": BOUNDS, "bounds3857": bounds3857,
            "crs": "EPSG:3857", "order": "row-major; north-to-south rows; west-to-east columns",
            "cellReference": "pixel-centre", "noData": -1,
            "values": [int(v) if float(v).is_integer() else float(v) for v in values.ravel()]}
    write_json(OUT / "latin-america.grid.json", grid)
    assert np.array_equal(np.asarray(Image.open(OUT / "latin-america.png")), palette[classes])
    reloaded = np.asarray(json.loads((OUT / "latin-america.grid.json").read_text(encoding="utf-8"))["values"]).reshape(height, width)
    assert np.array_equal(values, reloaded)
    pin_data = {"schemaVersion": 1, "product": PRODUCT, "retrievedAt": "2026-09-25", "tiles": sources}
    write_json(pin_path, pin_data)
    coverage = {code: {"maskPixels": int(cm.sum()), "validPixels": int((cm & (values >= 0)).sum()),
                       "positivePixels": int((cm & (values > 0)).sum()), "noDataPixels": int((cm & (values < 0)).sum())}
                for code, cm in country_masks.items()}
    manifest = {
        "schemaVersion": 1, "version": "1.0.0", "period": "2020", "unit": "people/km²", "noData": -1,
        "sourceName": "欧州委員会 JRC・GHSL GHS-POP R2023A（2020年人口推計）",
        "sourceUrl": "https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php",
        "attribution": "European Commission, Joint Research Centre (JRC), GHS-POP R2023A, CC BY 4.0; regional aggregation and cartography by Insight Journal.",
        "classes": CLASSES,
        "source": {"product": PRODUCT, "period": "2020", "release": "R2023A V1-0", "sourceCrs": "ESRI:54009",
                   "datasetUrl": "https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe",
                   "doi": "10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE",
                   "citation": "Schiavina, Freire, Carioli and MacManus, GHS-POP R2023A, European Commission Joint Research Centre",
                   "resolutionMetres": 1000, "valueUnit": "estimated persons per 1 km² cell", "noData": -200,
                   "metadataUrl": "https://human-settlement.emergency.copernicus.eu/data/ghs_pop2023.json",
                   "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                   "licenseEvidenceUrl": "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/copyright.txt",
                   "inputManifest": "source-inputs.json", "tileCount": len(sources), "retrievedAt": "2026-09-25"},
        "processing": {"script": "scripts/atlas-latin-america-population.py", "scriptSha256": digest(Path(__file__).read_bytes()),
                       "helperScript": "scripts/atlas-latin-america-climate.py", "helperSha256": digest(helper_path.read_bytes()),
                       "rasterioVersion": rasterio.__version__, "numpyVersion": np.__version__,
                       "aggregation": "Sum population in aligned 10x10 blocks of 1 km equal-area Mollweide source cells; divide by available source-cell area in km². Cells flagged -200 are excluded from numerator and denominator; all-missing blocks remain missing.",
                       "display": "Nearest 10 km Mollweide block at each 480-pixel-wide Web Mercator output pixel centre; no national averages or continuous interpolation. Density stored to three significant digits, retaining positive values below 0.1.",
                       "mask": "Existing Latin America country/territory polygons at destination pixel centres, MEX excluded; PRI and FLK included. No enlargement of islands.",
                       "boundaryFile": "src/data/atlas/regional-countries.json", "boundarySha256": digest(countries_path.read_bytes()),
                       "boundarySource": "Natural Earth public domain; existing site country geometry",
                       "imageResampling": "nearest", "pngGridEquality": "Verified all pixels; PNG colors classify the same rounded densities stored in the query grid."},
        "limitations": ["Modelled spatial population distribution informed by census and built-up data; not household observations or a 2026 population count.",
                        "10 km aggregation and roughly 14 km Web Mercator display pixels smooth small settlements. Do not infer street-level counts.",
                        "Density denominators use source valid-cell area, not national administrative land-area statistics.",
                        "Zero is an available zero estimate; -1 is unavailable/outside mask. Very small positive values are preserved.",
                        "Small islands and coasts may be omitted by generalized polygons or display-cell centres. No invented coastal population is added.",
                        "A Web Mercator image is not equal-area; summing display values or pixels does not give total population."],
        "regions": {"latin-america": {"bounds4326": BOUNDS, "bounds3857": bounds3857, "width": width, "height": height,
                      "imageCoordinates": [[west, north], [east, north], [east, south], [west, south]],
                      "image": "latin-america.png", "grid": "latin-america.grid.json", "countryCoverage": coverage,
                      "countriesWithoutValidPixels": [c for c, v in coverage.items() if not v["validPixels"]],
                      "validPixels": int((values >= 0).sum()), "positivePixels": int((values > 0).sum()),
                      "densityRange": [float(values[values >= 0].min()), float(values.max())]}},
        "files": {name: {"sha256": digest((OUT / name).read_bytes()), "bytes": (OUT / name).stat().st_size}
                  for name in ["latin-america.png", "latin-america.grid.json", "source-inputs.json"]},
    }
    write_json(OUT / "manifest.json", manifest)
    print(f"Population: {width}x{height}; {len(sources)} tiles; {int((values >= 0).sum())} valid pixels; max {values.max()} people/km2.")
    print("Verified TIFF georeferences, 1 km cells, source nodata, nonnegative counts, regional masks and PNG/grid equality.")


if __name__ == "__main__":
    main()
