/** Editorial display groups; the 23 published leaf cells remain on each record. */
export const canadaReligionGroups = [
 {id:'25',name:'無宗教・世俗的立場',members:['25']},
 {id:'8',name:'カトリック',members:['8']},
 {id:'6',name:'聖公会',members:['6']},
 {id:'17',name:'カナダ合同教会',members:['17']},
 {id:'11',name:'末日聖徒',members:['11']},
 {id:'other-christian',name:'その他キリスト教',members:['4','5','7','9','10','12','13','14','15','16','18']},
 {id:'21',name:'イスラム教',members:['21']},
 {id:'19',name:'ヒンドゥー教',members:['19']},
 {id:'22',name:'シク教',members:['22']},
 {id:'2',name:'仏教',members:['2']},
 {id:'20',name:'ユダヤ教',members:['20']},
 {id:'23',name:'先住民の伝統的信仰',members:['23']},
 {id:'24',name:'その他の宗教',members:['24']},
] as const;

export const canadaReligionInitialIds = ['25','8','6','17','11','21','19','22','20','23'] as const;

export const canadaReligionColor:Record<string,string>={
 '25':'#53888a','8':'#a24e66','6':'#527eaa','17':'#779a4c','11':'#9a6aaf',
 'other-christian':'#9b9c8a','21':'#387e68','19':'#d28643','22':'#b68a31',
 '2':'#b28a55','20':'#675e9b','23':'#b35d50','24':'#8f9292',
};

/** Editorial threshold: enough local presence and at least 1.5x national share. */
export function canadaReligionComposition(record:any,data:any){
 const share=(value:number|null,denominator:number|null)=>value===null||denominator===null||denominator<=0?null:value/denominator*100;
 const rows=data.groups.map((group:any)=>{
  const cell=record.values[group.id],national=data.national.values[group.id],localShare=share(cell?.value??null,record.denominator.value),nationalShare=share(national?.value??null,data.national.denominator.value);
  return {...group,count:cell?.value??null,share:localShare,national:nationalShare,ratio:localShare!==null&&nationalShare!==null&&nationalShare>0?localShare/nationalShare:null};
 });
 const qualified=rows.filter((row:any)=>!['other-christian','24'].includes(row.id)&&row.share!==null&&row.share>=5&&row.ratio!==null&&row.ratio>=1.5);
 return {rows,qualified,primary:qualified.reduce((best:any,row:any)=>!best||row.ratio>best.ratio?row:best,null),missing:rows.some((row:any)=>row.share===null)};
}

export function buildCanadaReligionView(source:any){
 const rawIds=source.groups.map((group:any)=>group.id),members=canadaReligionGroups.flatMap(group=>group.members);
 if(rawIds.length!==23||members.length!==rawIds.length||new Set(members).size!==rawIds.length||members.some(id=>!rawIds.includes(id)))throw new Error('Religion display groups must partition all 23 source leaves');
 const groupById=new Map(source.groups.map((group:any)=>[group.id,group]));
 const record=(item:any)=>{
  const values=Object.fromEntries(canadaReligionGroups.map(group=>{
   const cells=group.members.map(id=>item.values[id]);
   return [group.id,cells.length===1?cells[0]:{value:cells.some(cell=>cell?.value===null||cell?.value===undefined)?null:cells.reduce((sum,cell)=>sum+cell.value,0),symbol:cells.find(cell=>cell?.symbol)?.symbol??'',derivedFrom:group.members}];
  }));
  return {...item,values,sourceValues:item.values};
 };
 return {...source,groups:canadaReligionGroups.map(group=>({...group,definition:group.members.length===1?(groupById.get(group.id) as any).definition:'2021 Censusの教派別末端区分を重複なく合算。'})),sourceGroups:source.groups,national:record(source.national),cmas:source.cmas.map(record),regions:source.regions.map(record)};
}
