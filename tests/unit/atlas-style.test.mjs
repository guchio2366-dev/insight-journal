import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { createAtlasStyle, setFieldLayers } from '../../src/lib/atlas-style.ts';
const json=name=>JSON.parse(readFileSync(new URL('../../public/assets/atlas/v3/'+name,import.meta.url),'utf8'));

test('実データを含むスタイルが固定MapLibre版の仕様に適合し、外部タイルやフォントを要求しない',()=>{
  const style=createAtlasStyle({assetBase:'/insight-journal/assets/atlas/v3/'},json('manifest.json'),json('base.geojson'),json('agriculture.geojson'),json('land.geojson'));
  assert.deepEqual(validateStyleMin(style).map(e=>e.message),[]);
  style.layers.find(l=>l.id==='crops-overlap').paint['fill-pattern']='overlap-stripe';
  assert.deepEqual(validateStyleMin(style).map(e=>e.message),[]);
  assert.equal(style.glyphs,undefined);assert.equal(style.sprite,undefined);
  for(const key of ['base','crops','land','relief','climate','cities','aquifers','contours'])assert.ok(style.sources[key]);
  assert.ok(style.sources.relief.url.startsWith('/insight-journal/'));
});

test('分野切替は共通地図の表示属性だけを変え、位置・倍率・スタイルを初期化しない',()=>{
  const calls=[];
  const map={setLayoutProperty:(...args)=>calls.push(args),fitBounds:()=>assert.fail('camera reset'),jumpTo:()=>assert.fail('camera reset'),setStyle:()=>assert.fail('map rebuild')};
  setFieldLayers(map,'agriculture');setFieldLayers(map,'land');setFieldLayers(map,'agriculture');
  const cropCalls=calls.filter(c=>['crops-fill','crops-outline','crops-overlap'].includes(c[0]));
  assert.equal(cropCalls.length,9);
  assert.deepEqual(cropCalls.map(c=>c[2]),['visible','visible','visible','none','none','none','visible','visible','visible']);
});
