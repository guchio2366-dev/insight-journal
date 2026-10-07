import type {PlaceReading} from '../asia-place-readings.ts';

const indonesiaUrban={
 label:'世界銀行・インドネシアの都市化と産業（2019年10月3日）',
 url:'https://www.worldbank.org/en/country/indonesia/publication/augment-connect-target-realizing-indonesias-urban-potential',
};
const vietnamUrban={
 label:'世界銀行・Vietnam Urbanization Review（2011年、本文32–33・60頁）',
 url:'https://documents1.worldbank.org/curated/en/225041468177548577/pdf/669160ESW0P1130Review000Full0report.pdf#page=56',
};

// Locations guide a regional reading; they are not factory records or new
// subnational estimates. The national WDI and trade observations stay intact.
export const southeastAsiaPlaceReadings:PlaceReading[]=[
 {
  id:'jakarta-industry',region:'southeast-asia',field:'industry',country:'IDN',
  topic:'manufacturing',point:[106.85,-6.2],
  name:'ジャカルタ：産業・サービスと都市のつながり',
  lead:'ジャワ島の都市のまとまりを、生産・仕事・市場への接続から読む。',
  reading:'世界銀行の2019年の報告紹介は、都市に人や経済活動が集まることによる生産性の利点と、農業中心から工業・サービス業への変化を説明しています。ジャカルタのような大都市では、都市内の仕事への移動と、他の都市・農村・海外市場への接続が関わります。人口図でジャワ島の都市のまとまりを確かめ、製造業とサービス業の国全体の構成を別々に比べます。',
  scope:'点はジャカルタを見るための位置で、工場や工業地区の境界ではありません。2019年の都市化の説明、2020年の人口推計、2024年の国全体のGDP比を区別します。この版にインドネシアの州別・都市別の製造業付加価値はなく、国の比率をジャカルタやジャワ島へ配分しません。',
  source:indonesiaUrban,
  bridges:[
   {field:'population',topic:'urban',detail:'uc-5472',relocate:true,label:'ジャカルタの都市範囲と人口を比べる'},
   {field:'industry',topic:'services',label:'インドネシア全体のサービス業を比べる'},
   {field:'industry',topic:'trade-exports',detail:'t-87',label:'インドネシア全体の車両・部分品輸出を比べる'},
  ],
 },
 {
  id:'hochiminh-industry',region:'southeast-asia',field:'industry',country:'VNM',
  topic:'manufacturing',point:[106.7,10.78],
  name:'ホーチミン周辺：製造業と港・市場',
  lead:'南部の製造業を、都市の外にも続く生産と物流の関係から読む。',
  reading:'世界銀行の2011年の都市化報告は、ホーチミンと周辺地域の製造業の集まり、港を通じた海外市場への接続を説明しています。企業の集積は市の行政境界だけに収まらず、部品・素材の供給、働く人の技能、知識の共有も生産を支えます。北部のハノイ周辺の事例と比べ、国全体の製造業のGDP比と、国内のどこに生産活動が集まるかを分けて読みます。',
  scope:'2011年報告の歴史的な立地の説明です。報告内の港の将来計画を現在の完成状況として扱いません。点は工場や港の台帳ではなく、この版の地図の数値は2024年のベトナム全体の製造業です。2023年の電気機器輸出も国全体の値であり、南部だけの生産・輸出額ではありません。',
  source:vietnamUrban,
  bridges:[
   {field:'population',topic:'urban',detail:'uc-5239',relocate:true,label:'ホーチミンの都市範囲と人口を比べる'},
   {field:'industry',topic:'trade-exports',detail:'t-85',label:'ベトナム全体の電気機器輸出を比べる'},
   {field:'industry',topic:'trade-imports',detail:'t-85',label:'ベトナム全体の電気機器輸入を別に比べる'},
  ],
 },
 {
  id:'hanoi-industry',region:'southeast-asia',field:'industry',country:'VNM',
  topic:'manufacturing',point:[105.85,21.03],
  name:'ハノイ周辺：紅河デルタの工業と交通',
  lead:'北部の製造業を、周辺の企業群と海への出口から読む。',
  reading:'世界銀行の2011年報告は、ハノイと紅河デルタの工業化に中国南部の産業地域への近さが関わり、ハイフォンがハノイの海への玄関口となることを説明しています。都市周辺の製造業を、企業間の供給・人材・交通のつながりから読み、ホーチミン周辺の港と製造業の事例と比べます。',
  scope:'2011年の報告が扱う立地の背景であり、現在の企業数・物流経路・港の能力を示しません。点はハノイ周辺を読むための位置です。この版は北部と南部の製造業額を分けて収録していないため、2024年の国全体のGDP比から紅河デルタの生産額や順位を求めません。',
  source:{...vietnamUrban,label:'世界銀行・Vietnam Urbanization Review（2011年、本文32・60頁）',url:vietnamUrban.url.replace('#page=56','#page=84')},
  bridges:[
   {field:'population',topic:'urban',detail:'uc-1999',relocate:true,label:'ハノイの都市範囲と人口を比べる'},
   {field:'industry',topic:'trade-exports',detail:'t-87',label:'ベトナム全体の車両・部分品輸出を比べる'},
   {field:'industry',topic:'services',label:'ベトナム全体のサービス業を比べる'},
  ],
 },
];
