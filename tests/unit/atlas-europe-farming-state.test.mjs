import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {farmingPresentation, updateFarmingMap} from '../../src/lib/atlas-europe-farming.ts';
import {readEuropeState, writeEuropeState, europeFarmingInitialBounds} from '../../src/lib/atlas-europe-view.ts';
import {europeFarmingGenres} from '../../src/data/atlas/europe/farming-genres.ts';

const json=path=>JSON.parse(readFileSync(new URL(`../../${path}`,import.meta.url)));
const countries=json('src/data/atlas/europe/countries.json');
const cityIds=json('src/data/atlas/europe/climate-cities.json').map(city=>city.id);
const items=json('src/data/atlas/europe/farming-areas.json').features.map(feature=>feature.properties);
const read=search=>readEuropeState(search,countries,cityIds,'crops');
const visible=state=>farmingPresentation(state,items).visible.map(item=>item.id);
const urlFor=state=>writeEuropeState(new URL('https://example.test/atlas/europe/agriculture/'),state);

test('初期の穀物・畑作は収録済み6品目を同時表示し、欠けたライムギを補わない',()=>{
  const state=read(''),view=farmingPresentation(state,items);
  assert.equal(state.layer,'crops');assert.equal(view.genre,'crops');
  assert.equal(view.item,undefined);assert.equal(view.single,false);
  assert.deepEqual(visible(state),europeFarmingGenres.crops.ids);
  assert.match(europeFarmingGenres.crops.missing,/ライムギ/);
  assert.deepEqual(europeFarmingInitialBounds,[[-12,35],[48,61]]);
});

test('3ジャンルの品目選択は同じジャンルの他品目を残し、単独表示を戻せる',()=>{
  for(const genre of ['crops','livestock','horticulture']){
    const ids=europeFarmingGenres[genre].ids;
    assert.deepEqual(visible(read(`?layer=${genre}`)),ids);
    for(const id of ids){
      const selected=read(`?layer=${id}`),view=farmingPresentation(selected,items);
      assert.equal(view.genre,genre);assert.equal(view.item?.id,id);
      assert.equal(view.selectedVisible,true);assert.deepEqual(visible(selected),ids);
      const solo=read(`?layer=${id}&single=1`);
      assert.deepEqual(visible(solo),[id]);
      assert.deepEqual(visible(read(urlFor({...solo,single:false}).search)),ids);
    }
  }
});

test('生乳の全国値と牛の地域面を混同せず、旧URLの表示OFF指定も品目を隠さない',()=>{
  const dairy=farmingPresentation(read('?layer=dairy'),items);
  assert.equal(dairy.genre,'livestock');assert.equal(dairy.item,undefined);
  assert.deepEqual(dairy.visible.map(item=>item.id),europeFarmingGenres.livestock.ids);
  assert.match(europeFarmingGenres.livestock.missing,/乳用・肉用/);
  assert.deepEqual(visible(read('?layer=crops&crops=off&livestock=off')),europeFarmingGenres.crops.ids);
  assert.deepEqual(visible(read('?layer=livestock&crops=off&livestock=off')),europeFarmingGenres.livestock.ids);
});

test('既存の米・ヒマワリ・大豆の固定事例URLは根拠面を保持し、通常のジャンルには加えない',()=>{
  for(const id of ['rice','sunflower','soybean']){
    const state=read(`?layer=${id}`),view=farmingPresentation(state,items);
    assert.equal(view.genre,'crops');assert.deepEqual(visible(state),[id]);
    assert.deepEqual(visible(read(urlFor(state).search)),[id]);
  }
});

test('描画は同じジャンルの他品目を面で残し、他ジャンルを非表示にする',()=>{
  const areas=items.map(item=>({dataset:{euFarmArea:item.id},style:{}}));
  const outlines=items.map(item=>({dataset:{euFarmOutline:item.id},style:{}}));
  const root={querySelectorAll:selector=>selector==='[data-eu-farm-area]'?areas:selector==='[data-eu-farm-outline]'?outlines:[]};
  const data={type:'FeatureCollection',features:items.map(properties=>({type:'Feature',properties,geometry:{type:'Polygon',coordinates:[]}}))};
  updateFarmingMap(root,undefined,data,data,data,read('?layer=wheat'));
  const barley=items.findIndex(item=>item.id==='barley'),cattle=items.findIndex(item=>item.id==='cattle');
  assert.equal(areas[barley].style.display,'');assert.ok(Number(areas[barley].style.fillOpacity)>.3);
  assert.equal(areas[cattle].style.display,'none');
  assert.equal(outlines[items.findIndex(item=>item.id==='wheat')].style.display,'');
  updateFarmingMap(root,undefined,data,data,data,read('?layer=livestock'));
  assert.equal(areas[cattle].style.display,'');assert.equal(areas[barley].style.display,'none');
});

test('林業と自然環境では農畜産の面を隠し、URLでジャンルを復元できる',()=>{
  for(const layer of ['treecover','forest','water','climate'])assert.deepEqual(visible(read(`?layer=${layer}`)),[]);
  for(const layer of ['crops','livestock','horticulture'])assert.equal(read(urlFor(read(`?layer=${layer}&farmExtent=full`)).search).layer,layer);
});
