import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { project, unproject, visibleBounds, readEuropeState, writeEuropeState, normaliseEuropePoint, defaultEuropeCity, climateSummary, wheatCell, displayCell } from '../../src/lib/atlas-europe-view.ts';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
const json = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url)));
const countries = json('src/data/atlas/europe/countries.json');
const cities = json('src/data/atlas/europe/climate-cities.json');
const geography = json('src/data/atlas/europe-countries.json');

test('国選択と都市比較がURL往復・不正入力の正規化で保たれる', () => {
  const ids = cities.map(c => c.id);
  const s = readEuropeState('?region=west&place=UKR&city=kyiv&compare=london,london,warsaw,moscow,invalid&layer=overlay', countries, ids);
  assert.deepEqual(s, { region: 'east', place: 'UKR', city: 'kyiv', compare: ['london','warsaw'], render: 'auto', layer: 'overlay', returnLayer: 'climate' });
  const url = writeEuropeState(new URL('https://example.test/atlas/europe/agriculture/?external=kept'), s);
  assert.deepEqual(readEuropeState(url.search,countries,ids),s);
  assert.equal(url.searchParams.get('external'),'kept');
  assert.equal(readEuropeState('?place=bad&city=bad&region=bad&layer=bad',countries,ids,'wheat').layer,'wheat');
  const returnToClimate = readEuropeState('?layer=overlay&returnLayer=climate', countries, ids, 'wheat');
  assert.equal(readEuropeState(writeEuropeState(new URL('https://example.test/'), returnToClimate).search, countries, ids, 'wheat').returnLayer, 'climate');
});

test('初回は都市を選ばず、対象国の収録済み首都だけを候補にする', () => {
  const ids = cities.map(c => c.id);
  assert.equal(defaultEuropeCity('', ids), '');
  assert.equal(defaultEuropeCity('NOR', ids), 'oslo');
  assert.equal(defaultEuropeCity('CHE', ids), '');
  assert.equal(defaultEuropeCity('SWE', ids), '');
  assert.equal(defaultEuropeCity('', ['paris']), '');
  assert.equal(defaultEuropeCity('NOR', ['bergen']), '');
  for (const country of countries) {
    const city = defaultEuropeCity(country.code, ids);
    if (city) assert.equal(cities.find(c => c.id === city)?.country, country.code);
  }
  assert.equal(readEuropeState('', countries, ids).city, '');
  assert.equal(readEuropeState('?place=NOR&city=invalid', countries, ids).city, 'oslo');
  const missing = readEuropeState('?place=CHE&city=invalid', countries, ids);
  assert.equal(missing.city, '');
  const url = writeEuropeState(new URL('https://example.test/atlas/europe/nature/'), missing);
  assert.equal(url.searchParams.has('city'), false);
  assert.deepEqual(readEuropeState(url.search, countries, ids), missing);
});

test('有効な保存済み都市は首都の初期選択より優先し、都市比較も保持する', () => {
  const ids = cities.map(c => c.id);
  const saved = readEuropeState('?place=NOR&city=bergen&compare=oslo,paris', countries, ids);
  assert.equal(saved.city, 'bergen');
  const foreign = readEuropeState('?place=CHE&city=paris&compare=zurich,london', countries, ids);
  assert.equal(foreign.city, 'paris');
  assert.deepEqual(foreign.compare, ['zurich', 'london']);
  for (const state of [saved, foreign]) {
    const url = writeEuropeState(new URL('https://example.test/atlas/europe/nature/'), state);
    assert.deepEqual(readEuropeState(url.search, countries, ids), state);
  }
});

test('選択地点は有限の経度・緯度2値に限り、表示格子と同じ境界で検証する', () => {
  for (const point of [[10.123456789,46.7654321],[-25,73],[64.999999,32.000001],[0,50]]) {
    assert.deepEqual(normaliseEuropePoint(point),point);
  }
  for (const point of [undefined,null,'10,50',{},[],[10],[10,50,1],['10',50],[10,'50'],[null,50],[true,50],[NaN,50],[10,NaN],[Infinity,50],[10,-Infinity],[-25.000001,50],[65,50],[10,32],[10,73.000001]]) {
    assert.ok(!normaliseEuropePoint(point),`Invalid point: ${String(point)}`);
  }
});

