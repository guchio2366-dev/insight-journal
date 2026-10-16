import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {agroRegionIds} from '../../src/lib/atlas-agro-quantity-contract.ts';
import {assessAgroQuantityCoverage as assess} from '../../src/lib/atlas-agro-quantity-coverage.ts';

test('thirteen region names with no audited item inventory cannot pass the global data gate',()=>{
 const ledger={baseCommit:'a'.repeat(40),regions:agroRegionIds.map(id=>({id,inventoryVerified:false,records:[],unresolved:[]}))};
 const result=assess(ledger,[]);assert.equal(result.dataGatePassed,false);assert.equal(result.regions.length,13);assert.equal(result.gaps.length,26);
 for(const region of ledger.regions)region.inventoryVerified=true;
 assert.equal(assess(ledger,[]).dataGatePassed,false,'a hand-written verified flag cannot make an empty inventory complete');
});
test('the initial ledger covers each authorized region and explicitly awaits its deliverable',()=>{
 const ledger=JSON.parse(readFileSync('src/data/atlas/agro-quantity-coverage.json','utf8'));
 assert.deepEqual(ledger.regions.map(region=>region.id),[...agroRegionIds]);
 assert.equal(assess(ledger,[]).dataGatePassed,false);
 assert(!ledger.regions.some(region=>region.id==='japan'));
});
test('missing regions, duplicate identities, unresolved requirements and incorrect record links stay blocking',()=>{
 const ledger={baseCommit:'a'.repeat(40),regions:[{id:'us',inventoryVerified:true,inventory:[{scopeId:'USA',seriesId:'soybean-production',recordId:'absent'}],records:['absent'],unresolved:[{id:'same-year-partners',reason:'Not acquired.'}]}]};
 let result=assess(ledger,[]);assert.equal(result.dataGatePassed,false);assert(result.gaps.includes('canada.delivery'));assert(result.gaps.includes('us.USA.soybean-production.record'));assert(result.gaps.includes('us.reported.same-year-partners'));assert(result.errors.includes('us.record-link.absent'));
 ledger.regions.push(ledger.regions[0]);result=assess(ledger,[]);assert(result.errors.includes('coverage.duplicate-region'));
});
