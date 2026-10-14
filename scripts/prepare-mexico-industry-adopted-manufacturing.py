#!/usr/bin/env python3
"""Retain and reproduce Mexico's adopted manufacturing statistics (read-only INEGI API)."""
import argparse, datetime, hashlib, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas/mexico-industry-adopted'
DATA = ROOT / 'src/data/atlas/mexico/industry-adopted-manufacturing.json'
API = 'https://www.inegi.org.mx/app/tabulados/pxwebapi/api/datatable'
META = 'https://www.inegi.org.mx/app/tabulados/pxwebapi/api/tabulado?lang=es&file=CE2024%2FCE_GENNCE_1'
CE_UI = 'https://www.inegi.org.mx/app/tabulados/interactivos/?bd=CE2024&px=CE_GENNCE_1'
PRODUCTS = [
 ('automotive','完成車','automotive','3361','北部とバヒオの組立拠点を、部品供給と米国市場への近さから読む。','既存工場・部品企業・国境を越える輸送が重なる。','鋼板・電装・部品 → 完成車組立 → 国内販売・輸出'),
 ('auto-parts','自動車部品','automotive','3363','完成車と別に、コアウイラ・チワワ・グアナフアト等の部品生産を読む。','組立工場との工程分担、調達と輸送の条件が集積を支える。','素材 → 電装・変速機・座席・エンジン等の部品 → 組立・補修'),
 ('computers','コンピューター','electronics','3341','チワワとハリスコに集まるコンピューター・周辺機器の製造を読む。','米国市場への近さと電子部品・組立・技術者の集積が重なる。','電子部品・基板 → コンピューター・周辺機器 → 企業・消費者'),
 ('electronic-components','電子部品','electronics','3344','チワワ・ハリスコ・バハカリフォルニアの電子部品製造を読む。','電子機器や輸出組立との分業と、工程を担う人材が立地を支える。','材料 → 電子部品・基板等 → 電子機器への組込み'),
 ('communications','通信機器','electronics','3342','タマウリパス・チワワ等の通信機器製造を、アジアとの調達と北米向け販売に結ぶ。','国境への近さ、電子機器の分業、企業向け通信需要が重なる。','部品 → 電話・通信網機器 → 通信設備・端末の利用'),
 ('displays','音声・映像機器','electronics','3343','バハカリフォルニア等の音声・映像機器の生産集積を読む。','米国への輸送距離と部材・組立企業の集積が支える。','電子部品・表示部材 → テレビ・モニター等 → 企業・家庭'),
 ('refrigeration','空調・冷蔵冷凍設備','equipment','3334','ヌエボレオン・タマウリパス・コアウイラ等の工業・商業用設備製造を読む。','金属加工・部品企業、北米市場、工場・店舗の冷却需要が重なる。','圧縮機・金属・電装 → 空調・冷蔵冷凍設備 → 工場・店舗等'),
 ('home-appliances','家庭用電気器具','equipment','3352','家電の組立・部品集積を、北部の製造網と家庭の需要に結ぶ。','金属・電装部材と北米の販売市場へのアクセスが立地を支える。','部材 → 冷蔵庫・洗濯機等の家電 → 家庭での利用'),
 ('machinery','産業機械・設備','equipment','333','ヌエボレオン・コアウイラ・チワワ等の機械・設備製造を読む。','工業集積そのものが設備・保守・金型等の需要と技術の蓄積を生む。','素材・部品 → 機械・金型・ポンプ等 → 他産業の生産設備'),
 ('chemicals','基礎化学・樹脂等','materials','325','化学工業を、原料・エネルギーと各地の加工・消費市場に結ぶ。','原料供給、エネルギー、水、輸送と下流の製造需要を組み合わせて読む。','原料 → 基礎化学品・樹脂等 → 素材・加工製品'),
 ('pharmaceuticals','医薬品','precision','3254','医薬品製造を、原料・製剤・流通と国内医療需要に結ぶ。','製剤・品質管理を担う人材と大きな国内市場、医療の調達が立地を支える。','原薬・添加材 → 製剤・包装 → 医療機関・薬局'),
]

def write(path, data):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

