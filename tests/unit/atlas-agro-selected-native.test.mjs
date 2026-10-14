import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const native=await build({entryPoints:['src/scripts/atlas-asia-farming-panel.ts'],bundle:true,write:false,format:'iife',globalName:'farmTest'});
// Reference source hashes recorded from published main 5b62dea (PR 350).
const sha256=text=>createHash('sha256').update(text).digest('hex');
test('unselected overview renderer remains exactly the published PR 350 implementation',()=>{
 const retained=readFileSync('src/lib/atlas-agro-statistics-overview.ts','utf8').replace(/^\/\*\*[\s\S]*?\*\/\n/,'').replace('export function renderAgroOverviewColumns(', 'export function renderAgroColumns(');
 assert.equal(sha256(retained),'2f3cc797a573c678cf710334bde7f14dda5aecce242767c5b2f4c6608def5377');
 for(const [path,expected] of [
  ['src/components/atlas/AsiaAtlasPage.astro','5a68ea0822cb9ef80b4225ae97841bba1944cc8608a07fac9c12b9ad65c2f667'],
  ['src/components/atlas/EuropeVerifiedStatistics.astro','6c0e50bc54884c8793f60bb0962fcffa29c5d540b189ff8f5b7c8ec1214bb8fb'],
  ['src/scripts/atlas-africa.ts','68d6af78d32b5dbe8cc9579c2cf67fd6452efada37db36c5df3e3bda027c3a51']
 ]){
  const source=readFileSync(path,'utf8');
  // Africa's selected copper theme now resolves the split product; the rest of the overview stays byte-for-byte.
  const retained=path==='src/scripts/atlas-africa.ts'?source.replace("id==='copperbelt-connections'?'copper':", "id==='copperbelt-connections'?'copper-cobalt':"):source;
  assert.equal(sha256(retained),expected,`${path}: unselected regional views are unchanged`);
 }
});
for(const region of ['south-central-asia','southeast-asia'])test(`${region}: explicit product order is reversed when returning to the published overview`,async()=>{
 const w=new Window({settings:{enableJavaScriptEvaluation:true}});
 try{
  w.document.body.innerHTML='<main><section data-south-central-farm-connections><h2>農業の供給と世界での位置</h2><div class="asia-farm-connections-grid"><section><h3 data-south-central-supply-title>供給元と行先</h3><div data-south-central-supply></div></section><section><h3 data-south-central-destinations-title>主な輸出先</h3><div data-south-central-destinations></div></section><section><h3>世界での位置</h3><div data-south-central-world-share></div></section></div></section></main>';
  w.eval(native.outputFiles[0].text+'\nwindow.farmTest=farmTest;');
  const root=w.document.querySelector('main'),country=region==='south-central-asia'?{code:'IND',name:'インド'}:{code:'IDN',name:'インドネシア'};
  const render=topic=>w.farmTest.renderSouthCentralFarmConnections(root,region,true,topic,country);
  render('overview');const original=root.innerHTML;
  assert.equal(root.querySelectorAll('[data-regional-flow-stage]').length,0);
  render('rice');
  assert.deepEqual([...root.querySelectorAll('.asia-farm-connections-grid>section')].map(s=>s.dataset.regionalFlowStage),['production','use','destinations']);
  assert.match(root.querySelector('h2').textContent,/選択品目/);
  assert.ok(root.querySelector('[data-selected-flow-note]'));
  if(region==='south-central-asia')assert.equal(root.querySelectorAll('.sc-flow-destinations li small').length,11,'selected basmati partners retain absolute quantity and share');
  render('overview');assert.equal(root.innerHTML,original,'returning to overview restores order, captions, quantities and absence of selected-only notes');
 }finally{await w.happyDOM.abort();}
});

