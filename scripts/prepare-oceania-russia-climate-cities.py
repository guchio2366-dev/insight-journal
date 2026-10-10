#!/usr/bin/env python3
"""Extract selected JMA Normal columns from saved public-page reader text.

No network access. Input snapshots are outside the checkout; keep only selected
station metadata and monthly normal facts, never the Observation or SPI columns.
"""
import csv, hashlib, io, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIONS = [
 ('darwin','oceania','AUS','ダーウィン','オーストラリア','94120'),
 ('alice-springs','oceania','AUS','アリススプリングス','オーストラリア','94326'),
 ('brisbane','oceania','AUS','ブリスベン','オーストラリア','94578'),
 ('perth','oceania','AUS','パース','オーストラリア','94610'),
 ('hokitika','oceania','NZL','ホキティカ','ニュージーランド','93615'),
 ('rotuma','oceania','FJI','ロトゥーマ島','フィジー','91650'),
 ('moscow','russia','RUS','モスクワ','ロシア','27612'),
 ('verkhoyansk','russia','RUS','ヴェルホヤンスク','ロシア','24266'),
 ('vladivostok','russia','RUS','ウラジオストク','ロシア','31960'),
 ('malye-karmakuly','russia','RUS','マールィエ・カルマクルィ','ロシア','20744'),
]

def generate(directory):
 pages = []
 for file in Path(directory).glob('*.txt'):
  pages.extend(re.split(r'\n-{20,}\n', file.read_text()))
 cities=[]
 evidence=ROOT/'data-source/atlas/oceania-russia-climate-cities'
 evidence.mkdir(parents=True,exist_ok=True)
 for key,region,country,name,country_name,station in STATIONS:
  choices=[p for p in pages if re.search(r'\?[^\s]*\bn='+station+r'\b',p) and 'Internal Error' not in p]
  assert len(choices)==1,(station,len(choices))
  page=choices[0]
  url=re.search(r'\((https://[^\s]+)\)',page)[1]
  lines=[re.sub(r'^L\d+:\s*','',l) for l in page.splitlines() if re.match(r'^L\d+:',l)]
  position=re.search(r'Lat\.:\s*([\d.]+)\s*°([NS])\s*/\s*Lon\.:\s*([\d.]+)°([EW])\s+Height:\s*([\d.-]+)\(m\)',page)
  assert position,station
  lat,ns,lon,ew,height=position.groups()
  position_index=next(i for i,l in enumerate(lines) if 'Lat.:' in l)
  metadata=lines[position_index]
  station_name=(lines[position_index-1] if metadata.startswith('Lat.:') else metadata).split(' -')[0].strip()
  assert station_name and 'Lat.:' not in station_name,(station,station_name)
  months={}; counts={}
  for line in lines:
   cells=[c.strip() for c in line.split('|')]
   if re.fullmatch(r'\d{4}-\d{2}',cells[0]):
    month=int(cells[0][-2:]); vals=cells[5:7]
   elif re.fullmatch(r'\d{2}',cells[0]) and len(cells)==3:
    month=int(cells[0]); vals=cells[1:3]
   else: continue
   assert len(vals)==2 and all(re.fullmatch(r'-?\d+(?:\.\d+)?',v) for v in vals),(station,cells)
   pair=[float(v) for v in vals]
   assert month not in months or months[month]==pair,(station,month)
   months[month]=pair;counts[month]=counts.get(month,0)+1
  assert set(months)==set(range(1,13)),(station,months)
  if 'Year/Month' in page: assert min(counts.values())>=2,station
  buffer=io.StringIO(newline=''); writer=csv.writer(buffer,lineterminator='\n')
  writer.writerow(['month','temperatureC','precipitationMm'])
  writer.writerows([m,*months[m]] for m in range(1,13))
  selected=buffer.getvalue(); (evidence/f'{station}-normal.csv').write_text(selected)
  city={'id':key,'region':region,'countryCode':country,'name':name,'countryName':country_name,
   'stationId':station,'stationName':station_name,
   'coordinates':[float(lon)*(-1 if ew=='W' else 1),float(lat)*(-1 if ns=='S' else 1)],
   'elevationM':float(height),'temperatureC':[months[m][0] for m in range(1,13)],
   'precipitationMm':[months[m][1] for m in range(1,13)],'normalPeriod':'1991–2020',
   'sourceUrl':url,'sourceName':'気象庁 ClimatView（CLIMAT・GHCNに基づく観測所別平年値）',
   'sourceRetrievedAt':'2026-10-10','sourceTermsUrl':'https://www.jma.go.jp/jma/en/copyright.html',
   'selectedNormalSha256':hashlib.sha256(selected.encode()).hexdigest(),
   'sourceNormalOccurrences':[counts[m] for m in range(1,13)]}
  cities.append(city)
  print(key,station_name,'T',min(city['temperatureC']),max(city['temperatureC']),'P',max(city['precipitationMm']))
 (ROOT/'src/data/atlas/oceania-russia-climate-cities.json').write_text(json.dumps(cities,ensure_ascii=False,indent=2)+'\n')
 (evidence/'provenance.json').write_text(json.dumps({'retrievedAt':'2026-10-10','normalPeriod':'1991–2020',
  'periodSource':'https://ds.data.jma.go.jp/tcc/tcc/products/climate/explanation/normal.html',
  'acquisition':'Public official JMA page text retrieved with the web reader. Full source HTML not downloaded; hashes cover selected normal CSVs only.',
  'selection':'Normal mean temperature (degC) and Normal monthly total precipitation (mm), January to December; Observation and SPI excluded.',
  'stations':[{k:v for k,v in c.items() if k not in ['temperatureC','precipitationMm']} for c in cities]},ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__': generate(sys.argv[1])
