import {canadaDemographicShare} from './atlas-canada-demographics.ts';
export const concentrationMethod='地域内20%以上、または5%以上かつ全国割合の1.5倍以上を集積対象とします。複数該当なら全国比が最も高い区分を地色にします。同率は凡例順。無宗教と「可視的少数者に該当しない」は概要図の背景とし、凡例で割合を確認できます。';
export const concentrationNote='色は、その地域に特徴的に集中する宗教・教派または人口集団を示します。地域内で最多、または人口の過半数を占めることを意味しません。';
export function demographicComposition(record:any,data:any,topic:string){
 const rows=data.groups.map((g:any)=>{const cell=record.values[g.id],share=canadaDemographicShare(cell?.value??null,record.denominator.value),national=canadaDemographicShare(data.national.values[g.id]?.value??null,data.national.denominator.value);return {...g,count:cell?.value??null,symbol:cell?.symbol??'',share,national,ratio:share!==null&&national!==null&&national>0?share/national:null};});
 const missing=rows.some((g:any)=>g.share===null),qualified=missing?[]:rows.filter((g:any)=>g.id!==(topic==='religion'?'25':'3')&&g.ratio!==null&&(g.share>=20||g.share>=5&&g.ratio>=1.5));
 const primary=qualified.reduce((best:any,g:any)=>!best||g.ratio>best.ratio?g:best,null);return {rows,qualified,primary,missing};
}
export const ethnicColors:Record<string,string>={'3':'#d3d6d4','4':'#8870b5','5':'#4f91ba','6':'#218b83','7':'#c17caa','8':'#a78345','9':'#e28b40','10':'#5d8dba','11':'#a16c52','12':'#9a83bc','13':'#bb6477','14':'#927563','15':'#bd788e','87':'#bd983b'};
export const religiousColors:Record<string,string>={'2':'#b69a46','4':'#798a94','5':'#797c38','6':'#407f99','7':'#be6750','8':'#9b4f67','9':'#8070b1','10':'#8c733e','11':'#5177a8','12':'#7b9270','13':'#b17094','14':'#bd873f','15':'#6873a0','16':'#925750','17':'#4e9990','18':'#a2937f','19':'#d47a3e','20':'#626aa3','21':'#4f8067','22':'#d5ad42','23':'#345b78','24':'#8b6d9d','25':'#d3d6d4'};
