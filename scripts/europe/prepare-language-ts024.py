"""Build the England/Wales TS024 LAD language map from the retained Library text extract."""

import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data-source/atlas/europe/population-cases/census2021-ts024-ltla-library-extract.csv"
BOUNDARY = ROOT / "public/assets/atlas/europe/population-cases-v1/england-wales-lad2021.geojson"
OUTPUT = ROOT / "src/data/atlas/europe/main-language-ts024-2021.json"

# Zero-based positions in the CSV, retained with the original ONS column labels.
CATEGORIES = [
    ("other", "英語以外の主言語（ウェールズでは英語・ウェールズ語以外）", None),
    ("polish", "ポーランド語", 23),
    ("romanian", "ルーマニア語", 26),
    ("french", "フランス語", 17),
    ("portuguese", "ポルトガル語", 18),
    ("spanish", "スペイン語", 19),
    ("arabic", "アラビア語", 52),
    ("south-asian", "南アジアの言語（原表の合計）", 59),
    ("urdu", "ウルドゥー語", 60),
    ("panjabi", "パンジャーブ語", 62),
]
TOP_LEVEL = [5, 6, 7, 17, 18, 19, 20, 40, 45, 47, 50, 51, 52, 53, 59, 73, 84, 85, 86, 89, 105, 109]
SUBGROUPS = {7: range(8, 17), 20: range(21, 40), 40: range(41, 45), 45: [46], 47: range(48, 50), 53: range(54, 59), 59: range(60, 73), 73: range(74, 84), 86: range(87, 89), 89: range(90, 105), 105: range(106, 109)}


def main():
    with SOURCE.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        rows = list(reader)
    assert len(header) == 110 and len(rows) == 331
    assert header[3] == "geography code"
    assert header[4] == "Main language (detailed): Total: All usual residents aged 3 years and over"
    assert header[5] == "Main language (detailed): English (English or Welsh in Wales)"
    codes = [feature["properties"]["code"] for feature in json.loads(BOUNDARY.read_text())["features"]]
    assert len(codes) == 331 and len(set(codes)) == 331
    assert {row[3] for row in rows} == set(codes)
    areas = []
    for index, row in enumerate(rows):
        assert len(row) == 110 and int(row[0]) == index and row[1] == "2021"
        numbers = [int(value) for value in row[4:]]
        assert all(value >= 0 for value in numbers)
        total, english_welsh = numbers[:2]
        assert total > 0 and english_welsh <= total
        assert sum(int(row[column]) for column in TOP_LEVEL) == total
        assert all(sum(int(row[child]) for child in children) == int(row[parent]) for parent, children in SUBGROUPS.items())
        assert not row[3].startswith("W") or int(row[6]) == 0
        counts = [total - english_welsh if column is None else int(row[column]) for _, _, column in CATEGORIES]
        assert all(count <= total for count in counts)
        areas.append({"code": row[3], "name": row[2], "denominator": total, "counts": counts})
    payload = {
        "source": "https://www.ons.gov.uk/datasets/TS024/editions/2021/versions/1",
        "title": "ONS Census 2021 TS024 Main language (detailed), lower-tier local authority",
        "year": 2021,
        "geography": "England and Wales, 331 lower-tier local authorities",
        "denominator": header[4],
        "categories": [{"id": key, "label": label, "sourceColumn": header[column] if column is not None else "Derived: column 4 minus column 5", "columnIndex": column} for key, label, column in CATEGORIES],
        "areas": areas,
        "provenance": {
            "libraryFilename": "census2021-ts024-ltla.csv",
            "libraryReportedBytes": 118153,
            "retainedTextExtract": str(SOURCE.relative_to(ROOT)),
            "retainedTextExtractSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "note": "Text read in four contiguous Library windows. This SHA-256 is for the retained parsed-text extract, not the original CSV bytes.",
        },
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Validated {len(areas)} TS024 rows against {len(codes)} boundary codes; wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
