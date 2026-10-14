import argparse,json,hashlib,re
from pathlib import Path
repo=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description='Build the curated catalog from the pinned Natural Earth source; performs no network calls.')
parser.add_argument('--places',type=Path,required=True)
parser.add_argument('--regions',type=Path,help='Pinned Natural Earth admin1 input for the reviewed 2026-10-14 expansion')
args=parser.parse_args()
raw=args.places
assert hashlib.sha256(raw.read_bytes()).hexdigest()=='9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b', 'Unexpected Natural Earth input'
ne=json.loads(raw.read_text())['features']
sources=[]
def source(id,title,url,period='立地・操業案内、2026年10月12日閲覧'):
 sources.append(dict(id=id,title=title,url=url,period=period))
source('codelco','Codelco：チュキカマタ','https://www.codelco.com/division-chuquicamata','2025年の操業情報、2026年閲覧')
source('fcx','Freeport-McMoRan：南米の操業','https://www.fcx.com/operations/south-america')
source('sqm','SQM：チリの操業','https://sqm.com/en/acerca-de-sqm/informacion-corporativa/nuestras-faenas/')
source('sqm-chem','SQM：リチウム化合物','https://sqm.com/en/productos/litio-y-derivados/')
source('chile','USGS：チリ鉱業2024','https://www.usgs.gov/centers/national-minerals-information-center/chile','既存採用の2024年鉱業資料')
source('brazil','USGS：ブラジル鉱業2024','https://www.usgs.gov/centers/national-minerals-information-center/brazil','既存採用の2024年鉱業資料')
source('hydro-mine','Hydro：パラゴミナス','https://www.hydro.com/en/global/about-hydro/hydro-worldwide/americas/brazil/paragominas/')
source('albras','Hydro：Albrasのアルミ製錬','https://www.hydro.com/en/global/about-hydro/hydro-worldwide/americas/brazil/barcarena/albras/')
source('eia','EIA：ブラジルの石油・天然ガス地域','https://www.eia.gov/international/content/analysis/countries_long/Brazil/','2023年12月4日、資源立地の説明。現年の数量には使用しない')
source('vale','Vale：カラジャスとポンタダマデイラの物流','https://www.vale.com/pt/logistica')
source('petrobras','Petrobras：石油精製と各製油所','https://petrobras.com.br/en/quem-somos/refino')
source('itaipu','Itaipu Binacional：発電所','https://www.itaipu.gov.br/en')
source('steel','ArcelorMittal Brasil：操業拠点','https://brasil.arcelormittal.com/arcelormittal-brasil/quem-somos/operacoes')
source('toyota-current','Toyota：中南米の製造会社と製品','https://global.toyota/en/company/profile/facilities/manufacturing-worldwide/latin_america.html')
source('toyota-zarate','Toyota：サラテ工場の立地','https://global.toyota/en/detail/7887493','1997年の開所・立地資料。最新の製品は現行一覧で別確認')
source('saab','Saab：ブラジル製機の製造と試験','https://www.saab.com/newsroom/press-releases/2026/first-gripen-e-produced-in-brazil-makes-maiden-flight','2026年10月7日')
source('decea','DECEA AISWEB：SBGP飛行場基準位置','https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBGP','21°45′52″S / 48°24′17″W。施設境界ではない')
source('upm-paso','UPM：パソ・デ・ロス・トロス','https://www.upmpulp.com/pulp-production/paso-de-los-toros/','2023年稼働開始、現行操業案内')
source('upm-fray','UPM：フライ・ベントスの製造','https://www.upmpulp.com/pulp-production/fray-bentos/')
source('upm','UPM：パルプ製造拠点','https://www.upmpulp.com/pulp-production/')
source('medical','Boston Scientific：主要製造拠点','https://www.bostonscientific.com/en-US/about-us/locations.html')
source('b3','B3：証券市場とサンパウロ','https://borainvestir.b3.com.br/glossario/mercado/','2025年2月17日、B3公式の市場解説')
source('byma','BYMA：アルゼンチンの資本市場','https://www.byma.com.ar/')
source('digital','Porto Digital：レシフェとカルアル','https://portodigital.org/','現行拠点案内。カルアルは2025年の移転を記載')
source('panama','パナマ運河庁：運河と運営','https://pancanal.com/en/the-canals-fy-2024-financial-results-reaffirm-its-focus-on-sustainability-and-vision-for-the-future/','既存採用の2024会計年度資料')
source('jamaica','ジャマイカ観光局：モンテゴベイ','https://www.visitjamaica.com/resort-areas/montego-bay/')
source('cargill','Cargill Argentina：製品と加工・港湾拠点','https://www.cargillargentina.com.ar/')
source('dominican','ドミニカ共和国観光当局：ラ・ロマーナ','https://www.godominicanrepublic.com/destinations/la-romana')
industries=[]
def industry(id,label,color,sectors,overview,why,refs,manufacturing=None):
 industries.append(dict(id=id,label=label,color=color,sectors=sectors,labels={'resources':label,'manufacturing':manufacturing or label,'services':label},overview=overview,why=why,sources=refs))
