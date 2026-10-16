import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {agroMarketingYearFlow} from '../../src/data/atlas/agro-marketing-year-flow.ts';
import {atlasStatistics} from '../../src/data/atlas/statistics.ts';

const forest=JSON.parse(readFileSync('data-source/atlas/us-agro-20261016/forest-summary-2024.json'));
const verification=JSON.parse(readFileSync('data-source/atlas/us-agro-20261016/wasde-verification.json'));

test('US PDF verification supplements only US periods and the bounded cotton-import marker, preserving the exact retained text artifact',()=>{
 assert.equal(verification.country,'USA');assert.equal(verification.report,'WASDE-675');
 assert.equal(createHash('sha256').update(readFileSync(verification.retainedText.path)).digest('hex'),verification.retainedText.sha256);
 assert.deepEqual(Object.entries(verification.periods).map(([id,p])=>[id,p.start,p.end,p.footnotePage]),[
  ['corn','2024-09-01','2025-08-31',12],['soybean','2024-09-01','2025-08-31',15],['wheat','2024-06-01','2025-05-31',11],['rice','2024-08-01','2025-07-31',14],['cotton','2024-08-01','2025-07-31',17]
 ]);
 assert.equal(verification.cottonImportFootnote.upperExclusiveBales,5000);
 assert.equal(verification.cottonImportFootnote.upperExclusiveMillion480lbBales,.005);
 assert.equal(verification.cottonImportFootnote.notAnExactQuantity,true);
});

test('US forestry summary retains published rounded shares, product stages and unknown national quantities',()=>{
 assert.equal(forest.country,'USA');assert.equal(forest.year,2024);
 assert.equal(forest.source.url,'https://www.fao.org/forestry/statistics/data/en');
 assert.deepEqual(forest.products.map(p=>[p.publisherProduct,p.unit,p.worldProduction,p.usProductionSharePercent]),[
  ['Industrial roundwood','百万m³',1956,16],['Sawnwood','百万m³',445,17],['Wood pulp','百万t',189,null]
 ]);
 for(const product of forest.products){
  for(const key of ['nationalProduction','imports','exports','actualDomesticUse','apparentConsumption','stocks','exportDestinations'])assert.equal(product[key],null,key);
 }
 assert.match(forest.source.precision,/Never multiply/);
 assert.match(forest.products[0].definition,/燃料材を含む総丸太.*別/);
 assert.match(forest.products[2].reference,/19%.*Pulp for paper/);
 assert.match(forest.products[2].reference,/採用しない/);
});

test('US same-year supply denominator and signed gaps remain the publisher quantities, not production minus exports',()=>{
 const expected=[['maize-production',423.61,0,138.12],['soybean-production',129.18,0,66.55],['wheat-production',76.87,-.01,3.02],['rice-milled-production',9.88,0,null],['cotton-lint-production',17.56,-.04,null]];
 for(const [series,total,gap,subset] of expected){
  const flow=agroMarketingYearFlow('USA',series);
  assert.ok(Math.abs(flow.production+flow.imports+flow.beginningStocks-total)<1e-10);
  assert.equal(flow.roundingGap,gap);
  assert.equal(flow.domesticSubset?.value??null,subset);
  assert.ok(Math.abs(total-flow.domesticUse-flow.exports-flow.endingStocks-gap)<1e-10);
  assert.notEqual(flow.production-flow.exports,flow.domesticUse);
  assert.equal(flow.exportDestinations,null,'2025 calendar markets must not fill a marketing-year gap');
 }
});

test('calendar-year top-market concentration uses the same published quantity denominator and excludes Other from the top three',()=>{
 for(const data of Object.values(atlasStatistics.exports)){
  assert.equal(data.year,2025);assert.ok(data.total>0);
  const named=data.destinations.filter(r=>r.country!=='Other');
  assert.deepEqual(data.destinations.slice(0,3),[...named].sort((a,b)=>b.value-a.value).slice(0,3));
  assert.ok(data.destinations.slice(0,3).reduce((s,r)=>s+r.value,0)<=data.total);
 }
});
