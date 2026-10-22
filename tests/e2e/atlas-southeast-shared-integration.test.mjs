import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

// Exercise the production controllers against rendered pages. WebGL is outside
// this test: none of these legend, hint or history transitions requires a map.
const {outputFiles}=await build({
 stdin:{contents:`
  export {createAsiaIndustry} from './src/scripts/atlas-asia-industry.ts';
  export {createAsiaComparison} from './src/scripts/atlas-asia-comparison.ts';
  export {createSoutheastIndustryLocations} from './src/scripts/atlas-asia-southeast-industry.ts';
  export {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison} from './src/lib/atlas-asia-state.ts';
 `,resolveDir:process.cwd(),loader:'ts'},
 bundle:true,write:false,format:'iife',globalName:'SEAIntegration',platform:'browser',
 define:{'import.meta.env.BASE_URL':'"/insight-journal/"'},
 plugins:[{name:'no-webgl',setup(builder){
  builder.onResolve({filter:/^maplibre-gl$/},()=>({path:'maplibre-gl',namespace:'no-webgl'}));
  builder.onLoad({filter:/.*/,namespace:'no-webgl'},()=>({contents:'export class Marker { constructor(){ throw new Error("This test must not create a map marker"); } }'}));
 }}],
});
const origin='http://localhost/insight-journal/atlas/asia/southeast-asia/';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const noRice=/米の収穫面積|格子内の米|米の概略栽培域/;
async function traverse(page,direction){
 const restored=new Promise(resolve=>page.window.addEventListener('popstate',resolve,{once:true}));
 page.window.history[direction]();await restored;await tick();
}

async function fixture(route='industry/',fetcher){
 const url=new URL(route,origin);
 const field=url.pathname.split('/').filter(Boolean).at(-1);
 const html=await readFile(new URL(`../../dist/atlas/asia/southeast-asia/${field}/index.html`,import.meta.url),'utf8');
 const window=new Window({url:url.href,settings:{
  enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,
  suppressInsecureJavaScriptEnvironmentWarning:true,
 }});
 window.fetch=fetcher??(async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({type:'FeatureCollection',features:[]})).buffer}));
 window.document.write(html);
 const root=window.document.querySelector('[data-asia-atlas]');
 const config=JSON.parse(root.querySelector('[data-asia-config]').textContent);
 const api=window.eval(outputFiles[0].text+'\nSEAIntegration;');
 const context={countries:config.countries.map(country=>country.code),cities:config.cities,
  bounds:config.dataBounds??config.bounds,fields:['natural','agriculture','industry','population'],
  topics:{natural:['climate','terrain'],agriculture:['overview','rice'],industry:config.industry.topics.map(topic=>topic.id),population:['density','urban']},
 };
 let state=api.readAsiaAtlasState(new window.URL(window.location.href),context);
 const getState=()=>state;
 const initialHint=root.querySelector('[data-grid-reading]').textContent;
 const industry=api.createAsiaIndustry(root,config,getState,navigate,()=>null,()=>{});
 const comparison=api.createAsiaComparison(root,config,context,getState);
 const locations=api.createSoutheastIndustryLocations(root,getState);
 function render(){industry.render();locations.show(null);comparison.render(state);}
 function navigate(next){
  state=industry.normalize(next);
  const nextURL=api.writeAsiaAtlasState(new window.URL(window.location.href),state);
  window.history.pushState({},'',nextURL.href);
  render();
 }
 function restore(){state=industry.normalize(api.readAsiaAtlasState(new window.URL(window.location.href),context));render();}
 window.addEventListener('popstate',restore);
 state=industry.normalize(state);render();
 return {window,root,api,config,initialHint,comparison,getState,navigate,render,
  q:selector=>root.querySelector(selector),
  close:()=>window.happyDOM.close(),
 };
}

function assertRegionalIndustry(page){
 assert.equal(page.root.dataset.southeastIndustryActive,'true');
 assert.equal(page.q('[data-southeast-industry-controls]').hidden,false);
 assert.match(page.q('[data-grid-reading]').textContent,/産業.*立地.*工程/);
 assert.doesNotMatch(page.q('[data-grid-reading]').textContent,noRice);
 const common=page.q('[data-reading-map-legend]');
 assert.equal(common.hidden,true,'the shared GDP legend must not accompany regional industry locations');
 assert.equal(common.textContent,'','stale or late shared legend content is cleared');
 assert.match(page.q('[data-southeast-industry-legend]').textContent,/記号の大きさは数量を表しません/);
 assert.doesNotMatch(page.q('[data-southeast-industry-legend]').textContent,/GDP|付加価値|収穫面積/);
}

