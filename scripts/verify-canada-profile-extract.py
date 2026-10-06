"""Verify every displayed Profile cell against the archived selected official CSV.
The CSV preserves columns 0–12, including the total-count SYMBOL, without duplicate-header loss.
Original download hashes, boundary method, and file hashes are in the public manifest.
"""
import csv,gzip,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
raw=root/'data-source/atlas/canada-demographics-v2/profile-selected.csv.gz'
with gzip.open(raw,'rt',encoding='utf-8',newline='') as f:
 rows=list(csv.DictReader(f))
cells={(r['DGUID'],int(r['CHARACTERISTIC_ID'])):r for r in rows}
assert len(cells)==len(rows)==14740
for topic in ['ethnicity','religion']:
 data=json.loads((root/f'src/data/atlas/canada/profile-{topic}.json').read_text())
 for r in [data['national'],*data['cmas'],*data['regions']]:
  for c in [r['denominator'],r['population'],r['density'],*r['values'].values()]:
   original=cells[(r['dguid'],c['characteristicId'])]
   value=float(original['C1_COUNT_TOTAL']) if original['C1_COUNT_TOTAL'].strip() else None
   assert c['value']==value and c['symbol']==original['SYMBOL'],(topic,r['id'],c)
manifest=json.loads((root/'public/assets/atlas/canada-demographics-v2/manifest.json').read_text())
for file,expected in manifest['outputs'].items():
 b=(root/file).read_bytes();assert len(b)==expected['bytes'] and hashlib.sha256(b).hexdigest()==expected['sha256'],file
print('All 14,740 source cells and output hashes verified.')
