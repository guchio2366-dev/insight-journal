"""Apply the reviewed regional evidence; no network or geocoding calls."""
from copy import deepcopy
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / 'data-source/atlas/latin-america/industry-expansion-20261014'
ADMIN_SHA = '22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5'


def simplify_line(points, tolerance=0.025):
    """Bounded display simplification; original geometry remains in the ledger."""
    if len(points) < 3:
        return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    farthest, index = 0, 0
    for i, p in enumerate(points[1:-1], 1):
        t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) if length else 0
        distance = ((p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2)**0.5
        if distance > farthest:
            farthest, index = distance, i
    if farthest > tolerance:
        return simplify_line(points[:index+1], tolerance)[:-1] + simplify_line(points[index:], tolerance)
    return [a, b]


def display_geometry(geometry):
    def ring(points):
        result = simplify_line(points)
        return result if len(result) >= 4 else points
    coordinates = geometry['coordinates']
    return {'type': geometry['type'], 'coordinates':
            [ring(r) for r in coordinates] if geometry['type'] == 'Polygon'
            else [[ring(r) for r in p] for p in coordinates]}


def apply_expansion(base, places, admin_path):
    evidence = json.loads((LEDGER / 'evidence.json').read_text())
    admin_bytes = admin_path.read_bytes()
    assert hashlib.sha256(admin_bytes).hexdigest() == ADMIN_SHA, 'Unexpected admin1 source'
    administrative = json.loads(admin_bytes)['features']
    result = deepcopy(base)
    source_ids = {s['id'] for s in result['sources']}
    for source in evidence['sources']:
        assert source['id'] not in source_ids, source['id']
        source_ids.add(source['id'])
        result['sources'].append(source)
    industries = {i['id']: i for i in result['industries']}
    for item in evidence['industries']:
        if item['id'] in industries:
            industries[item['id']].update(item)
            if 'label' in item and 'labels' not in item:
                industries[item['id']]['labels'] = {s: item['label'] for s in ['resources', 'manufacturing', 'services']}
        else:
            industries[item['id']] = item
    result['industries'] = [industries.pop(i) for i in evidence['industryOrder']]
    assert not industries, f'Unmapped industries: {industries.keys()}'
    original_places = {}
    for site in result['sites']:
        if site['coordinateSource']['type'] == 'locality-guide':
            feature = next(f for f in places if f['properties']['NE_ID'] == site['coordinateSource']['neId'])
            original_places[feature['properties']['NE_ID']] = feature
    regions = {}
    for item in evidence['regions']:
        original = next(f for f in administrative if f['properties']['iso_3166_2'] == item['isoCode'])
        p = original['properties']
        regions[item['id']] = {**item, 'geometry': display_geometry(original['geometry']),
                              'coordinates': [p['longitude'], p['latitude']],
                              'neId': p['ne_id'], 'sourceName': p['name'], 'sourceCountry': p['admin']}
    sites = {s['id']: s for s in result['sites']}
    for item in evidence['sites']:
        site = deepcopy(item)
        if 'locality' in site:
            locality = site.pop('locality')
            original = next(f for f in places if f['properties']['NAME'] == locality['name']
                            and f['properties']['ADM0NAME'] == locality['country'])
            p = original['properties']
            site['coordinates'] = original['geometry']['coordinates']
            site['coordinateSource'] = {'type': 'locality-guide', 'publisher': 'Natural Earth',
                'version': '5.1.2', 'neId': p['NE_ID'], 'sourceName': p['NAME'],
                'sourceCountry': p['ADM0NAME'], 'originalSubset': str((LEDGER / 'coordinate-original-subset.geojson').relative_to(ROOT))}
            original_places[p['NE_ID']] = original
        elif 'regionGuide' in site:
            region_id = site.pop('regionGuide')
            region = regions[region_id]
            site['regionIds'] = [region_id]
            site['coordinates'] = region['coordinates']
            site['coordinateSource'] = {'type': 'admin-region-guide', 'publisher': 'Natural Earth',
                'version': '5.1.2', 'neId': region['neId'], 'sourceName': region['sourceName'],
                'sourceCountry': region['sourceCountry'], 'isoCode': region['isoCode'],
                'originalSubset': str((LEDGER / 'admin-original-subset.geojson').relative_to(ROOT))}
            site['locationKind'] = 'regional-guide'
        assert site['id'] not in sites, site['id']
        assert all(ref in source_ids for ref in site['sources']), site['id']
        sites[site['id']] = site
    for item in evidence.get('siteUpdates', []):
        sites[item['id']].update(item)
    result['sites'] = list(sites.values())
    result['regions'] = list(regions.values())
    result['statistics'] = evidence['statistics']
    result['requirements'] = evidence['requirements']
    result['sectors'] = evidence['sectors']
    result['schemaVersion'] = 2
    result['reviewedAt'] = '2026-10-14'
    result['coordinateSource']['subsetPath'] = str((LEDGER / 'coordinate-original-subset.geojson').relative_to(ROOT))
    result['regionalSource'] = {'url': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson',
        'publisher': 'Natural Earth', 'version': '5.1.2', 'crs': 'EPSG:4326',
        'license': 'Public domain', 'inputSha256': ADMIN_SHA, 'displayToleranceDegrees': 0.025,
        'meaning': '行政地域は資料の集計／立地範囲。全域に産業が均一に分布する意味ではない。'}
    result['nextCandidates'] = []
    assert len(result['requirements']) == 22
    for requirement in result['requirements']:
        assert all(i in {x['id'] for x in result['industries']} for i in requirement['industryIds'])
        assert all(any(s['industry'] == i for s in result['sites']) for i in requirement['industryIds'])
        assert all(any(s['industry'] == i for s in result['statistics']) for i in requirement['industryIds'])
    assert all(ref in source_ids for metric in result['statistics'] for ref in metric['sources'])
    save = lambda p, d: p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    save(LEDGER / 'coordinate-original-subset.geojson', {'type': 'FeatureCollection',
         'fullInputSha256': result['coordinateSource']['inputSha256'], 'features': list(original_places.values())})
    adopted = {r['neId'] for r in regions.values()}
    save(LEDGER / 'admin-original-subset.geojson', {'type': 'FeatureCollection',
         'fullInputSha256': ADMIN_SHA, 'features': [f for f in administrative if f['properties']['ne_id'] in adopted]})
    save(LEDGER / 'coverage.json', {'baseMain': '63e998cc', 'reviewedAt': result['reviewedAt'],
         'requirements': result['requirements'], 'industries': len(result['industries']),
         'sites': len(result['sites']), 'statistics': len(result['statistics']),
         'regions': len(result['regions']), 'flows': 0,
         'coordinateKinds': {k: sum(s['coordinateSource']['type'] == k for s in result['sites'])
                             for k in sorted({s['coordinateSource']['type'] for s in result['sites']})}})
    return result
