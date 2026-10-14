import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {adoptedIndustries,adoptedGroups} from '../../src/lib/atlas-mexico-industry-adopted.ts';

const folder='atlas/north-america/mexico/industry';
const localModules={name:'mexico-adopted-local',setup(b){b.onResolve({filter:/^\./},args=>{const resolved=path.resolve(args.resolveDir,args.path);return {path:resolved+(path.extname(resolved)?'':'.ts')};});b.onLoad({filter:/\.ts$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}));}};
const compiled=await build({stdin:{contents:"import {initMexicoIndustryAdopted} from './src/scripts/atlas-mexico-industry-adopted.ts';initMexicoIndustryAdopted(document.querySelector('[data-ma-atlas]'));",resolveDir:process.cwd(),sourcefile:'mexico-adopted-e2e.ts',loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},plugins:[localModules],bundle:true,format:'iife',platform:'browser',write:false});
async function page(search='',width=1280){
 const w=new Window({url:`https://example.com/insight-journal/${folder}/${search}`,width,height:900,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile(`dist/${folder}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 const q=s=>w.document.querySelector(s),frame=q('[data-ma-frame]'),svg=q('[data-ma-map]');
 const screenWidth=width<=600?358:750,screenHeight=screenWidth*580/900;
 frame.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:screenWidth,bottom:screenHeight,width:screenWidth,height:screenHeight});
 // A deterministic screen transform tests the interaction/layout contract.
 // It is not a substitute for real-browser CSS and screenshot verification.
 svg.getScreenCTM=()=>{const[x,y,vw,vh]=svg.getAttribute('viewBox').split(' ').map(Number),a=screenWidth/vw,d=screenHeight/vh;return{a,d,b:0,c:0,e:-x*a,f:-y*d};};
 w.eval(compiled.outputFiles[0].text);return w;
}
const slots=d=>[...d.querySelectorAll('.ma-map-label')].map(n=>({id:n.dataset.maGroup,left:n.style.left,top:n.style.top}));
const click=(d,s)=>d.querySelector(s).click();

test('Every adopted industry renders its own map, definition, supply-chain reading and statistics without moving peer label slots',async()=>{
 const w=await page();try{
  const d=w.document,q=s=>d.querySelector(s),root=q('[data-ma-atlas]');
  assert.equal(root.dataset.maReady,'true');assert.equal(q('.ma-reading').querySelectorAll('.ma-indicator').length,0);
  assert.ok(q('[data-ma-overview-copy]').textContent.includes('原油'));
  assert.ok(q('[data-ma-map]').compareDocumentPosition(q('#ma-statistics'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
  for(const sector of ['resources','manufacturing','services']){
   click(d,`[role=tab][data-ma-sector="${sector}"]`);const baseline=slots(d),camera=q('[data-ma-map]').getAttribute('viewBox');
   assert.equal(baseline.length,adoptedGroups(sector).length);assert.equal(root.dataset.maLabelsComplete,'true');
   for(const item of adoptedIndustries.filter(i=>i.sectors.includes(sector))){
    click(d,`[data-ma-industry="${item.id}"][data-ma-owner="${sector}"]`);
    assert.equal(root.dataset.maIndustry,item.id);assert.equal(q('[data-ma-title]').textContent,item.label);assert.equal(q('[data-ma-process]').textContent,item.process);assert.equal(q('[data-ma-boundary]').textContent,item.boundary);
    assert.equal(q('[data-ma-map]').getAttribute('viewBox'),camera);assert.deepEqual(slots(d),baseline,`${sector}:${item.id}`);
    assert.equal(q('[data-ma-map-definition]').textContent.startsWith(item.map.definition),true);
    assert.equal(q('[data-ma-map-sources]').querySelectorAll('a').length,item.map.sourceIds.length);
    for(const section of ['domestic','world','trade'])assert.equal(q(`[data-ma-indicators="${section}"]`).querySelectorAll('dl').length,item.statistics[section].length);
    assert.equal(d.querySelectorAll('[data-ma-table-state]').length,32);
    for(const cell of item.map.values){const shape=q(`[data-ma-state="${cell.state}"]`);assert.equal(shape.dataset.maStatus,cell.status);if(cell.value===null)assert.equal(shape.getAttribute('fill'),`url(#ma-${cell.status})`);}
   }
  }
 }finally{await w.happyDOM.close();}
});

