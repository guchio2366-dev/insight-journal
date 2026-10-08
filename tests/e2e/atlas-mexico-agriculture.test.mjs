import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const bundle=await build({entryPoints:['src/scripts/atlas-mexico-agriculture-atlas.ts'],bundle:true,write:false,format:'iife',globalName:'MexicoAtlas'});
const readingBundle=await build({stdin:{contents:"export {mexicoAgricultureProductReading} from './src/data/atlas/mexico/agriculture-product-reading'; export {agricultureReading} from './src/data/atlas/mexico/agriculture-reading';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm'});
const readingCopy=await import('data:text/javascript;base64,'+Buffer.from(readingBundle.outputFiles[0].text).toString('base64'));
const source=await readFile('dist/atlas/north-america/mexico/agriculture/index.html','utf8');
async function page(query='',interactive=true){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/mexico/agriculture/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.write(source.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 const root=window.document.querySelector('[data-mexico-agriculture-atlas]'),frame=root.querySelector('[data-map-frame]');
 Object.defineProperties(frame,{clientWidth:{value:700},clientHeight:{value:451}});
 frame.getBoundingClientRect=()=>({left:0,top:0,width:700,height:451,right:700,bottom:451});
 window.HTMLElement.prototype.scrollIntoView=function(){};window.matchMedia=()=>({matches:true});
 if(interactive){window.eval(bundle.outputFiles[0].text+';MexicoAtlas.initMexicoAgricultureAtlas(document.querySelector("[data-mexico-agriculture-atlas]"));');await window.happyDOM.waitUntilComplete();}
 return {window,root,q:selector=>root.querySelector(selector)};
}
const selected=(ctx,item)=>{assert.equal(ctx.root.dataset.agricultureCurrentItem,item??'');assert.equal(ctx.q('[data-agri-overview]').hidden,!!item);assert.equal(ctx.q('[data-agri-reading-panel]').hidden,!item);};

test('Mexico uses shared US agriculture hierarchy, truthful zones and a same-year monetary composition',async()=>{
 const ctx=await page('',false);try{
  assert.ok(source.length<1500000,'The agriculture HTML must not repeat full-resolution national clip geometry');
  assert.equal(ctx.q('#mexico-agriculture-country-clip'),null,'Crop source zones are already geographically clipped');
  assert.ok(ctx.q('[data-agriculture-map] image[href$="rivers.png"]'));
  assert.equal(ctx.q('.atlas-key').previousElementSibling.className,'atlas-map-frame');
  assert.equal(ctx.root.querySelectorAll('[data-agri-layer]').length,2);
  assert.equal(ctx.root.querySelectorAll('[data-map-action]').length,3);
  assert.equal(ctx.root.querySelectorAll('path[data-agriculture-state-code]').length,32);
  assert.equal(ctx.root.querySelectorAll('.mexico-crop-zone').length,11);
  assert.equal(ctx.root.querySelectorAll('[data-agriculture-symbol],[data-agriculture-cattle-symbol]').length,0);
  assert.equal(ctx.root.querySelectorAll('[data-crop-key] [data-livestock-select]').length,5);
  assert.ok(ctx.q('[data-crop-key] [data-forestry-select]'));
  assert.equal(ctx.q('[data-agri-overview] header').firstElementChild.textContent,'NATIONAL OVERVIEW');
  assert.match(ctx.q('.atlas-receipts-chart').textContent,/生産額.*2025年.*49%.*51%.*生体/s);
  assert.match(ctx.q('#mexico-agriculture-sources').textContent,/推計.*5分格子.*市町村.*2025.*2022/s);
  assert.match(ctx.q('[data-agriculture-reading="pine"]').textContent,/ドゥランゴ.*チワワ.*山地.*加工.*市場/s);
  assert.equal(ctx.q('[data-mexico-forest-states]'),null);
  await access('dist/assets/atlas/mexico-agriculture-v2/manifest.json');
  await access('dist/assets/atlas/mexico-agriculture-v2/rivers.svg');
 }finally{await ctx.window.happyDOM.close();}
});

test('Overview, all crop/animal/forest entries and related statistics are reachable without a state default',async()=>{
 const ctx=await page();try{
  selected(ctx,null);assert.equal(ctx.q('[data-agriculture-state]').value,'');
  for(const link of ctx.root.querySelectorAll('[data-crop-select],[data-livestock-select],[data-forestry-select]')){
   const item=link.dataset.cropSelect??link.dataset.livestockSelect??'pine';link.click();await ctx.window.happyDOM.waitUntilComplete();
   selected(ctx,item);assert.equal(ctx.q(`[data-agriculture-reading="${item}"]`).hidden,false);
   assert.equal(ctx.q(`[data-mexico-stat-panel="${item}"]`).hidden,false);
   assert.equal(ctx.q('[data-mexico-agriculture-statistics]').hidden,false);
   assert.equal(ctx.q('[data-agriculture-state]').value,'');
  }
  ctx.q('[data-agri-overview-button]').click();selected(ctx,null);
  assert.equal(ctx.q('[data-mexico-agriculture-statistics]').hidden,true);
 }finally{await ctx.window.happyDOM.close();}
});

test('Repeated selection adds no duplicate history; Back, Forward and reload restore item, layers and zoom',async()=>{
 const ctx=await page();let reload;try{
  const initial=ctx.window.history.length;ctx.q('[data-crop-select="corn"]').click();
  assert.equal(ctx.window.history.length,initial+1);ctx.q('[data-crop-select="corn"]').click();assert.equal(ctx.window.history.length,initial+1);
  ctx.window.history.back();await ctx.window.happyDOM.waitUntilComplete();selected(ctx,null);
  ctx.window.history.forward();await ctx.window.happyDOM.waitUntilComplete();selected(ctx,'corn');
  ctx.q('[data-agri-layer][value="livestock"]').click();ctx.q('[data-map-action="in"]').click();
  reload=await page(ctx.window.location.search);selected(reload,'corn');
  assert.equal(reload.q('[data-agri-layer][value="livestock"]').checked,false);
  assert.equal(reload.q('[data-agriculture-map]').getAttribute('viewBox'),ctx.q('[data-agriculture-map]').getAttribute('viewBox'));
  ctx.q('[data-map-action="fit"]').click();assert.equal(ctx.q('[data-agriculture-map]').getAttribute('viewBox'),'0.00 0.00 900.00 580.00');selected(ctx,'corn');
 }finally{if(reload)await reload.window.happyDOM.close();await ctx.window.happyDOM.close();}
});

test('Layer switches change map visibility independently and never replace the reading with overview',async()=>{
 const ctx=await page();try{
  ctx.q('[data-crop-select="wheat"]').click();ctx.q('[data-agri-layer][value="crops"]').click();selected(ctx,'wheat');
  assert.ok(ctx.q('[data-mexico-crop-zones]').hasAttribute('hidden'));assert.equal(ctx.q('[data-livestock-markers]').hidden,false);
  assert.equal(ctx.q('[data-agri-layer-warning]').hidden,false);ctx.q('[data-agri-enable-layers]').click();
  assert.equal(ctx.q('[data-agri-layer][value="crops"]').checked,true);assert.equal(ctx.q('[data-agri-layer-warning]').hidden,true);
  ctx.q('[data-agri-layer][value="livestock"]').click();assert.equal(ctx.q('[data-livestock-markers]').hidden,true);
  ctx.q('[data-livestock-select="beef"]').click();selected(ctx,'beef');assert.equal(ctx.q('[data-agri-layer-warning]').hidden,false);
 }finally{await ctx.window.happyDOM.close();}
});

test('Real municipal livestock badges use shared grouping, separate meat/乳/卵 and selectable source quantities',async()=>{
 const ctx=await page();try{
  const config=JSON.parse(ctx.q('[data-mexico-agriculture-config]').textContent);
  assert.equal(config.markers.length,15);assert.equal(new Set(config.markers.map(marker=>marker.kindId)).size,5);
  const marker=ctx.q('.atlas-livestock-marker[data-marker-id]');assert.ok(marker);const id=marker.dataset.markerId;
  marker.click();const record=config.markers.find(marker=>marker.id===id);selected(ctx,record.kindId);
  assert.match(ctx.q('[data-mexico-region-name]').textContent,new RegExp(record.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(ctx.q('[data-mexico-region-production]').textContent,/2025/);assert.equal(ctx.q('[data-agriculture-state]').value,record.stateCode);
  assert.equal(ctx.q('[data-mexico-state-selection]'),null);
  ctx.q('[data-agri-overview-button]').click();assert.equal(ctx.q('[data-mexico-state-selection]'),null);
 }finally{await ctx.window.happyDOM.close();}
});

test('Forestry replaces agriculture overlays with the retained forest cover and statistics without state outlines, keeps layers, and restores them on return',async()=>{
 const ctx=await page();try{
  ctx.q('[data-agri-layer][value="livestock"]').click();ctx.q('[data-forestry-select]').click();selected(ctx,'pine');
  assert.equal(ctx.root.dataset.agriReading,'forestry');assert.equal(ctx.q('[data-mexico-tree-cover]').hasAttribute('hidden'),false);assert.equal(ctx.q('[data-mexico-forest-states]'),null);
  assert.ok(ctx.q('[data-mexico-crop-zones]').hasAttribute('hidden'));assert.equal(ctx.q('[data-livestock-markers]').hidden,true);
  assert.match(ctx.q('[data-layer-caption]').textContent,/州別松材統計2022/);
  ctx.q('[data-agri-overview-button]').click();selected(ctx,null);assert.equal(ctx.q('[data-mexico-crop-zones]').hasAttribute('hidden'),false);
  assert.equal(ctx.q('[data-agri-layer][value="livestock"]').checked,false);
 }finally{await ctx.window.happyDOM.close();}
});

test('Pine source figures and cattle-milk world comparison remain tied to their own period and units',async()=>{
 const flow=JSON.parse(await readFile('src/data/atlas/mexico/pine-flow-2022.json','utf8'));
 assert.equal(flow.sourceSha256,'ae0e72e8598482e604984daa22e446a553766f2ff13441872290d2a588071a71');
 assert.equal(flow.categories.length,7);
 assert.ok(Math.abs(flow.categories.reduce((sum,row)=>sum+row.obtainedM3,0)-flow.obtainedM3)<.001);
 assert.ok(Math.abs(flow.categories.reduce((sum,row)=>sum+row.soldM3,0)-flow.soldM3)<.001);
 const ctx=await page();try{
  ctx.q('[data-forestry-select]').click();
  const pine=ctx.q('[data-mexico-stat-panel="pine"]');
  assert.equal(pine.hidden,false);
  assert.match(pine.querySelector('.mexico-pine-flow').textContent,/2021年10月〜2022年9月.*丸太形態.*販売量.*国内消費.*輸出先/s);
  ctx.q('[data-livestock-select="dairy"]').click();
  const milk=ctx.q('[data-mexico-stat-panel="dairy"]');
  assert.equal(milk.hidden,false);
  assert.match(milk.querySelector('[data-mexico-milk-world-comparison]').textContent,/2024年.*牛の生乳.*FAOSTAT.*2025年.*千L/s);
  assert.equal(ctx.q('[data-mexico-stat-panel="pine"]').hidden,true);
 }finally{await ctx.window.happyDOM.close();}
});

test('Legacy corn/pine/irrigation/cattle links preserve source metric and state in the existing nature comparison',async()=>{
 for(const [metric,item,state]of [['maize','corn','25'],['pine','pine','08'],['irrigation','irrigation','26'],['cattle','cattle','30']]){
  const ctx=await page(`?metric=${metric}&state=${state}&crops=0&reading=item`);try{
   selected(ctx,item);assert.equal(ctx.q('[data-agriculture-state]').value,state);
   const link=new URL(ctx.q(`[data-agriculture-nature-comparison="${item}"]`).href);
   assert.equal(link.searchParams.get('sourceMetric'),metric);assert.equal(link.searchParams.get('state'),state);assert.equal(link.searchParams.get('sourceState'),state);
   assert.equal(link.searchParams.get('sourceCrops'),'0');assert.equal(link.searchParams.get('reading'),'item');
   assert.ok(!link.searchParams.has('view'),'The destination controller owns its climate/relief defaults');
  }finally{await ctx.window.happyDOM.close();}
 }
});

test('Keyboard crop selection, Escape, state statistics and one-item mode preserve usable routes',async()=>{
 const ctx=await page();try{
  ctx.q('path[data-crop-zone="corn"]').dispatchEvent(new ctx.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));selected(ctx,null);ctx.q('text[data-crop-zone="corn"]').dispatchEvent(new ctx.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));selected(ctx,'corn');
  const select=ctx.q('[data-agriculture-state]');select.value='08';select.dispatchEvent(new ctx.window.Event('change',{bubbles:true}));
  assert.equal(ctx.q('[data-mexico-state-outline="08"]'),null);
  ctx.q('[data-mexico-only-item]').click();assert.equal(ctx.q('[data-livestock-markers]').hidden,true);assert.ok(ctx.q('path[data-crop-zone="wheat"]').hasAttribute('hidden'));
  ctx.root.dispatchEvent(new ctx.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));selected(ctx,null);
  assert.equal(ctx.q('[data-mexico-only-item]').checked,false);
  for(const link of ctx.root.querySelectorAll('.mexico-fields a')){const url=new URL(link.href);assert.equal(url.searchParams.get('state'),/\/(population|industry)\/$/.test(url.pathname)?null:'08');assert.equal(url.searchParams.get('reading'),'overview');assert.ok(!url.searchParams.has('agriItem'));}
 }finally{await ctx.window.happyDOM.close();}
});

test('State statistics and municipality products have distinct geographic descriptions and census labels',async()=>{
 const ctx=await page();try{
  ctx.q('[data-crop-select="wheat"]').click();const select=ctx.q('[data-agriculture-state]');select.value='08';select.dispatchEvent(new ctx.window.Event('change',{bubbles:true}));
  assert.equal(ctx.q('[data-mexico-region-heading]').textContent,'選択した州');assert.match(ctx.q('[data-mexico-region-scope]').textContent,/州全体/);assert.doesNotMatch(ctx.q('[data-mexico-region-scope]').textContent,/庁所在地/);
  const marker=ctx.q('.atlas-livestock-marker[data-marker-id]');marker.click();assert.match(ctx.q('[data-mexico-region-heading]').textContent,/市町村/);assert.match(ctx.q('[data-mexico-region-scope]').textContent,/市町村全体.*庁所在地/);
  assert.doesNotMatch(ctx.q('[data-agriculture-reading="cattle"]').textContent,/円は州合計/);
  assert.doesNotMatch(ctx.q('[data-agriculture-reading="corn"]').textContent,/地図の生産量/);
  assert.match(ctx.q('[data-mexico-stat-panel="irrigation"]').textContent,/全国の灌漑農地率/);
  assert.match(ctx.q('[data-mexico-stat-panel="cattle"]').textContent,/全国の牛頭数/);
  assert.match(ctx.q('[data-mexico-stat-panel="pine"]').textContent,/全国の松材取得量/);
 }finally{await ctx.window.happyDOM.close();}
});

test('Selecting a crop keeps every crop area and animal kind available with source-based colored labels',async()=>{
 const ctx=await page();try{
  ctx.q('[data-crop-select="corn"]').click();
  const config=JSON.parse(ctx.q('[data-mexico-agriculture-config]').textContent);
  assert.equal(config.cropLabelPoints.length,22);
  const zones=Array.from(ctx.root.querySelectorAll('path[data-crop-zone]'));
  assert.equal(zones.length,11);
  assert.ok(zones.every(node=>!node.hasAttribute('hidden')));
  assert.equal(zones.filter(node=>node.classList.contains('is-selected')).length,1);
  assert.equal(ctx.q('[data-livestock-markers]').hidden,false);
  assert.equal(ctx.root.querySelectorAll('[data-livestock-select]').length,5);
  const label=ctx.q('[data-crop-label="corn"]');
  assert.equal(label.hasAttribute('hidden'),false);
  assert.equal(label.style.getPropertyValue('--crop-color'),config.crops.find(crop=>crop.id==='corn').color);
  assert.equal(label.getAttribute('role'),'button');assert.equal(label.getAttribute('tabindex'),'0');
  label.dispatchEvent(new ctx.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));selected(ctx,'corn');
 }finally{await ctx.window.happyDOM.close();}
});

test('Compact reading entries retain every original sentence and original source link',async()=>{
 const ctx=await page('',false);try{
  const readings={...readingCopy.mexicoAgricultureProductReading,irrigation:readingCopy.agricultureReading.irrigation,pine:readingCopy.agricultureReading.pine};
  for(const [id,reading]of Object.entries(readings)){
   const section=ctx.q(`[data-agriculture-reading="${id}"]`);assert.ok(section,id);
   const parts=Array.from(section.querySelectorAll('.mexico-agriculture-causal'));
   assert.equal(parts.length,reading.steps.length,id);
   reading.steps.forEach((step,index)=>{
    const detail=parts[index];assert.equal(detail.tagName,'DETAILS');
    const entry=detail.querySelector('summary>strong').textContent;
    const continuation=detail.querySelector('p:not(.atlas-inline-sources)')?.textContent??'';
    assert.equal(entry+continuation,step.body,`${id}: ${step.title}`);
    assert.equal(detail.querySelector('a').getAttribute('href'),step.source);
   });
  }
 }finally{await ctx.window.happyDOM.close();}
});
