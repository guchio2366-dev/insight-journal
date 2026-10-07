import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {africaCommodityColor,africaGridClassOutline} from '../../src/scripts/atlas-africa-layers.ts';

const asset=new URL('../../public/assets/atlas/africa-agriculture-overview-v1/',import.meta.url);
const summary=JSON.parse(readFileSync(new URL('manifest.json',asset),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];

test('agriculture summaries identify immutable source grids, distinct category colours and the explicit selection rule',()=>{
 assert.deepEqual(Object.keys(summary.layers),expected);
 assert.deepEqual(summary.bounds,[-27,-36,64,39]);assert.equal(summary.resolutionDegrees,1);
 assert.equal(summary.processing.minimumValidLandAreaFraction,.5);
 assert.equal(summary.processing.sourceAssetsModified,false);
 const boundary=readFileSync(new URL('../../src/data/atlas/africa-geography.json',import.meta.url));
 assert.equal(summary.sourceBoundarySha256,sha(boundary));
 const generator=readFileSync(new URL('../../scripts/prepare-africa-agriculture-overview.py',import.meta.url));
 assert.equal(summary.processing.generatorSha256,sha(generator));
 const colours=new Set();
 for(const [key,layer]of Object.entries(summary.layers)){
  assert.equal(layer.sourceGridSha256,sha(readFileSync(new URL(layer.sourceGrid,asset))));
  assert.equal(layer.color,africaCommodityColor(key));colours.add(layer.color);
  assert.equal(layer.thresholdQuantile,.75);assert.ok(Number.isFinite(layer.threshold)&&layer.threshold>0);
  assert.equal(layer.selectedCells,layer.cells.length);
  assert.ok(layer.selectedCells>=Math.floor(layer.positiveEligibleCells/4));
  assert.ok(layer.selectedCells<=Math.ceil(layer.positiveEligibleCells/4)+1,'ties are not silently discarded');
  assert.match(layer.sourceUrl,/^https:\/\//);assert.match(layer.period,/2020/);
  assert.match(layer.unit,key.startsWith('crop-')?/ha\/km²/:/頭\/km²/);
  const ids=new Set();
  for(const [row,col,value,coverage]of layer.cells){
   assert.ok(Number.isInteger(row)&&row>=0&&row<summary.height);assert.ok(Number.isInteger(col)&&col>=0&&col<summary.width);
   assert.ok(value>=layer.threshold-1e-6);assert.ok(coverage>=.5&&coverage<=1);
   const id=`${row},${col}`;assert.ok(!ids.has(id));ids.add(id);
  }
  for(const anchor of layer.anchors){assert.ok(ids.has(`${anchor.row},${anchor.col}`),'a label never introduces a new distribution cell');assert.equal(anchor.lon,-27+anchor.col+.5);assert.equal(anchor.lat,39-anchor.row-.5);}
 }
 assert.equal(colours.size,7);
});

test('representative summary values independently recompute native-cell area weighting and retain zero/missing separation',()=>{
 for(const [key,layer]of Object.entries(summary.layers)){
  const manifest=JSON.parse(readFileSync(new URL(layer.sourceManifest,asset),'utf8'));
  const original=manifest.layers[layer.sourceLayer],grid=gunzipSync(readFileSync(new URL(layer.sourceGrid,asset)));
  let validCount=0,zeroCount=0,missingCount=0;
  for(let i=0;i<grid.length;i+=4){const value=grid.readFloatLE(i);if(value===original.noData)missingCount++;else if(Number.isFinite(value)&&value>=0){validCount++;if(value===0)zeroCount++;}}
  assert.equal(validCount,layer.nativeValidCells);assert.equal(zeroCount,layer.nativeZeroCells);assert.ok(missingCount>0);assert.ok(layer.nativeMissingLandCells>0);
  // Sample the first, middle and last extracted cells, including coastal and
  // incomplete cells. The divisor contains only available native-cell area.
  const samples=[layer.cells[0],layer.cells[Math.floor(layer.cells.length/2)],layer.cells.at(-1)];
  for(const [row,col,value]of samples){
   let numerator=0,availableArea=0;
   for(let r=row*12;r<(row+1)*12;r++){
    const north=(39-r/12)*Math.PI/180,south=(39-(r+1)/12)*Math.PI/180;
    const area=6371.0088**2*(Math.PI/180/12)*(Math.sin(north)-Math.sin(south));
    for(let c=col*12;c<(col+1)*12;c++){
     const native=grid.readFloatLE((r*original.width+c)*4);if(native===original.noData||!Number.isFinite(native)||native<0)continue;
     availableArea+=area;numerator+=key.startsWith('crop-')?native:native*area;
    }
   }
   assert.ok(availableArea>0);
   const actual=numerator/availableArea;
   assert.ok(Math.abs(actual-value)<Math.max(2e-6,Math.abs(actual)*2e-7),`${key} ${row},${col}: ${actual} versus ${value}`);
  }
 }
});

test('selection outlines use exactly the displayed one-degree mask, preserving gaps',()=>{
 for(const [key,layer]of Object.entries(summary.layers)){
  const mask=new Uint8Array(summary.width*summary.height);
  for(const [row,col]of layer.cells)mask[row*summary.width+col]=1;
  const outline=africaGridClassOutline(mask,{...summary,noData:0,classes:[{id:1,color:layer.color}]},'1');
  assert.ok(outline.length>0,key);assert.doesNotMatch(outline,/NaN|Infinity/);
  assert.equal(mask.reduce((sum,value)=>sum+value,0),layer.selectedCells);
 }
 const separated=africaGridClassOutline(new Uint8Array([1,0,1]),{bounds:[0,0,3,1],width:3,height:1,noData:0,classes:[{id:1,color:'#123456'}]},'1');
 assert.equal((separated.match(/M/g)??[]).length,8,'two separated summary cells retain two closed outlines');
});
