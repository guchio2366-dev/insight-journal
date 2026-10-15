import test from 'node:test';
import assert from 'node:assert/strict';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
import {southIndustryCatalog as groups,southIndustrySites as sites,southIndustrySources as sources,southIndustryOverview} from '../../src/data/atlas/south-asia-major-industries.ts';
import {southIndustrySectors,southIndustryMapSector} from '../../src/data/atlas/south-asia-industry-sectors.ts';
import {southIndustryMapView,southIndustryMapBounds} from '../../src/data/atlas/south-asia-industry-cartography.ts';
import {southIndustryLabelLayout} from '../../src/lib/atlas-south-asia-industry-labels.ts';
import {asiaFocusCountries,asiaFocusIndustry} from '../../src/data/atlas/asia-focus.ts';
test('Each map contains only its sector, keeps product scope stable and preserves every source site',()=>{
 const counts=[13,24,8],labelCounts=[11,18,8],seen=[];
 for(const [i,sector]of southIndustrySectors.entries()){
  const view=southIndustryMapView(sector.id);
  assert.equal(view.sites.length,counts[i]);assert.equal(view.labels.length,labelCounts[i]);
  assert.deepEqual(view.groupIds,sector.groups);assert.deepEqual(view.guides,[]);
  assert.deepEqual(new Set(view.labels.flatMap(label=>label.siteIds)),new Set(view.sites.map(site=>site.id)));
  for(const site of view.sites){assert(sector.groups.includes(site.group));assert.equal(site,sites.find(s=>s.id===site.id));seen.push(site.id);}
  for(const label of view.labels){const members=label.siteIds.map(id=>sites.find(site=>site.id===id));assert(members.every(site=>site.group===label.group&&site.country===label.country));assert.deepEqual(label.point,sites.find(site=>site.id===label.anchorId).point);assert(!/能力|資源量|MW|室|万t/.test(label.industry+label.place),'Scale stays in the evidenced reading, outside map text');}
  for(const product of sector.groups){const detailView=southIndustryMapView(product);assert.deepEqual(detailView.sites,view.sites);assert.deepEqual(detailView.labels,view.labels);}
 }
 assert.equal(new Set(seen).size,45);assert.equal(seen.length,45);
 assert.equal(southIndustryMapSector('sc-overview').id,'sc-south-resources');
 assert.equal(southIndustryMapSector(null).id,'sc-south-resources');
 assert.deepEqual(southIndustryMapView('sc-south-services','NPL').sites.map(s=>s.id),['sc-pokhara-tourism']);
});

test('Short local labels have no long leaders, overlaps or selection-dependent placement',()=>{
 for(const sector of southIndustrySectors)for(const viewport of [{width:960,height:640},{width:640,height:600},{width:360,height:520}]){
  const view=southIndustryMapView(sector.id),[west,south,east,north]=southIndustryMapBounds,merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  const scale=Math.min((viewport.width-40)/((east-west)*Math.PI/180),(viewport.height-40)/(merc(north)-merc(south)));
  const project=([lng,lat])=>({x:viewport.width/2+(lng-(west+east)/2)*Math.PI/180*scale,y:viewport.height/2+((merc(south)+merc(north))/2-merc(lat))*scale});
  const layout=southIndustryLabelLayout(view.labels,project,viewport,view.sites.map(site=>site.point));
  const named=layout.filter(label=>label.placement);assert(named.length>=3,sector.id+' has readable geographic text');
  assert.equal(new Set(named.map(item=>item.label.group)).size,sector.groups.length,'Each sector industry has a readable place before adding repeated labels');
  for(const item of named){const {box,offset}=item.placement;assert(Math.hypot(...offset)<=13);assert.equal(item.size.height,30);assert(item.size.width<=132);assert(box.left>=5&&box.top>=5&&box.right<=viewport.width-5&&box.bottom<=viewport.height-5);}
  for(let a=0;a<named.length;a++)for(let b=a+1;b<named.length;b++){const x=named[a].placement.box,y=named[b].placement.box;assert(x.right<=y.left||y.right<=x.left||x.bottom<=y.top||y.bottom<=x.top);}
  for(const topic of sector.groups){const selected=southIndustryMapView(topic);assert.deepEqual(southIndustryLabelLayout(selected.labels,project,viewport,selected.sites.map(site=>site.point)),layout);}
 }
});

