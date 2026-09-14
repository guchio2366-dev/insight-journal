import test from 'node:test';
import assert from 'node:assert/strict';
import {readAgricultureReadingState as read,writeAgricultureReadingState as write} from '../../src/lib/atlas-agriculture-detail-state.ts';
const url=s=>new URL('https://example.com/atlas/agriculture/'+s);
test('農業の初期表示と明示選択、旧URLの優先順位を復元',()=>{
 for(const [query,kind,id] of [
  ['', 'overview'],['?stats=rice&livestockStats=dairy','product','rice'],['?livestockStats=dairy','product','dairy'],
  ['?stats=rice&agriReading=product:dairy','product','dairy'],['?agriReading=product:dairy#crop-specialty','product','specialty'],
  ['?agriReading=bad&crop=cotton','product','cotton'],['?animal=beef&animalRegion=northern-plains-beef','product','beef'],
  ['?crop=corn-soybean&stats=rice','map-context','corn-soybean'],['?relation=plains-wheat-cattle&stats=rice','relation','plains-wheat-cattle'],
  ['?agriReading=overview&agriProduct=dairy&stats=rice','overview'],['#crop-details','overview']
 ]){const s=read(url(query));assert.equal(s.view.kind,kind,query);if(id)assert.equal(s.view.id,id,query);}
});
test('関係の再読み込みで未選択品目を既定のとうもろこしに変えず、対象と他分野パラメータを維持',()=>{
 for(const resumeProductId of [null,'rice','dairy','specialty']){
  const state={view:{kind:'relation',id:'corn-soy-hogs'},resumeProductId};
  const result=write(url('?stats=corn&livestockStats=beef&city=miami&sector=services#source-usda'),state);
  assert.deepEqual(read(result),state);assert.equal(result.searchParams.get('city'),'miami');assert.equal(result.hash,'#source-usda');
 }
});
