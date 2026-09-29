import test from 'node:test';
import assert from 'node:assert/strict';
import { farmingAtPoint } from '../../src/lib/atlas-europe-farming.ts';

const rectangle = (west, south, east, north) => [[west, south], [east, south], [east, north], [west, north], [west, south]];
const feature = (id, kind, geometry) => ({type:'Feature', properties:{id, name:id, kind, color:'#345678', labelCoordinate:[1, 1]}, geometry});
const data = {
  type:'FeatureCollection',
  features:[
    feature('wheat', 'crop', {type:'Polygon', coordinates:[rectangle(0, 0, 10, 10), rectangle(4, 4, 6, 6)]}),
    feature('maize', 'crop', {type:'MultiPolygon', coordinates:[[rectangle(2, 2, 8, 8)], [rectangle(20, 20, 24, 24), rectangle(21, 21, 22, 22)]]}),
    feature('sheep', 'livestock', {type:'Polygon', coordinates:[rectangle(6, 6, 12, 12)]}),
  ],
};
const ids = ['wheat', 'maize', 'sheep'];
const at = (point, visible = ids) => farmingAtPoint(data, point, visible).map(item => item.id);

test('分布面の穴では、その品目を選択候補に含めない', () => {
  assert.deepEqual(at([1, 1]), ['wheat']);
  assert.deepEqual(at([5, 5]), ['maize'], '小麦の穴には別品目の面だけが残る');
  assert.deepEqual(at([21.5, 21.5]), [], 'MultiPolygonの遠い分布面にある穴も除外する');
});

test('離れた主産地はどちらも選択でき、間の空白を結ばない', () => {
  assert.deepEqual(at([3, 3], ['maize']), ['maize']);
  assert.deepEqual(at([23, 23], ['maize']), ['maize']);
  assert.deepEqual(at([15, 15], ['maize']), []);
  assert.deepEqual(at([-2, 5]), []);
});

test('作物と畜産が重なる位置では全候補を返し、最上面だけに決めない', () => {
  const candidates = farmingAtPoint(data, [7, 7], ids);
  assert.deepEqual(candidates.map(item => item.id), ['wheat', 'maize', 'sheep']);
  assert.equal(candidates.find(item => item.id === 'sheep').kind, 'livestock');
  assert.deepEqual(at([3, 3]), ['wheat', 'maize']);
});

test('非表示の品目を候補から外し、全非表示なら何も選択しない', () => {
  assert.deepEqual(at([7, 7], ['wheat', 'maize']), ['wheat', 'maize']);
  assert.deepEqual(at([7, 7], ['sheep']), ['sheep']);
  assert.deepEqual(at([7, 7], []), []);
  assert.deepEqual(at([7, 7], ['unknown']), []);
  assert.deepEqual(at([7, 7], ['sheep', 'sheep']), ['sheep']);
});
