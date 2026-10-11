import test from 'node:test';
import assert from 'node:assert/strict';
import packet from '../../src/data/atlas/west-asia-olives-dates-2023-missing.json' with {type:'json'};

test('preserved-inclusive olive FBS keeps 13 quantity elements and their separate country coverage',()=>{
 assert.equal(packet.FBS.itemCode,'S2563');
 assert.equal(packet.FBS.unit,'1000 t');
 assert.equal(packet.FBS.values.length,13);
 assert.equal(packet.FBS.sourceQuery.expectedQuantityRows,157);
 assert.deepEqual(packet.FBS.absentM49,['275']);
 const scope=new Set(packet.FBS.coverageM49);
 for(const [code,,returned,unreturned] of packet.FBS.values){
  assert.equal(new Set([...returned,...unreturned]).size,19,code);
  assert.deepEqual(new Set([...returned,...unreturned]),scope,code);
  assert.equal(returned.filter(country=>unreturned.includes(country)).length,0,code);
 }
 const byCode=Object.fromEntries(packet.FBS.values.map(row=>[row[0],row]));
 assert.equal(byCode['5301'][1],4053);
 assert.equal(byCode['5142'][1],1139);
 assert.equal(byCode['5301'][2].length,19);
 assert.equal(byCode['5142'][2].length,19);
 assert.equal(byCode['5511'][2].length,12);
 assert.equal(byCode['5131'][2].length,10);
 assert.equal(byCode['5521'][2].length,1);
 assert.equal(byCode['5072'][1],-21);
});

test('raw, preserved and date TM series each close over returned external partners only',()=>{
 assert.equal(Object.keys(packet.sourceFiles).length,4);
 for(const file of Object.values(packet.sourceFiles))assert.match(file.sha256,/^[a-f0-9]{64}$/);
 assert.equal(packet.TM.rows.length,6);
 assert.equal(packet.TM.rows.reduce((n,row)=>n+row.expectedExternalRows,0),1272);
 for(const row of packet.TM.rows){
  assert.equal(row.partners.length,6);
  assert.equal(row.elementCode,row.direction==='exports'?'5910':'5610');
  assert(Math.abs(row.partners.reduce((n,partner)=>n+partner[2],0)-row.externalTonnes)<0.001,row.itemCode+' '+row.direction);
  assert(row.partners.slice(0,5).every((partner,index,list)=>index===0||list[index-1][2]>=partner[2]));
  assert.equal(row.partners[5][0],null);
  assert(row.externalReporterCountries.every(code=>packet.scope20M49.includes(code)));
 }
 assert.equal(packet.TM.rows.find(row=>row.itemCode==='01450'&&row.direction==='exports').externalTonnes,416.57);
 assert.equal(packet.TM.rows.find(row=>row.itemCode==='F0262'&&row.direction==='exports').externalTonnes,141198.64);
 assert.equal(packet.TM.rows.find(row=>row.itemCode==='01314'&&row.direction==='exports').externalTonnes,302881.72);
});