test('Regional reading, inventory, legend and statistics follow the same map sector',async()=>{
 const bundle=await build({stdin:{contents:"import {createSouthIndustryReading} from './src/scripts/atlas-south-asia-industry-reading.ts';window.createReading=createSouthIndustryReading;",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
 const window=new Window();
 try{
  const selectors=['industry-title','industry-lead','industry-definition','industry-value','industry-coverage','industry-status','industry-retry','industry-detail-label','industry-search-label','grid-reading','map-title','map-period','map-eyebrow','map-gesture','industry-scale','industry-legend-title','industry-legend-note','industry-method','industry-content','south-statistics-title','industry-navigation-label','industry-current-map','industry-navigation-note'];
  window.document.body.innerHTML='<main>'+selectors.map(s=>`<div data-${s}></div>`).join('')+'<section data-south-industry-statistics>'+groups.flatMap(g=>[0,1,2].map(()=>`<section data-south-industry-evidence="${g.id}"></section>`)).join('')+'</section>'+southIndustrySectors.map(s=>`<button data-south-industry-sector="${s.id}"></button>`).join('')+'</main>';
  window.eval(bundle.outputFiles[0].text);const root=window.document.querySelector('main');let choice=null;
  const controller=window.createReading(root,groups,sites,southIndustryOverview,id=>choice=id);
  const camera={lng:79,lat:20,zoom:3};let state={field:'industry',place:null,detail:null,camera};
  for(const sector of southIndustrySectors){
   state={...state,topic:sector.id,detail:null};const topic={id:sector.id,title:sector.title,kind:'regional'};controller.render(state,topic);
   assert.equal(root.querySelector('[data-industry-scale]').children.length,sector.groups.length);
   const buttons=[...root.querySelectorAll('[data-south-industry-site-choice]')];assert.deepEqual(new Set(buttons.map(b=>b.dataset.southIndustrySiteChoice)),new Set(southIndustryMapView(sector.id).sites.map(s=>s.id)));
   assert.equal(root.querySelectorAll('[data-south-industry-evidence]:not([hidden])').length,sector.groups.length*3);
   assert.match(root.querySelector('[data-map-title]').textContent,new RegExp(sector.title));
   root.querySelector('[data-industry-content] > details').open=true;
   for(const site of southIndustryMapView(sector.id).sites){state={...state,detail:site.id};controller.render(state,topic);const panel=root.querySelector('[data-south-industry-selected]');assert.equal(panel.hidden,false);assert(panel.textContent.includes(site.name));assert(panel.textContent.includes(site.scaleLabel));assert.equal(root.querySelector('[data-industry-content] > details').open,true);assert.equal(root.querySelectorAll('[data-south-industry-evidence]:not([hidden])').length,3);}
   root.querySelector('.south-industry-clear').click();assert.equal(choice,'');assert.deepEqual(state.camera,camera);
  }
  controller.render({...state,topic:'sc-south-resources',detail:'sc-bengaluru-it'},{id:'sc-south-resources',kind:'regional'});assert.equal(root.querySelector('[data-south-industry-selected]').hidden,true);
  controller.render({...state,topic:'sc-it',detail:null},{id:'sc-it',kind:'regional'});assert.equal(root.querySelector('[data-industry-scale]').children.length,2);assert.equal(root.querySelectorAll('[data-south-industry-site-choice]').length,8);
  controller.render({...state,field:'agriculture'},{id:'rice',kind:'regional'});assert.equal(root.querySelector('[data-south-industry-statistics]').hidden,true);
 }finally{await window.happyDOM.close();stop();}
});
