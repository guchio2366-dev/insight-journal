import type {IndustryCountryScope} from '../asia-industry.ts';
import {asiaPlaceReadings} from '../asia-place-readings.ts';

const story=(id:string)=>asiaPlaceReadings.find(s=>s.id===id)!;
const countryStories={IDN:story('jakarta-industry'),VNM:story('hochiminh-industry'),THA:story('thailand-coast')};

// Country study and regional merchandise trade have different coverage.
// Original observations, facilities and Malaysia's domestic series stay intact.
export const southeastIndustryCountryScope:IndustryCountryScope={
 label:'東南アジア',
 countries:[{code:'IDN',name:'インドネシア'},{code:'VNM',name:'ベトナム'},{code:'THA',name:'タイ'}],
 regionalTrade:true,
 readings:Object.fromEntries(Object.entries(countryStories).map(([code,s])=>[code,{title:s.name,reading:s.reading,scope:s.scope,source:s.source}])),
};
