"""Build limited West Asia group examples from fixed GeoEPR/EPR-ED 2021.

Only the new west-asia-settlements-v1 directory is written. Inputs are never
downloaded or changed here. These are politically relevant source groups,
not exhaustive ethnic groups, local majorities or individuals' religions.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import io
import json
from collections import Counter
from shapely import make_valid
from shapely.geometry import shape, mapping, Polygon
from shapely.ops import unary_union
from shapely.validation import explain_validity

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/west-asia-settlements-v1'
YEAR = 2020
SOURCES = [
    dict(file='GeoEPR-2021.geojson', sha256='346e9329a136b2a1d3fbe4334d3dc8ae7775c84bf2ec6d91cdcc81935d763964',
         url='https://icr.ethz.ch/data/epr/geoepr/GeoEPR-2021.geojson',
         page='https://icr.ethz.ch/data/epr/geoepr/',
         codebook='https://icr.ethz.ch/data/epr/geoepr/EPR_2021_Codebook_GeoEPR.pdf',
         citation='Vogt et al. (2015), Integrating Data on Ethnicity, Geography, and Conflict: The Ethnic Power Relations Data Set Family; Wucherpfennig et al. (2011), Politically Relevant Ethnic Groups across Space and Time: Introducing the GeoEPR Dataset.'),
    dict(file='ED-2021.json', sha256='fce287a94b54ae8c9f8a556332f654e127b5b912ed0a7a3b15c61876d5ec2672',
         url='https://icr.ethz.ch/data/epr/ed/ED-2021.json',
         page='https://icr.ethz.ch/data/epr/ed/',
         codebook='https://icr.ethz.ch/data/epr/ed/EPR_2021_Codebook_ED.pdf',
         citation='Bormann, Cederman and Vogt (2017), Language, Religion, and Ethnic Civil War.'),
]
ALLOWED_TYPES = {'Regionally based', 'Regional & urban', 'Aggregate'}
GW_COUNTRIES = {352, 371, 372, 373, 630, 640, 645, 651, 652, 660, 663, 666, 670, 678, 690, 692, 694, 696, 698}
GW_TO_TARGET = {352: 'CYP', 371: 'ARM', 372: 'GEO', 373: 'AZE', 630: 'IRN', 640: 'TUR',
                645: 'IRQ', 651: 'EGY', 652: 'SYR', 660: 'LBN', 663: 'JOR', 666: 'ISR',
                670: 'SAU', 678: 'YEM', 690: 'KWT', 692: 'BHR', 694: 'QAT', 696: 'ARE', 698: 'OMN'}
COLORS = ['#b59052', '#64959b', '#ab749b', '#91a95a', '#c27c62', '#6f84ae', '#928263', '#5d9c85', '#9a91bf', '#c5a04d', '#669073', '#b57e85', '#738cbb', '#b39672', '#70a3a0', '#9772a0']
# Source group names, including their religious qualifications, remain in
# sourceGroups. Combining selected examples does not map every Arab/Turk/etc.
ETHNICITY = [
    ('arabs', 'アラブ系の掲載集団', [63001000, 64502000, 64503000, 65101000, 65202000, 66008000, 66010000, 66007000, 66302000, 66601100, 66601200, 67001000, 67002000, 67004000, 67005000, 69002000, 69003000]),
    ('persians', 'ペルシア系', [63009000]),
    ('turkish', 'トルコ系の掲載集団', [64002000, 35202000]),
    ('kurds', 'クルド系の掲載集団', [63008000, 64001000, 64501000, 65206000]),
    ('azeri', 'アゼルバイジャン系', [63004000, 37205000, 37301000]),
    ('armenians', 'アルメニア系', [37101000, 37202000, 37304000]),
    ('georgians', 'ジョージア系', [37201000]),
    ('abkhazians', 'アブハズ系', [37207000]),
    ('ossetians', '南オセチアの掲載集団', [37206000]),
    ('baloch', 'バルーチ系', [63006000]),
    ('turkmen', 'トルクメン系', [63010000, 64505000]),
    ('greek-cypriots', 'キプロスのギリシャ系', [35201000]),
    ('assyrians', 'アッシリア系', [37104000, 64504000]),
    ('lezgins', 'レズギ系', [37302000]),
    ('talysh', 'タリシュ系', [37305000]),
    ('copts', 'コプトの掲載集団', [65102000]),
]
# Explicit examples only. Do not infer religion from ethnicity or a country's
# population. Kurds/Yezidis (37102000) is deliberately not assigned a religion.
RELIGIOUS_GROUPS = sorted({gid for _, _, ids in ETHNICITY for gid in ids} | {
    65204000, 66005000, 66003000, 66004000, 67805000, 67806000, 67807000,
})
RELIGION_KEYS = {
    'islam': ('イスラム教の帰属例', '#6a9c82'),
    'christianity': ('キリスト教の帰属例', '#7a9fb8'),
    'multiple': ('複数の宗教区分を含む例', '#83b9ae'),
    'unrecorded': ('宗教資料が未掲載の集団例', '#c7c9c5'),
}


def read(path):
    return json.loads(path.read_text(encoding='utf8'))


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def polygonal(g):
    """Retain polygonal parts; no buffer, smoothing or boundary invention."""
    if g.is_empty:
        return Polygon()
    if g.geom_type in {'Polygon', 'MultiPolygon'}:
        return g
    if not hasattr(g, 'geoms'):
        return Polygon()
    return unary_union([polygonal(p) for p in g.geoms if not p.is_empty])


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
    source_info = []
    originals = []
    for source in SOURCES:
        raw = (args.source_dir / source['file']).read_bytes()
        assert sha(raw) == source['sha256'], f"Fixed source SHA changed: {source['file']}"
        originals.append(json.loads(raw))
        source_info.append(dict(source, bytes=len(raw), sourceVersion=2021, retrievedDate='2026-10-02',
                                reuse=dict(status='publisher-download-and-citation-notice',
                                           explicitOpenLicenseConfirmed=False,
                                           checkedDate='2026-10-02',
                                           note='Official 2021 pages offer downloads and prescribe citation. No explicit CC/public-domain licence was identified on those pages or codebooks. Raw files are not redistributed.')))
    current = [f for f in originals[0]['features'] if f['properties']['gwid'] in GW_COUNTRIES
               and f['properties']['from'] <= YEAR <= f['properties']['to']]
    indexed = {}
    for f in current:
        gid = f['properties']['gwgroupid']
        assert gid not in indexed, f'Duplicate active source group: {gid}'
        indexed[gid] = f
    ed = {r['gwgroupid']: r for r in originals[1]['data']}
    geography_path = ROOT / 'public/assets/atlas/west-asia-v1/geography.json'
    geography_raw = geography_path.read_bytes()
    geography = json.loads(geography_raw)
    base_manifest = read(ROOT / 'public/assets/atlas/west-asia-v1/manifest.json')
    target_shapes = {}
    repairs = []

    def checked_geometry(g, key):
        if not g.is_valid:
            reason = explain_validity(g)
            g = make_valid(g)
            repairs.append(dict(source=key, reason=reason, method='shapely.make_valid; polygonal parts only',
                                resultType=g.geom_type))
        g = polygonal(g)
        assert g.is_valid, key
        return g

    for f in geography['features']:
        if f['properties'].get('target'):
            code = f['properties']['code']
            target_shapes.setdefault(code, []).append(checked_geometry(shape(f['geometry']), 'geography:' + code))
    countries = {code: unary_union(parts) for code, parts in target_shapes.items()}
    assert set(countries) == set(base_manifest['countries'])
    land = unary_union(list(countries.values()))
    selected_ids = sorted(set(RELIGIOUS_GROUPS) | {gid for _, _, ids in ETHNICITY for gid in ids})
    group_shapes = {}
    clips = []
    for gid in selected_ids:
        f = indexed[gid]
        assert f['properties']['type'] in ALLOWED_TYPES, f['properties']
        g = checked_geometry(shape(f['geometry']), 'GeoEPR:' + str(gid))
        clipped = polygonal(g.intersection(land))
        assert not clipped.is_empty and clipped.is_valid, gid
        group_shapes[gid] = clipped
        if not g.equals(clipped):
            clips.append(gid)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = dict(version=1, year=YEAR, sourceVersion=2021, nonExhaustive=True,
                    crs='EPSG:4326', sources=source_info,
                    generator='scripts/atlas-west-asia-settlements.py',
                    geography=dict(file='west-asia-v1/geography.json', sha256=sha(geography_raw),
                                   source=base_manifest['geography']),
                    method='Selected GeoEPR 2021 politically relevant group footprints valid in 2020, not an exhaustive ethnicity map. Only Regionally based, Regional & urban and Aggregate types are eligible. Selected source names are combined only within named example categories. Invalid geometries are explicitly recorded and repaired with make_valid without smoothing; polygonal parts are clipped to existing West Asia target land. Full grouped footprints and their overlaps are retained. A separate shared category is appended to identify cross-category overlaps; it does not replace or subtract from those footprints. Uncovered land is unlisted in this edition, not evidence of group or religion absence. EPR-ED 2021 supplies group characteristics, not local population shares or 2020 observations.',
                    processing=dict(geometryRepairs=repairs, clippedSourceGroups=clips,
                                    simplification=False,
                                    clippingLimit='Existing generalized Natural Earth country boundaries can differ from GeoEPR outlines. Clipping is for this page extent, not a sovereignty/current-control claim.'),
                    sourceCoverage=dict(activeRecords=len(current), types=dict(Counter(f['properties']['type'] for f in current)),
                                        selectedSourceGroups=selected_ids,
                                        excludedRecords=[dict(f['properties'], reason='settlement-type-not-mapped' if f['properties']['type'] not in ALLOWED_TYPES else 'not-selected-for-first-edition')
                                                         for f in current if f['properties']['gwgroupid'] not in selected_ids]),
                    regions={'west-asia': {}}, files=[])
    religion_groups = {key: [] for key in RELIGION_KEYS}
    for gid in RELIGIOUS_GROUPS:
        r = ed.get(gid)
        if r is None or not r.get('religion1'):
            key = 'unrecorded'
        elif r['rel1_size'] < .8:
            key = 'multiple'
        elif r['religion1'].startswith('ARI'):
            key = 'islam'
        elif r['religion1'].startswith('ARC'):
            key = 'christianity'
        else:
            raise AssertionError(('Unreviewed religious example', gid, r))
        religion_groups[key].append(gid)

    for topic in ['ethnicity', 'religion']:
        groups = [(slug, label, ids, COLORS[i]) for i, (slug, label, ids) in enumerate(ETHNICITY)] if topic == 'ethnicity' else [
            (key, label, religion_groups[key], color) for key, (label, color) in RELIGION_KEYS.items() if religion_groups[key]]
        rows = []
        for slug, label, ids, color in groups:
            source_groups = []
            for gid in ids:
                p = dict(indexed[gid]['properties'])
                if topic == 'religion':
                    r = ed.get(gid)
                    segments = [dict(position=n, religion=r.get(f'religion{n}'), share=r.get(f'rel{n}_size')) for n in [1, 2, 3]] if r else []
                    p.update(religion=r.get('religion1') if r else None,
                             groupReligiousShare=r.get('rel1_size') if r else None,
                             mixed=slug == 'multiple', segments=segments,
                             denominator='source EPR group; not a location or national population',
                             missingReligionRecord=r is None)
                source_groups.append(p)
            rows.append(dict(id=topic + '-' + slug, label=label, color=color,
                             sourceGroups=source_groups, geometry=unary_union([group_shapes[gid] for gid in ids])))
        union = unary_union([r['geometry'] for r in rows])
        intersections = [(a['id'], b['id'], polygonal(a['geometry'].intersection(b['geometry'])))
                         for i, a in enumerate(rows) for b in rows[i + 1:]]
        intersections = [(a, b, g) for a, b, g in intersections if not g.is_empty and g.area > 0]
        shared = polygonal(unary_union([g for _, _, g in intersections]))
        overlapping_ids = sorted({c for a, b, _ in intersections for c in [a, b]})
        if not shared.is_empty:
            rows.append(dict(id=topic + '-shared', label='掲載居住域の重なり', color='#929698',
                             sourceGroups=[], overlappingCategories=overlapping_ids, geometry=shared))
        output = []
        categories = []
        for r in rows:
            g = r.pop('geometry')
            assert not g.is_empty and g.is_valid, r['id']
            parts = sorted(getattr(g, 'geoms', [g]), key=lambda p: (-p.area, p.bounds))
            r['anchors'] = [[p.representative_point().x, p.representative_point().y] for p in parts[:8]]
            assert all(g.covers(shape({'type': 'Point', 'coordinates': a})) for a in r['anchors'])
            output.append(dict(type='Feature', geometry=mapping(g), properties={k: r[k] for k in ['id', 'label', 'color']}))
            categories.append(r)
        displayed = [shape(f['geometry']) for f in output]
        assert unary_union(displayed).symmetric_difference(union).area < 1e-8, topic
        assert all(polygonal(a.intersection(b)).difference(shared).area < 1e-8
                   for i, a in enumerate(displayed[:-1] if not shared.is_empty else displayed)
                   for b in (displayed[:-1] if not shared.is_empty else displayed)[i + 1:]), topic
        filename = f'west-asia.{topic}.json.gz'
        file_info = write(filename, dict(type='FeatureCollection', features=output))
        manifest['files'].append(dict(file_info, features=len(output)))
        used = {p['gwgroupid'] for c in categories for p in c['sourceGroups']}
        coverage = []
        for code, country in sorted(countries.items()):
            # Avoid treating tiny overlaps of independently generalized country
            # boundaries as additional national group records. PSE selection
            # uses the source's Palestinian Arabs example; its original Israel
            # statename/GW code remains visible and is not rewritten.
            country_groups = [gid for gid in sorted(used)
                              if ('PSE' if gid == 66601200 else GW_TO_TARGET[indexed[gid]['properties']['gwid']]) == code]
            spatial_intersections = [gid for gid in sorted(used) if group_shapes[gid].intersection(country).area > 1e-8]
            coverage.append(dict(code=code, hasExamples=bool(country_groups), sourceGroups=country_groups,
                                 intersectingFootprints=spatial_intersections,
                                 meaning='Source-group country codes are used, not tiny generalized-border intersections. Palestinian Arabs (66601200) is linked to the PSE page selection while the original source statename Israel is retained; this is not a sovereignty/current-control claim.' if country_groups else 'No selected regional footprint associated with this page country in this edition; not absence of people or religion. Statewide/Urban/Dispersed/Migrant records are not local distributions.'))
        config = dict(file=filename, categories=categories, coverage=coverage, nonExhaustive=True,
                      title='掲載集団の居住域' if topic == 'ethnicity' else '集団資料の宗教帰属例',
                      period='2020年に有効な居住域・GeoEPR2021版' if topic == 'ethnicity' else 'EPR-ED2021版の集団資料／居住域は2020年有効',
                      unit='掲載集団の居住域（人口・割合ではない）' if topic == 'ethnicity' else '集団の帰属例（地域・個人の宗教割合ではない）',
                      unlisted=dict(label='この版の掲載域なし', color='#d9dbd6', note='集団や宗教の不在を示さない'),
                      overlap=dict(categoryIds=overlapping_ids, pairs=[dict(categories=[a, b]) for a, b, _ in intersections],
                                   method='Original grouped footprints retain overlaps. The additional shared feature is a display overlay; selected groups can still use their full geometry.',
                                   sharedOverlayOnly=True))
        if topic == 'religion':
            config['religionRule'] = 'Manually selected group examples only. Largest original EPR-ED religious segment >=0.8: ARI→Islam example, ARC→Christianity example. Below 0.8: multiple-segment example. All three original religious slots, nulls and sizes are retained without renormalization. These are static 2021-edition group characteristics, not 2020 local observations.'
        manifest['regions']['west-asia'][topic] = config
    write('manifest.json', manifest)
    assert all(sha((args.source_dir / s['file']).read_bytes()) == s['sha256'] for s in SOURCES)
    print(json.dumps(dict(output=str(OUT), sourceRecords=len(current), repairs=len(repairs),
                          topics={t: dict(categories=len(c['categories']), sourceGroups=sum(len(x['sourceGroups']) for x in c['categories']),
                                          countriesWithExamples=sum(x['hasExamples'] for x in c['coverage']))
                                  for t, c in manifest['regions']['west-asia'].items()},
                          files=manifest['files']), ensure_ascii=False))


if __name__ == '__main__':
    main()
