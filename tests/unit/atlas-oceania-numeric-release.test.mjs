import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isVerifiedOceaniaCropGrid} from '../../scripts/lib/atlas-oceania-numeric-release.mjs';
const root=new URL('../../public/assets/atlas/oceania-crops-v1/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
test('only pinned source-derived Oceania numeric grids qualify for the identifier heuristic exception',()=>{
 for(const name of ['wheat.values.gz','coconut.values.gz','cacao.values.gz']){
  const bytes=readFileSync(new URL(name,root));assert.equal(isVerifiedOceaniaCropGrid(name,bytes,manifest),true);
  const bad=Buffer.from(bytes);bad[20]^=1;assert.throws(()=>isVerifiedOceaniaCropGrid(name,bad,manifest),/hash mismatch/);
  assert.equal(isVerifiedOceaniaCropGrid(name,bytes,{...manifest,year:2021}),false);
  assert.equal(isVerifiedOceaniaCropGrid(name,bytes,{...manifest,layers:manifest.layers.map(l=>({...l,width:1}))}),false);
 }
 assert.equal(isVerifiedOceaniaCropGrid('notes.json.gz',Buffer.from('PRIVATE_SENTINEL'),manifest),false);
});
