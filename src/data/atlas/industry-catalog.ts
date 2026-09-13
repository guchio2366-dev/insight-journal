export const industrySectors = [
  {id:'all', label:'全産業', color:'#435965', symbol:'全'},
  {id:'manufacturing', label:'製造業', color:'#9c6344', symbol:'製'},
  {id:'resources', label:'資源・エネルギー', color:'#81733f', symbol:'資'},
  {id:'services', label:'サービス業', color:'#357080', symbol:'サ'},
  {id:'construction-real-estate', label:'建設・不動産', color:'#806386', symbol:'建'},
] as const;
export type IndustrySector = typeof industrySectors[number]['id'];
export const industrySubsectors: Record<IndustrySector, readonly {id:string;label:string}[]> = {
  all:[],
  manufacturing:[['auto','自動車'],['aerospace','航空宇宙'],['electronics','半導体・電子機器'],['machinery','機械'],['metals','金属'],['chemicals','化学'],['food','食品加工'],['other-manufacturing','その他の製造業']].map(([id,label])=>({id,label})),
  resources:[['oil-gas','石油・天然ガス'],['mining','その他の鉱業'],['utilities','電力・ガス・水道']].map(([id,label])=>({id,label})),
  services:[['information','情報通信'],['finance','金融・保険'],['professional','専門サービス'],['trade-logistics','商業・物流'],['tourism','観光・娯楽'],['health-education','医療・教育'],['other-services','その他のサービス']].map(([id,label])=>({id,label})),
  'construction-real-estate':[{id:'construction',label:'建設'},{id:'real-estate',label:'不動産・賃貸'}],
};
export const industryInsightIds=['knowledge','supply-chain','energy-chemistry','food-agriculture','tourism-logistics','housing-jobs'] as const;
export function sectorLabel(id:string){return industrySectors.find(item=>item.id===id)?.label??'全産業';}
export function subsectorLabel(sector:IndustrySector,id:string){return industrySubsectors[sector].find(item=>item.id===id)?.label??'全分野';}
