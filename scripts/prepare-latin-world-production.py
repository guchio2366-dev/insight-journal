"""Retain FAOSTAT 2024 World production totals for existing Latin crop layers."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv"
METADATA = ROOT / "data-source/atlas/latin-agriculture/raw/qcl-source.json"
OUTPUT = ROOT / "src/data/atlas/latin-america/world-production-2024.json"
ITEMS = (("soyb", "236", "Soya beans"), ("bana", "486", "Bananas"), ("coff", "656", "Coffee, green"))


def main():
    raw = SOURCE.read_bytes()
    source_sha = hashlib.sha256(raw).hexdigest()
    metadata = json.loads(METADATA.read_text())
    if source_sha != metadata["selectedSha256"]:
        raise ValueError("FAOSTAT selected source checksum changed")
    with SOURCE.open(newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(stream))
    retained = []
    for layer_id, item_code, item_name in ITEMS:
        matches = [row for row in rows if row["Area Code"] == "5000" and row["Area"] == "World"
                   and row["Item Code"] == item_code and row["Item"] == item_name
                   and row["Element Code"] == "5510" and row["Element"] == "Production"
                   and row["Year"] == "2024" and row["Unit"] == "t"]
        if len(matches) != 1 or not matches[0]["Value"] or matches[0]["Flag"] != "A":
            raise ValueError(f"Expected one 2024 official World production row for {layer_id}")
        retained.append({"layerId": layer_id, "itemCode": int(item_code),
                         "worldT": float(matches[0]["Value"]), "flag": matches[0]["Flag"]})
    output = {"year": 2024, "unit": "t", "scope": "FAOSTAT World aggregate",
              "sourceFile": str(SOURCE.relative_to(ROOT)), "sourceSha256": source_sha,
              "sourceUrl": metadata["metadata"]["FileLocation"],
              "retrieved": metadata["retrieved"], "licence": metadata["licence"],
              "items": retained}
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
