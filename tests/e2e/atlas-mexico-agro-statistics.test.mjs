import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const source=readFileSync('dist/atlas/north-america/mexico/agriculture/index.html','utf8');
const bundled=await build({entryPoints:['src/scripts/atlas-mexico-agriculture-atlas.ts'],bundle:true,write:false,format:'iife',globalName:'MexicoAtlas'});
async function page(){
 const w=new Window({url:'https://example.test/insight-journal/atlas/north-america/mexico/agriculture/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write(source.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 const root=w.document.querySelector('[data-mexico-agriculture-atlas]');
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.matchMedia=()=>({matches:true});
 const frame=root.querySelector('[data-map-frame]');
 Object.defineProperties(frame,{clientWidth:{value:700},clientHeight:{value:451}});
 frame.getBoundingClientRect=()=>({left:0,top:0,width:700,height:451,right:700,bottom:451});
 w.eval(bundled.outputFiles[0].text+';MexicoAtlas.initMexicoAgricultureAtlas(document.querySelector("[data-mexico-agriculture-atlas]"));');
 await w.happyDOM.waitUntilComplete();return {w,root,q:s=>root.querySelector(s)};
}

test('new Mexican balances keep the same three columns, units, public source and selected-only visibility',async()=>{
 const c=await page();try{
  assert.equal(c.q('[data-mexico-agriculture-statistics]').hidden,true);
  for(const [id,quantity,unit] of [['cotton','1','百万480ポンド俵'],['rice','0.17','百万t'],['wheat','2,648','千t'],['sorghum','4,200','千t']]){
   const control=id==='rice'?c.q('[data-mexico-agriculture-item="rice"]'):c.q(`[data-crop-select="${id}"]`);
   control.click();await c.w.happyDOM.waitUntilComplete();
   assert.equal(c.root.dataset.agricultureCurrentItem,id);
   const panel=c.q(`[data-mexico-stat-panel="${id}"]`),columns=panel.querySelector('[data-mexico-agriculture-three-columns]');
   assert.equal(panel.hidden,false);assert.equal(c.q('[data-mexico-agriculture-statistics]').hidden,false);
   assert.deepEqual([...columns.children].map(n=>n.dataset.agroStage),['production','use','destinations']);
   assert.ok(columns.children[0].textContent.includes(`国内生産：${quantity} ${unit}`));
   assert.match(columns.children[1].textContent,/供給元.*国内生産.*輸入.*期首在庫/s);
   assert.equal(columns.children[1].querySelectorAll('.agro-band').length,2);
   assert.match(columns.children[2].querySelector('[data-agro-partner-gap]').textContent,/同じ販売年度/);
   assert.ok(!columns.children[2].querySelector('[data-agro-partner-gap]').textContent.includes('子実とうもろこし'));
   assert.equal(columns.children[0].querySelector('.agro-other-reference').open,false);
   const href=columns.children[0].querySelector('a').getAttribute('href');assert.match(href,/usda\.gov/);
   if(['wheat','sorghum'].includes(id))assert.equal(columns.children[0].querySelector('.agro-world-pie'),null);
   else assert.ok(columns.children[0].querySelector('.agro-world-pie'));
  }
 }finally{await c.w.happyDOM.close();}
});

test('trade references open under their own calendar-year and product label; overview and map remain stable',async()=>{
 const c=await page();try{
  const composition=c.q('[data-mexico-agriculture-overview-statistics]').innerHTML;
  const map=c.q('[data-agriculture-map]'),initialViewBox=map.getAttribute('viewBox');
  for(const [id,hs] of [['corn','100590'],['coffee','090111'],['cotton','520100'],['pine','440710']]){
   (id==='pine'?c.q('[data-forestry-select]'):c.q(`[data-crop-select="${id}"]`)).click();
   await c.w.happyDOM.waitUntilComplete();
   const columns=c.q(`[data-mexico-agriculture-three-columns="${id}"]`),ref=columns.querySelector(`[data-mexico-trade-reference="${hs}"]`);
   assert.ok(columns.children[2].contains(ref));assert.equal(ref.open,false);
   ref.querySelector('summary').click();assert.equal(ref.open,true);
   assert.match(ref.textContent,/2024暦年/);assert.match(ref.textContent,/①の生産量や②.*振り分けには使いません/s);
   assert.equal(c.root.dataset.agricultureCurrentItem,id);assert.equal(map.getAttribute('viewBox'),initialViewBox);
   if(id==='pine'){
    assert.ok(c.q('[data-mexico-stat-panel="pine"] .mexico-pine-flow'));
    assert.match(columns.querySelector('[data-mexico-forest-product-definitions]').textContent,/丸太 · m³.*製材 · m³.*木材パルプ · t/s);
    assert.match(columns.children[1].querySelector('a').getAttribute('href'),/#data\/FO$/);
   }
   c.q('[data-agri-overview-button]').click();await c.w.happyDOM.waitUntilComplete();
   assert.equal(c.q('[data-mexico-agriculture-statistics]').hidden,true);
   assert.equal(c.q('[data-mexico-agriculture-overview-statistics]').hidden,false);
   assert.equal(c.q('[data-mexico-agriculture-overview-statistics]').innerHTML,composition);
   assert.equal(map.getAttribute('viewBox'),initialViewBox);
  }
 }finally{await c.w.happyDOM.close();}
});
