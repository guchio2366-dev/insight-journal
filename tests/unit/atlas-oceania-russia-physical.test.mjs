import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build, stop} from 'esbuild';
import sharp from 'sharp';
import {Window} from 'happy-dom';

const root = new URL('../../', import.meta.url);
after(()=>stop());
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
   assert.deepEqual(layer.bounds,data.bounds);assert.equal(layer.legend.length,data.colors.length+1);
   assert.equal(layer.legend.at(-1).shape,'missing');assert.match(layer.legend.at(-1).label,/0ではない/);
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
});

test('rainfall labels identify saved contour pixels and their two adjacent 250 mm bands', async()=>{
 const [oceania,russia]=await Promise.all([bundle('src/data/atlas/oceania-learning.ts'),bundle('src/data/atlas/russia-learning.ts')]);
 for(const [region,api] of [['oceania',oceania],['russia',russia]]){
  const data=JSON.parse(readFileSync(new URL(`src/data/atlas/${region}-precipitation-labels.json`,root)));
  const manifest=JSON.parse(readFileSync(new URL(`public/assets/atlas/${region}-physical-v1/manifest.json`,root))).gpcc;
  const image=readFileSync(new URL(`public/assets/atlas/${region}-physical-v1/precipitation.png`,root));
  assert.equal(createHash('sha256').update(image).digest('hex'),data.imageSha256);
  const {data:rgba,info}=await sharp(image).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const pixel=(x,y)=>[...rgba.subarray((y*info.width+x)*4,(y*info.width+x)*4+4)];
  const palette=manifest.colors.map(color=>[...Buffer.from(color.slice(1),'hex'),255].join(','));
  for(const label of data.labels){
   const [x,y]=label.pixel;assert.deepEqual(pixel(x,y),[36,75,105,255]);
   const neighbors=new Set();for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)neighbors.add(pixel(x+dx,y+dy).join(','));
   const adjacent=palette.flatMap((color,index)=>neighbors.has(color)?[index]:[]);
   assert.deepEqual(adjacent,[label.mm/250-1,label.mm/250],`${region}/${label.id}: actual saved contour's neighboring bands`);
   const [west,south,east,north]=manifest.bounds;
   assert.deepEqual(label.coordinates,[west+x/info.width*(east-west),north-y/info.height*(north-south)]);
  }
  const state=region==='oceania'?api.createOceaniaState('?layer=precipitation','nature'):api.createRussiaState('?layer=precipitation','nature');
  const scene=region==='oceania'?api.renderOceaniaScene(api.getOceaniaLayer('precipitation'),state):api.renderRussiaScene(api.getRussiaLayer('precipitation'),state);
  const window=new Window();try{
   window.document.body.innerHTML=scene;
   assert.equal(window.document.querySelectorAll('[data-isohyet-label]').length,data.labels.length);
   assert.equal(window.document.querySelector('[data-precipitation-map-unit] text').textContent,'線の数値：mm／年');
   for(const label of data.labels)assert.equal(window.document.querySelector(`[data-isohyet-label="${label.id}"] text`).textContent,label.mm.toLocaleString('ja-JP'));
  }finally{window.happyDOM.abort();}
 }
});
