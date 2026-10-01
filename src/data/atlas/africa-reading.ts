import type {Field} from './africa-atlas';
export type Reading={title:string;text:string;places:string[];source:string;sourceLabel:string};
const fao='https://www.fao.org/4/y1860e/y1860e04.htm';
const wdi=(id:string)=>`https://data.worldbank.org/indicator/${id}`;
export const reading:Record<Field,Reading[]>={
 nature:[
  {title:'ナイル：雨と利用できる水を分ける',text:'エジプトの少雨とナイルの位置を比べます。国外から届く河川水と灌漑が農業を支え、用水の配分・排水も重要です。「国内の再生可能淡水」は国外からの流入を含まず、利用可能量や水道へのアクセスも表しません。',places:['EGY','SDN','DZA'],source:'https://www.fao.org/4/y1860e/y1860e05.htm',sourceLabel:'FAO・灌漑と水管理（2001）'},
  {title:'コンゴ盆地：湿潤な環境と森林',text:'コンゴ盆地の湿潤な環境と森林割合を読み比べます。森林の割合は木材生産量や保全の良さではありません。農地利用、道路、森林の管理や土地へのアクセスも、人の暮らしと森林の関係に関わります。',places:['COD','GAB','COG'],source:fao,sourceLabel:'FAO・森林を基盤とする農業（2001）'},
  {title:'東部の高地：国平均の内側にも違い',text:'エチオピア、ウガンダ、ルワンダの高地では作物・家畜の組合せが異なります。標高や雨季だけでなく、小区画の農地、道路、市場、栽培技術も読みます。国全体を一色にする降水地図は高地と低地の差を表しません。',places:['ETH','UGA','RWA'],source:fao,sourceLabel:'FAO・高地の農業システム（2001）'}
 ],
 agriculture:[
  {title:'ギニア湾岸：樹木作物を統計から落とさない',text:'湿潤な湾岸ではカカオ・コーヒー・油ヤシなどの樹木作物と食用作物を組み合わせます。多年生作物は「耕地の割合」に含まれません。加工、品質、販路、世界価格、生産者への支援も収入に関わります。',places:['CIV','GHA','CMR'],source:fao,sourceLabel:'FAO・樹木作物システム（2001）'},
  {title:'サヘル：穀物と家畜で暮らしを支える',text:'雨の変動が大きい地域では、キビ・ソルガムと家畜を組み合わせる営農があります。種子や獣医サービス、販路、季節移動と土地利用の調整も重要です。穀物収量だけでは家畜や農牧業全体の役割を測れません。',places:['MLI','NER','TCD'],source:fao,sourceLabel:'FAO・キビ／ソルガム農牧複合（2001）'},
  {title:'収量の差を気候だけで決めない',text:'エチオピアの高地と、マダガスカルの稲と樹木作物を比べます。作物の組合せに加え、種子、資材、栽培技術や市場への接続も営農を支えます。国平均の穀物収量は農家ごとの生産性や所得ではありません。',places:['ETH','MDG'],source:fao,sourceLabel:'FAO・高地と稲／樹木作物システム（2001）'}
 ],
 industry:[
  {title:'銅鉱業：鉱床に電力・物流・制度を加える',text:'ザンビアの銅鉱業には安定した電力と内陸からの物流が必要です。加工を増やすには技能や資金も関わり、資源収入の配分と環境管理も重要です。国の天然資源レントから鉱山別の生産量や政府収入は分かりません。',places:['ZMB','COD','ZAF'],source:'https://www.worldbank.org/en/country/zambia/publication/zambia-economic-update-leveraging-energy-transition-minerals-for-economic-transformation',sourceLabel:'世界銀行・ザンビア経済報告（2025）'},
  {title:'製造業：市場への接続と技能も立地条件',text:'カサブランカ周辺の航空機関連製造業は、企業の供給網、技能、投資、交通接続を読む事例です。モロッコ、南アフリカ、エジプトの製造業割合を比べ、天然資源の有無だけでは産業構成を説明できないことを考えます。',places:['MAR','ZAF','EGY'],source:'https://www.trade.gov/country-commercial-guides/morocco-market-overview',sourceLabel:'米国商務省 ITA・モロッコ市場概況（2025）'},
  {title:'産業の割合と所得の水準を分ける',text:'サービス業のGDP比が近くても、一人あたりGDPの水準は異なります。島国と大陸の国を比べ、割合と金額の違いを確かめます。製造業は工業の内数です。名目GDPの変化には為替と物価も影響します。',places:['MUS','SYC','KEN'],source:wdi('NV.SRV.TOTL.ZS'),sourceLabel:'WDI・サービス業の定義'}
 ],
 population:[
  {title:'ナイル沿い：国の平均密度と居住集中は別',text:'広い乾燥地を持つ国でも、灌漑地域や都市に人が集まる場所があります。ナイルと都市の位置を国平均密度と読み比べます。水の利用に加え、農地、住宅、交通、公共サービスの整備も暮らしを支えます。',places:['EGY','SDN','NGA'],source:'https://www.fao.org/4/y1860e/y1860e05.htm',sourceLabel:'FAO・灌漑と居住（2001）'},
  {title:'都市への集中を暮らしと仕事へつなぐ',text:'都市の人口集中が生産性につながるかは、住宅、交通、土地制度、仕事への接続にも左右されます。都市は農産物の市場にもなります。都市人口割合は国全体の統計で、国ごとの都市の定義も異なります。',places:['NGA','GHA','KEN'],source:'https://www.worldbank.org/en/region/afr/publication/africa-cities-opening-doors-world',sourceLabel:'世界銀行・Africa’s Cities（2017）'},
  {title:'人口の規模・密度・増加率を混同しない',text:'ナイジェリア、エチオピア、ルワンダを人口の円と密度の色で比べます。円は国全体の人口で都市人口ではありません。増加率は出生・死亡・移動を合わせた過去の変化です。将来の人口や必要な社会サービスは、この率だけでは決まりません。',places:['NGA','ETH','RWA'],source:wdi('SP.POP.GROW'),sourceLabel:'WDI・人口増加率の定義'}
 ]};
