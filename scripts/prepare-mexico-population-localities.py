"""Prepare population-only locality points from the retained official ITER ZIP."""
import argparse
import csv
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import re
import zipfile
from collections import Counter, defaultdict

parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
source = repo / 'data-source/atlas/mexico/population-localities'
output = repo / 'public/assets/atlas/mexico-population-localities-v1'
source.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
record = json.loads((repo / 'data-source/atlas/mexico/population/source-record.json').read_text())
sha = hashlib.sha256(args.archive.read_bytes()).hexdigest()
if sha != record['populationArchive']['sha256']:
    raise ValueError('Archive does not match the retained official source record')
index = json.loads((repo / 'src/data/atlas/mexico/geometry-index.json').read_text())
projection = index['metadata']['projection']
rad = math.pi / 180
f = 1 / projection['inverseFlattening']
e = math.sqrt(2 * f - f * f)
a = projection['semiMajorM']

def m(phi):
    return math.cos(phi) / math.sqrt(1 - e * e * math.sin(phi) ** 2)

def t(phi):
    return math.tan(math.pi / 4 - phi / 2) / ((1 - e * math.sin(phi)) / (1 + e * math.sin(phi))) ** (e / 2)

p1, p2 = projection['standardParallel1'] * rad, projection['standardParallel2'] * rad
n = (math.log(m(p1)) - math.log(m(p2))) / (math.log(t(p1)) - math.log(t(p2)))
F = m(p1) / (n * t(p1) ** n)
rho0 = a * F * t(projection['latitudeOrigin'] * rad) ** n
minx, miny, maxx, maxy = index['metadata']['boundsNative']
scale = min(844 / (maxx - minx), 524 / (maxy - miny))
left, top = (900 - (maxx - minx) * scale) / 2, (580 - (maxy - miny) * scale) / 2
dms = re.compile(r'^(\d+)°(\d+)\'(\d+(?:\.\d+)?)"\s*([WN])$')

def coordinate(value):
    match = dms.fullmatch(value.strip())
    if not match:
        raise ValueError('Invalid DMS coordinate: ' + value)
    degree, minute, second, hemisphere = match.groups()
    if int(minute) >= 60 or float(second) >= 60:
        raise ValueError('Invalid DMS minute/second')
    number = int(degree) + int(minute) / 60 + float(second) / 3600
    return -number if hemisphere == 'W' else number

def project(lon, lat):
    rho = a * F * t(lat * rad) ** n
    theta = n * (lon - projection['centralMeridian']) * rad
    x = projection['falseEastingM'] + rho * math.sin(theta)
    y = projection['falseNorthingM'] + rho0 - rho * math.cos(theta)
    return round(left + (x - minx) * scale, 5), round(top + (maxy - y) * scale, 5)

fields = ['ENTIDAD', 'MUN', 'LOC', 'NOM_MUN', 'NOM_LOC', 'LONGITUD', 'LATITUD', 'POBTOT']
states, groups = defaultdict(list), {}
state_sums, municipality_sums, municipality_totals = Counter(), Counter(), {}
national = None
seen = set()
selected = io.StringIO(newline='')
writer = csv.DictWriter(selected, fieldnames=fields, lineterminator='\n')
writer.writeheader()
with zipfile.ZipFile(args.archive) as z:
    with z.open(record['populationArchive']['csvMember']) as file:
        for row in csv.DictReader(io.TextIOWrapper(file, encoding='utf-8-sig')):
            entity, municipality, locality = row['ENTIDAD'], row['MUN'], row['LOC']
            if locality == '0000':
                if entity == '00':
                    national = int(row['POBTOT'])
                elif municipality != '000':
                    municipality_totals[entity + municipality] = int(row['POBTOT'])
            if entity == '00' or municipality == '000' or not 0 < int(locality) < 9998:
                continue
            raw_population = row['POBTOT'].strip()
            if not raw_population.isdigit():
                raise ValueError('Do not coerce missing/confidential population to zero')
            population = int(raw_population)
            code = entity + municipality + locality
            if code in seen:
                raise ValueError('Duplicate locality key: ' + code)
            seen.add(code)
            lon, lat = coordinate(row['LONGITUD']), coordinate(row['LATITUD'])
            x, y = project(lon, lat)
            states[entity].append([x, y, population, code, row['NOM_LOC'], row['NOM_MUN']])
            state_sums[entity] += population
            municipality_sums[entity + municipality] += population
            writer.writerow({key: row[key] for key in fields})
            key = (entity, math.floor(x / 4), math.floor(y / 4))
            if key not in groups:
                groups[key] = [0, 0, 0, 0, entity, '', x, y, x, y, -1]
            group = groups[key]
            group[0] += x * population
            group[1] += y * population
            group[2] += population
            group[3] += 1
            group[6], group[7] = min(group[6], x), min(group[7], y)
            group[8], group[9] = max(group[8], x), max(group[9], y)
            if population > group[10]:
                group[5], group[10] = row['NOM_LOC'], population

