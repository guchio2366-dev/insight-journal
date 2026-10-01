"""Regenerate the Mexico agriculture release from retained official INEGI CSV ZIPs.

Python standard library only. No network requests or workbook rewriting.
Run from any directory: python scripts/prepare-mexico-agriculture.py
"""
from __future__ import annotations

import csv
from decimal import Decimal
import hashlib
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source/atlas/mexico/agriculture'
DESTINATION = ROOT / 'src/data/atlas/mexico/agriculture.json'
PUBLIC = ROOT / 'public/assets/atlas/mexico-agriculture-v1'
AGRICULTURE_ZIP = SOURCE / 'raw/ca_2022_upagro_csv.zip'
FORESTRY_ZIP = SOURCE / 'forestry/raw/ca_2022_upfores_csv.zip'
RETRIEVED = '2026-10-01'

JAPANESE_NAMES = [
    'アグアスカリエンテス', 'バハ・カリフォルニア', 'バハ・カリフォルニア・スル',
    'カンペチェ', 'コアウイラ', 'コリマ', 'チアパス', 'チワワ', 'メキシコ市',
    'ドゥランゴ', 'グアナフアト', 'ゲレロ', 'イダルゴ', 'ハリスコ', 'メヒコ',
    'ミチョアカン', 'モレロス', 'ナヤリット', 'ヌエボ・レオン', 'オアハカ',
    'プエブラ', 'ケレタロ', 'キンタナ・ロー', 'サン・ルイス・ポトシ', 'シナロア',
    'ソノラ', 'タバスコ', 'タマウリパス', 'トラスカラ', 'ベラクルス', 'ユカタン', 'サカテカス',
]

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def table(archive_path: Path, name: str) -> list[dict[str, str]]:
    with zipfile.ZipFile(archive_path) as archive:
        raw = archive.read(f'conjunto_datos/{name}.csv')
    return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))

def number(raw: str, *, field: str, code: str) -> float:
    # The selected state-level indicators are all published numeric cells.
    # Blank CSV cells cannot be interpreted globally: source XLSX has both NA and *.
    if raw.strip() in ('', '*', 'NA', 'N/A'):
        raise ValueError(f'Non-numeric source value: {code} {field} {raw!r}')
    value = Decimal(raw)
    if not value.is_finite() or value < 0:
        raise ValueError(f'Invalid source number: {code} {field} {raw!r}')
    return float(value)

def indexed(rows: list[dict[str, str]], field: str, *, complete: bool = True) -> dict[str, dict[str, str]]:
    result = {}
    for row in rows:
        code = row[field].strip().split(' ')[0].zfill(2)
        if code in result:
            raise ValueError(f'Duplicate state {code}')
        result[code] = row
    if complete and set(result) != {f'{n:02}' for n in range(33)}:
        raise ValueError(f'Expected national plus 32 states, got {sorted(result)}')
    return result

def source_metadata(path: Path) -> dict[str, str]:
    with zipfile.ZipFile(path) as archive:
        name = next(n for n in archive.namelist() if n.startswith('metadatos/'))
        text = archive.read(name).decode('utf-8-sig')
    metadata = {}
    for line in text.splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            if key in ('license', 'modified', 'temporal', 'identifier', 'title'):
                metadata[key] = value.strip()
    if metadata.get('license') != 'https://www.inegi.org.mx/inegi/terminos.html':
        raise ValueError(f'Unexpected licence metadata in {path}')
    return metadata

