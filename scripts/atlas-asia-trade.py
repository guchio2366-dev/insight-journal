"""Build small trade datasets from checksum-pinned UN Comtrade public extracts.
No network, mirror estimates, currency conversion or inference of missing zeros.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,math

p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'public/assets/atlas/asia-trade-v1';out.mkdir(parents=True,exist_ok=True)
regions={'east-asia':'CHN JPN KOR MNG PRK TWN'.split(),'southeast-asia':'BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM'.split(),'south-central-asia':'AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB'.split()}
expected={'downloads.json':'f267c9387b7dbc6816864fbb960854ee088c5b72d0633430642332de860b7b98','sector-downloads.json':'6426b56ea4bcb59dc6d8b295d049e6002ad1cb9efa98fdb0c827b5981df9281b','Reporters.json':'f2a1d78949089831c1fc7714e009996887db724a8d5a43379cdc37be9449f74b','partnerAreas.json':'2da5667693b5a7f8b203028964a431cdb46356d3a377c7369bb9736c59f03733','H6.json':'e266823e1299d1307c5d7986eb738b83aa5e5bd9af675bf19bf372220660be15'}
def read(file):return json.loads((a.cache/file).read_text(encoding='utf-8-sig'))
def checksum(file):return hashlib.sha256((a.cache/file).read_bytes()).hexdigest()
for file,h in expected.items():assert checksum(file)==h,file
downloads=read('downloads.json')+read('sector-downloads.json');raw={}
for r in downloads:
 assert checksum(r['file'])==r['sha256'],r['file']
 d=read(r['file']);assert d['count']==r['count']==len(d['data']) and r['count']<500,r['file'];raw[r['file']]=d['data']
assert len(downloads)==135 and sum(r['count'] for r in downloads)==17236<100000
reporters={r['id']:r for r in read('Reporters.json')['results']};partners={r['id']:r for r in read('partnerAreas.json')['results']}
codes=dict(zip('AFG BGD BTN BRN KHM CHN IND IDN JPN KAZ PRK KOR KGZ LAO MYS MDV MNG MMR NPL PAK PHL SGP LKA TWN TJK THA TLS TKM UZB VNM'.split(),[4,50,64,96,116,156,699,360,392,398,408,410,417,418,458,462,496,104,524,586,608,702,144,490,762,764,626,795,860,704]))
countries={};used_partners=set()
for code,num in codes.items():
 assert reporters[num]['reporterCodeIsoAlpha3']==('S19' if code=='TWN' else code)
 suffix='-reporter699' if code=='IND' else '';rows=raw[f'{code}-products-2023{suffix}.json']
 c={'reporterCode':num,'sourceName':reporters[num]['reporterDesc'],'classifications':sorted({r['classificationCode'] for r in rows}),'products':{},'partners':{},'topChapters':[]};countries[code]=c
 for r in rows:
  assert r['period']=='2023' and r['reporterCode']==num and r['partnerCode']==0 and r['flowCode'] in ['X','M']
  assert r['customsCode']=='C00' and r['motCode']==0 and r['partner2Code']==0 and r['typeCode']=='C' and r['freqCode']=='A'
  value=r['primaryValue'];assert value is None or math.isfinite(value) and value>=0
  v=c['products'].setdefault(r['cmdCode'],{});assert r['flowCode'] not in v;v[r['flowCode']]=value
 if rows:
  for flow in ['X','M']:
   total=c['products']['TOTAL'][flow];s=sum(v.get(flow) or 0 for k,v in c['products'].items() if len(k)==2)
   assert abs(total-s)<=max(1,total*1e-6),(code,flow,total,s)
  c['topChapters']=[k for k,v in sorted(c['products'].items(),key=lambda x:-(x[1].get('X') or 0)) if len(k)==2 and k not in ['98','99']][:3]
 for chapter in ['TOTAL']+c['topChapters']:
  file=f'{code}-partners-2023{suffix}.json' if chapter=='TOTAL' else f'{code}-partners-{chapter}-2023.json';pr=raw[file]
  if not pr:continue
  world=next(r['primaryValue'] for r in pr if r['partnerCode']==0)
  assert abs(world-c['products'][chapter]['X'])<=max(1,world*1e-6)
  values=[]
  for r in pr:
   assert r['cmdCode']==chapter and r['flowCode']=='X' and r['reporterCode']==num and r['period']=='2023'
   if partners[r['partnerCode']]['isGroup'] or r['partnerCode']==0:continue
   value=r['primaryValue'];assert value is not None and math.isfinite(value) and value>=0
   values.append([r['partnerCode'],value]);used_partners.add(r['partnerCode'])
  assert len({v[0] for v in values})==len(values)
  assert abs(sum(v[1] for v in values)-world)<=max(1,world*1e-6)
  c['partners'][chapter]={'world':world,'values':sorted(values,key=lambda v:-v[1])}
assert [c for c in sorted(countries) if not countries[c]['products']]==['AFG','BGD','NPL','PRK','TKM']

labels='動物（生きているもの）|肉・食用くず肉|魚・甲殻類など|酪農品・卵・天然はちみつなど|その他の動物性生産品|樹木・苗・切花など|野菜・根・いも類|果実・ナッツなど|コーヒー・茶・香辛料|穀物|製粉品・麦芽・でんぷんなど|採油用種子・飼料植物など|植物性エキス・樹脂など|植物性の組物材料など|動植物性・微生物性の油脂など|肉・魚などの調製品|糖類・砂糖菓子|カカオ・その調製品|穀粉・でんぷん・乳の調製品|野菜・果実などの調製品|その他の食用調製品|飲料・酒・食酢|食品工業の残留物・調製飼料|たばこ・ニコチン製品など|塩・土石類・セメントなど|鉱石・スラグ・灰|鉱物性燃料・鉱物油など|無機化学品・希土類等の化合物|有機化学品|医薬品|肥料|染料・顔料・塗料など|精油・香料・化粧品など|石けん・洗剤・ワックスなど|たんぱく系物質・でんぷん製品・酵素など|火薬・花火・マッチなど|写真用・映画用の材料|各種化学工業製品|プラスチック・その製品|ゴム・その製品|原皮・革|革製品・旅行用品など|毛皮・人造毛皮・その製品|木材・木材製品・木炭|コルク・その製品|わら・かご細工など|パルプ・回収した紙類|紙・板紙・その製品|印刷物・手稿など|絹|羊毛・獣毛など|綿|その他の植物性繊維・紙糸織物|人造繊維の長繊維|人造繊維の短繊維|詰め綿・フェルト・不織布など|じゅうたん・床用繊維製品|特殊織物・レース・刺しゅうなど|被覆・積層した織物など|メリヤス編物・クロセ編物|衣類（編んだもの）|衣類（編んだものを除く）|その他の繊維製品・中古衣類など|履物・その部分品|帽子・その部分品|傘・つえなど|調製羽毛・造花など|石・セメント・雲母などの製品|陶磁製品|ガラス・ガラス製品|貴金属・宝石・装身具など|鉄鋼|鉄鋼製品|銅・銅製品|ニッケル・その製品|アルミニウム・その製品|予約章（未使用）|鉛・鉛製品|亜鉛・亜鉛製品|すず・すず製品|その他の卑金属・サーメット|金属製の工具・刃物など|その他の卑金属製品|一般機械・原子炉・ボイラーなど|電気機器・録音録画機器など|鉄道車両・信号機器など|自動車などの車両・部分品|航空機・宇宙機器など|船舶・浮体構造物|光学・精密・医療機器など|時計・時計の部分品|楽器・その部分品|武器・弾薬など|家具・寝具・照明器具など|玩具・遊戯用具・運動用品|その他の雑品|美術品・収集品・骨とう|特別分類（98章）|特別分類・未分類品（99章）'.split('|')
assert len(labels)==99
chapters={f'{i:02}':labels[i-1] for i in range(1,100) if i not in [77,98]}
def write(file,data):
 b=(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode();(out/file).write_bytes(gzip.compress(b,mtime=0) if file.endswith('.gz') else b)
manifest={'version':1,'year':2023,'unit':'current USD','regions':{},'chapters':chapters,'missing':['AFG','BGD','NPL','PRK','TKM'],'source':'https://comtradeplus.un.org/','policy':'https://uncomtrade.org/docs/policy-on-use-and-re-dissemination/'}
for region,items in regions.items():
 selected={c:countries[c] for c in items};ids={v[0] for c in selected.values() for p in c['partners'].values() for v in p['values']}
 names={str(k):{'name':partners[k]['PartnerDesc'],'iso2':partners[k].get('PartnerCodeIsoAlpha2',''),'iso3':partners[k].get('PartnerCodeIsoAlpha3','')} for k in sorted(ids)}
 file=region+'.json.gz';write(file,{'countries':selected,'partners':names})
 manifest['regions'][region]={'file':file,'countries':items,'covered':sum(bool(c['products']) for c in selected.values())}
write('manifest.json',manifest)
write('provenance.json',{'retrieved':'2026-09-27','year':2023,'records':sum(r['count'] for r in downloads),'referenceChecksums':expected,'reporters':codes,'queries':downloads,'note':'Public preview extractions; each count is below 500. Total and chapter partner sums are checked against World. Values absent from the response remain missing, not inferred zero. UN Comtrade aggregates are included; no mirror substitution.'})
print(json.dumps({r:manifest['regions'][r] for r in regions},ensure_ascii=False));print('gzip bytes',sum(f.stat().st_size for f in out.glob('*.gz')))
