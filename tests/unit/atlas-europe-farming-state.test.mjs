import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { farmingPresentation, updateFarmingMap } from '../../src/lib/atlas-europe-farming.ts';
import { readEuropeState, writeEuropeState, europeFarmingInitialBounds } from '../../src/lib/atlas-europe-view.ts';
import { europeFarmAvailableMetrics } from '../../src/data/atlas/europe/farming-statistics.ts';

const json = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url)));
const countries = json('src/data/atlas/europe/countries.json');
const cityIds = json('src/data/atlas/europe/climate-cities.json').map(city => city.id);
const items = Object.freeze([
  {id:'wheat', name:'小麦', kind:'crop', color:'#d5a56c', labelCoordinate:[2,48]},
  {id:'maize', name:'トウモロコシ', kind:'crop', color:'#ecc759', labelCoordinate:[8,45]},
  {id:'cattle', name:'牛', kind:'livestock', color:'#8f4f35', labelCoordinate:[-2,54]},
  {id:'pig', name:'豚', kind:'livestock', color:'#a86272', labelCoordinate:[10,52]},
].map(Object.freeze));
const allIds = items.map(item => item.id);
const read = search => readEuropeState(search, countries, cityIds, 'crops');
const urlFor = state => writeEuropeState(new URL('https://example.test/atlas/europe/agriculture/'), state);
const visibleIds = state => farmingPresentation(state, items).visible.map(item => item.id);

test('初回は品目未選択で作物と畜産を同時表示する', () => {
  const state = Object.freeze(read(''));
  const view = farmingPresentation(state, items);
  assert.equal(state.layer, 'crops');
  assert.equal(view.active, true);
  assert.equal(view.item, undefined);
  assert.equal(view.single, false);
  assert.equal(view.selectedVisible, false);
  assert.deepEqual(visibleIds(state), allIds);
  assert.equal(Object.hasOwn(state, 'showCrops'), false);
  assert.equal(Object.hasOwn(state, 'showLivestock'), false);
});

test('主要生産地域の初期拡大と明示した欧州全域を区別して保存する',()=>{
  assert.deepEqual(europeFarmingInitialBounds,[[-12,35],[48,61]]);
  assert.equal(read('').farmExtent,undefined);
  const full=read('?farmExtent=full');assert.equal(full.farmExtent,'full');
  assert.deepEqual(read(urlFor(full).search),full);
  assert.equal(read('?farmExtent=north').farmExtent,undefined);
  const url=writeEuropeState(urlFor(full),{...full,farmExtent:undefined});
  assert.equal(url.searchParams.has('farmExtent'),false);
});

test('酪農は生乳だけの国別指標を読み、牛の頭数・分布を乳牛に転用しない',()=>{
  const state=read('?layer=dairy'),view=farmingPresentation(state,items);
  assert.equal(view.active,true);assert.equal(view.item,undefined);
  assert.deepEqual(view.visible.map(item=>item.id),allIds);
  assert.equal(view.selectedVisible,false);
  const metrics=europeFarmAvailableMetrics('dairy');
  assert.deepEqual(metrics.map(metric=>metric.id),['cattle-milk']);
  assert.equal(metrics[0].unit,'t');assert.equal(metrics[0].itemCode,'882');
  assert.equal(metrics[0].elementCode,'5510');
  assert.deepEqual(read(urlFor(state).search),state);
});

test('通常の品目選択と再選択は他品目を残し、選択対象だけを識別する', () => {
  const initial = read('');
  for (const item of items) {
    const selected = Object.freeze({...initial, layer:item.id});
    const view = farmingPresentation(selected, items);
    assert.equal(view.item?.id, item.id);
    assert.equal(view.selectedVisible, true);
    assert.equal(view.single, false);
    assert.deepEqual(visibleIds(selected), allIds);
    assert.deepEqual(farmingPresentation(selected, items), view);
  }
  assert.equal(farmingPresentation(initial, items).item, undefined);
});

test('作物選択時も畜産を残して薄く描き、概況で元の濃さに戻す', () => {
  const areas=items.map(item=>({dataset:{euFarmArea:item.id},style:{}}));
  const outlines=items.map(item=>({dataset:{euFarmOutline:item.id},style:{}}));
  const root={querySelectorAll:selector=>selector==='[data-eu-farm-area]'?areas:outlines};
  const sources=new Set(),paint=new Map();
  const map={getLayer:id=>id==='land',getSource:id=>sources.has(id),addSource:id=>sources.add(id),addLayer:()=>{},setFilter:()=>{},setPaintProperty:(id,key,value)=>paint.set(`${id}.${key}`,value),moveLayer:()=>{}};
  const data={type:'FeatureCollection',features:items.map(properties=>({type:'Feature',properties,geometry:{type:'Polygon',coordinates:[]}}))};
  updateFarmingMap(root,map,data,read('?layer=wheat'));
  assert.deepEqual(areas.map(path=>path.style.display),['','','','']);
  assert.equal(areas[0].style.fillOpacity,'0.44');
  assert.equal(areas[2].style.fillOpacity,'0.06');
  assert.equal(areas[2].style.strokeOpacity,'0.45');
  assert.equal(paint.get('eu-farm-livestock-fill.fill-opacity'),.06);
  assert.equal(paint.get('eu-farm-livestock-line.line-opacity'),.45);
  assert.equal(outlines[0].style.display,'');
  updateFarmingMap(root,map,data,read('?layer=crops'));
  assert.equal(areas[2].style.fillOpacity,'0.13');
  assert.equal(areas[2].style.strokeOpacity,'0.85');
  assert.equal(paint.get('eu-farm-livestock-fill.fill-opacity'),.13);
  assert.equal(paint.get('eu-farm-livestock-line.line-opacity'),.85);
});

