import type {PlaceReading} from '../asia-place-readings.ts';

const indonesiaUrban={
 label:'世界銀行・インドネシアの都市化と産業（2019年10月3日）',
 url:'https://www.worldbank.org/en/country/indonesia/publication/augment-connect-target-realizing-indonesias-urban-potential',
};
const vietnamUrban={
 label:'世界銀行・Vietnam Urbanization Review（2011年、本文32–33・60頁）',
 url:'https://documents1.worldbank.org/curated/en/225041468177548577/pdf/669160ESW0P1130Review000Full0report.pdf#page=56',
};
const ghslPopulation={
 label:'欧州委員会JRC・GHS-POP R2023A（2020年人口）',
 url:'https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php',
};
const ghslUrban={label:'欧州委員会JRC・GHS-UCDB R2024A（都市範囲）',url:'https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php'};

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
 {
  id:'jakarta-population',region:'southeast-asia',field:'population',country:'IDN',topic:'urban',detail:'uc-5472',
  name:'ジャワ島西部：ジャカルタと都市の外側',
  lead:'都市の輪郭を越えて続く人口の濃い格子を、ジャワ島の広がりの中で読む。',
  reading:'2020年の人口格子ではジャワ島西部に人口の濃い場所が続きます。ジャカルタの都市輪郭の内側と外側を比べ、都市のまとまりと島全体の分布を区別します。世界銀行の2019年報告は、都市間や周辺農村との接続、都市内の仕事・公共サービスへの移動が都市化の利益と課題に関わると説明します。人口の色を見てから製造業の国計へ移り、人の集まりと産業の立地を異なる資料で確かめます。',
  scope:'人口密度はGHS-POPの2020年推計、都市の輪郭はGHS-UCDBの2025年の固定範囲、都市化の説明は2019年の報告です。輪郭はジャカルタの行政市域や通勤圏ではありません。格子から各人の勤務先・移動経路や製造業従業者数を求められず、密度だけで集積の原因を断定できません。',
  source:ghslPopulation,additionalSources:[ghslUrban,indonesiaUrban],
  bridges:[
   {field:'industry',topic:'manufacturing',label:'インドネシア全体の製造業を比べる'},
   {field:'natural',topic:'terrain',label:'同じ範囲の低地と山地を比べる'},
  ],
 },
 {
  id:'hanoi-population',region:'southeast-asia',field:'population',country:'VNM',topic:'urban',detail:'uc-1999',
  name:'紅河デルタ：ハノイと周辺の人口',
  lead:'ハノイの都市輪郭と紅河デルタの人口の広がりを分けて読む。',
  reading:'2020年の人口格子でハノイ周辺と紅河デルタの濃い場所を確かめます。世界銀行の2011年報告は、当時のハノイ周辺の製造業が市中心部だけでなく郊外へ広がることを示しました。都市人口のまとまりと産業の立地は重なっても同じ範囲ではありません。地図の都市輪郭の外側を見てから、北部の工業と交通を説明する事例へ進みます。',
  scope:'人口格子は2020年推計、都市輪郭は2025年の資料、製造業の記述は2011年報告の歴史的な状況です。2024年のベトナム全体の製造業GDP比をハノイや紅河デルタへ配分しません。人口密度から工場の位置や通勤の方向は分かりません。',
  source:ghslPopulation,additionalSources:[ghslUrban,vietnamUrban],
  bridges:[
   {field:'industry',topic:'manufacturing',label:'ベトナム全体の製造業を比べる'},
   {field:'natural',topic:'basins',point:[105.83480923706833,21.010418154216897],label:'ハノイの都市代表点を含む流域を比べる'},
  ],
 },
 {
  id:'hochiminh-population',region:'southeast-asia',field:'population',country:'VNM',topic:'urban',detail:'uc-5239',
  name:'ホーチミン：都市中心と周囲の人口',
  lead:'南部の都市輪郭と、その外側の人口密度を比べる。',
  reading:'2020年の人口格子でホーチミン中心部と周辺を同じ色の目盛りで比べます。世界銀行の2011年報告は2009年の人口・市街地資料を使い、当時は中心から距離が増すにつれて市街地の密度が下がる様子を示しました。現在の格子分布と歴史的な都市構造を別々に読み、南部の製造業と港の事例へ移ります。',
  scope:'現在の都市構造を2011年報告の2009年調査で断定しません。人口格子は2020年推計、都市輪郭は2025年の資料です。輪郭は市の行政境界ではなく、港の利用者・製造業従業者数・通勤経路も示しません。',
  source:ghslPopulation,additionalSources:[ghslUrban,vietnamUrban],
  bridges:[
   {field:'industry',topic:'manufacturing',label:'ベトナム全体の製造業を比べる'},
   {field:'natural',topic:'basins',point:[106.69150470184474,10.8300545519086],label:'ホーチミンの都市代表点を含む流域を比べる'},
  ],
 },
];
