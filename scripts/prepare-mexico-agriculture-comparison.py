#!/usr/bin/env python3
"""Keep same-year FAOSTAT Mexico/world production comparisons reproducible."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CROP = ROOT / 'data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv'
LIVESTOCK = ROOT / 'data-source/atlas/livestock/faostat-qcl-2024-extract.json'
OUTPUT = ROOT / 'src/data/atlas/mexico/agriculture-comparison-2024.json'
ITEMS = {'coffee': ('656', CROP, '生豆'), 'beef': ('867', LIVESTOCK, '骨付き牛肉'),
         'dairy': ('882', LIVESTOCK, '牛の生乳'), 'pork': ('1035', LIVESTOCK, '骨付き豚肉'),
         'broiler': ('1058', LIVESTOCK, '鶏肉'), 'eggs': ('1062', LIVESTOCK, '殻付き鶏卵')}


def rows(path):
    if path == CROP:
        with path.open(newline='') as file:
            return list(csv.DictReader(file))
    return json.loads(path.read_text())


def matched(data, area, item):
    found = [row for row in data if row['Area Code'] == area and row['Item Code'] == item
             and row['Element Code'] == '5510' and row['Year'] == '2024' and row['Unit'] == 't']
    if len(found) != 1:
        raise ValueError(f'expected one production row for area={area}, item={item}; got {len(found)}')
    return found[0]


def main():
    data = {path: rows(path) for path in (CROP, LIVESTOCK)}
    products = {}
    for product_id, (item, path, definition) in ITEMS.items():
        mexico = matched(data[path], '138', item)
        world = matched(data[path], '5000', item)
        numerator, denominator = float(mexico['Value']), float(world['Value'])
        if not 0 < numerator <= denominator:
            raise ValueError(f'invalid production comparison: {product_id}')
        products[product_id] = {'itemCode': item, 'definition': definition,
                                'mexicoTonnes': numerator, 'worldTonnes': denominator,
                                'sharePct': round(numerator / denominator * 100, 4)}
    payload = {'year': 2024, 'elementCode': '5510', 'unit': 't', 'products': products,
               'sources': [{'path': str(path.relative_to(ROOT)),
                            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in (CROP, LIVESTOCK)]}
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
