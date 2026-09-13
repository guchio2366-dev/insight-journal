#!/usr/bin/env python3
"""Build the small, self-hosted natural-environment atlas dataset.

Large upstream data is downloaded only while this script runs. The normal site
build consumes the checked-in files below public/assets/atlas/nature-v1.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import contourpy
import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/atlas/nature-v1"
TMP = Path(os.environ.get("ATLAS_NATURE_TMP", "/tmp/atlas-nature-v1"))
BOUNDS = (-128.0, 22.0, -64.0, 52.0)
COORDINATES = [[-128, 52], [-64, 52], [-64, 22], [-128, 22]]
USER_AGENT = "insight-journal-atlas-builder/1.0"

STATIONS = [
    ("seattle", "シアトル", "USW00024233", -122.3139, 47.4444),
    ("san-francisco", "サンフランシスコ", "USW00023272", -122.4267, 37.7705),
    ("los-angeles", "ロサンゼルス", "USW00093134", -118.2912, 34.0236),
    ("las-vegas", "ラスベガス", "USW00023169", -115.1634, 36.0719),
    ("denver", "デンバー", "USW00003017", -104.6562, 39.8466),
    ("dallas", "ダラス", "USW00013960", -96.8518, 32.8519),
    ("chicago", "シカゴ", "USW00094846", -87.9047, 41.9602),
    ("detroit", "デトロイト", "USW00094847", -83.3308, 42.2313),
    ("new-orleans", "ニューオリンズ", "USW00012916", -90.2580, 29.9933),
    ("miami", "マイアミ", "USW00012839", -80.3164, 25.7906),
    ("washington-dc", "ワシントンD.C.", "USW00013743", -77.0345, 38.8484),
    ("new-york", "ニューヨーク", "USW00094728", -73.9692, 40.7789),
]


def fetch(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=90) as response:
        return response.read()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mercator_x(longitude: float) -> float:
    return 6378137.0 * math.radians(longitude)


def mercator_y(latitude: float) -> float:
    return 6378137.0 * math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))


def build_cities() -> list[dict]:
    def read_station(record: tuple[str, str, str, float, float]) -> dict:
        city_id, name_ja, station_id, _, _ = record
        url = f"https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/access/{station_id}.csv"
        source_path = ROOT / "data/sources/nature-v1" / f"{station_id}.csv"
        raw = source_path.read_bytes() if source_path.exists() else fetch(url)
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(raw)
        (TMP / f"{station_id}.csv").write_bytes(raw)
        rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
        if len(rows) != 12:
            raise RuntimeError(f"{station_id}: expected 12 rows, found {len(rows)}")
        rows.sort(key=lambda row: int(row["DATE"]))
        assert [int(row["DATE"]) for row in rows] == list(range(1,13))
        assert all(row["STATION"] == station_id for row in rows)
        first = rows[0]
        temperature = [round((float(row["MLY-TAVG-NORMAL"]) - 32) * 5 / 9, 1) for row in rows]
        precipitation = [round(float(row["MLY-PRCP-NORMAL"]) * 25.4, 1) for row in rows]
        return {
            "id": city_id,
            "nameJa": name_ja,
            "stationId": station_id,
            "stationName": first["NAME"],
            "longitude": float(first["LONGITUDE"]),
            "latitude": float(first["LATITUDE"]),
            "elevationM": float(first["ELEVATION"]),
            "period": "1991–2020",
            "temperatureC": temperature,
            "precipitationMm": precipitation,
            "annualPrecipitationMm": round(sum(float(row["MLY-PRCP-NORMAL"]) * 25.4 for row in rows)),
            "monthlyQuality": [{key:row[key].strip() for key in row if key.startswith(("meas_","comp_","years_")) and ("MLY-TAVG-NORMAL" in key or "MLY-PRCP-NORMAL" in key)} for row in rows],
            "sourceUrl": url,
            "inputSha256": hashlib.sha256(raw).hexdigest(),
        }

    with ThreadPoolExecutor(max_workers=6) as pool:
        values = list(pool.map(read_station, STATIONS))
    return values


def build_aquifers() -> str:
    service = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Aquifers_Feature_Layer_view/FeatureServer/0/query"
    query = {
        "where": "AQ_NAME IN ('High Plains Aquifer','Central Valley Aquifer System','Mississippi River Valley Alluvial Aquifer','Floridan Aquifer System')",
        "outFields": "AQ_NAME,ROCK_NAME,ROCK_TYPE",
        "returnGeometry": "true",
        "outSR": "4326",
        "geometryPrecision": "4",
        "maxAllowableOffset": "0.015",
        "f": "geojson",
    }
    url = service + "?" + urlencode(query)
    raw = fetch(url)
    data = json.loads(raw)
    for index, feature in enumerate(data["features"]):
        feature["properties"]["id"] = f"aquifer-{index}"
        feature["properties"]["kind"] = "aquifer"
        feature["properties"]["nameJa"] = {
            "High Plains Aquifer": "ハイプレーンズ帯水層",
            "Central Valley Aquifer System": "セントラルバレー帯水層系",
            "Mississippi River Valley Alluvial Aquifer": "ミシシッピ川谷沖積帯水層",
            "Floridan Aquifer System": "フロリダ帯水層系",
        }[feature["properties"]["AQ_NAME"]]
    data.pop("crs", None)
    write_json(OUTPUT / "aquifers.geojson", data)
    return url


def main():
    import subprocess
    import sys
    OUTPUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    cities=build_cities()
    write_json(OUTPUT / 'climate-cities.json', cities)
    audit=[]
    for city in cities:
        raw=(ROOT/'data/sources/nature-v1'/f"{city['stationId']}.csv").read_text()
        rows=sorted(csv.DictReader(io.StringIO(raw)),key=lambda row:int(row['DATE']))
        audit.append({'id':city['id'],'stationId':city['stationId'],'months':[{'month':i+1,'temperatureF':float(row['MLY-TAVG-NORMAL']),'precipitationIn':float(row['MLY-PRCP-NORMAL']),**city['monthlyQuality'][i]} for i,row in enumerate(rows)]})
    write_json(ROOT/'data/sources/nature-v1/monthly-audit.json',audit)
    # The committed source ledger pins the adopted snapshot and its definitions.
    # Re-running upstream fetches creates a new snapshot: review differences before release.
    if not (OUTPUT / 'aquifers.geojson').exists():
        build_aquifers()
    for name in ['fetch-nature-climate.py', 'fetch-nature-dem.py', 'refine-atlas-nature.py', 'package-nature-assets.py', 'render-nature-fallbacks.py', 'finalize-nature-manifest.py']:
        subprocess.run([sys.executable, str(ROOT / 'scripts' / name)], check=True)

if __name__ == '__main__':
    main()
