"""Extract only retained, same-definition Central Asian production observations.

No trade totals: reporter imports/exports contain intra-regional transactions.
Run from the repository root; this never rewrites the shared collection.
"""
import hashlib
import json
from decimal import Decimal
from pathlib import Path

SOURCE = Path('public/assets/atlas/regional-production-statistics-v1/statistics.json')
OUTPUT = Path('src/data/atlas/central-asia-agro-production.json')
COUNTRIES = ['KAZ', 'KGZ', 'TJK', 'TKM', 'UZB']
SERIES = ['wheat-production', 'qcl-328-production', 'maize-production',
          'cattle-meat', 'cattle-milk', 'sheep-meat', 'goat-production',
          'roundwood-production', 'sawnwood-production']


def extract(raw):
    data = json.loads(raw)
    records = []
    for series_id in SERIES:
        observations = []
        definition = None
        for code in COUNTRIES:
            country = data['countries'][code]
            series = next((s for s in country['series'] if s['id'] == series_id), None)
            row = next((r for r in series['rows'] if r['year'] == 2024), None) if series else None
            if not row:
                observations.append({'code': code, 'name': country['name'], 'row': None})
                continue
            assert series['element'] in ['5510', '5516'], 'Production only'
            identity = {k: series[k] for k in ['domain', 'item', 'element', 'unit', 'definition', 'archiveSha256']}
            if definition is not None and identity != definition:
                raise ValueError(f'{series_id}: mismatched product, unit, definition or archive')
            definition = identity
            observations.append({'code': code, 'name': country['name'], 'row': row})
        retained = [o['row'] for o in observations if o['row'] is not None]
        worlds = {(r['worldRawValue'], r['worldFlag']) for r in retained}
        if len(worlds) > 1:
            raise ValueError(f'{series_id}: mismatched World denominator')
        complete = len(retained) == 5 and all(r['rawValue'] is not None and Decimal(r['rawValue']) >= 0 for r in retained)
        total = sum((Decimal(r['rawValue']) for r in retained), Decimal(0)) if complete else None
        world = retained[0]['worldRawValue'] if retained else None
        records.append({'id': series_id, 'label': series['label'] if series else series_id,
                        'year': 2024, 'identity': definition, 'observations': observations,
                        'complete': complete, 'productionRaw': str(total) if total is not None else None,
                        'worldRaw': world, 'worldFlag': retained[0]['worldFlag'] if retained else None,
                        'sourceUrl': f"https://www.fao.org/faostat/en/#data/{definition['domain']}" if definition else None})
    return {'schemaVersion': 1, 'countries': COUNTRIES, 'year': 2024,
            'source': {'path': str(SOURCE), 'sha256': hashlib.sha256(raw).hexdigest()},
            'records': records}


if __name__ == '__main__':
    OUTPUT.write_text(json.dumps(extract(SOURCE.read_bytes()), ensure_ascii=False, indent=2) + '\n')
