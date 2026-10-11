import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {europeReadings} from '../../src/data/atlas/europe/readings.ts';

const json=path=>JSON.parse(readFileSync(new URL(`../../${path}`,import.meta.url)));
const names=json('src/data/atlas/europe/river-names.json');
const rivers=json('public/assets/atlas/europe/context-v1/rivers.json').features;

test('additional river names and anchors match actual retained Natural Earth lines',()=>{
  assert.equal(new Set(names.map(item=>item.id)).size,18);
  for(const item of names){
    const lines=rivers.filter(feature=>item.sourceNames.includes(feature.properties.sourceName))
      .flatMap(feature=>feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates);
    assert.ok(lines.length,item.id);
    assert.ok(lines.some(line=>line.some(coordinate=>coordinate.every((value,index)=>value===item.coordinates[index]))),item.id);
    const reading=europeReadings.find(reading=>reading.id===item.id);
    assert.equal(reading.layer,'water');
    assert.equal(reading.name,item.name);
    assert.match(reading.explanation,/本支流の全接続、全流域界を示すものではありません/);
  }
});
