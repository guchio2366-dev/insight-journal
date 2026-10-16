import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAgroQuantityRecord as assess,agroQuantityComparable} from '../../src/lib/atlas-agro-quantity-contract.ts';

// Synthetic accounting fixtures only; these observations never enter public data.
const amount=(value,basis='calendar')=>({value,basis,sourceIds:['fixture'],raw:String(value),quality:value===null?'missing':'reported'});
const fixture=()=>({
 id:'synthetic-soybean',region:'canada',seriesId:'soybean-production',
 scope:{id:'AAA',label:'Synthetic country',kind:'country',members:['AAA'],observedMembers:['AAA']},
 bases:{calendar:{period:'2024',periodKind:'calendar',product:'whole-soybeans',definition:'Synthetic whole beans, not oil or meal.',unit:'t',edition:'synthetic-2024'}},
 sources:[{id:'fixture',title:'Synthetic fixture',url:'https://example.test/fixture',file:'tests/fixtures/not-public.csv',sha256:'a'.repeat(64),locator:'synthetic row 1',kind:'official-extract'}],
 production:amount(100),worldProduction:amount(1000),
 balance:{method:'reported',imports:amount(20),exports:amount(40),domesticUse:amount(85),stocks:{kind:'levels',beginning:amount(10),ending:amount(5)},components:[{id:'feed',label:'Feed',amount:amount(30)},{id:'processing',label:'Processing input',amount:amount(55)},{id:'processing-subset',label:'An included processing subset',amount:amount(40),parentId:'processing'}],tolerance:{absolute:0,explanation:'Exact synthetic integers.'},notes:['Domestic total includes feed and processing; subsets are not added twice.']},
 trade:{boundary:'foreign',coverage:'complete',totalExports:amount(40),partners:[{id:'CCC',label:'Partner C',kind:'partner',amount:amount(15)},{id:'DDD',label:'Partner D',kind:'partner',amount:amount(25)}],tolerance:{absolute:0,explanation:'Exact synthetic integers.'},notes:['All synthetic partners.']}
});

