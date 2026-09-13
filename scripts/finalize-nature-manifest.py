"""Finalize source metadata and public file hashes after geometry and fallbacks."""
from pathlib import Path
import gzip
import hashlib
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/nature-v1'
DETAIL=ROOT/'data/derived/nature-v1/contours-detail'
manifest=json.loads((OUT/'manifest.json').read_text())
cities=json.loads((OUT/'climate-cities.json').read_text())
for city in cities:
    if city.get('koppenCode') is None:
        city['koppenNote']='観測所が位置する沿岸の格子は採用気候図で未収録。近隣格子による補完はしていない。NOAA雨温図は12か月収録。'
(OUT/'climate-cities.json').write_text(json.dumps(cities,ensure_ascii=False,separators=(',',':')))
if (OUT/'contour-tiles.json').exists() or (OUT/'contours').exists():
    raise RuntimeError('Detailed contours must stay outside public')

index=json.loads((DETAIL/'contour-tiles.json').read_text())
previous_manifest=json.loads((DETAIL/'manifest.json').read_text()) if (DETAIL/'manifest.json').exists() else {}
detail_files=[]
for tile in index:
    path=DETAIL/tile['file']
    raw=path.read_bytes()
    detail_files.append({
        'path':tile['file'],
        'oldPublicPath':f"public/assets/atlas/nature-v1/contours/{tile['file']}",
        'intervalM':tile['intervalM'],
        'bounds':tile['bounds'],
        'bytes':len(raw),
        'sha256':hashlib.sha256(raw).hexdigest(),
        'gitBlobSha':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(),
    })
detail_manifest={
    'schemaVersion':1,
    'version':'1.0.0',
    'purpose':'公開対象外として保全する地域別100m・250m等高線。将来の再検討用であり、Webサイトからは配信・参照しない。',
    'sourcePublicCommit':previous_manifest.get('sourcePublicCommit'),
    'index':'contour-tiles.json',
    'indexPathBasis':'relative-to-this-directory',
    'fileCount':len(detail_files),
    'compressedBytes':sum(item['bytes'] for item in detail_files),
    'files':detail_files,
}
(DETAIL/'manifest.json').write_text(json.dumps(detail_manifest,ensure_ascii=False,separators=(',',':'))+'\n')

national=json.loads(gzip.decompress((OUT/'contours.geojson.gz').read_bytes()))
manifest['version']='1.2.0'
manifest['elevation']['contourIntervalsM']=[500]
manifest['elevation']['featureCount']=len(national['features'])
manifest['elevation']['displaySimplificationM']={'500':1200}
manifest['elevation']['compression']='One national gzip file decoded with DecompressionStream; no Range requests'
manifest['elevation']['preservedDetailArchive']={
    'repositoryPath':'data/derived/nature-v1/contours-detail/manifest.json',
    'publiclyServed':False,
    'fileCount':detail_manifest['fileCount'],
    'compressedBytes':detail_manifest['compressedBytes'],
}
manifest['files']={str(path.relative_to(OUT)):{'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for path in sorted(OUT.rglob('*')) if path.is_file() and path.name!='manifest.json'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
print(f"{len(manifest['files'])} assets; {sum(item['bytes'] for item in manifest['files'].values())/1e6:.2f} MB")
