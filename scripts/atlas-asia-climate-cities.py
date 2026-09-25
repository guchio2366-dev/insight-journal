#!/usr/bin/env python3
"""Fetch and verify official Asian station climate normals (no runtime API).

Use --discover to inspect the JMA station directory. Source HTML is cached
outside the repository; the resulting TypeScript is the versioned snapshot.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT.parent / "asia-climate-source-cache"
BASE = "https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/"
PERIOD = "1991–2020"
TERMS = "https://www.jma.go.jp/jma/kishou/info/coment.html"

# station IDs are checked against JMA's station directory before extraction.
STATIONS: list[tuple[str, str, str, str, str]] = [
    ("tokyo", "east-asia", "JPN", "東京", "47662"),
    ("sapporo", "east-asia", "JPN", "札幌", "47412"),
    ("naha", "east-asia", "JPN", "那覇", "47936"),
    ("beijing", "east-asia", "CHN", "北京", "54511"),
    ("shanghai", "east-asia", "CHN", "上海", "58362"),
    ("guangzhou", "east-asia", "CHN", "広州", "59287"),
    ("changchun", "east-asia", "CHN", "長春", "54161"),
    ("urumqi", "east-asia", "CHN", "ウルムチ", "51463"),
    ("lhasa", "east-asia", "CHN", "ラサ", "55591"),
    ("seoul", "east-asia", "KOR", "ソウル", "47108"),
    ("pyongyang", "east-asia", "PRK", "平壌", "47058"),
    ("ulaanbaatar", "east-asia", "MNG", "ウランバートル", "44292"),
    ("bangkok", "southeast-asia", "THA", "バンコク", "48455"),
    ("chiang-mai", "southeast-asia", "THA", "チェンマイ", "48327"),
    ("yangon", "southeast-asia", "MMR", "ヤンゴン", "48097"),
    ("vientiane", "southeast-asia", "LAO", "ビエンチャン", "48940"),
    ("haiphong", "southeast-asia", "VNM", "ハイフォン（フーリエン）", "48826"),
    ("da-nang", "southeast-asia", "VNM", "ダナン", "48855"),
    ("ca-mau", "southeast-asia", "VNM", "カマウ", "48914"),
    ("kuala-lumpur", "southeast-asia", "MYS", "クアラルンプール（スバン）", "48647"),
    ("kota-kinabalu", "southeast-asia", "MYS", "コタキナバル", "96471"),
    ("singapore", "southeast-asia", "SGP", "シンガポール", "48698"),
    ("bandar-seri-begawan", "southeast-asia", "BRN", "バンダルスリブガワン", "96315"),
    ("jakarta", "southeast-asia", "IDN", "ジャカルタ（スカルノ・ハッタ空港）", "96749"),
    ("makassar", "southeast-asia", "IDN", "マカッサル", "97180"),
    ("quezon-city", "southeast-asia", "PHL", "ケソン市（マニラ首都圏）", "98430"),
    ("cebu", "southeast-asia", "PHL", "セブ（マクタン）", "98646"),
    ("new-delhi", "south-central-asia", "IND", "ニューデリー", "42182"),
    ("mumbai", "south-central-asia", "IND", "ムンバイ", "43057"),
    ("chennai", "south-central-asia", "IND", "チェンナイ", "43279"),
    ("karachi", "south-central-asia", "PAK", "カラチ", "41780"),
    ("islamabad", "south-central-asia", "PAK", "イスラマバード", "41571"),
    ("dhaka", "south-central-asia", "BGD", "ダッカ", "41923"),
    ("colombo", "south-central-asia", "LKA", "コロンボ", "43466"),
    ("male", "south-central-asia", "MDV", "マレ", "43555"),
    ("astana", "south-central-asia", "KAZ", "アスタナ", "35188"),
    ("almaty", "south-central-asia", "KAZ", "アルマトイ", "36870"),
    ("tashkent", "south-central-asia", "UZB", "タシケント", "38457"),
    ("bishkek", "south-central-asia", "KGZ", "ビシュケク", "38353"),
    ("khujand", "south-central-asia", "TJK", "ホジェンド", "38599"),
    ("ashgabat", "south-central-asia", "TKM", "アシガバート", "38880"),
]
DOMESTIC_PREFECTURES = {"47662": "44", "47412": "14", "47936": "91"}


def number(value: str) -> float | None:
    value = clean(value)
    if not value or value in {"///", "-", "--", "---"}:
        return None
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", value):
        raise ValueError(f"Unrecognized numeric value: {value!r}")
    return float(value)


def parse_climatview(page: str) -> dict:
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
    occurrences: dict[int, int] = {}
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
        occurrences[month] = occurrences.get(month, 0) + 1
    if set(months) != set(range(1, 13)):
        raise ValueError(f"Expected 12 months, found {sorted(months)}")
    if any(occurrences[m] < 2 for m in range(1, 13)):
        raise ValueError("Expected each normal month in both table years")
    return {
        "coordinates": [float(lon) * (-1 if ew == "W" else 1), float(lat) * (-1 if ns == "S" else 1)],
        "elevationM": float(elevation),
        "temperatureC": [months[m][0] for m in range(1, 13)],
        "precipitationMm": [months[m][1] for m in range(1, 13)],
    }


def parse_domestic(page: str) -> dict:
    months = {}
    for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", page, re.S | re.I):
        cells = [clean(c) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row, re.S | re.I)]
        if not cells or not re.fullmatch(r"(?:[1-9]|1[0-2])月", cells[0]):
            continue
        months[int(cells[0][:-1])] = (number(cells[4]), number(cells[3]))
    if set(months) != set(range(1, 13)):
        raise ValueError(f"Expected 12 domestic JMA months, found {sorted(months)}")
    return {"temperatureC": [months[m][0] for m in range(1, 13)], "precipitationMm": [months[m][1] for m in range(1, 13)]}


def taipei() -> dict:
    sources = [
        ("temperatureC", "https://www.cwa.gov.tw/V8/C/C/Statistics/MonthlyMean/MOD/Taiwan_tx.html", "cwa-taiwan-temperature.html"),
        ("precipitationMm", "https://www.cwa.gov.tw/V8/C/C/Statistics/MonthlyMean/MOD/Taiwan_precp.html", "cwa-taiwan-precipitation.html"),
    ]
    data, hashes = {}, []
    for key, url, cache_name in sources:
        page = get(url, cache_name)
        rows = [r for r in re.findall(r"<tr\b[^>]*>(.*?)</tr>", page, re.S | re.I) if re.search(r'<th[^>]*>臺北</th>', r)]
        if len(rows) != 1:
            raise ValueError("Expected one CWA Taipei row")
        row = rows[0]
        cells = {header: clean(value) for header, value in re.findall(r'<td[^>]*headers="([^"]+)"[^>]*>(.*?)</td>', row, re.S)}
        if cells.get("period") != "1991~2020":
            raise ValueError(f"CWA Taipei normal period changed: {cells.get('period')}")
        data[key] = [number(cells[f"m{m}"]) for m in range(12)]
        hashes.append(hashlib.sha256(page.encode()).hexdigest())
    city = {
        "id": "taipei", "regionId": "east-asia", "countryCode": "TWN", "name": "台北",
        "stationId": "466920", "stationName": "臺北（Taipei）",
        # CWA station catalog, checked 2026-09-25; use the station rather than city centroid.
        "coordinates": [121.514853, 25.037658], "elevationM": 6.3,
        **data, "normalPeriod": PERIOD,
        "sourceUrl": "https://www.cwa.gov.tw/V8/C/C/Statistics/monthlymean.html",
        "sourceName": "台湾・中央気象署 気候月平均（1991–2020）",
        "sourceRetrievedAt": max(retrieved_date(name) for _, _, name in sources),
        "sourceTermsUrl": "https://www.cwa.gov.tw/V8/C/information.html",
        "sourceSha256": hashes,
        "additionalSourceUrls": [url for _, url, _ in sources] + ["https://hdps.cwa.gov.tw/static/state.html"],
        "missingMonths": {"temperature": [], "precipitation": []},
        "notes": ["降水量は中央気象署の平均値表を採用し、別提供の中央値は使用しない。", "観測所位置は中央気象署の測站一覧。1992年2月〜1997年8月は庁舎改築のため観測場所の移転があった。"],
    }
    city["summary"], city["reading"] = describe(city)
    return city


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value))).strip()


def get(url: str, cache_name: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / cache_name
    if target.exists():
        return target.read_text(encoding="utf-8")
    request = urllib.request.Request(url, headers={"User-Agent": "InsightJournal/1.0 climate source audit"})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read()
        content = raw.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
    target.write_text(content, encoding="utf-8")
    time.sleep(0.25)
    return content


def retrieved_date(cache_name: str) -> str:
    """Preserve the source retrieval date when rebuilding from cached files."""
    return datetime.fromtimestamp((CACHE / cache_name).stat().st_mtime).date().isoformat()


def directory() -> list[dict]:
    stations = {}
    for region in [1, 6, 3]:
        url = BASE + f"list.php?r={region}&e=6&y=2025&m=1&s=1&k=0"
        page = get(url, f"directory-{region}.html")
        for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", page, re.S | re.I):
            match = re.search(r'graph_mkhtml\.php\?n=(\d+)[^"\s]*">(.*?)</a>', row, re.S)
            if not match:
                continue
            cells = [clean(c) for c in re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S | re.I)]
            stations[match[1]] = {"stationId": match[1], "stationName": clean(match[2]), "country": cells[1] if len(cells) > 1 else "", "directoryRegion": region, "sourceUrl": url}
    return list(stations.values())


def describe(city: dict) -> tuple[str, str]:
    temperatures = [(m + 1, v) for m, v in enumerate(city["temperatureC"]) if v is not None]
    precipitation = [(m + 1, v) for m, v in enumerate(city["precipitationMm"]) if v is not None]
    if not temperatures and not precipitation:
        raise ValueError(f"No normals for {city['id']}")
    if not precipitation:
        cold, hot = min(temperatures, key=lambda p: p[1]), max(temperatures, key=lambda p: p[1])
        return (
            f"気温の季節差を読む。降水量の平年値は未収録。",
            f"月平均気温は{cold[0]}月の{cold[1]:.1f}℃から{hot[0]}月の{hot[1]:.1f}℃まで変化する。採用元では12か月すべての降水量平年値が欠けるため、降水量の棒や年間合計は表示しない。気温は掲載した観測所の平年値で、都市全域の平均ではない。",
        )
    if not temperatures:
        dry, wet = min(precipitation, key=lambda p: p[1]), max(precipitation, key=lambda p: p[1])
        return (
            "降水量の季節差を読む。気温の平年値は未収録。",
            f"月降水量は{wet[0]}月が{wet[1]:.1f}mm、{dry[0]}月が{dry[1]:.1f}mm。採用元では月平均気温の平年値が欠けるため、気温の折れ線は表示しない。値は掲載した観測所の平年値で、都市全域の平均ではない。",
        )
    cold, hot = min(temperatures, key=lambda p: p[1]), max(temperatures, key=lambda p: p[1])
    dry, wet = min(precipitation, key=lambda p: p[1]), max(precipitation, key=lambda p: p[1])
    annual_range = round(hot[1] - cold[1], 1)
    if annual_range < 5:
        summary = f"一年の気温差は{annual_range:.1f}℃。雨の増減に注目する。"
    elif cold[1] < 0:
        summary = f"最寒月は{cold[1]:.1f}℃。夏と冬の気温差が大きい。"
    elif wet[1] >= 3 * max(dry[1], 1):
        summary = f"{wet[0]}月の雨が多く、{dry[0]}月との季節差がある。"
    else:
        summary = f"気温と降水量の両方から季節の移り変わりを読む。"
    reading = f"月平均気温は{cold[0]}月の{cold[1]:.1f}℃から{hot[0]}月の{hot[1]:.1f}℃まで変化する。月降水量は{wet[0]}月が{wet[1]:.1f}mm、{dry[0]}月が{dry[1]:.1f}mm。"
    if len(precipitation) == 12:
        total = sum(v for _, v in precipitation)
        reading += f"12か月の降水量平年値の合計は{total:,.1f}mm。"
    else:
        reading += "欠測月があるため、年間降水量は計算しない。"
    reading += "都市全域の平均ではなく、掲載した観測所の平年値を示す。"
    return summary, reading


def validate(cities: list[dict]) -> None:
    assert len({c["id"] for c in cities}) == len(cities), "Duplicate city IDs"
    for city in cities:
        assert len(city["temperatureC"]) == len(city["precipitationMm"]) == 12, city["id"]
        assert all(v is None or -70 <= v <= 55 for v in city["temperatureC"]), city["id"]
        assert all(v is None or 0 <= v <= 4000 for v in city["precipitationMm"]), city["id"]
        lon, lat = city["coordinates"]
        assert -180 <= lon <= 180 and -90 <= lat <= 90, city["id"]
        assert city["sourceUrl"].startswith("https://"), city["id"]
        assert city["missingMonths"]["temperature"] == [m + 1 for m, v in enumerate(city["temperatureC"]) if v is None], city["id"]
        assert city["missingMonths"]["precipitation"] == [m + 1 for m, v in enumerate(city["precipitationMm"]) if v is None], city["id"]


def generate() -> None:
    available = {s["stationId"]: s for s in directory()}
    cities, failures = [], []
    for city_id, region, country, name, station_id in STATIONS:
        try:
            station = available[station_id]
            url = BASE + f"graph_mkhtml.php?n={station_id}&y=2025&m=12&e=6&r={station['directoryRegion']}&s=1&k=0"
            page = get(url, f"climatview-{station_id}.html")
            cache_name = f"climatview-{station_id}.html"
            data = parse_climatview(page)
            source_name = "気象庁 ClimatView（CLIMAT・GHCNに基づく平年値）"
            notes = []
            hashes = [hashlib.sha256(page.encode()).hexdigest()]
            if country == "JPN":
                url = f"https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no={DOMESTIC_PREFECTURES[station_id]}&block_no={station_id}&year=&month=&day=&view="
                domestic = get(url, f"jma-normal-{station_id}.html")
                cache_name = f"jma-normal-{station_id}.html"
                data.update(parse_domestic(domestic))
                source_name = "気象庁 過去の気象データ検索・平年値"
                hashes.append(hashlib.sha256(domestic.encode()).hexdigest())
                notes.append("日本の気温・降水量はClimatViewの推奨に従い国内の平年値表を採用。位置・標高はClimatViewの観測所情報。")
            city = {
                "id": city_id, "regionId": region, "countryCode": country, "name": name,
                "stationId": station_id, "stationName": station["stationName"], **data,
                "normalPeriod": PERIOD, "sourceUrl": url, "sourceName": source_name,
                "sourceRetrievedAt": retrieved_date(cache_name), "sourceTermsUrl": TERMS,
                "sourceSha256": hashes,
                "missingMonths": {"temperature": [m + 1 for m, v in enumerate(data["temperatureC"]) if v is None], "precipitation": [m + 1 for m, v in enumerate(data["precipitationMm"]) if v is None]},
                "notes": notes,
            }
            city["summary"], city["reading"] = describe(city)
            cities.append(city)
            print(f"OK {city_id}: T={len([v for v in data['temperatureC'] if v is not None])}/12 P={len([v for v in data['precipitationMm'] if v is not None])}/12", flush=True)
        except Exception as error:
            failures.append({"id": city_id, "stationId": station_id, "error": str(error)})
            print(f"FAILED {city_id}: {error}", flush=True)
    try:
        cities.append(taipei())
        print("OK taipei: T=12/12 P=12/12", flush=True)
    except Exception as error:
        failures.append({"id": "taipei", "stationId": "466920", "error": str(error)})
        print(f"FAILED taipei: {error}", flush=True)
    validate(cities)
    (CACHE / "climate-cities-candidate.json").write_text(json.dumps(cities, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (CACHE / "climate-cities-failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Parsed {len(cities)} cities; {len(failures)} failures. Candidate data saved outside repo for review.")


def write_typescript(allow_partial: bool = False) -> None:
    cities = json.loads((CACHE / "climate-cities-candidate.json").read_text(encoding="utf-8"))
    failures = json.loads((CACHE / "climate-cities-failures.json").read_text(encoding="utf-8"))
    if failures and not allow_partial:
        raise ValueError("Resolve source/parsing failures before writing the release snapshot")
    validate(cities)
    for region in ["east-asia", "southeast-asia", "south-central-asia"]:
        assert sum(c["regionId"] == region for c in cities) >= 12, f"Insufficient reviewed stations in {region}"
    heading = '''// Generated from official station-normal tables by scripts/atlas-asia-climate-cities.py.
// Monthly arrays are January–December; null means unavailable, never zero-filled.
// Display sourceName, normalPeriod, sourceUrl and missingMonths with each chart.
export type AsiaClimateCity = {
  id: string;
  regionId: 'east-asia' | 'southeast-asia' | 'south-central-asia';
  countryCode: string;
  name: string;
  stationId: string;
  stationName: string;
  coordinates: [number, number];
  elevationM?: number;
  normalPeriod: string;
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  sourceUrl: string;
  sourceName: string;
  sourceRetrievedAt: string;
  sourceTermsUrl: string;
  sourceSha256: string[];
  additionalSourceUrls?: string[];
  missingMonths: { temperature: number[]; precipitation: number[] };
  notes: string[];
  summary: string;
  reading: string;
};

export const asiaClimateCities: AsiaClimateCity[] = '''
    target = ROOT / "src/data/atlas/asia-climate-cities.ts"
    target.write_text(heading + json.dumps(cities, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(f"Wrote {len(cities)} reviewed city records: {target}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--supplement-sources", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--allow-partial", action="store_true", help="Explicitly export reviewed successful stations while retaining failures in the audit log")
    args = parser.parse_args()
    if args.discover:
        found = directory()
        target = CACHE / "station-directory.json"
        target.write_text(json.dumps(found, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Discovered {len(found)} stations: {target}")
    if args.generate:
        generate()
    if args.write:
        write_typescript(args.allow_partial)
    if args.supplement_sources:
        sources = [
            ("https://www.cwa.gov.tw/V8/C/C/Statistics/monthlymean.html", "cwa-monthlymean.html"),
            ("https://www.ncei.noaa.gov/archive/accession/0253808/data/0-data/data-composite-primary-parameters/", "ncei-composite-directory.html"),
        ]
        for url, name in sources:
            try:
                page = get(url, name)
                print(f"OK {name}: {len(page)} characters", flush=True)
            except Exception as error:
                print(f"FAILED {name}: {error}", flush=True)


if __name__ == "__main__":
    main()