def fetch():
 ASSETS.mkdir(parents=True, exist_ok=True)
 meta=json.load(urllib.request.urlopen(META,timeout=60))
 activity=next(v for v in meta['variables'] if v['code']=='Actividad económica')
 lookup={}
 for group in activity['aggs']:
  lookup.update((label.split(' ')[0], code) for code,label in zip(group['values'],group['valueTexts']))
 selection=[lookup[p[3]] for p in PRODUCTS]
 body={'query':{'query':[
  {'code':'Entidad federativa','selection':{'filter':'item','values':[str(n) for n in range(33)]}},
  {'code':'Actividad económica','selection':{'filter':'item','values':selection}},
  {'code':'Variables','selection':{'filter':'item','values':['2','18']}}], 'response':{'format':'json-stat'}},
  'lang':'es','file':'CE2024/CE_GENNCE_1','stub':['Entidad federativa','Actividad económica'],'heading':['Variables']}
 req=urllib.request.Request(API,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
 result=json.load(urllib.request.urlopen(req,timeout=90))
 write(ASSETS/'manufacturing-ce-metadata.json',meta)
 write(ASSETS/'manufacturing-ce-request.json',body)
 write(ASSETS/'manufacturing-ce-result.json',result)

def cell(raw):
 value=raw.split('||')[0]
 if value=='-':return None,'confidential'
 if value=='SD':return None,'unknown'
 n=float(value.replace(',',''))
 return n,'zero' if n==0 else 'available'

def indicator(label,value,unit,year,definition,source,denominator=None,note=None,status='observed'):
 d={'label':label,'value':value,'unit':unit,'year':year,'definition':definition,'sourceIds':[source],'status':status}
 if denominator:d['denominator']=denominator
 if note:d['note']=note
 return d

def generate():
 raw=json.loads((ASSETS/'manufacturing-ce-result.json').read_text())
 sources={'mx-manufact-ce':{'title':'INEGI 経済センサス2024・2023年の活動','url':CE_UI,'year':2023,'scope':'都市部の民間・国営企業等。雇用は就業者、VACBはセンサス付加価値でGDPではない。SDは欠測扱い、-は秘匿。'},
  'mx-manufact-oica':{'title':'OICA 2025年の車種別・国別生産','url':'https://oica.net/wp-content/uploads/2025/11/prod-total-2025.pdf','year':2025,'scope':'全車種の国別集計。国による対象範囲の差があり、集計世界は報告値の合計。'},
  'mx-manufact-ina':{'title':'INA 自動車部品産業の2025年実績','url':'https://ina.com.mx/','year':2025,'scope':'部品生産価額と米国の部品輸入に占めるメキシコ比。メキシコの輸出先構成とは別。'},
  'mx-manufact-vaemg':{'title':'INEGI VAEMG 2024','url':'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/pibval/VAEMG2024_RR.pdf','year':2024,'scope':'グローバル製造の国内内容。生産者の付加価値と国内投入材等を含む。GDP・企業利益ではない。'}}
 urls={
  'pc':'data-processing-machines-and-data-processing-units-not-elsewhere-specified-or-included-elsewhere',
  'communications':'telephones-including-mobile-phones-and-those-of-other-wireless-networks',
  'displays':'monitors-and-projectors-not-incorporating-television-reception-apparatus',
  'refrigeration':'refrigerators-freezers-and-other-refrigerating-or-freezing-equipment',
  'pharma':'medicaments-consisting-of-mixed-or-unmixed-products-preparations-for-therapeutic-or-prophylactic-uses'}
 for key,slug in urls.items():
  sources['mx-manufact-trade-'+key]={'title':'経済省 Data México・'+key,'url':'https://www.economia.gob.mx/datamexico/en/profile/product/'+slug,'year':'2024年（世界比較の参考系列は2022年）','scope':'メキシコのHS2012貿易価額。製造業SCIAN分類と一致しない。輸入は同製品の輸入で、工場の部材投入割合ではない。'}
 industries=[]
 # PXWeb returns its canonical activity order, not the request's selection order.
 activity_labels=next(stub['label'] for stub in raw['stub'] if stub['code']=='Actividad económica')
 activity_index={label.split(' ')[0]:n for n,label in enumerate(activity_labels)}
 for id,label,family,scian,overview,why,process in PRODUCTS:
  j=activity_index[scian]
  employment,_=cell(raw['data'][j*2]);vacb,_=cell(raw['data'][j*2+1])
  values=[]
  for state in range(1,33):
   value,status=cell(raw['data'][(state*len(PRODUCTS)+j)*2])
   values.append({'state':f'{state:02}','value':value,'status':status})
  top=sorted((v for v in values if v['status']=='available'),key=lambda v:v['value'],reverse=True)[:3]
  definition=f'SCIAN {scian}。2023年のCE対象企業の就業者。全国合計と州別値は同一分類・同年。秘匿を0にしない。'
  scope=f'SCIAN {scian}の製造業分類。HS製品貿易との範囲差を明示し、工場・企業の売上や生産数量へ換算しません。'
  if id=='electronic-components':scope+='半導体だけの値でも、ウェハ前工程の製造能力でもありません。'
  if id=='refrigeration':scope+='空調・暖房・工業商業用冷凍等を含み、冷蔵庫単独ではありません。'
  if id=='home-appliances':scope+='各家電の製造数量を合計した値ではありません。'
  domestic=[indicator('製造就業者',employment,'人',2023,definition,'mx-manufact-ce',{'label':'CE製造業の就業者','value':7190294,'unit':'人'}),indicator('センサス付加価値',vacb,'百万ペソ',2023,f'SCIAN {scian}のVACB。全国GDPの内訳ではありません。','mx-manufact-ce',{'label':'CE製造業のVACB','value':5390947.292,'unit':'百万ペソ'})]
  world=[];trade=[]
  if id=='automotive':world.append(indicator('全車種の生産',4092448,'台',2025,'OICAのメキシコ全車種生産。集計世界との比率。','mx-manufact-oica',{'label':'OICA集計世界の全車種生産','value':96383650,'unit':'台'}))
  if id=='auto-parts':
   world.append(indicator('部品生産価額',119000,'百万USD',2025,'INAによるメキシコの部品生産価額。企業売上ではない。','mx-manufact-ina'))
   trade.append(indicator('米国部品輸入のメキシコ比',43.74,'%',2025,'分母は米国の自動車部品輸入価額。メキシコの輸出先比率ではない。','mx-manufact-ina'))
  trade_specs={'computers':('pc','HS8471',34900,31500,13400),'communications':('communications','HS8517',14900,11600,17400),'displays':('displays','HS8528',11800,10400,1670),'refrigeration':('refrigeration','HS8418',6560,5990,1700),'pharmaceuticals':('pharma','HS3004',2220,999,5260)}
  if id in trade_specs:
   key,hs,exports,us,imports=trade_specs[id];src='mx-manufact-trade-'+key
   trade=[indicator('製品輸出価額',exports,'百万USD',2024,f'{hs}の総輸出。表示資料の丸め値。SCIAN {scian}全体の輸出・生産ではない。',src),indicator('米国向け輸出',us,'百万USD',2024,f'{hs}の米国向け輸出。丸め値からの割合は概数。',src,{'label':f'{hs}の製品輸出価額','value':exports,'unit':'百万USD'}),indicator('製品輸入価額',imports,'百万USD',2024,f'{hs}の総輸入。同じ製品の輸入で、投入部材の調達比ではない。',src)]
  if id=='computers':
   trade.append(indicator('中国原産の製品輸入',3920,'百万USD',2024,'HS8471輸入。同製品の輸入原産国で、国内工場の部品投入ではない。','mx-manufact-trade-pc',{'label':'HS8471製品輸入価額','value':13400,'unit':'百万USD'}))
   trade.append(indicator('タイ原産の製品輸入',3460,'百万USD',2024,'HS8471輸入。','mx-manufact-trade-pc',{'label':'HS8471製品輸入価額','value':13400,'unit':'百万USD'}))
  if id=='communications':trade.append(indicator('中国原産の製品輸入',9440,'百万USD',2024,'HS8517輸入。通信網機器と端末を含む。','mx-manufact-trade-communications',{'label':'HS8517製品輸入価額','value':17400,'unit':'百万USD'}))
  vaemg={'automotive':980647,'auto-parts':677363,'computers':138403,'electronic-components':120774,'displays':130082,'refrigeration':63121}
  if id in vaemg:domestic.append(indicator('グローバル製造の国内内容',vaemg[id],'百万ペソ',2024,f'SCIAN {scian}のVAEMG。国内投入材等を含み、GDP・企業利益ではない。','mx-manufact-vaemg',{'label':'全業種のVAEMG','value':3648915,'unit':'百万ペソ'}))
  if not world:world=[indicator('同じ製品段階の世界生産',None,'未確認',2025,'完成品・部品・工程を揃えた世界生産分母は未確認。輸出価額を世界生産量へ置き換えない。','mx-manufact-ce',status='unconfirmed')]
  if not trade:trade=[indicator('同じ製品範囲の輸出・国内仕向け',None,'未確認','未確認',f'SCIAN {scian}とHS製品の対応・国内生産品の国内仕向けは未確認。','mx-manufact-ce',status='unconfirmed')]
  industries.append({'id':id,'label':label,'family':family,'sectors':['manufacturing'],'overview':overview,'why':why,'process':process,'boundary':scope,'map':{'kind':'employment','year':2023,'unit':'人','definition':definition,'sourceIds':['mx-manufact-ce'],'nationalTotal':employment,'values':values,'regions':[{'state':v['state'],'stage':'製造・加工','note':f'SCIAN {scian}の公開就業者が多い州の例。工場敷地を表す点ではありません。','sourceIds':['mx-manufact-ce']} for v in top]},'statistics':{'domestic':domestic,'world':world,'trade':trade}})
 write(DATA,{'sources':sources,'industries':industries})
 files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in ASSETS.glob('manufacturing-ce-*.json')}
 write(ASSETS/'manufacturing-provenance.json',{'accessed':'2026-10-14','api':API,'metadataApi':META,'method':'Read-only POST query; 33 geographies × 11 SCIAN industries × employment and VACB. Saved result only for regeneration.','license':'https://www.inegi.org.mx/inegi/terminos.html','files':files,'classificationBoundary':'CE reference2023, urban private/paraestatal coverage. Not national GDP. HS product trade and VAEMG have separate definitions and years.'})
 print(f'{len(industries)} industries; {len(values)} state cells each; {DATA}')

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--fetch',action='store_true');args=parser.parse_args()
 if args.fetch:fetch()
 generate()
