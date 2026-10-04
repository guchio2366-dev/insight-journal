import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const built=await build({stdin:{contents:`export {createAsiaSeasonalPrecipitation} from './src/scripts/atlas-asia-seasonal-precipitation.ts';export {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison} from './src/lib/atlas-asia-state.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'SeasonalUnderTest'});
const component=await readFile('src/components/atlas/AsiaSeasonalPrecipitationPanel.astro','utf8');
const options=Array.from({length:12},(_,i)=>`<option value="m-${String(i+1).padStart(2,'0')}">${i+1}月</option>`).join('');
const panelHtml=component.split('<style>')[0].replace(/^.*\{Array\.from\(\{length:12\}.*$/m,options);
const originalManifest=JSON.parse(await readFile('public/assets/atlas/asia-seasonal-precipitation-v1/manifest.json','utf8'));
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const bounds=[100,10,100.5,10.5];
const mercator=latitude=>6378137*Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
const cube=Buffer.alloc(12*4*4);
for(let month=0;month<12;month++)for(let cell=0;cell<4;cell++)cube.writeFloatLE(cell===3||month===1&&cell===0?-1:cell===0?month*10:month*10+cell,4*(month*4+cell));
const zipped=gzipSync(cube);
function fixtureManifest(){
 const manifest=structuredClone(originalManifest);
 for(const [id,region] of Object.entries(manifest.regions)){
  Object.assign(region,{width:2,height:2,bounds4326:bounds,imageCoordinates:[[100,10.5],[100.5,10.5],[100.5,10],[100,10]],firstCellCenter:[100.125,10.375],lastCellCenter:[100.375,10.125],sourceColumnOffset:1120,sourceRowOffset:318,uncompressedBytes:cube.length,uncompressedSha256:sha(cube),valuesSha256:sha(zipped),display:{width:2,height:2,projection:'EPSG:3857',bounds3857:[100*Math.PI/180*6378137,mercator(10),100.5*Math.PI/180*6378137,mercator(10.5)],resampling:'nearest'}});
  manifest.files[region.values]={sha256:sha(zipped),bytes:zipped.length};
 }
 return manifest;
}
const context={countries:['CHN'],cities:[{id:'station',countryCode:'CHN'}],bounds,fields:['natural','agriculture'],topics:{natural:['climate','precipitation','seasonal-precipitation'],agriculture:['rice']},details:{natural:id=>/^m-(0[1-9]|1[0-2])$/.test(id)}};
const pause=()=>new Promise(resolve=>setTimeout(resolve,5));
async function until(check){for(let i=0;i<300;i++){if(check())return;await pause();}throw Error('Seasonal precipitation controller did not settle');}
class MockMap{
 constructor({waitImages=false}={}){this.sources=new Map;this.layers=new Map([['asia-context',{id:'asia-context'}],['asia-country-border',{id:'asia-country-border'}]]);this.listeners=new Map;this.waitImages=waitImages;}
 getSource(id){return this.sources.get(id);}
 getLayer(id){return this.layers.get(id);}
 addSource(id,source){this.sources.set(id,{...source,loaded:!this.waitImages});}
 addLayer(layer){this.layers.set(layer.id,{...layer,layout:{...layer.layout}});}
 setLayoutProperty(id,key,value){this.layers.get(id).layout[key]=value;}
 isSourceLoaded(id){return this.sources.get(id)?.loaded===true;}
 on(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set);this.listeners.get(type).add(callback);return this;}
 off(type,callback){this.listeners.get(type)?.delete(callback);return this;}
 emit(type,event){for(const callback of [...this.listeners.get(type)??[]])callback(event);}
 load(id){this.sources.get(id).loaded=true;this.emit('sourcedata',{sourceId:id});}
 fail(id){this.sources.get(id).loaded=true;this.emit('error',{sourceId:id,error:Error('Image unavailable')});}
 removeLayer(id){this.layers.delete(id);}
 removeSource(id){this.sources.delete(id);}
 visible(){return [...this.layers.values()].filter(layer=>layer.id.startsWith('asia-seasonal-')&&layer.layout.visibility==='visible');}
}
async function setup(query='?topic=seasonal-precipitation&detail=m-07&at=100.125,10.375',options={}){
 const w=new Window({url:`https://example.com/insight-journal/atlas/asia/east-asia/nature/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.happyDOM.setWindowSize({width:1180,height:757});w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;Object.defineProperty(w,'crypto',{value:webcrypto});
 w.document.body.innerHTML=`<main data-test-root><h1 data-map-title></h1><p data-map-period></p><p data-map-eyebrow></p><p data-grid-reading></p>${panelHtml}</main>`;
 const fetched=[],manifest=fixtureManifest();
 w.fetch=async value=>{const url=String(value);fetched.push(url);const custom=options.fetch?.(url,manifest);if(custom!==undefined)return custom;return url.endsWith('manifest.json')?new Response(JSON.stringify(manifest)):new Response(zipped);};
 w.eval(built.outputFiles[0].text);
 const api=w.SeasonalUnderTest,root=w.document.querySelector('[data-test-root]'),map=new MockMap(options),q=selector=>root.querySelector(selector);
 let state=api.readAsiaAtlasState(new URL(w.location.href),context),controller,ready=0;
 const navigate=next=>{state=controller.normalize(next);w.history.pushState(null,'',api.writeAsiaAtlasState(new URL(w.location.href),state));controller.render();void controller.show(map);};
 controller=api.createAsiaSeasonalPrecipitation(root,{regionId:'east-asia',seasonalBase:'/insight-journal/assets/atlas/asia-seasonal-precipitation-v1/'},()=>state,navigate,()=>state.camera,()=>{ready++;});
 state=controller.normalize(state);controller.render();
 if(options.show!==false)void controller.show(map);
 return {w,q,map,fetched,controller,api,context,get state(){return state;},get ready(){return ready;},setState:next=>{state=next;controller.render();},navigate,close:()=>{controller.hide();return w.happyDOM.close();}};
}

test('seasonal assets load only for the active topic; default July does not choose a station',async()=>{
 const inactive=await setup('?topic=climate&city=station');
 try{await pause();assert.equal(inactive.fetched.length,0);assert.equal(inactive.q('[data-seasonal-panel]').hidden,true);}finally{await inactive.close();}
 const active=await setup('?topic=seasonal-precipitation&city=station');
 try{await until(()=>active.map.visible().length===1);assert.equal(active.state.detail,'m-07');assert.equal(active.state.city,null);assert.equal(active.state.point,undefined);assert.equal(active.q('[data-seasonal-month]').value,'m-07');assert.match(active.q('[data-seasonal-value]').textContent,/地点を選ぶ/);assert.equal(active.fetched.length,2);assert.equal(active.q('[data-seasonal-scale]').children.length,8);assert.match(active.q('[data-seasonal-method]').textContent,/CC BY 4\.0/);assert.match(active.q('[data-seasonal-method]').textContent,/0\.25°/);}finally{await active.close();}
});

test('monthly controls update the image, chart, title and URL while retaining point, camera and comparison return',async()=>{
 const source='topic=rice&place=CHN&at=100.125%2C10.375';
 const page=await setup(`?topic=seasonal-precipitation&detail=m-07&place=CHN&at=100.125,10.375&lng=100.2&lat=10.2&z=5&year=2020&back=${encodeURIComponent(source)}`);
 try{
  await until(()=>page.map.visible().length===1);page.q('[data-seasonal-month]').value='m-01';page.q('[data-seasonal-month]').dispatchEvent(new page.w.Event('change'));
  await until(()=>page.map.visible()[0]?.id.endsWith('m-01'));
  const url=new URL(page.w.location.href);assert.equal(url.searchParams.get('detail'),'m-01');assert.equal(url.searchParams.get('at'),'100.12500,10.37500');assert.equal(url.searchParams.get('back'),source);assert.equal(url.searchParams.get('year'),'2020');assert.equal(url.searchParams.get('z'),'5.000');
  assert.ok(page.map.getSource(page.map.visible()[0].id).url.endsWith('east-asia-m-01.png'));assert.equal(page.map.visible()[0].paint['raster-resampling'],'nearest');assert.match(page.q('[data-map-title]').textContent,/1月/);assert.match(page.q('[data-map-period]').textContent,/mm\/月.*1991–2020/);
  assert.equal(page.q('[data-seasonal-table]').querySelectorAll('tr').length,12);assert.equal(page.q('[data-seasonal-table] [aria-current="true"] th').textContent,'1月');assert.equal(page.q('[data-seasonal-table] tr:first-child td').textContent,'0');assert.ok(page.q('[data-seasonal-zero="1"]'));assert.match(page.q('[data-seasonal-svg] desc').textContent,/1月 0 mm/);assert.match(page.q('[data-seasonal-svg] desc').textContent,/2月 データなし/);
  page.q('[data-seasonal-previous]').click();await until(()=>page.map.visible()[0]?.id.endsWith('m-12'));assert.equal(new URL(page.w.location.href).searchParams.get('detail'),'m-12');page.q('[data-seasonal-next]').click();await until(()=>page.map.visible()[0]?.id.endsWith('m-01'));
  const reloaded=await setup(new URL(page.w.location.href).search);try{await until(()=>reloaded.map.visible().length===1);assert.equal(reloaded.q('[data-seasonal-month]').value,'m-01');assert.equal(reloaded.state.back,source);}finally{await reloaded.close();}
 }finally{await page.close();}
});

test('zero is readable while an unrecorded cell stays missing, including HTTP-decompressed payloads',async()=>{
 const page=await setup('?topic=seasonal-precipitation&detail=m-01&at=100.125,10.375',{fetch:url=>url.endsWith('.values.bin.gz')?new Response(cube):undefined});
 try{await until(()=>page.q('[data-seasonal-value]').textContent.includes('0 mm/月'));assert.equal(page.q('[data-seasonal-retry]').hidden,true);page.navigate({...page.state,point:[100.375,10.125]});assert.match(page.q('[data-seasonal-value]').textContent,/データなし/);assert.equal(page.q('[data-seasonal-table] tr:first-child td').textContent,'データなし');assert.equal(page.q('[data-seasonal-svg]').querySelectorAll('[data-seasonal-missing]').length,12);assert.equal(page.q('[data-seasonal-svg]').querySelectorAll('[data-seasonal-bar]').length,0);}finally{await page.close();}
});

test('manifest and same-length cube corruption show retry and preserve the selected month and location',async()=>{
 for(const brokenAsset of ['manifest','cube']){
  let broken=true;const badCube=Buffer.from(cube);badCube.writeFloatLE(999,0);
  const page=await setup('?topic=seasonal-precipitation&detail=m-05&place=CHN&at=100.125,10.375',{fetch:(url,manifest)=>broken?(brokenAsset==='manifest'&&url.endsWith('manifest.json')?new Response(JSON.stringify({...manifest,period:'1981–2010'})):brokenAsset==='cube'&&url.endsWith('.values.bin.gz')?new Response(badCube):undefined):undefined});
  try{await until(()=>!page.q('[data-seasonal-retry]').hidden);assert.match(page.q('[data-seasonal-status]').textContent,/確認できません|読み込めません/);assert.equal(page.map.visible().length,0);const before=page.w.location.href;broken=false;page.q('[data-seasonal-retry]').click();await until(()=>page.map.visible()[0]?.id.endsWith('m-05'));assert.equal(page.w.location.href,before);assert.equal(page.state.place,'CHN');assert.equal(page.q('[data-seasonal-retry]').hidden,true);}finally{await page.close();}
 }
});

test('late manifest and cube responses cannot paint a different topic or continue inactive asset requests',async()=>{
 for(const delayed of ['manifest','cube']){
  let release;const pending=new Promise(resolve=>release=resolve);
  const page=await setup(undefined,{fetch:url=>url.endsWith(delayed==='manifest'?'manifest.json':'.values.bin.gz')?pending:undefined});
  try{
   await until(()=>page.fetched.some(url=>url.endsWith(delayed==='manifest'?'manifest.json':'.values.bin.gz')));page.setState({...page.state,topic:'climate',detail:null});page.q('[data-map-title]').textContent='気候区分';release(delayed==='manifest'?new Response(JSON.stringify(fixtureManifest())):new Response(zipped));await pause();await pause();assert.equal(page.ready,0);assert.equal(page.map.visible().length,0);assert.equal(page.q('[data-seasonal-panel]').hidden,true);assert.equal(page.q('[data-map-title]').textContent,'気候区分');if(delayed==='manifest')assert.equal(page.fetched.length,1);
  }finally{release(new Response(zipped));await page.close();}
 }
});

test('late monthly image remains hidden and a failed image can be retried',async()=>{
 const page=await setup(undefined,{waitImages:true});
 try{
  await until(()=>page.map.getSource('asia-seasonal-precipitation-m-07'));assert.equal(page.map.visible().length,0);page.q('[data-seasonal-next]').click();await until(()=>page.map.getSource('asia-seasonal-precipitation-m-08'));page.map.load('asia-seasonal-precipitation-m-07');await pause();assert.equal(page.map.visible().length,0);page.map.load('asia-seasonal-precipitation-m-08');await until(()=>page.map.visible()[0]?.id.endsWith('m-08'));
  page.q('[data-seasonal-next]').click();await until(()=>page.map.getSource('asia-seasonal-precipitation-m-09'));const failed=page.map.getSource('asia-seasonal-precipitation-m-09');page.map.fail('asia-seasonal-precipitation-m-09');await until(()=>!page.q('[data-seasonal-retry]').hidden);assert.equal(page.map.isSourceLoaded('asia-seasonal-precipitation-m-09'),true);assert.match(page.q('[data-seasonal-status]').textContent,/地図画像/);page.q('[data-seasonal-retry]').click();await until(()=>page.map.getSource('asia-seasonal-precipitation-m-09')!==failed);assert.equal(page.map.isSourceLoaded('asia-seasonal-precipitation-m-09'),false);page.map.load('asia-seasonal-precipitation-m-09');await until(()=>page.map.visible()[0]?.id.endsWith('m-09'));assert.equal(page.q('[data-seasonal-retry]').hidden,true);
  page.q('[data-seasonal-next]').click();await until(()=>page.map.getSource('asia-seasonal-precipitation-m-10'));const late=page.map.getSource('asia-seasonal-precipitation-m-10');page.setState({...page.state,topic:'climate'});page.map.fail('asia-seasonal-precipitation-m-10');assert.equal(page.map.visible().length,0);page.navigate({...page.state,topic:'seasonal-precipitation',detail:'m-10'});await until(()=>page.map.getSource('asia-seasonal-precipitation-m-10')!==late);assert.equal(page.map.isSourceLoaded('asia-seasonal-precipitation-m-10'),false);assert.equal(page.map.visible().length,0);page.map.load('asia-seasonal-precipitation-m-10');await until(()=>page.map.visible()[0]?.id.endsWith('m-10'));
 }finally{await page.close();}
});
