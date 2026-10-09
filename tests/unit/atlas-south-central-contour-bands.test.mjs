import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {contourBandLabels} from '../../src/data/atlas/asia-contour-bands.ts';
import {southCentralRainfallLegend} from '../../src/data/atlas/asia-south-central-rainfall-legend.ts';

const base='public/assets/atlas/asia-presentation-v1/';
const manifest=JSON.parse(readFileSync(base+'manifest.json'));
const json=file=>JSON.parse(gunzipSync(readFileSync(base+file)));
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const key=(a,b)=>a.join(',')<b.join(',')?a.join(',')+'|'+b.join(','):b.join(',')+'|'+a.join(',');

for(const [kind,interval] of [['rainfall',250],['terrain',500]]){
 test(`South/Central Asia ${kind} fills and lines share actual interpolated boundaries and source provenance`,()=>{
  const record=manifest.regions['south-central-asia'][kind],meta=record.bands;
  assert.equal(meta.interval,interval);
  assert.equal(sha(meta.geometryEngine),meta.geometryEngineSHA256,'Confirmed geometry engine remains unchanged');
  assert.equal(sha(meta.sourceGrid),meta.sourceGridSHA256,'The original lookup grid is pinned');
  const collect=parts=>{const features=[];for(const part of parts){assert.equal(sha(base+part.file),part.sha256);const collection=json(part.file);assert.equal(collection.type,'FeatureCollection');assert.equal(collection.features.length,part.featureCount);features.push(...collection.features);}return features;};
  const bands=collect(meta.bandParts),lines=collect(meta.lineParts);
  assert.equal(bands.length,meta.bandFeatureCount);assert.equal(lines.length,meta.lineFeatureCount);
  assert.equal(meta.thresholdRule,'lower inclusive, upper exclusive');
  assert.equal(meta.breaks.length,meta.colors.length+1);
  if(kind==='rainfall'){
   assert.equal(new Set(meta.colors).size,11,'The annual-rainfall legend groups 250 mm numeric bands into 11 readable colors');
   assert.equal(southCentralRainfallLegend(meta).length,11);
   assert.equal(meta.breaks.at(-1),9750,'9750 mm is the upper legend edge, not an observed station value');
  }else assert.equal(new Set(meta.colors).size,meta.colors.length,'Every terrain interval retains a distinct color, including negative coastal elevations');
  for(let i=1;i<meta.breaks.length;i++)assert.equal(meta.breaks[i]-meta.breaks[i-1],interval);
  assert(bands.length>100);assert(lines.length>100);
  const samples=new Map(),levels=new Set();
  for(const f of lines){
   assert.equal(f.geometry.type,'LineString');
   const value=f.properties.value,a=f.geometry.coordinates;
   assert.equal(Math.abs(value%interval),0);assert(meta.breaks.includes(value));levels.add(value);
   for(const i of new Set([0,Math.floor((a.length-2)/2),a.length-2]))if(a[i].join()!==a[i+1].join())samples.set(key(a[i],a[i+1]),{value,neighbors:new Set()});
  }
  for(const f of bands){
   assert.equal(f.geometry.type,'Polygon');
   const {lower,upper,color}=f.properties,index=meta.breaks.indexOf(lower);
   assert.equal(upper-lower,interval);assert.equal(color,meta.colors[index]);
   for(const ring of f.geometry.coordinates){
    assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));
    for(let i=0;i<ring.length-1;i++){
     assert(ring[i].every(Number.isFinite));
     const sample=samples.get(key(ring[i],ring[i+1]));
     if(sample)sample.neighbors.add(lower+':'+upper);
    }
   }
  }
  assert(samples.size>1000,'Check many real boundaries, beyond mesh or legend presence');
  for(const {value,neighbors} of samples.values())assert.deepEqual(neighbors,new Set([`${value-interval}:${value}`,`${value}:${value+interval}`]));
  assert.equal(contourBandLabels(meta).length,meta.colors.length);
  assert(contourBandLabels(meta).every((label,i)=>label.color===meta.colors[i]));
  assert(meta.maskedCellCount>0,'Sea and missing source cells remain masked');
  // Agriculture keeps the prior line asset and labels; aligned natural maps
  // have separate source IDs and never replace that overlay's cached geometry.
  assert(meta.lineParts.every(part=>record.file!==part.file));
  assert(record.labels.length>0);assert(levels.size>5);
 });
}