const controller=await build({entryPoints:['src/scripts/atlas-agro-statistics.ts'],bundle:true,platform:'node',write:false,format:'esm'});
test('country overview aliases keep the published columns through a selected-product round trip',async()=>{
 const w=new Window(),previousDocument=globalThis.document,previousFetch=globalThis.fetch;
 const row={year:2024,value:100,rawValue:'100',flag:'A',worldValue:1000,worldRawValue:'1000',worldFlag:'A',share:10};
 const product={id:'rice-production',label:'fixture rice',domain:'QCL',item:'27',element:'5510',unit:'t',definition:'Test quantity, never published.',sourceUrl:'https://example.test/source',rows:[row]};
 const data={countries:{IDN:{name:'インドネシア',series:[product]}},sources:[],method:'Test fixture.'};
 const config={sources:{overview:'<a href="/fixture/statistics.json">Published FAOSTAT reference</a>',selected:'Selected sources are recorded on each quantity figure; FAOSTAT is supplementary.'},scope:'東南アジア',country:'',topic:'rice',topics:['rice'],countries:[{code:'IDN',name:'インドネシア'}],nationalOnly:true,url:'/fixture/',files:{'rice-production':{file:'rice.json'}},labels:{'rice-production':'fixture rice'}};
 const root=w.document.createElement('main');root.innerHTML='<section data-agro-statistics><script type="application/json" data-agro-config></script><h2 data-agro-heading></h2><p data-agro-status></p><label data-agro-country-control><select data-agro-country-select><option value="IDN">インドネシア</option></select></label><label data-agro-series-control><select data-agro-series-select></select></label><button data-agro-retry hidden></button><div data-agro-content></div><p data-agro-sources></p></section>';
 root.querySelector('[data-agro-config]').textContent=JSON.stringify(config);
 const nativeReferences=w.document.createElement('aside');nativeReferences.dataset.nativeFixture='';nativeReferences.innerHTML='<p>before</p><section data-south-central-farm-connections><button>existing listener</button></section><p>between</p><section data-west-farm-supply>Regional FBS</section><section data-export-reading>ABARES different period</section><section data-oceania-livestock-production>Existing country production</section><section data-eu-verified-agriculture><select><option>Existing year control</option></select></section><section data-east-farm-foundations>Existing active table</section><p>after</p>';root.append(nativeReferences);
 const originalReferences=nativeReferences.innerHTML,existingButton=nativeReferences.querySelector('button');let clicks=0;existingButton.addEventListener('click',()=>clicks++);
 const content=root.querySelector('[data-agro-content]'),status=root.querySelector('[data-agro-status]');
 const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}assert.fail('selected overview controller did not settle');};
 try{
  globalThis.document=w.document;globalThis.fetch=async()=>new Response(JSON.stringify(data));
  const api=await import('data:text/javascript;base64,'+Buffer.from(controller.outputFiles[0].text).toString('base64'));
  const sync=topic=>api.syncAgroStatistics(root,{country:'IDN',topic,active:true});
  sync('overview');await wait(()=>content.querySelector('[data-agro-series]'));
  const publishedMarkup=content.innerHTML,publishedStatus=status.textContent,publishedSources=root.querySelector('[data-agro-sources]').innerHTML;
  assert.deepEqual([...content.querySelectorAll('.agro-columns>section>h3')].map(h=>h.textContent),['供給と仕向け','輸出先・輸入元','世界生産・シェア推移']);
  assert.equal(content.querySelectorAll('[data-agro-stage]').length,0);
  sync('rice');await wait(()=>content.querySelector('[data-agro-stage="production"]'));
  assert.deepEqual([...content.querySelectorAll('.agro-columns>section')].map(h=>h.dataset.agroStage),['production','use','destinations']);
  assert.equal(root.querySelector('[data-agro-sources]').textContent,config.sources.selected);
  assert.equal(nativeReferences.querySelectorAll('.agro-existing-regional-reference').length,4);
  assert.equal(nativeReferences.querySelectorAll('.agro-existing-regional-reference[open]').length,0);
  assert.equal(nativeReferences.querySelector('[data-eu-verified-agriculture]').parentElement,nativeReferences);
  assert.equal(nativeReferences.querySelector('[data-east-farm-foundations]').parentElement,nativeReferences);
  existingButton.click();assert.equal(clicks,1,'wrapping keeps original listeners');
  for(const topic of ['overview','all','farming-overview','farming-all','crops']){
   sync(topic);await wait(()=>content.querySelector('[data-agro-series]')&&!content.querySelector('[data-agro-stage]'));
   assert.equal(content.innerHTML,publishedMarkup,topic);assert.equal(status.textContent,publishedStatus,topic);assert.equal(root.querySelector('[data-agro-sources]').innerHTML,publishedSources,topic);assert.equal(nativeReferences.innerHTML,originalReferences,topic);
  }
  for(const selection of [{country:'',topic:'rice',active:true},{country:'JPN',topic:'rice',active:true},{country:'IDN',topic:'rice',active:false}]){
   sync('rice');await wait(()=>content.querySelector('[data-agro-stage="production"]'));
   api.syncAgroStatistics(root,selection);
   assert.equal(nativeReferences.innerHTML,originalReferences,'country deselection, Japan and field changes restore original DOM placement');
  }
  existingButton.click();assert.equal(clicks,2,'restoring keeps the same original listener');
 }finally{globalThis.document=previousDocument;globalThis.fetch=previousFetch;await w.happyDOM.abort();}
});