test('matching production, stock balance and complete partner quantities pass without double-counting an included use',()=>{
 const record=fixture();assert.deepEqual(assess(record),{status:'complete',errors:[],gaps:[],qualifications:[]});
 assert(agroQuantityComparable(record,record.production,record.worldProduction,true));
});
test('missing imports remain a gap; a reported zero with source evidence is a distinct valid observation',()=>{
 const record=fixture();record.balance.imports=amount(null);assert.equal(assess(record).status,'partial');assert(assess(record).gaps.includes('balance.imports'));
 record.balance.imports=amount(0);record.balance.domesticUse=amount(65);record.balance.components=[];assert.equal(assess(record).status,'complete');
 record.balance.imports.quality='missing';assert(assess(record).errors.includes('balance.imports.missing-is-not-zero'));
});
test('World comparisons reject different years, units, processing stages and dataset editions',()=>{
 for(const mutation of [{period:'2023'},{unit:'1000t'},{product:'soybean-oil'},{edition:'another-edition'}]){
  const record=fixture();record.bases.other={...record.bases.calendar,...mutation};record.worldProduction.basis='other';
  assert(assess(record).errors.includes('production.world-basis'),JSON.stringify(mutation));
 }
});
test('country coverage cannot stand in for a complete region and internal destinations cannot become external exports',()=>{
 const record=fixture();record.scope={id:'synthetic-region',label:'Synthetic region',kind:'region',members:['AAA','BBB'],observedMembers:['AAA','BBB']};record.trade.boundary='external-region';assert.equal(assess(record).status,'complete');
 record.scope.observedMembers=['AAA'];assert(assess(record).gaps.includes('scope.coverage'));
 record.trade.partners[0].id='BBB';assert(assess(record).errors.includes('trade.partner.BBB.internal-trade'));
 record.trade.boundary='foreign';assert(assess(record).errors.includes('trade.boundary'));
});
test('production minus exports cannot be asserted as use when imports and stocks exist; qualified apparent use keeps its formula',()=>{
 const record=fixture();record.balance.domesticUse=amount(60);assert(assess(record).errors.includes('balance.equation'));
 record.balance.method='apparent-stock-unadjusted';record.balance.stocks={kind:'not-published'};record.balance.domesticUse={...amount(80),quality:'derived',raw:null,derivation:'production + imports - exports'};record.balance.components=[];
 assert.equal(assess(record).status,'qualified');assert(assess(record).qualifications.includes('balance.apparent-not-actual-consumption'));
 record.balance.domesticUse.quality='reported';assert(assess(record).errors.includes('balance.apparent-reported-as-use'));
});
test('partial or differently scoped partner tables stay incomplete and never acquire a fabricated remainder',()=>{
 const record=fixture();record.trade.partners.pop();record.trade.coverage='partial';assert.equal(assess(record).status,'partial');assert.deepEqual(record.trade.partners.map(p=>p.id),['CCC']);
 record.trade.coverage='complete';assert(assess(record).errors.includes('trade.complete-total'));
 record.trade.partners[0].id='WLD';assert(assess(record).errors.includes('trade.partner.WLD.aggregate'));
 record.trade.partners[0].amount.value=45;assert(assess(record).errors.includes('trade.partners-exceed-total'));
});
test('an export-production ratio above 100 percent is allowed without becoming a traced allocation',()=>{
 const record=fixture();record.production=amount(10);record.balance.imports=amount(110);record.balance.domesticUse=amount(85);assert.equal(assess(record).status,'qualified');
 assert(assess(record).qualifications.includes('balance.exports-exceed-production-not-an-allocation'));
});
test('a reported self-partner is retained with a qualification rather than silently recoded as domestic movement',()=>{
 const record=fixture();record.trade.partners[0].id='AAA';record.trade.partners[0].label='Reported return-trade label';
 const assessment=assess(record);assert.equal(assessment.status,'qualified');assert.deepEqual(assessment.errors,[]);
 assert(assessment.qualifications.includes('trade.reported-self-partner-not-inferred-domestic-trade'));
 assert.equal(record.trade.partners[0].amount.value,15);
});
test('stock variation sign and signed adjustments retain the original accounting side',()=>{
 const record=fixture();record.balance.stocks={kind:'change',change:amount(5),positiveMeans:'supply-withdrawal'};assert.equal(assess(record).status,'complete');
 record.balance.stocks.positiveMeans='stock-addition';assert(assess(record).errors.includes('balance.equation'));
 record.balance.stocks.change=amount(-5);assert.equal(assess(record).status,'complete');
 record.balance.adjustment={amount:amount(-2),side:'use'};record.balance.domesticUse=amount(87);assert.equal(assess(record).status,'complete');
});
test('hierarchical uses reject excess children and cycles while keeping subtotals outside the additive roots',()=>{
 const record=fixture();record.balance.components[2].amount=amount(60);assert(assess(record).errors.includes('balance.component.processing.children-exceed-parent'));
 record.balance.components[1].parentId='processing-subset';assert(assess(record).errors.includes('balance.components.cycle'));
});
test('the contract requires retained source provenance, justified tolerances, and explicit unresolved requirements',()=>{
 const record=fixture();record.sources[0].sha256='not-a-hash';assert(assess(record).errors.includes('source.fixture.provenance'));
 record.sources[0].sha256='a'.repeat(64);record.production.sourceIds=['absent'];assert(assess(record).errors.includes('production.source'));
 record.production.sourceIds=['fixture'];record.trade.tolerance={absolute:1,explanation:''};assert(assess(record).errors.includes('trade.rounding-evidence'));
 record.trade.tolerance.absolute=0;record.unresolved=[{field:'stock-definition',reason:'Publisher definition not retained.',evidence:['fixture']}];assert.equal(assess(record).status,'partial');
});
