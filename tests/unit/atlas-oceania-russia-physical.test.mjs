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
  const rivers=JSON.parse(readFileSync(new URL(`public/assets/atlas/${region}-rivers-v1.json`,root)));
  const riverLayer=layers.find(item=>item.id==='rivers');
  assert.equal(rivers.sourceSha256,'f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51');
  assert.equal(riverLayer.kind,'rivers');assert.match(riverLayer.coverage,/流向・河口/);
  assert.equal(rivers.rivers.length,region==='russia'?5:3);
  for(const river of rivers.rivers){
   assert.ok(river.lines.some(line=>line.some(point=>point[0]===river.labelPosition[0]&&point[1]===river.labelPosition[1])));
   assert.ok(river.lines.every(line=>line.length>=2));
  }
  const state=region==='oceania'?api.createOceaniaState('?layer=rivers','nature'):api.createRussiaState('?layer=rivers','nature');
  const scene=region==='oceania'?api.renderOceaniaScene(riverLayer,state):api.renderRussiaScene(riverLayer,state);
  assert.equal((scene.match(/data-river-name=/g)??[]).length,rivers.rivers.length);
  assert.doesNotMatch(scene,/marker-end=|flow-direction=/);
 }
 stop();
});