R='resources';M='manufacturing';S='services'
industry('copper','銅','#97543b',[R,M],'チリ北部のチュキカマタ、ペルーのアレキパ南西のセロ・ベルデを区別します。セロ・ベルデには採掘・選鉱に加え、浸出と電解採取の設備があります。','鉱床の場所と、含有金属を取り出す工程を分けて読みます。銅は電線・電気機器等の材料になりますが、この図は個別需要家への納入を示しません。',['codelco','fcx'],manufacturing='銅の選鉱・電解採取')
industry('lithium','リチウム','#84639c',[R,M],'チリのアタカマ塩湖のかん水から原料を取り出し、アントファガスタ近郊のサラール・デル・カルメンで炭酸リチウム・水酸化リチウムに加工します。','塩湖の資源と化学処理設備は別の立地です。電池材料等になる化合物であり、塩湖そのものが電池工場ではありません。',['sqm','sqm-chem'],manufacturing='リチウム化学')
industry('iron','鉄鉱石','#906d36',[R],'ブラジル北部のカラジャスが代表的な採取地域です。南東部ミナスジェライスにも別の鉱山地域があります。','鉱石を掘る地域、鋼材を作る工場、物流の拠点を区別します。地図上の近さだけで特定の製鉄所への供給を確定していません。',['brazil'])
industry('bauxite','ボーキサイト','#ae7546',[R],'ブラジル北部パラゴミナスではボーキサイトを採掘します。Hydroはバルカレナでのアルミナ処理との関係を説明しています。','アルミニウムの原料鉱石、アルミナ、電解製錬後の金属は別の段階です。採取地域と加工地域を分けて読みます。',['hydro-mine'])
industry('aluminum','アルミ製錬','#667b87',[R,M],'ベレン南方のバルカレナにAlbrasの一次アルミ製錬があります。国内外向けの金属インゴットを製造します。','アルミナを金属にする電解製錬は大量の電力を必要とします。資源側では利用可能な金属になる場所、製造側では素材の生産を読みます。',['albras','hydro-mine'])
industry('oil-gas','石油・ガス','#776343',[R],'ブラジル大西洋沖のサントス盆地等と、沿岸・内陸の処理設備を区別します。沖合の点は既存資料の地域案内位置です。','海底の資源を取り出す場所と、燃料に加工する製油所の場所は異なります。個々の油田境界・採取量・パイプラインは未収録です。',['eia'])
industry('refining','石油精製','#ae7a30',[R,M],'パウリニアのREPLAN、ドゥケ・デ・カシアスのREDUC、サンジョゼ・ドス・カンポスのREVAPなどに精製設備があります。','資源側では原油が利用できる燃料になる場所、製造側では軽油・ガソリン・潤滑油等を作る工程を読みます。表示拠点間の輸送線は描いていません。',['petrobras'])
industry('hydro','水力発電','#367c9a',[R],'パラナ川のブラジル・パラグアイ国境にイタイプ発電所があります。両国の共同事業として電気を供給します。','河川の水と高低差を電力へ変える立地です。発電所の位置記号は発電量の円ではなく、供給網や流域境界も表していません。',['itaipu'])
industry('steel','製鉄・鋼材','#617069',[R,M],'ブラジルのツバロン等では鋼材を製造します。ArcelorMittalの平鋼拠点一覧にはツバロン、コンタジェン等を確認できます。','鉄鉱石の採取と鋼材の製造は別の段階です。自動車・建設等の用途につながりますが、特定鉱山との売買をこの図から確定しません。',['steel'])
industry('auto','自動車','#467661',[M],'アルゼンチンのサラテにToyotaの車両製造拠点があります。現行の中南米製造会社一覧でHilux、Fortuner/SW4、Hiaceを確認します。','部品・技能・組立設備と販売市場が必要な産業です。国内向けと輸出向けを扱う拠点で、点の大きさから生産台数は読みません。',['toyota-current','toyota-zarate'])
industry('aviation','航空機','#496b91',[M],'ブラジルのガビアン・ペイショトでSaabとEmbraerが機体を製造・試験します。2026年10月の操業者発表で現地の製造を確認しています。','機体・部品・設計と試験の専門技術が集まる立地です。座標はDECEAの飛行場基準位置で、個々の製造棟や供給圏ではありません。',['saab','decea'])
industry('pulp','パルプ','#79853b',[M],'ウルグアイのパソ・デ・ロス・トロスとフライ・ベントスにUPMのパルプ製造拠点があります。植林地と加工工場を区別して読みます。','木材を繊維材料へ加工する工程で、水・エネルギー・原料調達と物流が関わります。植林・伐採区域や特定の供給圏を推定して塗っていません。',['upm','upm-paso','upm-fray'])
industry('medical','医療機器','#518879',[M],'コスタリカのエレディア、コヨル／アラフエラ、カルタゴでBoston Scientificの主要製造拠点を確認できます。','自由貿易区や専門技能の集積と製造設備を読む例です。医療機器は治療・診断等に使う製品で、各点は全国輸出額や工場の数量ではありません。',['medical'])
industry('finance','金融・証券','#665593',[S],'サンパウロのB3、ブエノスアイレスのBYMAは資本市場を担う例です。サービスの専門機能を同じ産業色で読みます。','資金を必要とする企業と投資家をつなぐ市場・人材・情報が集まります。都市人口や取引量を点の大きさへ置き換えていません。',['b3','byma'])
industry('digital','IT・デジタル','#387f83',[S],'ブラジル北東部レシフェのPorto Digitalと、内陸カルアルの関連拠点を表示します。都市ごとの札ではなくデジタル産業の集積を読みます。','人材、創業支援、既存市街地の再利用と企業間の接点を作る取り組みです。表示範囲外の国に同様の産業がないという意味ではありません。',['digital'])
industry('logistics','港湾・物流','#776647',[S],'パナマ運河、ブラジルのサンルイス圏、アルゼンチンのバイアブランカ、ウルグアイのモンテビデオのパルプターミナルを立地例として読みます。','地峡や海港で人・貨物・輸送サービスが集まります。UPMの資料で確認できるパルプターミナルを含めますが、未確認の海上ルート・物流量は追加しません。',['panama','upm-paso','vale','cargill'])
industry('tourism','観光','#a16263',[S],'ジャマイカのモンテゴベイ、ドミニカ共和国のラ・ロマーナは観光当局が案内する拠点です。カリブ海の観光を複数の場所で読みます。','海岸の自然環境と宿泊・空港・観光サービスが結び付きます。海岸全体を観光業の分布面にせず、資料に対応する地域案内位置を示します。',['jamaica','dominican'])
industry('food','食品・油糧種子加工','#96814a',[M],'アルゼンチンのロサリオ圏にCargillのビジャ・ゴベルナドル・ガルベスとサンマルティンの加工拠点があります。企業の国内事業は穀物・油糧種子、植物油・たんぱく原料等を扱います。','農業の原料を製品・食品原料へ加工する場所です。会社全体の製品一覧を各工場の全製品や数量と同一視せず、資料の加工拠点一覧と対応させます。',['cargill'])
sites=[]
def city(name,country):
 f=next(x for x in ne if x['properties'].get('NAME')==name and x['properties'].get('ADM0NAME')==country)
 return f['geometry']['coordinates'],{'publisher':'Natural Earth','version':'5.1.2','neId':f['properties']['NE_ID'],'sourceName':name,'sourceCountry':country,'type':'locality-guide'}
