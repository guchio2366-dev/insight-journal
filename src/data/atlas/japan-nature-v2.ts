import {groundwaterClasses} from './asia-water.ts';
import {asiaClimateCities} from './asia-climate-cities.ts';
import records from './japan-nature-v2-records.json' with {type:'json'};

export type JapanNatureTopic = 'stations' | 'climate' | 'precipitation' | 'water' | 'groundwater' | 'elevation';
export type JapanNatureReading = {title:string;overview:string;reason:string;gap:string;source?:string};
export const japanNatureAssetBase='/assets/atlas/japan-nature-v2/';
export const japanNatureCities=asiaClimateCities.filter(city=>city.countryCode==='JPN');
export const japanNatureTopics: {id:JapanNatureTopic;label:string}[]=[
 {id:'climate',label:'気候'}, {id:'precipitation',label:'年降水量'},
 {id:'water',label:'河川・集水域'}, {id:'groundwater',label:'地下水'}, {id:'elevation',label:'地形・標高'},
];
export const japanNatureFeatureIds={
 climate:['hokkaido','japan-sea','pacific','central-highlands','seto-inland','southwest-islands'].map(id=>'climate-region-'+id),
 water:[...records.basins.map(record=>record.id),...records.rivers.map(record=>record.id)],
 groundwater:records.groundwater.map(record=>record.id),
};
export const riverLabels=records.rivers.map(river=>({id:river.id,name:river.name,coordinates:river.point as [number,number],source:river.sourceUrl}));
export const japanNatureRecords=records;

