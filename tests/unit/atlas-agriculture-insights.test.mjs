import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cropSupplyUse,supplyUseSource,supplyUsePercent,formatShare} from '../../src/data/atlas/supply-use.ts';
import {agricultureRelations} from '../../src/data/atlas/agriculture-relations.ts';
import {cropExplanations} from '../../src/data/atlas/explorer.ts';
import {livestockRegions} from '../../src/data/atlas/livestock.ts';
import {readAtlasState,writeAtlasState} from '../../src/lib/atlas-state.ts';
import {relationContextFeatures,fallbackProject} from '../../src/lib/atlas-relation-geometry.ts';
const sum=rows=>rows.reduce((n,row)=>n+row.value,0);

test('5作物の供給・排他的用途・調整が固定した原表の精度で一致する',()=>{
 assert.equal(createHash('sha256').update(readFileSync('scripts/data/wasde0926.txt')).digest('hex'),supplyUseSource.sha256);
 for(const id of ['corn','soybean','wheat','cotton','rice']){
  const d=cropSupplyUse(id);assert.equal(d.marketingYear,'2024/25');assert.ok(d.totalSupply>0);
  assert.ok(Math.abs(sum(d.supply)-d.totalSupply)<d.roundingTolerance);
  assert.ok(Math.abs(sum(d.destinations)+d.adjustment-d.totalSupply)<d.roundingTolerance);
  assert.equal(new Set(d.destinations.map(s=>s.id)).size,d.destinations.length);
  assert.ok(d.supply.concat(d.destinations).every(s=>s.value>=0));
  assert.ok(d.importNote.length>30);assert.ok(d.start<d.end);
 }
 assert.equal(cropSupplyUse('corn').domestic['other-fsi'],6815-5436);
 assert.equal(cropSupplyUse('soybean').domestic.crush,2445);
 assert.equal(cropSupplyUse('cotton').adjustment,-.04);
 assert.equal(cropSupplyUse('rice').imports,49.3);
 assert.match(cropSupplyUse('rice').basis,/籾米換算/);
 assert.equal(supplyUsePercent(1,0),null);assert.equal(supplyUsePercent(NaN,1),null);assert.equal(formatShare(22,16677),'1%未満');
});

test('関係の強調対象は既存の作物・畜産・地理へ解決し、画像の座標基準が一致する',()=>{
 const read=name=>JSON.parse(readFileSync('public/assets/atlas/'+name,'utf8')).features;
 const crops=read('v3/agriculture.geojson'),base=read('v3/base.geojson'),land=read('v3/land.geojson'),overlays=read('nature-v1/overlays.geojson');
 for(const relation of agricultureRelations){
  for(const id of relation.cropIds)assert.ok(crops.some(f=>f.properties.id===id),id);
  for(const id of relation.livestockRegionIds)assert.ok(livestockRegions.some(r=>r.id===id),id);
  for(const id of relation.baseFeatureIds)assert.ok(relationContextFeatures([id],base,land,overlays).length,id);
  assert.ok(relation.sources.every(s=>s.url.startsWith('https://www.ers.usda.gov/')));
 }
 assert.deepEqual(fallbackProject([-128,52]),[0,0]);assert.deepEqual(fallbackProject([-64,22]),[1800,1084]);
 assert.deepEqual(relationContextFeatures(['water:unknown'],base,land,overlays),[]);
});

test('強調ペアは条件と地域に2回ずつ現れ、生育と機械栽培の条件を分ける',()=>{
 const pairs=new Map();
 for(const crop of cropExplanations)for(const paragraph of crop.paragraphs){
  if(typeof paragraph==='string')continue;
  for(const run of paragraph.runs)if(run.pairId){const set=pairs.get(run.pairId)??[];set.push(run);pairs.set(run.pairId,set);}
 }
 assert.equal(pairs.size,9);
 for(const [id,runs] of pairs){assert.equal(runs.length,2,id);assert.equal(runs[0].emphasisKind,runs[1].emphasisKind,id);}
 assert.ok(cropExplanations[0].paragraphs[0].runs.map(r=>r.text).join('').includes('大型機械での栽培'));
});

test('relationのURLは単一対象と排他にし、他分野のパラメータと非表示層を保つ',()=>{
 const base='/insight-journal/atlas/north-america/';
 const url=new URL('https://example.com'+base+'agriculture/?relation=corn-soy-hogs&agriLayers=none&sector=services&subsector=finance');
 assert.equal(readAtlasState(url).relation,'corn-soy-hogs');
 const next=writeAtlasState(url,base,'natural',undefined,null,null,'rice','fit',[],null,null,{env:'water'},'corn-soy-hogs');
 assert.equal(next.searchParams.get('relation'),'corn-soy-hogs');assert.equal(next.searchParams.get('agriLayers'),'none');assert.equal(next.searchParams.get('subsector'),'finance');
 for(const query of ['crop=rice','region=sacramento-rice','animal=hogs&animalRegion=iowa-hogs']){
  const conflict=new URL(url);for(const [k,v] of new URLSearchParams(query))conflict.searchParams.set(k,v);
  assert.equal(readAtlasState(conflict).relation,null,query);
 }
 url.searchParams.set('relation','unknown');assert.equal(readAtlasState(url).relation,null);
});
