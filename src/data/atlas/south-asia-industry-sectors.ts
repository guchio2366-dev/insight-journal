// Regional location examples are grouped separately from the national industry catalog.
export const southIndustrySectors=[
 {id:'sc-south-resources',title:'資源・エネルギー',groups:['sc-coal','sc-refining','sc-hydro']},
 {id:'sc-south-manufacturing',title:'製造業',groups:['sc-textiles','sc-steel','sc-two-wheelers','sc-auto','sc-pharma','sc-tea','sc-rice']},
 {id:'sc-south-services',title:'サービス業',groups:['sc-it','sc-tourism']},
] as const;
export function southIndustryGroups(id:string):readonly string[]|null{return southIndustrySectors.find(sector=>sector.id===id)?.groups??null;}

// A product keeps its sector's map. Legacy overview URLs open the first map.
export function southIndustryMapSector(topic:string|null|undefined){
 return southIndustrySectors.find(sector=>sector.id===topic||sector.groups.some(id=>id===topic))??southIndustrySectors[0];
}
export const southIndustrySectorReadings={
 'sc-south-resources':'東中部インドとタールの炭田、インドの沿岸・内陸の精製、ネパール・ブータンの水力は、鉱床・原油の受入と供給先・河川の落差という異なる条件で分布します。',
 'sc-south-manufacturing':'ダッカの縫製とファイサラーバードの織布、オディシャの鉄鋼、ハリヤーナの乗用車と南・西部にもある二輪車、各地の医薬品、インド・スリランカの製茶とパンジャーブなどの精米は、原料・加工網・人材・市場に沿って集積します。',
 'sc-south-services':'IT・業務受託はベンガルールなどインドの技術人材の都市に、観光はモルディブの環礁、スリランカの沿岸、ネパールの山岳への入口に分布します。',
} as const;
