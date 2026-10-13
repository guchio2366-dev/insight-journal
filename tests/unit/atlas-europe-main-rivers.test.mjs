import test from 'node:test';
import assert from 'node:assert/strict';
import {europeMainRivers,europeMainRiverSelection,europeMainRiverForBasin,europeDrainageBasins} from '../../src/lib/atlas-europe-drainage.ts';
import {readEuropeState,writeEuropeState} from '../../src/lib/atlas-europe-view.ts';
import {europeComparisonUrl,readEuropeReturn} from '../../src/lib/atlas-europe-comparison.ts';
test('five retained main-river selections use outlet IDs and closed source downstream paths',()=>{
 for(const river of europeMainRivers.filter(r=>r.mainBasin)){
  const selection=europeMainRiverSelection(river.id);assert.equal(Number(selection.basin),river.mainBasin);
  const members=europeDrainageBasins.filter(b=>b.MAIN_BAS===river.mainBasin);assert.ok(members.length);
  for(const basin of members){let at=basin;const seen=new Set();while(at.NEXT_DOWN){assert.ok(!seen.has(at.HYBAS_ID));seen.add(at.HYBAS_ID);at=members.find(b=>b.HYBAS_ID===at.NEXT_DOWN);assert.ok(at);}assert.equal(at.HYBAS_ID,river.mainBasin);}
  assert.equal(europeMainRiverForBasin(selection.basin).id,river.id);
 }
});
test('missing Thames and Ural never inherit the UK coastal aggregate or a guessed polygon',()=>{
 for(const id of ['thames','ural']){
  const s=readEuropeState('?layer=drainage&riverBasin='+id+'&basin=2040048790',[],[]);assert.equal(s.riverBasin,id);assert.equal(s.basin,undefined);
  const url=writeEuropeState(new URL('https://example.test/atlas/europe/nature/'),s);assert.equal(url.searchParams.has('basin'),false);assert.equal(url.searchParams.get('riverBasin'),id);
 }
 assert.equal(europeMainRiverForBasin('2040048790'),undefined);
 assert.equal(europeMainRiverSelection('unknown'),undefined);
});
test('named river selection round-trips through URL and comparison source, while raw section URLs remain valid',()=>{
 for(const river of europeMainRivers){const state=readEuropeState('?layer=drainage&riverBasin='+river.id,[],[]);assert.deepEqual(readEuropeState(writeEuropeState(new URL('https://example.test/atlas/europe/nature/'),state).search,[],[]),state);
 const next=europeComparisonUrl(new URL('https://example.test/atlas/europe/nature/'),state,{id:'drainage-terrain',label:'地形',question:'比較',targetLayer:'terrain'});assert.deepEqual(readEuropeReturn(next.searchParams.get('europeReturn'),[],[]),state);}
 const old=readEuropeState('?layer=drainage&basin=2040539930',[],[]);assert.equal(old.basin,'2040539930');assert.equal(old.riverBasin,undefined);
});
