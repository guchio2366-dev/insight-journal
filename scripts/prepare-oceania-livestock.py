#!/usr/bin/env python3
"""Prepare exact GLW4 2020 sheep/cattle source cells for Oceania.

Only NumPy, Pillow and numcodecs are required. Cached, pinned Blosc source
chunks are decoded directly; no RasterIO, pyproj, averaging or interpolation.
"""

from __future__ import annotations

import argparse
import gzip
import importlib.util
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/atlas/oceania-livestock-v1"
SOURCE_URL = "https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr/"
METADATA_SHA256 = "60849b62074ea823af210c0fe6beafa36e14de2b5c61b880557d468f023dc5e3"
CHUNK_SHA256 = {
    "sheep/c/0/3": "65af83eeb536688f01ec4818e3da868bcca3efc6a755fca50da684d1be6374f8",
    "sheep/c/1/3": "6bf0469b3e6d1090ee93885d6e8a6866c25655d26c9e6f790571de0ead3dfca7",
    "sheep/c/0/0": "c6deb4bef523e486365e3c97650dd8cb5173f4c4f1a002b561952964e9cfaf22",
    "sheep/c/1/0": "83106b0bc90153cfafb296105fd7cbc03611765f6f5489571ad8ba991c25888c",
    "cattle/c/0/3": "3b66ebfae7879afb3311137200709390a57a54d45dc5a5446aece39db12e5918",
    "cattle/c/1/3": "0866f9e5fba9280e12f94aebbec96228f21a3d6d7f39631f74fcce557f3e4fbe",
    "cattle/c/0/0": "33583a1b7edd2a1d688b2d37a14fa8d1ccd5f6e7a35dfac74040870d28c2b40e",
    "cattle/c/1/0": "41d2352de6a352392b8424c69d90698ac6e2f25d0dd59936227d75bb5343e37e",
}
TITLES = {"sheep": "羊", "cattle": "牛"}
BREAKS = [1, 10, 50, 200, 1000]
COLORS = ["fff6e4", "fee5be", "f9c889", "ee9960", "cb653f", "873c31"]
PALETTE = np.asarray([list(bytes.fromhex(c)) + [255] for c in COLORS], dtype=np.uint8)


