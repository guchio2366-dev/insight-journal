import type {AsiaRegionId} from '../../lib/atlas-asia-state';
export type AsiaFarmingLayer={id:string;title:string;kind:'crop'|'livestock'|'forest';image:string;grid?:string;width:number;height:number;bounds3857:number[];imageCoordinates:[number,number][];unit?:string;year:number;faoItem?:number;breaks?:number[];colors?:string[];countryCoverage?:Record<string,{maskPixels:number;validPixels:number;positivePixels:number}>};
export type AsiaFarmingRegion={layers:AsiaFarmingLayer[]};
export type AsiaFarmObservation={domain:string;item:string;element:string;elementCode:string;year:number;unit:string;value:number|null;flag:string;note:string|null};
export type AsiaFarmStatistics={countries:Record<string,{m49:number;sourceNames:Record<string,{name:string;areaCode:string}>;observations:AsiaFarmObservation[]}>;items:Record<string,string>;flags:Record<string,string>};
export const asiaFarmDefinitions:Record<string,{statName:string;definition:string}>={
 rice:{statName:'米',definition:'米の生産量と収穫面積を示します。地図の収穫面積と国の統計は、別々の資料から取得しています。精米後の供給量や消費量を示す表ではありません。'},
 wheat:{statName:'小麦',definition:'小麦の生産量と収穫面積を示します。面積が大きいことと、1ha当たりの収量が高いことは異なります。'},
 maize:{statName:'トウモロコシ（穀粒）',definition:'穀粒として収穫するトウモロコシの統計です。飼料として茎や葉ごと収穫する青刈りトウモロコシの全体を表すものではありません。'},
 soybean:{statName:'大豆',definition:'大豆の生産量と収穫面積を示します。大豆油や飼料用の大豆かすは加工後の別品目です。'},
 cotton:{statName:'種を取り除く前の綿花',definition:'国別の生産量は、種を含む綿花の重量です。種を取り除いた綿繊維の重量とは異なり、そのまま衣料品の生産量にも換算できません。'},
 tea:{statName:'茶の生葉',definition:'国別の生産量は茶の生葉の重量です。乾燥・加工した茶の重量とは異なるため、製茶の生産量と直接比較しないでください。'},
 cassava:{statName:'生鮮キャッサバ',definition:'収穫した生鮮のキャッサバの重量を示します。でんぷんや乾燥した製品は、水分と加工の分だけ重量が異なります。'},
 oilpalm:{statName:'油ヤシの果実',definition:'生産量は油ヤシの果実の重量であり、搾ったパーム油の重量ではありません。油ヤシの栽培地は樹木に覆われますが、森林統計では農業利用の土地と区別されます。'},
 rubber:{statName:'一次形態の天然ゴム',definition:'国別統計では一次形態の天然ゴムを扱います。地図はゴムの収穫面積の推計であり、ゴム製品の工場や出荷量を示しません。'},
 arabica:{statName:'コーヒー生豆（種類の合計）',definition:'地図はアラビカ種を表示しますが、国別統計はコーヒー生豆の種類を合計した値です。この表をアラビカだけの生産量として読まないでください。'},
 robusta:{statName:'コーヒー生豆（種類の合計）',definition:'地図はロブスタ種を表示しますが、国別統計はコーヒー生豆の種類を合計した値です。この表をロブスタだけの生産量として読まないでください。'},
 chickpea:{statName:'乾燥ひよこ豆',definition:'乾燥した豆として収穫するひよこ豆の生産量と収穫面積を示します。'},
 lentil:{statName:'乾燥レンズ豆',definition:'乾燥した豆として収穫するレンズ豆の生産量と収穫面積を示します。'},
 pearlmillet:{statName:'雑穀のMillet分類全体',definition:'地図はトウジンビエの分布ですが、国別統計はFAOSTATのMillet分類全体です。品種・作物の対象が広いため、トウジンビエだけの生産量とはいえません。'},
 sugarcane:{statName:'サトウキビ',definition:'生産量は収穫したサトウキビの重量です。製糖後の砂糖の重量とは異なります。'},
 cattle:{statName:'牛の飼養頭数',definition:'地図と頭数は牛という動物種の資料です。肉用牛と乳用牛の場所を分けた地図ではありません。'},
 buffalo:{statName:'水牛の飼養頭数',definition:'地図と頭数は水牛という動物種の資料です。乳の生産、肉の生産、農作業などの用途を地図だけから区別できません。'},
 sheep:{statName:'羊の飼養頭数',definition:'地図は羊の推計密度で、羊毛用と肉用を区別しません。密度の数値を足し合わせても、国の頭数にはなりません。'},
 goat:{statName:'山羊の飼養頭数',definition:'地図は山羊の推計密度です。肉・乳・繊維などの用途は、同じ動物種の分布からは分けられません。'},
 pig:{statName:'豚の飼養頭数',definition:'飼養頭数は飼われている豚の数であり、その年の出荷頭数や豚肉の生産重量とは異なります。'},
 chicken:{statName:'鶏の飼養羽数',definition:'地図は鶏の推計密度で、肉用鶏と採卵鶏を分けません。国別の「千羽」は1単位が1,000羽という意味です。'},
 forest:{statName:'森林面積・丸太・製材',definition:'森林面積は土地の広がりを表し、丸太や製材の生産量は木材の体積を表します。森林が広いことだけでは、木材の生産量や輸出量は決まりません。'},
};
export const asiaFarmRegionReading:Record<AsiaRegionId,{crop:string;livestock:string;forest:string}>={
 'east-asia':{crop:'中国東部の平野と内陸、日本列島、モンゴルを比べると、米・小麦・綿花などの作物で分布する場所が異なります。品目を切り替えて、同じ場所に複数の作物の分布があるかも確認してください。',livestock:'モンゴルや中国内陸の羊・山羊と、中国東部・日本・朝鮮半島の豚・鶏を比べてください。動物種ごとの分布を、飼料になる作物や人口の分布と見比べられます。分布の重なりだけで飼料の調達先や飼い方を断定することはできません。',forest:'日本の森林を見る際は、森林の存在、人工林の管理、木材の用途を分けて考える必要があります。林野庁の資料は天然林・人工林の面積と、素材生産量・木材需要を別々に示しています。ここでも森林図と木材の統計を別々に読めます。'},
 'southeast-asia':{crop:'米のほか、キャッサバ、油ヤシ、ゴム、コーヒーを選ぶと、大陸部と島しょ部の農業の違いが見えます。コーヒーはアラビカ種とロブスタ種の分布を別々に表示します。',livestock:'大陸部と島しょ部で、水牛・牛・豚・鶏の分布を比べてください。資料は動物種の推計密度を表しており、個別の農場の位置や飼育方法を示すものではありません。',forest:'ボルネオ島やスマトラ島では、森林と油ヤシ・ゴムなどの樹木作物を区別する必要があります。木が見える土地がすべて同じ森林に分類されるわけではありません。この版の森林資料には、東カリマンタンで森林と一部の樹木作物を混同する既知の問題があります。'},
 'south-central-asia':{crop:'インド・パキスタンの平野と中央アジアを比べると、小麦・綿花・米の分布は同じではありません。豆類、トウジンビエ、茶も切り替え、広く分布する作物と局地的に分布する作物を区別して読んでください。',livestock:'南アジアの牛・水牛と、中央アジアの羊・山羊の分布を比較できます。同じ牛や水牛でも用途は複数あるので、密度の地図を乳や肉の生産量の地図として読むことはできません。',forest:'インドの森林資料では、衛星から把握する森林被覆と、行政上記録された森林区域が区別されています。国際的な森林図、国の森林面積統計、木材生産量は、対象と定義を確認してから比較する必要があります。'},
};
export const asiaForestSources:Record<AsiaRegionId,{label:string;url:string}[]>={
 'east-asia':[{label:'林野庁：森林・林業統計要覧2024',url:'https://www.rinya.maff.go.jp/j/kikaku/toukei/youran_mokuzi2024.html'}],
 'southeast-asia':[{label:'FAO：森林の定義',url:'https://fra-data.fao.org/definitions/fra/2020/en/tad'},{label:'JRC：GFC2020 v3の既知の問題',url:'https://forobs.jrc.ec.europa.eu/GFC/v3'}],
 'south-central-asia':[{label:'インド森林調査局：森林報告2023',url:'https://fsi.nic.in/forest-report-2023'},{label:'インド政府：森林被覆と記録森林区域の定義',url:'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1795070'}],
};
export function asiaFarmUnit(unit:string,topic:string){return unit==='t'?'t（トン）':unit==='m3'?'m³':unit==='1000 ha'?'千ha':unit==='An'?'頭':unit==='1000 An'?(topic==='chicken'?'千羽':'千頭'):unit;}
export const asiaFarmFlagLabels:Record<string,string>={A:'公的報告値',E:'推計値',I:'受入機関による補完値',M:'資料上の欠測',X:'外部機関の値'};
