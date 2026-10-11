import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const json=p=>JSON.parse(readFileSync(p));
test('少数派濃集はPRRI公表20郡の成人推計を保持し、USRC最大面から復元しない',()=>{
 const d=json('data-source/atlas/us-review/religion-prri-2023.json'),geometry=JSON.parse(gunzipSync(readFileSync('public/assets/atlas/population/v1/religion-counties-2020.geo.json.gz'))),ids=new Set(geometry.features.map(f=>f.properties.id));
 assert.equal(d.dataYear,2023);assert.equal(d.groups.length,2);
 for(const g of d.groups){assert.equal(g.rows.length,10);assert.equal(new Set(g.rows.map(r=>r.fips)).size,10);for(const r of g.rows){assert.ok(ids.has('county:'+r.fips));assert.ok(r.share>0&&r.share<=100);}}
 assert.equal(d.groups[0].rows.find(r=>r.fips==='36047').share,12);assert.equal(d.groups[1].rows.find(r=>r.fips==='36081').share,6);
 assert.ok(d.groups[0].width>d.groups[1].width,'重複郡で双方の輪郭色を残す');
});
test('全国林産物は2017年の丸太換算表と12公表値を保存し、NC2022や製品体積へ転用しない',()=>{
 const d=json('data-source/atlas/us-review/forest-national-2017.json');assert.equal(d.year,2017);assert.equal(d.unit,'thousand m3, roundwood equivalent');
 assert.deepEqual(d.rows.map(r=>[r.production,r.imports,r.exports,r.consumption]),[[179468,65919,16426,228961],[20653,8072,1339,27386],[143869,24783,28696,139957]]);
 for(const r of d.rows)assert.ok(Math.abs(r.production+r.imports-r.exports-r.consumption)<=1,'公表丸め差を超える転記誤り');
});
test('加工施設・田内坑井は別資料の公表参照位置を使い、州中央や排水口へ置換しない',()=>{
 const d=json('data-source/atlas/us-review/processing-sites.json');assert.equal(d.forest.length,2);assert.equal(d.energy.length,4);
 assert.deepEqual(d.energy.find(r=>r.id==='baytown-chemical').coordinates,[-95.018055,29.745277]);
 assert.deepEqual(d.energy.find(r=>r.id==='hugoton-well').coordinates,[-100.8315052,37.1566245]);
 const p=d.energy.find(r=>r.id==='kern-river-well').coordinates;assert.ok(Math.abs(p[0]+(118+59/60+27.2/3600))<1e-10);assert.ok(Math.abs(p[1]-(35+26/60+42.4/3600))<1e-10);
 for(const r of [...d.forest,...d.energy]){assert.match(r.url,/ecology\.wa\.gov|ceqanet\.lci\.ca\.gov|tceq\.texas\.gov|kgs\.ku\.edu/);assert.ok(r.coordinates.every(Number.isFinite));assert.equal(r.production,undefined);}
});