def load_crop_helpers():
    # Reuse the reviewed native-cell country mask and LF-stable JSON writer.
    path = ROOT / "scripts/prepare-oceania-crops.py"
    spec = importlib.util.spec_from_file_location("oceania_crop_helpers", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def coverage_diagnostics(values: np.ndarray, masks: dict) -> dict:
    result = {}
    for code, mask in masks.items():
        cells = values[mask]
        total, valid = int(mask.sum()), int((cells >= 0).sum())
        result[code] = {
            "maskCells": total, "validCells": valid, "missingCells": total - valid,
            "zeroCells": int((cells == 0).sum()), "positiveCells": int((cells > 0).sum()),
            "positiveAtLeast1HeadPerKm2Cells": int((cells >= 1).sum()),
            "coverageStatus": "no-source-cell-centre-in-geometry" if not total else
                              "no-valid-source-cells" if not valid else
                              "partial-source-coverage" if valid < total else "valid-source-coverage",
        }
        if result[code]["zeroCells"] + result[code]["positiveCells"] != valid:
            raise ValueError(f"Coverage counting mismatch: {code}")
    return result


def validate_source_metadata(metadata: dict, species: str) -> dict:
    array = metadata["consolidated_metadata"]["metadata"][species]
    attrs = array["attributes"]
    if array["shape"] != [2160, 4320] or array["data_type"] != "float32":
        raise ValueError("Unexpected source shape or dtype")
    if array["chunk_grid"]["configuration"]["chunk_shape"] != [1080, 1080]:
        raise ValueError("Unexpected source chunk dimensions")
    if attrs["units"] != "head/km2" or attrs["proj:code"] != "EPSG:4326":
        raise ValueError("Unexpected source units or CRS")
    if not np.allclose(attrs["spatial:transform"], [1 / 12, 0, -180, 0, -1 / 12, 90], rtol=0, atol=1e-12):
        raise ValueError("Unexpected source affine transform")
    if array["fill_value"] != "NaN":
        raise ValueError("Unexpected source no-data marker")
    expected = [
        {"name": "bytes", "configuration": {"endian": "little"}},
        {"name": "blosc", "configuration": {"typesize": 4, "cname": "zstd", "clevel": 9,
                                                 "shuffle": "noshuffle", "blocksize": 0}},
    ]
    if array["codecs"] != expected:
        raise ValueError("Unexpected source byte order or Blosc codec")
    return array


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True, help="Existing pinned GLW source chunk and metadata cache")
    parser.add_argument("--date-line-cache", type=Path, required=True, help="New cached source chunk column 0, including retrieval.json")
    parser.add_argument("--numcodecs-path", type=Path, help="Optional pre-existing importable numcodecs runtime directory")
    args = parser.parse_args()
    if args.numcodecs_path:
        sys.path.insert(0, str(args.numcodecs_path))
    from numcodecs import Blosc

    helper = load_crop_helpers()
    metadata_path = args.cache / "glw-zarr.json"
    if helper.sha_file(metadata_path) != METADATA_SHA256:
        raise ValueError("Source GLW metadata SHA256 mismatch")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    retrieval = json.loads((args.date_line_cache / "retrieval.json").read_text(encoding="utf-8"))
    retrieved = {record["key"]: record for record in retrieval["files"]}
    if retrieval["referenceYear"] != 2020 or retrieval["license"] != "CC BY 4.0":
        raise ValueError("Unexpected date-line source retrieval year or licence")
    geography_path = ROOT / "src/data/atlas/oceania-countries.json"
    geography = json.loads(geography_path.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    layers, inputs = [], []
    for species, title in TITLES.items():
        array_metadata = validate_source_metadata(metadata, species)
        native = array_metadata["attributes"]["spatial:transform"]
        masks = helper.country_masks(geography, native[0], native[5])
        values = np.full((helper.HEIGHT, helper.WIDTH), -1, dtype="<f4")
        direct = np.full((helper.HEIGHT, helper.WIDTH), np.nan, dtype="<f4")
        species_inputs = []
        for row in [0, 1]:
            # Chunk column 2 ends at 90E and is outside the 110E window.
            # Only columns 3 (90..180E) and 0 (-180..-90E) contribute cells.
            for col in [3, 0]:
                key = f"{species}/c/{row}/{col}"
                source_path = (args.cache if col == 3 else args.date_line_cache) / f"glw-{species}_c_{row}_{col}"
                raw = source_path.read_bytes()
                digest = helper.sha_bytes(raw)
                if digest != CHUNK_SHA256[key]:
                    raise ValueError(f"Source chunk SHA256 mismatch: {key}")
                if col == 0 and (retrieved[key]["sha256"] != digest or retrieved[key]["bytes"] != len(raw)):
                    raise ValueError(f"Date-line retrieval receipt mismatch: {key}")
                chunk = np.frombuffer(Blosc().decode(raw), dtype="<f4")
                if chunk.size != 1080 * 1080:
                    raise ValueError(f"Unexpected decoded chunk length: {key}")
                chunk = chunk.reshape(1080, 1080)
                start, stop = max(780, row * 1080), min(1776, (row + 1) * 1080)
                local = slice(start - row * 1080, stop - row * 1080)
                output_rows = slice(start - 780, stop - 780)
                if col == 3:
                    native_slice, output_columns = slice(240, 1080), slice(0, 840)
                else:
                    native_slice, output_columns = slice(0, 840), slice(840, 1680)
                selected = chunk[local, native_slice]
                direct[output_rows, output_columns] = selected
                values[output_rows, output_columns] = selected
                record = {"key": key, "url": SOURCE_URL + key, "file": source_path.name,
                          "sha256": digest, "bytes": len(raw), "decodedShape": [1080, 1080]}
                inputs.append(record)
                species_inputs.append(record)
        invalid = ~np.isfinite(values) | (values < 0)
        values[invalid] = -1
        if not np.array_equal(values[~invalid], direct[~invalid]):
            raise ValueError("A valid original source cell changed during extraction")
        if not np.array_equal(values == -1, ~np.isfinite(direct) | (direct < 0)):
            raise ValueError("Source missing-cell identity changed")
        rgba = PALETTE[np.searchsorted(BREAKS, values, side="right")]
        rgba[values < 0] = 0
        rgba[values == 0] = [246, 245, 235, 255]
        image_name, grid_name = f"{species}.png", f"{species}.values.gz"
        Image.fromarray(rgba).save(OUT / image_name, optimize=True)
        (OUT / grid_name).write_bytes(gzip.compress(values.tobytes(), mtime=0))
        decoded = np.frombuffer(gzip.decompress((OUT / grid_name).read_bytes()), dtype="<f4").reshape(helper.HEIGHT, helper.WIDTH)
        if not np.array_equal(decoded, values):
            raise ValueError("Emitted float32 grid differs from source values")
        with Image.open(OUT / image_name) as image:
            if not np.array_equal(np.asarray(image), rgba):
                raise ValueError("Emitted PNG differs from classifications of the numerical grid")
        if int((rgba[:, :, 3] > 0).sum()) != int((values >= 0).sum()):
            raise ValueError("PNG alpha and valid numerical cells differ")
        spots = []
        for name, lon, lat in [("Western Australia", 117.0, -31.0), ("Eastern Australia", 148.0, -32.0),
                               ("Canterbury, NZ", 172.0, -43.5), ("Papua New Guinea", 145.0, -6.0),
                               ("Fiji, west of date line", 178.0, -17.0), ("Fiji, east of date line", 181.0, -17.0),
                               ("Samoa", 188.0, -13.8)]:
            out_row, out_col = int((25 - lat) * 12), int((lon - 110) * 12)
            source_row, source_col = out_row + 780, (out_col + 3480) % 4320
            spots.append({"name": name, "longitudeUnwrapped": lon, "latitude": lat,
                          "outputRow": out_row, "outputColumn": out_col,
                          "sourceRow": source_row, "sourceColumn": source_col,
                          "sourceChunkKey": f"{species}/c/{source_row // 1080}/{source_col // 1080}",
                          "valueHeadPerKm2": float(values[out_row, out_col])})
        coverage = coverage_diagnostics(values, masks)
        layers.append({"id": species, "sourceCode": species, "title": title, "kind": "livestock",
                       "year": 2020, "unit": "頭/km²", "unitEnglish": "head/km2, modelled livestock density",
                       "image": image_name, "grid": grid_name,
                       "width": helper.WIDTH, "height": helper.HEIGHT, "bounds4326Unwrapped": helper.BOUNDS,
                       "breaks": BREAKS, "colors": COLORS, "sourceArrayMetadata": array_metadata,
                       "sourceChunks": species_inputs, "coverage": coverage, "spotChecks": spots,
                       "sourceCellCounts": {"valid": int((values >= 0).sum()), "zero": int((values == 0).sum()),
                                            "positive": int((values > 0).sum()), "missing": int((values < 0).sum())}})
        print(f"{species}: {helper.WIDTH}x{helper.HEIGHT}, original cells/PNG/grid all-pixel match passed", flush=True)
    files = {p.name: {"bytes": p.stat().st_size, "sha256": helper.sha_file(p)}
             for p in sorted(OUT.iterdir()) if p.is_file() and p.name != "manifest.json"}
    helper.write_json(OUT / "manifest.json", {
        "schemaVersion": 1, "region": "oceania", "year": 2020,
        "generator": {"file": "scripts/prepare-oceania-livestock.py", "sha256": helper.sha_canonical_lf(Path(__file__)),
                      "digestMethod": "SHA256 of UTF-8 source text with CRLF converted to LF; remaining bytes unchanged",
                      "helper": {"file": "scripts/prepare-oceania-crops.py", "sha256": helper.sha_canonical_lf(ROOT / "scripts/prepare-oceania-crops.py")},
                      "generatedJsonEncoding": "UTF-8, LF line endings"},
        "source": {"name": "FAO Gridded Livestock of the World v4 (GLW4), 2020", "edition": "CGIAR Climate Data Hub Zarr conversion, updated 2026-06-23",
                   "url": SOURCE_URL, "catalogUrl": "https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/",
                   "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                   "metadataFile": "glw-zarr.json", "metadataUrl": SOURCE_URL + "zarr.json", "metadataSha256": METADATA_SHA256,
                   "referenceYear": 2020, "crs": "EPSG:4326", "resolutionDegrees": 1 / 12,
                   "width": 4320, "height": 2160, "chunkShape": [1080, 1080], "nativeNoData": "NaN",
                   "unit": "head/km2", "measurementType": "modelled livestock density, dasymetric", "chunks": inputs},
        "geometry": {"file": "src/data/atlas/oceania-countries.json", "sha256": helper.sha_canonical_lf(geography_path),
                     "digestMethod": "SHA256 of UTF-8 source text with CRLF converted to LF; remaining bytes unchanged",
                     "source": geography["source"], "targetCountryOrTerritoryCount": len(masks),
                     "maskMethod": "Strict polygon-interior even-odd scanlines at native source-cell centres. Holes subtracted, date line unwrapped. Diagnostics only; source values never clipped."},
        "display": {"crs": "EPSG:4326 with unwrapped longitudes 110 to 250 east", "projection": "Pacific-centred equirectangular map-space rectangle",
                    "bounds4326Unwrapped": helper.BOUNDS, "width": helper.WIDTH, "height": helper.HEIGHT,
                    "nominalTransform": [110, 1 / 12, 0, 25, 0, -1 / 12],
                    "sourceRowRange": [780, 1776], "sourceColumnSpans": [[3480, 4320], [0, 840]],
                    "indexConvention": "Half-open source ranges, row 0 north; original source cells concatenated west then east",
                    "sourceChunkColumnsUsed": [3, 0], "unusedCachedChunkColumn": 2,
                    "nativeAffineRounding": "Source metadata step differs from nominal 1/12 degree by floating-point rounding only. Native source centres used for diagnostics. No values resampled."},
        "lookup": {"encoding": "float32-le-gzip", "noData": -1, "validZero": 0},
        "legend": {"breaks": BREAKS, "colors": COLORS,
                   "positiveClassesHeadPerKm2": ["0 < value < 1", "1 <= value < 10", "10 <= value < 50", "50 <= value < 200", "200 <= value < 1000", "value >= 1000"],
                   "zeroColor": "f6f5eb", "missingAlpha": 0,
                   "zeroAndMissing": "Valid zero is opaque #f6f5eb; missing is transparent. Grid and coverage preserve true zero separately from missing. Missing means data unavailable, never no livestock."},
        "method": "Exact float32 source-cell cutout from eight pinned Blosc chunks. No averaging, smoothing, interpolation or country-value clipping. Same array creates PNG classifications and numerical lookup. Nonfinite/negative missing values normalized to -1 only.",
        "limitations": ["Density is head per km2, not head per cell or national head count; never sum these densities as a livestock total.",
                        "Modelled distribution from subnational census inputs, not a direct observation of every farm.",
                        "The cattle layer combines cattle types; it cannot distinguish dairy from beef cattle. Sheep density cannot distinguish wool from meat production.",
                        "A 5 arc-minute source and NE 1:50m boundaries do not resolve every small island. No cell centre or valid model value is not absence of livestock.",
                        "Coverage cell counts are diagnostics, not official statistics. Neither geographic grid nor equirectangular display is equal-area; coloured pixel area does not measure numbers of animals.",
                        "Surrounding-country source cells are retained; display clipping must preserve missing/zero distinctions."],
        "layers": layers, "files": files,
        "binaryDigestMethod": "SHA256 of exact source metadata, compressed source chunks and generated PNG/gzip bytes; no normalization",
        "verification": {"sourceMetadataHash": "passed", "sourceChunkHashes": "passed", "sourceTransformCrsUnitsAndCodecs": "passed",
                         "allPixelValidSourceCellIdentity": "passed", "allPixelMissingSourceCellIdentity": "passed",
                         "allPixelNumericalGridIdentity": "passed", "allPixelPngClassificationIdentity": "passed",
                         "zeroAndMissingSeparated": "passed", "coverageArithmetic": "passed"},
    })


if __name__ == "__main__":
    main()
