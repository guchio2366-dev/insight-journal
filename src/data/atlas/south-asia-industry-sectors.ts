// Regional location examples are grouped separately from the national industry catalog.
export const southIndustrySectors=[
 {id:'sc-south-resources',title:'資源・エネルギー',groups:['sc-hydro']},
 {id:'sc-south-manufacturing',title:'製造業',groups:['sc-textiles','sc-steel','sc-refining','sc-auto','sc-pharma','sc-tea']},
 {id:'sc-south-services',title:'サービス業',groups:['sc-it','sc-tourism']},
] as const;
export function southIndustryGroups(id:string):readonly string[]|null{return southIndustrySectors.find(sector=>sector.id===id)?.groups??null;}
