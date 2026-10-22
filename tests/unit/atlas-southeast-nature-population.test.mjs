import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {southeastUrbanComparison,southeastUrbanState,southeastNaturePopulationComparison,southeastManufacturingScope} from '../../src/lib/atlas-southeast-nature-population.ts';
import {readAsiaAtlasState,writeAsiaAtlasState,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';
import {baliReligionRegistration,southeastPopulationPlaces,southeastSocietyCoverage} from '../../src/data/atlas/asia/southeast-nature-population.ts';
const manifest=JSON.parse(readFileSync(new URL('../../public/assets/atlas/asia-population-v1/manifest.json',import.meta.url),'utf8'));
const cities=manifest.regions['southeast-asia'].cities;

test('製造業比較の対象外8か国も、地域拠点へ同じ地点・カメラで進み元の都市へ戻れる',()=>{
  const industryCountryCodes=['IDN','VNM','THA'];
  const countries=[...new Set(cities.map(city=>city.country))];
  assert.equal(countries.filter(country=>!industryCountryCodes.includes(country)).length,8);
  const context={countries,cities:[],bounds:[90,-12,142,28],fields:['industry','population'],topics:{population:['density','urban'],industry:['manufacturing']},details:{population:cities.map(city=>city.id)}};
  const url=new URL('https://example.org/atlas/asia/southeast-asia/population/');
  for(const city of cities){
    const camera={lng:city.coordinates[0],lat:city.coordinates[1],zoom:6};
    const base={field:'population',topic:'density',place:null,city:null,point:null,detail:null,story:null,back:null,camera};
    const selected=southeastUrbanState(base,city,camera);
    const next=southeastNaturePopulationComparison(url,selected,'manufacturing',camera,{industryCountryCodes});
    const scope=southeastManufacturingScope(city.country,industryCountryCodes);
    assert.equal(next.field,'industry',city.name);assert.equal(next.topic,'manufacturing');
    assert.equal(next.place,industryCountryCodes.includes(city.country)?city.country:null,city.name);
    assert.equal(scope.place,next.place,'比較ボタンが示す国範囲と遷移先をそろえる');
    assert.equal(next.detail,null);assert.equal(next.city,null);
    assert.deepEqual(next.point,city.coordinates,city.name);assert.deepEqual(next.camera,camera,city.name);
    const nextUrl=writeAsiaAtlasState(url,next),reloaded=readAsiaAtlasState(nextUrl,context);
    assert.equal(reloaded.place,next.place,city.name);
    assert.deepEqual(reloaded.point,city.coordinates.map(value=>Number(value.toFixed(5))),city.name);
    assert.deepEqual(reloaded.camera,{lng:Number(camera.lng.toFixed(5)),lat:Number(camera.lat.toFixed(5)),zoom:6},city.name);
    const returned=restoreAsiaComparison(nextUrl,reloaded,context);
    assert.equal(returned.field,'population');assert.equal(returned.topic,'urban');
    assert.equal(returned.place,city.country);assert.equal(returned.detail,city.id);assert.equal(returned.back,null);
    assert.deepEqual(returned.point,reloaded.point,city.name);assert.deepEqual(returned.camera,reloaded.camera,city.name);
  }
});

test('都市比較は地図と同じ16都市の2020年人口・2025年範囲を使い、人数だけを共通幅にする',()=>{
  const original=cities.map(c=>c.id),rows=southeastUrbanComparison(cities);
  assert.equal(manifest.populationYear,2020);assert.equal(manifest.urbanBoundaryYear,2025);
  assert.equal(rows.length,16);assert.deepEqual(cities.map(c=>c.id),original,'元の地図用配列を並べ替えない');
  assert.equal(rows[0].city.sourceName,'Jakarta');assert.equal(rows[0].populationWidth,100);
  for(const {city,populationWidth} of rows){assert.equal(city.population,city.history['2020']);assert.equal(city.density,city.population/city.areaKm2);assert.equal(populationWidth,city.population/rows[0].city.population*100);assert.ok(populationWidth>0&&populationWidth<=100);}
  assert.ok(rows.find(r=>r.city.sourceName==='Singapore').city.density>rows[0].city.density,'人数の順位と密度の順位を混同しない');
  for(const reading of southeastPopulationPlaces)for(const id of reading.cityIds)assert.ok(cities.find(c=>c.id===id),id);
});

test('都市の選択から同地点の流域へ進み、カメラと元の都市を戻る操作で復元する',()=>{
  const camera={lng:110,lat:7,zoom:4},base={field:'population',topic:'density',place:null,city:null,point:null,detail:null,story:null,back:null,camera};
  const city=cities.find(c=>c.sourceName==='Hanoi'),selected=southeastUrbanState(base,city,camera);
  assert.equal(selected.detail,city.id);assert.deepEqual(selected.point,city.coordinates);assert.deepEqual(selected.camera,camera);
  const url=new URL('https://example.org/atlas/asia/southeast-asia/population/');
  const next=southeastNaturePopulationComparison(url,selected,'basins',camera);
  assert.equal(next.field,'natural');assert.equal(next.topic,'basins');assert.equal(next.detail,null);assert.deepEqual(next.point,city.coordinates);assert.deepEqual(next.camera,camera);
  const context={countries:[...new Set(cities.map(c=>c.country))],cities:[],bounds:[90,-12,142,28],fields:['natural','population'],topics:{population:['density','urban'],natural:['basins','seasonal-precipitation']},details:{population:cities.map(c=>c.id),natural:['m-07']}};
  const returned=restoreAsiaComparison(url,next,context);
  assert.equal(returned.topic,'urban');assert.equal(returned.detail,city.id);assert.deepEqual(returned.point,city.coordinates.map(v=>Number(v.toFixed(5))));assert.deepEqual(returned.camera,camera);assert.equal(returned.back,null);
  const rainfall=southeastNaturePopulationComparison(url,base,'seasonal-precipitation',camera);
  assert.equal(rainfall.detail,'m-07');assert.equal(rainfall.point,null,'初期画面で都市や地点を勝手に選ばない');
  const chained=southeastNaturePopulationComparison(url,next,'seasonal-precipitation',camera);
  assert.equal(chained.back,next.back,'比較を重ねても最初の都市への復帰先を失わない');
});

test('公的補足は11か国の収録範囲を区別し、バリ登録人口の内訳と分母を保持する',()=>{
  assert.equal(southeastSocietyCoverage.length,11);assert.equal(new Set(southeastSocietyCoverage.map(c=>c.code)).size,11);
  assert.equal(baliReligionRegistration.year,2024);assert.equal(baliReligionRegistration.kind,'行政登録人口');
  for(const r of baliReligionRegistration.records){assert.equal(r.counts.length,baliReligionRegistration.categories.length);assert.equal(r.counts.reduce((n,v)=>n+v,0),r.total,r.name);}
  const [bali,denpasar,jembrana]=baliReligionRegistration.records;
  assert.equal(bali.total,4375263);assert.equal(bali.counts[3],3780272);assert.equal(denpasar.total,673270);assert.equal(jembrana.total,330221);
  assert.equal((bali.counts[3]/bali.total*100).toFixed(1),'86.4');assert.equal((denpasar.counts[3]/denpasar.total*100).toFixed(1),'67.3');
  assert.ok(!baliReligionRegistration.records.some(r=>r.id==='gianyar'),'原表の内訳と合計が不一致の区域を修正して使わない');
  assert.ok(baliReligionRegistration.records.every(r=>!('geometry' in r)&&!('point' in r)),'行政割合を人口格子や集団の面に配分しない');
});