def main() -> None:
    irrigation = indexed([r for r in table(AGRICULTURE_ZIP, 'ca2022_11') if not r['NOM_MUN']], 'NOMBRE')
    maize = indexed([r for r in table(AGRICULTURE_ZIP, 'ca2022_agr02')
                     if not r['NOM_MUN'] and r['CULTIVO'] == 'Maíz grano blanco'], 'ENT_FED')
    autumn_winter = indexed([r for r in table(AGRICULTURE_ZIP, 'ca2022_agr04')
                             if not r['NOM_MUN'] and r['CULTIVO'] == 'Maíz grano blanco'], 'ENT_FED', complete=False)
    forestry = indexed(table(FORESTRY_ZIP, 'ca2022_for15'), 'CVE_ENT')
    records = []
    for code in sorted(irrigation):
        source = irrigation[code]
        values = {
            'agriculturalAreaHa': number(source['SUP_AGRIC'], field='SUP_AGRIC', code=code),
            'irrigatedAreaHa': number(source['SUP_RIEGO'], field='SUP_RIEGO', code=code),
            'rainfedAreaHa': number(source['SUP_TEMP'], field='SUP_TEMP', code=code),
            'maizeWhiteProductionT': number(maize[code]['TON_AGCA'], field='TON_AGCA', code=code),
            'maizeWhiteIrrigatedProductionT': number(maize[code]['TON_AGCA_R'], field='TON_AGCA_R', code=code),
            'maizeWhiteRainfedProductionT': number(maize[code]['TON_AGCA_T'], field='TON_AGCA_T', code=code),
            'pineObtainedM3': number(forestry[code]['VOL_OBT_PINO'], field='VOL_OBT_PINO', code=code),
        }
        if abs(values['agriculturalAreaHa'] - values['irrigatedAreaHa'] - values['rainfedAreaHa']) > .0001:
            raise ValueError(f'Irrigation area denominator does not balance: {code}')
        values['irrigationSharePct'] = values['irrigatedAreaHa'] / values['agriculturalAreaHa'] * 100
        records.append({'code': code, 'name': source['ENTIDAD'].strip(),
                        'nameJa': 'メキシコ全国' if code == '00' else JAPANESE_NAMES[int(code)-1],
                        **values, 'status': 'valid'})
    national, states = records[0], records[1:]
    balances = {}
    for field in ('agriculturalAreaHa', 'irrigatedAreaHa', 'rainfedAreaHa', 'maizeWhiteProductionT', 'pineObtainedM3'):
        total = sum(Decimal(str(s[field])) for s in states)
        difference = total - Decimal(str(national[field]))
        if abs(difference) > Decimal('.0001'):
            raise ValueError(f'National balance failed: {field} {difference}')
        balances[field] = {'sumOfStates': float(total), 'publishedNational': national[field], 'difference': float(difference)}
    definitions = {
        'irrigationSharePct': '活動中の農業生産単位が持つ農業用地総面積（播種・非播種・休耕を含む）に占める灌漑面積。州全体の面積や生産単位数を分母にしない。',
        'maizeWhiteProductionT': '露地栽培の一年生作物である白粒トウモロコシの穀粒生産量。黄粒・青粒・飼料用・生食用のトウモロコシを含めない。',
        'pineObtainedM3': '活動中の林業生産単位が取得した松材の体積（丸太以外の形態も含む）。森林面積、蓄積、認可量、販売量、林業GDPとは異なる。',
        'period': 'センサスの参照期間は2021年10月～2022年9月。年次統計や気象平年値とは別の期間。',
        'status': '選択した32州の主指標はすべて公表数値。0を維持する。原表の*は秘匿、NAは非該当。CSV空欄は原表・行の意味に照合し、一律に0や秘匿へ変換しない。',
    }
    sinaloa_autumn_winter = autumn_winter['25']
    case_study = {'code': '25', 'crop': 'Maíz grano blanco', 'cycle': 'Otoño-invierno',
                  'productionT': number(sinaloa_autumn_winter['TON_AGOI'], field='TON_AGOI', code='25'),
                  'irrigatedProductionT': number(sinaloa_autumn_winter['TON_AGOI_R'], field='TON_AGOI_R', code='25'),
                  'rainfedProductionT': number(sinaloa_autumn_winter['TON_AGOI_T'], field='TON_AGOI_T', code='25')}
    case_study['irrigatedProductionSharePct'] = case_study['irrigatedProductionT'] / case_study['productionT'] * 100
    payload = {'schemaVersion': 1, 'period': {'from': '2021-10-01', 'to': '2022-09-30',
               'label': '2022年農業センサス', 'display': '2021年10月～2022年9月'},
               'definitions': definitions, 'national': national, 'states': states,
               'caseStudies': {'sinaloaAutumnWinterWhiteMaize': case_study}}
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (PUBLIC / 'agriculture.json').write_bytes(DESTINATION.read_bytes())
    with (PUBLIC / 'selected-states.csv').open('w', encoding='utf-8', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    sources = [
        {'id': 'irrigation', 'table': 'ca2022_11', 'columns': ['SUP_AGRIC', 'SUP_RIEGO', 'SUP_TEMP'],
         'unit': 'ha; derived share %', 'transform': 'SUP_RIEGO / SUP_AGRIC × 100'},
        {'id': 'maize', 'table': 'ca2022_agr02', 'columns': ['TON_AGCA', 'TON_AGCA_R', 'TON_AGCA_T'],
         'unit': 't', 'filter': 'CULTIVO=Maíz grano blanco; NOM_MUN blank; national + state totals'},
        {'id': 'autumn-winter', 'table': 'ca2022_agr04', 'columns': ['TON_AGOI', 'TON_AGOI_R'],
         'unit': 't', 'filter': 'CULTIVO=Maíz grano blanco; NOM_MUN blank; ENT_FED starts 25; Sinaloa case only; no absent-state imputation'},
        {'id': 'pine', 'table': 'ca2022_for15', 'columns': ['VOL_OBT_PINO'], 'unit': 'm³', 'filter': 'CVE_ENT=00–32'},
    ]
    for source in sources:
        source['sourceUrl'] = f'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/{source["table"]}.xlsx'
        workbook = SOURCE / ('forestry/raw' if source['id'] == 'pine' else 'raw') / f'{source["table"]}.xlsx'
        source['retainedWorkbook'] = str(workbook.relative_to(ROOT)).replace('\\', '/')
        source['workbookSha256'] = sha256(workbook)
    manifest = {'version': 1, 'retrieved': RETRIEVED, 'licence': 'INEGI Términos de Libre Uso',
        'licenceUrl': 'https://www.inegi.org.mx/inegi/terminos.html', 'sources': sources,
        'sourceArchives': [
            {'path': str(path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha256(path),
             'url': f'https://www.inegi.org.mx/contenidos/programas/ca/2022/datosabiertos/{path.name}',
             'metadata': source_metadata(path)} for path in (AGRICULTURE_ZIP, FORESTRY_ZIP)],
        'coverage': {'states': 32, 'nationalRows': 1, 'stateCodes': [s['code'] for s in states],
                     'missingMainIndicators': 0, 'suppressedMainIndicators': 0},
        'qualityChecks': balances, 'datasetSha256': sha256(DESTINATION),
        'selectedCsvSha256': sha256(PUBLIC / 'selected-states.csv'),
        'reproduce': 'python scripts/prepare-mexico-agriculture.py',
        'attribution': 'Fuente: INEGI, Censo Agropecuario 2022. Independent extraction, ratio calculation and visualization by Insight Journal; not endorsed by INEGI.',
        'definitions': definitions}
    manifest['sourceFootnotes'] = {
        'ca2022_11': '活動中の農業生産単位の農業用地。播種・非播種・休耕を含む。灌漑と天水の生産単位数は重複し得るためUP数から割合を計算しない。',
        'ca2022_agr02': '露地の一年生作物。Maíz grano blanco行の州合計TON_AGCA。生産単位数の*を理由に数量の公表値を捨てない。',
        'ca2022_agr04': '秋冬作・露地の一年生作物。シナロアの白粒生産量を採用。32州の追加指標としては配信しない。',
        'ca2022_for15': '活動中の林業生産単位が取得した木材。松材VOL_OBT_PINOは丸太以外の形態も含む。認可量M3_MADER_AUTOや全樹種M3_MADER_TOTはこの指標に混合しない。',
        'symbols': '原表の*は秘匿、NAは非該当。CSV空欄は両者や非掲載を区別するため原表照合を要する。原表の0.00は表示丸めによる微小値を含み得る。採用主指標は全32州数値公表。',
    }
    wood_uses_workbook = SOURCE / 'forestry/raw/ca2022_for18.xlsx'
    manifest['contextReferences'] = [
        {'id': 'wood-uses', 'sourceUrl': 'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for18.xlsx',
         'retainedWorkbook': str(wood_uses_workbook.relative_to(ROOT)).replace('\\', '/'),
         'workbookSha256': sha256(wood_uses_workbook), 'licenceUrl': manifest['licenceUrl'],
         'use': '木材の形態・用途と取得量／販売量の区別を説明。地図の松材量はfor15のみ。for18の非掲載から0を補わず、オーク数量差3693m³を混合しない。'},
        {'id': 'temperate-forest', 'sourceUrl': 'https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado',
         'pageUpdated': '2021-11-22', 'accessed': RETRIEVED,
         'use': 'CONABIOの山地・冷涼な気候・松／オーク林と森林の水・土壌・生息地機能を要約。森林被覆率や面積のデータとして使わず、写真・図を転載しない。'},
        {'id': 'maize-food-chain', 'sourceUrl': 'https://www.gob.mx/agricultura/articulos/del-campo-al-comal-el-proceso-de-hacer-tortillas-de-maiz?idiom=es',
         'published': '2025-09-26', 'accessed': RETRIEVED,
         'use': 'SADERの白粒から乾燥・貯蔵・集荷・輸送・加工・トルティーヤ販売への説明を要約。本文の数量を2022年統計に混合せず、写真・図を転載しない。'},
    ]
    (PUBLIC / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (SOURCE / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(states)} states; 5 national balances passed; numeric zero retained.')

if __name__ == '__main__':
    main()