test('選択地点は地形・等高線・別主題へのURL往復に保持し、不正な指定と重複を採用しない', () => {
  const ids=cities.map(city=>city.id),point=[10.123456789,46.7654321];
  const original=readEuropeState(`?layer=terrain&point=${point.join(',')}&render=static`,countries,ids);
  assert.deepEqual(original.point,point);
  for(const layer of ['terrain','contours','climate','density','wheat']) {
    const state={...original,layer};
    const url=writeEuropeState(new URL('https://example.test/atlas/europe/nature/?external=kept&point=20,60'),state);
    assert.equal(url.searchParams.get('point'),point.join(','));
    assert.deepEqual(readEuropeState(url.search,countries,ids),state);
    assert.equal(url.searchParams.get('external'),'kept');
  }
  for(const query of ['','10','10,50,60',',50','10,','%20,50','10,%20','NaN,50','Infinity,50','10,NaN','65,50','10,32','-25.000001,50','10,73.000001','10,50&point=20,55','10,50&point=10,50']) {
    const state=readEuropeState(`?layer=terrain&point=${query}`,countries,ids);
    assert.equal(Object.hasOwn(state,'point'),false,query);
  }
  for(const point of [undefined,[65,50],[NaN,50],['10',50],[10,50,60]]) {
    const url=writeEuropeState(new URL('https://example.test/atlas/europe/nature/?point=10,50&point=20,55&external=kept'),{...original,point});
    assert.equal(url.searchParams.has('point'),false);
    assert.equal(url.searchParams.get('external'),'kept');
  }
});

test('作物と畜産は未指定ならONで、OFFを独立してURLと分野往復に保持する', () => {
  const ids = cities.map(c => c.id);
  const initial = readEuropeState('?layer=crops', countries, ids);
  assert.equal(Object.hasOwn(initial, 'showCrops'), false);
  assert.equal(Object.hasOwn(initial, 'showLivestock'), false);
  const cropOff = readEuropeState('?layer=wheat&crops=off', countries, ids);
  assert.equal(cropOff.showCrops, false);
  assert.equal(Object.hasOwn(cropOff, 'showLivestock'), false);
  const bothOff = readEuropeState('?layer=wheat&crops=off&livestock=off', countries, ids);
  for (const layer of ['wheat', 'forest', 'climate', 'pig']) {
    const state = {...bothOff, layer};
    const url = writeEuropeState(new URL('https://example.test/atlas/europe/agriculture/'), state);
    assert.deepEqual(readEuropeState(url.search, countries, ids), state);
  }
  const malformed = readEuropeState('?layer=crops&crops=false&livestock=on', countries, ids);
  assert.equal(Object.hasOwn(malformed, 'showCrops'), false);
  assert.equal(Object.hasOwn(malformed, 'showLivestock'), false);
  const normalized = writeEuropeState(new URL('https://example.test/?crops=off&livestock=off&external=keep'), {...initial, showCrops:true, showLivestock:true});
  assert.equal(normalized.searchParams.has('crops'), false);
  assert.equal(normalized.searchParams.has('livestock'), false);
  assert.equal(normalized.searchParams.get('external'), 'keep');
});

test('単独表示は個別農畜産物に限り、通常表示への復帰で元のON／OFFを失わない', () => {
  const ids = cities.map(c => c.id);
  const original = readEuropeState('?layer=wheat&crops=off&livestock=off', countries, ids);
  assert.equal(Object.hasOwn(original, 'single'), false);
  const isolated = {...original, single:true};
  const singleUrl = writeEuropeState(new URL('https://example.test/atlas/europe/agriculture/'), isolated);
  assert.equal(singleUrl.searchParams.get('single'), '1');
  assert.deepEqual(readEuropeState(singleUrl.search, countries, ids), isolated);
  const returnedUrl = writeEuropeState(singleUrl, {...isolated, single:false});
  assert.equal(returnedUrl.searchParams.has('single'), false);
  assert.deepEqual(readEuropeState(returnedUrl.search, countries, ids), original);
  assert.equal(singleUrl.searchParams.get('single'), '1');
  const anotherUrl = writeEuropeState(singleUrl, {...isolated, layer:'pig'});
  assert.equal(readEuropeState(anotherUrl.search, countries, ids).layer, 'pig');
  assert.equal(readEuropeState(anotherUrl.search, countries, ids).single, true);
  for (const layer of ['crops', 'forest', 'climate', 'terrain', 'density', 'overlay']) {
    const state = readEuropeState(`?layer=${layer}&single=1&crops=off`, countries, ids);
    assert.equal(Object.hasOwn(state, 'single'), false);
    const url = writeEuropeState(singleUrl, {...isolated, layer});
    assert.equal(url.searchParams.has('single'), false);
    assert.equal(url.searchParams.get('crops'), 'off');
    assert.equal(url.searchParams.get('livestock'), 'off');
  }
});

test('静的地図と通常地図の投影が一致し、ロシアは表示枠内で拡大する', () => {
  for (const p of [[-25,73],[65,32],[30.52,50.45],[-.45,51.48]]) {
    const q=unproject(project(p)); assert.ok(Math.abs(p[0]-q[0])<1e-9 && Math.abs(p[1]-q[1])<1e-9);
  }
  const bounds=visibleBounds([geography.features.find(f=>f.properties.code==='RUS').geometry]);
  assert.ok(bounds[1][0]<=65 && bounds[1][1]<=73);
  const france=visibleBounds([geography.features.find(f=>f.properties.code==='FRA').geometry]);
  assert.ok(france[0][0]>-6 && france[0][1]>40);
});

