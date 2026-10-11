import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build, stop} from 'esbuild';

const root = new URL('../../', import.meta.url);
const bundle = async path => {
 const result = await build({entryPoints:[new URL(path,root).pathname],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
};
test('new nature layers have verified generated images, source metadata and honest scales in both regions', async () => {
 const [oceania,russia] = await Promise.all([bundle('src/data/atlas/oceania-learning.ts'),bundle('src/data/atlas/russia-learning.ts')]);
 for (const [region,api] of [['oceania',oceania],['russia',russia]]) {
  const manifest=JSON.parse(readFileSync(new URL(`public/assets/atlas/${region}-physical-v1/manifest.json`,root)));
  const layers=region==='oceania'?api.oceaniaLayers:api.russiaLayers;
  for (const [id,data] of [['precipitation',manifest.gpcc],['elevation',manifest.etopo]]) {
   const layer=layers.find(item=>item.id===id);
   assert.equal(layer.field,'nature');assert.equal(layer.kind,'raster');
   assert.deepEqual(layer.bounds,data.bounds);assert.equal(layer.legend.length,data.colors.length);
   assert.ok(layer.sources.some(source=>source.url===data.sourceUrl));
   const image=readFileSync(new URL('public/'+layer.image.slice(1),root));
   assert.equal(createHash('sha256').update(image).digest('hex'),data.imageSha256);
   assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(image.readUInt32BE(16),data.size[0]);assert.equal(image.readUInt32BE(20),data.size[1]);
   assert.match(layer.coverage,id==='precipitation'?/河川|水量/:/標高/);
  }
  assert.deepEqual(manifest.gpcc.breaksMm.slice(0,3),[250,500,750]);
  assert.deepEqual(manifest.etopo.breaksM.slice(0,3),[0,500,1000]);
  assert.ok(manifest.gpcc.validSamplePixels>0);
  assert.ok(manifest.etopo.validSamplePixels>0);
 }
 stop();
});
