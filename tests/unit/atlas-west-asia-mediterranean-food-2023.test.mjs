import test from 'node:test';
import assert from 'node:assert/strict';
import packet from '../../src/data/atlas/west-asia-mediterranean-food-2023.json' with {type:'json'};

test('FBS fruit and oil summaries use the same returned 19-country set without treating missing Palestine as zero',()=>{
 assert.equal(packet.year,2023);
 assert.equal(packet.coverageM49.length,19);
 assert.deepEqual(packet.absentM49,['275']);
 assert.equal(Object.keys(packet.sourceFiles).length,11);
 for(const file of Object.values(packet.sourceFiles))assert.match(file.sha256,/^[0-9a-f]{64}$/);
 for(const [key,code] of [['dates','S2619'],['oliveOil','S2580']]){
  const fbs=packet[key].FBS;
  assert.equal(fbs.itemCode,code);
  assert.equal(fbs.unit,'1000 t');
  assert.equal(fbs.returnedCoverage['5301'],19);
  assert.equal(fbs.returnedCoverage['5142'],19);
  assert(fbs.returnedSums['5301']>=fbs.returnedSums['5142']);
 }
 assert.equal(packet.dates.FBS.returnedSums['5301'],5992);
 assert.equal(packet.oliveOil.FBS.returnedSums['5301'],428);
 assert.notEqual(packet.oliveOil.FBS.returnedSums['5511']*1000,packet.oliveOil.SCL.returnedSums['5510']);
});

test('olive oil export pie represents returned external trade partners only',()=>{
 const tm=packet.oliveOil.TM;
 assert.equal(tm.itemCode,'2167');
 for(const side of [tm.imports,tm.exports]){
  assert(Math.abs(side.internal+side.external-side.allReturned)<0.001);
  assert(Math.abs(side.partners.reduce((sum,row)=>sum+row[2],0)-side.external)<0.001);
 }
 assert.equal(tm.exports.reportersExternal,14);
 assert(packet.limits.some(note=>note.includes('must not be added')));
});
