/** Editorial pilot: key sentences explain why the mapped distribution exists. */
type ReadingSection={heading:string;subtitle?:string;key:string;body:string;paragraphs?:{label:string;text:string}[];actions:{label:string;insight?:string;href?:string}[]};
/** Five entry points; the full explanation belongs to the selected destination. */
export const cornStories = [
  {id:'central-lowland',label:'土地と機械',key:'平らで肥沃な土地が、大型機械を使ったトウモロコシの大規模栽培を支える。',map:'トウモロコシの栽培域と中央低地を重ねる',summary:'平らな土地は大型機械での作業に適し、肥沃な土壌は作物の生育を支えます。',section:0},
  {id:'interior-rainfall',label:'東西の雨',key:'産地を東西にたどると雨の条件が変わる。年降水量500mm線がその目安。',map:'トウモロコシの栽培域と年降水量500mm線を重ねる',summary:'500mm線は東西の乾湿差を見る目安です。栽培の境界を示す線ではありません。',section:1},
  {id:'corn-pivot-water',label:'雨と地下水',key:'雨の少ない西寄りの産地では、地下水を使う灌漑が雨の不足を補う。',map:'トウモロコシの栽培域とハイプレーンズ帯水層・500mm線を重ねる',summary:'灌漑は、畑に必要な水を人工的に供給すること。西寄りの産地の一部では、帯水層からくみ上げた地下水を使います。',section:1},
  {id:'corn-hogs',label:'作物と養豚',key:'トウモロコシは豚の飼料に。中西部では、その産地と養豚地域が重なる。',map:'トウモロコシ・大豆の栽培域と養豚地域を重ねる',summary:'飼料の産地に近ければ、大量に必要な餌を集めやすくなります。アイオワ州などでは、とうもろこし・大豆の生産と養豚が結び付いています。',section:2},
  {id:'grain-rivers',label:'産地と輸出',key:'ミシシッピ川の水運が、内陸のトウモロコシ産地を輸出港、そして世界へつなぐ。',map:'トウモロコシの栽培域とミシシッピ川・オハイオ川を重ねる',summary:'トラックや鉄道で集めた穀物を、川の水運も使ってメキシコ湾岸の港へ。大量の穀物をまとめて運ぶ仕組みが、内陸の産地を海外市場と結びます。',section:3},
] as const;
export const cornReading:{takeaway:string;sections:ReadingSection[]} = {
  takeaway:'中西部の肥沃な土地と暖かく湿潤な夏が大規模生産を支え、収穫物は飼料・燃料・輸出へつながる。',
  sections:[
    {
      heading:'産地と土地',
      key:'中心は、米国中西部のコーンベルト。',
      body:'コーンベルトは、とうもろこしと大豆の栽培が集まる地帯です。米国中央部に広がる低地・平原「中央低地」を中心に、起伏の小さい農地が広がります。斜面や段差が少ないため、大型のトラクターや収穫機で広い畑を連続して作業でき、大規模な生産に適しています。草原の根や枯れ草に由来する有機物が蓄積した、黒く肥沃な土壌も重要です。この草原由来の黒土は、高校地理では地域名を用いて「プレーリー土」と呼ばれます。',
      actions:[{label:'地形と産地を重ねる',insight:'central-lowland'},{label:'西へ向かう標高の変化を見る',insight:'plains-elevation'}]
    },
    {
      heading:'夏の気候と水',subtitle:'暖かく湿潤な夏・西ほど乾燥',
      key:'暖かい生育期と水が必要で、西寄りの産地では灌漑が水を補う。',
      body:'春に種をまき、夏に成長して秋に収穫します。中西部の夏の温かさと降雨はこの生育を支え、特に受粉して実がつく時期の水不足は収量に響きます。西へ進むほど乾燥が強まり、ハイプレーンズ帯水層（内陸の大平原の地下で水を蓄える砂・礫などの層）の地下水を利用する地域があります。センターピボットは、長い散水管が支点の周りを回る灌漑方式。上空から見える円形の畑は、その散水範囲です。',
      actions:[{label:'500mm線と産地の東西差を見る',insight:'interior-rainfall'},{label:'地下水と円形の畑の写真を見る',insight:'corn-pivot-water'}]
    },
    {
      heading:'用途と畜産との関係',
      key:'大きな用途は、家畜の飼料と燃料用エタノール。',
      body:'',
      paragraphs:[
        {label:'飼料｜家畜のエネルギー源',text:'とうもろこしは豚・牛・鶏に与える飼料のエネルギー源です。大豆を搾油した後の大豆ミールがたんぱく源となり、二つの作物が畜産を支えます。農地では大豆と年ごとに作物を替える「輪作」も行われます。'},
        {label:'エタノール｜自動車の燃料',text:'でんぷんを糖に分解して発酵させてつくるアルコールで、ガソリンに混ぜて使います。製造後に残る蒸留かすも飼料として利用されます。'},
        {label:'その他｜食品・工業原料',text:'でんぷん、甘味料、食用油などにも加工されます。'}
      ],
      actions:[{label:'作物と養豚の重なりを見る',href:'#relation-corn-soy-hogs'},{label:'用途ごとの割合を見る',href:'#supply-use-corn'}]
    },
    {
      heading:'内陸から輸出港へ',
      key:'大産地を輸出につなぐのが、河川と集荷・輸送網。',
      body:'収穫物はトラックや鉄道で集められ、ミシシッピ川（米国中央部を南へ流れる大河）と、その東側から合流するオハイオ川などの水運も使って、メキシコ湾（米国南側の海）の沿岸の輸出港へ運ばれます。多くの穀物をまとめて運ぶ経路が、内陸の農業と海外の需要を結びます。',
      actions:[{label:'川を産地から輸出港へたどる',insight:'grain-rivers'},{label:'輸出先と割合を見る',href:'#exports-corn'}]
    }
  ]
};
