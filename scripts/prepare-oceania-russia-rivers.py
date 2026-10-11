#!/usr/bin/env python3
"""Extract named Natural Earth 50m river polylines for regional reading maps.

The source geometry is preserved. This script neither infers flow direction nor
derives a drainage basin or river length. Provide the pinned official GeoJSON.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson"
SOURCE_SHA = "f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51"
RIVERS = {
    "russia": ["Volga", "Ob", "Yenisey", "Lena", "Amur"],
    "oceania": ["Murray", "Darling", "Waikato"],
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    if digest(raw) != SOURCE_SHA:
        raise ValueError("Natural Earth GeoJSON differs from the verified v5.1.2 original")
    features = json.loads(raw)["features"]
    for region, names in RIVERS.items():
        records = []
        for name in names:
            matching = [f for f in features if f["properties"].get("name_en") == name
                        and f["properties"].get("featurecla") == "River"]
            if not matching:
                raise ValueError("Named source river is absent: " + name)
            lines = [line for feature in matching for line in feature["geometry"]["coordinates"]]
            if any(len(line) < 2 for line in lines):
                raise ValueError("Unexpected river segment length: " + name)
            longest = max(lines, key=len)
            records.append({"name": name, "lines": lines, "labelPosition": longest[len(longest) // 2],
                            "sourceFeatures": len(matching)})
        output = {"schemaVersion": 1, "region": region, "publisher": "Natural Earth",
                  "edition": "1:50m v5.1.2", "license": "Public domain",
                  "sourceUrl": SOURCE_URL, "sourceSha256": SOURCE_SHA,
                  "use": "Selected named river centreline positions only. No flow direction, mouth, discharge, basin boundary, present-day survey accuracy, or completeness claim.",
                  "rivers": records}
        path = ROOT / "public/assets/atlas" / f"{region}-rivers-v1.json"
        path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
        print(region, len(records), path.stat().st_size)


if __name__ == "__main__":
    main()
