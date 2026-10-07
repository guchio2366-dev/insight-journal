import type {AsiaField} from '../../lib/atlas-asia-state';
import {asiaFocusFieldReadings,type AsiaFocusFieldReading} from './asia-focus';

// Regional reading guides reuse the existing sources and datasets. No new
// subregional totals or finer spatial estimates are introduced here.
const south=asiaFocusFieldReadings['south-asia']!;
const central=asiaFocusFieldReadings['central-asia']!;
export const southCentralFieldReadings:Record<AsiaField,AsiaFocusFieldReading>={
 natural:{title:'季節風の平野と、内陸の乾燥・山地の水を比べる',takeaway:'南アジアでは雨季の雨とヒマラヤから流れる川、中央アジアでは乾燥した低地へ山地から届く水を読みます。',reading:'デリー・ムンバイとタシケント・アスタナの雨温図を比べ、雨の季節と冬夏の寒暖差を確かめます。年降水量と流域へ切り替え、インダス川、ガンジス・ブラマプトラ、アムダリヤ川、シルダリヤ川の上流と低地を追います。川の水に加え、パンジャーブの米・小麦には地下水と灌漑の管理も関わります。',source:central.natural.source},
 agriculture:{title:'ベンガルの米、北の小麦、河川沿いの綿花',takeaway:'ベンガルの低地の米、パンジャーブの米・冬小麦、カザフスタン北部の春小麦、フェルガナ盆地の綿花を、雨の季節と水の確保から比較します。',reading:'品目を選んでも他の作物・家畜の分布を残し、同じ場所で営まれる農業を比べます。西部グジャラート州ではアナンド方式の集乳・加工・販売を、中央アジアでは綿花と綿製品の加工・輸出をつなげて読みます。家畜の分布は乳の集荷量ではありません。林業は別の項目からネパールの住民管理などを確認できます。',source:south.agriculture.source},
 industry:{title:'インドの州別産業と、地域の原料・加工・市場',takeaway:'国別の産業学習はインドを対象に、製造業とサービス業の州別分布を比べます。他の国は地域の特徴と重要産業の事例として読みます。',reading:'インドの製造業ではグジャラート州の総額とアナンドの集乳・加工、サービス業ではカルナータカ州の総額とベンガルールの通信基盤を区別します。中央アジアのウズベキスタンではフェルガナの綿花、綿製品の加工、隣国を通る輸送を比較します。「地域比較」の国別指標や商品貿易は国全体の値で、工場の位置や地域内の輸送経路を表しません。',source:south.industry.source},
 population:{title:'河川平野・沿岸・内陸の都市と、文化の特徴',takeaway:'デリーからベンガルの平野、ムンバイ・チェンナイの沿岸、タシケントなど内陸の都市の人口集中を、山地や乾燥域と比べます。',reading:'2020年の細かな人口格子と都市範囲から、人が集まる場所を確かめます。民族・宗教の特徴分布へ切り替えると、居住域や集団の参考分布を同じ地図で比較できます。州ごとの最多区分を塗る図ではなく、インドの2011年国勢調査による母語・宗教の構成比とも分けて読みます。',source:south.population.source},
};