test('種類をOFFにしても品目の選択を保持し、もう一方の表示は維持する', () => {
  const cases = [
    {layer:'wheat', showCrops:false, expected:['cattle','pig'], selectedVisible:false},
    {layer:'pig', showCrops:false, expected:['cattle','pig'], selectedVisible:true},
    {layer:'pig', showLivestock:false, expected:['wheat','maize'], selectedVisible:false},
    {layer:'wheat', showLivestock:false, expected:['wheat','maize'], selectedVisible:true},
  ];
  for (const {expected, selectedVisible, ...settings} of cases) {
    const state = Object.freeze({...read(''), ...settings});
    const view = farmingPresentation(state, items);
    assert.equal(view.item?.id, settings.layer);
    assert.equal(view.selectedVisible, selectedVisible);
    assert.deepEqual(visibleIds(state), expected);
    assert.deepEqual(farmingPresentation(read(urlFor(state).search), items), view);
  }
});

test('両方OFFは分布だけを消し、概論への復帰でもOFF設定を保持する', () => {
  const selected = read('?layer=wheat&crops=off&livestock=off');
  const view = farmingPresentation(selected, items);
  assert.equal(view.active, true);
  assert.equal(view.item?.id, 'wheat');
  assert.equal(view.selectedVisible, false);
  assert.deepEqual(view.visible, []);
  const overview = {...selected, layer:'crops'};
  assert.equal(farmingPresentation(overview, items).item, undefined);
  assert.deepEqual(visibleIds(overview), []);
  assert.deepEqual(read(urlFor(overview).search), overview);
  assert.deepEqual(visibleIds({...overview, showCrops:true}), ['wheat','maize']);
  assert.deepEqual(visibleIds({...overview, showLivestock:true}), ['cattle','pig']);
});

test('明示した単独表示は対象だけを描き、解除すると以前の独立したON／OFFへ戻る', () => {
  for (const layer of ['wheat','pig']) {
    for (const query of ['', '&crops=off', '&livestock=off', '&crops=off&livestock=off']) {
      const original = read(`?layer=${layer}${query}`);
      const isolated = Object.freeze({...original, single:true});
      const view = farmingPresentation(isolated, items);
      assert.equal(view.single, true);
      assert.equal(view.selectedVisible, true);
      assert.deepEqual(visibleIds(isolated), [layer]);
      const isolatedUrl = urlFor(isolated);
      assert.equal(isolatedUrl.searchParams.get('single'), '1');
      assert.deepEqual(read(isolatedUrl.search), isolated);
      const returnedUrl = writeEuropeState(isolatedUrl, {...isolated, single:false});
      const returned = read(returnedUrl.search);
      assert.deepEqual(returned, original);
      assert.deepEqual(farmingPresentation(returned, items), farmingPresentation(original, items));
      assert.equal(returnedUrl.searchParams.has('single'), false);
      assert.equal(isolatedUrl.searchParams.get('single'), '1');
    }
  }
});

test('単独表示中に別品目へ移ると前の品目を残さず、再読込も同じ表示になる', () => {
  const first = read('?layer=wheat&single=1&crops=off');
  const next = {...first, layer:'pig'};
  const nextUrl = urlFor(next);
  const reloaded = read(nextUrl.search);
  assert.deepEqual(visibleIds(reloaded), ['pig']);
  assert.equal(farmingPresentation(reloaded, items).item?.id, 'pig');
  assert.equal(reloaded.showCrops, false);
  assert.equal(nextUrl.pathname, '/atlas/europe/agriculture/');
  assert.deepEqual(visibleIds(first), ['wheat']);
});

test('自然環境への表示変更は農畜産物を隠し、標高では地区名だけを解除して地点と表示設定を保存する', () => {
  const original = read('?layer=wheat&city=paris&feature=danube&point=8.5,46.5&crops=off&livestock=off');
  for (const layer of ['climate','water','terrain','contours']) {
    const nature = Object.freeze({...original, layer});
    const expected = {...nature};
    if (layer === 'contours') delete expected.feature;
    const view = farmingPresentation(nature, items);
    assert.equal(view.active, false);
    assert.equal(view.single, false);
    assert.equal(view.selectedVisible, false);
    assert.deepEqual(view.visible, []);
    const natureUrl = urlFor(nature);
    assert.equal(natureUrl.pathname, '/atlas/europe/nature/');
    const reloaded = read(natureUrl.search);
    assert.deepEqual(reloaded, expected);
    assert.equal(reloaded.city, 'paris');
    assert.equal(reloaded.feature, layer === 'contours' ? undefined : 'danube');
    assert.deepEqual(reloaded.point, original.point);
    const returned = read(urlFor({...reloaded, layer:original.layer}).search);
    const expectedReturn = {...original};
    if (layer === 'contours') delete expectedReturn.feature;
    assert.deepEqual(returned, expectedReturn);
    assert.equal(farmingPresentation(returned, items).item?.id, 'wheat');
  }
});

test('概況・森林・自然環境へ単独指定が持ち込まれても個別農畜産物を誤表示しない', () => {
  for (const layer of ['crops','forest','climate']) {
    const state = read(`?layer=${layer}&single=1&livestock=off`);
    assert.equal(Object.hasOwn(state, 'single'), false);
    const view = farmingPresentation(state, items);
    assert.equal(view.single, false);
    assert.equal(view.item, undefined);
    assert.deepEqual(visibleIds(state), layer === 'crops' ? ['wheat','maize'] : []);
    assert.equal(urlFor(state).searchParams.has('single'), false);
  }
});
