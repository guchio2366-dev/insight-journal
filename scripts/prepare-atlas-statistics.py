#!/usr/bin/env python3
"""Normalize reviewed USDA files for the North America agriculture page.

Large Farm Income and PSD inputs are downloaded when updating and are not
committed. Small FATUS workbooks and the reviewed GATS rice extract live under
data-source/atlas. This script never fetches data and never fills missing rows
with zero.
"""
import argparse
import csv
import json
from pathlib import Path

from openpyxl import load_workbook


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--farm-income", required=True, type=Path)
    parser.add_argument("--psd", required=True, type=Path)
    parser.add_argument("--calendar", type=Path, default=Path("data-source/atlas/ers-fatus-calendar-2025.xlsx"))
    parser.add_argument("--markets", type=Path, default=Path("data-source/atlas/ers-fatus-top-markets-2026-09.xlsx"))
    parser.add_argument("--rice", type=Path, default=Path("data-source/atlas/rice-gats-2025.csv"))
    parser.add_argument("--generated-at", default="2026-09-13")
    parser.add_argument("--output", type=Path, default=Path("src/data/atlas/statistics-generated.ts"))
    return parser.parse_args()


def cash_receipts(path):
    labels = {
        "Cattle and calves": ("cattle-and-calves", "肉牛・子牛"),
        "Corn": ("corn", "とうもろこし"),
        "Dairy products": ("dairy-products", "乳製品"),
        "Broilers": ("broilers", "ブロイラー"),
        "Soybeans": ("soybeans", "大豆"),
    }
    selected = {}
    total = None
    with path.open(encoding="cp1252", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["Year"] != "2025" or row["State"] != "US" or row["VariableDescriptionPart2"] != "All":
                continue
            name = row["VariableDescriptionPart1"]
            if name == "All Commodities":
                total = round(float(row["Amount"]) / 1_000_000, 3)
            elif name in labels:
                selected[name] = round(float(row["Amount"]) / 1_000_000, 3)
    if total is None or set(selected) != set(labels):
        raise ValueError("Farm Income input lacks one or more required US 2025 receipt rows")
    rows = [{"id": labels[name][0], "label": labels[name][1], "value": selected[name]} for name in labels]
    rows.append({"id": "other", "label": "その他", "value": round(total - sum(selected.values()), 3)})
    return {"year": 2025, "status": "estimate", "unit": "billion USD", "total": total, "categories": rows}


def calendar_trade(path):
    sheet = load_workbook(path, data_only=True, read_only=True).active
    series = []
    for row in sheet.iter_rows(values_only=True):
        if isinstance(row[0], int) and 2016 <= row[0] <= 2025:
            series.append({"year": row[0], "exports": round(row[1] / 1000, 3), "imports": round(row[2] / 1000, 3)})
    if [row["year"] for row in series] != list(range(2016, 2026)):
        raise ValueError("FATUS calendar input must contain every year from 2016 through 2025")
    return {"period": "calendar year", "unit": "billion USD", "series": series}


def export_markets(path, rice_path):
    sheet = load_workbook(path, data_only=True, read_only=True)["Feb. update of Dec. 2025 data"]
    mapping = {"Soybeans": "soybean", "Corn": "corn", "Wheat, unmilled": "wheat", "Cotton, excluding linters": "cotton"}
    result, current = {}, None
    for row in sheet.iter_rows(values_only=True):
        label = row[0]
        if label in mapping:
            current = mapping[label]
            result[current] = {"basis": label, "year": 2025, "unit": "metric tons", "rows": [], "total": None}
        elif current and label == "World total":
            result[current]["total"] = float(row[2])
            current = None
        elif current and isinstance(row[2], (int, float)):
            result[current]["rows"].append({"country": str(label), "value": float(row[2])})
    for crop, record in result.items():
        if record["total"] is None or len(record["rows"]) < 5:
            raise ValueError(f"FATUS markets input lacks required {crop} rows")
        top = record.pop("rows")[:5]
        record["destinations"] = top + [{"country": "Other", "value": round(record["total"] - sum(row["value"] for row in top), 1)}]

    with rice_path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    total_rows = [row for row in rows if row["country"] == "World total"]
    destinations = [row for row in rows if row["country"] != "World total"]
    if len(total_rows) != 1 or len(destinations) != 6:
        raise ValueError("GATS rice extract must contain six destination rows and one world total")
    total = float(total_rows[0]["value_metric_tons_milled_equivalent"])
    parsed = [{"country": row["country"], "value": float(row["value_metric_tons_milled_equivalent"])} for row in destinations]
    if abs(sum(row["value"] for row in parsed) - total) > 0.11:
        raise ValueError("GATS rice destinations do not sum to the reviewed total")
    result["rice"] = {
        "basis": "Rice, BICO-HS10, FAS-converted line items",
        "year": 2025,
        "unit": "metric tons, milled-equivalent (MTMEQ)",
        "total": total,
        "destinations": parsed,
    }
    return result


def production(path):
    commodities = {"corn": "Corn", "soybean": "Oilseed, Soybean", "wheat": "Wheat", "cotton": "Cotton", "rice": "Rice, Milled"}
    records = {crop: {year: [] for year in range(2015, 2025)} for crop in commodities}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["Attribute_Description"] != "Production":
                continue
            crop = next((crop for crop, name in commodities.items() if name == row["Commodity_Description"]), None)
            year = int(row["Market_Year"])
            if crop and year in records[crop]:
                records[crop][year].append({"code": row["Country_Code"], "country": row["Country_Name"], "value": float(row["Value"]), "unit": row["Unit_Description"]})
    output = {}
    for crop, years in records.items():
        trend = []
        for year, rows in years.items():
            if not rows:
                raise ValueError(f"PSD input lacks {crop} production for marketing year {year}")
            world = sum(row["value"] for row in rows)
            us_rows = [row for row in rows if row["code"] == "US"]
            if len(us_rows) != 1:
                raise ValueError(f"PSD input must have exactly one US {crop} row for {year}")
            us = us_rows[0]["value"]
            trend.append({"year": year, "us": us, "world": world, "share": round(us / world * 100, 3)})
        latest = years[2024]
        world = sum(row["value"] for row in latest)
        countries = sorted(latest, key=lambda row: row["value"], reverse=True)[:5]
        if not any(row["code"] == "US" for row in countries):
            countries.append(next(row for row in latest if row["code"] == "US"))
        output[crop] = {
            "basis": commodities[crop],
            "unit": latest[0]["unit"],
            "marketYear": 2024,
            "worldTotal": world,
            "countries": [{"code": row["code"], "country": row["country"], "value": row["value"]} for row in countries],
            "trend": trend,
        }
    return output


def main():
    args = parse_args()
    result = {
        "generatedAt": args.generated_at,
        "national": {"cashReceipts": cash_receipts(args.farm_income), "trade": calendar_trade(args.calendar)},
        "exports": export_markets(args.markets, args.rice),
        "production": production(args.psd),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("export const atlasStatistics = " + json.dumps(result, ensure_ascii=False, indent=2) + " as const;\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
