import {ethnicityColors} from './atlas-population-dominant.ts';

export const ethnicityMissingColor='#384e58';
export const ethnicityMethod='白人（非ヒスパニック）以外の7区分で、人口割合が20%以上、または5%以上かつ同じ区分の全米割合の1.5倍以上を着色対象とします。複数が該当する郡は、その中で割合が最大の区分を地色にします。同率の場合は凡例の順です。都市名の色点は該当する全区分を同じ大きさで示し、人数や割合の大きさを表しません。';
export const ethnicityUncertainty='ACS 2020–2024の推計値による編集上の表示基準で、公式の地域区分や統計的な有意差を示すものではありません。推計誤差により基準付近の判定は変わり得ます。灰色や色点のない区分にも住民は暮らしています。';

function estimates(counts:unknown):number[]|null{
 if(!Array.isArray(counts)||counts.length!==8)return null;
 const ns=counts.map(pair=>Array.isArray(pair)?pair[0]:null);
 return ns.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)?ns:null;
}
export function ethnicityComposition(counts:unknown,national:unknown){
 const ns=estimates(counts),nation=estimates(national);
 if(!ns||!nation)return null;
 const total=ns.reduce((a,b)=>a+b,0),nationalTotal=nation.reduce((a,b)=>a+b,0);
 if(total<=0||nationalTotal<=0)return null;
 const shares=ns.map(n=>n/total),nationalShares=nation.map(n=>n/nationalTotal);
 const qualified=shares.flatMap((share,i)=>i>0&&(share>=.2||(share>=.05&&nationalShares[i]>0&&share>=1.5*nationalShares[i]))?[i]:[]);
 const primary=qualified.reduce<number|null>((best,i)=>best===null||shares[i]>shares[best]?i:best,null);
 return {shares,nationalShares,qualified,primary,total,color:ethnicityColors[primary??0]};
}
export function ethnicityFill(counts:unknown,national:unknown){return ethnicityComposition(counts,national)?.color??ethnicityMissingColor;}

/** A city label is a reference point. These explicit county scopes are not metro boundaries. */
export const ethnicityCityCounties:Record<string,string[]>={
 seattle:['53033'],
 'san-francisco':['06001','06013','06041','06055','06075','06081','06085','06095','06097'],
 'los-angeles':['06037'],'las-vegas':['32003'],denver:['08031'],dallas:['48113'],
 chicago:['17031'],detroit:['26163'],'new-orleans':['22071'],miami:['12086'],
 'washington-dc':['11001'],'new-york':['36005','36047','36061','36081','36085'],
};
export function cityEthnicityCounts(city:string,rows:Map<string,{counts:unknown}>){
 const ids=ethnicityCityCounties[city];if(!ids)return null;
 const groups=ids.map(id=>estimates(rows.get('county:'+id)?.counts));
 if(groups.some(group=>!group))return null;
 return Array.from({length:8},(_,i)=>[groups.reduce((sum,group)=>sum+group![i],0),null]);
}
