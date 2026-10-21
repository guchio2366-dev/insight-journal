import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {southeastIndustrySites,southeastSiteSectors} from '../../src/data/atlas/asia/southeast-asia-industry-sites.ts';
const html=await readFile(new URL('../../dist/atlas/asia/southeast-asia/industry/index.html',import.meta.url),'utf8');
const {outputFiles}=await build({entryPoints:['src/scripts/atlas-asia-southeast-industry.ts'],bundle:true,write:false,format:'iife',globalName:'SEA',platform:'browser',define:{'import.meta.env.BASE_URL':'"/insight-journal/"'}});
function fixture(query=''){
 const window=new Window({url:'http://localhost/insight-journal/atlas/asia/southeast-asia/industry/'+query,settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 window.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[]})});
 window.document.write(html);const module=window.eval(outputFiles[0].text+'\nSEA;');
 const root=window.document.querySelector('[data-asia-atlas]'),overlay=root.querySelector('[data-southeast-industry-map]');
 Object.defineProperty(overlay,'clientWidth',{value:700});Object.defineProperty(overlay,'clientHeight',{value:550});
 let state={field:'industry',place:null,topic:'manufacturing'};
 const controller=module.createSoutheastIndustryLocations(root,()=>state);controller.show(null);
 const layers=new Map(),filters=new Map(),visibility=new Map();
 const map={project:([lon,lat])=>({x:(lon-94)/42*700,y:(26-lat)/44*550}),on(){},getSource:()=>true,getLayer:id=>layers.get(id),addSource(){},addLayer(layer){layers.set(layer.id,layer);},setFilter(id,value){filters.set(id,value);},setLayoutProperty(id,name,value){visibility.set(id,value);},fitBounds(){assert.fail('selection must not move the camera');}};
 const picker=root.querySelector('[data-southeast-industry-picker]');
 return {window,root,controller,map,filters,visibility,picker,show(){controller.show(map);},setState(s){state={...state,...s};controller.render();},sector(id){root.querySelector('[data-southeast-industry-sector="'+id+'"]').click();},choose(id){assert([...picker.options].some(o=>o.value===id),id+' belongs to the displayed sector');picker.value=id;picker.dispatchEvent(new window.Event('change'));}};
}
const visible=(root,attribute)=>[...root.querySelectorAll('['+attribute+']')].filter(n=>!n.hidden);
const geometry=f=>({points:visible(f.root,'data-southeast-industry-point').map(n=>[n.dataset.southeastIndustryPoint,n.style.left,n.style.top]),labels:visible(f.root,'data-southeast-industry-label').map(n=>[n.dataset.southeastIndustryLabel,n.style.cssText,n.textContent]),leaders:[...f.root.querySelectorAll('[data-southeast-industry-leader]')].map(n=>[n.dataset.southeastIndustryLeader,n.getAttribute('x1'),n.getAttribute('x2'),n.getAttribute('y1'),n.getAttribute('y2')])});

test('local facts follow the selected place, distinguish company/state scope, and clear on history and sector changes',async()=>{
 const f=fixture('?industryKind=lng&industrySite=lumut-lng');try{
  f.show();const baseline=geometry(f);
  assert.deepEqual(visible(f.root,'data-southeast-local-evidence').map(n=>n.dataset.southeastLocalEvidence),['lumut-lng']);
  assert.match(f.root.querySelector('[data-southeast-local-evidence="lumut-lng"]').textContent,/7.7.*百万t\/年/s);
  f.root.querySelector('[data-southeast-stage-site="bintulu-lng"]').click();assert.deepEqual(geometry(f),baseline);assert.deepEqual(visible(f.root,'data-southeast-local-evidence').map(n=>n.dataset.southeastLocalEvidence),['bintulu-lng']);
  f.sector('manufacturing');f.choose('rice');f.root.querySelector('[data-southeast-stage-site="thotnot-rice"]').click();
  assert.equal(f.root.querySelector('[data-southeast-local-evidence="thotnot-rice"]').dataset.southeastLocalScope,'company');assert.match(f.root.querySelector('[data-southeast-local-evidence="thotnot-rice"]').textContent,/単独工場.*未取得/);
  f.choose('solar');f.root.querySelector('[data-southeast-stage-site="perai-solar"]').click();assert.equal(visible(f.root,'data-southeast-local-evidence').length,0);assert.equal(f.root.querySelector('[data-southeast-industry-local-missing]').hidden,false);
  f.window.history.replaceState(null,'','?industrySector=services&industryKind=logistics&industrySite=tibar-port');f.window.dispatchEvent(new f.window.PopStateEvent('popstate'));await new Promise(r=>setImmediate(r));
  assert.deepEqual(visible(f.root,'data-southeast-local-evidence').map(n=>n.dataset.southeastLocalEvidence),['tibar-port']);assert.match(f.root.querySelector('[data-southeast-industry-selected-position]').textContent,/公表.*参照位置/);
  f.sector('resource');assert.equal(f.root.querySelector('[data-southeast-industry-selected]').hidden,true);assert.equal(visible(f.root,'data-southeast-local-evidence').length,0);assert.equal(f.root.querySelector('[data-southeast-industry-comparison-context]').hidden,true);
 }finally{f.window.happyDOM.abort();}
});

