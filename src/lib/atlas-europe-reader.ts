import type { EuropeLayer } from '../data/atlas/europe/layers';
import { climateFarming, cityFarming } from '../data/atlas/europe/climate-farming.ts';
import { europeReadings } from '../data/atlas/europe/readings.ts';
import { europeTreeCoverReading } from '../data/atlas/europe/tree-cover-reading.ts';
import { europePrecipitationReading } from '../data/atlas/europe/water-reading.ts';
import { drainageReading } from '../data/atlas/europe/drainage-reading.ts';

type ReaderMessage = { takeaway: string; body: string };
type ReaderSource = { url: string; label: string };

function readingSources(...ids: string[]): ReaderSource[] {
  return ids.flatMap(id => {
    const reading = europeReadings.find(item => item.id === id);
    return reading ? [{ url:reading.source, label:reading.sourceLabel }] : [];
  });
}

const factualSources: Record<string, ReaderSource[]> = {
  climate:[...climateFarming.Cfb.sources,...climateFarming.Dfa.sources,...climateFarming.BSk.sources],
  crops:[...climateFarming.Cfb.sources,...climateFarming.Dfa.sources,...climateFarming.BSk.sources],
  wheat:[...climateFarming.Cfb.sources,...climateFarming.Cfa.sources,...climateFarming.Dfa.sources],
  barley:[...climateFarming.Cfb.sources,climateFarming.Dfb.sources[0]],
  maize:[...climateFarming.Cfa.sources,...climateFarming.Dfa.sources],
  rapeseed:climateFarming.Dfa.sources,
  sunflower:[...climateFarming.Dfa.sources,...climateFarming.Cfa.sources],
  rice:readingSources('alps'),
  soybean:climateFarming.Cfa.sources,
  vegetables:climateFarming.Csb.sources,
  temperatefruit:[...climateFarming.Csb.sources,climateFarming.Csa.sources[1]],
  cattle:[...climateFarming.Cfb.sources,climateFarming.Dfb.sources[1]],
  pig:[...climateFarming.Cfa.sources,...climateFarming.Csb.sources],
  chicken:climateFarming.Csb.sources,
  sheep:[...climateFarming.Cfb.sources,...cityFarming.reykjavik.sources,cityFarming.athens.sources[1]],
  livestock:[
    {url:'https://sustainbeef.hub.inrae.fr/project/wp2.1-description-of-beef-production-systems/wp2.1.1-beef-production-national-statistics',label:'INRAE：2016年の乳牛・肉用繁殖母牛の主要国'},
    {url:'https://www.cso.ie/en/releasesandpublications/ep/p-coa/censusofagriculture2020-preliminaryresults/livestock/',label:'アイルランドCSO：2020年農業センサスの乳牛・非乳牛（地域別）'},
    {url:'https://www.bmluk.gv.at/en/topics/agriculture/agriculture-in-austria/animal-production-in-austria/dairy-farming-in-austria.html',label:'オーストリア農業省：山間地の酪農'},
  ],
  horticulture:[
    {url:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics',label:'Eurostat：2020年のワイン用ブドウ畑・NUTS 2地域'},
    {url:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Agricultural_production_-_orchards',label:'Eurostat：2023年のオリーブ樹園面積'},
  ],
  water:readingSources('danube','rhine','rotterdam','ludwigshafen'),
  terrain:[...readingSources('alps'),{url:'https://www.eea.europa.eu/en/analysis/maps-and-charts/mountain-massifs',label:'EEA：欧州の山塊図'},{url:'https://www.nationalgeographic.org/encyclopedia/europe-physical-geography/',label:'National Geographic：欧州の半島・平原・山地'}],
  contours:readingSources('alps'),
  hubs:readingSources('rotterdam','ludwigshafen','toulouse'),
  density:[],
  forest:readingSources('kaukas'),
  manufacturing:readingSources('munich','mlada'),
  industry:readingSources('kiruna','munich'),
  services:readingSources('frankfurt'),
};

/** Sources for the reader's factual examples, separate from the map-data link. */
export function europeReaderSources(layer: EuropeLayer): ReaderSource[] {
  if(layer.id==='dairy')return [
    {url:'https://www.statistik.at/fileadmin/announcement/2025/06/20250625Milchstatistik2024EN.pdf',label:'Statistics Austria：乳牛の年間平均頭数・生乳量（2024年、表1）'},
    {url:'https://www.bmluk.gv.at/en/topics/agriculture/agriculture-in-austria/animal-production-in-austria/dairy-farming-in-austria.html',label:'オーストリア農業省：山間地の酪農（2026-10-07参照）'},
    {url:layer.source,label:'FAOSTAT QCL：国別の牛の生乳生産量'},
  ];
  if(layer.id==='treecover')return europeTreeCoverReading.sources;
  if(layer.id==='precipitation')return europePrecipitationReading.sources;
  if(layer.id==='drainage')return drainageReading.sources;
  const sources=factualSources[layer.id]??[];
  const needsDataSource=Boolean(layer.indicator)||['climate','rice','contours','vegetables','temperatefruit','cattle','chicken'].includes(layer.id)||sources.length===0;
  const dataSource:ReaderSource={url:layer.source,label:layer.indicator?'World Bank：'+layer.title+'（'+layer.period+'年）':layer.title+'のデータ原典'};
  const relevant=needsDataSource?[dataSource,...sources]:sources;
  return [...new Map(relevant.map(source=>[source.url,{url:source.url,label:source.label}])).values()];
}

// Located examples come from europe/climate-farming.ts and europe/readings.ts.
// They explain possible relationships, not computed intersections or causes of
// every distribution polygon. National contrasts use the recorded WDI 2023 data.
const farmingMessages: Record<string, ReaderMessage> = {
  wheat: {
    takeaway:'小麦の高い収穫面積の格子はフランス北部からドイツ、ポーランドへ続く低地や、英国東部、ウクライナなどに分布します。',
    body:'広い平野は機械を使う穀作に適し、温帯から冷帯南部の生育期の気温と水が栽培を支えます。英国では比較的乾いた東部の畑作と湿潤な西部の牧草地という土地利用の差も見られます。年ごとの干ばつは、同じ栽培域でも収穫を変動させます。',
  },
  barley: {
    takeaway:'大麦はイングランドの穀物栽培とフィンランドの農業に見られ、食料以外の用途にも結びついています。',
    body:'フィンランドの大麦は家畜の餌やビールなどの醸造に使われます。作物の分布は、畑の条件とともに畜産や加工との関係を考える手がかりになります。',
  },
  maize: {
    takeaway:'セルビアやハンガリーではトウモロコシと小麦などが栽培され、一つの地域に複数の作物が共存します。',
    body:'ハンガリーでは2024年の降水不足や夏の干ばつが収穫に影響しました。2020年頃の分布面は栽培の主な場所を示し、毎年の収穫の変動まで表すものではありません。',
  },
  rapeseed: {
    takeaway:'ハンガリーの菜種は油の原料として栽培され、同国の穀物・ヒマワリとともに農業を構成します。',
    body:'菜種と他の作物の分布には重なりもあります。気候に加え、水の確保や土地利用をあわせて考える必要があり、分布の重なりだけで作付けの順序は判断できません。',
  },
  sunflower: {
    takeaway:'ハンガリーのヒマワリは油の原料となり、小麦やトウモロコシとは異なる用途を持つ作物です。',
    body:'セルビアでもヒマワリを栽培しています。ハンガリーの干ばつの例は、同じ栽培域でも気象条件によって収穫が変わることを示します。',
  },
  sugarbeet: {
    takeaway:'テンサイの主な栽培域は、国全体の農業統計だけでは見えない国内の地域差を示します。',
    body:'小麦や他の作物との重なりは、同じ地域に複数の土地利用があることを考える手がかりです。この面だけでは、栽培地を選んだ理由や加工施設との結びつきは確定できません。',
  },
  potato: {
    takeaway:'ジャガイモの主な栽培域は、他の作物と重なる場所と離れる場所を持つ地域の分布です。',
    body:'品目ごとの分布を気候や地形と照らすと、農地の条件を考えられます。水管理や土地利用も関わるため、気候区分だけで栽培域の理由を決めることはできません。',
  },
  rice: {
    takeaway:'アルプスと南側のポー平原の対比は、山地・低地と米の栽培域をあわせて読む例です。',
    body:'地形は農地の条件の一つです。河川や湖の位置は水との関係を考える手がかりですが、この水系図は灌漑の範囲や利用できる水量を示していません。',
  },
  soybean: {
    takeaway:'セルビアでは大豆とトウモロコシ・小麦・ヒマワリが栽培され、複数の作物が地域の農業を構成します。',
    body:'これはセルビア国内の農業の例で、ベルグラードの観測所周辺の作付けを示す説明ではありません。分布面と気候の観測地点は、異なる範囲の情報です。',
  },
  vegetables: {
    takeaway:'「その他の野菜」は収録した作物分類の一つで、野菜栽培全体の分布とは異なります。',
    body:'ポルトガルでは野菜・果実と畜産を組み合わせた農業が行われています。この全国の例と品目別の分布面は範囲が異なり、すべての野菜産地がこの面に含まれるわけではありません。',
  },
  temperatefruit: {
    takeaway:'温帯果樹の面は複数の果樹をまとめた栽培域で、ブドウ単独の産地を示すものではありません。',
    body:'ポルトガルのブドウや地中海沿岸のワイン生産は、別に出典を持つ農業の例です。この集約区分から、特定の果樹の栽培域やワイン産地を読み取ることはできません。',
  },
  citrus: {
    takeaway:'柑橘類と温帯果樹を分けた分布は、果樹を一括りにした全国値では見えない地域差を示します。',
    body:'果樹の分布を気候や地形と比べると、農地の条件を考えられます。この図だけでは水管理や販売先の違いは分からず、栽培域の理由を気候だけに結びつけることはできません。',
  },
  cattle: {
    takeaway:'イングランド西部やフィンランドには牛を飼養する農業があり、穀物栽培とは異なる土地利用が見られます。',
    body:'イングランドでは西部に牛や羊、東部に小麦や大麦が目立ちます。フィンランドの酪農は牛乳生産の例ですが、この牛の分布面は乳用と肉用をまとめています。',
  },
  pig: {
    takeaway:'セルビア北部のヴォイヴォディナでは豚の飼養が多く、同国の穀物栽培と並ぶ農業の特徴です。',
    body:'ポルトガルでも豚肉を生産しています。これらは国・地域の農業の例で、分布面の重なりだけから飼料の調達先や販売先を判断することはできません。',
  },
  chicken: {
    takeaway:'ポルトガルの農業には鶏肉生産も含まれ、果樹や野菜の栽培と畜産が共存しています。',
    body:'国全体の農業の例と、鶏が集中する地域を示す分布面は範囲が異なります。この面は肉用と採卵用をまとめており、鶏肉産地だけの分布ではありません。',
  },
  sheep: {
    takeaway:'羊はイングランド西部やアイスランドで飼養され、ギリシャでは乳を使ったチーズづくりにも結びつきます。',
    body:'アイスランドでは羊肉を生産し、ギリシャのフェタは羊乳を主原料にします。気候や草地の条件とともに用途を考える例ですが、この面から肉用と乳用の地域差は分かりません。',
  },
};

const countryMessages: Record<string, ReaderMessage> = {
  forest: {
    takeaway:'2023年の森林面積比率はフィンランド・スウェーデンで高く、オランダで低いという国全体の違いがあります。',
    body:'フィンランドのラッペーンランタでは木材からパルプやバイオ燃料を生産しています。森林の広さと、木材を加工する拠点の立地は別の情報です。',
  },
  manufacturing: {
    takeaway:'2023年の製造業のGDP比率は、チェコ・ドイツがフランス・英国より高いという国全体の違いがあります。',
    body:'ミュンヘンの自動車工場と研究開発、チェコの自動車生産は異なる拠点の役割を示します。全国の比率だけでは、その工場の生産額や雇用は分かりません。',
  },
  industry: {
    takeaway:'鉱工業・建設業のGDP比率は、製造業に資源採掘や電気・ガス・水道、建設を含めた産業構成を示します。',
    body:'北部スウェーデンのキルナは鉄鉱石採掘、ドイツのミュンヘンは自動車製造の拠点です。資源の位置と技術開発・生産の集積は、異なる立地の条件です。国全体のGDP比率から個々の拠点の生産額や雇用は読み取れません。',
  },
  services: {
    takeaway:'2023年のサービス業のGDP比率は、英国・フランスがチェコより高いという国全体の違いがあります。',
    body:'フランクフルトの中央銀行は、金融・行政も都市の機能を形づくる例です。全国のサービス業比率は、その都市の金融雇用や産業の範囲を示すものではありません。',
  },
  urban: {
    takeaway:'2023年の都市人口比率はオランダがイタリアより高く、国全体で都市に暮らす人の割合が異なります。',
    body:'都市人口比率と人口密度は、都市に住む割合と人が集中する場所という別の情報です。都市の定義が国ごとに異なるため、この比率を市街地の広さには置き換えられません。',
  },
  age: {
    takeaway:'2023年の65歳以上の人口比率はイタリアがアイルランドより高く、国全体の年齢構成に違いがあります。',
    body:'人口密度が示す人の集中と、65歳以上の割合が示す年齢構成は別の比較です。この全国値だけでは、国内のどの都市や地域で高齢化が進むかは分かりません。',
  },
  growth: {
    takeaway:'2023年はアイルランドの人口が増え、イタリアはわずかに減るなど、国全体の人口変化に違いがあります。',
    body:'年間の人口変化には自然増減と移動の両方が含まれます。この全国値から、移動だけの人数や特定の都市へ集まった人数を読み取ることはできません。',
  },
};

/** A geographic takeaway and brief explanation; definitions stay in the note. */
export function europeReaderCopy(layer:EuropeLayer) {
  if(layer.id==='dairy')return {
    title:'酪農・牛の生乳',takeaway:'生乳を生産する酪農と、肉用も含む牛の飼養分布を分けて読みます。',
    body:'アルプスを含むオーストリアの山間地は酪農の場でもあり、同国農業省は酪農経営の89%が山間地にあると説明しています。Statistics Austriaの2024年統計では、乳牛の年間平均頭数は539,414頭、生乳生産量は4,020,699 tです。これらは国全体の値で、山間地だけの数量ではありません。',
    note:layer.note+' 地図下ではFAOSTATの同年・同品目・同単位の全国生乳量とWorld値を比較します。乳牛頭数から生乳量を換算していません。',
  };
  if(layer.id==='treecover')return {title:europeTreeCoverReading.title,takeaway:europeTreeCoverReading.takeaway,body:europeTreeCoverReading.body,note:europeTreeCoverReading.note};
  if(layer.id==='precipitation')return {title:europePrecipitationReading.title,takeaway:europePrecipitationReading.takeaway,body:europePrecipitationReading.body,note:europePrecipitationReading.note};
  if(layer.id==='drainage')return {title:drainageReading.title,takeaway:drainageReading.takeaway,body:drainageReading.body,note:drainageReading.note};
  if(layer.id==='climate')return {
    title:'気候区分',takeaway:'西欧には乾季のない温帯が広がり、東・北ほど冬の寒い区分、地中海沿岸には夏が乾く区分、南東部には乾燥区分が見られます。',
    body:'大西洋からの湿った空気と西風は西部の降水と穏やかな冬に関わります。内陸ほど海の影響が弱まり、緯度・標高とともに気温の季節差が変わります。地中海沿岸では夏の高気圧も乾燥に関わり、同じ区分内の土地利用は水管理などで異なります。',
    note:layer.note+' 観測地点の平年値は国平均ではありません。未収録の気候区分や降水の欠測は、近隣値や0で補いません。',
  };
  if(layer.id==='crops')return {
    title:'欧州の穀物・畑作',takeaway:'小麦は英国東部、フランス北部からドイツ・ポーランドの低地、ウクライナに分布し、トウモロコシは中東欧の低地で目立ち、大麦・菜種・テンサイ・ジャガイモもそれぞれの集中域を持ちます。',
    body:'英国東部から北フランスの穀物帯は広い畑での機械作業に適し、海に近い市場や製粉・飼料・食品加工への輸送とも結びつきます。ドイツ・ポーランドからウクライナの低地にも大きな穀作域が続きます。トウモロコシは夏の熱量が確保できる中東欧の低地に多く、テンサイやジャガイモには食品加工とのつながりがあります。同じ地域の色の重なりは複数作物の集中を示し、同一の畑で同時に栽培する意味ではありません。',
    note:'2020年頃の品目別収穫面積格子から集中域を抽出した概略図です。濃淡は数量順位ではありません。ライムギ単独の元格子は未収録です。',
  };
  if(layer.id==='livestock')return {
    title:'欧州の酪農・畜産',takeaway:'牛・豚・鶏の飼養集中域は西欧から中東欧の低地に重なり、羊の集中域は英国・アイルランドや地中海側にも広がります。',
    body:'低地の飼料作物、牧草地、加工・市場への近さは飼養の立地に関わります。英国では湿潤な西部の草地が牛・羊の飼養と結びつきます。牛の面は乳用と肉用を分けず、鶏の面も肉用と採卵用を分けません。別資料のINRAEが示す2016年のEUの主要乳牛国はドイツ・フランス・ポーランド・イタリア・英国・オランダ、肉用繁殖母牛国はフランス・スペイン・英国・アイルランドです。',
    note:'色面はFAO GLW4 2020の家畜密度モデルから抽出した集中域です。2016年のEU加盟国別の乳牛・肉用繁殖母牛統計は別の分母・年・指標であり、地図の牛の面の内訳には使えません。色面の輪郭は農場の境界ではなく、無色の場所を飼養ゼロとみなしません。',
  };
  if(layer.id==='horticulture')return {
    title:'欧州の果樹・園芸',takeaway:'柑橘類の集中域は地中海側の南部に限られ、温帯果樹とVEGE区分の野菜はそれより広く西欧・中欧から地中海沿岸まで異なる場所に分布します。',
    body:'柑橘類には冬の寒さが制約となり、地中海側では夏の水管理も重要です。温帯果樹とVEGE区分の野菜には、品目によって異なる気温・水・土壌条件があり、近くの都市や加工・流通先も立地に関わります。別資料のEurostatでは2020年のEUワイン用ブドウ畑の74.9%がスペイン・フランス・イタリア、2023年のEUオリーブ樹園の99%がスペイン・イタリア・ギリシャ・ポルトガルにあります。',
    note:'色面はSPAM 2020の柑橘・温帯果樹・VEGE集合区分から抽出した集中域です。温帯果樹はブドウ単独、VEGEは全野菜の分布ではありません。ブドウ・オリーブ単独の元格子は未収録です。EurostatのEU国別値を欧州全域の分布や色面の内訳と読み替えません。',
  };
  if(layer.id==='water')return {
    title:'河川・湖',takeaway:'ドナウ川は中欧から黒海へ、ライン川はアルプス方面から北海へ流れ、北欧には多数の湖が分布します。',
    body:'山地の雪や降水、低地の緩やかな勾配が河川の向きや流域を形づくります。ドナウ川の流域は19か国にまたがり、水利用、洪水や生態系の管理に国際協力が必要です。',
    note:'線の太さは流量を表しません。小さな河川や湖は省略しています。この河川・湖の図は流域界を表示せず、別の「流域の区画」で確認します。地下水・灌漑の範囲は収録していません。',
  };
  if(layer.id==='terrain')return {
    title:'欧州の主な地形',takeaway:'北ヨーロッパ平原は西欧から東欧へ、南のピレネー・アルプス・アペニン・カルパチアの山地は弧状に続き、北西のスカンディナヴィア山脈と南の三大半島・地中海の島々が周縁を形づくります。',
    body:'アルプス・ピレネー・カルパチア・アペニンなどは、アフリカ側とユーラシア側のプレートの収束に伴う地殻変動で隆起し、侵食で現在の谷や峰が刻まれました。北ヨーロッパ平原は古い地盤の低地に氷河・河川の堆積が重なり、スカンディナヴィアでは古い山地が氷河侵食を受けています。半島と海域の配置は地殻変動と海面変化の長い履歴を反映します。',
    note:'破線は山脈・平原の概略の軸で、正確な境界ではありません。背景の陰影は地形を読む補助です。標高の数値は「標高（等高線）」で確認できます。',
  };
  if(layer.id==='contours')return {
    title:'標高（等高線）',takeaway:'標高500 m線はアルプス・ピレネー・カルパチアなどの山地を囲み、北ヨーロッパ平原などの低地との高低差を示します。',
    body:'同じ高さを結ぶ線と標高帯の色を500m刻みで示し、1,000mごとの線を濃くしています。山地と平野の対比は農地や都市の位置を考える条件の一つで、立地の理由を標高だけで決めることはできません。',
    note:'表示用に平均化した標高から作った概略図です。等高線の間隔は標高精度を意味しません。',
  };
  if(layer.id==='hubs')return {
    title:'欧州の産業集積',takeaway:'北海側はエネルギー・港湾物流、北欧は鉱業・素材、ライン川沿いは化学、ドイツ南部からチェコは自動車・機械が目立ちます。航空機は国境を越えた複数拠点、観光は地中海とアルプス、金融・繊維衣服・食品加工は都市や産業地区に集まります。',
    body:'資源産業は鉱床・海底資源・森林の位置に、港湾物流と化学は海港から内陸へつながる交通と原料搬入に結びつきます。自動車・航空機は技能と国境を越えた部品生産、医薬・食品は研究開発と加工設備の集積を使います。観光は海岸・山地の景観と季節の需要、金融は専門人材と企業・行政機能への近さが関わります。',
    note:'点の数や大きさは、生産量・雇用の大小を表しません。工場群や施設全体の境界は描いていません。',
  };
  if(layer.id==='density')return {
    title:'人口分布',takeaway:'人口密度はパリ周辺、ライン川沿い、ポー平原などの都市・低地で高く、北欧の内陸や高い山地では低く、国境をまたぐ帯状の集中も見られます。',
    body:'平野と河川沿いの交通、工業・サービス業の仕事、都市の長い集積が人口を引き寄せます。北部の寒冷さや山地の急な地形は居住・交通の条件を狭めます。ただし人口の差を自然条件だけでは説明できず、歴史的な都市形成や経済活動も関わります。',
    note:'2020年の格子ごとのモデル推計です。現在の人口移動・避難状況を表すものではありません。都市の点は位置のみを示します。',
  };
  if(layer.id==='ethnicity'||layer.id==='religion')return {
    title:layer.title,takeaway:'イングランド・ウェールズの行政区とクロアチアの全国値で、自己申告の回答構成を読む事例です。',
    body:'2021年の国勢調査が公表した分類、人数、表ごとの総人口を使います。地域による回答の違いと、資料の対象範囲を分けて読みます。',
    note:layer.note,
  };
  if(layer.field==='agriculture'&&layer.grid) {
    const livestock=['cattle','pig','sheep','chicken'].includes(layer.id);
    const definition=layer.id==='cattle'?'牛は肉用・乳用を分けていません。':layer.id==='chicken'?'鶏は肉用・採卵用を分けていません。':layer.id==='temperatefruit'?'温帯果樹の集約区分であり、ブドウ単独の分布ではありません。':layer.id==='vegetables'?'SPAMのVEGE区分で、トマト・タマネギ等の別区分を含む「全野菜」ではありません。':'';
    const message=farmingMessages[layer.id]??{
      takeaway:layer.title+'の主な分布は、国全体の統計だけでは見えない地域差を示します。',
      body:'気候や地形とあわせて、土地利用や水管理の違いを考える手がかりです。この分布だけで立地の理由を確定することはできません。',
    };
    return {title:layer.title+'の分布',...message,
      note:(livestock?'2020年の家畜密度のモデル推計から、主な飼養地域を取り出しています。':'2020年頃の収穫面積のモデル推計から、主な栽培域を取り出しています。')+'色の濃さは数量を示しません。色のない場所でも生産がないとは限らず、面の輪郭は農場や農地の実際の境界ではありません。'+definition};
  }
  const countryMessage=countryMessages[layer.id];
  if(countryMessage)return {title:layer.title,...countryMessage,note:layer.note};
  return {title:layer.title,takeaway:layer.title+'は、データの範囲と定義をそろえて比べる必要があります。',body:layer.note,note:'出典が示す対象年と範囲の情報です。'};
}
