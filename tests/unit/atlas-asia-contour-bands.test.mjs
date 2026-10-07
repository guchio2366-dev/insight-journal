import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {contourBandLabels} from '../../src/data/atlas/asia-contour-bands.ts';

const base='public/assets/atlas/asia-presentation-v1/';
const manifest=JSON.parse(readFileSync(base+'manifest.json'));
const json=file=>JSON.parse(gunzipSync(readFileSync(base+file)));
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const key=(a,b)=>a.join(',')<b.join(',')?a.join(',')+'|'+b.join(','):b.join(',')+'|'+a.join(',');

for(const [kind,interval] of [['rainfall',250],['terrain',500]]){
 test(`East Asia ${kind} fills and lines share actual interpolated boundaries and source provenance`,()=>{
  const record=manifest.regions['east-asia'][kind],meta=record.bands;
  assert.equal(meta.interval,interval);
  assert.equal(sha(meta.sourceGrid),meta.sourceGridSHA256,'The original lookup grid is pinned');
  assert.equal(sha(base+meta.file),meta.bandSHA256);
  assert.equal(sha(base+meta.lineFile),meta.lineSHA256);
  assert.equal(meta.thresholdRule,'lower inclusive, upper exclusive');
  assert.equal(meta.breaks.length,meta.colors.length+1);
  assert.equal(new Set(meta.colors).size,meta.colors.length,'Every interval has a distinct color, including retained negative coastal elevations');
  for(let i=1;i<meta.breaks.length;i++)assert.equal(meta.breaks[i]-meta.breaks[i-1],interval);
  const bands=json(meta.file).features,lines=json(meta.lineFile).features;
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
  assert.notEqual(record.file,meta.lineFile);
  assert(record.labels.length>0);assert(levels.size>5);
 });
}
