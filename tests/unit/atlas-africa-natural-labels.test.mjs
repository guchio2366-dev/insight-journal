import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {africaNaturalLabels,africaTerrainLabels,africaTerrainRanges,africaRiverLabels,africaWindLabels,africaCurrentLabels,africaBasinReadings} from '../../src/data/atlas/africa-natural-labels.ts';
import {reading} from '../../src/data/atlas/africa-reading.ts';

const rivers=JSON.parse(gunzipSync(fs.readFileSync('public/assets/atlas/africa-natural-presentation-v2/major-rivers.geojson.gz')));
const basins=JSON.parse(gunzipSync(fs.readFileSync('public/assets/atlas/africa-natural-presentation-v2/major-basins.geojson.gz')));
test('all permanent labels and guide axes fit the Africa frame and cite a source',()=>{
 const ids=new Set();for(const item of africaNaturalLabels){assert.ok(!ids.has(item.id),item.id);ids.add(item.id);
  assert.match(item.source.url,/^https:\/\//);assert.ok(item.note);
  for(const [lon,lat]of [item.coordinates,...item.axis??[]])assert.ok(Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=-27&&lon<=64&&lat>=-36&&lat<=39,item.id);
 }
 assert.ok(africaTerrainLabels.length>=12);
 for(const label of africaTerrainLabels.filter(row=>row.rangeId))assert.ok(africaTerrainRanges.features.some(f=>f.properties.id===label.rangeId));
 assert.ok(africaTerrainRanges.features.every(f=>f.properties.schematic&&f.properties.sourceId&&f.geometry.type.match(/Polygon/)));
});
test('every river label uses an actual unshifted vertex of its assigned native river',()=>{
 assert.equal(africaRiverLabels.length,11);
 for(const label of africaRiverLabels){
  const features=rivers.features.filter(f=>f.properties.riverId===label.id);assert.ok(features.length);
  const points=features.flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates).flat());
  assert.ok(points.some(p=>p[0]===label.coordinates[0]&&p[1]===label.coordinates[1]),label.id);
 }
});
test('current arrows and seasonal wind arrows follow their declared directions',()=>{
 const get=id=>africaCurrentLabels.find(row=>row.id===id);assert.ok(get('benguela').axis.at(-1)[1]>get('benguela').axis[0][1]);
 assert.ok(get('canary').axis.at(-1)[1]<get('canary').axis[0][1]);assert.ok(get('agulhas').axis.at(-1)[0]<get('agulhas').axis[0][0]);assert.ok(get('agulhas').axis.at(-1)[1]<get('agulhas').axis[0][1]);
 for(const id of ['harmattan','west-african-monsoon'])assert.ok(africaWindLabels.find(row=>row.id===id).season);
 const trade=africaWindLabels.find(row=>row.id==='southeast-trades');assert.ok(trade.axis.at(-1)[0]<trade.axis[0][0]&&trade.axis.at(-1)[1]>trade.axis[0][1]);
});
test('all 11 verified catchments have a reading and the approved Congo text is unchanged',()=>{
 assert.deepEqual(africaBasinReadings.map(row=>row.id).sort(),basins.features.map(f=>f.id).sort());
 const congo=africaBasinReadings.find(row=>row.id==='congo');assert.equal(congo.description,reading.nature.find(row=>row.title==='コンゴ盆地：湿潤な環境と森林').text);assert.equal(congo.preserveExisting,true);
 for(const row of africaBasinReadings)assert.equal(row.outlet,basins.features.find(f=>f.id===row.id).properties.outletName);
});
