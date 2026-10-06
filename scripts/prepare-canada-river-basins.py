"""Build named river catchments from HydroBASINS topology, not statistical regions.
Usage: PYTHONPATH=... python scripts/prepare-canada-river-basins.py /path/to/downloads
Requires shapely, pyshp. Download hybas_{na_lev04,na_lev06,ar_lev04}_v1c.zip.
"""
from pathlib import Path
import sys,json,zipfile,hashlib
import shapefile
from shapely.geometry import shape,mapping,Point
from shapely import make_valid
from shapely.ops import unary_union
root=Path(__file__).resolve().parents[1]; source=Path(sys.argv[1]); out=root/'public/assets/atlas/canada-water-v1'
collections={}; provenance=[]
for tile,level in [('na','04'),('na','06'),('ar','04')]:
 archive=source/f'hybas_{tile}_lev{level}.zip'
 with zipfile.ZipFile(archive) as z:z.extractall(source/'basins')
 r=shapefile.Reader(str(source/'basins'/f'hybas_{tile}_lev{level}_v1c.shp'))
 collections[tile+level]=[(sr.record.as_dict(),shape(sr.shape.__geo_interface__)) for sr in r.iterShapeRecords()]
 provenance.append({'url':f'https://data.hydrosheds.org/file/HydroBASINS/standard/hybas_{tile}_lev{level}_v1c.zip','sha256':hashlib.sha256(archive.read_bytes()).hexdigest()})
def basin(key,outlet,upstream=False):
 rows=collections[key]
 if not upstream:return [(r,g) for r,g in rows if r['MAIN_BAS']==outlet and r['ENDO']==0 and r['COAST']==0]
 chosen={outlet}
 while True:
  more={r['HYBAS_ID'] for r,g in rows if r['NEXT_DOWN'] in chosen and r['ENDO']==0}
  if more<=chosen:break
  chosen|=more
 return [(r,g) for r,g in rows if r['HYBAS_ID'] in chosen]
definitions=[
 ('mackenzie','マッケンジー川','#b8cbe3','ar04',8040009560,False,[-120,60], '西部山地と内陸平原の水は、ピース川・アサバスカ川からスレーブ川・グレートスレーブ湖を経てマッケンジー川に集まり、北極海へ流れます。プレーリー北西縁のピース地方も、この北向きの水系に含まれます。'),
 ('fraser','フレーザー川','#e3ce93','na04',7040016260,False,[-123,53], 'ロッキー山地側とBC内陸からの水が、トンプソン川などを通じてフレーザー川に集まり、バンクーバー南側で太平洋へ流れます。下流のフレーザーバレーの農業を、内陸・山地の集水域と結び付けて読みます。'),
 ('columbia','コロンビア川','#b5d9cb','na04',7040014930,False,[-117,50.5], 'BC南東部の山地から米国北西部へ流れる越境河川です。クートネー川・スネーク川などの水を集め、太平洋に注ぎます。米国ページのコロンビア川と同じ水系で、ここでは国境の両側を含めています。'),
 ('nelson','ネルソン川水系','#c5d6bf','na04',7040022240,False,[-96,55.2], 'ロッキー山地からプレーリーを横断するサスカチュワン川や、南からのレッド川、南東からのウィニペグ川がウィニペグ湖に集まります。湖からネルソン川を通り、ハドソン湾へ流れます。穀物地帯を横断する支流と、その出口を一つの水系として追えます。'),
 ('st-lawrence','セントローレンス川','#dcc7db','na04',7040034520,False,[-79,46.5], '五大湖の集水域とオタワ川などの支流から水が集まり、セントローレンス川を通じて大西洋側へ流れます。オンタリオ南部・ケベック南部の農業地帯と、上流の湖・周囲の高地を結び付けて読むための流域です。'),
 ('saint-john','セントジョン川','#efc89e','na06',7060038320,False,[-67,46.8], '米国メーン州とカナダ東部の高地から、セントジョン川へ水が集まってファンディ湾へ流れます。ニューブランズウィックの河谷と農業を、国境を越えた集水域の中で確かめられます。'),
 ('saskatchewan','サスカチュワン川','#b5cbe1','na06',7060192420,True,[-107,52.5], 'ロッキー山地で生じた北・南サスカチュワン川がプレーリーを横断して合流し、シーダー湖を経てウィニペグ湖へ流れます。南部の灌漑農業では、地元の降水だけでなく山地から届く河川水が重要です。この流域はネルソン川水系の一部です。'),
]
features=[]; groups=[]; checks=[]
for id,name,color,key,outlet,upstream,anchor,description in definitions:
 rows=basin(key,outlet,upstream);assert rows
 geom=unary_union([make_valid(g) for r,g in rows]);assert geom.is_valid
 # Independent river-mouth/river-site spot checks were used to identify the outlet IDs.
 simple=geom.simplify(.008,preserve_topology=True);assert simple.is_valid
 props={'id':id,'group':id,'name':name,'outletHydrobasinId':outlet,'sourceIds':[int(r['HYBAS_ID']) for r,g in rows]}
 if id=='saskatchewan':props['parent']='nelson'
 features.append({'type':'Feature','properties':props,'geometry':mapping(simple)})
 groups.append({'id':id,'name':name,'sourceName':id,'color':color,'labelAnchor':anchor,'description':description,**({'parent':'nelson'} if id=='saskatchewan' else {})})
 checks.append({'id':id,'parts':len(rows),'valid':simple.is_valid,'sourceInvalidParts':sum(not g.is_valid for r,g in rows),'bounds':list(simple.bounds),'sourceAreaKm2':round(sum(r['SUB_AREA'] for r,g in rows),1)})
