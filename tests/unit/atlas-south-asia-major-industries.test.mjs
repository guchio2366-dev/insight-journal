import test from 'node:test';
import assert from 'node:assert/strict';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
import {southIndustryCatalog as groups,southIndustrySites as sites,southIndustrySources as sources,southIndustryOverview} from '../../src/data/atlas/south-asia-major-industries.ts';
import {southIndustrySectors} from '../../src/data/atlas/south-asia-industry-sectors.ts';
import {asiaFocusCountries,asiaFocusIndustry} from '../../src/data/atlas/asia-focus.ts';

test('All ten proposals and both additions have multiple evidenced places, typed statistics and three-sector navigation',()=>{
 assert.deepEqual(new Set(groups.map(g=>g.id)),new Set(['sc-coal','sc-refining','sc-hydro','sc-textiles','sc-steel','sc-two-wheelers','sc-auto','sc-pharma','sc-tea','sc-rice','sc-it','sc-tourism']));
 assert.deepEqual(new Set(southIndustrySectors.flatMap(s=>s.groups)),new Set(groups.map(g=>g.id)));
 assert.equal(new Set(sites.map(s=>s.id)).size,sites.length);
 for(const g of groups){assert(sites.filter(s=>s.group===g.id).length>=2,g.id);for(const key of ['domestic','world','concentration']){assert(g[key].length,g.id+' '+key);for(const row of g[key]){assert(row.value===null||Number.isFinite(row.value));assert(row.year&&row.unit&&row.definition&&row.status);assert(sources[row.source]);assert.match(sources[row.source].url,/^https:\/\//);assert(row.countries.every(c=>asiaFocusCountries['south-asia'].includes(c)));if(row.unit==='%')assert(row.denominator,'Percentages have a named denominator');}}}
 for(const s of sites){assert(asiaFocusCountries['south-asia'].includes(s.country));assert(s.point.every(Number.isFinite));assert(s.kind&&s.evidenceYear&&s.locationPrecision);assert.equal(s.source.url,sources[s.sourceId].url);assert.equal(s.value,undefined,'Locator dots do not invent production weights');}
 assert(sites.some(s=>s.country==='BGD'));assert(sites.some(s=>s.country==='PAK'));assert(sites.some(s=>s.country==='LKA'));assert(sites.some(s=>s.country==='BTN'));assert(sites.some(s=>s.country==='NPL'));assert(sites.some(s=>s.country==='MDV'));
 assert.equal(asiaFocusIndustry('central-asia').groups.some(g=>['sc-coal','sc-rice','sc-two-wheelers'].includes(g.id)),false);
});

test('World shares keep their real country sets and missing global data remains null',()=>{
 const share=id=>groups.find(g=>g.id===id).world;
 assert(Math.abs(share('sc-steel')[0].value-164.9/1848.9*100)<1e-9);
 assert.deepEqual(share('sc-steel')[1].countries,['IND','BGD','PAK']);
 assert(Math.abs(share('sc-rice')[0].value-27.6/59.643*100)<1e-9);assert.match(share('sc-rice')[0].status,/推計/);
 assert.equal(share('sc-hydro')[0].countries.length,7);assert(!share('sc-hydro')[0].countries.includes('MDV'));
 for(const id of ['sc-textiles','sc-it'])assert.equal(share(id)[0].value,null);
 assert.match(groups.find(g=>g.id==='sc-pharma').concentration[0].year,/2020–21/);
 assert.equal(groups.find(g=>g.id==='sc-rice').agricultureTopic,'rice');
 assert.match(groups.find(g=>g.id==='sc-rice').reason,/一次生産.*精米/);
 assert.match(groups.find(g=>g.id==='sc-it').reason,/需給式/);
});

test('South Asia retains all 45 evidenced sites across independent sector maps with stable labels and scoped legends',async()=>{
 const bundle=await build({stdin:{contents:"import {createAsiaIndustry} from './src/scripts/atlas-asia-industry.ts';window.createAsiaIndustry=createAsiaIndustry;",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent',plugins:[{name:'marker',setup(b){b.onResolve({filter:/^maplibre-gl$/},()=>({path:'marker',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export class Marker{constructor(o){this.options=o;window.markers.push(this)}setLngLat(p){this.point=p;return this}addTo(m){m.element.append(this.options.element);return this}remove(){this.options.element.remove()}}',loader:'js'}));}}]});
 const window=new Window();
 try{
  window.markers=[];
  const selectors=['industry-title','industry-lead','industry-definition','industry-value','industry-coverage','industry-status','industry-retry','industry-detail-label','industry-search-label','grid-reading','map-title','map-period','map-eyebrow','map-gesture','industry-scale','industry-legend-title','industry-legend-note','industry-method','industry-content','industry-panel','industry-topics','industry-legend','south-statistics-title','industry-navigation-label','industry-current-map','industry-navigation-note'];
  window.document.body.innerHTML='<main data-asia-atlas data-region="south-central-asia" data-focus="south-asia"><div class="asia-map-frame"></div>'+selectors.map(s=>`<div data-${s}></div>`).join('')+'<select data-industry-topic></select><select data-industry-detail></select><input data-industry-search><section data-south-industry-statistics>'+groups.map(g=>`<section data-south-industry-evidence="${g.id}"></section>`).join('')+'</section></main>';
  window.eval(bundle.outputFiles[0].text);
  const root=window.document.querySelector('main'),element=root.querySelector('.asia-map-frame'),layers=new Map(),data=new Map();
  const map={element,on(){},getSource:id=>data.get(id),addSource:(id,s)=>data.set(id,{...s,setData(value){this.data=value}}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),setLayoutProperty(){},setFilter(){},setPaintProperty(){},getCanvas:()=>({getBoundingClientRect:()=>({width:1080,height:720})}),project:([x,y])=>({x:(x-60)*22,y:(39-y)*18})};
  const camera={lng:80,lat:21,zoom:3,bearing:0,pitch:0};let state={field:'industry',topic:'sc-overview',place:null,detail:null,city:null,point:null,camera:null};
  const topics=[{id:'sc-overview',title:'分布全体',kind:'regional'},...southIndustrySectors.map(s=>({id:s.id,title:s.title,kind:'regional'})),...groups.map(g=>({id:g.id,title:g.title,kind:'regional'}))];
  const controller=window.createAsiaIndustry(root,{industry:{topics,countries:[...asiaFocusCountries['south-asia']]},industryBase:'',focusId:'south-asia',countries:asiaFocusCountries['south-asia'].map(code=>({code,name:code})),industryGroups:groups,industrySites:sites,industryOverview:southIndustryOverview},()=>state,(next,fit)=>{assert.equal(fit,false);state=next;},()=>camera,()=>{});
  const snapshot=()=>window.markers.filter(m=>m.options.element.isConnected).map(m=>({id:m.options.element.dataset.industrySite,text:m.options.element.textContent,compact:m.options.element.classList.contains('is-compact'),anchor:m.options.anchor,offset:[...m.options.offset],point:[...m.point]}));
  const shown=new Set();
  const inventory=()=>root.querySelector('[data-industry-content] > details');
  for(const sector of southIndustrySectors){
   state={...state,topic:sector.id,detail:null};controller.render();await controller.show(map);
   const initial=snapshot(),members=sites.filter(site=>sector.groups.includes(site.group));
   assert(initial.length>0&&initial.length<=14);
   const features=data.get('asia-industry-regional').data.features;
   assert.deepEqual(features.map(f=>f.properties.id),members.map(site=>site.id));features.forEach(f=>shown.add(f.properties.id));
   assert.deepEqual([...root.querySelector('[data-industry-scale]').children].map(n=>n.textContent),groups.filter(g=>sector.groups.includes(g.id)).map(g=>g.title));
   for(const group of groups.filter(g=>sector.groups.includes(g.id))){state={...state,topic:group.id,detail:null};controller.render();await controller.show(map);assert.deepEqual(snapshot(),initial,group.id+' keeps its sector labels');const visible=[...root.querySelectorAll('[data-south-industry-evidence]')].filter(n=>!n.hidden);assert.deepEqual(visible.map(n=>n.dataset.southIndustryEvidence),[group.id]);}
   inventory().open=true;
   for(const site of members){controller.select(site.id);controller.render();await controller.show(map);assert.deepEqual(snapshot(),initial,site.id);assert.equal(state.detail,site.id);assert.deepEqual(state.camera,camera);assert.equal(inventory().open,true);assert(root.querySelector('[data-south-industry-selected]').textContent.includes(site.name));}
   controller.select('');controller.render();await controller.show(map);assert.deepEqual(snapshot(),initial);assert.equal(root.querySelector('[data-south-industry-selected]').hidden,true);
  }
  assert.deepEqual(shown,new Set(sites.map(site=>site.id)));
  assert.equal(controller.normalize({...state,topic:'sc-overview',place:'BGD',detail:'sc-bengaluru-it',point:[77,13]}).detail,null);
  assert.equal(controller.normalize({...state,detail:'unknown-site'}).detail,null);
  state={...state,field:'agriculture',topic:'rice'};controller.render();assert.equal(root.querySelector('[data-south-industry-statistics]').hidden,true);
 }finally{await window.happyDOM.close();stop();}
});
