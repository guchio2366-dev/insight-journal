import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {resolve} from 'node:path';
import {asiaPlaceReadings,choosePlaceReading,startPlaceComparison} from '../../src/data/atlas/asia-place-readings.ts';
import {writeAsiaAtlasState,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';
const manifest=JSON.parse(readFileSync('public/assets/atlas/asia-seasonal-precipitation-v1/manifest.json','utf8'));
const farming=JSON.parse(readFileSync('public/assets/atlas/asia-farming-v1/manifest.json','utf8'));
const built=await build({entryPoints:[resolve('src/scripts/atlas-asia-comparison.ts')],bundle:true,format:'iife',globalName:'Comparison',platform:'browser',write:false,logLevel:'silent'});
const source=choosePlaceReading({field:'agriculture',place:null,city:null,back:null,camera:null},asiaPlaceReadings.find(s=>s.id==='north-china-wheat'));
const bridge=asiaPlaceReadings.find(s=>s.id===source.story).bridges.find(b=>b.topic==='seasonal-precipitation');
const originalUrl=new URL('https://example.org/atlas/asia/east-asia/agriculture/');
const context={countries:['CHN'],cities:[],bounds:[72,17,147,55],fields:['natural','agriculture'],topics:{natural:['seasonal-precipitation'],agriculture:['wheat']},details:{natural:['m-04','m-07']},stories:{agriculture:[source.story]}};
const response=data=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(data)).buffer});
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};

test('月の切替でも元の作物・地点・両凡例・事例の問いと対象名付き復帰を保つ',async()=>{
 const state=startPlaceComparison(originalUrl,source,bridge),window=new Window({url:writeAsiaAtlasState(originalUrl,state).href});
 try{
  window.document.body.innerHTML='<main><section data-comparison-reading><h3 data-comparison-title></h3><p data-comparison-summary></p><div data-comparison-compact></div></section><details data-comparison-method><div data-comparison-legend></div></details><button data-comparison-back></button></main>';
  window.fetch=async url=>{assert.equal(url,'/seasonal/manifest.json');return response(manifest);};
  window.eval(built.outputFiles[0].text+';window.createComparison=Comparison.createAsiaComparison;');
  const root=window.document.querySelector('main'),config={regionId:'east-asia',label:'東アジア',countries:[{code:'CHN',name:'中国'}],cities:[],classes:[],climate:{classIds:[]},climateBase:'/climate/',agricultureBase:'/rice/',geographyUrl:'/geography.json',farming:farming.regions['east-asia'],farmingBase:'/farm/',seasonalBase:'/seasonal/'};
  const controller=window.createComparison(root,config,context,()=>state),saved=state.back;
  for(const id of ['m-04','m-07']){
   state.detail=id;controller.render(state);await settle();
   const current=root.querySelector('[data-comparison-compact-role="current"]');assert.ok(current);
   assert.ok(current.textContent.includes(`${Number(id.slice(2))}月の降水量`));
   assert.equal(current.querySelectorAll('.asia-comparison-key>span').length,9);
   assert.deepEqual([...current.querySelectorAll('.asia-comparison-key>span')].map(n=>n.textContent),['0–<10','10–<25','25–<50','50–<100','100–<150','150–<200','200–<300','≥300','海・対象外・欠測 ≠ 0']);
   assert.match(current.querySelector('.asia-comparison-key>span').getAttribute('aria-label'),/10未満/,'短い表示でも区間の正式名称を読み上げる');
   assert.match(current.textContent,/GPCC 1991–2020年.*mm\/月/);
   assert.match(root.querySelector('[data-comparison-compact-role="original"]').textContent,/2020年.*ha/);
   assert.ok(root.querySelector('[data-comparison-summary]').textContent.startsWith(asiaPlaceReadings.find(s=>s.id===source.story).lead));
   assert.match(root.querySelector('[data-comparison-back]').textContent,/華北平原/);
   assert.equal(state.back,saved);const returned=restoreAsiaComparison(originalUrl,state,context);assert.deepEqual({...returned,detail:returned.detail??null},source);
  }
  state.point=[116,38];controller.render(state);
  assert.ok(!root.querySelector('[data-comparison-summary]').textContent.includes(bridge.question),'元の事例と地点が異なると専用説明を持ち越さない');
 }finally{await window.happyDOM.close();}
});
