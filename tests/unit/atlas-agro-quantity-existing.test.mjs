import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assessAgroQuantityRecord} from '../../src/lib/atlas-agro-quantity-contract.ts';
import {existingAgroMarketingQuantity,existingAgroMarketingQuantities} from '../../src/lib/atlas-agro-quantity-existing.ts';

test('all 22 retained marketing-year records satisfy the quantity contract while their missing partner stage remains partial',()=>{
 const records=existingAgroMarketingQuantities();assert.equal(records.length,22);
 for(const record of records){
  const assessment=assessAgroQuantityRecord(record);
  assert.deepEqual(assessment.errors,[],record.id);
  assert.equal(assessment.status,'partial',record.id);
  assert(assessment.gaps.includes('trade.coverage'));
  assert.equal(record.trade.partners.length,0);
  for(const source of record.sources)assert.equal(createHash('sha256').update(readFileSync(source.file)).digest('hex'),source.sha256);
 }
});
test('canonical units, rounded zeros, signed adjustment and product boundaries survive the adapter',()=>{
 const cotton=existingAgroMarketingQuantity('USA','cotton-lint-production');
 assert.equal(cotton.balance.imports.value,0);assert.equal(cotton.balance.imports.raw,'0.00');assert.equal(cotton.balance.imports.flag,'publisher-rounded-0.00-not-strict-zero');
 assert.equal(cotton.balance.adjustment.amount.value,-0.04);assert.equal(cotton.balance.adjustment.side,'use');
 assert.equal(cotton.bases.wasde.unit,'百万480ポンド俵');
 const rice=existingAgroMarketingQuantity('USA','rice-milled-production');assert.equal(rice.production.value,7.05);assert.equal(rice.bases.wasde.product,'rice-milled-production');
 for(const [country,series] of [['USA','rice-production'],['USA','qcl-328-production'],['RUS','wheat-production'],['EU','wheat-production'],['NZL','wheat-production']])assert.equal(existingAgroMarketingQuantity(country,series),undefined);
 cotton.production.value=999;assert.equal(existingAgroMarketingQuantity('USA','cotton-lint-production').production.value,14.41,'normalization cannot mutate retained source rows');
});
