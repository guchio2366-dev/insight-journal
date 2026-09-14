import {densityColors,shareColors,voteColors,missingColor} from '../data/atlas/population.ts';
export type County={id:string;name:string;state:string;population:[number|null,number|null];area:number;class?:number};
export function populationColor(value:number|null,kind:string){
 if(value===null||!Number.isFinite(value)||kind!=='vote'&&value<0)return missingColor;
 if(kind==='vote')return value<=-15?voteColors[0]:value<=-5?voteColors[1]:value<5?voteColors[2]:value<15?voteColors[3]:voteColors[4];
 if(kind==='distribution')return densityColors[value===0?0:value<=1?1:value<10?2:value<100?3:value<1000?4:value<10000?5:6];
 if(value>100)return missingColor;
 return shareColors[value===0?0:value<1?1:value<5?2:value<10?3:value<25?4:value<50?5:value<75?6:7];
}
export const density=(row:County)=>row.population[0]!==null&&row.area>0?row.population[0]/row.area:null;
export function validatePopulation(value:any):boolean{return value?.version===1&&Array.isArray(value.rows)&&value.rows.every((r:any)=>typeof r.id==='string');}
