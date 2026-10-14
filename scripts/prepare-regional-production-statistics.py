"""Normalize retained national FAOSTAT observations offline, with exact joins.

No downloads, regional sums, missing-as-zero, unit conversions or fallback years.
The input universe is incomplete: ranks can only describe retained countries.
"""
from pathlib import Path
from decimal import Decimal
import csv
import gzip
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/atlas/regional-production-statistics-v1/statistics.json'
DOMAINS = {'Production_Crops_Livestock': 'QCL', 'Forestry': 'FO', 'Inputs_LandUse': 'RL'}
EXCLUDED = {'JPN', 'USA'}


def prepare():
    inputs, archives, countries, observations, world, measures = {}, {}, {}, {}, {}, {}
    names, identities, publisher_names = {}, {}, {}

    def load(path, expected=None):
        raw = (ROOT / path).read_bytes()
        sha = hashlib.sha256(raw).hexdigest()
        if expected and sha != expected:
            raise ValueError('Source checksum mismatch: ' + path)
        inputs[path] = {'path': path, 'sha256': sha}
        return json.loads(raw) if path.endswith('.json') else list(csv.DictReader(raw.decode().splitlines()))

    def archive(domain, sha):
        if domain in archives and archives[domain] != sha:
            raise ValueError('Different retained source release: ' + domain)
        archives[domain] = sha

    def number(raw, flag):
        if raw is None or not str(raw).strip() or flag in ('M', 'L'):
            return None
        value = Decimal(str(raw))
        if not value.is_finite() or value < 0:
            raise ValueError('Invalid retained observation: ' + str(raw))
        return value

    def add(code, domain, item, element, year, unit, raw, flag, note, path):
        item, element, year = str(item), str(element), int(year)
        if code in EXCLUDED or element not in ('5510', '5516', '5616', '5916', '5110'):
            return
        # 5110 is forest land area only, not a generic crop or population measure.
        if element == '5110' and (domain, item) != ('RL', '6646'):
            return
        key = (domain, item, element, year, unit)
        value = number(raw, flag)
        record = {'rawValue': None if raw is None else str(raw), 'flag': flag,
                  'note': note or None, 'value': value, 'sources': [path]}
        store = world if code == 'World' else observations.setdefault(code, {})
        # Unit disagreements must not silently form a second parallel series.
        for previous_key in store:
            if previous_key[:4] == key[:4] and previous_key[4] != unit:
                raise ValueError('Conflicting source unit: ' + str((code, key)))
        if key in store:
            previous = store[key]
            if previous['value'] != value or previous['flag'] != flag:
                raise ValueError('Conflicting retained observation: ' + str((code, key)))
            previous['sources'].append(path)
            # Prefer the original decimal string over an inherited numeric JSON.
            if raw is not None and isinstance(raw, str) and len(raw) > len(previous['rawValue'] or ''):
                previous['rawValue'] = raw
        else:
            store[key] = record

    def metric(domain, item, element, unit, id, label, definition):
        key = (domain, str(item), str(element), unit)
        if key not in measures:
            measures[key] = {'id': id, 'label': label, 'domain': domain, 'item': str(item),
                             'element': str(element), 'unit': unit, 'definition': definition,
                             'sourceUrl': 'https://www.fao.org/faostat/en/#data/' + domain}

    # These registry names only resolve existing page countries. Statistical
    # quantities always come from FAOSTAT, never from boundary/map statistics.
    for path in ['src/data/atlas/regional-countries.json', 'src/data/atlas/asia-countries.json',
                 'src/data/atlas/oceania-countries.json', 'src/data/atlas/latin-america/countries.json']:
        for feature in load(path)['features']:
            prop = feature['properties']
            names[prop['code']] = prop['name']
            publisher_names[prop['name']] = prop['code']
    for path in ['src/data/atlas/africa-countries.json', 'src/data/atlas/europe/countries.json']:
        for entry in load(path):
            names[entry['code']] = entry['name']
    names.update(CAN='カナダ', MEX='メキシコ', AUS='オーストラリア', NZL='ニュージーランド',
                 CHN='中国（FAOSTAT mainland）')
    identities.update({124: 'CAN', 484: 'MEX', 36: 'AUS', 554: 'NZL', 392: 'JPN', 840: 'USA'})
    latin_source = load('data-source/atlas/latin-agriculture/provenance.json')
    for code, m49 in latin_source['processing']['m49Join'].items():
        identities[int(m49)] = code
    # Publisher spellings differing from the retained Natural Earth registry.
    publisher_names.update({'Bolivia (Plurinational State of)': 'BOL',
        'Venezuela (Bolivarian Republic of)': 'VEN', 'Congo': 'COG',
        'Democratic Republic of the Congo': 'COD', 'Côte d’Ivoire': 'CIV',
        "Côte d'Ivoire": 'CIV', 'United Republic of Tanzania': 'TZA',
        'Eswatini': 'SWZ', 'Cabo Verde': 'CPV', 'Sudan': 'SDN',
        'United States of America': 'USA', 'China, mainland': 'CHN',
        'China, Taiwan Province of': 'TWN', 'China, Hong Kong SAR': 'HKG',
        'China, Macao SAR': 'MAC', 'Türkiye': 'TUR', 'Comoros': 'COM',
        'Faroe Islands': 'FRO', 'Mauritius': 'MUS',
        'Micronesia (Federated States of)': 'FSM',
        'Sao Tome and Principe': 'STP', 'Seychelles': 'SYC'})

    path = 'public/assets/atlas/europe/farming-statistics-v1/statistics.json'
    eu = load(path)
    for source in eu['sources']:
        archive(source['id'], source['archive']['sha256'])
    eu_metrics = {m['id']: m for m in eu['measures']}
    for m in eu['measures']:
        if m['elementCode'] in ('5510', '5516', '5616', '5916', '5110'):
            metric(m['domain'], m['itemCode'], m['elementCode'], m['unit'], m['id'], m['label'], m['definition'])
    for code, country in [*eu['countries'].items(), ('World', eu['world'])]:
        if code != 'World':
            identities[country['m49']] = code
            for original in country['sourceNames'].values():
                publisher_names[original['name']] = code
                names.setdefault(code, original['name'])
        for id, year, raw, unit, flag, *note in country['observations']:
            m = eu_metrics[id]
            if m['unit'] != unit:
                raise ValueError('European measure unit disagreement')
            add(code, m['domain'], m['itemCode'], m['elementCode'], year, unit, raw, flag,
                note[0] if note else None, path)

    # National observations and World denominators use identical archive hashes.
    for path in ['public/assets/atlas/asia-farming-v1/statistics.json',
                 'public/assets/atlas/west-asia-v1/statistics.json']:
        data = load(path)
        for source in data['inputs']:
            archive(DOMAINS[source['file'].split('_E_')[0]], source['sha256'])
        for code, country in data['countries'].items():
            identities[country['m49']] = code
            for original in country['sourceNames'].values():
                publisher_names[original['name']] = code
                names.setdefault(code, original['name'])
            for row in country['observations']:
                add(code, DOMAINS[row['domain']], row['item'], row['elementCode'], row['year'],
                    row['unit'], row['value'], row['flag'], row.get('note'), path)

    path = 'src/data/atlas/shared-world-statistics.json'
    shared = load(path)
    for key, row in shared['world'].items():
        domain, item, element, year, unit = key.split(':')
        archive(domain, row['archiveSha256'])
        add('World', domain, item, element, year, unit, row['rawValue'], row['flag'], row['note'], path)

    crop_source = load('data-source/atlas/latin-agriculture/raw/qcl-source.json')
    livestock_source = load('data-source/atlas/livestock/faostat-source.json')
    archive('QCL', crop_source['zipSha256'])
    archive('QCL', livestock_source['sha256'])
    raw_inputs = [('data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv', crop_source['selectedSha256']),
                  ('data-source/atlas/livestock/faostat-qcl-2024-extract.json', livestock_source['extractSha256'])]
    unmatched = set()
    for path, expected in raw_inputs:
        for row in load(path, expected):
            if row['Area Code'] == '5000':
                if row['Area'] != 'World':
                    raise ValueError('World identity mismatch')
                code = 'World'
            elif int(row['Area Code']) >= 5000 or row['Area Code'] == '351':
                continue  # Never turn FAO regional/other aggregates into countries.
            else:
                m49 = int(row['Area Code (M49)'].lstrip("'"))
                code = identities.get(m49) or publisher_names.get(row['Area'])
                if not code:
                    unmatched.add(row['Area'])
                    continue
                previous = identities.setdefault(m49, code)
                if previous != code:
                    raise ValueError('Ambiguous country identity: ' + row['Area'])
                names.setdefault(code, row['Area'])
            add(code, 'QCL', row['Item Code'], row['Element Code'], row['Year'], row['Unit'],
                row['Value'], row['Flag'], row.get('Note'), path)

    additions = [
        ('486', 'banana-production', 'バナナ生産量', 'バナナの果実生産量。収穫面積とは別の指標。'),
        ('656', 'coffee-production', 'コーヒー生豆生産量', '全品種のコーヒー生豆。果実、焙煎豆、アラビカ種だけの地図とは区別。'),
        ('125', 'cassava-production', 'キャッサバ生産量', 'キャッサバの根の生産量。穀物の乾燥子実と混同しない。'),
        ('667', 'tea-production', '茶生産量', 'FAOSTAT Tea leaves の生産量。品目定義を変えず保持。'),
        ('951', 'buffalo-milk', '水牛の生乳生産量', '水牛から搾った未加工乳。牛乳と合算しない。'),
        ('1017', 'goat-meat', 'ヤギ肉生産量', '骨付きのヤギ肉。飼養頭数と別の指標。'),
    ]
    for item, id, label, definition in additions:
        metric('QCL', item, '5510', 't', id, label, definition)
    # Preserve remaining retained QCL crop definitions without claiming a new UI item.
    for item, label in [('156','サトウキビ'),('191','ヒヨコマメ'),('201','レンズマメ'),
                        ('254','アブラヤシ果実'),('328','種子付き綿（未繰綿）'),('79','ミレット'),('836','天然ゴム')]:
        metric('QCL', item, '5510', 't', 'qcl-' + item + '-production', label + '生産量',
               'FAOSTAT QCL の品目コード ' + item + '、生産量（t）。加工品や収穫面積と合算しない。')
    for item, topic, label, definition in [
        ('1861','roundwood','丸太','薪材と産業用丸太を含む丸太。製材品とは別の加工段階。'),
        ('1872','sawnwood','製材','丸太を加工した製材品。丸太との合算・収支差し引きを行わない。'),
        ('1864','wood-fuel','薪材','Wood fuel。薪材としての丸太。丸太全体や産業用丸太とは別区分。'),
        ('1865','industrial-roundwood','産業用丸太','Industrial roundwood。産業向け丸太で薪材を除く。製材・パルプとは別。')]:
        for element, suffix, flow in [('5516','production','生産'),('5616','imports','輸入'),('5916','exports','輸出')]:
            metric('FO', item, element, 'm3', topic + '-' + suffix, label + flow + '量',
                   definition + ' FAOSTAT FO ' + flow + '数量（m³）。')
    # Beef, milk and eggs need precise processing definitions in the common contract.
    definitions = {'867':'骨付き、生鮮・冷蔵の牛肉。生体牛・水牛肉とは別。',
        '882':'牛の未加工の生乳。乳製品・他の動物の乳・L単位とは別。',
        '1035':'骨付き、生鮮・冷蔵の豚肉。生体豚とは別。',
        '1058':'生鮮・冷蔵の鶏肉。飼養羽数とは別。',
        '1062':'殻付きの新鮮な鶏卵。採卵鶏羽数とは別。'}
    for key, m in measures.items():
        if m['domain'] == 'QCL' and m['item'] in definitions:
            m['definition'] = definitions[m['item']]

    # Cross-check existing independent Mexico/Oceania/Russia/Latin consumers.
    path = 'src/data/atlas/mexico/agriculture-comparison-2024.json'
    mex = load(path)
    for row in mex['products'].values():
        key = ('QCL', row['itemCode'], '5510', 2024, 't')
        if observations['MEX'][key]['value'] != Decimal(str(row['mexicoTonnes'])) or world[key]['value'] != Decimal(str(row['worldTonnes'])):
            raise ValueError('Mexico consumer/source disagreement')
    path = 'src/data/atlas/oceania-livestock-production.json'
    ocean = load(path)
    archive('QCL', ocean['source']['archive']['sha256'])
    for s in ocean['series']:
        add('World', 'QCL', s['itemCode'], s['elementCode'], s['year'], s['unit'], s['worldRawValue'], s['worldFlag'], None, path)
        for c in s['countries']:
            add(c['code'], 'QCL', s['itemCode'], s['elementCode'], s['year'], s['unit'], c['rawValue'], c['flag'], c['note'], path)
    path = 'src/data/atlas/russia-forestry-statistics.json'
    russia = load(path)
    russia_metrics = {m['id']: m for m in russia['measures']}
    for row in russia['observations']:
        m = russia_metrics[row['measureId']]
        add('RUS', m['domain'], m['itemCode'], m['elementCode'], row['year'], row['unit'], row['rawValue'], row['flag'], row['note'], path)
        add('World', m['domain'], m['itemCode'], m['elementCode'], row['year'], row['unit'], row['worldRawValue'], row['worldFlag'], None, path)
    path = 'src/data/atlas/latin-america/agriculture.json'
    latin = load(path)
    for layer in latin['layers']:
        item = {'bana':'486', 'coff':'656', 'soyb':'236'}.get(layer['id'])
        if not item:
            continue
        for country in layer['countries']:
            r = country['national2024']
            if r.get('sourceValue') is not None:
                add(country['code'], 'QCL', item, '5510', 2024, 't', r['sourceValue'], r['flag'], r.get('note'), path)

    for code, retained in sorted(observations.items()):
        series = []
        for key, m in sorted(measures.items(), key=lambda pair: pair[1]['id']):
            rows = []
            for observation_key, record in sorted(retained.items()):
                domain, item, element, year, unit = observation_key
                if (domain, item, element, unit) != key:
                    continue
                # Import/export ratios never use a production denominator.
                denominator = world.get(observation_key) if element in ('5510','5516','5110') else None
                total = denominator['value'] if denominator else None
                value = record['value']
                share = value / total * 100 if value is not None and total is not None and total > 0 else None
                rows.append({'year':year, 'value':float(value) if value is not None else None,
                    'rawValue':record['rawValue'], 'flag':record['flag'], 'note':record['note'],
                    'worldValue':float(total) if total is not None else None,
                    'worldRawValue':denominator['rawValue'] if denominator else None,
                    'worldFlag':denominator['flag'] if denominator else None,
                    'share':float(share) if share is not None else None,
                    'retainedSources':sorted(set(record['sources']))})
            if rows:
                series.append({**m, 'archiveSha256':archives[m['domain']], 'rows':rows})
        if series:
            countries[code] = {'name':names.get(code, code), 'series':series}
    payload = {'schemaVersion':1, 'countries':countries, 'sources':[inputs[p] for p in sorted(inputs)],
        'method':'保存済みFAOSTATの同一原表SHA-256・domain/item/element/year/unitの国別値とWorld公表値を照合。Decimalで重複値を照合し不一致は停止。国合計をWorldの代替にせず、欠測M/L・空欄はnull、公表0は0。輸入・輸出には生産の世界分母を適用しない。森林面積、丸太、製材、肉、生乳を区別。収録国・地域中の順位であり世界順位・自給率・域外貿易ではない。日本・米国は出力対象外。',
        'limits':['国別系列の収録範囲は不完全。ランキングは同一系列・年・単位の有効値がある収録国・地域中だけ。',
                  '2015–2024年以外は補完しない。単年資料は推移を作らない。',
                  '一部Asia国別値は元のJSONが数値であり、rawValueは保持数値の文字列表現。CSV/tupleの原数値文字列が重複する場合はそちらを優先。',
                  'FBS/SUAと詳細相手国貿易の原表は未収録。'],
        'unmatchedPublisherAreas':sorted(unmatched)}
    return payload


