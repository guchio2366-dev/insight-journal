import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,stop} from 'esbuild';
async function bundled(relative){const result=await build({entryPoints:[fileURLToPath(new URL('../../'+relative,import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const api=await bundled('src/data/atlas/russia-learning.ts'),geo=await bundled('src/lib/atlas-russia-geometry.ts');
const read=p=>readFileSync(new URL('../../'+p,import.meta.url));
const json=p=>JSON.parse(read(p));
after(()=>stop());
test('Russia antimeridian positions join and original polygon edges do not cross the continent',()=>{
 const west=geo.projectRussia([179,66]),east=geo.projectRussia([-179,66]);assert.ok(east[0]>west[0]);assert.ok(east[0]-west[0]<15);assert.equal(east[1],west[1]);
 const shape=json('src/data/atlas/russia-countries.json').features.find(f=>f.properties.kind==='russia');
 const rings=geo.russiaRings(shape.geometry);assert.ok(rings.length>20);
 for(const ring of rings)for(let i=1;i<ring.length;i++){assert.ok(Math.abs(ring[i][0]-ring[i-1][0])<30,'no artificial date-line edge');assert.ok(ring[i][0]>=18&&ring[i][0]<=191);}
 assert.equal(geo.projectRussia([18,83])[0],0);assert.equal(geo.projectRussia([191,40])[0],1200);
});
test('unknown URL and prototype-like fields normalize to safe same-field maps',()=>{
 for(const field of Object.keys(api.russiaFields)){
  const state=api.createRussiaState('?place=RUS&theme=missing&layer=missing&scope=region&compare=missing&view=broken',field);
  assert.equal(state.place,'all');assert.equal(state.scope,'all');assert.equal(state.comparison,false);assert.equal(api.getRussiaLayer(state.layer).field,field);
 }
 for(const field of ['__proto__','constructor','missing'])assert.equal(api.createRussiaState('',field).field,'nature');
});
test('all three learning windows are finite and preserve a shared comparison frame',()=>{
 for(const place of ['west','siberia','far-east'])for(const field of Object.keys(api.russiaFields)){
  const state=api.createRussiaState('?place='+place+'&scope=region&view=comparison',field);const frame=api.russiaFrame(state);
  assert.equal(frame.length,4);assert.ok(frame.every(Number.isFinite));assert.ok(frame[2]>0&&frame[3]>0);
  const first=api.renderRussiaScene(api.getRussiaLayer(state.layer),state,'source'),second=api.renderRussiaScene(api.getRussiaLayer(state.compareLayer),state,'comparison');
  assert.equal(first.match(/viewBox="([^"]+)/)[1],second.match(/viewBox="([^"]+)/)[1]);
  assert.match(api.russiaCoverage(api.getRussiaLayer(state.layer),state),/行政境界ではありません/);
 }
});
test('wheat/climate explanation names the visible region and does not equate missing cells with zero',()=>{
 for(const [place,visible,absent] of [['west','ロストフ','アムール'],['siberia','オムスク','ロストフ'],['far-east','アムール','ロストフ']]){
  const state=api.createRussiaState('?place='+place+'&scope=region&layer=wheat&compare=climate','agriculture');const reading=api.getRussiaComparisonReading(state);
  assert.ok(reading.message.includes(visible));assert.ok(!reading.message.includes(absent));assert.match(reading.message,/未収録は栽培ゼロを意味せず/);assert.ok(reading.sources.some(s=>s.url.includes('SWPENT')));
  const reverse=api.getRussiaComparisonReading({...state,layer:'climate',compareLayer:'wheat'});assert.ok(reverse.message.includes(visible));
 }
});
test('city country assignment and population footprint remain distinct from the boundary source',()=>{
 const data=json('public/assets/atlas/russia-population-v1/centres.json');assert.equal(data.centres.length,253);assert.equal(data.populationYear,2020);assert.equal(data.urbanBoundaryYear,2025);
 assert.ok(data.centres.every(c=>c.country==='RUS'&&c.sourceCountryGAD==='Russia'));
 assert.ok(!data.centres.some(c=>[3669,3856].includes(c.sourceId)));
 assert.match(api.getRussiaLayer('cities').coverage,/Ukraine/);assert.match(api.russiaBoundarySources[0].note,/クリミア/);
 const comparison=api.getRussiaComparisonReading(api.createRussiaState('?layer=cities&compare=density','population'));
 assert.match(comparison.message,/5km平均密度/);assert.match(comparison.message,/2025年固定/);
});
test('fixed displayed assets match the source manifests and keep missing/zero separate',()=>{
 for(const folder of ['russia-climate-v1','russia-crops-v1','russia-livestock-v1','russia-population-v1']){
  const manifest=json('public/assets/atlas/'+folder+'/manifest.json');
  for(const [name,details] of Object.entries(manifest.files)){const bytes=read('public/assets/atlas/'+folder+'/'+name);assert.equal(bytes.length,details.bytes,folder+'/'+name);assert.equal(createHash('sha256').update(bytes).digest('hex'),details.sha256);}
 }
 for(const id of ['wheat','cattle','density']){const legends=api.getRussiaLayer(id).legend;assert.ok(legends.some(l=>l.label==='0（有効値）'));assert.ok(legends.some(l=>l.label==='未収録・分類なし'));}
 const climate=json('public/assets/atlas/russia-climate-v1/manifest.json'),grid=gunzipSync(read('public/assets/atlas/russia-climate-v1/climate-grid.bin.gz'));assert.equal(grid.length,climate.width*climate.height);assert.ok(grid.includes(0));assert.ok(grid.includes(27));
});
test('copyright attribution and original time periods are visible in the layers',()=>{
 const population=json('public/assets/atlas/russia-population-v1/manifest.json');for(const id of ['density','cities'])assert.ok(api.getRussiaLayer(id).sources.some(s=>s.url===population.referencePublicationDoi&&s.title===population.referencePublication));
 const wheat=api.getRussiaLayer('wheat');assert.equal(wheat.sources[0].note,json('public/assets/atlas/russia-crops-v1/attribution.json').requiredAdaptationText);assert.match(wheat.period,/2020/);assert.match(wheat.unit,/ha/);
 assert.match(api.getRussiaLayer('cattle').unit,/頭/);assert.match(api.getRussiaLayer('climate').period,/1991/);assert.equal(api.getRussiaLayer('climate').legend.length,18);
 assert.ok(api.russiaLayers.every(l=>l.period&&l.unit&&l.sources.length&&l.sources.every(s=>s.url.startsWith('https://'))));
});

test('theme descriptions and SVG names identify the displayed learning window',()=>{
 for(const [field,theme,expected,excluded] of [['agriculture','wheat-and-water',['小麦と生育期・出荷','欧州側・ウラル付近','シベリア'],['極東']],['industry','northern-resources',['北極圏','シベリア'],['欧州側・ウラル付近','極東']]]){
  const state=api.createRussiaState('?scope=theme&theme='+theme,field),reading=api.getRussiaComparisonReading(state),scene=api.renderRussiaScene(api.getRussiaLayer(state.layer),state),aria=scene.match(/aria-label="([^"]+)"/)[1];
  for(const name of expected){assert.ok(reading.message.includes(name));assert.ok(aria.includes(name));}
  for(const name of [...excluded,'ロシア全域']){assert.ok(!aria.includes(name));assert.ok(!api.russiaScopeName(state).includes(name));}
  const climateScene=api.renderRussiaScene(api.getRussiaLayer('climate'),state);for(const name of excluded)assert.ok(!climateScene.includes('>'+name+'</text>'));
  const all={...state,scope:'all'};assert.match(api.renderRussiaScene(api.getRussiaLayer(state.layer),all),/aria-label="[^"]*ロシア全域"/);assert.ok(api.getRussiaComparisonReading(all).message.startsWith('ロシア全域：'));
 }
});
