"""Fetch the authorized FAOSTAT QCL snapshot and retain calendar-2024 source rows.

Standard-library-only acquisition; the large original ZIP remains ignored locally.
Run from the repository root. Selected CSV uses explicit LF bytes for hash portability.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data-source/atlas/latin-agriculture/raw'
RAW.mkdir(parents=True, exist_ok=True)
CATALOG_URL = 'https://bulks-faostat.fao.org/production/datasets_E.json'
with urllib.request.urlopen(CATALOG_URL, timeout=90) as response:
    catalog_bytes = response.read()
(RAW / 'datasets_E.json').write_bytes(catalog_bytes)
catalog = json.loads(catalog_bytes.decode('utf-8-sig'))
metadata = next(row for row in catalog['Datasets']['Dataset'] if row['DatasetCode'] == 'QCL')
if metadata['DateUpdate'] != '2025-12-31T00:00:00':
    raise RuntimeError('QCL metadata release changed; review the source snapshot before adopting a new release.')
zip_path = RAW / 'Production_Crops_Livestock_E_All_Data_(Normalized).zip'
if not zip_path.exists():
    with urllib.request.urlopen(metadata['FileLocation'], timeout=90) as response, zip_path.open('wb') as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
zip_sha = hashlib.sha256(zip_path.read_bytes()).hexdigest()
expected = 'c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853'
if zip_sha != expected:
    raise RuntimeError('QCL source snapshot changed; independently review new release before replacing the adopted data.')
with zipfile.ZipFile(zip_path) as archive:
    member = next(name for name in archive.namelist() if name.endswith('.csv'))
    with archive.open(member) as stream:
        rows = csv.DictReader(io.TextIOWrapper(stream, encoding='utf-8-sig'))
        fields = rows.fieldnames
        selected = [row for row in rows if row['Year'] == '2024' and row['Element Code'] in ['5510', '5111'] and row['Item Code'] in ['486', '656', '236', '866', '867', '882']]
selected_path = RAW / 'faostat-qcl-2024-selected.csv'
with selected_path.open('w', encoding='utf-8', newline='') as output:
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(selected)
source = {'metadata': metadata, 'sourceMember': member, 'zipSha256': zip_sha,
          'selectedSha256': hashlib.sha256(selected_path.read_bytes()).hexdigest(),
          'retrieved': '2026-10-01', 'licence': 'CC BY 4.0',
          'terms': 'https://www.fao.org/contact-us/terms/db-terms-of-use/en',
          'selection': {'year': 2024, 'itemCodes': [486, 656, 236, 866, 867, 882], 'elementCodes': [5510, 5111]},
          'selectedCsvEncoding': 'UTF-8, LF; original column values and flags retained'}
(RAW / 'qcl-source.json').write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(f'{len(selected)} retained source rows; ZIP {zip_sha}; selected CSV {source["selectedSha256"]}')
