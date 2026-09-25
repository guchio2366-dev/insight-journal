"""Fetch public source snapshots. Raw responses stay outside the repository."""
from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
import json, time
ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT.parent/'europe-source-cache'
CACHE.mkdir(exist_ok=True)
sources={
 'rivers.json':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson',
 'lakes.json':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_lakes.geojson',
 'places.json':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson',
}
for indicator in ['SP.POP.TOTL','SP.URB.TOTL.IN.ZS','SP.POP.65UP.TO.ZS','SP.POP.GROW','NV.IND.MANF.ZS','NV.IND.TOTL.ZS','NV.SRV.TOTL.ZS','NV.AGR.TOTL.ZS','AG.LND.FRST.ZS','NY.GDP.PCAP.CD']:
 sources[indicator+'.json']=f'https://api.worldbank.org/v2/country/all/indicator/{indicator}?date=2020:2024&format=json&per_page=20000'
def get(item):
 name,url=item;p=CACHE/name
 if p.exists(): return name+' cached'
 for attempt in range(3):
  try:
   with urlopen(Request(url,headers={'User-Agent':'InsightJournal Europe data preparation'}),timeout=90) as r: raw=r.read()
   json.loads(raw);p.write_bytes(raw);return name+' '+str(len(raw))
  except Exception:
   if attempt==2: raise
   time.sleep(2)
with ThreadPoolExecutor(max_workers=5) as pool:
 for result in pool.map(get,sources.items()):print(result,flush=True)
(CACHE/'context-sources.json').write_text(json.dumps(sources),encoding='utf8')
