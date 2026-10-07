import {getOverviewRegion, type OverviewRegionId} from './country-overview';
import {asiaPlaceReadings} from './asia-place-readings';
import {asiaPhysicalFocus} from './asia-physical-reading';
import {asiaClimateCities} from './asia-climate-cities';
import {asiaFocusFieldReadings} from './asia-focus';
import farm from '../../../public/assets/atlas/asia-farming-v1/statistics.json';
import industry from '../../../public/assets/atlas/asia-industry-v1/national.json';
import population from '../../../public/assets/atlas/asia-population-v1/manifest.json';
import west from './west-asia.json';

export const asiaOverviewRegionIds = ['east-asia','southeast-asia','south-central-asia','south-asia','central-asia','west-asia'] as const;
export type AsiaOverviewRegionId = typeof asiaOverviewRegionIds[number];
export const asiaOverviewTopics = [{id:'nature',label:'自然環境'},{id:'agriculture',label:'農林業'},{id:'industry',label:'主要産業'},{id:'population',label:'人口・社会'},{id:'politics',label:'制度・国際協力'}] as const;
export type AsiaOverviewTopic = typeof asiaOverviewTopics[number]['id'];
export type OverviewSource = {label:string;url:string};
export type OverviewReading = {id:AsiaOverviewTopic;title:string;paragraphs:string[];sources:OverviewSource[]};
export type AsiaOverviewEntry = {code:string;name:string;takeaway:string;readings:OverviewReading[]};
const fao = {label:'FAOSTAT：既収録の国別農林業統計（2015–2024年）',url:'https://www.fao.org/faostat/en/#data/QCL'};
const wdi = {label:'世界銀行WDI：製造業の付加価値の定義',url:'https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NV.IND.MANF.ZS'};
const wdiServices = {label:'世界銀行WDI：サービス業の付加価値の定義',url:'https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NV.SRV.TOTL.ZS'};
const ghsl = {label:'欧州委員会JRC：GHS-POP R2023A（2020年人口）',url:'https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php'};
const ucdb = {label:'欧州委員会JRC：GHS-UCDB R2024A（2025年の都市範囲）',url:population.urbanSource};
const etopo = {label:'NOAA NCEI：ETOPO 2022全球標高モデル',url:'https://www.ncei.noaa.gov/products/etopo-global-relief-model'};
const centralSource = asiaFocusFieldReadings['central-asia'].natural.source;
const asean = {label:'ASEAN憲章：協力の目的と制度',url:'https://asean.org/wp-content/uploads/2021/08/November-2020-The-ASEAN-Charter-28th-Reprint.pdf'};
const saarc = {label:'SAARC憲章（1985年）：経済・社会・技術分野の協力',url:'https://www.saarc-sec.org/index.php/resources/agreements-conventions/46-saarc-charter-provisional-rules-of-procedure/file'};
const apt = {label:'ASEAN＋3協力計画（2018–2022年）',url:'https://aseanplusthree.asean.org/asean-plus-three-cooperation-work-plan-2018-2022/'};
const aquastat = {label:'FAO AQUASTAT：水利用・灌漑の定義',url:'https://www.fao.org/aquastat/en/overview/methodology/'};
const regional:Record<AsiaOverviewRegionId,{title:string;takeaway:string;readings:OverviewReading[]}> = {
 'east-asia':{title:'平野・内陸と、海を越える生産のつながり',takeaway:'東アジアの地域差は、気候や水に加え、灌漑・企業間の供給・研究と人材・市場への接続から読む。',readings:[
  {id:'nature',title:'沿岸・内陸・高原で季節が変わる',paragraphs:['チベット高原から中国東部の平野へ、日本列島や朝鮮半島の山地から沿岸へ、地形と気候を別々に比べます。都市の雨温図は観測所の平年値で、国全体の平均ではありません。'],sources:[{label:'気象庁：ClimatViewの観測所平年値',url:'https://www.data.jma.go.jp/gmd/cpd/monitor/climatview/frame.php'}]},
  {id:'agriculture',title:'米と小麦の分布を、水を使う時期につなぐ',paragraphs:['長江流域の米と華北の小麦、内陸の家畜を比べます。華北の冬小麦の試験事例では、生育期の雨を灌漑が補いました。灌漑とは、農地へ人工的に水を供給することです。'],sources:[asiaPlaceReadings.find(s=>s.id==='north-china-wheat')!.source]},
  {id:'industry',title:'愛知の部品企業、新竹の研究と人材',paragraphs:['愛知の完成車・部品・素材企業のつながり、新竹の大学や研究機関との連携は、資源や気候だけでは説明できない産業の背景です。国の輸出額と県の出荷額は、範囲も分類も違います。'],sources:asiaPlaceReadings.filter(s=>['aichi-vehicles','hsinchu-technology'].includes(s.id)).map(s=>s.source)},
  {id:'population',title:'人口の集中と、社会の構成を分ける',paragraphs:['中国東部の平野・沿海部、朝鮮半島、日本の都市周辺の人口と、乾燥した内陸や高原を比べます。2020年人口の格子推計は民族・国籍・宗教の分布を表しません。日本の2020年国籍統計も、外国人住民を分母にした構成と全人口中の割合を区別します。'],sources:[ghsl,{label:'日本の国勢調査（2020年）',url:'https://www.stat.go.jp/data/kokusei/2020/'}]},
  {id:'politics',title:'国境を越える生産には、協力の制度も関わる',paragraphs:['ASEAN＋3の2018–2022年協力計画は、貿易・投資だけでなく教育、科学技術、社会分野の協力も扱います。日本・中国・韓国と東南アジアを結ぶ枠組みの事例であり、東アジアの全ての国・地域を一つの政治制度にまとめるものではありません。'],sources:[apt]},
 ]},
 'southeast-asia':{title:'大河川の低地と島々を、加工・港・市場でつなぐ',takeaway:'東南アジアの農業と工業は、雨や低地だけでなく、季節の水管理、加工・物流、森林管理と協力の制度から読む。',readings:[
  {id:'nature',title:'一年中暖かくても、雨の季節は同じではない',paragraphs:['大陸部と島しょ部の観測所を比べ、雨の少ない季節と山地・低地の違いを見ます。メコン川・エーヤワディー川の下流の低地と、島々の山地を同じ標高尺度で確認できます。'],sources:[{label:'気象庁：ClimatView',url:'https://www.data.jma.go.jp/gmd/cpd/monitor/climatview/frame.php'}]},
  {id:'agriculture',title:'米の低地、油ヤシ・ゴムと森林の違い',paragraphs:['メコンデルタの稲作では淡水の確保と塩水侵入への対応が関わります。タイの養鶏では、飼料・食肉加工・販売を結ぶ仕組みが発達しました。樹木作物と森林は同じ土地利用区分ではありません。'],sources:asiaPlaceReadings.filter(s=>['mekong-rice','thailand-poultry'].i…2630 tokens truncated…子と島の陸地面積を区別して読みます。',NPL:'ネパールの北の高地から南の低地へ、短い距離の標高差を読みます。',
 KAZ:'カザフスタンの広い内陸と南東の山地を、寒暖の季節差と水系から比べます。',KGZ:'キルギスの天山山脈と山地の間の盆地・湖を、同じ標高尺度で読みます。',TJK:'タジキスタンのパミールの高地と西側の盆地を、河川の上流・下流から読みます。',TKM:'トルクメニスタンの乾燥した低地を、アムダリヤ川や灌漑の分布と別々に確かめます。',UZB:'ウズベキスタンの盆地や低地では、雨の量と川から水を届ける仕組みを分けて読みます。',
 CHN:'中国の西の高原・盆地と東の平野を、標高、川、雨の季節から比較します。',JPN:'日本の山地と沿岸の低地、南北の季節差を、都市の観測所と地形で比べます。',KOR:'韓国では朝鮮半島東部の山地と西側の低地、夏と冬の気候を比べます。',PRK:'朝鮮民主主義人民共和国の山地・低地と周辺の水系を、国の境界とは別に読みます。',MNG:'モンゴルの高原で、内陸の乾燥と冬の寒さを別々の条件として読みます。',TWN:'台湾の山地と西側の低地を、島内の高低差と雨の季節から比べます。',
 IDN:'インドネシアではジャワ・スマトラなどの島内の山地・低地と、雨の季節を比較します。',MYS:'マレーシアの半島部とボルネオ島側は離れた範囲です。山地・沿岸と森林・樹木作物を分けて読みます。',VNM:'ベトナムのメコンデルタと山地を、水の季節と低地の配置から読みます。',THA:'タイの河川平野とコラート高原を、標高と乾季・雨季から比べます。',MMR:'ミャンマーのエーヤワディー川下流の低地と上流側の山地を、流路と雨の季節から読みます。',PHL:'フィリピンのルソン島などでは、山地と平野を島ごとに比べます。海を陸続きの空白として扱いません。',LAO:'ラオスの山地とメコン川沿いの低地を、上流・下流の位置関係で読みます。',KHM:'カンボジアのメコン川とトンレサップ湖の位置を、周囲の低地と比べます。湖の参考輪郭は季節の水面変動ではありません。',BRN:'ブルネイの沿岸と内陸を、ボルネオ島の山地・低地の配置と合わせて読みます。',SGP:'シンガポールでは国の範囲と、資料が定めた都市中心部の範囲を区別します。',TLS:'東ティモールの島内の山地と沿岸を、縮尺を変えて確認します。',
 ARM:'アルメニアの山地・高原と盆地を、周辺国に続く地形から読みます。',AZE:'アゼルバイジャンのカスピ海沿岸の低地と山地を、水系とともに比べます。',BHR:'バーレーンの島の位置を、海岸や周辺国との距離から確認します。小島の広域格子は海を含みます。',CYP:'キプロスの山地と沿岸を、地中海の季節と合わせて読みます。境界線は領有権の判断ではありません。',GEO:'ジョージアの山地と黒海沿岸を、標高と雨の季節から比べます。',IRQ:'イラクの低地を、チグリス・ユーフラテス川の上流とつなげて読みます。',ISR:'イスラエルの地中海沿岸と内陸を、気候と水供給の異なる情報で読みます。',JOR:'ヨルダンの高地・低地と乾燥域を、河川・地下水の参考分布と比べます。',KWT:'クウェートの湾岸と乾燥した内陸を、水の供給設備とは別の自然条件として読みます。',LBN:'レバノンの地中海沿岸と山地を、標高と雨の季節から読みます。',OMN:'オマーンの山地・沿岸と内陸を、標高と気候の違いから比べます。',QAT:'カタールの半島と乾燥した気候を、水の供給設備とは別に読みます。',SAU:'サウジアラビアの広い乾燥域と西側の山地・沿岸を比較します。自然の水系と都市への供給は同じ情報ではありません。',PSE:'パレスチナの地図上の範囲と周辺の地形を確認します。境界線は法的地位や現在の通行・水利用を示しません。',SYR:'シリアの沿岸・内陸とユーフラテス川の位置を比べます。自然図は現在の災害・紛争や設備の稼働状況を示しません。',TUR:'トルコの山地・高原と沿岸を、河川と雨の季節から比べます。',ARE:'アラブ首長国連邦の湾岸と乾燥した内陸を、地形・水供給・都市の別々の情報で読みます。',YEM:'イエメンの山地・沿岸・内陸を、同じ標高尺度と気候図で比べます。',IRN:'イランの山地・高原と内陸の盆地を、水系と乾燥の分布から読みます。',EGY:'エジプトのナイル川沿いと周囲の乾燥域を、農業・人口と別々の図で比べます。',
};
const formatted=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:1});
function cropLines(code:string,isWest:boolean):string[] {
 const records=(isWest?west.agriculture: farm).countries[code as keyof typeof farm.countries]?.observations ?? [];
 const crops=isWest?[['15','小麦'],['577','ナツメヤシの実'],['260','オリーブ']]:[['27','米（籾米）'],['15','小麦']];
 return crops.flatMap(([item,label])=>{const r=records.filter(o=>o.domain==='Production_Crops_Livestock'&&o.item===item&&o.elementCode==='5510'&&o.value!==null).sort((a,b)=>b.year-a.year)[0];return r?[`${label}の国別生産量は${formatted(r.value!)} ${r.unit}（${r.year}年、FAOSTAT${r.flag==='A'?'公的報告値':'・'+(r.flag==='E'?'推計値':r.flag==='I'?'補完値':'原資料区分 '+r.flag)}）。`]:[];});
}
function industryLines(code:string,isWest:boolean):string[] {
 return [['manufacturing','NV.IND.MANF.ZS','製造業'],['services','NV.SRV.TOTL.ZS','サービス業']].flatMap(([id,wb,label])=>{
  const r=isWest?west.worldBank.indicators[wb as keyof typeof west.worldBank.indicators]?.filter(o=>o.code===code&&o.value!==null).sort((a,b)=>b.year-a.year)[0]:industry.indicators.find(i=>i.id===id)?.observations.filter(o=>o.countryCode===code&&o.value!==null).sort((a,b)=>b.year-a.year)[0];
  return r?[`${label}の付加価値はGDPの${formatted(r.value!)}％（${r.year}年、世界銀行WDI）。`]:[];
 });
}
export function getAsiaOverview(regionId:AsiaOverviewRegionId) {
 const region=getOverviewRegion(regionId),reading=regional[regionId],isWest=regionId==='west-asia';
 const base=regionId==='south-asia'||regionId==='central-asia'?'south-central-asia':regionId;
 const countries:AsiaOverviewEntry[]=region.countries.map(country=>{
  const stories=asiaPlaceReadings.filter(s=>s.country===country.code);
  const station=asiaClimateCities.find(c=>c.countryCode===country.code);
  const focus=asiaPhysicalFocus.find(f=>f.country===country.code);
  const urban=isWest?west.urban.cities.filter(c=>c.countryCode===country.code).map(c=>({name:c.name,population:c.history['2020']})):population.regions[base as keyof typeof population.regions]?.cities.filter(c=>c.country===country.code)??[];
  const largest=[...urban].sort((a,b)=>b.population-a.population)[0];
  const crops=cropLines(country.code,isWest),industries=industryLines(country.code,isWest);
  const agricultureStory=stories.find(s=>s.field==='agriculture'),industryStory=stories.find(s=>s.field==='industry');
  const nature=naturalNotes[country.code]??`${country.name}の山地・低地と周辺の水系を、気候・標高の地図で比べます。`;
  const countryReadings:OverviewReading[]=[
   {id:'nature',title:`${country.name}：自然条件を読む`,paragraphs:[nature,...(station?[`${station.name}の観測所（平年期間${station.normalPeriod}）では、${station.summary} ${station.reading}`]:focus?[focus.reading]:['気候区分と標高、水系は異なる情報です。国全体の色から季節の水量や現在の利用可能量を推定しません。'])],sources:[etopo,...(station?[{label:station.sourceName,url:station.sourceUrl}]:reading.readings[0].sources)]},
   {id:'agriculture',title:`${country.name}：生産と水・管理`,paragraphs:[...(country.code==='CHN'?['この農林業統計の中国は中国本土（FAOSTATのM49 156）です。「China」合計（M49 159）とは区別します。']:[]),...(crops.length?crops:['収録したFAOSTATの対象品目に有効な国別生産量がありません。欠測を0や他国の値で補っていません。']),...(agricultureStory?[agricultureStory.reading,agricultureStory.scope]:['地域内で比較する事例（選択国の地点値ではありません）：'+reading.readings.find(r=>r.id==='agriculture')!.paragraphs[0]]),'国別の重量は国内の栽培場所や加工後の量を示しません。農地の分布、水を使う時期、集荷・加工・管理を分けて確かめます。'],sources:[fao,...(agricultureStory?[agricultureStory.source]:reading.readings.find(r=>r.id==='agriculture')!.sources)]},
   {id:'industry',title:`${country.name}：産業構成と市場`,paragraphs:[...(industries.length?industries:[industry.missingNotes[country.code as keyof typeof industry.missingNotes]??'収録WDIの製造業・サービス業の系列に有効な値がありません。欠測を0へ置き換えません。']),...(industryStory?[industryStory.reading,industryStory.scope]:['地域内で比較する事例（選択国の地点値ではありません）：'+reading.readings.find(r=>r.id==='industry')!.paragraphs[0]]),'付加価値は生産額から中間投入の費用を差し引いた額です。国のGDP比は、国内の工場の位置や都市の雇用、輸出比率ではありません。'],sources:[wdi,wdiServices,...(industryStory?[industryStory.source]:reading.readings.find(r=>r.id==='industry')!.sources)]},
   {id:'population',title:`${country.name}：都市と社会を読み分ける`,paragraphs:[largest?`収録した都市中心部の例：${largest.name}、2020年推計人口${formatted(Math.round(largest.population))}人（人数は四捨五入）。資料が定めた2025年の都市範囲に対応し、行政市や国全体の人口ではありません。`:'人口分布ページでは2020年の格子推計を読みます。この概要の都市一覧の収録がないことは、都市や人口がないことを意味しません。',country.code==='JPN'?'日本の2020年国勢調査では、外国人住民の国籍構成と全人口中の外国人の割合を分けて読みます。国籍は民族とは異なります。':country.code==='MYS'?'マレーシアの民族統計の分母は市民です。「その他のブミプトラ」は複数の集団をまとめた公表区分で、単一の民族ではありません。':country.code==='IND'?'インドの2011年国勢調査では、母語と宗教は別の設問です。州の最多区分が50％以上とは限らず、州内にも多様性があります。':'地域内で比較する事例（選択国の社会統計ではありません）：'+reading.readings.find(r=>r.id==='population')!.paragraphs[0],'人口密度、言語・民族・国籍、宗教はそれぞれ別の指標です。居住場所の色から文化や信仰、生活の仕方を断定しません。'],sources:[ghsl,ucdb,...reading.readings.find(r=>r.id==='population')!.sources.filter(s=>s.url!==ghsl.url)]},
   {id:'politics',title:`${country.name}：利用を支える制度と国際協力`,paragraphs:[...(country.code==='NPL'?[asiaPlaceReadings.find(s=>s.id==='nepal-forest')!.reading,asiaPlaceReadings.find(s=>s.id==='nepal-forest')!.scope]:country.code==='IND'?[asiaPlaceReadings.find(s=>s.id==='anand-dairy')!.reading]:country.code==='UZB'?[asiaPlaceReadings.find(s=>s.id==='fergana-cotton')!.reading]:reading.readings.find(r=>r.id==='politics')!.paragraphs),`これは${country.name}の自然・生産を地域の制度や協力とつなげる読み方です。現在の政権・法令や協定の履行状況は、これらの分布図からは判断できません。`],sources:country.code==='NPL'?[asiaPlaceReadings.find(s=>s.id==='nepal-forest')!.source]:country.code==='IND'?[asiaPlaceReadings.find(s=>s.id==='anand-dairy')!.source]:country.code==='UZB'?[asiaPlaceReadings.find(s=>s.id==='fergana-cotton')!.source]:reading.readings.find(r=>r.id==='politics')!.sources},
  ];
  return {...country,takeaway:`${country.name}を、${station?`${station.name}の季節`:'地形と水'}・国別生産と産業構成・都市と制度の異なる尺度で読む。`,readings:countryReadings};
 });
 return {region,reading,countries};
}
