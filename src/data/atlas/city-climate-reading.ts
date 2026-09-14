import type { ProductId } from '../../lib/atlas-agriculture-detail-state';

type Source={name:string;url:string};
type RegionalProduct={name:string;product?:ProductId;examples?:string};
type CityReading={body:string;cause:string;causeSource:Source;agriculture:{region:string;products:RegionalProduct[];source:Source}};
const climate=(state:string):Source=>({name:'NOAA NCEI · 州の気候解説',url:`https://statesummaries.ncics.org/chapter/${state}/`});
const census=(state:string,fips:string):Source=>({name:'USDA NASS · 2022年農業センサス（郡別）',url:`https://www.nass.usda.gov/Publications/AgCensus/2022/Online_Resources/County_Profiles/${state}/cp${fips}.pdf`});

// Observations and classification still come only from climate-cities.json.
// Nearby county production is an example of regional agriculture, not an inference
// from a city's Köppen class. Product links use existing explanation categories.
export const cityClimateReading:Record<string,CityReading> = {
  'seattle':{
    body:'冬に雨が多く、夏は涼しく雨が少ない型です。',
    cause:'太平洋の湿った空気を低気圧が運び、冬を中心に雨を降らせます。海の影響で内陸ほど気温が上下せず、夏も比較的穏やかです。',causeSource:climate('wa'),
    agriculture:{region:'北方のスカジット郡',products:[{name:'酪農',product:'dairy'},{name:'果樹・野菜',product:'specialty',examples:'ジャガイモなど'}],source:census('Washington','53057')},
  },
  'san-francisco':{
    body:'夏は涼しく乾燥し、雨は冬に集中します。',
    cause:'夏は北太平洋高気圧が張り出し、低気圧は北を通ります。冬はその経路が南下して雨が増えます。海は夏の暑さも和らげます。',causeSource:climate('ca'),
    agriculture:{region:'北方のソノマ郡',products:[{name:'果樹・野菜',product:'specialty',examples:'ブドウなど'},{name:'酪農',product:'dairy'}],source:census('California','06097')},
  },
  'los-angeles':{
    body:'夏は暑く乾燥し、雨は冬に多くなります。',
    cause:'夏は北太平洋高気圧に覆われ、低気圧が北を通るため雨が減ります。冬は偏西風と低気圧の経路が南下し、太平洋から雨を運びます。',causeSource:climate('ca'),
    agriculture:{region:'北西のベンチュラ郡',products:[{name:'果樹・野菜',product:'specialty',examples:'レモン・アボカドなど'}],source:census('California','06111')},
  },
  'las-vegas':{
    body:'一年を通して雨が少なく、夏は非常に暑くなります。',
    cause:'太平洋からの湿った空気は、西側のシエラネバダ山脈などで雨や雪を落とします。山脈の風下では水分が届きにくく、乾燥します。',causeSource:climate('nv'),
    agriculture:{region:'ラスベガスを含むクラーク郡',products:[{name:'牧草'},{name:'果樹・野菜',product:'specialty',examples:'トマトなど'}],source:census('Nevada','32003')},
  },
  'denver':{
    body:'冬は寒く、雨は少なめですが春から初夏に増えます。',
    cause:'太平洋からの空気は山脈で水分を失い、ロッキー山脈の東側は雨陰になります。一方、春から夏には東側から湿気も入り、雨や雷雨をもたらします。',causeSource:{name:'Colorado State University · 気候と水',url:'https://waterknowledge.colostate.edu/climate/'},
    agriculture:{region:'北東のウェルド郡',products:[{name:'小麦',product:'wheat'},{name:'酪農',product:'dairy'}],source:census('Colorado','08123')},
  },
  'dallas':{
    body:'夏は暑く、春から初夏に雨が多くなります。',
    cause:'メキシコ湾から湿った空気が入り、雨の水分を供給します。平原には南北を隔てる山脈が少なく、冬には北からの寒気も届きます。',causeSource:climate('tx'),
    agriculture:{region:'北西のデントン郡',products:[{name:'小麦',product:'wheat'},{name:'牛の飼育'}],source:census('Texas','48121')},
  },
  'chicago':{
    body:'冬は氷点下となり、夏は暖かく雨も増えます。',
    cause:'内陸の平原を北からの寒気と南からの暖かく湿った空気が通り、季節差が大きくなります。ミシガン湖は沿岸の気温差を和らげます。',causeSource:climate('il'),
    agriculture:{region:'南西のウィル郡',products:[{name:'トウモロコシ',product:'corn'},{name:'大豆',product:'soybean'}],source:census('Illinois','17197')},
  },
  'detroit':{
    body:'冬は氷点下、夏は暖かく、年間を通して雨が降ります。',
    cause:'大陸内陸の寒暖の変化を受けるため、夏と冬の気温差が大きくなります。一方、周囲の五大湖は気温差を和らげ、湿気も供給します。',causeSource:climate('mi'),
    agriculture:{region:'南方のモンロー郡',products:[{name:'大豆',product:'soybean'},{name:'トウモロコシ',product:'corn'}],source:census('Michigan','26115')},
  },
  'new-orleans':{
    body:'夏は暑く冬も比較的温暖で、雨は一年中多い都市です。',
    cause:'近くのメキシコ湾が熱と水分を供給し、冬の寒さを和らげます。暖かい季節には大西洋の高気圧の縁を回る南風が湿気を運びます。',causeSource:climate('la'),
    agriculture:{region:'西方のセントジェームズ郡',products:[{name:'サトウキビ'},{name:'大豆',product:'soybean'}],source:census('Louisiana','22093')},
  },
  'miami':{
    body:'冬も暖かく、雨は夏に多く冬には少なくなります。',
    cause:'低緯度にあり暖かい海に囲まれるため、冬も気温が下がりにくい都市です。夏は大西洋から湿った空気が入り、雷雨が増えます。',causeSource:climate('fl'),
    agriculture:{region:'マイアミを含むマイアミデイド郡',products:[{name:'果樹・野菜',product:'specialty',examples:'アボカドなど'}],source:census('Florida','12086')},
  },
  'washington-dc':{
    body:'観測地点の分類は欠測。暑い夏と寒い冬、通年の雨が見られます。',
    cause:'大陸内陸の寒暖の変化と、大西洋の湿った空気の両方を受けます。偏西風に沿う低気圧が通り、各季節に雨や雪をもたらします。',causeSource:climate('md'),
    agriculture:{region:'北西のフレデリック郡（メリーランド）',products:[{name:'酪農',product:'dairy'},{name:'トウモロコシ',product:'corn'}],source:census('Maryland','24021')},
  },
  'new-york':{
    body:'夏は暑く、冬は寒く、明瞭な乾季はありません。',
    cause:'偏西風が大陸内部の空気を運び、冬には強い寒気も届きます。大西洋が気温差を和らげる一方、低気圧の通過が降水をもたらします。',causeSource:climate('ny'),
    agriculture:{region:'北方のオレンジ郡（ニューヨーク）',products:[{name:'酪農',product:'dairy'},{name:'果樹・野菜',product:'specialty',examples:'タマネギなど'}],source:census('New_York','36071')},
  },
};

export const cityClimateCodes:Record<string,{name:string;meaning:string}> = {
  Csa:{name:'地中海性気候（暑い夏）',meaning:'C：温帯 · s：夏に乾燥 · a：暑い夏'},
  Csb:{name:'地中海性気候（温暖な夏）',meaning:'C：温帯 · s：夏に乾燥 · b：温暖な夏'},
  BWh:{name:'砂漠気候（高温）',meaning:'B：乾燥帯 · W：砂漠 · h：年平均18℃以上'},
  BSk:{name:'ステップ気候（低温）',meaning:'B：乾燥帯 · S：ステップ · k：年平均18℃未満'},
  Cfa:{name:'温暖湿潤気候',meaning:'C：温帯 · f：明瞭な乾季なし · a：暑い夏'},
  Dfa:{name:'冷帯湿潤気候（暑い夏）',meaning:'D：冷帯 · f：明瞭な乾季なし · a：暑い夏'},
  Am:{name:'熱帯モンスーン気候',meaning:'A：熱帯 · m：短い乾季のあるモンスーン型'},
};