# A child is visibly inside its parent; preserve the parent outline separately.
parent=shape(next(f for f in features if f['properties']['id']=='nelson')['geometry']);child=shape(features[-1]['geometry']);assert child.difference(parent.buffer(.02)).area < .1
geo={'type':'FeatureCollection','features':features};(out/'river-basins.geojson').write_text(json.dumps(geo,separators=(',',':')))
configPath=root/'src/data/atlas/canada/water-resources.json';config=json.loads(configPath.read_text())
config['datasets']['drainage']={'title':'山地から河川・湖・海へ、水の集まる範囲','groups':groups,'groupProperty':'group','geometryUrl':'/assets/atlas/canada-water-v1/river-basins.geojson','scope':'主要6水系とサスカチュワン支流域。国境を越える範囲を含み、灰色は未選定の流域。','reading':'流域とは、一つの河川の出口へ雨や雪解け水が集まる範囲です。地形の分水界で区切り、川・湖と重ねて上流から下流を追います。','method':'HydroBASINS v1cのMAIN_BAS・NEXT_DOWNを使って上流の小流域を結合。沿岸の複数河川をまとめたCOAST区分と内陸閉鎖流域は含めず、原形に自己交差がある場合はmake_validで修復し、境界を0.008度で表示用に簡略化。修復件数は台帳へ記録。','note':'流域内のすべての土地で常時流出するという意味ではありません。取水・灌漑の給水区域、作物の栽培域、地下水の流動域とは区別します。','sources':[{'title':'HydroBASINS v1c — sub-basin topology','publisher':'HydroSHEDS / Lehner & Grill (2013)','url':'https://www.hydrosheds.org/products/hydrobasins','year':'v1c','accessed':'2026-10-05','licence':'HydroSHEDS Licence','licenceUrl':'https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v10.pdf','attribution':'HydroBASINS © HydroSHEDS. Lehner, B. and Grill, G. (2013), Hydrological Processes 27(15): 2171–2186.'}],'processingManifestUrl':'/insight-journal/assets/atlas/canada-water-v1/river-basins-manifest.json'}
configPath.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
manifest={'created':'2026-10-05','sources':provenance,'method':config['datasets']['drainage']['method'],'selectedFor':'Mountain headwaters, agricultural plains and settled river valleys; named river systems, not exhaustive statistical reporting regions.','resolution':'HydroSHEDS 15 arc-seconds south of 60°N; underlying northern elevation data are coarser (HYDRO1k).','checks':checks,'childWithinParent':True,'sha256':hashlib.sha256((out/'river-basins.geojson').read_bytes()).hexdigest()};(out/'river-basins-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(checks)