existing = json.loads((repo / 'src/data/atlas/mexico/population.json').read_text())
assert sum(state_sums.values()) == national == existing['nationalPopulation']
assert len(seen) == 189432 and len(municipality_totals) == 2469
assert municipality_sums == Counter(municipality_totals)
assert all(state_sums[row['stateCode']] == row['population'] for row in existing['states'])
overview = []
for key, group in sorted(groups.items()):
    population = group[2]
    assert population > 0
    overview.append([round(group[0] / population, 5), round(group[1] / population, 5)] + group[2:10])
assert sum(row[2] for row in overview) == national
assert sum(row[3] for row in overview) == len(seen)

def save_gzip(path, value):
    data = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
    path.write_bytes(gzip.compress(data, mtime=0))
    return {'file': path.name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

overview_file = save_gzip(output / 'overview.json.gz', overview)
chunks = []
for code, rows in sorted(states.items()):
    file = save_gzip(output / f'localities-{code}.json.gz', rows)
    chunks.append({**file, 'stateCode': code, 'localities': len(rows), 'population': state_sums[code],
                   'bounds': [min(r[0] for r in rows), min(r[1] for r in rows), max(r[0] for r in rows), max(r[1] for r in rows)]})
source_bytes = selected.getvalue().encode()
(source / 'locality-source-fields.csv.gz').write_bytes(gzip.compress(source_bytes, mtime=0))
manifest = {'schemaVersion': 1, 'referenceDate': '2020-03-15', 'sourceMetadataModified': '2022-05-19',
            'localities': len(seen), 'municipalities': len(municipality_totals), 'population': national,
            'sourceUrl': record['populationArchive']['url'], 'sourceArchiveSha256': sha,
            'attribution': 'Fuente: INEGI, Censo de Población y Vivienda 2020, Principales resultados por localidad (ITER), cuarta edición.',
            'reuseTermsUrl': 'https://www.inegi.org.mx/inegi/terminos.html',
            'overview': {**overview_file, 'points': len(overview), 'binWidthInMapUnits': 4, 'method': 'Nearby locality representative points grouped in 4x4 projected display units within each source state. Counts summed; position is population-weighted mean. Every source locality assigned exactly once.'},
            'pointFields': ['x', 'y', 'population', 'localityCode', 'localityName', 'municipalityName'],
            'overviewFields': ['x', 'y', 'population', 'localities', 'stateCode', 'largestLocalityName', 'minX', 'minY', 'maxX', 'maxY'],
            'chunks': chunks, 'projection': projection,
            'coordinateNote': 'Official DMS locality representative coordinates converted into the existing map display projection. ITER datum/epoch is not explicitly documented in the reviewed descriptor; no epoch-dependent transformation, house positions, locality area, or cadastral accuracy claimed.',
            'validation': {'localityPopulationEqualsEveryMunicipality': True, 'localityPopulationEqualsEveryState': True, 'overviewPreservesPopulationAndLocalityCounts': True, 'allPopulationFieldsNumeric': True, 'excludedSyntheticLocalities': ['0000', '9998', '9999']},
            'sourceSelectedFields': {'file': 'locality-source-fields.csv.gz', 'sha256': hashlib.sha256((source / 'locality-source-fields.csv.gz').read_bytes()).hexdigest()}}
text = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
(output / 'manifest.json').write_text(text)
(repo / 'src/data/atlas/mexico/population-localities.json').write_text(text)
(source / 'manifest.json').write_text(text)
print(json.dumps({'localities': len(seen), 'population': national, 'overview_points': len(overview), 'overview_gzip_bytes': overview_file['bytes'], 'all_detail_gzip_bytes': sum(c['bytes'] for c in chunks), 'source_gzip_bytes': (source / 'locality-source-fields.csv.gz').stat().st_size}))
