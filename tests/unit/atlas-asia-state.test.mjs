import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readAsiaAtlasState, writeAsiaAtlasState, startAsiaComparison,
  restoreAsiaComparison, mercatorPoint, gridCellAt,
} from '../../src/lib/atlas-asia-state.ts';

const east = {
  countries: ['JPN', 'CHN', 'KOR', 'PRK', 'TWN', 'MNG'],
  cities: [{ id: 'tokyo', countryCode: 'JPN' }, { id: 'beijing', countryCode: 'CHN' }],
  bounds: [72, 17, 155, 56], fields: ['natural', 'agriculture'],
};
const southeast = {
  countries: ['THA', 'SGP'], cities: [{ id: 'bangkok', countryCode: 'THA' }],
  bounds: [91, -12, 143, 30], fields: ['natural'],
};
const url = query => new URL('https://example.org/insight-journal/atlas/asia/east-asia/' + query);

test('アジアの国・都市と東経のカメラをURL往復で保持する', () => {
  const original = url('?place=JPN&city=tokyo&lng=139.76&lat=35.68&z=5.125');
  const state = readAsiaAtlasState(original, east);
  assert.deepEqual(state, {
    field: 'natural', place: 'JPN', city: 'tokyo',
    camera: { lng: 139.76, lat: 35.68, zoom: 5.125 }, back: null,
  });
  const written = writeAsiaAtlasState(original, state);
  assert.equal(written.pathname, '/insight-journal/atlas/asia/east-asia/nature/');
  assert.equal(written.searchParams.get('place'), 'JPN');
  assert.deepEqual(readAsiaAtlasState(written, east), state);
});

test('都市単独のURLは所属国を補い、国と矛盾する都市は採用しない', () => {
  assert.equal(readAsiaAtlasState(url('?city=tokyo'), east).place, 'JPN');
  const conflict = readAsiaAtlasState(url('?place=CHN&city=tokyo'), east);
  assert.equal(conflict.place, 'CHN');
  assert.equal(conflict.city, null);
  const foreign = readAsiaAtlasState(url('?place=USA&city=new-york'), east);
  assert.equal(foreign.place, null);
  assert.equal(foreign.city, null);
});

test('地域を移ったときに前の国・都市・未提供分野を残さない', () => {
  const state = readAsiaAtlasState(url('?region=east-asia&place=JPN&city=tokyo&field=agriculture'), southeast);
  assert.equal(state.place, null);
  assert.equal(state.city, null);
  assert.equal(state.field, 'natural');
  assert.equal(writeAsiaAtlasState(url('?region=east-asia'), state).searchParams.has('region'), false);
  const valid = readAsiaAtlasState(url('?region=wrong&city=bangkok'), southeast);
  assert.equal(valid.place, 'THA');
  assert.equal(valid.city, 'bangkok');
});

test('不完全・非数値・別大陸・倍率範囲外のカメラは全体表示へ戻す', () => {
  for (const query of [
    '', '?lng=&lat=35&z=4', '?lng=139&lat=35', '?lng=NaN&lat=35&z=4',
    '?lng=139&lat=Infinity&z=4', '?lng=-100&lat=40&z=4',
    '?lng=139&lat=90&z=4', '?lng=139&lat=35&z=0', '?lng=139&lat=35&z=10',
  ]) assert.equal(readAsiaAtlasState(url(query), east).camera, null, query);
  for (const zoom of [1, 9]) assert.equal(readAsiaAtlasState(url(`?lng=139&lat=35&z=${zoom}`), east).camera.zoom, zoom);
});

test('自然環境から農業を比較し、選択国・都市・地図の位置へ復帰する', () => {
  const original = url('?place=JPN&city=tokyo&lng=139.76&lat=35.68&z=5&campaign=study');
  const state = readAsiaAtlasState(original, east);
  const comparison = startAsiaComparison(original, state, 'agriculture');
  assert.equal(comparison.field, 'agriculture');
  assert.equal(comparison.place, 'JPN');
  assert.equal(new URLSearchParams(comparison.back).has('campaign'), false);
  const comparisonUrl = writeAsiaAtlasState(original, comparison);
  const afterReload = readAsiaAtlasState(comparisonUrl, east);
  assert.deepEqual(restoreAsiaComparison(comparisonUrl, afterReload, east), state);
  assert.equal(comparisonUrl.searchParams.get('campaign'), 'study');
});

test('米の選択格子を気候比較・再読込後も保持し、比較前の地点へ復帰する', () => {
  const original = url('?field=agriculture&place=CHN&at=116.75,34.25&lng=120&lat=33&z=4.5');
  const state = readAsiaAtlasState(original, east);
  assert.deepEqual(state.point, [116.75, 34.25]);
  assert.equal(state.city, null);
  const comparison = startAsiaComparison(original, state, 'natural');
  const comparisonUrl = writeAsiaAtlasState(original, comparison);
  assert.equal(comparisonUrl.searchParams.get('at'), '116.75000,34.25000');
  const afterReload = readAsiaAtlasState(comparisonUrl, east);
  assert.deepEqual(afterReload.point, state.point);
  assert.equal(afterReload.field, 'natural');
  const changedSelection = { ...afterReload, point: [118.5, 35] };
  assert.deepEqual(restoreAsiaComparison(comparisonUrl, changedSelection, east), state);
  for (const at of ['-110,40', '116.75,90', 'NaN,34.25', ',34.25', '116.75,34.25,5']) {
    assert.equal(readAsiaAtlasState(url('?at=' + encodeURIComponent(at)), east).point, undefined, at);
  }
});

