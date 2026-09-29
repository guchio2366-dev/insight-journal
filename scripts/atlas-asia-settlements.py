"""Build selected settlement areas from GeoEPR 2021, with auditable EPR-ED links.

These are group settlement footprints, NOT local ethnic/religious majorities.
Run with --source-dir containing GeoEPR-2021.geojson and ED-2021.json from ETH.
No administrative statistics or invented boundaries are used.
"""
from pathlib import Path
import argparse, json, gzip, hashlib
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/asia-settlements-v1'
# Curated broad-view examples. Labels describe the mapped source groups, not
# every speaker of a language; full source definitions remain in the manifest.
GROUPS={
 'east-asia':[
  ('チベット系',[71010000]),('ウイグル系',[71036000]),('モンゴル系',[71009000]),
  ('カザフ系',[71035000,71202000]),('チワン族',[71013000]),('台湾先住民族',[71301000]),
  ('アイヌ',[74001000]),('沖縄の集団',[74005000])],
 'southeast-asia':[
  ('ビルマ族',[77501000]),('タイ・ラーオ系の集団',[80003000,77509000,81203000]),
  ('クメール',[81103000,81613000]),('キン族',[81602000]),
  ('マレー系',[82005000,85017000,80001000]),('ジャワ・スンダの集団',[85008000,85014000]),
  ('ダヤク',[85016000,82002000]),('パプア系',[85013000]),('モロ',[84003000]),
  ('シャン',[80002000])],
 'south-central-asia':[
  ('パシュトゥーン',[70012000,77004000]),('タジク',[70014000,70203000,70404000]),
  ('ウズベク',[70016000,70205000,70305000,70406000]),('トルクメン',[70015000,70113000]),
  ('カザフ',[70502000]),('キルギス',[70201000,70301000]),('バルーチ',[77001000]),
  ('パンジャーブの集団',[77005000,75017000]),('シンドの集団',[77006000]),
  ('ヒンディー語集団の一部',[75005000]),('ベンガルの集団',[75002000,77102000]),
  ('マラーティー語集団の一部',[75011000]),('テルグ語集団の一部',[75020000]),
  ('タミルの集団',[75019000,78004000,78001000]),('シンハラ',[78003000]),
  ('ハザーラ',[70007000])]
}
COLORS=['#b59052','#64959b','#ab749b','#91a95a','#c27c62','#6f84ae','#928263','#5d9c85','#9a91bf','#c5a04d','#669073','#b57e85','#738cbb','#b39672','#70a3a0','#9772a0']
# Religion is a linked GROUP characteristic, never a local share. Keep only
# explicit, reviewed examples; do not auto-classify every EPR-ED record.
RELIGIOUS_GROUPS={
 'east-asia':[71010000,71036000,71035000,71202000],
 'southeast-asia':[77501000,77509000,77502000,77507000,80003000,80001000,
  81103000,81101000,81203000,81613000,82005000,83501000,84001000,84003000,
  85017000,85008000,85012000,85014000,85004000,85001000,85009000,85002000,85010000,85003000],
 'south-central-asia':[70012000,70007000,70014000,70016000,70015000,70113000,
  70203000,70205000,70201000,70206000,70305000,70404000,
  75005000,75011000,75020000,75004000,75015000,75019000,75002000,75017000,
  75001000,75006000,75014000,75012000,75010000,75007000,
  76002000,76001010,76001020,77001000,77005000,77006000,77004000,77008000,
  77102000,77103000,78003000,78004000,78001000,78002000,79001000,79003000,79006000]
}
MIXED_CENTRAL=[70301000,70406000,70502000]
RELIGIONS={'ARI':('イスラム教','#6a9c82'),'ERH':('ヒンドゥー教','#c69752'),
 'ERB':('仏教','#b79ab9'),'ERS':('シク教','#9ca947'),'ARC':('キリスト教','#7a9fb8')}

def polygon(g):
 if g.is_empty:return g
 return unary_union([p for p in getattr(g,'geoms',[g]) if p.geom_type in ['Polygon','MultiPolygon']])
