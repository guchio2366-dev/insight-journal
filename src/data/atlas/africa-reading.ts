import type {Field} from './africa-atlas';
export type Reading={title:string;text:string;places:string[];source:string;sourceLabel:string};
const fao='https://www.fao.org/4/y1860e/y1860e04.htm';
const wdi=(id:string)=>`https://data.worldbank.org/indicator/${id}`;
export const reading:Record<Field,Reading[]>={
 nature:[
  {title:'北部の乾燥と、川から得る水',text:'降水量が少なくても、国外から流入する川を利用できます。エジプトとスーダンを選び、国内由来の淡水だけでは流域の水利用を説明できないことを確かめます。',places:['EGY','SDN','DZA'],source:wdi('ER.H2O.INTR.PC'),sourceLabel:'WDI・淡水資源の定義'},
  {title:'湿潤な中部と森林',text:'コンゴ盆地の湿潤な環境は森林と結び付いています。コンゴ民主共和国とガボンを選び、降水から農林業の森林割合へ切り替えると、同じ場所を二つの指標で読めます。',places:['COD','GAB','COG'],source:fao,sourceLabel:'FAO・農業システム（2001）'},
  {title:'国平均に隠れる高地の条件',text:'東アフリカの高地では標高によって栽培条件が異なります。国全体を一色にした降水地図は、高地と低地の気温や雨季の違いを示す気候区分図ではありません。',places:['ETH','KEN','RWA'],source:fao,sourceLabel:'FAO・高地の農業システム（2001）'}
 ],
 agriculture:[
  {title:'ギニア湾岸の樹木作物',text:'湿潤な湾岸ではカカオ、コーヒー、油ヤシなどの樹木作物と食料作物が組み合わされます。永年作物は「耕地の割合」に含まれないので、その低さだけで農業が小さいとは判断できません。',places:['CIV','GHA','CMR'],source:fao,sourceLabel:'FAO・樹木作物システム（2001）'},
  {title:'乾燥地域では作物と家畜を組み合わせる',text:'雨が限られる地域には、雑穀と牧畜を組み合わせる営農があります。穀物収量だけでは家畜の役割を捉えられません。農林水産業の付加価値と併せて読みます。',places:['MLI','NER','TCD'],source:'https://www.fao.org/4/y4176e/y4176e06.htm',sourceLabel:'FAO・伝統的な反芻家畜の生産システム'},
  {title:'高地と島では、品目の組合せが変わる',text:'エチオピアの高地には穀物と家畜、マダガスカルには稲と樹木作物を組み合わせた営農があります。国平均収量の差には、気候だけでなく作物構成も含まれます。',places:['ETH','MDG','UGA'],source:fao,sourceLabel:'FAO・高地／稲作システム（2001）'}
 ],
 industry:[
  {title:'工業の内側を見る',text:'工業には鉱業、製造業、建設、電力などが含まれます。工業の割合と製造業の割合を切り替えると、同じ「工業国」でも構成が異なることを国別に確かめられます。',places:['ZAF','MAR','EGY'],source:wdi('NV.IND.TOTL.ZS'),sourceLabel:'WDI・工業と製造業の定義'},
  {title:'資源レントは輸出額ではない',text:'資源価格と採取費用の差から推計するレントは、資源産業への経済的な依存を読む手掛かりです。価格変動の影響も受けるため、採掘量や政府収入と区別します。',places:['AGO','NGA','COD'],source:wdi('NY.GDP.TOTL.RT.ZS'),sourceLabel:'WDI・天然資源レントの定義'},
  {title:'サービスと所得の水準を分ける',text:'サービス業のGDP比が同じでも、一人当たりGDPの水準は異なります。島国と大陸の国を比較し、割合と名目金額が答える問いの違いを確認します。',places:['MUS','SYC','KEN'],source:wdi('NV.SRV.TOTL.ZS'),sourceLabel:'WDI・サービス業の定義'}
 ],
 population:[
  {title:'大きな人口と、高い密度を区別する',text:'人口の円と人口密度の色を切り替えて比較します。国土が広い国の低い平均密度は、国内に人口が集中する場所がないという意味ではありません。',places:['NGA','ETH','RWA'],source:wdi('EN.POP.DNST'),sourceLabel:'WDI・人口密度の定義'},
  {title:'都市化には交通・住宅・仕事の接続が必要',text:'都市への人口集中が生産性につながるかは、住宅、交通、仕事を結ぶ仕組みにも左右されます。都市人口率は都市の定義が国ごとに異なる点に注意して読みます。',places:['GHA','ZAF','KEN'],source:'https://www.worldbank.org/en/region/afr/publication/africa-cities-opening-doors-world',sourceLabel:'世界銀行・Africa’s Cities（2017）'},
  {title:'増加率から将来を決めつけない',text:'人口増加率は出生・死亡・移動を合わせた過去の変化です。年を切り替え、人口の実数と比較すると、率と増加人数の違いが分かります。',places:['NER','EGY','TUN'],source:wdi('SP.POP.GROW'),sourceLabel:'WDI・人口増加率の定義'}
 ]};
