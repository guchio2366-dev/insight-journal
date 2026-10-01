import type {Field} from './africa-atlas';

export type AfricaCoordinate = [longitude:number, latitude:number];
export type AfricaThemeMark = {
 id:string;
 kind:'river'|'area-label'|'crop'|'resource'|'city'|'port';
 label:string;
 coordinates:AfricaCoordinate|AfricaCoordinate[];
 note:string;
};
export type AfricaTheme = {
 id:string;
 field:Field;
 title:string;
 takeaway:string;
 // Bounds frame the explanation. They are never a measured distribution polygon.
 bounds:[west:number,south:number,east:number,north:number];
 places:string[];
 source:string;
 sourceLabel:string;
 caveat:string;
 compareMetric:string;
 compareText:string;
 marks:AfricaThemeMark[];
 evidenceSources?:{url:string;label:string}[];
};

const farming='https://www.fao.org/4/y1860e/y1860e04.htm';
const irrigated='https://www.fao.org/4/y1860e/y1860e05.htm';
const nileMap='https://storage.googleapis.com/fao-aquastat.appspot.com/countries_regions/pdf/EGY-map_detailed.pdf';
const cities='https://www.worldbank.org/en/region/afr/publication/africa-cities-opening-doors-world';
const zambia='https://www.worldbank.org/en/country/zambia/publication/zambia-economic-update-leveraging-energy-transition-minerals-for-economic-transformation';
const morocco='https://www.trade.gov/country-commercial-guides/morocco-market-overview';

// Each mark is a representative location for qualitative reading. Neither its
// size nor its count encodes output, people, cultivation area or mineral reserves.
// The Nile is generalized from FAO AQUASTAT's Egypt map, not a hydrological layer.
const egyptNile:AfricaCoordinate[]=[
 [32.6,22.0],[32.9,24.1],[32.9,24.9],[32.6,25.7],[32.8,26.2],
 [31.7,26.6],[31.2,27.2],[30.8,28.1],[30.8,29.1],[31.2,30.0]
];

