"""Reproducible ACS 2020–24 population assets. Run: python scripts/population/build.py RAW_DIR.
Raw ACS summary tables, Census 2024 cartographic ZIPs, NCHS 2023 classification.
County geometry is the recovered, reviewed generalized Census geometry in this repository.
"""
import csv,gzip,hashlib,io,json,pathlib,sys,zipfile
import shapefile
RAW=pathlib.Path(sys.argv[1]); OUT=pathlib.Path('public/assets/atlas/population/v1'); OUT.mkdir(parents=True,exist_ok=True)
def shapes(path):
 z=zipfile.ZipFile(path);stem=next(n[:-4] for n in z.namelist() if n.endswith('.shp'))
 return shapefile.Reader(shp=io.BytesIO(z.read(stem+'.shp')),shx=io.BytesIO(z.read(stem+'.shx')),dbf=io.BytesIO(z.read(stem+'.dbf')),encoding='utf-8')
def save(name,value):
 raw=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode();(OUT/(name+'.json')).write_bytes(raw);(OUT/(name+'.json.gz')).write_bytes(gzip.compress(raw,mtime=0));print(name,len(raw),len(gzip.compress(raw,mtime=0)),flush=True)
def table(name):
 with (RAW/name).open() as f:
  return {r['GEO_ID']:r for r in csv.DictReader(f,delimiter='|') if r['GEO_ID'].startswith(('010','040','050','140'))}
def number(x):
 try:return int(x) if int(x)>=0 else None
 except:return None
def observation(row,prefix,cell):
 return [number(row.get(f'{prefix}_E{cell:03}')),number(row.get(f'{prefix}_M{cell:03}'))]
def main():
 population=table('b01003.dat');ethnicity=table('b03002.dat')
 national=number(population['0100000US']['B01003_E001']);assert national==334922499
 nchs={}
 with (RAW/'nchs.csv').open(encoding='cp1252') as f:
  for r in csv.DictReader(f):
   if r['CODE2023'].strip():nchs[r['STFIPS'].zfill(2)+r['CTYFIPS'].zfill(3)]=int(r['CODE2023'])
 states={r.record['STATEFP']:r.record['NAME'] for r in shapes(RAW/'states.zip').iterShapeRecords() if int(r.record['STATEFP'])<60}
 rows=[];ethrows=[];totals=[0,0,0,0]; cells=[3,4,12,6,5,7,9,8]
 for s in shapes(RAW/'counties.zip').iterShapeRecords():
  r=s.record.as_dict();fips=r['GEOID'];state=r['STATEFP']
  if state not in states:continue
  p=observation(population['0500000US'+fips],'B01003',1);area=int(r['ALAND'])/1e6;code=nchs[fips]
  totals[0 if code==1 else 1 if code==2 else 2 if code in [3,4] else 3]+=p[0]
  rows.append({'id':'county:'+fips,'name':r['NAMELSAD'],'state':state,'population':p,'area':round(area,6),'class':code})
  er=ethnicity['0500000US'+fips];counts=[observation(er,'B03002',c) for c in cells];assert sum(x[0] for x in counts)==p[0]
  ethrows.append({'id':'county:'+fips,'counts':counts})
 assert len(rows)==3144 and sum(r['population'][0] for r in rows)==national
 save('counties',{'version':1,'year':'2020–2024','national':national,'states':states,'classification':totals,'rows':sorted(rows,key=lambda x:x['id'])})
 save('ethnicity',{'version':1,'national':[observation(ethnicity['0100000US'],'B03002',c) for c in cells],'rows':ethrows})
 for name in ['counties.geo']:
  raw=(OUT/(name+'.json')).read_bytes();(OUT/(name+'.json.gz')).write_bytes(gzip.compress(raw,mtime=0))
 statefeatures=[]
 for s in shapes(RAW/'states.zip').iterShapeRecords():
  if s.record['STATEFP'] in states:statefeatures.append({'type':'Feature','properties':{'id':'state:'+s.record['STATEFP'],'name':s.record['NAME']},'geometry':s.shape.__geo_interface__})
 save('states.geo',{'type':'FeatureCollection','features':statefeatures})
 manifest={'version':1,'population':{'source':'US Census Bureau ACS 2020–2024, B01003 and B03002 table-based summary files','url':'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/','universe':'50 states and DC; contiguous US map','density':'ACS population / 2024 official ALAND square kilometres','moe':'90% confidence margin; negative Census sentinel retained as unavailable, not zero'},'classification':{'source':'NCHS 2023 Urban–Rural Classification','url':'https://www.cdc.gov/nchs/data/data-analysis/NCHSurb-rural-codes.csv','grouping':[[1],[2],[3,4],[5,6]],'weight':'ACS population; county classes do not delimit city/suburb residents'},'inputs':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in RAW.iterdir() if p.suffix in ['.dat','.zip','.csv','.xlsx']},'countyCount':len(rows)}
 save('manifest',manifest)
if __name__=='__main__':main()