test('direct industry URL and a fresh reload show industry hints with only the regional legend',async()=>{
 const route='industry/?industrySector=manufacturing&industryKind=rice&industrySite=thotnot-rice';
 const page=await fixture(route);
 try{
  assert.match(page.initialHint,/産業/,'the server-rendered hint must be correct before hydration');
  assert.doesNotMatch(page.initialHint,noRice);
  assertRegionalIndustry(page);
  assert.equal(page.q('[data-southeast-industry-selected]').hidden,false);
  const reloaded=await fixture(page.window.location.href);
  try{assertRegionalIndustry(reloaded);assert.equal(reloaded.q('[data-southeast-local-evidence="thotnot-rice"]').hidden,false);}
  finally{await reloaded.close();}
 }finally{await page.close();}
});

test('rice to industry and browser back/forward replace stale hints and restore the correct legend',async()=>{
 const page=await fixture('agriculture/?topic=rice');
 try{
  await tick();
  assert.equal(page.q('[data-reading-map-legend]').hidden,false,'rice keeps its shared legend');
  assert.match(page.q('[data-reading-map-legend]').textContent,/米|作物/);
  // A grid selection is a valid previous owner of this shared live region.
  page.q('[data-grid-reading]').textContent='格子内の米の収穫面積：1,200 ha';
  page.navigate({...page.getState(),field:'industry',topic:'manufacturing',place:null,back:null,point:null});
  assertRegionalIndustry(page);
  const industryURL=page.window.location.href;
  await traverse(page,'back');
  assert.equal(page.getState().field,'agriculture');
  assert.equal(page.q('[data-southeast-industry-controls]').hidden,true);
  assert.equal(page.q('[data-reading-map-legend]').hidden,false);
  assert.match(page.q('[data-reading-map-legend]').textContent,/米|作物/);
  page.q('[data-grid-reading]').textContent='米の概略栽培域（緑）・主な川（青）';
  await traverse(page,'forward');
  assert.equal(page.window.location.href,industryURL);
  assertRegionalIndustry(page);
 }finally{await page.close();}
});

test('a pending agricultural legend cannot reappear after entering regional industry',async()=>{
 let release;
 const payload=new TextEncoder().encode(JSON.stringify({type:'FeatureCollection',features:[]})).buffer;
 const page=await fixture('agriculture/?topic=rice',async()=>{
  await new Promise(resolve=>{release=resolve;});
  return {ok:true,arrayBuffer:async()=>payload};
 });
 try{
  assert.equal(typeof release,'function','the production rice legend request is pending');
  assert.match(page.q('[data-reading-map-legend]').textContent,/読み込んでいます/);
  page.navigate({...page.getState(),field:'industry',topic:'manufacturing',place:null,back:null});
  release();await tick();await tick();
  assertRegionalIndustry(page);
 }finally{await page.close();}
});

test('comparing regional industry with climate never describes the original as GDP or census circles',async()=>{
 const page=await fixture();
 try{
  const compared=page.api.startAsiaComparison(new page.window.URL(page.window.location.href),page.getState(),'natural');
  page.navigate({...compared,topic:'climate'});
  await tick();await tick();
  assert.equal(page.q('[data-comparison-reading]').hidden,false);
  const summary=page.q('[data-comparison-summary]').textContent;
  const legend=page.q('[data-comparison-legend]').textContent;
  assert.match(summary,/産業|立地/);
  assert.doesNotMatch(summary,/GDP|製造業付加価値/);
  assert.match(legend,/産業立地|立地事例/);
  assert.doesNotMatch(legend,/元の国勢調査円|GDP比/);
 }finally{await page.close();}
});

test('the regional exception does not suppress country industry or trade legends',async()=>{
 const page=await fixture();
 try{
  for(const next of [{field:'industry',place:'THA',topic:'manufacturing'},{field:'industry',place:null,topic:'trade-exports'}]){
   // Only test comparison ownership here; national data loading is a separate contract.
   page.comparison.render({...page.getState(),...next,back:null});
   assert.equal(page.q('[data-reading-map-legend]').hidden,false);
   page.comparison.render({...page.getState(),field:'industry',place:null,topic:'manufacturing',back:null});
   assert.equal(page.q('[data-reading-map-legend]').hidden,true);
  }
  await tick();
  assert.equal(page.q('[data-reading-map-legend]').textContent,'');
 }finally{await page.close();}
});
