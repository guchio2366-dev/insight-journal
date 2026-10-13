"""Extract only the two adopted crops from the supplied Library text, never infer x/-.

The input is Library's complete CSV extraction, not an XLSX byte copy.
Run with --check to verify the checked-in selected data without writing.
"""
import csv
import hashlib
import io
import json
import re
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source/atlas/japan-farm-regional/tokushima-2025-vegetables.library.txt'
OUTPUT = ROOT / 'src/data/atlas/japan-farm-tokushima-2025.json'
raw = SOURCE.read_bytes()
assert hashlib.sha256(raw).hexdigest() == 'b5897ceae94dcf50d3f1fe66dd5f137a77be91d4454449b7bbab190af7feda57'
text = raw.decode('utf-8')
assert text.startswith('<PARSED TEXT FOR SHEET: 1 / 1 TABS\nTAB NAME: 2(11)>\n')
rows = list(csv.DictReader(io.StringIO(text[text.index('index,Unnamed:'):])))
assert len(rows) == 33
assert rows[3]['Unnamed: 40'] == '単位：経営体，a'
for col, name in [(13, 'キャベツ'), (29, 'トマト')]:
    assert rows[4][f'Unnamed: {col}'] == name
    assert rows[5][f'Unnamed: {col}'] == '作　　付\n経営体数'
    assert rows[5][f'Unnamed: {col+1}'] == '作付面積'
assert rows[8]['Unnamed: 0'] == '36' and rows[8]['Unnamed: 1'] == '徳島県'
selected = []
for index, row in enumerate(rows[8:], 8):
    assert row['index'] == str(index)
    code = row['Unnamed: 0']
    assert code.isdigit() and len(code) == (2 if index == 8 else 3)
    record = {'id': 'JP-36' if index == 8 else '36' + code, 'name': row['Unnamed: 1']}
    for product, col in [('cabbage', 13), ('tomato', 29)]:
        record[product] = {'entities': row[f'Unnamed: {col}'], 'area': row[f'Unnamed: {col+1}']}
        for token in record[product].values():
            assert token in ('x', '-') or re.fullmatch(r'\d+(?:\.\d{1,2})?', token)
    selected.append(record)
assert len(selected) == 25 and len({row['id'] for row in selected}) == 25
result = json.dumps(selected, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert OUTPUT.read_text() == result, 'Selected data differs from Library source'
    print('Verified 25 areas × 2 crops × 2 measures against the complete Library extraction')
else:
    OUTPUT.write_text(result)
