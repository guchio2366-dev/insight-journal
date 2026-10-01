#!/usr/bin/env python3
"""Cut original MapSPAM cells into a Pacific-centred Oceania window.

Requires only NumPy and Pillow. Source cells retain their original values;
no reprojection, averaging or interpolation is performed. Country masks are
diagnostics only and never erase source values near small islands or coasts.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/atlas/oceania-crops-v1"
SOURCE_SHA256 = "34895a332ba7ff9d9732a81fe9da7063458d197f3c72ce3a405329c41f94ade2"
MEMBERS = {
    "wheat": ("WHEA", "小麦", "288f583e50e8237b0eaad880e5ef188383c97701c5015744cf6a62f2bf7dba9e"),
    "coconut": ("CNUT", "ココナツ", "8f0a9fc01265ac59c4583dda0e53fbae8bc51e863e3c267406204798cf8ead59"),
    "cacao": ("COCO", "カカオ", "78f1cc7d42026f70cef33c9f7e9a8a0da23f65ffb180926186df5069adb2b97d"),
}
BOUNDS = [110, -58, 250, 25]  # east longitudes above 180 are unwrapped
WIDTH, HEIGHT = 1680, 996
BREAKS = [1, 10, 100, 1000, 5000]
COLORS = ["edf1e3", "d7e7b4", "afd08b", "7fa95c", "4f7e3d", "23582d"]
PALETTE = np.asarray([list(bytes.fromhex(c)) + [255] for c in COLORS], dtype=np.uint8)


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def sha_canonical_lf(path: Path) -> str:
    """Hash UTF-8 source text with CRLF converted to LF, independent of checkout."""
    raw = path.read_bytes()
    raw.decode("utf-8")  # Reject unexpected source encodings rather than guess.
    return sha_bytes(raw.replace(b"\r\n", b"\n"))


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def ring_mask(ring: list, x_centres: np.ndarray, y_centres: np.ndarray) -> np.ndarray:
    """Even-odd scanlines at original pixel centres; strict polygon interior.

    Unwrap each ring continuously before shifting it to the Pacific window.
    Rings outside the window naturally contribute no cells. The scanline
    method needs no native GIS extension and handles polygon holes separately.
    """
    points = np.asarray(ring, dtype=np.float64)
    lon = np.rad2deg(np.unwrap(np.deg2rad(points[:, 0])))
    lon += 360 * round((180 - float(lon.mean())) / 360)
    lat = points[:, 1]
    mask = np.zeros((HEIGHT, WIDTH), dtype=bool)
    if lon.max() < x_centres[0] or lon.min() > x_centres[-1]:
        return mask
    x0, x1 = lon[:-1], lon[1:]
    y0, y1 = lat[:-1], lat[1:]
    rows = np.flatnonzero((y_centres > lat.min()) & (y_centres < lat.max()))
    for row in rows:
        y = y_centres[row]
        crossing = (y0 > y) != (y1 > y)
        xs = np.sort(x0[crossing] + (y - y0[crossing]) *
                     (x1[crossing] - x0[crossing]) / (y1[crossing] - y0[crossing]))
        if len(xs) % 2:
            raise ValueError("Odd number of scanline polygon crossings")
        for left, right in zip(xs[::2], xs[1::2]):
            first = np.searchsorted(x_centres, left, side="right")
            stop = np.searchsorted(x_centres, right, side="left")
            mask[row, first:stop] = True
    return mask


def country_masks(geography: dict, resolution: float, top: float) -> dict:
    # Use native centres, including the tiny source TIFF affine rounding.
    source_columns = np.concatenate((np.arange(3480, 4320), np.arange(840)))
    x = -180 + (source_columns + 0.5) * resolution
    x[840:] += 360
    y = top - (np.arange(780, 1776) + 0.5) * resolution
    masks = {}
    for feature in geography["features"]:
        if feature["properties"].get("kind") != "oceania":
            continue
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        combined = np.zeros((HEIGHT, WIDTH), dtype=bool)
        for polygon in polygons:
            land = ring_mask(polygon[0], x, y)
            for hole in polygon[1:]:
                land &= ~ring_mask(hole, x, y)
            combined |= land
        masks[feature["properties"]["code"]] = combined
    return masks


def diagnostics(values: np.ndarray, masks: dict) -> dict:
    result = {}
    for code, mask in masks.items():
        count = int(mask.sum())
        cells = values[mask]
        valid = cells >= 0
        valid_count = int(valid.sum())
        result[code] = {
            "maskCells": count,
            "validCells": valid_count,
            "missingCells": count - valid_count,
            "zeroCells": int((cells == 0).sum()),
            "positiveCells": int((cells > 0).sum()),
            "positiveAtLeast1HaCells": int((cells >= 1).sum()),
            "coverageStatus": "no-source-cell-centre-in-geometry" if not count else
                              "no-valid-source-cells" if not valid_count else
                              "partial-source-coverage" if valid_count < count else "valid-source-coverage",
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Pinned MapSPAM harvested-area ZIP")
    args = parser.parse_args()
    if sha_file(args.source) != SOURCE_SHA256:
        raise ValueError("MapSPAM source archive SHA256 differs from the pinned input")
    OUT.mkdir(parents=True, exist_ok=True)
    geography_path = ROOT / "src/data/atlas/oceania-countries.json"
    geography = json.loads(geography_path.read_text(encoding="utf-8"))
    layers = []
    masks = None
    reference_tags = None
    with zipfile.ZipFile(args.source) as archive:
        for topic, (code, title, expected_sha) in MEMBERS.items():
            member = f"spam2020V2r2_global_harvested_area/spam2020_V2r2_global_H_{code}_A.tif"
            blob = archive.read(member)
            if sha_bytes(blob) != expected_sha:
                raise ValueError(f"Source member hash mismatch: {member}")
            with Image.open(io.BytesIO(blob)) as image:
                if image.size != (4320, 2160) or image.mode != "F":
                    raise ValueError(f"Unexpected raster size or sample format: {member}")
                resolution = float(image.tag_v2[33550][0])
                tie = list(image.tag_v2[33922])
                geo_keys = list(image.tag_v2[34735])
                keys = {geo_keys[i]: geo_keys[i + 3] for i in range(4, len(geo_keys), 4)}
                if keys.get(2048) != 4326 or keys.get(1025) != 1:
                    raise ValueError("Expected EPSG:4326 pixel-is-area source")
                if abs(resolution - 1 / 12) > 1e-9 or abs(tie[3] + 180) > 1e-9 or abs(tie[4] - 90) > 1e-9:
                    raise ValueError("Unexpected source pixel affine transform")
                nodata = float(image.tag_v2[42113])
                tags = {"pixelScale": list(image.tag_v2[33550]), "modelTiepoint": tie,
                        "geoKeyDirectory": geo_keys, "noData": nodata}
                if reference_tags is None:
                    reference_tags = tags
                elif (not np.allclose(reference_tags["pixelScale"], tags["pixelScale"], rtol=0, atol=1e-9) or
                      not np.allclose(reference_tags["modelTiepoint"], tags["modelTiepoint"], rtol=0, atol=1e-9) or
                      reference_tags["noData"] != tags["noData"]):
                    raise ValueError("Crop layers do not share the expected nominal source grid")
                # Some source files have sub-microdegree affine rounding differences.
                # Calculate diagnostics at each layer's actual native cell centres.
                masks = country_masks(geography, resolution, tie[4])
                source = np.asarray(image, dtype=np.float32)
                west = source[780:1776, 3480:4320]
                east = source[780:1776, 0:840]
                values = np.concatenate((west, east), axis=1).astype("<f4")
                invalid = ~np.isfinite(values) | (values < 0)
                values[invalid] = -1
                if values.shape != (HEIGHT, WIDTH):
                    raise ValueError("Unexpected cutout dimensions")
                original = np.concatenate((west, east), axis=1)
                if not np.array_equal(values[~invalid], original[~invalid]):
                    raise ValueError("Valid original source cells changed")
                rgba = PALETTE[np.searchsorted(BREAKS, values, side="right")]
                rgba[values <= 0] = 0
                image_name, grid_name = f"{topic}.png", f"{topic}.values.gz"
                Image.fromarray(rgba).save(OUT / image_name, optimize=True)
                (OUT / grid_name).write_bytes(gzip.compress(values.tobytes(), mtime=0))
                decoded = np.frombuffer(gzip.decompress((OUT / grid_name).read_bytes()), dtype="<f4").reshape(HEIGHT, WIDTH)
                if not np.array_equal(decoded, values):
                    raise ValueError("Grid round-trip verification failed")
                with Image.open(OUT / image_name) as emitted:
                    if not np.array_equal(np.asarray(emitted), rgba):
                        raise ValueError("PNG round-trip verification failed")
                sample_locations = {"Western Australia wheatbelt": (117.0, -31.0), "Canterbury NZ": (172.0, -43.5),
                                    "Papua New Guinea": (145.0, -6.0), "Solomon Islands": (160.0, -9.5),
                                    "Fiji west of date line": (178.0, -17.0), "Fiji east of date line": (181.0, -17.0),
                                    "Samoa": (188.0, -13.8)}
                samples = []
                for name, (lon, lat) in sample_locations.items():
                    row, col = int((25 - lat) * 12), int((lon - 110) * 12)
                    source_col = (col + 3480) % 4320
                    value = float(values[row, col])
                    expected = float(source[row + 780, source_col])
                    if expected < 0 or not np.isfinite(expected):
                        expected = -1.0
                    if value != expected:
                        raise ValueError(f"Date-line/source-index spot check failed: {name}")
                    samples.append({"name": name, "longitudeUnwrapped": lon, "latitude": lat,
                                    "outputRow": row, "outputColumn": col,
                                    "sourceRow": row + 780, "sourceColumn": source_col,
                                    "valueHaPerSourceCell": value})
                layers.append({"id": topic, "sourceCode": code, "title": title, "kind": "crop",
                               "year": 2020, "unit": "ha/格子", "unitEnglish": "harvested hectares per source cell",
                               "image": image_name, "grid": grid_name, "width": WIDTH, "height": HEIGHT,
                               "bounds4326Unwrapped": BOUNDS, "breaks": BREAKS, "colors": COLORS,
                               "sourceMember": member, "sourceMemberSha256": expected_sha,
                               "nativeGeoTiffTags": tags,
                               "coverage": diagnostics(values, masks), "spotChecks": samples})
                print(f"{topic}: {WIDTH}x{HEIGHT}, source cells preserved, PNG/grid verified", flush=True)
    files = {p.name: {"bytes": p.stat().st_size, "sha256": sha_file(p)}
             for p in sorted(OUT.iterdir()) if p.is_file() and p.name != "manifest.json"}
    manifest = {
        "schemaVersion": 1, "region": "oceania", "year": 2020,
        "generator": {"file": "scripts/prepare-oceania-crops.py", "sha256": sha_canonical_lf(Path(__file__)),
                      "digestMethod": "SHA256 of UTF-8 source text with CRLF converted to LF; remaining bytes unchanged",
                      "generatedJsonEncoding": "UTF-8, LF line endings"},
        "source": {"name": "IFPRI MapSPAM 2020 v2r2 harvested area", "edition": "Harvard Dataverse version 6.0, file 13827040",
                   "url": "https://dataverse.harvard.edu/api/access/datafile/13827040",
                   "catalogUrl": "https://doi.org/10.7910/DVN/SWPENT", "sha256": SOURCE_SHA256,
                   "license": "CC BY 4.0", "licenseEvidence": "IFPRI Dataverse Terms of Use section 4; fixed archive as used by asia-farming-v1",
                   "crs": "EPSG:4326", "nominalResolutionDegrees": 1 / 12, "width": 4320, "height": 2160,
                   "nativeGeoTiffTags": reference_tags, "measurementType": "modelled harvested area"},
        "geometry": {"file": "src/data/atlas/oceania-countries.json", "sha256": sha_canonical_lf(geography_path),
                     "digestMethod": "SHA256 of UTF-8 source text with CRLF converted to LF; remaining bytes unchanged",
                     "source": geography["source"], "targetCountryOrTerritoryCount": len(masks),
                     "maskMethod": "Strict polygon-interior even-odd scanlines at native 5 arc-minute source-cell centres. Holes subtracted; rings unwrapped at date line. Diagnostics only, no value clipping."},
        "display": {"crs": "EPSG:4326 with unwrapped longitudes 110 to 250 east", "projection": "Pacific-centred equirectangular map-space rectangle",
                    "bounds4326Unwrapped": BOUNDS, "width": WIDTH, "height": HEIGHT,
                    "nominalTransform": [110, 1 / 12, 0, 25, 0, -1 / 12],
                    "sourceRowRange": [780, 1776], "sourceColumnSpans": [[3480, 4320], [0, 840]],
                    "indexConvention": "Half-open source ranges, row 0 north; original source cells concatenated west then east",
                    "nativeAffineRounding": "Source pixel step differs from nominal 1/12 degree by about 6e-11 degree. Display bounds use nominal grid edges; native pixel centres used for diagnostics. Maximum coordinate difference below 3e-7 degree. No data resampling."},
        "lookup": {"encoding": "float32-le-gzip", "noData": -1, "validZero": 0},
        "legend": {"breaks": BREAKS, "colors": COLORS,
                   "positiveClassesHaPerCell": ["0 < value < 1", "1 <= value < 10", "10 <= value < 100", "100 <= value < 1000", "1000 <= value < 5000", "value >= 5000"],
                   "zeroAndMissing": "Both transparent in PNG; lookup and coverage retain zero separately from missing. Missing must be labelled data unavailable, never no farming."},
        "method": "Exact original float32 source-cell cutout. No averaging, smoothing, interpolation or country-value mask. Same array creates colour and numerical lookup. NaN, infinities and original negative no-data normalized to -1 only.",
        "limitations": ["Harvested area is not production, yield or physical cropland area; multiple harvests can count the same ground more than once.",
                        "Five arc-minute source cells and NE 1:50m geometry do not resolve every small island. No cell centre in a polygon is not absence of farming.",
                        "No valid source cells is data unavailable; valid zero means this model estimates zero for this crop only.",
                        "Per-country cell counts diagnose source coverage and are not official national statistics.",
                        "Neither the longitude-latitude grid nor the equirectangular display is equal-area. Do not compare area by visual pixel size.",
                        "Includes source values on surrounding countries; any display clipping must preserve source values and distinguish data gaps."],
        "layers": layers, "files": files,
        "binaryDigestMethod": "SHA256 of exact archive, source TIFF member and generated PNG/gzip file bytes; no normalization",
        "verification": {"sourceArchiveHash": "passed", "sourceMemberHashes": "passed", "sourceTransformAndCrs": "passed",
                         "validCellIdentity": "passed", "gridRoundTrip": "passed", "pngRoundTrip": "passed", "dateLineSpotChecks": "passed"},
    }
    write_json(OUT / "manifest.json", manifest)


if __name__ == "__main__":
    main()
