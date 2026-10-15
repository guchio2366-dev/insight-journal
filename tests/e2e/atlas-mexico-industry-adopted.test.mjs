import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {adoptedIndustries} from '../../src/lib/atlas-mexico-industry-adopted.ts';
import {mexicoSectorClusters,mexicoSectorPoints} from '../../src/lib/atlas-mexico-industry-sector-labels.ts';

const folder='atlas/north-america/mexico/industry';
const localModules={name:'mexico-adopted-local',setup(b){b.onResolve({filter:/^\./},args=>{const resolved=path.resolve(args.resolveDir,args.path);return {path:resolved+(path.extname(resolved)?'':'.ts')};});b.onLoad({filter:/\.ts$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}));}};
const compiled=await build({stdin:{contents:"import {initMexicoIndustryAdopted} from './src/scripts/atlas-mexico-industry-adopted.ts';initMexicoIndustryAdopted(document.querySelector('[data-ma-atlas]'));",resolveDir:process.cwd(),sourcefile:'mexico-adopted-e2e.ts',loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},plugins:[localModules],bundle:true,format:'iife',platform:'browser',write:false});
const active=d=>d.querySelector('[data-ma-sector-map]:not([hidden])');
const q=(d,s)=>active(d)?.querySelector(s)??d.querySelector(s);
async function page(search='',width=1280){
 const w=new Window({url:`https://example.com/insight-journal/${folder}/${search}`,width,height:900,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile(`dist/${folder}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 const screenWidth=width<=600?358:750,screenHeight=screenWidth*580/900;
 for(const panel of w.document.querySelectorAll('[data-ma-sector-map]')){
  const frame=panel.querySelector('[data-ma-frame]'),svg=panel.querySelector('[data-ma-map]');
  frame.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:screenWidth,bottom:screenHeight,width:screenWidth,height:screenHeight});
  // Synthetic screen transform verifies behavior and geometry, not browser CSS.
  svg.getScreenCTM=()=>{const[x,y,vw,vh]=svg.getAttribute('viewBox').split(' ').map(Number),a=screenWidth/vw,d=screenHeight/vh;return{a,d,b:0,c:0,e:-x*a,f:-y*d};};
 }
 w.eval(compiled.outputFiles[0].text);return w;
}
const slots=d=>[...active(d).querySelectorAll('[data-ma-cluster]')].map(n=>({id:n.dataset.maCluster,x:n.dataset.maX,y:n.dataset.maY,width:n.dataset.maWidth,height:n.dataset.maHeight}));
const click=(d,s)=>q(d,s).click();
const choose=(w,id)=>{const s=q(w.document,'[data-ma-industry-select="'+q(w.document,'[data-ma-atlas]').dataset.maSector+'"]');s.value=id;s.dispatchEvent(new w.Event('change'));};

// Optional source-coordinate map exports for static readability review. These
// show the live controller's SVG annotations, not a browser screenshot or UI QA.
async function preview(w,sector,width){
 const dir=process.env.MEXICO_STATIC_LABEL_PREVIEW;if(!dir)return;
 await mkdir(dir,{recursive:true});const panel=active(w.document),frame=panel.querySelector('[data-ma-frame]').getBoundingClientRect(),base=panel.querySelector('[data-ma-map]').cloneNode(true);base.querySelector('image')?.remove();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}"><style>text{font-family:'Noto Sans CJK JP',sans-serif;paint-order:stroke;stroke:#fffefa;stroke-width:3px;stroke-linejoin:round;fill:#294c40}.ma-region-name{font-size:11px;font-weight:500}.ma-region-industries{font-size:12px;font-weight:600}</style><rect width="100%" height="100%" fill="#e4eeeb"/><g transform="scale(${frame.width/900})">${base.innerHTML}</g>${panel.querySelector('.ma-annotations').innerHTML}</svg>`;
 await writeFile(path.join(dir,`${width}-${sector}.svg`),svg);await writeFile(path.join(dir,`${width}-${sector}.json`),JSON.stringify({synthetic:true,sector,width,labels:slots(w.document),points:mexicoSectorPoints(sector).length,omitted:q(w.document,'[data-ma-atlas]').dataset.maOmittedAnnotations},null,2));
}

test('Three independent sector maps keep their own points and pattern IDs; all 34 products preserve scope and statistics',async()=>{
 const w=await page();try{
  const d=w.document;assert.equal(d.querySelectorAll('[data-ma-sector-map]').length,3);assert.equal(d.querySelectorAll('[data-ma-map]').length,3);assert.equal(d.querySelectorAll('[data-ma-atlas] [data-ma-state]').length,96);assert.equal(d.querySelectorAll('.ma-reading .ma-indicator').length,0);
  const ids=[...d.querySelector('[data-ma-atlas]').querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
  for(const sector of ['resources','manufacturing','services']){
   click(d,`[role=tab][data-ma-sector="${sector}"]`);assert.equal(active(d).dataset.maSectorMap,sector);assert.equal(d.querySelectorAll('[data-ma-sector-map]:not([hidden])').length,1);
   const baseline=slots(d),camera=q(d,'[data-ma-map]').getAttribute('viewBox');assert.ok(baseline.length<=mexicoSectorClusters(sector).length);assert.ok(baseline.length>0);
   assert.equal(active(d).querySelectorAll('[data-ma-marker]').length,mexicoSectorPoints(sector).length);assert.equal(active(d).querySelectorAll('line,.ma-map-label,button,[data-ma-correspondence]').length,0);
   for(const marker of active(d).querySelectorAll('[data-ma-marker]'))for(const id of marker.dataset.maPointIndustries.split(','))assert.ok(adoptedIndustries.find(i=>i.id===id).sectors.includes(sector));
   for(const item of adoptedIndustries.filter(i=>i.sectors.includes(sector))){
    choose(w,item.id);assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,item.id);assert.equal(q(d,'[data-ma-title]').textContent,item.label);assert.equal(q(d,'[data-ma-process]').textContent,item.process);assert.equal(q(d,'[data-ma-boundary]').textContent,item.boundary);
    assert.equal(q(d,'[data-ma-map]').getAttribute('viewBox'),camera);assert.deepEqual(slots(d),baseline);assert.ok(q(d,'[data-ma-map-definition]').textContent.startsWith(item.map.definition));
    assert.equal(q(d,'[data-ma-map-sources]').querySelectorAll('a').length,item.map.sourceIds.length);for(const section of ['domestic','world','trade'])assert.equal(q(d,`[data-ma-indicators="${section}"]`).querySelectorAll('dl').length,item.statistics[section].length);
    assert.equal(d.querySelectorAll('[data-ma-table-state]').length,32);for(const cell of item.map.values){const shape=q(d,`[data-ma-state="${cell.state}"]`);assert.equal(shape.dataset.maStatus,cell.status);if(cell.value===null)assert.equal(shape.getAttribute('fill'),`url(#ma-${sector}-${cell.status})`);}
   }
  }
 }finally{await w.happyDOM.close();}
});

test('Industry selection, only display, state selection, zoom, reload and history keep annotation coordinates fixed',async()=>{
 const w=await page('?sector=manufacturing&subsector=food&fallback=1');let reload;try{
  const d=w.document,baseline=slots(d),camera=q(d,'[data-ma-map]').getAttribute('viewBox'),only=q(d,'[data-ma-only]');only.checked=true;only.dispatchEvent(new w.Event('change'));assert.deepEqual(slots(d),baseline);assert.equal(active(d).querySelectorAll('[data-ma-marker]').length,new Set(adoptedIndustries.find(i=>i.id==='food').map.regions.map(r=>r.state)).size);
  q(d,'[data-ma-state="14"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(new URL(w.location).searchParams.get('state'),'14');assert.equal(q(d,'[data-ma-place-reading]').hidden,false);assert.match(q(d,'[data-ma-state-value]').textContent,/ハリスコ/);assert.equal(q(d,'[data-ma-map]').getAttribute('viewBox'),camera);
  click(d,'[data-ma-camera="in"]');const zoomed=q(d,'[data-ma-map]').getAttribute('viewBox');choose(w,'beer');assert.equal(q(d,'[data-ma-map]').getAttribute('viewBox'),zoomed);assert.equal(new URL(w.location).searchParams.get('fallback'),'1');
  reload=await page(w.location.search);assert.equal(q(reload.document,'[data-ma-map]').getAttribute('viewBox'),zoomed);assert.equal(q(reload.document,'[data-ma-atlas]').dataset.maIndustry,'beer');
  w.history.back();await w.happyDOM.waitUntilComplete();assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'food');assert.equal(q(d,'[data-ma-map]').getAttribute('viewBox'),zoomed);w.history.forward();await w.happyDOM.waitUntilComplete();assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'beer');click(d,'[data-ma-clear]');assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'all');assert.equal(q(d,'[data-ma-map]').getAttribute('viewBox'),zoomed);
 }finally{await w.happyDOM.close();await reload?.happyDOM.close();}
});

test('Keyboard sector switching, overlap and overview guide-point selection retain the industry-led external controls',async()=>{
 const w=await page('?sector=resources&subsector=refining');try{
  const d=w.document;click(d,'[data-ma-overlap]');assert.equal(active(d).dataset.maSectorMap,'manufacturing');assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'refining');
  q(d,'[role=tab][data-ma-sector="manufacturing"]').focus();q(d,'[role=tab][data-ma-sector="manufacturing"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(active(d).dataset.maSectorMap,'services');assert.equal(d.activeElement.dataset.maSector,'services');
  const marker=q(d,'[data-ma-marker="services:09"]');marker.focus();marker.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'all','A geographic point never auto-selects an arbitrary first industry');assert.equal(d.activeElement.dataset.maMarker,'services:09');assert.match(q(d,'[data-ma-place-note]').textContent,/金融|情報|専門/);
  choose(w,'digital');assert.match(q(d,'[data-ma-map-caption]').textContent,/2023年・人/);assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'digital');q(d,'[data-ma-atlas]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(q(d,'[data-ma-atlas]').dataset.maIndustry,'all');
 }finally{await w.happyDOM.close();}
});

test('Desktop and portrait source-coordinate previews have bounded nonoverlapping short labels without any menu or leader line',async()=>{
 for(const width of [1280,390]){
  const w=await page('',width);try{
   const d=w.document;for(const sector of ['resources','manufacturing','services']){
    click(d,`[role=tab][data-ma-sector="${sector}"]`);const boxes=slots(d),frame=q(d,'[data-ma-frame]').getBoundingClientRect();assert.ok(boxes.length>0);
    for(const a of boxes){assert.ok(+a.x>=0&&+a.y>=0&&+a.x+(+a.width)<=frame.width&&+a.y+(+a.height)<=frame.height);}
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(+a.x+(+a.width)<=+b.x||+b.x+(+b.width)<=+a.x||+a.y+(+a.height)<=+b.y||+b.y+(+b.height)<=+a.y);}
    await preview(w,sector,width);choose(w,mexicoSectorClusters(sector)[0].industries[0].id);assert.deepEqual(slots(d),boxes);
   }
  }finally{await w.happyDOM.close();}
 }
});