def add(id,industry,place,cityname,country,stage,kind,sectors,refs,note,coords=None,provenance=None,meaning=None):
 if coords is None:coords,provenance=city(cityname,country)
 sites.append(dict(id=id,industry=industry,place=place,country=country,coordinates=coords,coordinateSource=provenance,coordinateMeaning=meaning or f'Natural Earthの{cityname}を地域案内位置として使用。施設の正確な座標・外形や産業区域ではありません。',stage=stage,stageKind=kind,sectors=sectors,sources=refs,note=note))
legacy=repo/'src/data/atlas/latin-america-economy.ts'
text=legacy.read_text()
def old(id):return [float(x) for x in re.search(r'location: \[([^]]+)\]',text[text.index("id: '"+id+"'"):]).group(1).split(',')],{'type':'retained-region-guide','path':'src/data/atlas/latin-america-economy.ts','id':id}
coords,prov=old('andean-copper');add('chuquicamata','copper','チュキカマタ周辺','Calama','Chile','採掘','extraction',[R],['codelco'], 'チリ北部の鉱山の例。Codelcoの操業案内と既存の鉱山地域案内位置を対応付けます。',coords,prov,'既存のチュキカマタ周辺の地域案内位置を保持。鉱山境界ではありません。')
add('cerro-verde','copper','アレキパ周辺・セロ・ベルデ','Arequipa','Peru','採掘・選鉱・電解採取','processing',[R,M],['fcx'],'操業者はアレキパの南西約20mileに鉱山・選鉱とSX/EW設備があると説明。案内点はアレキパで、鉱山そのものの正確な点ではありません。')
coords,prov=old('lithium-salars');add('atacama','lithium','アタカマ塩湖','', 'Chile','かん水採取','extraction',[R],['sqm','chile'],'資源を含むかん水を回収する地域。塩湖を電池工場として描いていません。',coords,prov,'既存のアタカマ塩湖の地域案内位置。採取区域や井戸位置ではありません。')
add('salar-carmen','lithium','アントファガスタ近郊・サラール・デル・カルメン','Antofagasta','Chile','リチウム化合物の製造','processing',[R,M],['sqm','sqm-chem'],'SQMはアントファガスタ近郊の化学工場で炭酸リチウム等を製造。案内点は市の位置で、工場はその東方です。')
coords,prov=old('brazil-iron');add('carajas','iron','カラジャス','', 'Brazil','鉄鉱石の採取','extraction',[R],['brazil'],'ブラジル北部パラー州の鉱山地域。既存資料の地域案内位置を保持します。',coords,prov,'既存のカラジャスの地域案内位置。採掘区画や鉱山設備の正確な点ではありません。')
add('minas-iron','iron','ミナスジェライスの鉱山地域','Belo Horizonte','Brazil','鉄鉱石の採取地域','extraction',[R],['brazil'],'州内の鉱山地域を読むための案内です。州都の点を個別鉱山とは扱いません。')
add('paragominas','bauxite','パラゴミナス周辺','Paragominas','Brazil','ボーキサイト採取','extraction',[R],['hydro-mine'],'Hydroの採掘事業。鉱山は市域中心から離れ、地域案内点であることを区別します。')
add('albras','aluminum','ベレン南方・バルカレナ','Belém','Brazil','一次アルミ製錬','processing',[R,M],['albras'],'Albrasの操業資料はバルカレナの金属インゴット製造を記載。ベレンを広域の案内位置に用い、ベレン市の工場点とは扱いません。')
coords,prov=old('atlantic-oil');add('santos-basin','oil-gas','ブラジル大西洋沖','', 'Brazil','石油・ガスの採取地域','extraction',[R],['eia'],'サントス盆地等の沖合資源を読む既存の代表位置。油田・井戸・採掘量の資料ではありません。',coords,prov,'既存の大西洋沖の地域案内位置を保持。油田・井戸の正確な点ではありません。')
for id,place,name,stage in [('replan','パウリニア（カンピーナス周辺）','Campinas','原油を燃料へ精製'),('reduc','ドゥケ・デ・カシアス','Duque de Caxias','燃料・潤滑油等の精製'),('revap','サンジョゼ・ドス・カンポス','São José dos Campos','原油を燃料へ精製')]:
 add(id,'refining',place,name,'Brazil',stage,'processing',[R,M],['petrobras'],'Petrobrasの製油所一覧と対応。案内点は所在市または周辺都市で、製油所敷地ではありません。')
