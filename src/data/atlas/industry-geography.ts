import stateData from '../../../public/assets/atlas/industry-v1/state-economy.json' with {type:'json'};
import type {IndustryRegion} from './industry-regions';
import {subsectorLabel} from './industry-catalog';
// State membership of the existing source-backed representative locations.
// Powder River spans WY/MT: the registered anchor is in Wyoming, not a basin boundary.
const stateByPlace:Record<string,string>={newportnews:'51',hornell:'36',michigan:'26',kentucky:'21',alabama:'01',sanantonio:'48',washington:'53',moseslake:'53',fortworth:'48',california:'06',austin:'48',dallas:'48',wisconsin:'55',illinois:'17',ohio:'39',houston:'48','texas-oil':'48',northdakota:'38',pennsylvania:'42',wyoming:'56',arizona:'04',nevada:'32',newyork:'36',reno:'32',lasvegas:'32'};
export function industryPlaceLabel(r:IndustryRegion){
 if(r.subsector==='mining')return r.id==='wy-coal'?'石炭採掘':r.id==='arizona-mining'?'銅などの鉱物採掘':'金などの鉱物採掘';
 if(r.subsector==='other-manufacturing')return '家具製造';
 return subsectorLabel(r.sector,r.subsector);
}
export function industryStateGroups(regions:readonly IndustryRegion[]){
 const grouped=new Map<string,IndustryRegion[]>();
 for(const r of regions){const id=stateByPlace[r.placeId];if(!id)throw new Error(`State missing for ${r.id}`);grouped.set(id,[...(grouped.get(id)??[]),r]);}
 return [...grouped].map(([id,regions])=>{const state=stateData.states.find(s=>s.id===id)!;return {id,name:state.name,coordinates:state.coordinates as [number,number],regions,industries:[...new Set(regions.map(industryPlaceLabel))]};});
}
