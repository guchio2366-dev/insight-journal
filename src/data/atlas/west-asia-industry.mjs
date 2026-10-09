// Approximate locators for places and the Upper Zakum offshore area, not
// surveyed facility/field boundaries or measured flows.
// Each entry points to an operator or public agency describing the activity.
export const westIndustrySites = [
  {id:'eastern-oil',name:'東部油田地帯',country:'SAU',kind:'resource',coordinates:[49.8,25.3],source:'saudi',description:'サウジ東部に原油の主要な産地が集まります。採掘と精製・輸送を別の段階として読みます。'},
  {id:'ras-tanura',name:'ラス・タヌラ',country:'SAU',kind:'processing',activity:'refining',coordinates:[50.16,26.64],source:'saudi',description:'ペルシャ湾岸の製油・原油積出し拠点です。記号は都市付近を示し、施設の敷地を描いたものではありません。'},
  {id:'jubail',name:'ジュバイル',country:'SAU',kind:'processing',activity:'petrochemical',coordinates:[49.66,27.0],source:'jubail',description:'石油化学の集積地です。原油・ガスを採る段階と化学原料・製品へ加工する段階を区別します。'},
  {id:'yanbu',name:'ヤンブー',country:'SAU',kind:'transit',coordinates:[38.06,24.09],source:'saudi',description:'紅海側の精製・積出し拠点です。東部から紅海へ向かう輸送経路を考える手掛かりです。'},
  {id:'upper-zakum',name:'上部ザクム油田の沖合',country:'ARE',kind:'resource',coordinates:[53.85,24.97],source:'adnoc',description:'ADNOCによると上部ザクム油田はアブダビの北西約84kmの沖合です。記号はその海域の概略位置であり、油田の境界や井戸の座標ではありません。'},
  {id:'ruwais',name:'ルワイス',country:'ARE',kind:'processing',activity:'refining',coordinates:[52.73,24.08],source:'uae',description:'アブダビ西部の製油・石油化学拠点です。'},
  {id:'jebel-ali',name:'ジュベル・アリ港',country:'ARE',kind:'transit',coordinates:[55.06,24.99],source:'port',description:'ドバイの港湾・物流拠点です。輸入、積替え、国内向け配送を区別して読みます。'},
  {id:'bursa',name:'ブルサ',country:'TUR',kind:'manufacturing',coordinates:[29.06,40.19],source:'auto',description:'トルコの自動車産業の集積地の一つです。組立だけでなく部品・研究開発も関わります。'},
  {id:'kocaeli',name:'コジャエリ',country:'TUR',kind:'manufacturing',coordinates:[29.94,40.77],source:'auto',description:'マルマラ海周辺の自動車・部品の製造地帯です。欧州への輸送路にも近接します。'},
  {id:'hormuz',name:'ホルムズ海峡',country:'network',kind:'transit',coordinates:[56.48,26.58],source:'transit',description:'ペルシャ湾から外洋への通過点です。ここを通る貨物をイランやオマーンの生産量には数えません。'},
  {id:'suez',name:'スエズ運河',country:'network',kind:'transit',coordinates:[32.34,30.14],source:'suez',description:'紅海と地中海を結ぶ通過点です。運河の位置は貨物の輸出先や通航量を表しません。'},
  {id:'ras-laffan',name:'ラス・ラファン',country:'network',kind:'transit',coordinates:[51.53,25.92],source:'qatar',description:'カタールのLNG輸出港です。地域供給網の例であり、国別産業比較の対象には含めません。'},
];
export const westIndustryKind = {resource:'採掘・資源',processing:'精製・石油化学',manufacturing:'自動車製造',transit:'港・通過点'};
export const westIndustryRoles = {
  'industry-network':null,
  'industry-extraction':['resource'],
  'industry-refining':['processing'],
  'industry-petrochemical':['processing'],
  'industry-ports':['transit'],
  'industry-automotive':['manufacturing'],
};
