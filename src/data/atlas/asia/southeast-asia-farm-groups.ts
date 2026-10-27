export type SoutheastFarmGroup={id:string;label:string;products:readonly string[];kind:'crop'|'livestock';title:string;lead:string;reading:string};

/** Four views of the existing 2020 data; membership does not change the data. */
export const southeastFarmGroups:readonly SoutheastFarmGroup[]=[
 {id:'farm-grains',label:'穀物',products:['rice','maize'],kind:'crop',title:'米とトウモロコシの分布',lead:'米とトウモロコシに絞って、河川低地と内陸・島々の栽培域を見比べます。',reading:'米はメコン・チャオプラヤなどの低地、トウモロコシは内陸部や島々にも分布します。品目名を選ぶと、その品目の説明と国別統計へ進めます。自然環境へ切り替えて、同じ場所の標高や雨の季節を比べられます。'},
 {id:'farm-oil-rubber',label:'油ヤシ・天然ゴム',products:['oilpalm','rubber'],kind:'crop',title:'油ヤシと天然ゴムの分布',lead:'スマトラ島・ボルネオ島とマレー半島を中心に、油ヤシとゴムの栽培域を読みます。',reading:'油ヤシは果実から油を、ゴムは樹液から原料を得る作物です。色は栽培の分布で、油を搾る工場やゴム製品の加工拠点を表しません。森林の参考図と比べるときは、樹木のある農園と森林の土地利用を区別します。'},
 {id:'farm-sugar-roots-coffee',label:'糖料・いも・コーヒー',products:['sugarcane','cassava','arabica','robusta'],kind:'crop',title:'サトウキビ・キャッサバ・コーヒーの分布',lead:'サトウキビとキャッサバ、アラビカとロブスタの栽培域を見比べます。',reading:'サトウキビは砂糖などの原料、キャッサバは食用やでん粉などに利用されます。コーヒーはアラビカとロブスタを分け、内陸高地と島々の分布を比べます。収穫した原料と加工品の量は、同じものとして足し合わせません。'},
 {id:'farm-livestock',label:'畜産',products:['cattle','buffalo','pig','chicken'],kind:'livestock',title:'牛・水牛・豚・鶏の主な飼養地域',lead:'作物の色面を外し、小さな記号と名前で家畜の代表地域を読みます。',reading:'記号は2020年の推計分布に基づく代表地点です。飼養頭数・羽数に比例する記号ではなく、農場の位置でもありません。家畜名を選ぶと説明と国別統計を確認でき、人口や作物の分布とも比較できます。'},
];

export const southeastFarmGroupTopics=southeastFarmGroups.map(group=>group.id);
export const isSoutheastFarmGroupTopic=(topic?:string|null)=>southeastFarmGroupTopics.includes(topic??'');
export const isSoutheastFarmOverview=(topic?:string|null)=>!topic||topic==='overview'||isSoutheastFarmGroupTopic(topic);
export function southeastFarmGroup(topic?:string|null):SoutheastFarmGroup|null {
 if(topic==='forest')return null;
 return southeastFarmGroups.find(group=>group.id===topic||group.products.includes(topic??''))??southeastFarmGroups[0];
}
export function southeastFarmVisibleProducts(topic?:string|null,single=false):readonly string[]{
 const group=southeastFarmGroup(topic);
 return group?(single&&group.products.includes(topic??'')?[topic!]:group.products):[];
}
export function southeastFarmOverviewTopic(topic?:string|null){return southeastFarmGroup(topic)?.id??'farm-grains';}
export function southeastFarmMapNote(topic?:string|null,single=false){
 const group=southeastFarmGroup(topic);if(!group)return '';
 return group.kind==='livestock'?'2020年の推計分布に基づく代表地点です。記号の大きさは頭数・羽数を表しません。':`${single?'選択品目':'この分類'}の概略分布を表示しています。色面は掲載作物の中で相対的に優勢な作物の分布です。省略した品目や色のない場所にも農業があります。`;
}