export const themes:AfricaTheme[]=[
 {
  id:'nile-water',field:'nature',title:'ナイル：乾いた土地へ届く河川水',
  takeaway:'雨の少ないエジプトでも、ナイルの水を灌漑に使えます。河川水を農地へ届ける技術と、用水の配分・排水の仕組みが生産を支えます。乾燥だけで農業の成否は決まりません。',
  bounds:[26,21,37,33],places:['EGY','SDN'],
  source:nileMap,sourceLabel:'FAO AQUASTAT・エジプト地図（2015）',
  caveat:'線はエジプト南部からカイロまでの本流の位置案内です。デルタの支流網、流量、流域境界、灌漑面積は示しません。',
  compareMetric:'ER.H2O.INTR.PC',
  compareText:'国内で生まれる再生可能淡水を人口で割った一人あたりの値を比べます。国外からの流入を含まないため、ナイルの利用可能量や水道へのアクセスは読み取れません。',
  marks:[
   {id:'egypt-nile',kind:'river',label:'ナイル川（エジプト）',coordinates:egyptNile,note:'FAO地図にある本流の近似線。上流域全体やデルタの支流網ではありません。'},
   {id:'aswan',kind:'area-label',label:'アスワン：水の調整',coordinates:[32.9,24.1],note:'ダムと河川水利用を読む代表地点。ダムの規模や取水量を表す記号ではありません。'},
   {id:'nile-delta',kind:'crop',label:'ナイルデルタ：灌漑農業',coordinates:[31.0,30.8],note:'FAOが示す灌漑農業の集中地域。点は農地の境界や現在の作物構成を表しません。'}
  ],
  evidenceSources:[{url:irrigated,label:'FAO・灌漑と水管理の説明（2001）'}]
 },
 {
  id:'east-highlands',field:'nature',title:'東部の高地：標高と農業の違い',
  takeaway:'赤道に近くても、東アフリカの高地は低地と条件が異なります。高地の作物・家畜の組合せを読むとともに、道路、市場、栽培技術、農地へのアクセスが暮らしを左右することを考えます。',
  bounds:[27,-5,43,16],places:['ETH','UGA','RWA'],
  source:farming,sourceLabel:'FAO・高地の農業システム（2001）',
  caveat:'印は高地地域の代表位置です。標高、気候区分、現在の作付面積を計測した地図ではありません。',
  compareMetric:'AG.LND.PRCP.MM',
  compareText:'国別の長期平均降水量と高地の位置を重ねます。国平均は高地・低地の差や雨季を示さないため、同じ色の国内にも異なる栽培条件があります。',
  marks:[
   {id:'ethiopia-highland',kind:'area-label',label:'エチオピア高原',coordinates:[38.0,10.0],note:'FAOの高地温帯混合農業を読む代表位置。穀物と家畜を組み合わせる地域があります。'},
   {id:'uganda-highland',kind:'area-label',label:'ウガンダ南西部の高地',coordinates:[30.0,-1.0],note:'多年生作物を含む高地農業を読む代表位置。国全体が同じ高地条件という意味ではありません。'},
   {id:'rwanda-highland',kind:'area-label',label:'ルワンダの高地',coordinates:[29.8,-2.0],note:'FAOが説明する高地多年生農業の代表位置。小区画の農地、技術、市場の条件も合わせて読みます。'}
  ]
 },
 {
  id:'guinea-tree-crops',field:'agriculture',title:'ギニア湾岸：樹木作物と食用作物',
  takeaway:'湿潤な地域ではカカオなどの樹木作物と食用作物を組み合わせます。加工・品質・販路、世界価格、生産者への支援も収入に関わります。多年生作物は「耕地の割合」に含まれません。',
  bounds:[-10,0,16,11],places:['CIV','GHA','CMR'],
  source:farming,sourceLabel:'FAO・樹木作物システム（2001）',
  caveat:'印はFAOが説明する樹木作物地域の代表位置です。2024年の産地境界・生産量・順位ではありません。',
  compareMetric:'AG.LND.PRCP.MM',
  compareText:'湿潤な沿岸側と内陸側の位置を国平均降水量と比べます。国の色は産地の雨量や雨季ではなく、樹木作物の成立や農家の収入を証明するものでもありません。',
  marks:[
   {id:'civ-tree-crops',kind:'crop',label:'コートジボワール南部：カカオ',coordinates:[-5.5,6.5],note:'カカオを含む樹木作物システムの代表位置。生産量の大小を示しません。'},
   {id:'ghana-tree-crops',kind:'crop',label:'ガーナ南部：カカオ',coordinates:[-1.5,6.5],note:'樹木作物と食用作物の組合せを読む代表位置。国全土がカカオ産地ではありません。'},
   {id:'cameroon-tree-crops',kind:'crop',label:'カメルーン南部：樹木作物',coordinates:[11.8,4.0],note:'カカオ・コーヒー・油やしなどを含む営農地域の代表位置。品目別の面積図ではありません。'}
  ]
 },
 {
  id:'sahel-agropastoral',field:'agriculture',title:'サヘル：穀物と家畜を組み合わせる',
  takeaway:'雨の変動が大きい地域では、キビ・ソルガムと家畜を組み合わせる営農があります。種子、獣医サービス、販路、季節移動や土地利用の調整も重要です。穀物収量だけでは農牧業全体を測れません。',
  bounds:[-12,9,23,20],places:['MLI','NER','TCD'],
  source:farming,sourceLabel:'FAO・キビ／ソルガム農牧複合（2001）',
  caveat:'印は農牧複合を読む代表位置です。サヘルの境界、放牧経路、現時点の移動可否は示しません。',
  compareMetric:'AG.LND.PRCP.MM',
  compareText:'南北で異なる雨の条件を考える入口です。国平均の長期降水量は毎年の干ばつや地域内の雨季を示さず、低収量の原因を気候だけに決めることもできません。',
  marks:[
   {id:'mali-agropastoral',kind:'crop',label:'マリ：穀物と家畜',coordinates:[-4.5,14.0],note:'農牧複合システムを読む広域の代表位置。農地面積や家畜頭数は示しません。'},
   {id:'niger-agropastoral',kind:'crop',label:'ニジェール南部：農牧複合',coordinates:[5.5,14.0],note:'耕作と家畜の組合せを読む代表位置。国全体が耕作地という意味ではありません。'},
   {id:'chad-agropastoral',kind:'crop',label:'チャド：穀物と家畜',coordinates:[16.0,13.0],note:'季節性と家畜の役割を読む代表位置。FAOの背景説明に基づく定性的な表示です。'}
  ]
 },
 {
  id:'copperbelt-connections',field:'industry',title:'銅鉱業：鉱床と電力・物流を分けて読む',
  takeaway:'ザンビアの銅鉱業では、鉱床に加え安定した電力と内陸からの物流が重要です。加工を増やすには技能や資金も必要で、資源収入を社会へ配分する制度と環境管理まで考える必要があります。',
  bounds:[21,-19,34,-8],places:['ZMB','ZAF'],
  source:zambia,sourceLabel:'世界銀行・ザンビア経済報告（2025）',
  caveat:'印はザンビアの鉱業地域と都市の位置案内です。鉱床境界、鉱山別産出量、輸送路を測った地図ではありません。',
  compareMetric:'ER.H2O.INTR.PC',
  compareText:'国内の再生可能淡水を人口で割った一人あたりの値と重ね、水・電力の条件を考えます。発電量、供給の安定性、鉱業に使える水量を示す値ではなく、鉱床の分布も説明しません。',
  marks:[
   {id:'zambia-copperbelt',kind:'resource',label:'ザンビア：カッパーベルト',coordinates:[28.2,-12.7],note:'銅鉱業の地域を読む代表位置。鉱山数、埋蔵量、鉱業地域の境界は示しません。'},
   {id:'zambia-northwest',kind:'resource',label:'ザンビア北西部：銅の鉱床',coordinates:[25.5,-12.2],note:'開発庁が説明する北西部の銅鉱床を読む代表位置。個別鉱山の位置や埋蔵量は示しません。'},
   {id:'lusaka',kind:'city',label:'ルサカ：内陸の都市',coordinates:[28.3,-15.4],note:'鉱業と都市・物流の関係を読む位置案内。線で結ぶ輸送経路や物流量は示していません。'}
  ],
  evidenceSources:[{url:'https://www.zda.org.zm/wp-content/uploads/2024/09/ZDA-Mining-Sector-Profile-2024.pdf',label:'ザンビア開発庁・Mining Sector Profile（2024）, p.4'}, {url:'https://www.worldbank.org/en/country/zambia/overview',label:'世界銀行・内陸国と水力発電の制約'}]
 },
 {
  id:'casablanca-manufacturing',field:'industry',title:'カサブランカ：製造業と国際市場',
  takeaway:'カサブランカ周辺には航空機関連の製造業が集まります。企業間の供給網、技能、投資、空港などの交通接続が製造業を支えます。天然資源の多さだけで産業の立地は説明できません。',
  bounds:[-11,28,-1,37],places:['MAR','ZMB'],
  source:morocco,sourceLabel:'米国商務省 ITA・モロッコ市場概況（2025）',
  caveat:'印はカサブランカ周辺の製造業を読む代表位置です。工場境界、輸出量、雇用人数を表しません。',
  compareMetric:'NY.GDP.TOTL.RT.ZS',
  compareText:'天然資源レントと製造業の位置を比べます。レントは資源の価格と採取費用の差の推計で、製造業の生産・輸出や所得を示しません。国の割合から都市の産業構成も決められません。',
  marks:[
   {id:'casablanca-industry',kind:'area-label',label:'カサブランカ周辺：航空機関連',coordinates:[-7.6,33.5],note:'Midparc・Aeropoleを含む広域の位置案内。個別工場の位置ではありません。'},
   {id:'casablanca-airport',kind:'area-label',label:'カサブランカ：航空の接続',coordinates:[-7.6,33.2],note:'国際交通との接続を読む空港周辺の代表位置。旅客数や貨物取扱量は示しません。'}
  ],
  evidenceSources:[{url:'https://www.trade.gov/country-commercial-guides/morocco-aerospace',label:'米国商務省 ITA・航空機産業と国際航空接続（2025）'}]
 },
 {
  id:'nile-settlements',field:'population',title:'ナイル沿い：国平均に隠れる居住集中',
  takeaway:'ナイル沿いの灌漑地域と都市を読むと、広い国土の平均密度と暮らしの集中は別だと分かります。水の利用に加え、農地、住宅、交通、公共サービスを整える制度も居住を支えます。',
  bounds:[26,21,37,33],places:['EGY','SDN'],
  source:irrigated,sourceLabel:'FAO・北アフリカの灌漑と居住（2001）',
  caveat:'都市の点は位置案内です。人口規模、都市圏境界、居住密度を表しません。人口統計の円は国全体の人口です。',
  compareMetric:'AG.LND.PRCP.MM',
  compareText:'エジプトの少雨とナイル沿いの位置を比べます。国平均降水量から都市の雨量や居住密度は分かりません。河川水と灌漑、交通・住宅の条件を追加して考えます。',
  marks:[
   {id:'settlement-nile',kind:'river',label:'ナイル川（エジプト）',coordinates:egyptNile,note:'灌漑・居住と川の関係を読む近似線。河川流量や人口密度ではありません。'},
   {id:'cairo',kind:'city',label:'カイロ',coordinates:[31.2,30.0],note:'都市の位置案内。点の大きさは都市人口を表しません。'},
   {id:'alexandria',kind:'city',label:'アレクサンドリア',coordinates:[29.9,31.2],note:'地中海側の都市の位置案内。点の大きさは都市人口を表しません。'},
   {id:'luxor',kind:'city',label:'ルクソール',coordinates:[32.6,25.7],note:'上流側の都市の位置案内。点の大きさは都市人口を表しません。'}
  ],
  evidenceSources:[{url:nileMap,label:'FAO AQUASTAT・河川と都市の地図（2015）'},{url:'https://www.worldbank.org/en/country/egypt/overview',label:'世界銀行・住宅、公共サービスと鉄道の整備'}]
 },
 {
  id:'urban-connections',field:'population',title:'都市への集中を暮らしと仕事へつなぐ',
  takeaway:'都市への人口集中が生産性の向上につながるかは、住宅、交通、土地制度、仕事への接続にも左右されます。都市は農産物の市場にもなり、都市と農村は互いにつながっています。',
  bounds:[-5,-7,42,12],places:['NGA','GHA','KEN'],
  source:cities,sourceLabel:'世界銀行・Africa’s Cities（2017）',
  caveat:'点は比較の入口となる都市の代表位置です。都市人口の順位・増加率・人口分布を計測した図ではありません。',
  compareMetric:'SP.URB.TOTL.IN.ZS',
  compareText:'都市人口割合と都市の位置を比べます。割合は国全体の指標で都市の規模ではなく、都市の定義も国によって異なります。住宅や仕事へのアクセスの良さも表しません。',
  marks:[
   {id:'lagos',kind:'city',label:'ラゴス',coordinates:[3.4,6.5],note:'沿岸都市を読む代表位置。都市人口や都市圏の広がりは示しません。'},
   {id:'accra',kind:'city',label:'アクラ',coordinates:[-0.2,5.6],note:'沿岸都市を読む代表位置。住宅・交通と農村市場の関係を考える入口です。'},
   {id:'nairobi',kind:'city',label:'ナイロビ',coordinates:[36.8,-1.3],note:'内陸都市を読む代表位置。仕事と居住地の接続を考える入口です。'}
  ]
 }
];

export function themeById(id:string) { return themes.find(theme=>theme.id===id); }