test('24地点の12か月・出典を照合し、降水の欠測を年間0へ変換しない', () => {
  assert.equal(cities.length,24);
  assert.equal(new Set(cities.map(c=>c.stationId)).size,24);
  for (const c of cities) {
    assert.ok(c.sourceUrl.startsWith('https://www.data.jma.go.jp/'));
    assert.equal(c.months.length,12);
    assert.equal(c.period,'1991–2020');
    assert.ok(c.months.every(m=>m.temperature===null || m.temperature>=-10 && m.temperature<=40));
    assert.ok(c.months.every(m=>m.precipitation===null || m.precipitation>=0 && m.precipitation<=350));
  }
  assert.equal(climateSummary(cities.find(c=>c.id==='rome').months).annualRain,null);
  assert.equal(climateSummary(cities.find(c=>c.id==='helsinki').months).annualRain,null);
  assert.equal(Math.round(climateSummary(cities[0].months).annualRain),633);
  assert.ok(cities.filter(c=>['POL','UKR','BLR','MDA','RUS','SRB','ROU','BGR','HUN','EST'].includes(c.country)).length>=8);
});

test('配信する画像と格子のハッシュが加工記録に一致し、ゼロと欠測を区別できる', () => {
  for (const group of ['climate-v1','wheat-v1']) {
    const base=`public/assets/atlas/europe/${group}/`;
    const manifest=json(base+'manifest.json');
    for (const [name, expected] of Object.entries(manifest.files)) {
      const bytes=readFileSync(new URL('../../'+base+name,import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);
    }
  }
  const data=gunzipSync(readFileSync(new URL('../../public/assets/atlas/europe/wheat-v1/values.bin.gz',import.meta.url)));
  assert.equal(data.byteLength,1080*492*4);
  const values=new Float32Array(data.buffer,data.byteOffset,data.byteLength/4);
  const at=index=>[-25+(index%1080+.5)/12,73-(Math.floor(index/1080)+.5)/12];
  assert.equal(wheatCell(values,at(values.indexOf(-1))).value,null);
  assert.equal(wheatCell(values,at(values.indexOf(0))).value,0);
  assert.equal(wheatCell(values,[65,50]),null);
  assert.equal(wheatCell(values,[3,32]),null);
  const index=values.findIndex(v=>v>1000);assert.equal(wheatCell(values,at(index)).value,values[index]);
});

test('地形と等高線は同じ実格子の標高mを読み、負標高・0m・欠損を区別する', () => {
  const terrain=europeLayers.find(layer=>layer.id==='terrain'),contours=europeLayers.find(layer=>layer.id==='contours');
  assert.equal(terrain.grid,contours.grid);
  assert.equal(terrain.gridType,'display');
  assert.equal(contours.gridType,'display');
  assert.equal(terrain.encoding,'int16');
  assert.equal(contours.encoding,'int16');
  assert.equal(terrain.valueUnit,'m');
  assert.equal(contours.valueUnit,'m');
  assert.equal(contours.unit,'500m間隔','等高線間隔は値の単位と分けて凡例に残す');
  assert.deepEqual(contours.labels.slice(0,2),['500m間隔','1,000m間隔（濃線）']);
  const bytes=gunzipSync(readFileSync(new URL('../../public/assets/atlas/europe/physical-v1/elevation.bin.gz',import.meta.url)));
  assert.equal(bytes.byteLength,1800*1502*2);
  const values=Float32Array.from(new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2));
  const at=index=>unproject([(index%1800+.5)/1800*1200,(Math.floor(index/1800)+.5)/1502*1001]);
  const samples=[
    {label:'0m',index:values.indexOf(0),value:0},
    {label:'負標高',index:values.findIndex(value=>value<0&&value!==-32768)},
    {label:'山地',index:values.findIndex(value=>value>1000)},
    {label:'欠損',index:values.indexOf(-32768),value:null},
  ];
  for(const sample of samples) {
    assert.ok(sample.index>=0,`Published grid contains ${sample.label}`);
    const point=at(sample.index),expected=Object.hasOwn(sample,'value')?sample.value:values[sample.index];
    for(const layer of [terrain,contours]) {
      assert.equal(layer.nodata,-32768);
      const cell=displayCell(values,point,layer.nodata);
      assert.equal(cell.value,expected,`${layer.id}: ${sample.label}`);
      assert.deepEqual(cell.center,point);
    }
  }
  for(const point of [[NaN,50],[10,NaN],[Infinity,50],[10,-Infinity],[65,50],[10,32]]) {
    assert.equal(displayCell(values,point,terrain.nodata),null,`Out-of-grid point: ${point}`);
  }
});
