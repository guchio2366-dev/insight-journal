/** Beck et al. (2023), Table 1. Classification of station normals, not map cells. */
export const latinStationClimateMethod={name:'Beck et al. (2023)：区分の判定条件（表1）',url:'https://www.nature.com/articles/s41597-023-02549-6'};
export function classifyLatinStation(temperature:readonly (number|null)[],precipitation:readonly (number|null)[]):string|undefined {
 if(temperature.length!==12||precipitation.length!==12||temperature.some(v=>v===null||!Number.isFinite(v))||precipitation.some(v=>v===null||!Number.isFinite(v)||v<0))return undefined;
 const t=temperature as readonly number[],p=precipitation as readonly number[],mean=t.reduce((a,b)=>a+b,0)/12,annual=p.reduce((a,b)=>a+b,0),cold=Math.min(...t),hot=Math.max(...t);
 const first=[3,4,5,6,7,8],second=[9,10,11,0,1,2],sum=(a:readonly number[],indexes:number[])=>indexes.reduce((total,i)=>total+a[i],0);
 const summer=sum(t,first)>=sum(t,second)?first:second,winter=summer===first?second:first;
 const sp=sum(p,summer),wp=sum(p,winter),dryLimit=20*mean+(wp>annual*.7?0:sp>annual*.7?280:140);
 if(annual<dryLimit)return 'B'+(annual<dryLimit/2?'W':'S')+(mean>=18?'h':'k');
 if(cold>=18){const dry=Math.min(...p);return dry>=60?'Af':dry>=100-annual/25?'Am':'Aw';}
 if(hot<=10)return hot>0?'ET':'EF';
 const s=Math.min(...summer.map(i=>p[i]))<40&&Math.min(...summer.map(i=>p[i]))<Math.max(...winter.map(i=>p[i]))/3;
 const w=Math.min(...winter.map(i=>p[i]))<Math.max(...summer.map(i=>p[i]))/10;
 const season=s&&w?(wp>sp?'s':'w'):s?'s':w?'w':'f';
 const warmth=hot>=22?'a':t.filter(v=>v>10).length>=4?'b':cold<=-38?'d':'c';
 return (cold>0?'C':'D')+season+warmth;
}
