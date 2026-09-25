#!/usr/bin/env python3
"""Build Asia climate rasters from a pinned Beck et al. (2023) data archive.

Requires Python 3.11+, Pillow and NumPy. No network is used unless --download
is passed. Only the final regional grids are shipped by the normal site build.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import io
import json
import math
from pathlib import Path
import platform
import re
from urllib.request import Request, urlopen
import zipfile

import numpy as np
from PIL import Image, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/atlas/asia-climate-v1"
ARCHIVE_URL = "https://ndownloader.figshare.com/files/45057352"
ARCHIVE_SHA256 = "d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d"
ARCHIVE_MD5 = "b19c60b2c83380bd1010911f377139e5"
SOURCE_MEMBER = "1991_2020/koppen_geiger_0p1.tif"
RADIUS = 6378137.0
PIXEL_METRES = RADIUS * math.pi / 180 * 0.1
GEOGRAPHY = ROOT / "src/data/atlas/regional-countries.json"

REGIONS = {
    "east-asia": {"bounds": [72, 17, 147, 55], "countries": "CHN MNG PRK KOR TWN JPN".split()},
    "southeast-asia": {"bounds": [90, -12, 143, 30], "countries": "BRN KHM IDN LAO MYS MMR PHL SGP THA TLS VNM".split()},
    "south-central-asia": {"bounds": [44, -2, 100, 57], "countries": "AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB".split()},
}

JAPANESE = {
    "Af": ("熱帯雨林気候", "明瞭な乾季がない熱帯の区分。"),
    "Am": ("熱帯モンスーン気候", "短い乾季を持つ、降水量の多い熱帯の区分。"),
    "Aw": ("サバナ気候", "乾季を持つ熱帯の区分。"),
    "BWh": ("高温の砂漠気候", "乾燥帯のうち、高温の砂漠気候に当たる区分。"),
    "BWk": ("低温の砂漠気候", "乾燥帯のうち、低温の砂漠気候に当たる区分。"),
    "BSh": ("高温のステップ気候", "乾燥帯のうち、高温の半乾燥気候に当たる区分。"),
    "BSk": ("低温のステップ気候", "乾燥帯のうち、低温の半乾燥気候に当たる区分。"),
    "Csa": ("夏に乾燥する高温夏の温帯", "夏に乾燥し、夏の気温が高い温帯の区分。"),
    "Csb": ("夏に乾燥する温暖夏の温帯", "夏に乾燥し、夏が温暖な温帯の区分。"),
    "Csc": ("夏に乾燥する冷夏の温帯", "夏に乾燥し、夏が短く涼しい温帯の区分。"),
    "Cwa": ("冬に乾燥する高温夏の温帯", "冬に乾燥し、夏の気温が高い温帯の区分。"),
    "Cwb": ("冬に乾燥する温暖夏の温帯", "冬に乾燥し、夏が温暖な温帯の区分。"),
    "Cwc": ("冬に乾燥する冷夏の温帯", "冬に乾燥し、夏が短く涼しい温帯の区分。"),
    "Cfa": ("温暖湿潤気候", "明瞭な乾季がなく、夏の気温が高い温帯の区分。"),
    "Cfb": ("西岸海洋性気候", "明瞭な乾季がなく、夏が温暖な温帯の区分。名称は海岸からの距離を示すものではない。"),
    "Cfc": ("乾季のない冷夏の温帯", "明瞭な乾季がなく、夏が短く涼しい温帯の区分。"),
    "Dsa": ("夏に乾燥する高温夏の冷帯", "寒い冬と高温の夏を持ち、夏に乾燥する冷帯の区分。"),
    "Dsb": ("夏に乾燥する温暖夏の冷帯", "寒い冬と温暖な夏を持ち、夏に乾燥する冷帯の区分。"),
    "Dsc": ("夏に乾燥する冷夏の冷帯", "寒い冬と短く涼しい夏を持ち、夏に乾燥する冷帯の区分。"),
    "Dsd": ("夏に乾燥する厳冬の冷帯", "とくに厳しい冬を持ち、夏に乾燥する冷帯の区分。"),
    "Dwa": ("冬に乾燥する高温夏の冷帯", "寒く乾燥する冬と、高温の夏を持つ冷帯の区分。"),
    "Dwb": ("冬に乾燥する温暖夏の冷帯", "寒く乾燥する冬と、温暖な夏を持つ冷帯の区分。"),
    "Dwc": ("冬に乾燥する冷夏の冷帯", "寒く乾燥する冬と、短く涼しい夏を持つ冷帯の区分。"),
    "Dwd": ("冬に乾燥する厳冬の冷帯", "とくに厳しく乾燥する冬を持つ冷帯の区分。"),
    "Dfa": ("乾季のない高温夏の冷帯", "明瞭な乾季がなく、寒い冬と高温の夏を持つ冷帯の区分。"),
    "Dfb": ("乾季のない温暖夏の冷帯", "明瞭な乾季がなく、寒い冬と温暖な夏を持つ冷帯の区分。"),
    "Dfc": ("乾季のない冷夏の冷帯", "明瞭な乾季がなく、寒い冬と短く涼しい夏を持つ冷帯の区分。"),
    "Dfd": ("乾季のない厳冬の冷帯", "明瞭な乾季がなく、とくに厳しい冬を持つ冷帯の区分。"),
    "ET": ("ツンドラ気候", "短い夏に気温が上がるが、樹木の生育に適した暖かさに達しない寒帯の区分。"),
    "EF": ("氷雪気候", "最も暖かい月も平均気温が0℃未満となる寒帯の区分。"),
}
GROUPS = {"A": "熱帯", "B": "乾燥帯", "C": "温帯", "D": "冷帯", "E": "寒帯"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")


def project(lon: float, lat: float) -> tuple[float, float]:
    return RADIUS * math.radians(lon), RADIUS * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def parse_legend(raw: bytes) -> list[dict]:
    result = []
    for line in raw.decode("utf-8").splitlines():
        match = re.match(r"\s*(\d+):\s+(\w+)\s+(.+?)\s+\[(\d+)\s+(\d+)\s+(\d+)\]", line)
        if not match:
            continue
        value, code, english, red, green, blue = match.groups()
        name, description = JAPANESE[code]
        result.append({"id": int(value), "code": code, "name": name,
                       "color": "#" + "".join(f"{int(v):02x}" for v in (red, green, blue)),
                       "description": description, "group": GROUPS[code[0]], "sourceLabel": english})
    assert [r["id"] for r in result] == list(range(1, 31))
    return result


def ring_mask(ring: list, width: int, height: int, bounds: list) -> np.ndarray:
    """Even-odd rasterization at pixel centres, without expanding small islands."""
    west, south, east, north = bounds
    coords = []
    for lon, lat in ring:
        x, y = project(lon, lat)
        coords.append(((x - west) / (east - west) * width, (north - y) / (north - south) * height))
    mask = np.zeros((height, width), dtype=bool)
    intersections: list[list[float]] = [[] for _ in range(height)]
    for (x1, y1), (x2, y2) in zip(coords, coords[1:] + coords[:1]):
        if y1 == y2:
            continue
        first = max(0, math.ceil(min(y1, y2) - 0.5))
        stop = min(height, math.ceil(max(y1, y2) - 0.5))
        for row in range(first, stop):
            intersections[row].append(x1 + (row + 0.5 - y1) * (x2 - x1) / (y2 - y1))
    for row, values in enumerate(intersections):
        values.sort()
        assert len(values) % 2 == 0
        for left, right in zip(values[::2], values[1::2]):
            first = max(0, math.ceil(left - 0.5))
            stop = min(width, math.ceil(right - 0.5))
            mask[row, first:stop] = True
    return mask


def feature_mask(feature: dict, width: int, height: int, bounds: list) -> np.ndarray:
    geom = feature["geometry"]
    polygons = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    mask = np.zeros((height, width), dtype=bool)
    for rings in polygons:
        polygon = ring_mask(rings[0], width, height, bounds)
        for hole in rings[1:]:
            polygon &= ~ring_mask(hole, width, height, bounds)
        mask |= polygon
    return mask


def build_region(region_id: str, config: dict, source: np.ndarray, palette: np.ndarray, features: dict) -> dict:
    west, south, east, north = config["bounds"]
    xmin, ymin = project(west, south)
    xmax, ymax = project(east, north)
    bounds3857 = [xmin, ymin, xmax, ymax]
    width = math.ceil((xmax - xmin) / PIXEL_METRES)
    height = math.ceil((ymax - ymin) / PIXEL_METRES)
    xs = xmin + (np.arange(width) + 0.5) * (xmax - xmin) / width
    ys = ymax - (np.arange(height) + 0.5) * (ymax - ymin) / height
    lons = np.degrees(xs / RADIUS)
    lats = np.degrees(2 * np.arctan(np.exp(ys / RADIUS)) - np.pi / 2)
    source_columns = np.floor((lons + 180) / 0.1).astype(int)
    source_rows = np.floor((90 - lats) / 0.1).astype(int)
    sampled = source[np.ix_(source_rows, source_columns)]
    mask = np.zeros((height, width), dtype=bool)
    coverage = {}
    for code in config["countries"]:
        country_mask = feature_mask(features[code], width, height, bounds3857)
        mask |= country_mask
        pixels = sampled[country_mask]
        coverage[code] = {"maskPixels": int(len(pixels)), "classifiedPixels": int(np.count_nonzero(pixels)),
                          "sourceNoDataPixels": int(np.count_nonzero(pixels == 0)),
                          "classIds": sorted(int(c) for c in np.unique(pixels) if c != 0)}
    values = np.where(mask, sampled, 0).astype(np.uint8)
    assert int(values.max()) <= 30
    image_file = f"{region_id}.png"
    grid_file = f"{region_id}.grid.json"
    Image.fromarray(palette[values], mode="RGBA").save(OUT / image_file, optimize=True)
    grid = {"schemaVersion": 1, "regionId": region_id, "period": "1991–2020", "width": width,
            "height": height, "bounds4326": config["bounds"], "bounds3857": bounds3857,
            "crs": "EPSG:3857", "order": "row-major; north-to-south rows; west-to-east columns",
            "cellReference": "pixel-centre", "noData": 0,
            "values": values.ravel().tolist()}
    write_json(OUT / grid_file, grid)
    # Ensure the shipped PNG and the shipped query grid are exactly the same field.
    reread = np.asarray(Image.open(OUT / image_file).convert("RGBA"))
    assert np.array_equal(reread, palette[np.asarray(json.loads((OUT / grid_file).read_text(encoding="utf-8"))["values"], dtype=np.uint8).reshape(height, width)])
    counts = Counter(int(v) for v in values.ravel() if v)
    output = {"bounds4326": config["bounds"], "bounds3857": bounds3857, "width": width, "height": height,
              "imageCoordinates": [[west, north], [east, north], [east, south], [west, south]],
              "pixelSizeMetres3857": [(xmax - xmin) / width, (ymax - ymin) / height],
              "image": image_file, "grid": grid_file,
              "classIds": sorted(counts), "classPixelCounts": {str(k): counts[k] for k in sorted(counts)},
              "classifiedPixels": sum(counts.values()), "countryCoverage": coverage,
              "countriesWithoutClassifiedPixels": [c for c, data in coverage.items() if not data["classifiedPixels"]]}
    print(f"{region_id}: {width}x{height}, {len(counts)} classes, no classified pixels: {output['countriesWithoutClassifiedPixels']}")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True, help="Pinned archive path, preferably outside the repository")
    parser.add_argument("--download", action="store_true", help="Download the pinned public archive if it does not exist")
    args = parser.parse_args()
    if not args.archive.exists() and args.download:
        args.archive.parent.mkdir(parents=True, exist_ok=True)
        request = Request(ARCHIVE_URL, headers={"User-Agent": "insight-journal-asia-climate/1.0"})
        with urlopen(request, timeout=120) as response, args.archive.open("wb") as target:
            while chunk := response.read(1024 * 1024):
                target.write(chunk)
    raw = args.archive.read_bytes()
    if digest(raw) != ARCHIVE_SHA256:
        raise RuntimeError("Source archive SHA-256 differs from the pinned input. Do not silently replace the dataset.")
    assert hashlib.md5(raw).hexdigest() == ARCHIVE_MD5
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        tif_raw = archive.read(SOURCE_MEMBER)
        legend_raw = archive.read("legend.txt")
    source_image = Image.open(io.BytesIO(tif_raw))
    assert source_image.size == (3600, 1800) and source_image.mode == "L"
    assert tuple(source_image.tag_v2[33550])[:2] == (0.1, 0.1)
    assert tuple(source_image.tag_v2[33922])[3:5] == (-180.0, 90.0)
    assert source_image.tag_v2[42113] == "0"
    assert 4326 in source_image.tag_v2[34735]
    source = np.asarray(source_image)
    assert int(source.min()) == 0 and int(source.max()) == 30
    classes = parse_legend(legend_raw)
    palette = np.zeros((31, 4), dtype=np.uint8)
    for entry in classes:
        palette[entry["id"]] = [int(entry["color"][i:i+2], 16) for i in (1, 3, 5)] + [255]
    OUT.mkdir(parents=True, exist_ok=True)
    features = {f["properties"]["code"]: f for f in json.loads(GEOGRAPHY.read_text(encoding="utf-8"))["features"]}
    regions = {name: build_region(name, config, source, palette, features) for name, config in REGIONS.items()}
    write_json(OUT / "legend.json", classes)
    (OUT / "source-legend.txt").write_bytes(legend_raw)
    ts = "// Generated by scripts/atlas-asia-climate.py from the pinned source legend.\n"
    ts += "export type AsiaClimateClass = { id:number; code:string; name:string; color:string; description:string; group:'熱帯'|'乾燥帯'|'温帯'|'冷帯'|'寒帯'; sourceLabel:string };\n"
    ts += "export const asiaClimateClasses: AsiaClimateClass[] = " + json.dumps(classes, ensure_ascii=False, indent=2) + ";\n"
    ts += "export const asiaClimatePeriod = '1991–2020';\n"
    ts += "export const asiaClimateAttribution = 'Beck et al. (2023), CC BY 4.0';\n"
    (ROOT / "src/data/atlas/asia-climate-definitions.ts").write_text(ts, encoding="utf-8", newline="\n")
    filenames = ["legend.json", "source-legend.txt"] + [f"{r}{suffix}" for r in REGIONS for suffix in (".png", ".grid.json")]
    manifest = {
        "schemaVersion": 1, "version": "1.0.0", "period": "1991–2020", "noData": 0,
        "attribution": "Beck et al. (2023), CC BY 4.0. Regional extraction, reprojection and country masking by Insight Journal.",
        "source": {"title": "High-resolution (1 km) Köppen–Geiger maps for 1901–2099 based on constrained CMIP6 projections",
                   "citation": "Beck et al. (2023), Scientific Data 10, 724", "paperUrl": "https://doi.org/10.1038/s41597-023-02549-6",
                   "datasetUrl": "https://doi.org/10.6084/m9.figshare.21789074.v1", "metadataUrl": "https://api.figshare.com/v2/articles/21789074/versions/1",
                   "archiveUrl": ARCHIVE_URL, "archiveSha256": ARCHIVE_SHA256,
                   "archiveBytes": len(raw), "member": SOURCE_MEMBER, "memberSha256": digest(tif_raw), "memberBytes": len(tif_raw),
                   "legendMember": "legend.txt", "legendSha256": digest(legend_raw),
                   "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                   "licenseEvidenceUrl": "https://www.gloh2o.org/koppen/", "retrievedAt": "2026-09-25",
                   "edition": "Figshare record version 1, published 2024-03-15; immutable file 45057352. Do not equate the repository record version with the map product V1/V2/V3 names.",
                   "sourceResolutionDegrees": 0.1, "sourceCrs": "EPSG:4326", "sourceNoData": 0,
                   "sourceResolutionNote": "Use the publisher's supplied 0.1-degree majority-resampled classification, approximately 11 km north–south. This is not a 1 km display.",
                   "evidenceType": "Climate classification derived from observation-based climatologies; not a station measurement or a present-day weather observation."},
        "processing": {"script": "scripts/atlas-asia-climate.py", "scriptSha256": digest(Path(__file__).read_bytes()),
                       "runtime": {"python": platform.python_version(), "numpy": np.__version__, "pillow": pillow_version},
                       "crs": "EPSG:3857", "resampling": "Nearest source 0.1-degree cell at each destination pixel centre. No continuous interpolation of class IDs.",
                       "gridOrder": "row-major; north-to-south rows; west-to-east columns", "targetPixelSizeMetres3857": PIXEL_METRES,
                       "displayAndQuery": "PNG RGBA colors and grid JSON values are generated from the same masked UInt8 array; exact equality is verified after writing.",
                       "imageSource": "MapLibre image coordinates ordered top-left, top-right, bottom-right, bottom-left. Set raster-resampling to nearest.",
                       "mask": "Country polygon even-odd fill at destination pixel centres. Outside the selected region is transparent. Small islands are not enlarged or assigned a nearby class.",
                       "boundaryFile": "src/data/atlas/regional-countries.json", "boundarySha256": digest(GEOGRAPHY.read_bytes()),
                       "boundarySource": "Natural Earth Admin 0 Countries, existing site 1:110m + selected 1:50m small-country geometry; public domain",
                       "boundaryUrl": "https://www.naturalearthdata.com/about/terms-of-use/",
                       "noDataMeaning": "0 includes source ocean/no data and land outside the selected region. It is never a measured zero or a climate class."},
        "limitations": ["Generalized country outlines and 0.1-degree climate cells omit some coasts and small islands.",
                        "A destination pixel count is not an area total, population weight or national statistic; EPSG:3857 cells are not equal-area on the ground.",
                        "The displayed climate class may differ from a nearby station's own monthly normals. Do not infer station observations from this raster.",
                        "1991–2020 is a climatological period, not today's weather or a future projection.",
                        "Country masks follow the site's source geometry; this is not an independent statement on disputed boundaries."],
        "regions": regions,
        "files": {filename: {"bytes": (OUT / filename).stat().st_size, "sha256": digest((OUT / filename).read_bytes())} for filename in filenames},
    }
    write_json(OUT / "manifest.json", manifest)
    print("Verified source checksum, TIFF georeference, class range, legend, masks and PNG/query equality.")


if __name__ == "__main__":
    main()