def write(name,data):
 b=(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode()
 (OUT/name).write_bytes(gzip.compress(b,mtime=0) if name.endswith('.gz') else b)
def main():
 p=argparse.ArgumentParser();p.add_argument('--source-dir',type=Path,required=True);args=p.parse_args()
 raw=(args.source_dir/'GeoEPR-2021.geojson').read_bytes();edraw=(args.source_dir/'ED-2021.json').read_bytes()
 features={f['properties']['gwgroupid']:f for f in json.loads(raw)['features'] if f['properties']['from']<=2020<=f['properties']['to']}
 ed={r['gwgroupid']:r for r in json.loads(edraw)['data']}
 OUT.mkdir(exist_ok=True)
 manifest={'version':2,'year':2020,'sourceVersion':2021,'sources':[
  {'url':'https://icr.ethz.ch/data/epr/geoepr/GeoEPR-2021.geojson','sha256':hashlib.sha256(raw).hexdigest()},
  {'url':'https://icr.ethz.ch/data/epr/ed/ED-2021.json','sha256':hashlib.sha256(edraw).hexdigest()}],
  'method':'Selected regional settlement footprints in GeoEPR 2021 valid in 2020; excludes Statewide, Urban, Migrant and Dispersed records. Same-category unions; cross-category overlaps explicitly mapped as shared. Religion joins manually reviewed EPR-ED group examples with >=0.8 dominant-group religious segment. Central Asian mixed-composition groups are separately labelled and retain all EPR-ED segments; they do not satisfy the single-religion >=0.8 rule. This does not estimate religion or ethnicity shares within a location. Not a comprehensive population map. No administrative statistics used.','regions':{}}
 for region,groups in GROUPS.items():
  geography=json.loads((ROOT/'public/assets/atlas/asia-population-v1'/f'{region}.geography.json').read_text())
  land=unary_union([shape(f['geometry']) for f in geography['features'] if f['properties'].get('target')])
  manifest['regions'][region]={}
  for topic in ['ethnicity','religion']:
   categories=[]
   if topic=='ethnicity':
    categories=[(label,ids,COLORS[i%len(COLORS)]) for i,(label,ids) in enumerate(groups)]
   else:
    classified={key:[] for key in RELIGIONS}
    for gid in RELIGIOUS_GROUPS[region]:
     r=ed[gid];key=next(k for k in RELIGIONS if r['religion1'].startswith(k))
     assert r['rel1_size']>=.8,(gid,r)
     classified[key].append(gid)
    categories=[(label,classified[key],color) for key,(label,color) in RELIGIONS.items() if classified[key]]
   if topic=='religion' and region=='south-central-asia':categories.append(('イスラム教など（複数の帰属）',MIXED_CENTRAL,'#83b9ae'))
   rows=[]
   for i,(label,ids,color) in enumerate(categories):
    selected=[features[gid] for gid in ids]
    assert all(f['properties']['type'] in ['Regionally based','Regional & urban','Aggregate'] for f in selected)
    g=polygon(unary_union([shape(f['geometry']).buffer(0) for f in selected]).intersection(land))
    if not g.is_empty:rows.append({'id':f'{topic}-{i}','label':label,'color':color,'geometry':g,'sourceGroups':[dict(f['properties'],**({'religion':ed[f['properties']['gwgroupid']]['religion1'],'groupReligiousShare':ed[f['properties']['gwgroupid']]['rel1_size'],'mixed':f['properties']['gwgroupid'] in MIXED_CENTRAL,'segments':[{'religion':ed[f['properties']['gwgroupid']][f'religion{n}'],'share':ed[f['properties']['gwgroupid']][f'rel{n}_size']} for n in [1,2,3] if ed[f['properties']['gwgroupid']][f'religion{n}']]} if topic=='religion' else {})) for f in selected]})
   overlaps=unary_union([a['geometry'].intersection(b['geometry']) for i,a in enumerate(rows) for b in rows[i+1:]])
   overlaps=polygon(overlaps)
   for r in rows:r['geometry']=polygon(r['geometry'].difference(overlaps))
   if not overlaps.is_empty:rows.append({'id':topic+'-shared','label':'掲載した居住域の重なり','color':'#929698','geometry':overlaps,'sourceGroups':[]})
   output=[];meta=[]
   for r in rows:
    g=r.pop('geometry')
    if g.is_empty:continue
    # Preserve source boundaries; no smoothing across places with no evidence.
    parts=sorted(getattr(g,'geoms',[g]),key=lambda x:x.area,reverse=True)
    anchors=[[round(p.representative_point().x,5),round(p.representative_point().y,5)] for p in parts[:8]]
    output.append({'type':'Feature','geometry':mapping(g),'properties':{k:r[k] for k in ['id','label','color']}})
    # Country names follow the source groups, not tiny intersections between
    # independently generalized country and settlement boundaries.
    meta.append(dict(r,anchors=anchors))
   filename=f'{region}.{topic}.json.gz';write(filename,{'type':'FeatureCollection','features':output})
   manifest['regions'][region][topic]={'file':filename,'categories':meta}
 write('manifest.json',manifest)
 print({r:{t:len(v['categories']) for t,v in topics.items()} for r,topics in manifest['regions'].items()})
if __name__=='__main__':main()