test('three sector maps replace the mixed overview and keep industry controls and legend outside the map',()=>{
 const f=fixture();try{
  assert.equal(f.root.querySelectorAll('[data-southeast-industry-sector]').length,3);
  assert.equal(f.root.querySelectorAll('[data-southeast-industry-kind]').length,0,'eighteen map buttons are replaced by one selector');
  assert.equal(f.root.dataset.southeastIndustrySector,'resource');
  assert.equal(f.root.querySelector('[data-southeast-industry-map]').hidden,true);
  f.show();
  for(const sector of ['resource','manufacturing','services']){
   f.sector(sector);
   const expected=southeastIndustrySites.filter(s=>southeastSiteSectors(s).includes(sector)).map(s=>s.id).sort();
   assert.deepEqual(visible(f.root,'data-southeast-industry-point').map(n=>n.dataset.southeastIndustryPoint).sort(),expected);
   assert.deepEqual(visible(f.root,'data-southeast-industry-site').map(n=>n.dataset.southeastIndustrySite).sort(),expected);
   assert(visible(f.root,'data-southeast-industry-label').every(n=>n.dataset.southeastIndustryLabelSector===sector));
   for(const line of f.root.querySelectorAll('[data-southeast-industry-leader]'))assert(visible(f.root,'data-southeast-industry-label').some(n=>n.dataset.southeastIndustryLabel===line.dataset.southeastIndustryLeader));
   assert.equal(f.root.querySelector('[data-southeast-industry-site-count]').textContent,String(expected.length));
  }
  assert.equal(f.picker.closest('.asia-map-frame'),null);
  assert.equal(f.root.querySelector('[data-southeast-industry-legend]').closest('[data-southeast-industry-map]'),null);
  assert.equal(f.root.querySelector('[data-industry-region-reading]').parentElement,f.root.querySelector('[data-reading-dock]'));
  assert.equal(f.root.querySelector('[data-southeast-industry-statistics]').previousElementSibling,f.root.querySelector('[data-asia-statistics]'));
 }finally{f.window.happyDOM.abort();}
});
test('industry and point selection never move or add labels within the selected map; all 18 profiles remain reachable',()=>{
 const f=fixture(),seen=new Set();try{
  f.show();
  for(const sector of ['resource','manufacturing','services']){
   f.sector(sector);const before=geometry(f),kinds=[...f.picker.options].map(o=>o.value).filter(id=>id!=='all');
   for(const id of kinds){f.choose(id);seen.add(id);assert.deepEqual(geometry(f),before);assert.equal(f.root.querySelector('[data-southeast-industry-facts="'+id+'"]').hidden,false);}
   const id=before.points[0][0];f.root.querySelector('[data-southeast-industry-point="'+id+'"]').click();assert.deepEqual(geometry(f),before);assert.equal(f.root.querySelector('[data-southeast-industry-selected]').hidden,false);
   f.root.querySelector('[data-southeast-industry-clear]').click();assert.deepEqual(geometry(f),before);assert.equal(f.root.dataset.southeastIndustrySector,sector);
  }
  assert.equal(seen.size,18);
  f.sector('manufacturing');f.choose('palm');assert.equal(f.root.querySelectorAll('[data-southeast-palm-state-table] tbody tr').length,7);assert.match(f.root.querySelector('[data-southeast-industry-facts="palm"]').textContent,/17,266,555t.*52.0%/);
  f.choose('rice');assert.match(f.root.querySelector('[data-southeast-industry-facts="rice"]').textContent,/HS100630/);
 }finally{f.window.happyDOM.abort();}
});
test('legacy URLs choose an appropriate map; invalid and cross-sector URLs never restore a mixed map',async()=>{
 for(const [query,sector,kind]of [['?industryKind=wood','manufacturing','wood'],['?industrySector=all','resource','all'],['?industrySector=services&industryKind=wood','services','all'],['?industrySector=resources&industryKind=lng','resource','lng'],['?industryKind=wood&industrySite=north-central-timber','resource','wood']]){
  const f=fixture(query);try{assert.equal(f.root.dataset.southeastIndustrySector,sector);assert.equal(f.root.dataset.southeastIndustryKind,kind);}finally{f.window.happyDOM.abort();}
 }
 const f=fixture('?industryKind=wood&industrySite=rayong-tires');try{
  assert.equal(f.root.querySelector('[data-southeast-industry-selected]').hidden,true);
  f.root.querySelector('[data-southeast-industry-site="rayong-tires"]').click();assert.equal(new URL(f.window.location.href).searchParams.get('industrySite'),'rayong-tires');assert.equal(f.root.dataset.southeastIndustrySector,'manufacturing');
  f.window.history.replaceState(null,'','?industryKind=lng&industrySite=bintulu-lng');f.window.dispatchEvent(new f.window.PopStateEvent('popstate'));await new Promise(r=>setImmediate(r));
  assert.equal(f.root.dataset.southeastIndustrySector,'resource');assert.equal(f.root.dataset.southeastIndustryKind,'lng');assert.equal(f.root.querySelector('[data-southeast-industry-selected]').hidden,false);
  f.sector('services');f.choose('it-bpm');assert.match(f.root.querySelector('[data-southeast-industry-facts="it-bpm"]').textContent,/付加価値.*需給式/s);
  f.setState({place:'THA'});assert.equal(f.root.querySelector('[data-southeast-industry-controls]').hidden,true);assert.equal(f.root.querySelector('[data-southeast-industry-statistics]').hidden,true);
  f.setState({place:null,field:'natural'});assert.equal(f.root.dataset.southeastIndustryActive,'false');
 }finally{f.window.happyDOM.abort();}
});
test('palm quantities, country outlines and their legends never leak into a different sector',async()=>{
 const f=fixture();try{
  f.show();await new Promise(r=>setImmediate(r));
  f.sector('manufacturing');f.choose('palm');assert.equal(f.visibility.get('southeast-palm-processing'),'visible');assert.equal(f.root.querySelector('[data-southeast-palm-map-key]').hidden,false);
  f.sector('services');assert.equal(f.visibility.get('southeast-palm-processing'),'none');assert.equal(f.root.querySelector('[data-southeast-palm-map-key]').hidden,true);
  f.sector('manufacturing');f.choose('rice');assert.equal(f.visibility.get('southeast-industry-country-evidence'),'visible');assert.deepEqual(Array.from(f.filters.get('southeast-industry-country-evidence')[2][1]),['THA','VNM','MMR','KHM']);
  f.sector('resource');assert.equal(f.visibility.get('southeast-industry-country-evidence'),'none');assert.doesNotMatch(f.root.querySelector('[data-southeast-industry-legend]').textContent,/青い国境/);
  assert(visible(f.root,'data-southeast-industry-scale-kind').every(n=>n.dataset.southeastIndustryScaleSector==='resource'));
  assert.match(f.root.querySelector('[data-southeast-industry-site-scales]').textContent,/2,930万t\/年/);
 }finally{f.window.happyDOM.abort();}
});

