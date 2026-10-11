"""Build a limited factual census excerpt, offline; no ethnic territory is inferred."""
from pathlib import Path
import csv, hashlib, json

ROOT = Path(__file__).resolve().parents[1]
raw = ROOT / 'data-source/atlas/africa/ethnicity/ghana-2021-table-5-5.csv'
rows = list(csv.DictReader(raw.open()))
names = list(rows[0])[3:]
total, groups = rows[0], rows[1:]
assert len(names) == 16 and len(groups) == 9
for row in groups:
    assert sum(int(row[name]) for name in names) == int(row['national'])
    assert round(int(row['national']) / int(total['national']) * 100, 1) == float(row['publishedPercent'])
for name in ['national', *names]:
    assert sum(int(row[name]) for row in groups) == int(total[name])
assert sum(int(total[name]) for name in names) == int(total['national']) == 30484536
source = {
    'publisher': 'Ghana Statistical Service',
    'label': 'ガーナ統計局：2021国勢調査 Vol.3C 表5.5',
    'url': 'https://census2021.statsghana.gov.gh/gssmain/fileUpload/reportthemelist/2021%20PHC%20General%20Report%20Vol%203C_Background%20Characteristics_181121.pdf',
    'table': '5.5', 'printedPage': 50, 'pdfPage': 64,
    'selection': 'All locality types; Both sexes; Ghanaians by major ethnic group and region',
    'retrievedAt': '2026-10-11',
    'access': 'Public publisher PDF read via web.open; numerical excerpt manually transcribed, row and column totals reconciled',
    'originalPdfSha256': None,
    'excerptPath': str(raw.relative_to(ROOT)),
    'excerptSha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
    'reuse': 'Numerical factual excerpt with publisher acknowledgement. Original report images and ethnic or administrative geometry are not redistributed. No report/GIS licence is asserted.',
}
payload = {
    'schemaVersion': 1, 'countryCode': 'GHA', 'year': 2021,
    'denominator': int(total['national']), 'denominatorLabel': '原表の Ghanaians（30,484,536人）',
    'wholeResidentPopulation': 30832019,
    'groups': [{'id': row['group'], 'national': int(row['national']), 'publishedPercent': float(row['publishedPercent'])} for row in groups],
    'regions': [{'name': name, 'total': int(total[name]), 'counts': {row['group']: int(row[name]) for row in groups}} for name in names],
    'source': source,
    'limits': ['ガーナだけの限定資料。アフリカ全域の民族構成は未取得。', '原表の対象人数は全住民30,832,019人と異なる。外国籍などを含む全住民の民族割合へ換算しない。', '州別の集計であり、民族の居住境界・均一な居住域・他国の同名集団の分布を示さない。', '分類名と対象は国勢調査に固有。言語系統や宗教分類へ置換しない。'],
}
(ROOT / 'src/data/atlas/africa-ethnicity-evidence.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
print({'groups': len(groups), 'regions': len(names), 'denominator': payload['denominator'], 'geometry': False})