test('選択なしの比較でも復帰先があり、比較情報は再帰しない', () => {
  const original = url('');
  const state = readAsiaAtlasState(original, east);
  const comparison = startAsiaComparison(original, state, 'agriculture');
  assert.ok(comparison.back);
  assert.deepEqual(restoreAsiaComparison(original, comparison, east), state);
  for (const back of ['back=field%3Dnatural', 'x'.repeat(601)]) {
    const invalid = url(''); invalid.searchParams.set('back', back);
    assert.equal(readAsiaAtlasState(invalid, east).back, null);
  }
});

test('未知の検索条件・ハッシュを保持し、未知の分野や選択は正規化する', () => {
  const original = url('?field=industry&place=unknown&city=%3Cscript%3E&experiment=alpha#sources');
  const state = readAsiaAtlasState(original, east);
  assert.equal(state.field, 'natural');
  assert.equal(state.place, null);
  assert.equal(state.city, null);
  const written = writeAsiaAtlasState(original, state);
  assert.equal(written.searchParams.get('experiment'), 'alpha');
  assert.equal(written.hash, '#sources');
  assert.equal(written.searchParams.has('field'), false);
  assert.equal(written.searchParams.has('place'), false);
});

test('比較URLの復帰先も現在の地域で検証し、外部URLへ遷移しない', () => {
  const current = url('?place=JPN&city=tokyo');
  const state = startAsiaComparison(current, readAsiaAtlasState(current, east), 'agriculture');
  const restored = restoreAsiaComparison(current, state, southeast);
  assert.equal(restored.place, null);
  assert.equal(restored.city, null);
  assert.equal(restored.back, null);
  assert.equal(current.hostname, 'example.org');
  const crafted = { ...state, back: 'https://other.example/atlas/?place=JPN' };
  assert.equal(restoreAsiaComparison(current, crafted, east).place, null);
});

test('公開された分野URLと旧クエリURLは、選択を失わず同じ分野URLへ正規化する', () => {
  for (const region of ['east-asia', 'southeast-asia', 'south-central-asia']) {
    for (const field of ['natural', 'agriculture']) {
      const path = field === 'natural' ? 'nature' : field;
      const original = new URL(`https://example.org/insight-journal/atlas/asia/${region}/${path}/?place=JPN&city=tokyo&lng=139&lat=35&z=5&campaign=study#asia-sources`);
      const state = readAsiaAtlasState(original, east);
      assert.equal(state.field, field);
      assert.equal(writeAsiaAtlasState(original, state).pathname, original.pathname);
      const legacy = new URL(original); legacy.pathname = `/insight-journal/atlas/asia/${region}/`; legacy.searchParams.set('field', field);
      assert.deepEqual(readAsiaAtlasState(legacy, east), state);
      assert.equal(writeAsiaAtlasState(legacy, state).href, writeAsiaAtlasState(original, state).href);
      const comparison = startAsiaComparison(original, state, field === 'natural' ? 'agriculture' : 'natural');
      const comparisonUrl = writeAsiaAtlasState(original, comparison);
      assert.notEqual(comparisonUrl.pathname, original.pathname);
      const restored = restoreAsiaComparison(comparisonUrl, readAsiaAtlasState(comparisonUrl, east), east);
      assert.deepEqual(restored, state);
      assert.equal(writeAsiaAtlasState(comparisonUrl, restored).pathname, original.pathname);
    }
  }
});

test('正規の分野URLを優先し、古いfieldクエリの空値や矛盾で別分野へ切り替えない', () => {
  for(const [path,field] of [['nature','natural'],['agriculture','agriculture']]) for(const query of ['field=', 'field=unknown', 'field=natural', 'field=agriculture']) {
    const original=url(`${path}/?${query}&city=tokyo`),state=readAsiaAtlasState(original,east);
    assert.equal(state.field,field);
    const normalized=writeAsiaAtlasState(original,state);
    assert.equal(normalized.pathname,original.pathname);
    assert.equal(normalized.searchParams.has('field'),false);
    assert.equal(normalized.searchParams.get('city'),'tokyo');
  }
});

test('Mercator照会は北からの行順を使い、0を分類値として返さない', () => {
  const grid = { width: 2, height: 2, bounds3857: [-1000000, -1000000, 1000000, 1000000], values: [14, 21, 0, 1] };
  assert.equal(gridCellAt(grid, -5, 5), 14);
  assert.equal(gridCellAt(grid, 5, 5), 21);
  assert.equal(gridCellAt(grid, -5, -5), null);
  assert.equal(gridCellAt(grid, 5, -5), 1);
  assert.equal(gridCellAt(grid, 50, 5), null);
  assert.equal(gridCellAt(grid, NaN, 5), null);
  const [x, y] = mercatorPoint(180, 0);
  assert.ok(Math.abs(x - 20037508.342789244) < 0.000001);
  assert.ok(Math.abs(y) < 0.000001);
});

test('画像の北端・西端は含み、東端・南端は範囲外にする', () => {
  const [west, south] = mercatorPoint(-10, -10);
  const [east, north] = mercatorPoint(10, 10);
  const grid = { width: 1, height: 1, bounds3857: [west, south, east, north], values: [14] };
  assert.equal(gridCellAt(grid, -10, 0), 14);
  assert.equal(gridCellAt(grid, 0, 10), 14);
  assert.equal(gridCellAt(grid, 10, 0), null);
  assert.equal(gridCellAt(grid, 0, -10), null);
});
