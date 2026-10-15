import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createEastIndustryClusters} from '../../src/scripts/atlas-east-asia-industry-clusters.ts';
import {eastSectors,eastSectorIndustries,eastSectorRows,eastSectorSites} from '../../src/data/atlas/east-asia-industry-sectors.ts';

test('operational stages have a unique sector owner without losing any original site',()=>{
 const groups=eastSectors.map(s=>eastSectorRows(s.id)),ids=groups.flat().map(s=>s.id);
 assert.equal(ids.length,eastSectorSites.length);assert.equal(new Set(ids).size,ids.length);
 assert(groups[0].some(s=>s.id==='oyu-tolgoi'));assert(!groups[1].some(s=>s.id==='oyu-tolgoi'));
 assert(groups[1].some(s=>s.id==='toyo-copper'));assert(!groups[0].some(s=>s.id==='toyo-copper'));
 for(const id of ['ganzhou-magnets','baotou-magnets','ningbo-magnets']){assert(groups[1].some(s=>s.id===id));assert(!groups[0].some(s=>s.id===id));}
 assert(groups[2].some(s=>s.id==='hsinchu-design'));assert(!groups[1].some(s=>s.id==='hsinchu-design'));
});

test('three sector scenes contain only their own dots/labels; selecting a kind preserves passive annotation positions',async()=>{
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 window.document.body.innerHTML=`<main data-region="east-asia"><div class="asia-map-frame"></div><p data-map-gesture></p>
 <section data-east-cluster-reading><h2 data-east-cluster-title></h2><p data-east-cluster-lead></p><p data-east-cluster-reason></p><button data-east-industry-only></button><button data-east-industry-clear></button><div data-east-cluster-detail></div><div data-east-cluster-sources></div><div data-east-industry-site-list></div></section>
 <section data-industry-legend><h3 data-industry-legend-title></h3><div data-industry-scale></div><p data-industry-legend-note></p></section></main>`;
 const root=window.document.querySelector('main'),camera={lng:118,lat:32,zoom:3};let state={field:'industry',topic:'east-clusters',sector:'manufacturing',place:null,detail:null,only:false,camera};
 const layers=new Map(),sources=new Map(),map={project:p=>({x:12+(p[0]-90)/62*793,y:12+(55-p[1])/38*526}),on:()=>{},getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),setLayoutProperty:()=>{},getSource:id=>sources.get(id),addSource:(id,s)=>sources.set(id,{data:s.data,setData(d){this.data=d;}})};
 const controller=createEastIndustryClusters(root,()=>state,next=>{state=next;},()=>camera),overlay=root.querySelector('.east-industry-map-labels');
 Object.defineProperties(overlay,{clientWidth:{value:817},clientHeight:{value:550}});
 const snapshot=()=>[...overlay.querySelectorAll('[data-east-industry-annotation]')].filter(n=>!n.hidden&&n.style.visibility==='visible').map(n=>[n.dataset.eastIndustryAnnotation,n.dataset.coordinate,n.style.left,n.style.top]);
 try{
  for(const sector of eastSectors){
   state={...state,topic:sector.topic,sector:sector.id,only:false,detail:null};controller.render();controller.show(map);
   const rows=eastSectorRows(sector.id),kinds=eastSectorIndustries.filter(i=>i.sectors.includes(sector.id)),initial=snapshot();assert(initial.length>0&&initial.length<=8);
   assert.equal(overlay.querySelectorAll('.east-sector-map-label,button[data-industry-label]').length,0,'no in-map industry menu');
   assert.deepEqual([...overlay.querySelectorAll('[data-industry-cluster]')].map(n=>n.dataset.industryCluster).sort(),rows.map(s=>s.id).sort());
   assert.deepEqual(sources.get('asia-east-industry-clusters').data.features.map(f=>f.properties.id).sort(),rows.map(s=>s.id).sort());
   assert.deepEqual([...root.querySelectorAll('[data-industry-scale]>span')].map(n=>n.textContent),kinds.map(i=>i.label));
   for(const mark of overlay.querySelectorAll('svg [data-industry]'))assert(kinds.some(i=>i.id===mark.dataset.industry));
   for(const n of overlay.querySelectorAll('[data-east-industry-annotation]')){assert.equal(n.tagName,'SPAN');assert.equal(n.getAttribute('role'),null);assert.equal(n.firstElementChild.tagName,'STRONG');assert(n.querySelector('strong').textContent.length>0);assert(n.querySelector('small').textContent.length>0);assert(n.getAttribute('aria-label').startsWith(n.querySelector('strong').textContent+'：'));for(const id of n.dataset.annotationSites.split(','))assert(rows.find(s=>s.id===id)?.industries.includes(n.dataset.industryLabel));}
   for(const kind of kinds){
    state={...state,topic:'east-'+kind.id};controller.render();controller.show(map);assert.deepEqual(snapshot(),initial);
    state={...state,only:true};controller.render();controller.show(map);
    for(const p of overlay.querySelectorAll('[data-industry-cluster]'))assert(rows.find(s=>s.id===p.dataset.industryCluster).industries.includes(kind.id));
    for(const n of overlay.querySelectorAll('[data-east-industry-annotation]'))if(!n.hidden&&n.style.visibility==='visible')assert.equal(n.dataset.industryLabel,kind.id);
    state={...state,only:false};controller.render();controller.show(map);assert.deepEqual(snapshot(),initial);
   }
  }
 }finally{globalThis.document=previous;await window.happyDOM.close();}
});
