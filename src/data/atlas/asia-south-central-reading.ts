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
 population:{title:'ガンジス・ベンガル平野と中央アジアの都市',takeaway:'ガンジス川沿いからベンガルの低地へ人口の濃い帯が続きます。中央アジアでは広い疎らな土地の中に、タシケント・アルマトイなど都市周辺のまとまりが見えます。',reading:'2020年の人口格子では、河川平野の連続した集積と、乾燥域の都市・灌漑地域の集積の形が違います。河川水と農地、輸送、都市の仕事は立地を考える手掛かりですが、この分布図だけではそれぞれの影響を確定できません。人口密度は格子面積当たりの推計で、最新の住民登録人数ではありません。',source:south.population.source},
};
