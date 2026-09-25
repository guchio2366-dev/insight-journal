import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { project, unproject, visibleBounds, readEuropeState, writeEuropeState, climateSummary, wheatCell } from '../../src/lib/atlas-europe-view.ts';
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
