"""Build Africa's non-exhaustive GeoEPR / EPR-ED 2021 examples offline.

Only public/assets/atlas/africa-settlements-v1 is written. Politically relevant
source groups are not an exhaustive ethnicity map or residents' religion shares.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import io
import json
from collections import Counter
from shapely import make_valid
from shapely.geometry import shape, mapping, Polygon, box
from shapely.ops import unary_union
from shapely.validation import explain_validity

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/africa-settlements-v1'
YEAR = 2020
SOURCES = [
    dict(file='GeoEPR-2021.geojson', sha256='346e9329a136b2a1d3fbe4334d3dc8ae7775c84bf2ec6d91cdcc81935d763964',
         url='https://icr.ethz.ch/data/epr/geoepr/GeoEPR-2021.geojson', page='https://icr.ethz.ch/data/epr/geoepr/',
         codebook='https://icr.ethz.ch/data/epr/geoepr/EPR_2021_Codebook_GeoEPR.pdf',
         citation='Vogt et al. (2015), Integrating Data on Ethnicity, Geography, and Conflict: The Ethnic Power Relations Data Set Family; Wucherpfennig et al. (2011), Politically Relevant Ethnic Groups across Space and Time: Introducing the GeoEPR Dataset.'),
    dict(file='ED-2021.json', sha256='fce287a94b54ae8c9f8a556332f654e127b5b912ed0a7a3b15c61876d5ec2672',
         url='https://icr.ethz.ch/data/epr/ed/ED-2021.json', page='https://icr.ethz.ch/data/epr/ed/',
         codebook='https://icr.ethz.ch/data/epr/ed/EPR_2021_Codebook_ED.pdf',
         citation='Bormann, Cederman and Vogt (2017), Language, Religion, and Ethnic Civil War.'),
]
ALLOWED_TYPES = {'Regionally based', 'Regional & urban', 'Aggregate'}
GW_TO_TARGET = {
    402: 'CPV', 403: 'STP', 404: 'GNB', 411: 'GNQ', 420: 'GMB', 432: 'MLI', 433: 'SEN',
    434: 'BEN', 435: 'MRT', 436: 'NER', 437: 'CIV', 438: 'GIN', 439: 'BFA', 450: 'LBR',
    451: 'SLE', 452: 'GHA', 461: 'TGO', 471: 'CMR', 475: 'NGA', 481: 'GAB', 482: 'CAF',
    483: 'TCD', 484: 'COG', 490: 'COD', 500: 'UGA', 501: 'KEN', 510: 'TZA', 516: 'BDI',
    517: 'RWA', 520: 'SOM', 522: 'DJI', 530: 'ETH', 531: 'ERI', 540: 'AGO', 541: 'MOZ',
    551: 'ZMB', 552: 'ZWE', 553: 'MWI', 560: 'ZAF', 565: 'NAM', 570: 'LSO', 571: 'BWA',
    572: 'SWZ', 580: 'MDG', 581: 'COM', 590: 'MUS', 591: 'SYC', 600: 'MAR', 615: 'DZA',
    616: 'TUN', 620: 'LBY', 625: 'SDN', 626: 'SSD', 651: 'EGY',
}
COLORS = ['#b59052', '#64959b', '#ab749b', '#91a95a', '#c27c62', '#6f84ae', '#928263',
          '#5d9c85', '#9a91bf', '#c5a04d', '#669073', '#b57e85', '#738cbb', '#b39672']
# Literal display aids for these exact source IDs only. Original names remain.
LABELS = {65101000: 'アラブ系イスラム教徒の掲載集団', 65102000: 'コプトの掲載集団',
          47506000: 'ヨルバの掲載集団', 47502000: 'イボの掲載集団',
          50106000: 'ルオの掲載集団', 50105000: 'ルヒヤの掲載集団',
          53002000: 'アムハラの掲載集団', 53001000: 'アファルの掲載集団',
          56005100: 'ズールーの掲載集団', 56005200: 'コサの掲載集団'}
RELIGION_KEYS = {
    'islam': ('イスラム教の帰属例', '#6a9c82'),
    'christianity': ('キリスト教の帰属例', '#7a9fb8'),
    'animist': ('原資料のアニミズム帰属例', '#b59052'),
    'unclassified': ('単一の帰属例に分類しない集団', '#83b9ae'),
    'unrecorded': ('宗教資料が未掲載の集団例', '#c7c9c5'),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def polygonal(g):
    if g.is_empty:
        return Polygon()
    if g.geom_type in {'Polygon', 'MultiPolygon'}:
        return g
    return unary_union([polygonal(p) for p in getattr(g, 'geoms', []) if not p.is_empty])


def write(name, data):
    raw = (json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf8')
    encoded = raw
    if name.endswith('.gz'):
        buf = io.BytesIO()
        with gzip.GzipFile(filename='', mode='wb', fileobj=buf, mtime=0, compresslevel=9) as f:
            f.write(raw)
        encoded = buf.getvalue()
    (OUT / name).write_bytes(encoded)
    return dict(file=name, bytes=len(encoded), uncompressedBytes=len(raw), sha256=sha(encoded))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    args = parser.parse_args()
    source_info, originals = [], []
    for s in SOURCES:
        raw = (args.source_dir / s['file']).read_bytes()
        assert sha(raw) == s['sha256'], f"Fixed source SHA changed: {s['file']}"
        originals.append(json.loads(raw))
        source_info.append(dict(s, bytes=len(raw), sourceVersion=2021, retrievedDate='2026-10-02',
                                reuse=dict(status='publisher-download-and-citation-notice', explicitOpenLicenseConfirmed=False,
                                           checkedDate='2026-10-02',
                                           note='Same fixed originals and reuse evidence as the adopted West Asia edition. Official 2021 pages offer downloads and prescribe citation; no explicit CC/public-domain licence was identified. Raw files are not redistributed.')))
    current = [f for f in originals[0]['features'] if f['properties']['gwid'] in GW_TO_TARGET
               and f['properties']['from'] <= YEAR <= f['properties']['to']]
    indexed = {f['properties']['gwgroupid']: f for f in current}
    assert len(indexed) == len(current), 'Duplicate active group'
    selected = sorted(gid for gid, f in indexed.items() if f['properties']['type'] in ALLOWED_TYPES)
    ed = {r['gwgroupid']: r for r in originals[1]['data']}
    countries_path = ROOT / 'src/data/atlas/africa-countries.json'
    geography_path = ROOT / 'src/data/atlas/africa-geography.json'
    source_manifest = json.loads((ROOT / 'data-source/atlas/africa/manifest.json').read_text(encoding='utf8'))
    countries_data = json.loads(countries_path.read_text(encoding='utf8'))
    assert len(countries_data) == 55
    assert set(GW_TO_TARGET.values()) == {c['code'] for c in countries_data if c['code'] != 'ESH'}
    geography_raw = geography_path.read_bytes()
    repairs, clips, empty_source_groups = [], [], []

    def checked(g, key):
        if not g.is_valid:
            reason = explain_validity(g)
            g = make_valid(g)
            repairs.append(dict(source=key, reason=reason, method='shapely.make_valid; polygonal parts only', resultType=g.geom_type))
        g = polygonal(g)
        assert g.is_valid, key
        return g

    countries = {f['properties']['code']: checked(shape(f['geometry']), 'geography:' + f['properties']['code'])
                 for f in json.loads(geography_raw)['features']}
    assert set(countries) == {c['code'] for c in countries_data}
    # The existing 1:50m boundaries omit some small islands (e.g. Annobon).
    # Preserve the publisher's footprints instead of deleting them with a mask.
    display_extent = box(-27, -36, 64, 39)
    group_shapes = {}
    for gid in selected:
        g = checked(shape(indexed[gid]['geometry']), 'GeoEPR:' + str(gid))
        if g.is_empty:
            empty_source_groups.append(gid)
            group_shapes[gid] = g
            continue
        clipped = polygonal(g.intersection(display_extent))
        assert clipped.is_valid and not clipped.is_empty, gid
        group_shapes[gid] = clipped
        if not g.equals(clipped):
            clips.append(gid)
    religion_groups = {key: [] for key in RELIGION_KEYS}
    religion_records = {}
    for gid in selected:
        r = ed.get(gid)
        segments = [dict(position=n, religion=r.get(f'religion{n}'), share=r.get(f'rel{n}_size')) for n in [1, 2, 3]] if r else []
        observed = [s for s in segments if s['religion'] is not None and isinstance(s['share'], (int, float))]
        dominant = max(observed, key=lambda s: s['share']) if observed else None
        if dominant is None:
            key = 'unrecorded'
        elif dominant['share'] < .8:
            key = 'unclassified'
        elif dominant['religion'].startswith('ARI'):
            key = 'islam'
        elif dominant['religion'].startswith('ARC'):
            key = 'christianity'
        elif dominant['religion'].startswith('ANI'):
            key = 'animist'
        else:
            key = 'unclassified'
        religion_groups[key].append(gid)
        religion_records[gid] = dict(segments=segments, dominantSegment=dominant, assignedExample=key,
                                    multipleRecordedSegments=sum(s['religion'] is not None and (s['share'] or 0) > 0 for s in segments) > 1,
                                    missingReligionRecord=r is None, denominator='source EPR group; not a location or national population')
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = dict(version=1, year=YEAR, sourceVersion=2021, nonExhaustive=True, crs='EPSG:4326', sources=source_info,
                    generator='scripts/atlas-africa-settlements.py',
                    geography=dict(file='src/data/atlas/africa-geography.json', sha256=sha(geography_raw),
                                   source=source_manifest['naturalEarth'], targets=55,
                                   note='Existing generalized Natural Earth Africa layer is context/coverage diagnostics only, including separate Western Sahara and combined Somalia/Somaliland page geometry. It never masks source footprints or defines current control/sovereignty.'),
                    method='GeoEPR 2021 politically relevant group footprints valid in 2020, not exhaustive ethnic groups or local majorities. Original group IDs and names remain separate; no new continental ancestry taxonomy. Only Regionally based, Regional & urban and Aggregate types are mapped. Full footprints within the Africa display rectangle retain overlaps; no land mask, selected-country clipping or exclusive allocation. Religion examples use EPR-ED 2021 group characteristics, not local population shares or 2020 observations.',
                    processing=dict(geometryRepairs=repairs, clippedSourceGroups=clips, simplification=False,
                                    bounds4326=[-27, -36, 64, 39], landMask=False,
                                    emptyOriginalGeometry=empty_source_groups,
                                    missingGeometryMeaning='Original empty geometry is retained as a metadata category without an invented GeoJSON footprint. Source group/religion records are still included.',
                                    clippingLimit='Source polygons intersect the display rectangle only. Generalized Natural Earth boundaries omit some small source islands and are never used to delete a footprint. Independent outlines may differ; this is not political status.'),
                    sourceCoverage=dict(activeRecords=len(current), types=dict(Counter(f['properties']['type'] for f in current)),
                                        selectedSourceGroups=selected, sourceCountries=len({indexed[g]['properties']['gwid'] for g in selected}),
                                        originalReligionSlots=sum(len(r['segments']) for r in religion_records.values()),
                                        excludedRecords=[dict(f['properties'], reason='settlement-type-not-mapped') for f in current if f['properties']['gwgroupid'] not in selected]),
                    regions={'africa': {}}, files=[])
    ethnic_groups = []
    for gwid in sorted(GW_TO_TARGET):
        for i, gid in enumerate(g for g in selected if indexed[g]['properties']['gwid'] == gwid):
            p = indexed[gid]['properties']
            ethnic_groups.append((str(gid), LABELS.get(gid, p['group']), [gid], COLORS[i % len(COLORS)]))
    for topic in ['ethnicity', 'religion']:
        groups = ethnic_groups if topic == 'ethnicity' else [(k, label, religion_groups[k], color) for k, (label, color) in RELIGION_KEYS.items() if religion_groups[k]]
        rows = []
        for slug, label, ids, color in groups:
            source_groups = []
            for gid in ids:
                p = dict(indexed[gid]['properties'], sourceCountry=GW_TO_TARGET[indexed[gid]['properties']['gwid']])
                if topic == 'religion':
                    p.update(religion_records[gid])
                source_groups.append(p)
            rows.append(dict(id=topic + '-' + slug, label=label, color=color, sourceGroups=source_groups,
                             sourceCountries=sorted({p['sourceCountry'] for p in source_groups}),
                             geometry=unary_union([group_shapes[g] for g in ids])))
        union = unary_union([r['geometry'] for r in rows])
        intersections = []
        for i, a in enumerate(rows):
            for b in rows[i + 1:]:
                if not a['geometry'].intersects(b['geometry']):
                    continue
                g = polygonal(a['geometry'].intersection(b['geometry']))
                if not g.is_empty and g.area > 0:
                    intersections.append((a['id'], b['id'], g))
        shared = polygonal(unary_union([g for _, _, g in intersections]))
        overlapping_ids = sorted({c for a, b, _ in intersections for c in [a, b]})
        if not shared.is_empty:
            rows.append(dict(id=topic + '-shared', label='掲載居住域の重なり', color='#929698', sourceGroups=[],
                             sourceCountries=sorted({code for r in rows if r['id'] in overlapping_ids for code in r['sourceCountries']}),
                             overlappingCategories=overlapping_ids, geometry=shared))
        output, categories = [], []
        for r in rows:
            g = r.pop('geometry')
            assert g.is_valid, r['id']
            r['geometryAvailable'] = not g.is_empty
            if g.is_empty:
                r['label'] += '（原典形状なし）'
                r['anchors'] = []
                categories.append(r)
                continue
            parts = sorted(getattr(g, 'geoms', [g]), key=lambda p: (-p.area, p.bounds))
            r['anchors'] = [[p.representative_point().x, p.representative_point().y] for p in parts[:8]]
            output.append(dict(type='Feature', geometry=mapping(g), properties={k: r[k] for k in ['id', 'label', 'color']}))
            categories.append(r)
        assert unary_union([shape(f['geometry']) for f in output]).symmetric_difference(union).area < 1e-8
        assert all(g.difference(shared).area < 1e-8 for _, _, g in intersections)
        filename = f'africa.{topic}.json.gz'
        file_info = write(filename, dict(type='FeatureCollection', features=output))
        manifest['files'].append(dict(file_info, features=len(output)))
        used = {p['gwgroupid'] for c in categories for p in c['sourceGroups']}
        coverage = []
        for code, country in sorted(countries.items()):
            affiliated = [gid for gid in sorted(used) if GW_TO_TARGET[indexed[gid]['properties']['gwid']] == code]
            intersections_with_country = [gid for gid in sorted(used) if group_shapes[gid].intersection(country).area > 1e-8]
            mapped = [gid for gid in affiliated if not group_shapes[gid].is_empty]
            coverage.append(dict(code=code, hasExamples=bool(mapped), hasSourceRecords=bool(affiliated), sourceGroups=affiliated,
                                 mappedSourceGroups=mapped, shapeMissingSourceGroups=[gid for gid in affiliated if gid in empty_source_groups],
                                 intersectingFootprints=intersections_with_country,
                                 meaning='Original GW/source-country affiliation; geometric border intersections are recorded separately. Not current political status.' if mapped else 'No mapped source footprint affiliated with this page target in the 2020-valid 2021 edition. Records with empty original geometry remain metadata only. Not absence of residents, ethnic groups or religion.'))
        config = dict(file=filename, categories=categories, coverage=coverage, nonExhaustive=True,
                      title='掲載集団の居住域' if topic == 'ethnicity' else '集団資料の宗教帰属例',
                      period='2020年に有効な居住域・GeoEPR2021版' if topic == 'ethnicity' else 'EPR-ED2021版の集団資料／居住域は2020年有効',
                      unit='掲載集団の居住域（人口・割合ではない）' if topic == 'ethnicity' else '集団の帰属例（地域・個人の宗教割合ではない）',
                      unlisted=dict(label='この版の掲載域なし', color='#d9dbd6', note='集団や宗教の不在を示さない'),
                      overlap=dict(categoryIds=overlapping_ids, pairs=[dict(categories=[a, b]) for a, b, _ in intersections],
                                   sharedOverlayOnly=True, method='Shared overlay identifies overlap; original category footprints are never reduced or assigned exclusively.'))
        if topic == 'ethnicity':
            config['colorScope'] = 'Colors distinguish original groups within the selected source country. Colors repeat between countries; equal color does not mean shared ancestry or identity. Country filtering applies equally to map and legend.'
        else:
            config['religionRule'] = 'Largest original recorded segment >=0.8: ARI prefix→Islam example, ARC→Christianity example, ANI→source animist example. Others are not classified into a single affiliation example. This neutral category does not assert multiple religions: a <0.8 record can have other slots missing. All original three slots, nulls and shares remain without renormalization or summing denominations. Source group denominator; never location/national population.'
        manifest['regions']['africa'][topic] = config
    write('manifest.json', manifest)
    assert all(sha((args.source_dir / s['file']).read_bytes()) == s['sha256'] for s in SOURCES)
    print(json.dumps(dict(output=str(OUT), activeRecords=len(current), selected=len(selected), repairs=len(repairs),
                          religionClasses={k: len(v) for k, v in religion_groups.items()},
                          topics={t: dict(categories=len(c['categories']), sourceGroups=sum(len(x['sourceGroups']) for x in c['categories']),
                                          countriesWithExamples=sum(x['hasExamples'] for x in c['coverage'])) for t, c in manifest['regions']['africa'].items()},
                          files=manifest['files']), ensure_ascii=False))


if __name__ == '__main__':
    main()
