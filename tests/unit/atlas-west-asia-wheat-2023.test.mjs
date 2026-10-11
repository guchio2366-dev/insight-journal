import test from 'node:test';
import assert from 'node:assert/strict';
import packet from '../../src/data/atlas/west-asia-wheat-2023.json' with {type:'json'};

test('the handoff keeps the raw-file identity and incompatible commodity definitions separate',()=>{
 assert.equal(packet.year,2023);
 assert.equal(packet.FBS.itemCode,'S2511');
 assert.equal(packet.FBS.unit,'1000 t');
 assert.equal(packet.TM.itemCode,'0111');
 assert.equal(packet.TM.unit,'t');
 assert.equal(packet.FBS.coverageM49.length,19);
 assert.deepEqual(packet.FBS.absentM49,['275']);
 for(const file of Object.values(packet.sourceFiles)){
  assert.match(file.sha256,/^[0-9a-f]{64}$/);
  assert(file.records>0);
 }
});

test('three complete FBS examples retain signed stocks, residuals, missing tourists and rounding',()=>{
 const fbs=packet.FBS;
 assert.deepEqual(fbs.examples.map(row=>row.m49),['051','512','792']);
 for(const row of fbs.examples){assert.equal(Object.keys(row.values).length,12);assert(!Object.hasOwn(row.values,'5171'));}
 for(const [element,expected] of Object.entries(fbs.exampleSum)){
  assert.equal(fbs.examples.reduce((sum,row)=>sum+row.values[element],0),expected,element);
 }
 const v=fbs.exampleSum;
 assert.equal(v['5511']+v['5611']-v['5911']-v['5072'],35467);
 assert.equal(v['5142']+v['5521']+v['5527']+v['5123']+v['5131']+v['5154']+v['5170'],35467);
 assert.equal(v['5301'],35468);
 assert.equal(fbs.returnedCoverage['5511'],18);
 assert.equal(fbs.returnedCoverage['5171'],3);
});

test('trade partner pies use only returned external rows from each actual reporter set',()=>{
 const tm=packet.TM;
 assert.equal(tm.imports.reporters,16);
 assert.equal(tm.exports.reportersExternal,9);
 for(const side of [tm.imports,tm.exports]){
  assert(Math.abs(side.internal+side.external-side.allReturned)<0.001);
  assert(Math.abs(side.partners.reduce((sum,row)=>sum+row[2],0)-side.external)<0.001);
  assert(side.externalRows<side.rows);
 }
 assert(packet.limits.some(note=>note.includes('Calories of domestic origin')));
});
