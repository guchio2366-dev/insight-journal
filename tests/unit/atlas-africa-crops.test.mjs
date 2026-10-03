import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';

const base=new URL('../../public/assets/atlas/africa-crops-v1/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function decodePng(bytes){
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);assert.equal(bytes[24],8);assert.equal(bytes[25],6);
 let offset=8,parts=[];while(offset<bytes.length){const n=bytes.readUInt32BE(offset);if(bytes.toString('ascii',offset+4,offset+8)==='IDAT')parts.push(bytes.subarray(offset+8,offset+8+n));offset+=n+12;}
 const scan=inflateSync(Buffer.concat(parts)),rgba=Buffer.alloc(w*h*4);
 for(let row=0;row<h;row++){assert.equal(scan[row*(1+w*4)],0);scan.copy(rgba,row*w*4,row*(1+w*4)+1,(row+1)*(1+w*4));}
 return {w,h,rgba};
}

test('Africa crop provenance identifies the fixed commercially reusable official source and both identical archives',()=>{
 assert.equal(manifest.licenseEvidence.datasetVersion,'6.0');assert.equal(manifest.licenseEvidence.license,'CC BY 4.0');assert.equal(manifest.licenseEvidence.grantSection,4);
 assert.equal(manifest.licenseEvidence.fixedMetadataSha256,'6e71c847cdf3b383cf71a94432fe2a09620d23aeba67859564213effaaf03559');
 assert.equal(manifest.licenseEvidence.mirrorReadme.matchesDataverseReadme,false);
 assert.equal(manifest.licenseEvidence.mirrorReadme.md5,'250ce76594c9ef3edbaab79f5f850b25');
 for(const layer of Object.values(manifest.layers)){
  assert.equal(layer.referenceYear,2020);assert.equal(layer.releaseDate,'2026-05-05');assert.equal(layer.sourceEdition,'V2r2');assert.equal(layer.productionSystem,'A (all technologies)');
  assert.equal(layer.sourceUrl,'https://doi.org/10.7910/DVN/SWPENT');assert.equal(layer.license,'CC BY 4.0');
  if(layer.measure==='harvested'){assert.equal(layer.sourceDataFileId,13827040);assert.equal(layer.sourceArchiveBytes,68007241);assert.equal(layer.sourceArchiveMd5,'dd9ac5def086fcae26d28423b2b31f8b');}
  else {assert.equal(layer.sourceDataFileId,13827043);assert.equal(layer.sourceArchiveBytes,75175570);assert.equal(layer.sourceArchiveMd5,'8ce3956c25860ae9960155b8382518de');}
 }
});

test('Eight crops measures keep native geometry, complete legends, and distinct harvested-area and production units',()=>{
 assert.deepEqual(Object.keys(manifest.layers),['maize-harvested','maize-production','rice-harvested','rice-production','wheat-harvested','wheat-production','cassava-harvested','cassava-production']);
 assert.deepEqual(manifest.bounds,[-27,-36,64,39]);assert.equal(manifest.width,1092);assert.equal(manifest.height,900);assert.equal(manifest.resolutionDegrees,1/12);
 for(const layer of Object.values(manifest.layers)){
  assert.deepEqual(layer.sourceNativeWindow,[1836,612,2928,1512]);assert.equal(layer.encoding,'float32-le-gzip');assert.equal(layer.noData,-1);
  assert.equal(layer.sourceNoData,-3.4028234663852886e38);assert.equal(layer.zeroValue,0);assert.equal(layer.legend[0].id,'crop-zero');assert.equal(layer.legend[0].color,layer.zeroColor);
  assert.equal(layer.positiveLegend.length,layer.colors.length);assert.deepEqual(layer.legend.slice(1),layer.positiveLegend);assert.equal(layer.colors.length,layer.breaks.length+1);
  assert.ok(layer.positiveLegend.slice(0,-1).every(item=>item.label.includes('未満')));assert.match(layer.positiveLegend.at(-1).label,/以上$/);
  assert.match(layer.unit,layer.measure==='harvested'?/^ha /:/^t /);assert.match(layer.method,/not proportionally apportioned/);
 }
 assert.match(manifest.limitations.join(' '),/not direct observations/);assert.match(manifest.limitations.join(' '),/not treated as zero/);assert.match(manifest.limitations.join(' '),/not official national totals/);
});

// These values were read from the immutable original TIFFs at the recorded global row/column.
const originals={
 'maize-harvested':{index:508521,row:1077,col:2577,value:10174.099609375,zero:22682,valid:177050},
 'maize-production':{index:876405,row:1414,col:2457,value:80043.8984375,zero:23646,valid:177050},
 'rice-harvested':{index:543406,row:1109,col:2518,value:12164.2998046875,zero:15286,valid:118455},
 'rice-production':{index:518377,row:1086,col:2605,value:116983.703125,zero:15669,valid:118455},
 'wheat-harvested':{index:419042,row:995,col:2642,value:8123.89990234375,zero:20630,valid:79720},
 'wheat-production':{index:104433,row:707,col:2529,value:56937.30078125,zero:20385,valid:79720},
 'cassava-harvested':{index:422865,row:999,col:2097,value:18478.666015625,zero:12589,valid:129472},
 'cassava-production':{index:452556,row:1026,col:2304,value:162264.796875,zero:8443,valid:129472}
};
test('Delivered crop grids retain original TIFF fixture values and supplied zero/missing coverage without filling gaps',async()=>{
 for(const [key,expected] of Object.entries(originals)){
  const layer=manifest.layers[key],bytes=gunzipSync(await readFile(new URL(layer.grid,base)));
  assert.equal(bytes.length,1092*900*4);assert.equal(bytes.readFloatLE(expected.index*4),expected.value);
  const maximum=layer.samples.find(s=>s.kind==='positiveMaximum');assert.equal(maximum.sourceRow,expected.row);assert.equal(maximum.sourceCol,expected.col);
  let zero=0,valid=0,missing=0;for(let i=0;i<bytes.length;i+=4){const v=bytes.readFloatLE(i);assert.ok(Number.isFinite(v));assert.ok(v===-1||v>=0);if(v===-1)missing++;else {valid++;if(v===0)zero++;}}
  assert.equal(zero,expected.zero);assert.equal(valid,expected.valid);assert.equal(missing,1092*900-valid);
  for(const sample of layer.samples){assert.equal(bytes.readFloatLE(sample.index*4),sample.value);if(sample.kind==='sourceMissingOnLand'){assert.equal(sample.maskAtCellCentre,true);assert.equal(sample.sourceNoData,true);assert.equal(sample.value,-1);}}
 }
});

test('All published crop files match provenance and source-fixture colors distinguish true zero from missing',async()=>{
 for(const [name,record] of Object.entries(manifest.files)){const bytes=await readFile(new URL(name,base));assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);}
 for(const layer of Object.values(manifest.layers)){
  const {w,h,rgba}=decodePng(await readFile(new URL(layer.image,base)));assert.equal(w,1092);assert.equal(h,900);
  for(const sample of layer.samples){const pixel=[...rgba.subarray(sample.index*4,sample.index*4+4)];if(sample.value===-1)assert.deepEqual(pixel,[0,0,0,0]);else {const item=layer.legend.find(r=>r.id===sample.pngClass);assert.deepEqual(pixel,[...Buffer.from(item.color.slice(1),'hex'),255]);}}
 }
 const notice=await readFile(new URL('source-notice.txt',base),'utf8');assert.match(notice,/IFPRI bears no responsibility/);assert.match(notice,/Changes: native Africa window/);
});
