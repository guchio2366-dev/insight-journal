import stations from './oceania-russia-climate-cities.json';
import {classifyLatinStation} from '../../lib/atlas-latin-station-climate';

export type ClimateCity=typeof stations[number];
export const regionalClimateCities=stations;
export const climateCity=(region:string,id:string|null)=>stations.find(c=>c.region===region&&c.id===id);
export const regionalClimateDefinitions:Record<string,{name:string;definition:string}>={
 Aw:{name:'サバナ気候',definition:'全月18℃以上。最少雨月が60 mm未満で、100−年降水量÷25 mmも下回る熱帯。乾燥帯の条件は先に判定します。'},
 Af:{name:'熱帯雨林気候',definition:'全月18℃以上、最少雨月60 mm以上。乾燥帯の条件を満たさない熱帯です。'},
 BWh:{name:'高温砂漠気候',definition:'年平均18℃以上、年降水量が乾燥限界の半分未満。乾燥限界＝20×年平均気温＋季節補正（冬に70％超なら0、夏に70％超なら280、その他140）mm。'},
 Cfa:{name:'温暖湿潤気候',definition:'最寒月0℃超・18℃未満、最暖月22℃以上。夏乾燥・冬乾燥の条件を満たしません。'},
 Csa:{name:'地中海性気候（暑夏）',definition:'最寒月0℃超・18℃未満、最暖月22℃以上。夏の最少雨月が40 mm未満かつ冬の最多雨月の3分の1未満。'},
 Cfb:{name:'西岸海洋性気候',definition:'最寒月0℃超・18℃未満、最暖月22℃未満、10℃を超える月が4か月以上。夏乾燥・冬乾燥の条件を満たしません。'},
 Dfb:{name:'冷帯湿潤気候（暖夏）',definition:'最寒月0℃以下、最暖月10℃超・22℃未満、10℃を超える月が4か月以上。夏乾燥・冬乾燥の条件を満たしません。'},
 Dsd:{name:'冷帯夏季少雨気候（厳冬）',definition:'最寒月−38℃以下、最暖月10℃超・22℃未満、10℃を超える月が1〜3か月。夏の最少雨月が40 mm未満かつ冬の最多雨月の3分の1未満。この観測所では4月4.1 mmと10月12.8 mmが境界に近く、少雨条件を満たします。'},
 Dwb:{name:'冷帯冬季少雨気候（暖夏）',definition:'最寒月0℃以下、最暖月10℃超・22℃未満、10℃を超える月が4か月以上。冬の最少雨月が夏の最多雨月の10分の1未満。'},
 ET:{name:'ツンドラ気候',definition:'最暖月が0℃超・10℃以下。月平均気温で判定し、個々の日の最高気温や積雪深ではありません。'},
};
export const regionalClimateReasons:Record<string,{reason:string;landUse:string}>={
 darwin:{reason:'低緯度の北岸で年中高温です。南半球の夏は湿ったモンスーン、冬は乾いた大陸側の気流が卓越し、雨季と乾季が分かれます。',landUse:'北部の牧畜・熱帯作物を考える際は、雨季の水と乾季の給水・飼料確保を分けて読みます。都市の雨量は農場の収量を表しません。'},
 'alice-springs':{reason:'海から遠い豪州内陸で、亜熱帯高圧帯の影響も受けます。降水が少なく、夏の高温と冬の冷え込みの差があります。',landUse:'内陸の放牧では、広い土地に加えて水・飼料の確保が条件になります。気候図から灌漑範囲や牧場の生産量は決まりません。'},
 brisbane:{reason:'豪州東岸の亜熱帯で海から湿気が入り、年間を通じて降水があります。南半球の夏は高温で、冬も月平均は0℃を上回ります。',landUse:'沿岸の園芸・農畜産を読む入口です。降水だけで産地や用途を決めず、土壌・水管理・市場への距離も合わせます。'},
 perth:{reason:'豪州南西岸では、南半球の夏は高圧帯の影響で乾燥し、冬は偏西風に伴う気圧の谷や前線の雨が増えます。',landUse:'周辺の小麦地帯を考える際は冬の雨と夏の乾燥を分けます。都市の観測所は穀倉地帯全体の雨量や収穫量を示しません。'},
 hokitika:{reason:'南島西岸はタスマン海からの湿った偏西風にさらされ、東のサザンアルプスで空気が上昇します。海の影響で季節の気温差は小さく、通年多雨です。',landUse:'牧草や森林の生育を考える一方、多雨地の排水・地形も条件になります。都市の平年値から林業生産量や伐採可能地は分かりません。'},
 rotuma:{reason:'低緯度の海洋に囲まれ、全月が高温・多雨です。この観測所では季節の気温差が小さく、最も乾いた月にも60 mm以上の雨があります。',landUse:'島の熱帯作物や水利用を考える入口です。降水量から淡水の供給量や作物の生産量は直接求められず、土地・貯水・輸送も関わります。'},
 moscow:{reason:'欧州側の内陸で、北の緯度と海からの距離が冬の冷え込みを強めます。夏は暖かく、降水は通年あります。',landUse:'生育できる季節と冬の休止を分け、周辺の農畜産・森林を読みます。飼料や冬の設備、市場も必要で、この観測所は農地・森林全域の平均ではありません。'},
 verkhoyansk:{reason:'北東シベリアの高緯度内陸で、冬は日射が弱く海の温度調節も届きにくいため、月平均でも著しく冷え込みます。短い夏との年較差が大きく、年降水量は少量です。',landUse:'10℃を超える月が少なく、農業では短い生育期を考える必要があります。森林利用にも寒さ・地形・交通が関わり、この図から伐採量や営農の可否は決まりません。'},
 vladivostok:{reason:'極東の海岸でも冬は冷たい大陸側の気流で寒く少雨です。夏は海からの湿った気流が入り、降水が増える季節差が見られます。',landUse:'極東の農林業を考える際は夏の水と冬の寒さを分けます。山地・土壌・設備・港への輸送も条件で、都市の雨温図から産地を確定しません。'},
 'malye-karmakuly':{reason:'北極圏のノヴァヤゼムリャ島にある観測所です。高緯度で夏の日射があっても月平均の最暖月は10℃に届かず、低温の季節が長く続きます。',landUse:'樹木や作物の生育を考える際に、夏の低温と短い生育期が強い制約になります。居住・輸送・設備を含め、降水量だけで土地利用を決めません。'},
};
export function regionalClimateReading(city:ClimateCity){
 const code=classifyLatinStation(city.temperatureC,city.precipitationMm)!;
 const definition=regionalClimateDefinitions[code];
 if(!definition)throw new Error(`Unexplained station climate: ${city.id}/${code}`);
 const cold=Math.min(...city.temperatureC),hot=Math.max(...city.temperatureC),annual=city.precipitationMm.reduce((a,b)=>a+b,0);
 return {code,...definition,...regionalClimateReasons[city.id],metrics:`最寒月 ${cold}℃ ／ 最暖月 ${hot}℃ ／ 年降水量 ${annual.toFixed(1)} mm`};
}
export const regionalClimateBackgroundSources=[
 {title:'豪州気象局：季節風・高圧帯・前線と気候',url:'https://www.bom.gov.au/resources/learn-and-explore/climate-knowledge-centre/climate-factors'},
 {title:'NIWA：ホキティカなど南島西岸の気候',url:'https://niwa.co.nz/climate-and-weather/map-w-south'},
 {title:'ABARES：豪州農業の地域差',url:'https://www.agriculture.gov.au/abares/products/insights/snapshot-of-australian-agriculture'},
 {title:'USDA FAS：ロシアの冬小麦・春小麦と生育期',url:'https://ipad.fas.usda.gov/highlights/2017/08/Russia%20wheat/index.htm'},
];
