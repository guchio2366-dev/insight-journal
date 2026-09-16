import test from 'node:test';
import assert from 'node:assert/strict';
import {readAgricultureReadingState} from '../../src/lib/atlas-agriculture-detail-state.ts';
import {forestComparisonUrl,forestReturn,normalizeForestNavigation} from '../../src/lib/atlas-forestry-state.ts';
import {timberExample,forestRegions} from '../../src/data/atlas/forestry.ts';
import {readFileSync} from 'node:fs';
const base='/insight-journal/atlas/north-america/';
test('林業の直接URLと比較からの復帰で農畜産設定・カメラを保持する',()=>{
 for(const suffix of ['?agriReading=forestry:timber','#forestry-timber'])assert.equal(readAgricultureReadingState(new URL('https://example.com'+base+'agriculture/'+suffix)).view.kind,'forestry');
 const url=new URL('https://example.com'+base+'agriculture/?agriReading=forestry:timber&forestRegion=northwest&agriLayers=crops&stats=rice&agriProduct=rice&lng=-120&lat=45&z=5&view=custom');
 for(const target of ['precipitation','landform']){
  const comparison=forestComparisonUrl(url,base,target),back=forestReturn(comparison,base);
  for(const [key,value] of url.searchParams)assert.equal(back.searchParams.get(key),value);
  assert.equal(comparison.searchParams.has('agriProduct'),false);
  const cleared=normalizeForestNavigation(comparison,'industry');assert.equal(cleared.searchParams.has('forestCompare'),false);assert.equal(cleared.searchParams.has('forestReturn'),false);
 }
 const bad=forestReturn(new URL('https://example.com'+base+'nature/?forestReturn=redirect%3Dhttps%3A%2F%2Fevil.com%26forestRegion%3Dfake'),base);
 assert.equal(bad.pathname,base+'agriculture/');assert.equal(bad.searchParams.has('redirect'),false);assert.equal(bad.searchParams.has('forestRegion'),false);
});
test('林業の分類・事例統計・地理データの範囲が一致する',()=>{
 assert.equal(timberExample.products.reduce((a,p)=>a+p.share,0),100);assert.equal(timberExample.productionMcf,788881);
 const features=JSON.parse(readFileSync('public/assets/atlas/forestry/v1/regions.geojson')).features;
 assert.deepEqual(features.map(f=>f.properties.code).sort(),forestRegions.flatMap(r=>[...r.codes]).sort());
 const manifest=JSON.parse(readFileSync('public/assets/atlas/forestry/v1/manifest.json'));assert.deepEqual(manifest.classes,[41,42,43]);assert.equal(manifest.unknownColors,0);assert.ok(manifest.forestDisplayPixels>100000);
});
