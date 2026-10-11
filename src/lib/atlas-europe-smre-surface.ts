import source from '../data/atlas/europe/smre-religion-2010.json' with {type:'json'};

export const smreSource=source;
export const smreGroups=[
  {id:'catholic',label:'カトリック',color:'#d4a256'},
  {id:'protestant',label:'プロテスタント',color:'#8299c8'},
  {id:'orthodox',label:'正教会',color:'#c47b80'},
  {id:'otherChristian',label:'その他のキリスト教',color:'#bd9ec8'},
  {id:'jewish',label:'ユダヤ教',color:'#cdcc6b'},
  {id:'muslim',label:'イスラム教',color:'#6eae8d'},
  {id:'unaffiliated',label:'宗教的帰属なし',color:'#b8c6cc'},
  {id:'other',label:'その他（未回答・不明を含む）',color:'#d3c9b8'},
] as const;
export const smreMixed={id:'mixed',label:'分散（最大分類35%未満）',color:'#e0d4bf'};
export const smreMapGroups=[...smreGroups.filter((_,index)=>[0,1,2,3,5,6].includes(index)),smreMixed];
export const smreRow=(code:string)=>source.rows.find(row=>row.code===code);
/** A country comparison, never an allocation of national shares to subregions. */
export function smreLargestGroup(code:string){
  const row=smreRow(code);if(!row)return undefined;
  const maximum=Math.max(...row.shares);
  return maximum<35?smreMixed:smreGroups[row.shares.indexOf(maximum)];
}
export const smreSurfaceColor=(code:string)=>smreLargestGroup(code)?.color;

/** Published national categories at 10% or more; no residual or normalization. */
export function smreMajorGroups(code:string){
  const row=smreRow(code);if(!row)return [];
  const short=['カ','プ','正','他','ユ','イ','無','そ'];
  return smreGroups.flatMap((group,index)=>row.shares[index]>=10?[{...group,short:short[index],share:row.shares[index]}]:[]);
}
