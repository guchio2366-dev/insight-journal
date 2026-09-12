export type ExplorerField = 'overview' | 'agriculture' | 'land';

export const cropExplanations = [
  { id: 'corn', name: 'とうもろこし', color: '#ecc759', summary: '夏の温度と水分、広い耕地、飼料・加工・輸送の集積が結びつく。', paragraphs: [
    'とうもろこしは、暖かい生育期と十分な水分がある場所で育ちやすい作物です。米国中西部には夏の温度と降水、まとまった平坦な耕地があり、大型機械を使う栽培に適した条件が重なります。',
    'そこへ、収穫物を乾燥・保管する施設、畜産向け飼料や加工の需要、河川・鉄道による輸送網が集まりました。自然条件と収穫後の仕組みが組み合わさって、州境をまたぐ主要産地が続いています。'
  ], uses: '家畜の飼料、エタノール、でんぷん・甘味料など。生食用のスイートコーンと、ここで主に扱う穀粒用とうもろこしは区別します。', sources: ['source-usda-midwest', 'source-usda-feed'] },
  { id: 'soybean', name: '大豆', color: '#a5bb74', summary: '中西部でとうもろこしの栽培域と重なる。重なりは同じ畑での同時栽培を意味しない。', paragraphs: [
    '大豆も生育期の温度と水分を必要とします。根粒菌による窒素固定が特徴ですが、肥料が一切不要でも、やせた土地ならどこでも高い収量が得られるわけでもありません。',
    '米国中西部では、とうもろこしと共通する夏の生育条件と広い耕地を利用でき、輪作にも組み込まれています。搾油、飼料、輸出のための加工・輸送網も共有できるため、二つの作物が近接してまとまる地域になっています。'
  ], uses: '搾油した大豆油と、油を取った後の大豆ミール。ミールは重要なたんぱく質飼料です。油は食品や燃料などに使われます。', sources: ['source-usda-midwest','source-usda-soy'] },
  { id: 'wheat', name: '小麦', color: '#d5a56c', summary: '北部の春小麦、中央・南部の冬小麦など、作型の違いを含む分布。', paragraphs: [
    '小麦には、秋にまいて越冬する冬小麦と、春にまく春小麦など、異なる気候に合わせた作型があります。水田のような湛水を必要とせず、比較的乾燥した地域でも栽培されますが、生育期の水分不足は収量を下げます。',
    '米国では、東から西へ降水が減る大平原や、太平洋岸北西部の内陸などに主要産地があります。寒さと雨の時期に合う品種・作型を選び、広い耕地と集荷・輸送の仕組みを利用してきたことが、地域への定着を支えています。'
  ], uses: '製粉してパン、麺、菓子などに。硬質・軟質、たんぱく質含有量などの違いによって適した用途が変わります。', sources: ['source-usda-wheat'] },
  { id: 'cotton', name: '綿花', color: '#b886b2', summary: '長く暖かい生育期が必要。南東部と、乾燥したテキサス西部では水の条件が異なる。', paragraphs: [
    '綿花は暖かく霜のない生育期間を必要とし、収穫期の雨は品質や収穫作業に影響します。ただし、暖かいだけで十分ではなく、生育期に利用できる水も重要です。',
    '米国南部は長い生育期間を確保しやすく、綿繰りなどの加工施設とともに綿花産地が形成されました。より乾燥するテキサス西部では灌漑の役割が大きい一方、天水栽培もあり、地域内でも水利用は一様ではありません。歴史的な土地・労働制度と、現在の機械化された生産は、時代を分けて考える必要があります。'
  ], uses: '主な対象は衣料・繊維製品に使う原綿です。綿実は油や飼料に利用されますが、原綿と綿実の生産量は混ぜません。', sources: ['source-usda-cotton'] },
  { id: 'rice', name: '稲作', color: '#54acd0', summary: '平坦な低地と水管理の組み合わせ。雨の少ないカリフォルニアにも産地がある。', paragraphs: [
    '水稲では、暖かい生育期に加え、田へ水を供給し、必要に応じて排水できることが大切です。したがって、年間降水量の多さだけでは産地を説明できません。',
    'ミシシッピ川下流や湾岸には平坦な土地が広がり、水管理と大規模栽培を組み合わせやすい条件があります。カリフォルニアのサクラメントバレーは夏に乾燥しますが、貯水・灌漑が水を補います。どちらも、土地と水利の組み合わせが稲作の定着を支えています。'
  ], uses: '精米して食用にするほか、加工食品などに。籾の重さと精米後の重さは異なるため、生産・貿易統計では換算基準をそろえます。', sources: ['source-usda-rice'] },
  { id: 'specialty', name: '果樹・野菜', color: '#e89c6c', summary: '複数の園芸作物をまとめた区分。個々の品目が同じ条件を好むわけではない。', paragraphs: [
    '果樹・野菜はひとつの作物ではなく、必要な温度、水、土壌、労働が品目ごとに違います。この地図では、細かい分類を一目で読めるように、野菜・果樹・ナッツ類などをまとめています。',
    'カリフォルニアでは、日照の多い生育期と灌漑、谷底の農地、加工・流通網が多様な園芸作物の栽培を支えます。冷涼な沿岸と暑い内陸では適した品目が変わるため、この色の範囲を「どこでも同じ作物が育つ場所」とは読まないでください。'
  ], uses: '生鮮食品、加工食品、果汁、ナッツ類など。生産や輸出の統計は、この総称ではなく代表的な個別品目で整理する予定です。', sources: ['source-usda-cdl-faq','source-california-water-agriculture'] }
];

// These are geographic label/annotation anchors, never agricultural boundary geometry.
export const geographicLabels = [
  {id:'rockies', name:'ロッキー山脈', lng:-111, lat:43.2, kind:'physical', priority:2},
  {id:'plains', name:'グレートプレーンズ', lng:-102.4, lat:39.8, kind:'physical', priority:2},
  {id:'central', name:'中央平原', lng:-92, lat:37.3, kind:'physical', priority:3},
  {id:'appalachians', name:'アパラチア山脈', lng:-80.8, lat:37.4, kind:'physical', priority:2},
  {id:'lakes', name:'五大湖', lng:-83.8, lat:45.1, kind:'water', priority:1},
  {id:'mississippi', name:'ミシシッピ川', lng:-90.7, lat:33.1, kind:'water', priority:2},
  {id:'pacific', name:'太平洋', lng:-125.5, lat:33.2, kind:'water', priority:3},
  {id:'atlantic', name:'大西洋', lng:-72.5, lat:32.7, kind:'water', priority:3},
  {id:'gulf', name:'メキシコ湾', lng:-89.5, lat:26.5, kind:'water', priority:2},
  {id:'canada', name:'カナダ', lng:-102, lat:50.7, kind:'country', priority:3},
  {id:'mexico', name:'メキシコ', lng:-106, lat:26.2, kind:'country', priority:3}
];