// Geographic explanations are not polygons and do not assign Köppen classes.
// Representative locators are distinct from the three acquired observation records.
export const japanClimateRegions=[
 {id:'hokkaido',name:'北海道',representative:'札幌',coordinates:[141.32,43.05] as [number,number],reason:'高緯度のため冬の気温が低くなります。日本海側と太平洋側では冬の降雪や日照が異なり、北海道全体を一つの観測点で代表できません。'},
 {id:'japan-sea',name:'日本海側',representative:'金沢',coordinates:[136.63,36.59] as [number,number],reason:'冬の北西季節風が日本海から水蒸気を受け取り、山地の風上で雨や雪を降らせます。山の標高や海からの距離で積雪・降水が変わります。'},
 {id:'pacific',name:'太平洋側',representative:'東京',coordinates:[139.75,35.69] as [number,number],reason:'冬は山地の風下で晴れる日が多く、暖候期には梅雨前線・台風などが雨をもたらします。同じ太平洋側でも海岸・内陸・山地の条件は異なります。'},
 {id:'central-highlands',name:'中央高地',representative:'松本',coordinates:[137.97,36.24] as [number,number],reason:'高い標高と海から離れた盆地の条件が気温の低さや日較差に関わります。周囲の山地は湿った気流を遮り、盆地と山頂の気候を分けます。'},
 {id:'seto-inland',name:'瀬戸内',representative:'高松',coordinates:[134.05,34.32] as [number,number],reason:'中国山地と四国山地に挟まれ、季節風に対して風下になることが多い地域です。降水の少なさは水源・ため池・用水の利用とも関わります。'},
 {id:'southwest-islands',name:'南西諸島',representative:'那覇',coordinates:[127.69,26.21] as [number,number],reason:'低緯度で海に囲まれ、冬も比較的暖かい地域です。梅雨・台風・海面水温が降水や季節変化に関わり、島の標高や位置でも差があります。'},
];
const readings:Record<JapanNatureTopic,JapanNatureReading>={
 climate:{title:'気候区分と、季節の違いを読む',overview:'北海道では冷帯の区分、本州の低地から九州では温帯の区分が広がり、南西諸島の一部には熱帯の区分も見られます。高い山地には周囲の低地と異なる区分も見られます。色はBeckの1991–2020年Köppen–Geiger原0.1°資料で、詳細な気候境界ではありません。',reason:'南北の緯度差と標高に加え、季節風、前線、海からの距離、山地の風上・風下が気温と降水に関わります。日本海側・太平洋側などの国内の地理的説明と、月別の気温・降水条件に基づくKöppen区分は別の分類です。',gap:'Köppen原資料は0.1°（約8–11km）の広域区分です。1km原資料は取得できていません。雨温図は公的に取得済みの札幌・東京・那覇の3観測所。金沢・松本・高松などの追加平年原表は未収録です。',source:'https://doi.org/10.1038/s41597-023-02549-6'},
 stations:{title:'観測所の季節変化を読む',overview:'札幌・東京・那覇の位置と、1991–2020年の月平均気温・降水量を示します。選択しても地図範囲は動かず、都市の観測所の平年値を比較できます。',reason:'緯度差・標高・季節風と海の影響が観測値の季節変化に関わります。観測所1点の値は都市全域や県全体の平均ではありません。',gap:'3観測所を収録。日本海側・中央高地・瀬戸内の追加代表観測所は原表取得待ちです。',source:'https://www.data.jma.go.jp/stats/etrn/'},
 precipitation:{title:'年降水量の広がりを読む',overview:'太平洋に面する山地や南西諸島では、内陸や瀬戸内の一部より年降水量の多い場所が見られます。段階色と250mm間隔の線は、GPCCの1991–2020年の月別平年値12か月の合計から作っています。',reason:'湿った空気が山地を上昇すると冷えて雨を降らせ、風下では少なくなることがあります。季節風・梅雨前線・台風が年間の分布を重ねて作ります。年合計だけでは雨の季節、雪の割合、河川流量や利用可能な水量を決められません。',gap:'原格子は0.25°（約20–28km）で、線の250mm間隔は測定精度を意味しません。平滑化・細部の補充なし。原欠測の海岸・小島は基図色のままです。',source:'https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025'},
 elevation:{title:'山地と低地の位置を読む',overview:'日本列島の内陸には山地が連なり、平野や海岸の低地と対照をなします。500m間隔の等高線と段階色はETOPO2022の原60秒格子から作り、基図と同じ海岸線で切り取っています。',reason:'プレートの運動や火山活動は山地の形成に関わり、風化・河川の侵食と堆積は谷や平野を作ります。低地は居住・農業・交通の場所と結び付き、山地は気候と水の流れを分けます。',gap:'原資料は約1–2km格子の広域地形モデルで、土地の現地測量ではありません。海岸セルに海底の影響による負の標高を含む場合があり、数値を改変せず最低色に含めています。標高はEGM2008基準、2022は版年です。',source:'https://www.ncei.noaa.gov/products/etopo-global-relief-model'},
 water:{title:'河川と集水域を分けて読む',overview:'山地の両側に水が流れ、海へ向かう集水域が並びます。色はBasinATLASの集水域資料、線と川名はNatural Earthの石狩川・利根川・最上川の収録区間です。沿岸の小流域群は一つの大河川の流域ではありません。',reason:'分水界は雨や雪解け水が向かう方向を分けます。流域の地形・降水、ダムや用水、土地利用が下流の水利用に関わります。資料の集水域面積だけで洪水危険度や年間利用可能量を確定できません。',gap:'一般化された世界資料です。川名のある線は3河川のみで、全国の国内河川網・湖沼は未整備。国交省W05原資料が取得不可のため、流域と河川を補って創作しません。',source:'https://www.hydrosheds.org/hydroatlas'},
 groundwater:{title:'帯水層の大まかな地域差を読む',overview:'広域の地下水盆地、局地的・浅い帯水層、複雑な帯水層構造をWHYMAPの地域分類で示します。色は地質・帯水層の区分で、各地点でくみ上げられる水量ではありません。',reason:'雨が地中へ浸透し、岩石や地層のすき間を通って移動します。地形・地質、かん養と取水のつり合いが地下水利用を左右します。河川の水と地下水は関わりますが、同じ資料・同じ量ではありません。',gap:'WHYMAP2008・1:25,000,000の広域資料。国内の細かな地質・取水量・水質・現在の枯渇は未収録で、世界資料の空隙は残します。',source:'https://www.whymap.org/'},
};
export function getJapanNatureReading(topic:JapanNatureTopic|string,featureId?:string|null):JapanNatureReading{
 const base=readings[topic as JapanNatureTopic]??readings.climate;
 if(topic==='climate'&&featureId?.startsWith('climate-region-')){
  const region=japanClimateRegions.find(region=>'climate-region-'+region.id===featureId);
  if(region)return {...base,title:region.name+'の季節と地形',overview:`${region.representative}を位置の目安に${region.name}の気候を考えます。これは国内の地理的説明で、地図のKöppen–Geiger区分と同一の面分類ではありません。${japanNatureCities.some(city=>city.name===region.representative)?'この代表都市の観測所平年値を別に選んで比較できます。':'この代表都市の月別平年値は未収録のため雨温図を作りません。'}`,reason:region.reason,source:'https://www.jma.go.jp/jma/kishou/know/kisetsu_riyou/tenkou/Average_Climate_Japan.html'};
 }
 if(topic==='water'&&featureId){
  const river=records.rivers.find(record=>record.id===featureId);
  if(river)return {...base,title:river.name,overview:`地図の線は${river.name}のNatural Earth収録区間です。線の太さは実際の川幅や流量を表しません。`,reason:'山地から低地・海へ向かう水の通り道です。河川とその周囲の色で示す集水域は別の資料なので、名前だけで同一の流域と決めません。',source:river.sourceUrl};
  const basin=records.basins.find(record=>record.id===featureId);
  if(basin)return {...base,title:basin.name,overview:`BasinATLAS集水域資料の面積は${basin.areaKm2.toLocaleString('ja-JP')}km²です。${basin.coastal?'複数の沿岸小流域をまとめた群で、単独の大河川の流域ではありません。':'面積は資料で定義された連結集水域で、行政区の面積ではありません。'}`,reason:'降水と雪解け水が地形に沿って移動する範囲です。資料の輪郭は一般化されているため、国内の水系境界の精密な判定には使えません。'};
 }
 if(topic==='groundwater'&&featureId){
  const aquifer=records.groundwater.find(record=>record.id===featureId);
  if(aquifer){const category=groundwaterClasses[aquifer.class];return {...base,title:category?.type??'広域の帯水層区分',overview:`原資料の帯水層分類は「${category?.type??aquifer.aquifer}」、かん養区分は${category?.recharge??aquifer.recharge}mm/年です。この範囲の貯水量や安全な取水量を示す値ではありません。`,reason:'岩石や地層の空隙と透水性が地下水の蓄積・移動に関わります。地域分類から個々の井戸の条件は決められません。'};}
 }
 return base;
}
