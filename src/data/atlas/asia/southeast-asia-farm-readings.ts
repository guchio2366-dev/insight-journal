import type {PlaceReading} from '../asia-place-readings';

// Reading locations, not farms, factories, measured irrigation sites or new estimates.
export const southeastAsiaFarmReadings:PlaceReading[]=[
 {
  id:'daklak-coffee',region:'southeast-asia',field:'agriculture',country:'VNM',topic:'robusta',point:[108.05,12.7],
  name:'ベトナム中央高地：コーヒーと乾季の水',
  lead:'雨の多い熱帯でも、開花期に水が足りるとは限りません。',
  reading:'FAO掲載のベトナム農林研究者の報告は、中央高地のロブスタ栽培について、雨が5～10月に偏り、11～4月の乾季に水を補う必要があることを説明しています。2月と8月の平年降水量を比べ、次に標高を確かめます。コーヒーの立地は、年降水量だけでなく、季節配分と高地の条件を分けて考えると読みやすくなります。',
  scope:'2000年代初めの栽培報告を背景に、2020年の推計収穫面積と1991～2020年の月降水量を比較します。点は特定農園ではなく、平年値から現在の灌漑量や干ばつ被害は分かりません。貿易HS09には茶・香辛料も含まれ、ロブスタだけの輸出ではありません。',
  source:{label:'FAO・ベトナムのコーヒー生産報告（2000年代初め、Western Highlands研究者）',url:'https://www.fao.org/4/x6938e/x6938e05.htm'},
  bridges:[
   {field:'natural',topic:'seasonal-precipitation',detail:'m-02',label:'乾季の2月と雨季の8月の雨を比べる',question:'コーヒーの地点で、雨が一年のどの時期に少なくなるかを確かめます。年降水量と開花期の水供給は同じでしょうか。'},
   {field:'natural',topic:'terrain',label:'中央高地の標高を比べる'},
   {field:'industry',topic:'trade-exports',detail:'t-09',label:'ベトナム全体のコーヒー・茶・香辛料輸出を比べる'},
  ],
 },
 {
  id:'southern-thailand-rubber',region:'southeast-asia',field:'agriculture',country:'THA',topic:'rubber',point:[99.6,8.3],
  name:'タイ南部：ゴムの栽培から製品へ',
  lead:'樹液を得る産地と、タイヤや手袋を作る加工拠点を分けて読む。',
  reading:'タイ投資委員会の2018年資料は、南部のモンスーン気候とゴム栽培、小規模な生産者から集荷して加工する仕組みを説明しています。天然ゴムはタイヤだけでなく、手袋などにも使われます。同じ場所の雨の季節配分を確かめてから国全体のゴム製品の貿易へ移り、栽培・集荷・加工という段階をつなげて読みます。',
  scope:'2018年の産業紹介を現在の企業数・収量・輸出シェアとは扱いません。2020年の地図はゴムの推計収穫面積で、工場や輸送経路を示しません。HS40は天然ゴムと加工品などを含む章で、HS4001の天然ゴムとは範囲が異なります。',
  source:{label:'タイ投資委員会・天然ゴム産業（2018年9月）',url:'https://www.boi.go.th/upload/content/Rubber_Industry2018_5bb33471b8292.pdf'},
  bridges:[
   {field:'natural',topic:'seasonal-precipitation',detail:'m-11',label:'南部の11月と2月の雨を比べる',question:'南部のゴム産地では、雨の多い月が大陸内陸部と同じでしょうか。12か月の平年値で確かめます。'},
   {field:'natural',topic:'climate',label:'同じ地点の気候区分を比べる'},
   {field:'industry',topic:'trade-exports',detail:'t-40',label:'タイ全体のゴム・ゴム製品輸出を比べる'},
  ],
 },
 {
  id:'sabah-oilpalm',region:'southeast-asia',field:'agriculture',country:'MYS',topic:'oilpalm',point:[117.9,5.3],
  name:'ボルネオ島・サバ：油ヤシと雨・土地利用',
  lead:'油ヤシ農園、樹木の覆い、森林という三つの情報を区別する。',
  reading:'マレーシアパーム油庁の研究紹介は、同国の油ヤシ農園の多くが雨を利用して育てられることを説明しています。サバ州東部を例に、油ヤシの分布と月ごとの雨を見比べます。森林参考図へ切り替えるときは、樹木が見えることと森林として土地を利用していることを区別し、果実を収穫して油へ加工する段階も分けて考えます。',
  scope:'説明の根拠はマレーシア全体の研究で、選択点を調査農園として示しません。地図から個別農園の水使用量・土地転換時期・持続可能性は判定できません。FAOSTATの油ヤシ生産は果実重量、HS15は各種油脂を含む貿易額です。両者を直接割り算しません。',
  source:{label:'MPOB・油ヤシ栽培とパーム油生産の水利用研究紹介（2020年公開）',url:'https://opb.mpob.gov.my/consumptive-water-use-assessment-and-life-cycle-assessment-based-water-footprint-for-palm-oil/'},
  bridges:[
   {field:'natural',topic:'seasonal-precipitation',detail:'m-02',label:'油ヤシの地点で12か月の雨を比べる',question:'年降水量だけでなく、月ごとの少雨期と多雨期を確かめます。雨の分布を農園の取水量と混同しないで読みます。'},
   {field:'agriculture',topic:'forest',label:'同じ地点の森林参考図を比べる'},
   {field:'industry',topic:'trade-exports',detail:'t-15',label:'マレーシア全体の油脂類輸出を比べる'},
  ],
 },
];
