"""Audited MEDSL 2024 votes: exact-hash county mirror; CT actual town totals to 2024 planning regions."""
import csv,hashlib,io,json,collections,zipfile
from build import RAW,OUT,save,shapes
raw=(RAW/'votes.csv').read_bytes();assert hashlib.md5(raw).hexdigest()=='bd6661282936006b4ef4f5ee71418f3e'
candidates={'KAMALA D HARRIS':'d','DONALD J TRUMP':'r','CHASE OLIVER':'other','OTHER':'other'};groups=collections.defaultdict(list)
for r in csv.DictReader(io.StringIO(raw.decode())):
 if r['year']=='2024' and r['candidate'] in candidates and r['state_po'] not in ['AK','CT']:
  fips=r['county_fips'].split('.')[0].zfill(5)
  if fips=='36000' and r['state_po']=='MO':fips='29095'
  if fips=='46113':fips='46102'
  groups[(fips,r['county_name'],r['candidate'])].append(r)
county=collections.defaultdict(lambda:{'d':0,'r':0,'other':0});missing=set()
for (fips,name,candidate),rows in groups.items():
 selected=[r for r in rows if r['mode']=='TOTAL'] or rows
 if any(not r['candidatevotes'].isdigit() for r in selected):missing.add(fips);continue
 county[fips][candidates[candidate]]+=sum(int(r['candidatevotes']) for r in selected)
assert missing=={'35011','35019','35021','35023'},missing
# CT town boundaries carry the current planning-region COUNTYFP, unlike 2024 old county returns.
towns={r.record['COUSUBFP']:(r.record['COUNTYFP'],r.record['NAME']) for r in shapes(RAW/'ct_towns.zip').iterShapeRecords()};seen=set()
with zipfile.ZipFile(RAW/'ct24.zip') as z:
 for r in csv.DictReader(io.TextIOWrapper(z.open('ct24.csv'))):
  if r['office']!='US PRESIDENT' or r['mode']!='TOTAL':continue
  town=r['jurisdiction_fips'][-5:];region,name=towns[town];assert name.casefold()==r['jurisdiction_name'].casefold(),(name,r['jurisdiction_name']);seen.add(town)
  county['09'+region][candidates.get(r['candidate'],'other')]+=int(r['votes'])
assert len(seen)==169,len(seen)
ct={k:sum(v[k] for f,v in county.items() if f.startswith('09')) for k in ['d','r','other']};assert ct=={'d':992053,'r':736918,'other':30039},ct
rows=[]
for r in json.loads((OUT/'counties.json').read_text())['rows']:
 fips=r['id'][7:];v=county.get(fips)
 if fips.startswith('02'):reason='アラスカは選挙区と郡相当区の境界が一致しません。'
 elif fips in missing:reason='第三候補の票数が未取得のため、分母を確定できません。'
 elif not v:reason='比較可能な郡の票数が未収録です。'
 else:reason=''
 rows.append({'id':r['id'],**({'total':None,'reason':reason} if reason else {**v,'total':sum(v.values())})})
assert sum(r['total'] is None for r in rows)==35
save('votes',{'version':1,'year':2024,'national':{'d':75017613,'r':77302580,'other':2918109,'total':155238302},'rows':rows})
save('vote-audit',{'version':1,'rows':[],'source':'MEDSL DOI 10.7910/DVN/VOQCHQ v20.0, data version 20260225','mirror':'https://minio.lab.sspcloud.fr/lgaliana/data/python-ENSAE/countypres_2000-2024.csv','sha256':hashlib.sha256(raw).hexdigest(),'CT':'169 actual town TOTALs, Census 2024 planning-region join; CT totals match FEC','CTtotals':ct,'missingCount':35,'crosswalks':{'36000 MO Kansas City':'29095 Jackson, KCEB jurisdiction','46113':'46102 same county renamed'},'denominator':'sum recorded valid candidate votes; TOTAL rows preferred to mode sums; county totalvotes not used','national':'FEC independent national total; county coverage differs, including scattered/write-in votes; no forced allocation'})
