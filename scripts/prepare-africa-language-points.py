"""No network fetch; verify the original dataset before deriving the excerpt."""
from pathlib import Path
import csv,json,hashlib,gzip,io
import argparse
parser=argparse.ArgumentParser(description='Build the CC BY 4.0 Glottolog 5.3 African language-location excerpt offline.')
parser.add_argument('--languages',type=Path,required=True,help='Pinned official glottolog-cldf languages.csv')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
input_path=args.languages
expected='1a50a393bc81568b656f9522be18aa4f80f38e94309ba6c863d583234adfbb89'
if hashlib.sha256(input_path.read_bytes()).hexdigest()!=expected: raise SystemExit('Input must match the pinned official source CSV SHA256')
rows=list(csv.DictReader(input_path.open(encoding='utf8')))
names={r['ID']:r['Name'] for r in rows}
excluded={'Bookkeeping','Unattested','Sign Language'}
points=[]
for r in rows:
 if r['Level']!='language' or r['Macroarea']!='Africa' or not r['Latitude'] or not r['Longitude']: continue
 family=names.get(r['Family_ID'],'Isolate')
 if family in excluded: continue
 lon,lat=float(r['Longitude']),float(r['Latitude'])
 if not (-26<=lon<=64 and -36<=lat<=38): continue
 points.append({'id':r['ID'],'name':r['Name'],'family':family,'familyId':r['Family_ID'] or 'isolate','coordinates':[round(lon,5),round(lat,5)],'countries':r['Countries'].split(';') if r['Countries'] else []})
asset=root/'public/assets/atlas/africa-culture-v2';asset.mkdir(parents=True,exist_ok=True)
raw=(json.dumps({'points':points},ensure_ascii=False,separators=(',',':'))+'\n').encode()
(asset/'language-points.json').write_bytes(raw)
manifest={'schemaVersion':1,'source':'https://github.com/glottolog/glottolog-cldf','sourceCommit':'072ca0d0410039fb8b779be8fc165bac575d2cda','sourceBlob':'774cbd8cb1bbdbc2eab64edf5df552b61252e876','sourceVersion':'Glottolog 5.3 (2026)','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','attribution':'Hammarström, Harald; Forkel, Robert; Haspelmath, Martin; Bank, Sebastian (2026). Glottolog 5.3. Max Planck Institute for Evolutionary Anthropology.','sourceCsvSha256':hashlib.sha256(input_path.read_bytes()).hexdigest(),'count':len(points),'method':'Level=language; Macroarea=Africa; finite source coordinates within [-26,-36,64,38]; exclude Bookkeeping, Unattested and Sign Language; retain independently classified families, isolates and Pidgin as a distinct contact-language category. Coordinates rounded to five decimal places; no invented residence areas or density weighting.','measure':'Language documentation locations, not ethnicity, speaker counts or residence boundaries.','assetSha256':hashlib.sha256(raw).hexdigest()}
(asset/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'count':len(points),'bytes':len(raw)}))
