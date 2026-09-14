// City copy describes the existing 1991–2020 monthly observations. Classification
// comes only from climate-cities.json; crop examples reuse the sourced overview.
export const cityClimateReading:Record<string,{body:string;cropGroup?:string;crop?:string}> = {
  'seattle':{body:'冬に雨が多く、夏は雨が少なくなります。夏の気温は比較的穏やかで、南のロサンゼルスより涼しい夏になります。'},
  'san-francisco':{body:'雨は冬に集中し、夏はほとんど降りません。夏の気温もあまり上がらず、同じ地中海性でもロサンゼルスより涼しい型です。',cropGroup:'地中海性気候',crop:'カリフォルニアではブドウやオリーブを栽培。夏の乾燥を踏まえ、水源や品種に合う場所を選びます。'},
  'los-angeles':{body:'夏は暑く乾燥し、雨は冬に多くなります。雨温図では、気温が高くなる季節と、雨の多い季節がずれているのが特徴です。',cropGroup:'地中海性気候',crop:'カリフォルニアではブドウやオリーブを栽培。夏の乾燥を踏まえ、水源や品種に合う場所を選びます。'},
  'las-vegas':{body:'一年を通して降水量が少なく、夏は非常に暑くなります。冬には気温が下がり、夏と冬の気温差も大きい都市です。'},
  'denver':{body:'降水量は少なめですが、春から初夏にはやや増えます。冬は寒く、夏との気温差が大きい、内陸の半乾燥の気候です。'},
  'dallas':{body:'夏は暑く、春から初夏に雨が多くなります。盛夏には雨が減りますが、年間を通した分類では明瞭な乾季のない型です。'},
  'chicago':{body:'冬の月平均気温は氷点下となり、夏は暖かくなります。春から夏に雨が増え、冬と夏の気温差が大きくなります。',cropGroup:'冷帯（亜寒帯）気候',crop:'中西部では、暖かい生育期を利用してトウモロコシや大豆を栽培。冬の寒さと霜の時期も栽培期間に関わります。'},
  'detroit':{body:'冬は氷点下となる一方、夏には気温が上がります。雨は一年を通して降り、春から夏にはやや多くなります。',cropGroup:'冷帯（亜寒帯）気候',crop:'中西部では、暖かい生育期を利用してトウモロコシや大豆を栽培。冬の寒さと霜の時期も栽培期間に関わります。'},
  'new-orleans':{body:'夏は高温で、冬も比較的温暖です。年間を通して雨が多く、雨温図では各月の降水量の棒が高く並びます。'},
  'miami':{body:'一年を通して暖かく、冬も月平均気温が高い都市です。夏を中心に雨が多く、冬には少なくなる季節差があります。',cropGroup:'熱帯の気候',crop:'南フロリダではマンゴーなどの熱帯果樹を栽培。低温や霜を避けることに加え、開花期の雨の少なさも関わります。'},
  'washington-dc':{body:'この観測所の位置には分類データがありません。雨温図では、暑い夏と寒い冬、年間を通した降水を読み取れます。'},
  'new-york':{body:'夏は暑く、冬には気温が大きく下がります。各月に降水があり、明瞭な乾季がないことを雨温図から読み取れます。'},
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
