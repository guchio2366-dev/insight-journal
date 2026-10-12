export const japanIndustrySectors=[
 {id:'resources',name:'資源・エネルギー',industries:['mining','smelting','refining','energy'],overview:'菱刈の金鉱石採掘、東予の金属製錬、川崎の石油精製と、6方式の発電例を読みます。資源・施設の全国網羅図ではありません。',reason:'資源を採る場所、金属・燃料・電力へ変える場所、利用する場所の接続を読みます。製錬と精製は製造工程でもあるため、製造業と同じ点を共有します。'},
 {id:'manufacturing',name:'製造業',industries:['auto','chips','steel','batteries','ships','chemicals','smelting','refining'],overview:'自動車・半導体・鉄鋼・電池・造船・化学に加え、非鉄金属製錬・石油精製の工程を読みます。県別数量と点は別の地理単位です。',reason:'部品・原料、工程、技術者、港・道路、電力や水とのつながりが生産を支えます。製錬・精製は資源を使える形へ変える役割も持つため、資源・エネルギーと同じ点を共有します。'},
 {id:'services',name:'サービス業',industries:['services','logistics'],overview:'東京・大阪の証券市場と成田・中部の航空物流の立地例を読みます。全サービス業の網羅図ではありません。',reason:'人・情報・企業活動と交通の接続がサービスの立地に関わります。金融と物流では集まる活動が違い、製造品出荷額では規模を測れません。'},
] as const;
export type JapanSector=typeof japanIndustrySectors[number]['id'];
export const japanSector=(id?:string)=>japanIndustrySectors.find(s=>s.id===id)??japanIndustrySectors[1];
export function japanSiteInSector(ids:readonly string[],sector?:string){return ids.some(id=>(japanSector(sector).industries as readonly string[]).includes(id));}
