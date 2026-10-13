export type Source={urls:string[];inputSha256:string[]};
export type FoodFlow={year:number;unit:'t'|'1000 t';scope:string;topic:string;countryCodes:string[];stockConvention:'increase-positive'|'decrease-positive'|'not-returned';tradeBasis:'country'|'net-country-balances'|'verified-external';supply:{role:'production'|'imports'|'netImports'|'stockRelease'|'publishedAdjustment';label:string;value:number}[];uses:{role:'food'|'feed'|'processing'|'seed'|'losses'|'exports'|'netExports'|'stockBuild'|'other'|'publishedAdjustment';label:string;value:number}[];source:Source};
export type FoodCalories={year:number;unit:'kcal/day';scope:string;countryCodes:string[];numeratorDefinition:string;groups:{id:string;label:string;foodKcal:number;domesticKcal:number|null}[];source:Source};
export type FoodModels={region:{supply:FoodFlow[];calories:FoodCalories|null};countries:Record<string,{supply:FoodFlow[];calories:FoodCalories|null}>};
const codes=['CHN','JPN','KOR','PRK','MNG','TWN'];
const foodGroups=['cereals','oilcrops_fats_oils','sugar','roots_tubers_pulses','fruit_vegetables','meat','dairy_eggs_excl_butter','beverages_other','fish_seafood'];
function sourceScope(model:{year:number;countryCodes:string[];scope:string;source:Source}){
 if(model.year!==2023||!model.scope||!model.countryCodes.length||new Set(model.countryCodes).size!==model.countryCodes.length||model.countryCodes.some(c=>!codes.includes(c)))throw Error('Invalid year or statistical scope');
 if(!model.source.urls.length||model.source.urls.some(u=>!u.startsWith('https://'))||!model.source.inputSha256.length||model.source.inputSha256.some(h=>!/^[0-9a-f]{64}$/.test(h)))throw Error('Publisher source and raw-input hashes required');
}
const validAmount=(value:number)=>Number.isFinite(value)&&value>=0;
export function foodFlowParts(model:FoodFlow){
 sourceScope(model);
 if(!['t','1000 t'].includes(model.unit))throw Error('Food balance must use one matched mass unit');
 if(!['increase-positive','decrease-positive','not-returned'].includes(model.stockConvention))throw Error('Publisher stock-sign convention must be declared');
 if(model.stockConvention==='not-returned'&&[...model.supply,...model.uses].some(r=>r.role==='stockRelease'||r.role==='stockBuild'))throw Error('Unreturned stock rows cannot be inferred');
 if(model.countryCodes.length>1&&model.tradeBasis==='country')throw Error('Gross country imports/exports cannot be a regional external balance');
 if(model.tradeBasis==='net-country-balances'&&[...model.supply,...model.uses].some(r=>r.role==='imports'||r.role==='exports'))throw Error('Do not mix gross flows with net trade');
 if([...model.supply,...model.uses].some(r=>!validAmount(r.value)))throw Error('Missing, negative or non-finite components require source reconciliation');
 if(!model.supply.length||!model.uses.length)throw Error('Both source sides required');
 const supplyTotal=model.supply.reduce((s,r)=>s+r.value,0),useTotal=model.uses.reduce((s,r)=>s+r.value,0);
 return {supplyTotal,useTotal,difference:supplyTotal-useTotal,supply:model.supply.map(r=>({...r,percent:supplyTotal?r.value/supplyTotal*100:null})),uses:model.uses.map(r=>({...r,percent:useTotal?r.value/useTotal*100:null}))};
}
export function foodCalorieBands(model:FoodCalories){
 sourceScope(model);
 if(model.unit!=='kcal/day'||model.groups.length!==foodGroups.length||new Set(model.groups.map(g=>g.id)).size!==model.groups.length||model.groups.some(g=>!foodGroups.includes(g.id)))throw Error('One caloric unit and the nine disjoint source groups required');
 if(model.groups.some(g=>!validAmount(g.foodKcal)||g.domesticKcal!==null&&!validAmount(g.domesticKcal)))throw Error('Unknown food calories cannot receive a fabricated width');
 if(model.groups.some(g=>g.domesticKcal!==null)&&!model.numeratorDefinition)throw Error('Domestic-calorie definition required; weight ratios are not substitutes');
 const total=model.groups.reduce((s,g)=>s+g.foodKcal,0);
 return {total,groups:model.groups.map(g=>{const percent=g.foodKcal&&g.domesticKcal!==null?g.domesticKcal/g.foodKcal*100:null;return {...g,widthPercent:total?g.foodKcal/total*100:0,selfSufficiencyPercent:percent,selfStatus:g.foodKcal===0?'zero-denominator':g.domesticKcal===null?'missing-origin':'known',colorPercent:percent===null?null:Math.min(100,percent),exceeds100:percent!==null&&percent>100};})};
}
