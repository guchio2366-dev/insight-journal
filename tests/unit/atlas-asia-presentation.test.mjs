import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {gridCellAt,readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';
import {industryTopicGroup,naturalGroups,naturalGroup,populationGroup,populationGroups} from '../../src/data/atlas/asia-navigation.ts';
import {createAsiaNavigation} from '../../src/scripts/atlas-asia-navigation.ts';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const base='public/assets/atlas/asia-presentation-v1/';
const manifest=json(base+'manifest.json');

test('Asia presentation assets retain exact input provenance and real climate anchors',()=>{
 for(const [path,hash] of Object.entries(manifest.inputs))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,path);
 const climate=json('public/assets/atlas/asia-climate-v2/manifest.json');
 for(const [region,presentation] of Object.entries(manifest.regions)){
  const record=climate.regions[region],values=gunzipSync(readFileSync('public/assets/atlas/asia-climate-v2/'+record.grid));
  for(const cls of presentation.climate)for(const [lng,lat] of cls.anchors)assert.equal(gridCellAt({...record,values},lng,lat),cls.id,`${region} ${cls.code}`);
  const farming=JSON.parse(gunzipSync(readFileSync(base+presentation.farming.file)));
  const ids=new Set(farming.features.map(f=>f.properties.id));
  assert.ok(ids.has('rice'));assert.ok(presentation.farming.products.filter(p=>p.kind==='crop').length>=6);assert.ok(presentation.farming.products.filter(p=>p.kind==='livestock').length>=4);
  for(const product of presentation.farming.products){assert.ok(ids.has(product.id),product.id);assert.ok(product.threshold>0);assert.match(product.color,/^#[0-9a-f]{6}$/);}
  const rain=JSON.parse(gunzipSync(readFileSync(base+presentation.rainfall.file)));
  assert.ok(rain.features.length>20);
  assert.equal(presentation.rainfall.interval,250);
  assert.ok(rain.features.every(f=>f.properties.value%250===0));
  const terrain=JSON.parse(gunzipSync(readFileSync(base+presentation.terrain.file)));
  assert.equal(presentation.terrain.interval,500);
  assert.ok(terrain.features.length>20);assert.ok(terrain.features.every(f=>f.properties.value%500===0));
  for(const product of presentation.farming.products){const parts=farming.features.filter(f=>f.properties.id===product.id);assert.ok(parts.length<=(product.kind==='crop'?6:3));assert.ok(parts.every(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)));}
  for(const f of rain.features){assert.equal(f.geometry.type,'LineString');assert.ok(presentation.rainfall.levels.includes(f.properties.value));assert.ok(f.geometry.coordinates.length>=2);}
  assert.ok(readFileSync(base+presentation.farming.file).length<600000,'overview remains lazy and compact');
 }
});

test('Asia has the requested four nature topics and four population primary tabs',()=>{
 assert.deepEqual(naturalGroups.map(t=>t.label),['気候区分','水資源','地形','標高（等高線）']);
 assert.equal(naturalGroup('basins'),'water');assert.equal(naturalGroup('groundwater'),'water');
 assert.equal(populationGroups.length,4);assert.equal(populationGroup('national-age-old'),'distribution');assert.equal(populationGroup('in-religion-hindu'),'religion');assert.equal(populationGroup('in-language-006000'),'identity');
});

test('Industry navigation never substitutes a transport total for an automobile map',async()=>{
 assert.deepEqual(industryTopicGroup({id:'jp-31'}),{sector:'manufacturing',subsector:'all'});
 assert.deepEqual(industryTopicGroup({id:'jp-28'}),{sector:'manufacturing',subsector:'electronics'});
 assert.deepEqual(industryTopicGroup({id:'trade-exports'}),{sector:'all',subsector:'all'});
 const window=new Window();
 try{
  window.document.body.innerHTML='<div data-industry-navigation><button data-industry-sector="manufacturing"></button><div data-industry-subsectors="manufacturing"><button data-industry-subsector="auto" data-sector="manufacturing"></button><button data-industry-subsector="electronics" data-sector="manufacturing"></button></div><strong data-industry-navigation-label></strong><span data-industry-current-map></span><p data-industry-navigation-note hidden></p></div>';
  const root=window.document.body;
  let state={field:'industry',topic:'manufacturing',place:null,city:null,camera:null,back:null};
  const industry={topics:[{id:'manufacturing',title:'製造業の付加価値（国別）'},{id:'jp-31',title:'日本：輸送用機械器具製造業',country:'JPN'},{id:'jp-28',title:'日本：電子部品',country:'JPN'}]};
  const nav=createAsiaNavigation(root,industry,()=>state,s=>{state=s;nav.render();},()=>{},()=>{},()=>{});
  root.querySelector('[data-industry-subsector=auto]').click();
  assert.equal(state.topic,'manufacturing');assert.equal(state.subsector,'auto');assert.equal(root.querySelector('[data-industry-navigation-note]').hidden,false);assert.match(root.querySelector('[data-industry-navigation-note]').textContent,/未収録/);
  root.querySelector('[data-industry-subsector=electronics]').click();
  assert.equal(state.topic,'jp-28');assert.equal(state.place,'JPN');assert.equal(root.querySelector('[data-industry-navigation-note]').hidden,true);
 }finally{await window.happyDOM.close();}
});

test('Industry sector/subsector selection survives reload and comparison return',()=>{
 const context={countries:['JPN'],cities:[],bounds:[70,0,150,60],fields:['natural','industry'],topics:{industry:['manufacturing']}};
 const url=new URL('https://example.com/atlas/asia/east-asia/industry/?topic=manufacturing&sector=manufacturing&subsector=auto');
 const state=readAsiaAtlasState(url,context);assert.equal(state.subsector,'auto');
 assert.equal(readAsiaAtlasState(writeAsiaAtlasState(url,state),context).subsector,'auto');
 const comparison=startAsiaComparison(url,state,'natural');assert.equal(comparison.sector,undefined);assert.equal(restoreAsiaComparison(url,comparison,context).subsector,'auto');
 assert.equal(readAsiaAtlasState(new URL('https://example.com/atlas/asia/east-asia/industry/?sector=services&subsector=auto'),context).subsector,undefined);
});


test('米・雨・川の重ね合わせは農業の概要に限りURLと比較復帰で保存される',()=>{
 const context={countries:['IND'],cities:[],bounds:[46,0,92,57],fields:['natural','agriculture'],topics:{agriculture:['overview','rice']}};
 const url=new URL('https://example.com/atlas/asia/south-central-asia/agriculture/?overlay=water');
 const state=readAsiaAtlasState(url,context);assert.equal(state.overlay,'water');
 assert.equal(readAsiaAtlasState(writeAsiaAtlasState(url,state),context).overlay,'water');
 const comparison=startAsiaComparison(url,state,'natural');assert.equal(comparison.overlay,undefined);assert.equal(restoreAsiaComparison(url,comparison,context).overlay,'water');
 assert.equal(readAsiaAtlasState(new URL(url.href+'&topic=rice'),context).overlay,undefined);
});
