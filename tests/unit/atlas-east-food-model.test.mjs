import test from 'node:test';
import assert from 'node:assert/strict';
import {foodFlowParts,foodCalorieBands} from '../../src/lib/atlas-east-food-model.ts';

// Synthetic arithmetic fixtures stay in tests; no fixture values enter public data.
const source={urls:['https://example.test/publisher-food-balance'],inputSha256:['a'.repeat(64)]};
const scope={year:2023,scope:'test only',countryCodes:['CHN','JPN'],source};
test('regional balances reject national gross trade; published discrepancies are retained',()=>{
 const input={...scope,topic:'wheat',unit:'1000 t',stockConvention:'increase-positive',tradeBasis:'net-country-balances',supply:[{role:'production',label:'production',value:100},{role:'netImports',label:'net imports',value:20},{role:'stockRelease',label:'stock release',value:5}],uses:[{role:'food',label:'food',value:70},{role:'feed',label:'feed',value:50}]};
 const result=foodFlowParts(input);assert.equal(result.supplyTotal,125);assert.equal(result.useTotal,120);assert.equal(result.difference,5);assert.equal(result.supply[0].percent,80);
 assert.throws(()=>foodFlowParts({...input,tradeBasis:'country'}),/regional external/);
 assert.throws(()=>foodFlowParts({...input,supply:[{role:'imports',label:'gross imports',value:20}]}),/mix gross/);
 assert.throws(()=>foodFlowParts({...input,uses:[{role:'food',label:'missing',value:null}]}),/Missing/);
 assert.throws(()=>foodFlowParts({...input,year:2024}),/year/);
 assert.throws(()=>foodFlowParts({...input,stockConvention:'not-returned'}),/stock rows/);
});
test('calorie widths use food calories; 100-percent excess and missing origin remain distinct',()=>{
 const ids=['cereals','oilcrops_fats_oils','sugar','roots_tubers_pulses','fruit_vegetables','meat','dairy_eggs_excl_butter','beverages_other','fish_seafood'];
 const model={...scope,unit:'kcal/day',numeratorDefinition:'test caloric production potential',groups:ids.map((id,i)=>({id,label:id,foodKcal:i===0?200:i===1?100:0,domesticKcal:i===0?300:null}))};
 const result=foodCalorieBands(model);assert.equal(result.total,300);assert(Math.abs(result.groups[0].widthPercent-200/3)<1e-10);assert.equal(result.groups[0].selfSufficiencyPercent,150);assert.equal(result.groups[0].colorPercent,100);assert.equal(result.groups[0].exceeds100,true);
 assert.equal(result.groups[1].selfStatus,'missing-origin');assert.equal(result.groups[1].colorPercent,null);assert.equal(result.groups[2].selfStatus,'zero-denominator');
 assert.throws(()=>foodCalorieBands({...model,unit:'t'}),/caloric unit/);
 assert.throws(()=>foodCalorieBands({...model,groups:[...model.groups,model.groups[0]]}),/disjoint/);
 assert.throws(()=>foodCalorieBands({...model,groups:model.groups.map((g,i)=>i===0?{...g,foodKcal:null}:g)}),/Unknown food calories/);
});