coords,prov=old('hydropower');add('itaipu','hydro','イタイプ（ブラジル・パラグアイ国境）','', 'Brazil','水力発電','processing',[R],['itaipu'],'パラナ川の共同発電事業。点は発電量を表しません。',coords,prov,'既存のイタイプ周辺の地域案内位置。ダムの外形・流域ではありません。')
add('tubarao','steel','ヴィトーリア圏・ツバロン','Vitória','Brazil','鋼材の製造','processing',[R,M],['steel'],'ArcelorMittalの平鋼操業拠点一覧に掲載。案内点はヴィトーリアで、工場敷地ではありません。')
add('contagem','steel','ベロオリゾンテ圏・コンタジェン','Belo Horizonte','Brazil','鋼材の加工','processing',[R,M],['steel'],'操業拠点一覧のコンタジェンを近隣ベロオリゾンテから読む案内。施設座標は未収録です。')
add('zarate','auto','サラテ','Zárate','Argentina','車両の組立・製造','processing',[M],['toyota-current','toyota-zarate'],'Toyotaの工場立地資料と現行の中南米製造会社一覧を照合。生産台数をこの点に割り当てません。')
add('gaviao','aviation','ガビアン・ペイショト','', 'Brazil','機体の製造・試験','processing',[M],['saab','decea'],'Saabの2026年10月発表は現地の製造・試験を説明。飛行場基準位置を使用し、工場建物を推定していません。',[-(48+24/60+17/3600),-(21+45/60+52/3600)],{'type':'aerodrome-reference-point','publisher':'DECEA AISWEB','id':'SBGP','sourceDms':'21 45 52S/048 24 17W'},'DECEAのSBGP飛行場基準位置。工場建物の座標・境界ではありません。')
for id,name in [('paso','Paso de los Toros'),('fray','Fray Bentos')]:add(id,'pulp','パソ・デ・ロス・トロス' if id=='paso' else 'フライ・ベントス',name,'Uruguay','パルプ製造','processing',[M],['upm-paso' if id=='paso' else 'upm-fray'],'UPMの操業案内に対応する地域。原料を繊維へ加工する拠点で、植林区域の点ではありません。')
for id,name,jp in [('heredia','Heredia','エレディア'),('coyol','Alajuela','コヨル／アラフエラ'),('cartago','Cartago','カルタゴ')]:add(id,'medical',jp,name,'Costa Rica','医療機器の製造','processing',[M],['medical'],'Boston ScientificのPrincipal Manufacturing Facilities一覧に対応。都市の案内点と工場の正確な敷地を区別します。')
add('b3','finance','サンパウロ','São Paulo','Brazil','証券市場・金融情報','service',[S],['b3'],'B3の証券市場を読む案内位置。サンパウロの産業を金融だけに分類するものではありません。')
add('byma','finance','ブエノスアイレス','Buenos Aires','Argentina','証券市場・金融情報','service',[S],['byma'],'BYMAの市場機能を読む都市案内位置。人口・金融取引額の比例記号ではありません。')
for id,name,jp in [('recife','Recife','レシフェ'),('caruaru','Caruaru','カルアル')]:add(id,'digital',jp,name,'Brazil','デジタル産業の集積','service',[S],['digital'],'Porto Digitalの現行拠点案内に対応。複数企業・人材の集積例で、全域の雇用密度ではありません。')
coords,prov=old('panama-logistics');add('panama-canal','logistics','パナマ運河','', 'Panama','運河・海上物流','service',[S],['panama'],'大洋を結ぶ運河の既存地域案内位置。未確認の港間航路や貨物量を描きません。',coords,prov,'既存の運河の代表位置。港・閘門の正確な点ではありません。')
add('montevideo-pulp','logistics','モンテビデオ','Montevideo','Uruguay','パルプターミナル・港湾物流','service',[S],['upm-paso'],'UPMの工場資料は港のパルプターミナルを併記します。地図には輸送線・貨物量を加えていません。')
add('montego','tourism','モンテゴベイ','Montego Bay','Jamaica','観光サービス','service',[S],['jamaica'],'ジャマイカ観光局が案内する地域。宿泊施設の全位置や海岸全体の産業区域ではありません。')
add('la-romana','tourism','ラ・ロマーナ','La Romana','Dominican Republic','観光サービス','service',[S],['dominican'],'ドミニカ共和国観光当局が案内する地域。点は観光客数ではありません。')
for id,place in [('vgg','ロサリオ圏・ビジャ・ゴベルナドル・ガルベス'),('san-martin-food','ロサリオ圏・サンマルティン')]:add(id,'food',place,'Rosario','Argentina','農業原料の加工','processing',[M],['cargill'],'Cargill ArgentinaのProcessing Plant一覧に掲載。案内点はロサリオで、加工工場の正確な座標ではありません。企業全体の製品一覧をこの工場の全製品・数量と読み替えません。')
add('bahia-logistics','logistics','バイアブランカ','Bahía Blanca','Argentina','穀物・油糧種子の港湾物流','service',[S],['cargill'],'Cargill ArgentinaのBahía Blanca Portに対応する都市案内位置。個別の埠頭・貨物量・航路は表示しません。')
add('madeira-logistics','logistics','サンルイス圏・ポンタダマデイラ','São Luís','Brazil','鉄鉱石の港湾物流','service',[S],['vale'],'Valeの操業者資料で確認したカラジャス鉄道の港を読む都市案内位置。図の点を埠頭の正確な座標としては扱いません。')
sectors=[dict(id=R,label='資源・エネルギー',overview='アンデスの銅・リチウム、ブラジル北部の鉄鉱石・ボーキサイト、大西洋沖の石油・ガスを、処理・精製・製錬・発電の場所とともに読みます。',why='鉱床・塩湖・河川は採取や発電の立地を制約します。資源を利用できる状態にする加工設備は別の場所にも立地し、原料と製品の段階を分ける必要があります。'),dict(id=M,label='製造業',overview='ブラジルの素材・燃料・航空機、アルゼンチンの車両、ウルグアイのパルプ、コスタリカの医療機器など、何をどこで作るかを読みます。',why='原料だけでなく、専門技能・設備・電力・水・物流と市場が製造を支えます。資源側にも登場する精製・製錬は、ここでは作る製品と工程に注目します。'),dict(id=S,label='サービス業',overview='金融・証券、IT・デジタル、港湾・運河物流、カリブ海の観光の集積例を、同じ産業の複数の場所として読みます。',why='人材・情報・企業間の接点や、地峡・海港・観光地へのアクセスがサービスを支えます。都市を一つの産業に固定せず、機能ごとの立地を重ねて考えます。')]
result=dict(schemaVersion=1,reviewedAt='2026-10-12',geographicScope='既存中南米34国・地域。メキシコは別地域で含めない。主要例の選定であり全施設・全産業の網羅図ではない。',coordinateSource=dict(url='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson',publisher='Natural Earth',version='5.1.2',crs='EPSG:4326',license='Public domain',inputSha256=hashlib.sha256(raw.read_bytes()).hexdigest()),sectors=sectors,industries=industries,sites=sites,sources=sources,flows=[],nextCandidates=[{'industry':'食品加工の追加工場・加工品内訳','reason':'全国輸出統計や会社全体の製品一覧を各工場の製品・数量へ読み替えず、原資料照合が必要。'},{'industry':'石炭・金・ガイアナの石油・トリニダードのLNG','reason':'追加候補。今回の少数例を資源全体の網羅としない。'},{'industry':'自動車の追加拠点・電子機器・繊維','reason':'製品と稼働状況・立地の追加照合が必要。'},{'industry':'ITの他国拠点・教育研究・行政','reason':'人口・国のサービス比率から局所の集積を推定しない。'}])
if (repo/'data-source/atlas/latin-america/industry-expansion-20261014/evidence.json').exists():
 if not args.regions:parser.error('--regions is required for the current expanded catalog')
 from industry_expansion import apply_expansion
 result=apply_expansion(result,ne,args.regions)
 industries=result['industries'];sites=result['sites'];sectors=result['sectors']
out=repo/'src/data/atlas/latin-america/industry-sectors.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'industries':len(industries),'sites':len(sites),'sectors':{s['id']:sum(s['id'] in p['sectors'] for p in sites) for s in sectors}},ensure_ascii=False))