def main():
    payload = prepare()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(payload, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')
    OUTPUT.write_bytes(encoded)
    # A stable gzip header lets repeated generation produce identical assets.
    OUTPUT.with_suffix('.json.gz').write_bytes(gzip.compress(encoded, mtime=0))
    by_series = OUTPUT.parent / 'by-series'
    by_series.mkdir(exist_ok=True)
    selected = {series['id']:series for country in payload['countries'].values()
                for series in country['series'] if series['element'] in ('5510', '5516', '5110')}
    manifest = {'schemaVersion':1, 'seriesIds':sorted(selected), 'files':{}}
    for id, measure in sorted(selected.items()):
        countries = {}
        for code, country in payload['countries'].items():
            series = [s for s in country['series'] if s['id'] == id or (
                measure['domain'] == 'FO' and s['domain'] == 'FO'
                and s['item'] == measure['item'] and s['unit'] == measure['unit']
                and s['element'] in ('5616', '5916'))]
            if series:
                countries[code] = {**country, 'series':series}
        sliced = {**payload, 'countries':countries}
        slice_encoded = (json.dumps(sliced, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')
        compressed = gzip.compress(slice_encoded, mtime=0)
        file = 'by-series/' + id + '.json.gz'
        (OUTPUT.parent / file).write_bytes(compressed)
        manifest['files'][id] = {'file':file, 'gzipBytes':len(compressed), 'countryCount':len(countries)}
    (OUTPUT.parent / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'countries':len(payload['countries']),
                      'series':sum(len(c['series']) for c in payload['countries'].values()),
                      'gzipBytes':OUTPUT.with_suffix('.json.gz').stat().st_size,
                      'sliceCount':len(selected),
                      'largestSliceBytes':max(file['gzipBytes'] for file in manifest['files'].values()),
                      'cattleMeatAndMilkBytes':sum(manifest['files'][id]['gzipBytes'] for id in ('cattle-meat','cattle-milk')),
                      'unmatchedPublisherAreas':payload['unmatchedPublisherAreas']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
