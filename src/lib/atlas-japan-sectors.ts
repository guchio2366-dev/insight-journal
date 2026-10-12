export const japanIndustrySectors=[
 {id:'resources',name:'資源・エネルギー',industries:['energy'],overview:'火力・水力・地熱・風力・太陽光・原子力の立地例を読みます。採掘・精製の全国分布は未収録です。',reason:'燃料や自然条件、利用可能な形への変換、需要地と送電網の接続が立地に関わります。発電方式で必要な条件が異なります。'},
 {id:'manufacturing',name:'製造業',industries:['auto','chips','steel','batteries','ships','chemicals'],overview:'自動車・半導体・鉄鋼・電池・造船・化学工業の複数の立地例を読みます。県別数量と点は別の地理単位です。',reason:'部品・原料、工程、技術者、港・道路、電力や水とのつながりが生産を支えます。産業ごとに必要な輸送や設備が異なります。'},
 {id:'services',name:'サービス業',industries:['services','logistics'],overview:'東京・大阪の証券市場と成田・中部の航空物流の立地例を読みます。全サービス業の網羅図ではありません。',reason:'人・情報・企業活動と交通の接続がサービスの立地に関わります。金融と物流では集まる活動が違い、製造品出荷額では規模を測れません。'},
] as const;
export type JapanSector=typeof japanIndustrySectors[number]['id'];
export const japanSector=(id?:string)=>japanIndustrySectors.find(s=>s.id===id)??japanIndustrySectors[1];
export function japanSiteInSector(ids:readonly string[],sector?:string){return ids.some(id=>(japanSector(sector).industries as readonly string[]).includes(id));}
