import source from '../../../../data-source/atlas/latin-reading/culture-supplement-2018.json';
export const guatemalaIdentity2018=source.guatemala;
export const colombiaIndigenous2018=source.colombia;
export const latinCultureSupplements=[guatemalaIdentity2018,colombiaIndigenous2018];
/** Country-specific classification and statistical grain; no shared ethnic taxonomy. */
export function latinCultureSupplementSelection(choice:string){
 const [country,id]=choice.split(':');
 const data=latinCultureSupplements.find(d=>d.country===country);
 if(!data)return null;
 const row=data.rows.find(r=>r.id===id);
 if(id!=='national'&&!row)return null;
 return {data,row};
}
