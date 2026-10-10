import {climateAxes} from './atlas-climate-axes';
import data from '../data/atlas/latin-america/nature.json';
import {latinCountries,latinWidth,latinHeight,projectLatin,latinMapLayout} from './atlas-latin-america-geometry';
import {withBase} from './urls';
import {classifyLatinStation,latinStationClimateMethod} from './atlas-latin-station-climate';
import {latinAgricultureReading} from '../data/atlas/latin-america/agriculture-reading';

export interface LatinNatureMapState {layer:string;place:string;scope:string;only:boolean;case?:string;cityScale?:number;interactiveCities?:boolean}
export const latinNatureData=data;
export const latinNatureLayers=['climate'];
export const escapeNatureHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const esc=escapeNatureHtml;
export const latinNatureCases=[
 {id:'overview',name:'中南米全体',place:'all',scope:'all',city:'san-jose',crop:'all',title:'中南米全体の気候と農業',takeaway:'中米・カリブから南米まで、熱帯・乾燥帯・温帯・寒帯の分布を見渡します。緯度に加えて標高や雨の季節が作物・牧畜・水供給に関わります。雨温図はサンホセの観測所1点の例で、中南米全体の平均ではありません。',compare:'気候群と農畜産・人口の分布を同じ範囲で比べます。地域の代表例を選ぶと、その観測所と出典を確認できます。',sources:[{name:'気候分類：Beck et al. (2023)、1991–2020年',url:'https://www.gloh2o.org/koppen/'},{name:'気象庁ClimatView：月別平年値の説明',url:'https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/outline.html'}]},
 {id:'central',name:'中米の高地とコーヒー',place:'CRI',scope:'central',city:'san-jose',crop:'coff',title:'熱帯の高地がコーヒーを育てる',takeaway:'コスタリカの中央盆地では、熱帯でも標高によって気温が下がり、火山性の土壌と雨がコーヒー栽培を支えます。高地の産地から加工・輸出へつながり、土地や水の管理が品質を支えます。',compare:'気候群と2020年のコーヒー収穫面積を並べ、熱帯の中で高地に産地があることを確かめます。標高は観測所の値、作物は5分格子の推計です。',sources:[{name:'ICAFE：中央盆地のコーヒー産地・標高と火山性土壌',url:'https://www.icafe.cr/nuestro-cafe/regiones-cafetaleras/valle-central/'}]},
 {id:'cerrado',name:'ブラジルの雨季・乾季',place:'BRA',scope:'south',city:'brasilia',crop:'soyb',title:'雨季と土壌改良が大豆産地を支える',takeaway:'ブラジル中央部のセラードには雨季と乾季があり、酸性で養分が少ない土壌を改良して大豆を育てます。収穫物は飼料・油の市場と港へ運ばれ、農地の拡大は植生や水の管理にも影響します。',compare:'気候群と2020年の大豆収穫面積を比べます。雨季・乾季はブラジリアの月別平年値で読み、気候群だけから作物の分布を決めつけません。',sources:[{name:'Embrapa：大豆栽培の土壌改良と施肥',url:'https://www.embrapa.br/en/busca-de-publicacoes/-/publicacao/551684/correcao-do-solo-e-adubacao-da-cultura-da-soja'},{name:'FAO：セラードの自然条件と農業（2001年）',url:'https://www.fao.org/4/y1860e/y1860e09.htm'}]},
 {id:'caribbean',name:'カリブの季節と暮らし',place:'CUB',scope:'central',city:'havana',crop:'bana',title:'雨の季節が農業と水供給につながる',takeaway:'ハバナでは一年を通して暖かく、雨の多い季節と少ない季節が現れます。カリブの熱帯条件は作物や観光に関わり、季節の雨と暴風への備えが水供給・交通・滞在を支えます。',compare:'カリブと中米の熱帯の広がりを見てから、バナナの収穫面積と比べます。ハバナの観測値はキューバの一地点で、島全体や他の島の値ではありません。',sources:[{name:'NOAA：貿易風の仕組み',url:'https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/what-are-trade-winds'},{name:'気象庁：ハバナの月別平年値',url:'https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=78325&y=2025&m=12&e=6&r=5&s=1&k=0'}]},
 {id:'amazon',name:'アマゾンの雨と河川',place:'BRA',scope:'south',city:'manaus',crop:'bana',title:'熱帯の雨と河川が暮らしをつなぐ',takeaway:'アマゾンでは熱帯の雨が河川と森林を支え、河川交通が集落や市場をつなぎます。雨が減って水位が下がると船の移動や物資の供給に影響し、自然条件が暮らしの経路として現れます。',compare:'マナウスの雨の季節と、ブラジルに広がる熱帯・温帯・乾燥帯を読みます。都市人口との比較では国全体の人口と広い自然条件を分けて捉えます。',sources:[{name:'NASA：アマゾンの季節的な変化',url:'https://science.nasa.gov/earth/earth-observatory/the-amazons-seasonal-secret/'},{name:'NASA：2023年のアマゾン干ばつ',url:'https://science.nasa.gov/photojournal/amazon-drought/'}]},
 {id:'andes',name:'アンデスの高地',place:'BOL',scope:'south',city:'la-paz',crop:'coff',title:'緯度に加えて標高が気温を変える',takeaway:'アンデスの高地では、低緯度でも標高が高いため気温が低くなります。山地の地形は作物の選択や都市の立地、道路の経路に関わり、鉱山・農村・市場を結ぶ交通に条件を与えます。',compare:'寒帯や温帯が山地に現れる気候群と、ラパス周辺エルアルト観測所の標高・月別気温を確かめます。気候群は標高そのものを表す地図ではありません。',sources:[{name:'NASA：アンデスの地形',url:'https://science.nasa.gov/earth/earth-observatory/looking-down-on-the-andes-151670/'},{name:'USGS：アンデスのプレート境界',url:'https://www.usgs.gov/publications/seismicity-earth-1900-2013-seismotectonics-south-america-nazca-plate-region'}]},
 {id:'panama',name:'パナマの雨と物流',place:'PAN',scope:'central',city:'',crop:'bana',title:'流域の雨が世界の物流を支える',takeaway:'パナマ運河は流域の雨を湖に蓄え、淡水を使う閘門で船を通します。太平洋と大西洋の市場を結ぶ物流が貯水に支えられ、干ばつ時には生活用水と通航のため節水・通航調整が必要になります。',compare:'元の気候群分布と、雨→貯水→閘門→通航の専用図を並べます。1991–2020年の気候と2024会計年度の活動を区別して読みます。',sources:[{name:'パナマ運河庁：流域の水と生活・運河',url:'https://pancanal.com/agua/'},{name:'パナマ運河庁：水と通航の調整（2023年）',url:'https://pancanal.com/en/how-the-panama-canal-is-addressing-the-issue-of-water-head-on/'}]},
 {id:'pampas',name:'パンパの草地と牧畜',place:'ARG',scope:'south',city:'buenos-aires',crop:'cattle',title:'温帯の草地が穀物と牧畜につながる',takeaway:'アルゼンチンのパンパでは、温帯の草地を利用する牛の飼育と穀物栽培が広がります。牧草と耕地の利用を組み合わせ、肉や穀物を都市・輸出市場へ送り、土壌の肥沃さと草地の管理が生産を支えます。',compare:'温帯の広がりと2020年の牛の密度を並べ、草地利用と牧畜の分布を考えます。気候群は草地面積、牛の密度は牛肉生産量を表していません。',sources:[{name:'FAO：パンパの草地・耕地・牧畜（2005年、地域背景）',url:'https://www.fao.org/4/y8344e/y8344e0i.htm'}]},
];
const seasonSource={name:'NASA：地軸の傾きと南北半球の季節',url:'https://spaceplace.nasa.gov/seasons/en/'};
const windSource={name:'NOAA：熱帯の暖かさ、水蒸気と貿易風',url:'https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/what-are-trade-winds'};
const westCoastSource={name:'NASA：南米西岸の冷たい海水と低い雲',url:'https://eol.jsc.nasa.gov/Collections/EarthObservatory/articles/SouthAmericasWestCoastWonders.htm'};
/** Retained observed patterns, complemented below by sourced geographic context. */
const cityReadings:Record<string,{climate:string;reason:string;source:{name:string;url:string}}>={
 'havana':{climate:'年間を通じて暖かく、夏を中心に雨が増える観測所です。',reason:'低緯度では日射が強く、暖かい海からの水蒸気と熱帯の風が雲・雨に関わります。雨の量は島や観測所ごとに異なります。',source:windSource},
 'kingston':{climate:'年間を通じて高温で、秋の降水量が多く、冬には少なくなります。',reason:'低緯度の暖かさと、海から運ばれる水蒸気を分けて読みます。カリブの貿易風は雲を運びますが、ハバナと同じ雨の季節とは限りません。',source:windSource},
 'belize':{climate:'年間を通じて暖かく、秋の雨が多い一方、春には少なくなります。',reason:'低緯度の海沿いでは暖かい海から水蒸気が供給されます。熱帯の風と雨の季節性を、気温の小さな年変化とは別に読みます。',source:windSource},
 'san-jose':{climate:'熱帯の高地にあるため、低地の熱帯都市ほど暑くなく、雨季・乾季が明瞭です。',reason:'低緯度でも標高が上がると気温が下がります。高地の気温と季節の雨は、コーヒーなどの生育条件を読む手掛かりです。',source:latinNatureCases.find(c=>c.id==='central')!.sources[0]},
 'manaus':{climate:'赤道に近い熱帯の観測所で、気温の年変化が小さく、年間を通して降水があります。',reason:'強い日射に加え、アマゾンでは森林の蒸発散も水蒸気を大気へ戻します。森林が緑でも雨量が毎月同じになるわけではありません。',source:latinNatureCases.find(c=>c.id==='amazon')!.sources[0]},
 'brasilia':{climate:'ブラジル中央高原では、雨の多い夏と少雨の冬が明瞭に分かれます。',reason:'熱帯でも高原の標高が気温に関わり、季節の雨は作物の生育期と水管理を左右します。年雨量だけで乾季の利用可能な水は決まりません。',source:latinNatureCases.find(c=>c.id==='cerrado')!.sources[1]},
 'sao-paulo':{climate:'南半球の夏は温暖で雨が多く、冬は気温・雨量とも下がる観測所です。',reason:'南半球の季節は日本と逆です。高原にある都市の気温を、低地のマナウスや沿岸のレシフェと同じものとして扱いません。',source:seasonSource},
 'recife':{climate:'低緯度の沿岸で年間を通して高温ですが、降水量は南半球の秋から冬に多くなります。',reason:'熱帯の暖かい海は水蒸気の供給源です。雨の多い季節はブラジリアと異なるため、同じ熱帯の国でも各観測所の月別値で確かめます。',source:windSource},
 'lima':{climate:'太平洋岸の少雨の観測所です。気温には南半球の季節変化がありますが、降水量は各月ともごく少量です。',reason:'南米西岸では冷たい海流と湧昇に伴う低い雲が見られます。雲・霧があることと、雨温図に記録される雨が多いことを区別します。',source:westCoastSource},
 'bogota':{climate:'低緯度でも標高の高い観測所では年間を通して冷涼で、春と秋に雨が多くなります。',reason:'気温は緯度だけでなく標高にも左右されます。高地のボゴタと、同じ低緯度にある沿岸・低地の都市を分けて比較します。',source:latinNatureCases.find(c=>c.id==='andes')!.sources[0]},
 'buenos-aires':{climate:'南半球の夏に暑く冬に冷涼な温帯の観測所で、年間を通して降水があります。',reason:'南半球では日射の季節が日本と逆になり、夏は主に12～2月、冬は6～8月です。暖かい月と雨の多い月をそれぞれ読みます。',source:seasonSource},
 'santiago':{climate:'南半球の夏が乾燥し、冬に雨が多い地中海性の季節パターンが見られます。',reason:'地中海性という名称は夏乾燥・冬雨の型を表します。日本と逆の季節で読み、冬の雨と夏の農業用水を分けて考えます。',source:{name:'チリ気象局：チリ中部の気候特性',url:'https://climatologia.meteochile.gob.cl/application/publicaciones/documentoPdf/climaticoAeronautico/climaticoAeronautico202106001.pdf'}},
 'la-paz':{climate:'エルアルトの高地観測所では年間を通して気温が低く、南半球の夏に雨が多くなります。',reason:'低緯度でも高い標高による気温低下が現れます。ラパス市全域の平均ではなく、標高4,058mのエルアルト1地点の値です。',source:latinNatureCases.find(c=>c.id==='andes')!.sources[0]},
 'quito-izobamba':{climate:'赤道に近くても高地では冷涼で、気温の年変化が小さい観測所です。',reason:'赤道に近い緯度と高い標高を合わせて読みます。低緯度の強い日射だけで暑さを判断せず、郊外のイソバンバの観測値を確かめます。',source:latinNatureCases.find(c=>c.id==='andes')!.sources[0]},
 'punta-arenas':{climate:'南米南端に近く、夏でも涼しく、冬の気温はさらに下がる観測所です。',reason:'南半球の高緯度では冬の日射条件が低緯度と異なります。暖かい季節は日本と逆で、同じチリでもサンティアゴとは気温・雨量が大きく違います。',source:seasonSource},
 'montevideo':{climate:'南半球の夏に温暖、冬に冷涼で、雨は年間を通して観測されています。',reason:'南半球では地軸の傾きによる日射の季節が日本と逆です。ラプラタ河口近くのこの地点の値を、ウルグアイ全域の平均に置き換えません。',source:seasonSource},
};
const farmingSource={name:'FAO：中南米の農業地域と自然条件（2001年・地域背景）',url:'https://www.fao.org/4/y1860e/y1860e09.htm'};
const bananaSource={name:'FAO Ecocrop：バナナの栽培条件',url:'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=7848'};
const cityGeography:Record<string,{reason:string;agriculture:string;agricultureSource:{name:string;url:string};source?:{name:string;url:string}}>={
 'havana':{reason:'北緯23度の海沿いにあり、低緯度の日射と暖かい海からの水蒸気で一年中温暖です。貿易風など熱帯の大気循環が雨に関わり、3月には少雨になります。',agriculture:'バナナのような熱帯作物には暖かさと水分が必要です。雨季の水だけでなく、少雨期の給水と排水も栽培条件になります。',agricultureSource:bananaSource},
 'kingston':{reason:'南岸の低地で暖かいカリブ海に接しています。北東貿易風に加え、島中央の山地が雨の地域差をつくり、この空港では冬に少雨になります。',source:{name:'ジャマイカ気象局：貿易風・山地と気候',url:'https://metservice.gov.jm/our-climate/'},agriculture:'バナナなど水分を必要とする作物では、高温だけでなく乾季の水確保が大切です。空港の少雨を島全体の栽培条件には置き換えません。',agricultureSource:bananaSource},
 'belize':{reason:'カリブ海沿岸の低地で、海風が気温の年変化を和らげます。雨季には西へ進む熱帯の気圧の波などが雨をもたらし、春は大西洋の高気圧で少雨になります。',source:{name:'ベリーズ気象局：雨季・乾季と海風',url:'https://nms.gov.bz/climate-services/climate-summary/'},agriculture:'高温と多い雨はバナナの生育条件につながります。少雨期の水確保と、多雨時の排水を合わせて考える必要があります。',agricultureSource:bananaSource},
 'san-jose':{reason:'北緯約10度でも観測所は標高908mにあり、海沿いの低地より気温が下がります。5～10月の多雨と、年初の少雨が明瞭です。',agriculture:'中央盆地のコーヒーでは、高地の温暖さ、季節の雨、火山性土壌が栽培条件になります。',agricultureSource:latinNatureCases.find(c=>c.id==='central')!.sources[0]},
 'manaus':{reason:'赤道に近い低地で気温の年変化が小さく、森林の蒸発散も大気へ水蒸気を戻します。多雨ですが、8月には雨が減ります。',agriculture:'中央アマゾンでは季節的に浸水する森と浸水しにくい森が隣り合い、森林資源の利用は保全と住民の生計を合わせて考える必要があります。',agricultureSource:{name:'UNESCO：中央アマゾン保全地域群の森林と地域住民',url:'https://whc.unesco.org/en/list/998'}},
 'brasilia':{reason:'標高1,159mの内陸高原で、低緯度の暑さを高度が和らげます。雨の約84%が10～3月に集中し、冬の乾季が長く続きます。',agriculture:'セラードの大豆は雨季を利用して育てます。酸性で養分の少ない土壌には改良や施肥が必要で、気候と技術の両方が産地を支えます。',agricultureSource:farmingSource},
 'sao-paulo':{reason:'南緯23.5度の高原、標高792mにあります。赤道の低地より冬の気温が下がり、夏に雨が増えますが、ケッペン式の乾季条件には達しません。',agriculture:'ブラジル東部・中央部の高原ではコーヒー、野菜、果樹などが栽培されます。高地の気温と、生育期に利用できる水が作物の選択に関わります。',agricultureSource:farmingSource},
 'recife':{reason:'南緯8度の大西洋岸低地、標高7mです。海からの水蒸気が雨の供給源となり、観測値では秋～冬に多雨、春～初夏に少雨になります。',agriculture:'この沿岸の高温多雨は、バナナなど熱帯作物の栽培条件を読む手掛かりです。北東部の乾燥した内陸と分け、少雨期の給水と多雨時の排水を考えます。',agricultureSource:bananaSource},
 'lima':{reason:'太平洋岸ではフンボルト海流と湧昇の冷水が海上の空気を冷やし、低い雲が現れます。雲や霧があっても雨は極めて少なく、各月の降水量は0～0.5mmです。',agriculture:'ペルー沿岸の農業では、少雨を補う灌漑が重要です。果樹や野菜などの栽培を、河川から水を届ける仕組みと合わせて読みます。',agricultureSource:farmingSource},
 'bogota':{reason:'北緯4.7度でも観測所は標高2,547mです。高度によって年間を通じて冷涼になり、月平均気温は13～14℃程度にとどまります。Cfbという区分名は、この都市が西岸にあることを意味しません。',agriculture:'北部アンデスでは、高い谷の野菜・ジャガイモなどと、より低い斜面のコーヒーで土地利用が分かれます。標高と気温の関係が作物の選択につながります。',agricultureSource:farmingSource},
 'buenos-aires':{reason:'南緯約35度の低地で、南半球の夏に高温、冬に冷涼になります。雨は一年を通じて降り、東部パンパの比較的湿った条件につながります。',source:latinNatureCases.find(c=>c.id==='pampas')!.sources[0],agriculture:'周辺のパンパでは草地を利用した牛の飼育と、小麦・トウモロコシ・大豆などの畑作が広がります。降水、排水、土壌が利用方法を分けます。',agricultureSource:latinNatureCases.find(c=>c.id==='pampas')!.sources[0]},
 'santiago':{reason:'チリ中部の内陸谷にあり、南半球の夏は乾燥、冬に雨が集中します。海岸より海の影響が小さく、谷と海岸でも気温・雨量が異なります。',agriculture:'中央部の果樹・ぶどうでは、生育する夏が乾くため灌漑が重要です。冬の雨を受ける水系と、夏に畑へ水を届ける仕組みを結びつけます。',agricultureSource:farmingSource},
 'la-paz':{reason:'南緯16.5度でも標高4,058mのため、最も暖かい月も9.5℃です。これはラパス市の谷底ではなく、エルアルトの高地観測所の区分です。',agriculture:'中央アンデス高地ではジャガイモ、在来穀類、ラマや羊などを組み合わせます。低温に適応した作物・家畜と、雨季の水利用が生計を支えます。',agricultureSource:farmingSource},
 'quito-izobamba':{reason:'赤道に近くても観測所は標高3,058mです。高地のため冷涼で、月平均気温は一年中12℃台、気温の年変化が非常に小さくなります。Cfbという区分名は海岸からの距離を示しません。',agriculture:'北部アンデスの高い谷では、ジャガイモや穀類などの農業が見られます。山地の冷涼さと雨の季節を、温暖な低地とは分けて読みます。',agricultureSource:farmingSource},
 'punta-arenas':{reason:'南緯53度にあり、冬は太陽高度が低く日が短くなります。最暖月も10.8℃で、10℃を超える月は二つだけです。',agriculture:'パタゴニアでは冷涼な条件と草地を利用する羊・牛の牧畜が地域の農業につながります。牧草が育つ季節と飼料の確保が重要です。',agricultureSource:farmingSource},
 'montevideo':{reason:'南緯約35度、ラプラタ河口近くの低地です。南半球の夏冬の気温差があり、毎月80mm以上の雨が降って、乾季のない温帯の条件になります。',agriculture:'ウルグアイの天然草地は牛の飼料の基盤です。雨と気温で変わる草の生育に合わせて放牧を調整し、肉・乳の生産につなげます。',agricultureSource:{name:'ウルグアイ農牧省：牧畜と気候',url:'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/ganaderia-y-clima'}},
};
export function natureCityReading(cityId:string){const reading=cityReadings[cityId],geography=cityGeography[cityId];return reading&&geography?{...reading,...geography}:undefined;}
export function natureCityCase(cityId:string){
 const city=data.cities.find(c=>c.id===cityId),reading=natureCityReading(cityId);if(!city||!reading)return undefined;
 return {id:`station-${city.id}`,name:city.name,place:city.countryCode,scope:latinCountries.find(c=>c.code===city.countryCode)?.subregion==='South America'?'south':'central',city:city.id,crop:'all',title:`${city.name}の気候`,takeaway:reading.climate+' '+reading.reason,compare:'1991–2020年の観測所1点の平年値と、同期間の気候群を合わせて読みます。地点の値は国全体や流域の値ではありません。',sources:[{name:'気象庁ClimatView：この観測所の原表',url:city.sourceUrl},reading.source,reading.agricultureSource,latinStationClimateMethod]};
}
export function natureCaseForPlace(place:string,caseId?:string){
 if(caseId?.startsWith('station-')){const city=natureCityCase(caseId.slice(8));if(city&&city.place===place)return city;}
 const exact=latinNatureCases.find(c=>c.id===caseId&&c.place===place)??latinNatureCases.find(c=>c.place===place);if(exact)return exact;
 const station=data.cities.find(c=>c.countryCode===place);if(station)return natureCityCase(station.id)!;
 const subregion=latinCountries.find(c=>c.code===place)?.subregion;
 if(subregion==='Caribbean')return latinNatureCases.find(c=>c.id==='caribbean')!;
 if(['URY','PRY'].includes(place))return latinNatureCases.find(c=>c.id==='pampas')!;
 if(['PER','ECU','CHL'].includes(place))return latinNatureCases.find(c=>c.id==='andes')!;
 if(subregion==='South America')return latinNatureCases.find(c=>c.id==='amazon')!;
 return latinNatureCases.find(c=>c.id==='central')!;
}
export function natureCountryName(place:string){return latinCountries.find(c=>c.code===place)?.name??(place==='all'?'中南米全体':place);}
export function natureComparisonReading(source:{field:string;layer:string;place:string}){
 const name=natureCountryName(source.place);
 if(source.field==='agriculture'&&source.layer==='all')return {title:`${name}の気候と農畜産`,takeaway:'緯度・標高・雨の季節と、作物・家畜の広がりを同じ範囲で比べます。気候群から生産量や産地を決めつけず、品目ごとの数値と出典で確かめます。',explanation:'気候は1991–2020年、農畜産は2020年の既存格子推計を合成した分布図です。色は品目で、品目間の数量・面積比ではありません。',sources:latinNatureCases[0].sources};
 if(source.field==='agriculture'&&Object.hasOwn(latinAgricultureReading,source.layer)){
  const reading=latinAgricultureReading[source.layer as keyof typeof latinAgricultureReading];
  const metric=source.layer==='cattle'?'牛の飼育密度':source.layer==='coff'?'アラビカコーヒーの収穫面積':source.layer==='soyb'?'大豆の収穫面積':'バナナの収穫面積';
  return {title:`${name}：${metric}`,takeaway:reading.takeaway,explanation:`地域事例：${reading.title}。${reading.compare}。気候は1991–2020年、作物・牛の分布は2020年の格子推計で、年と粒度を区別して読みます。`,sources:reading.sources.map(s=>({name:s.label,url:s.url}))};
 }
 if(source.field==='population'){
  if(source.layer==='spatial')return {title:`${name}の気候と居住人口分布`,takeaway:'沿岸・河川・高地などの自然条件と、国内の人口の集まり方を同じ範囲で読みます。国平均ではなく、2020年の居住人口推計を残しています。',explanation:'気候は1991–2020年、居住人口分布はGHSL2020年です。1km人口格子を10km等積格子へ集計し、表示は約14km。格子密度と2023年国別統計は年・面積分母が異なります。',sources:[{name:'欧州委員会JRC：GHS-POP R2023A、2020年推計',url:'https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe'}]};
  const quantity=source.layer==='population',metric=quantity?'人口規模':source.layer==='scale'?'人口密度・規模':'人口密度';
  return {title:`${name}の気候と${metric}`,takeaway:quantity?'水や農業を支える自然条件と、国・地域の人口規模を比べます。人口の多さは、生活用水・市場・交通への需要の規模を考える手掛かりになります。':'気候は水や農業の条件をつくり、人口の集まりは水供給や交通への需要につながります。気候群と国・地域平均の人口密度を並べ、その条件と暮らしを考えます。',explanation:'気候は1991–2020年の原0.1度区分、人口は2023年の国・地域全体の公表値です。国平均の密度は都市の位置、人口規模は水需要そのものを表していません。',sources:[{name:'世界銀行：国・地域の人口・人口密度',url:'https://data.worldbank.org/indicator/EN.POP.DNST'}]};
 }
 if(source.field==='industry'&&source.layer==='canal')return {title:`${name}の気候と淡水を使う運河`,takeaway:latinNatureCases.find(c=>c.id==='panama')!.takeaway,explanation:latinNatureCases.find(c=>c.id==='panama')!.compare,sources:latinNatureCases.find(c=>c.id==='panama')!.sources};
 if(source.field==='industry')return {title:`${name}の気候と${source.layer==='manufactures'?'製造品':'鉱石・金属'}の輸出`,takeaway:source.layer==='manufactures'?'産業の立地は水・人材・交通・市場に支えられます。気候群と製造品の輸出比率を並べ、工場の環境条件と海外市場へのつながりを考えます。':'自然条件は資源を採掘する地域の水や交通にも関わります。気候群と鉱石・金属の輸出比率を並べ、資源の産地から加工・港・海外市場へのつながりを考えます。',explanation:'気候群は1991–2020年、商品輸出額に占める割合は2024年です。気候群は鉱床・工場の位置を表さず、輸出比率は生産量やサービスの規模とは異なります。',sources:[{name:'世界銀行：商品輸出の構成',url:'https://data.worldbank.org/indicator/TX.VAL.MANF.ZS.UN'}]};
 return {title:`${name}の自然条件を比べる`,takeaway:'同じ地理範囲で気候群と元の分布を並べ、自然条件と暮らしのつながりを読みます。',explanation:'両図の年・単位・粒度を凡例で確かめます。',sources:[]};
}
export function natureScopeForPlace(place:string,scope:string):'all'|'central'|'south'|'country'{
 const country=latinCountries.find(c=>c.code===place);
 if(scope==='country')return country?'country':'all';
 if((scope==='central'||scope==='south')&&country)return country.subregion==='South America'?'south':'central';
 return scope==='central'||scope==='south'?scope:'all';
}
export function renderLatinNatureMap(state:LatinNatureMapState,idPrefix='latin-nature'){
 const bounds=data.bounds4326,[left,top]=projectLatin([bounds[0],bounds[3]]),[right,bottom]=projectLatin([bounds[2],bounds[1]]);
 const {frame,transform,k,tx,ty}=latinMapLayout(state.scope,state.place);
 const selected=latinCountries.find(c=>c.code===state.place);
 const representative=natureCaseForPlace(state.place,state.case);
 const scale=Math.max(1,state.cityScale??1),interactive=state.interactiveCities===true;
 const major=scale<=1.5?['havana','san-jose','manaus','brasilia','lima','bogota','santiago','buenos-aires']:scale<=1.9?['san-jose','manaus','brasilia','lima','santiago','buenos-aires']:['san-jose','manaus','santiago','buenos-aires'];
 const names:Record<string,string>={'havana':'ハバナ','kingston':'キングストン','belize':'ベリーズ','san-jose':'サンホセ','manaus':'マナウス','brasilia':'ブラジリア','sao-paulo':'サンパウロ','recife':'レシフェ','lima':'リマ','bogota':'ボゴタ','buenos-aires':'ブエノスアイレス','santiago':'サンティアゴ','la-paz':'ラパス／エルアルト','quito-izobamba':'キト／イソバンバ','punta-arenas':'プンタアレナス','montevideo':'モンテビデオ'};
 const points=data.cities.map(city=>{const [px,py]=projectLatin([city.longitude,city.latitude]);return {city,px,py,x:px*k+tx,y:py*k+ty};}).filter(p=>p.px>=frame[0]&&p.px<=frame[0]+frame[2]&&p.py>=frame[1]&&p.py<=frame[1]+frame[3]);
 const labels=new Map<string,{x:number;y:number;anchor:string}>(),majorBoxes:number[][]=[];
 for(const {city,x,y}of [...points].sort((a,b)=>Number(major.includes(b.city.id))-Number(major.includes(a.city.id)))){
  const name=names[city.id],width=name.length*15*scale,left=['san-jose','lima','santiago','montevideo','quito-izobamba'].includes(city.id);
  const candidates=(city.id==='montevideo'?[22,-10,44,-34]:[-10,22,-34,44,-58]).flatMap(dy=>[left,!left].map(toLeft=>({x:x+(toLeft?-9:9)*scale,y:y+dy*scale,anchor:toLeft?'end':'start'})));
  const fits=(p:{x:number;y:number;anchor:string})=>{const bx=p.anchor==='end'?p.x-width:p.x,by=p.y-16*scale;return bx>=8&&bx+width<=latinWidth-8&&by>=4&&p.y+3*scale<=latinHeight-4&&!majorBoxes.some(b=>bx<b[0]+b[2]+4*scale&&bx+width>b[0]-4*scale&&by<b[1]+b[3]+3*scale&&p.y+3*scale>b[1]-3*scale);};
  const label=candidates.find(fits)??{x:Math.min(latinWidth-8-width,Math.max(8,x+9*scale)),y:Math.max(20*scale,Math.min(latinHeight-8,y-10*scale)),anchor:'start'};
  labels.set(city.id,label);if(major.includes(city.id))majorBoxes.push([label.anchor==='end'?label.x-width:label.x,label.y-16*scale,width,19*scale]);
 }
 const markers=points.map(({city,x,y})=>{
  const nearest=Math.min(...points.filter(p=>p.city.id!==city.id).map(p=>Math.hypot(p.x-x,p.y-y))),radius=Math.min(5*scale,nearest*.38),hit=Math.min(12*scale,nearest*.45);
  const label=labels.get(city.id)!,lx=label.x,ly=label.y,anchor=label.anchor,name=names[city.id],isMajor=major.includes(city.id),active=city.id===representative.city;
  return `<g class="latin-nature-city-point ${isMajor?'is-major':'is-secondary'}" data-nature-city-point="${esc(city.id)}" data-nature-station="${city.stationId}" data-nature-city-x="${x}" data-nature-city-y="${y}" ${interactive?`role="button" tabindex="0" aria-pressed="${active}"`:'aria-hidden="true"'} aria-label="${esc(city.name)} · 標高${city.elevationM}mの観測所 · 雨温図を読む"><circle cx="${x}" cy="${y}" r="${hit}" fill="transparent"/><circle class="latin-nature-city-dot" cx="${x}" cy="${y}" r="${radius}" fill="${active?'#52213b':'#8b385c'}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/><text class="latin-nature-city-label" data-nature-city-label x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="${15*scale}" font-family="sans-serif" font-weight="700" fill="#243b3e" stroke="#fffefa" stroke-width="4" paint-order="stroke" stroke-linejoin="round" ${isMajor?'':'style="visibility:hidden"'}>${esc(name)}</text></g>`;
 }).join('');
 const context=latinCountries.map(c=>`<path d="${c.path}" fill="#f1f3e9" stroke="#80958d" stroke-width=".7" vector-effect="non-scaling-stroke"/>`).join('');
 const clip=state.only&&selected?`<defs><clipPath id="${esc(idPrefix)}-only"><path d="${selected.path}"/></clipPath></defs>`:'';
 const image=(opacity:number,mask='')=>`<image href="${withBase(data.image)}" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" preserveAspectRatio="none" style="image-rendering:pixelated" opacity="${opacity}" ${mask}/>`;
 const distribution=clip?image(.16)+image(1,`clip-path="url(#${esc(idPrefix)}-only)"`):image(1);
 const outlines=latinCountries.map(c=>`<path d="${c.path}" fill="transparent" stroke="${c.code===state.place?'#233d3b':'#657f71'}" stroke-width="${c.code===state.place?'2.5':'.55'}" vector-effect="non-scaling-stroke" data-nature-country="${esc(c.code)}" role="button" tabindex="0" aria-label="${esc(c.name)}の自然条件" aria-pressed="${c.code===state.place}"></path>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${latinWidth} ${latinHeight}" width="${latinWidth}" height="${latinHeight}" class="latin-map latin-nature-map" data-latin-map data-latin-nature-map data-nature-frame="${frame.join(' ')}" role="group" aria-labelledby="${esc(idPrefix)}-title"><title id="${esc(idPrefix)}-title">中南米の5気候群 · 1991–2020年 · 0.1度分類を5群へ加工</title>${clip}<g data-nature-native-group transform="${transform}"><g data-nature-context aria-hidden="true">${context}</g><g data-nature-original-distribution>${distribution}</g><g data-nature-countries>${outlines}</g></g><g data-nature-city-points>${markers}</g></svg>`;
}
export function renderLatinNatureLegend(_layer='climate'){
 return `<div class="latin-nature-legend" data-latin-nature-legend aria-label="気候群の凡例">${data.groups.map(g=>`<span><i style="background:${g.color}"></i>${g.name}</span>`).join('')}<span><i class="no-data"></i>未分類・対象外</span><span><i style="background:#8b385c;border-radius:50%;width:10px;height:10px"></i>都市・観測所（点を選択）</span></div><p class="latin-nature-period">1991–2020年 · 元区分0.1度（南北約11km）· Beck et al. (2023), CC BY 4.0</p>`;
}
export function renderLatinNatureNormals(cityId:string){
 const city=data.cities.find(c=>c.id===cityId);
 if(!city)return cityId?'<p class="latin-nature-water-note">この観測所の平年値は未収録です。別地点の値や0で補いません。</p>':`<div class="latin-nature-water-note"><strong>雨 → 貯水 → 物流・生活用水</strong><p>湖に蓄える雨水が閘門の運用と生活用水を支えます。運河庁の2024会計年度の専用図で、自然条件と通航調整を比べられます。</p><a href="https://pancanal.com/agua/" target="_blank" rel="noopener">運河庁：流域の水</a></div>`;
 const t=city.temperatureC,r=city.precipitationMm,axes=climateAxes(t,r);
 const rainY=(v:number)=>150-v/axes.rainMax*118,tempY=(v:number)=>150-(v-axes.temperatureMin)/(axes.temperatureMax-axes.temperatureMin)*118;
 const bars=r.map((v,i)=>v===null?'':`<rect x="${51+i*32}" y="${rainY(v)}" width="18" height="${150-rainY(v)}" fill="#6a9db6"><title>${i+1}月の降水量 ${v}mm</title></rect>`).join('');
 const segments:string[]=[];let segment:string[]=[];t.forEach((v,i)=>{if(v===null){if(segment.length)segments.push(segment.join(' '));segment=[];}else segment.push(`${60+i*32},${tempY(v)}`);});if(segment.length)segments.push(segment.join(' '));
 const dots=t.map((v,i)=>v===null?'':`<circle cx="${60+i*32}" cy="${tempY(v)}" r="2.5" fill="#b75d34"/>`).join('');
 const rainGrid=axes.rainTicks.map(v=>`<line data-rain-tick="${v}" x1="44" x2="432" y1="${rainY(v)}" y2="${rainY(v)}" stroke="#b6cedb" stroke-dasharray="2 3"/><text x="42" y="${v===axes.rainMax?28:rainY(v)+4}" text-anchor="end">${v}</text>`).join('');
 const tempGrid=axes.temperatureTicks.map(v=>`<line data-temperature-tick="${v}" x1="44" x2="432" y1="${tempY(v)}" y2="${tempY(v)}" stroke="#dcc8be"/>`).join('');
 const tempLabels=[...axes.temperatureTicks,...(axes.temperatureMin===-3?[-3]:[])].map(v=>`<text x="439" y="${v===-3?162:tempY(v)+4}" fill="#9c4a3d">${v}</text>`).join('');
 const lines=segments.map(s=>`<polyline points="${s}" fill="none" stroke="#b75d34" stroke-width="2.4"/>`).join('');
 const months=Array.from({length:12},(_,i)=>`<text data-climate-month="${i+1}" x="${60+i*32}" y="179" text-anchor="middle">${i+1}</text>`).join('');
 const annual=r.every(v=>v!==null)?r.reduce((sum,v)=>sum+v,0):null;
 const reading=natureCityReading(cityId),stationCode=classifyLatinStation(t,r),stationClass=data.originalClasses.find(c=>c.code===stationCode);
 return `<section class="latin-nature-normals" data-nature-city-id="${esc(city.id)}"><h3 data-nature-city-title>${esc(city.name)}の雨温図</h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 485 ${axes.peakLabel?214:188}" data-climate-plot data-temperature-min="${axes.temperatureMin}" data-temperature-max="${axes.temperatureMax}" data-rain-max="${axes.rainMax}" data-plot-top="32" data-plot-bottom="150" role="img" aria-label="${esc(city.name)}の月別平年気温と降水量、1991–2020年"><g font-size="14" font-family="sans-serif" fill="#456064">${rainGrid}${tempGrid}${tempLabels}${axes.rainTicks.includes(axes.rainMax)?'':`<text x="42" y="28" text-anchor="end" data-rain-upper>${axes.rainMax}</text>`}<text x="10" y="16">mm</text><text x="437" y="16">°C</text>${bars}${lines}${dots}${months}<text x="455" y="183">月</text>${axes.peakLabel?`<text x="242" y="207" text-anchor="middle">${axes.peakLabel}</text>`:''}</g></svg><p class="latin-nature-city-climate" data-nature-city-climate><strong>観測所の気候区分：</strong>${esc(stationClass?`${stationClass.name}（${stationCode}）。${stationClass.description} `:'区分は未判定です。')}${esc(reading?.climate??city.summary)}</p>${reading?`<p class="latin-nature-city-reason" data-nature-city-reason><strong>地理的な理由：</strong>${esc(reading.reason)}</p><p class="latin-nature-city-agriculture" data-nature-city-agriculture><strong>農林業とのつながり：</strong>${esc(reading.agriculture)}</p>`:''}<p>${esc(city.stationName)} · 標高${city.elevationM.toLocaleString('ja-JP')}m · 観測所1点</p><p class="latin-nature-normal-key"><i class="rain"></i>左：降水量 mm/月 <i class="temperature"></i>右：月平均気温 °C</p><p>1991–2020年${annual===null?'':` · 年降水量 ${annual.toLocaleString('ja-JP',{maximumFractionDigits:1})}mm`}</p><p class="latin-nature-classification-note">観測所の区分は月別平年値から当サイトが算出しています。地図の格子区分と異なる場合があります。</p><details><summary>12か月の値・観測所の位置</summary><p>${esc(city.summary)}</p><p>区分は、この観測所の1991–2020年の月別平年値から当サイトが判定しました。地図は同期間の格子データによる分類で、観測所の区分と異なる場合があります。Amは季節風の反転、Aw・ETは実際の植生を直接示すものではありません。</p><p>経度${city.longitude}°・緯度${city.latitude}°。空港・郊外などの観測所名を明記しています。</p><table><thead><tr><th>月</th><th>気温 °C</th><th>降水 mm</th></tr></thead><tbody>${t.map((v,i)=>`<tr><th>${i+1}</th><td>${v===null?'欠測':v}</td><td>${r[i]===null?'欠測':r[i]}</td></tr>`).join('')}</tbody></table><a href="${esc(city.sourceUrl)}" target="_blank" rel="noopener">気象庁ClimatViewの原表</a>${reading?` ／ <a href="${esc(reading.source.url)}" target="_blank" rel="noopener">${esc(reading.source.name)}</a> ／ <a href="${esc(reading.agricultureSource.url)}" target="_blank" rel="noopener">${esc(reading.agricultureSource.name)}</a>`:''} ／ <a href="${latinStationClimateMethod.url}" target="_blank" rel="noopener">${latinStationClimateMethod.name}</a></details></section>`;
}
