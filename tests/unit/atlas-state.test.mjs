import test from 'node:test';
import assert from 'node:assert/strict';
import { readAtlasState, writeAtlasState } from '../../src/lib/atlas-state.ts';
test('地図の分野と位置・倍率をURLから復元する',()=>{
 const state=readAtlasState(new URL('https://example.org/insight-journal/atlas/north-america/land/?lng=-100&lat=40&z=4.125&crop=corn'));
 assert.equal(state.field,'land');assert.deepEqual(state.camera,{lng:-100,lat:40,zoom:4.125});
});
test('未指定・不正な位置をゼロに変換せず全体表示に戻す',()=>{
 for(const q of ['','?lng=&lat=40&z=4','?lng=Infinity&lat=40&z=4','?lng=-100&lat=90&z=4','?lng=-100&lat=40&z=22'])assert.equal(readAtlasState(new URL('https://example.org/'+q)).camera,null);
});
test('分野の切替で位置・倍率を維持し、旧タップ領域のURLを除去する',()=>{
 const next=writeAtlasState(new URL('https://example.org/insight-journal/atlas/north-america/agriculture/?zone=zone-corn-belt&insight=old'),'/insight-journal/atlas/north-america/','land',{lng:-92.1,lat:41.2,zoom:5.23});
 assert.equal(next.pathname,'/insight-journal/atlas/north-america/land/');assert.equal(next.searchParams.get('z'),'5.2300');assert.equal(next.searchParams.has('zone'),false);
});
