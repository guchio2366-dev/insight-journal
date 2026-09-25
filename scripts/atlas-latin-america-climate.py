#!/usr/bin/env python3
"""Build Latin American climate raster and verified JMA station normals from a pinned Beck et al. (2023) data archive.

Requires Python 3.11+, Pillow and NumPy. No network is used unless --download
is passed. Only the final regional grids are shipped by the normal site build.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import html
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
OUT = ROOT / "public/assets/atlas/latin-america-climate-v1"
ARCHIVE_URL = "https://ndownloader.figshare.com/files/45057352"
ARCHIVE_SHA256 = "d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d"
ARCHIVE_MD5 = "b19c60b2c83380bd1010911f377139e5"
SOURCE_MEMBER = "1991_2020/koppen_geiger_0p1.tif"
RADIUS = 6378137.0
PIXEL_METRES = RADIUS * math.pi / 180 * 0.1
GEOGRAPHY = ROOT / "src/data/atlas/regional-countries.json"

REGIONS = {
    "latin-america": {"bounds": [-93, -56, -33, 28], "countries": []},
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

JMA_BASE = "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/"
STATIONS = [
    ("havana", "ハバナ（カサブランカ）", "CUB", "78325", "CASA BLANCA, LA HABANA", "002c4ea290a8b1a2698584f43e735a6237cac5456a25e922d42a6e060b840143"),
    ("kingston", "キングストン（ノーマン・マンレー空港）", "JAM", "78397", "KINGSTON/NORMAN MANLEY", "6832eb3e7e659cb55f53ca2dee18a306f4bc370b59603155080084ceedc9d41b"),
    ("belize", "ベリーズシティ周辺（国際空港）", "BLZ", "78583", "BELIZE/PHILLIP GOLDSTON INTL. AIRPORT", "fed2ef4041832225f2a8f9dfbf08fb29aa946215b391a379cde54374ea7a6ec9"),
    ("san-jose", "サンホセ周辺（フアン・サンタマリア空港）", "CRI", "78762", "JUAN SANTAMARIA INT. AIRPORT", "6f66ec571abda1088504b55bc29a9d7d685866dbf77ff176b672296957cac1dc"),
    ("manaus", "マナウス", "BRA", "82331", "MANAUS", "d87fc65a65b71de83a4f8d018042cff3b2edefb07a5d89312d5bb997c74ce0c2"),
    ("brasilia", "ブラジリア", "BRA", "83377", "BRASILIA", "5710af6b319e37ca8a3a1802ca76d47a8d9d53e9e5564f5ca23723a9c2119f32"),
    ("sao-paulo", "サンパウロ", "BRA", "83781", "SAO PAULO", "197da5e1fb9060d13a740cd993b33fc5dc8475333c3cd563be8b2a453e44b46f"),
    ("recife", "レシフェ", "BRA", "82900", "RECIFE", "bd16dadf680dccbd8ab008e01fb231d7f036bec2ebe35721e408d744064ca9b2"),
    ("lima", "リマ（カヤオ）", "PER", "84628", "LIMA/CALLAO", "84d3b820a3e899338b90e4daac09b1397fc30d324a22f56cca66f0cb90a57de0"),
    ("bogota", "ボゴタ（エルドラド空港）", "COL", "80222", "BOGOTA/ELDORADO", "a29c091f563cccf9ad5932dff105755bb5e84c33fbed79673947c2917628f3a0"),
    ("buenos-aires", "ブエノスアイレス", "ARG", "87585", "BUENOS AIRES OBSERVATORIO", "4f8e644d2c85823d48e727fa3a7ecfc90f9397d3d53bb36192104a176cc5cb59"),
    ("santiago", "サンティアゴ（キンタ・ノルマル）", "CHL", "85577", "QUINTA NORMAL", "e66bd0c35bd612e756475c052ef06985d4af59b9f17f5980b7b2cb971f3dc894"),
    ("la-paz", "ラパス周辺（エルアルト）", "BOL", "85201", "LA PAZ/ALTO", "bb8462123ddf55bbbdbd00f5c32fd01f7e6311c845756b2e0510c237428e5b36"),
    ("quito-izobamba", "キト南郊（イソバンバ）", "ECU", "84088", "IZOBAMBA", "57f436a3c719da54962a0ec5566bd1d9fc384e73256f4446231223349f934ab0"),
    ("punta-arenas", "プンタアレナス", "CHL", "85934", "PUNTA ARENAS", "fbda6955e0786a3f1424ef098573cccb758a4f4e3bb7f28fe3369895242300ea"),
    ("montevideo", "モンテビデオ（カラスコ空港）", "URY", "86580", "CARRASCO", "e9573fd7f8bc6dcfe5026d5378eb6fe2ad05d3f0b0af4607751684c750c98c79"),
]


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value))).strip()


def number(value: str) -> float | None:
    value = clean(value)
    if not value or value in {"///", "-", "--", "---"}:
        return None
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", value):
        raise ValueError(f"Unrecognized numeric value: {value!r}")
    return float(value)


def parse_climatview(page: str) -> dict:
    # Only the two Normal columns, never Observation or SPI, feed the charts.
    if not re.search(r'colspan="4">Observation</th>\s*<th[^>]*colspan="2">Normal</th>\s*<th[^>]*colspan="3">SPI</th>', page):
        raise ValueError("ClimatView observation/normal column headers changed")
    info_match = re.search(r'<div id="info">(.*?)</div>', page, re.S)
    if not info_match:
        raise ValueError("Station metadata block is missing")
    info = clean(info_match[1])
    location = re.search(r"Lat\.:\s*([\d.-]+)\s*°([NS])\s*/\s*Lon\.:\s*([\d.-]+)\s*°([EW]).*?Height:\s*([\d.-]+)\(m\)", info)
    if not location:
        raise ValueError(f"Unrecognized station coordinates: {info}")
    lat, ns, lon, ew, elevation = location.groups()
    months: dict[int, tuple[float | None, float | None]] = {}
    for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", page, re.S | re.I):
        cells = [clean(c) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row, re.S | re.I)]
        if not cells or not re.fullmatch(r"\d{4}-\d{2}", cells[0]):
            continue
        if len(cells) != 10:
            raise ValueError(f"Unexpected JMA table width: {cells}")
        month = int(cells[0][-2:])
        normal = (number(cells[5]), number(cells[6]))
        if month in months and months[month] != normal:
            raise ValueError(f"Normals disagree across table years for month {month}")
        months[month] = normal
    if set(months) != set(range(1, 13)):
        raise ValueError(f"Expected 12 months, found {sorted(months)}")
    return {
        "longitude": float(lon) * (-1 if ew == "W" else 1),
        "latitude": float(lat) * (-1 if ns == "S" else 1),
        "elevationM": float(elevation),
        "temperatureC": [months[m][0] for m in range(1, 13)],
        "precipitationMm": [months[m][1] for m in range(1, 13)],
    }


def describe_city(data: dict) -> str:
    temperature, rain = data["temperatureC"], data["precipitationMm"]
    assert all(v is not None for v in temperature + rain), "These 16 reviewed stations have complete normals"
    cold = min(range(12), key=temperature.__getitem__)
    hot = max(range(12), key=temperature.__getitem__)
    wet = max(range(12), key=rain.__getitem__)
    dry = min(range(12), key=rain.__getitem__)
    return (f"月平均気温は{cold + 1}月の{temperature[cold]:.1f}℃から{hot + 1}月の{temperature[hot]:.1f}℃。"
            f"降水量は{wet + 1}月の{rain[wet]:.1f}mmが最多、{dry + 1}月の{rain[dry]:.1f}mmが最少。"
            "都市全域の平均ではなく、掲載した観測所の平年値。")


def build_cities(cache: Path, allow_download: bool) -> list[dict]:
    cache.mkdir(parents=True, exist_ok=True)
    cities, provenance = [], []
    for city_id, name, country, station_id, station_name, expected_sha in STATIONS:
        url = JMA_BASE + f"graph_mkhtml.php?n={station_id}&y=2025&m=12&e=6&r=5&s=1&k=0"
        target = cache / f"climatview-{station_id}.html"
        if not target.exists() and allow_download:
            request = Request(url, headers={"User-Agent": "InsightJournal/1.0 climate source audit"})
            with urlopen(request, timeout=45) as response:
                content = response.read().decode(response.headers.get_content_charset() or "utf-8")
            # Pin the same UTF-8/LF artifact format used for the reviewed snapshot.
            target.write_text(content.replace("\r\n", "\n").replace("\r", "\n"), encoding="utf-8", newline="\n")
        raw = target.read_bytes()
        if digest(raw) != expected_sha:
            raise ValueError(f"Source changed for station {station_id}; review and repin before regeneration")
        page = raw.decode("utf-8")
        info = clean(re.search(r'<div id="info">(.*?)</div>', page, re.S)[1])
        assert info.startswith(station_name + " -"), (station_id, info)
        data = parse_climatview(page)
        assert all(v is None or -60 <= v <= 50 for v in data["temperatureC"])
        assert all(v is None or 0 <= v <= 4000 for v in data["precipitationMm"])
        assert -93 <= data["longitude"] <= -33 and -56 <= data["latitude"] <= 28
        city = {"id": city_id, "name": name, "countryCode": country,
                **data, "period": "1991–2020", "stationName": station_name, "stationId": station_id,
                "summary": describe_city(data), "sourceUrl": url,
                "sourceName": "気象庁 ClimatView（CLIMAT・GHCNの平年値を加工）"}
        cities.append(city)
        provenance.append({"id": city_id, "stationId": station_id, "sourceUrl": url,
                           "sourceCache": target.name, "sourceSha256": digest(raw), "sourceBytes": len(raw),
                           "retrievedAt": "2026-09-25", "period": city["period"],
                           "missingMonths": {"temperature": [i + 1 for i, v in enumerate(data["temperatureC"]) if v is None],
                                             "precipitation": [i + 1 for i, v in enumerate(data["precipitationMm"]) if v is None]},
                           "valuesSha256": digest(json.dumps(data, ensure_ascii=False, sort_keys=True).encode("utf-8"))})
    assert len(cities) == len({city["id"] for city in cities}) == 16
    write_json(OUT / "cities-provenance.json", {
        "schemaVersion": 1, "period": "1991–2020", "retrievedAt": "2026-09-25",
        "source": "Japan Meteorological Agency ClimatView",
        "methodologyUrl": JMA_BASE + "outline.html",
        "termsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
        "terms": "JMA public data terms (version 1.0); attribution and indication of processing required, subject to separately identified rights.",
        "attribution": "気象庁 ClimatViewの平年値をもとにInsight Journalが図表化。気象庁が作成した図表ではありません。",
        "processing": "Strict extraction of Normal columns 5 and 6 (zero-based) from ten-column monthly table; repeated years must agree. Month arrays January–December; coordinates and elevation from station metadata. Source cache is decoded UTF-8 HTML; hashes refer to cached artifacts, not compressed HTTP transport bytes.",
        "limitations": ["Station observations do not represent an entire city or country.",
                        "JMA notes that erroneous values and data-free periods may remain despite quality checking.",
                        "Quito-area Izobamba, La Paz/El Alto and airport stations are explicitly named with station coordinates and elevation; they are not city-centre normals."],
        "excludedCandidates": [{"stationId": "78806", "reason": "JMA endpoint returned HTTP 500 during retrieval; not fabricated"},
                               {"stationId": "82899", "reason": "Recife airport had no normals; Recife station 82900 used instead"},
                               {"stationId": "84071", "reason": "Old Quito airport had no normals; separately named Izobamba station used"}],
        "stations": provenance,
    })
    print(f"Verified {len(cities)} station tables, 384 monthly normal values, station names and locations.")
    return cities


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
    parser.add_argument("--city-cache", type=Path, required=True, help="JMA source HTML cache outside the repository")
    parser.add_argument("--download", action="store_true", help="Download the pinned public archive if it does not exist")
    args = parser.parse_args()
    if not args.archive.exists() and args.download:
        args.archive.parent.mkdir(parents=True, exist_ok=True)
        request = Request(ARCHIVE_URL, headers={"User-Agent": "insight-journal-latin-climate/1.0"})
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
    REGIONS["latin-america"]["countries"] = sorted(code for code, feature in features.items()
        if code != "MEX" and (feature["properties"].get("region") == "South America"
        or feature["properties"].get("subregion") in {"Central America", "Caribbean"}))
    regions = {name: build_region(name, config, source, palette, features) for name, config in REGIONS.items()}
    write_json(OUT / "legend.json", classes)
    (OUT / "source-legend.txt").write_bytes(legend_raw)
    cities = build_cities(args.city_cache, args.download)
    ts = "// Generated by scripts/atlas-latin-america-climate.py.\n"
    ts += "// Monthly arrays are January–December; null denotes unavailable, never zero-filled.\n"
    ts += "import type { LatinClimateCity } from './latin-america-types';\n"
    ts += "export type LatinClimateClass = { id:number; code:string; name:string; color:string; description:string; group:'熱帯'|'乾燥帯'|'温帯'|'冷帯'|'寒帯'; sourceLabel:string };\n"
    ts += "export const climateClasses: LatinClimateClass[] = " + json.dumps(classes, ensure_ascii=False, indent=2) + ";\n"
    ts += "export const latinClimateCities: LatinClimateCity[] = " + json.dumps(cities, ensure_ascii=False, indent=2) + ";\n"
    ts += "export const latinClimatePeriod = '1991–2020';\n"
    ts += "export const latinClimateAttribution = 'Beck et al. (2023), CC BY 4.0';\n"
    (ROOT / "src/data/atlas/latin-america-climate.ts").write_text(ts, encoding="utf-8", newline="\n")
    filenames = ["legend.json", "source-legend.txt", "cities-provenance.json"] + [f"{r}{suffix}" for r in REGIONS for suffix in (".png", ".grid.json")]
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
        "processing": {"script": "scripts/atlas-latin-america-climate.py", "scriptSha256": digest(Path(__file__).read_bytes()),
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
                        "Country masks follow the site's source geometry; this is not an independent statement on disputed boundaries.",
                        "Scope matches the existing Latin America atlas (34 countries/territories including PRI and FLK, excluding Mexico). French Guiana is not a separate feature in the site source geometry."],
        "regions": regions,
        "generatedTypeScript": {"path": "src/data/atlas/latin-america-climate.ts",
                                "sha256": digest((ROOT / "src/data/atlas/latin-america-climate.ts").read_bytes()),
                                "bytes": (ROOT / "src/data/atlas/latin-america-climate.ts").stat().st_size},
        "files": {filename: {"bytes": (OUT / filename).stat().st_size, "sha256": digest((OUT / filename).read_bytes())} for filename in filenames},
    }
    write_json(OUT / "manifest.json", manifest)
    print("Verified source checksum, TIFF georeference, class range, legend, masks and PNG/query equality.")


if __name__ == "__main__":
    main()