test('Selection-only display, region selection, zoom, reload and history retain the current industry and manual camera',async()=>{
 const w=await page('?sector=manufacturing&subsector=food&fallback=1');let reload;try{
  const d=w.document,q=s=>d.querySelector(s),baseline=slots(d),camera=q('[data-ma-map]').getAttribute('viewBox');
  const only=q('[data-ma-only]');only.checked=true;only.dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.ma-map-label:not([hidden])').length,1);assert.deepEqual(slots(d),baseline);assert.equal(q('[data-ma-map]').getAttribute('viewBox'),camera);
  q('[data-ma-state="14"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(new URL(w.location).searchParams.get('state'),'14');assert.equal(q('[data-ma-place-reading]').hidden,false);assert.match(q('[data-ma-state-value]').textContent,/ハリスコ/);
  click(d,'[data-ma-camera="in"]');const zoomed=q('[data-ma-map]').getAttribute('viewBox');assert.notEqual(zoomed,camera);
  click(d,'[data-ma-industry="beer"][data-ma-owner="manufacturing"]');assert.equal(q('[data-ma-map]').getAttribute('viewBox'),zoomed);assert.equal(new URL(w.location).searchParams.get('fallback'),'1');
  reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-ma-map]').getAttribute('viewBox'),zoomed);assert.equal(reload.document.querySelector('[data-ma-atlas]').dataset.maIndustry,'beer');
  w.history.back();await w.happyDOM.waitUntilComplete();assert.equal(q('[data-ma-atlas]').dataset.maIndustry,'food');assert.equal(q('[data-ma-map]').getAttribute('viewBox'),zoomed);
  w.history.forward();await w.happyDOM.waitUntilComplete();assert.equal(q('[data-ma-atlas]').dataset.maIndustry,'beer');
  click(d,'[data-ma-clear]');assert.equal(q('[data-ma-atlas]').dataset.maIndustry,'all');assert.equal(q('[data-ma-map]').getAttribute('viewBox'),zoomed);
 }finally{await w.happyDOM.close();await reload?.happyDOM.close();}
});

test('Tab keyboard navigation, overlapping production stages and map labels select industries rather than cities',async()=>{
 const w=await page('?sector=resources&subsector=refining');try{
  const d=w.document,q=s=>d.querySelector(s),camera=q('[data-ma-map]').getAttribute('viewBox');
  click(d,'[data-ma-overlap]');assert.equal(q('[data-ma-atlas]').dataset.maSector,'manufacturing');assert.equal(q('[data-ma-atlas]').dataset.maIndustry,'refining');assert.equal(q('[data-ma-map]').getAttribute('viewBox'),camera);
  q('[role=tab][data-ma-sector="manufacturing"]').focus();q('[role=tab][data-ma-sector="manufacturing"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(q('[data-ma-atlas]').dataset.maSector,'services');assert.equal(d.activeElement.dataset.maSector,'services');
  click(d,'[data-ma-group="digital"]');assert.equal(q('[data-ma-atlas]').dataset.maIndustry,'digital');assert.match(q('[data-ma-map-caption]').textContent,/2023年・人/);
  const markers=[...d.querySelectorAll('[data-ma-marker]')];assert.ok(markers.at(-1).dataset.maMarker.startsWith('digital:'));
  const selectedMarker=q('[data-ma-marker^="digital:"]');selectedMarker.focus();const markerId=selectedMarker.dataset.maMarker;selectedMarker.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(d.activeElement.dataset.maMarker,markerId);assert.equal(new URL(w.location).searchParams.get('state'),markerId.split(':')[1]);
  q('[data-ma-atlas]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(q('[data-ma-atlas]').dataset.maIndustry,'all');
 }finally{await w.happyDOM.close();}
});

test('Portrait screen-transform contract allocates every industry group without overlap or selection drift',async()=>{
 const w=await page('',390);try{
  const d=w.document;for(const sector of ['resources','manufacturing','services']){
   click(d,`[role=tab][data-ma-sector="${sector}"]`);assert.equal(d.querySelector('[data-ma-atlas]').dataset.maLabelsComplete,'true');const boxes=slots(d);assert.equal(boxes.length,adoptedGroups(sector).length);
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j],ax=parseFloat(a.left),ay=parseFloat(a.top),bx=parseFloat(b.left),by=parseFloat(b.top);assert.ok(ax+94<=bx||bx+94<=ax||ay+39<=by||by+39<=ay);}
   click(d,`[data-ma-industry="${adoptedGroups(sector)[0].industries[0].id}"][data-ma-owner="${sector}"]`);assert.deepEqual(slots(d),boxes);
  }
 }finally{await w.happyDOM.close();}
});
