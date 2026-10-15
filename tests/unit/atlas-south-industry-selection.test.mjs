import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
import {southIndustrySites,southIndustryCatalog} from '../../src/data/atlas/south-asia-major-industries.ts';
import {southIndustrySectors} from '../../src/data/atlas/south-asia-industry-sectors.ts';

test('South Asia source, hit targets and compact labels contain only one sector; product and place choices preserve its layout',async()=>{
 const bundle=await build({stdin:{contents:"import {createAsiaIndustry} from './src/scripts/atlas-asia-industry.ts';window.createAsiaIndustry=createAsiaIndustry;",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent',plugins:[{name:'map-marker',setup(build){
  build.onResolve({filter:/^maplibre-gl$/},()=>({path:'marker',namespace:'test-marker'}));
  build.onLoad({filter:/.*/,namespace:'test-marker'},()=>({contents:`export class Marker {
   constructor(options){this.options=options;window.reviewMarkers.push(this);}
   setLngLat(point){this.point=point;return this;}
   addTo(map){map.element.append(this.options.element);return this;}
   remove(){this.options.element.remove();}
  }`,loader:'js'}));
 }}]});
 const window=new Window();
 try{
  window.reviewMarkers=[];
  window.document.body.innerHTML='<div data-root data-region="south-central-asia"><div class="asia-map-frame"></div><button data-industry-retry></button><select data-industry-detail></select><input data-industry-search><select data-industry-topic></select></div>';
  window.eval(bundle.outputFiles[0].text);
  const root=window.document.querySelector('[data-root]'),element=root.querySelector('.asia-map-frame');
  const sources=new Map(),layers=new Map(),camera={lng:80,lat:20,zoom:3,bearing:0,pitch:0};
  const map={element,on(){},getSource:id=>sources.get(id),addSource:(id,source)=>sources.set(id,{...source,setData(data){this.data=data}}),getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),setLayoutProperty(){},setFilter(){},getCanvas:()=>({getBoundingClientRect:()=>({width:960,height:680})}),project:([lng,lat])=>({x:(lng-60)*17,y:(36-lat)*17})};
  const industry=JSON.parse(readFileSync('public/assets/atlas/asia-industry-v1/manifest.json','utf8')).regions['south-central-asia'];
  // AsiaAtlasPage adds this regional entry ahead of the statistical catalog.
  industry.topics.unshift({id:'sc-overview',kind:'regional'},...southIndustrySectors.map(s=>({id:s.id,kind:'regional'})),...southIndustryCatalog.map(g=>({id:g.id,kind:'regional'})));
  const countries=['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK'],sites=southIndustrySites.filter(site=>countries.includes(site.country));
  let state={field:'industry',topic:'sc-overview',place:null,detail:null,camera:null};
  const controller=window.createAsiaIndustry(root,{industry,industryBase:'',focusId:'south-asia',countries:countries.map(code=>({code,name:code})),industrySites:sites,industryGroups:southIndustryCatalog},()=>state,(next,fit)=>{assert.equal(fit,false);state=next;},()=>camera,()=>{});
  const snapshot=()=>window.reviewMarkers.filter(marker=>marker.options.element.isConnected).map(({options,point})=>({id:options.element.dataset.industrySite,name:options.element.textContent,compact:options.element.classList.contains('is-compact'),anchor:options.anchor,offset:Array.from(options.offset),point:Array.from(point)}));
  for(const sector of southIndustrySectors){
   state={...state,topic:sector.id,detail:null};await controller.show(map);
   const before=snapshot(),members=sites.filter(site=>sector.groups.includes(site.group));
   assert(before.length>0);assert(before.length<=14);
   assert.deepEqual(sources.get('asia-industry-regional').data.features.map(f=>f.properties.id),members.map(site=>site.id));
   for(const label of before){assert(members.some(site=>site.id===label.id));assert.equal(label.compact,false);assert.deepEqual(label.point,members.find(site=>site.id===label.id).point);}
   for(const product of sector.groups){state={...state,topic:product};await controller.show(map);assert.deepEqual(snapshot(),before,product+' preserves the sector label positions');}
   for(const site of members){
    controller.select(site.id);await controller.show(map);
    assert.equal(state.detail,site.id);assert.deepEqual(state.camera,camera);
    assert.deepEqual(snapshot(),before,site.id+' changes only selection emphasis');
   }
   const other=sites.find(site=>!sector.groups.includes(site.group));
   controller.select(other.id);await controller.show(map);
   assert.equal(state.detail,null,'An old cross-sector hit cannot select an excluded location');
   assert.deepEqual(snapshot(),before);
   controller.select('');await controller.show(map);assert.equal(state.detail,null);assert.deepEqual(snapshot(),before);
  }
  assert.equal(controller.normalize({...state,topic:'sc-overview',detail:null}).topic,'sc-south-resources');
  assert.equal(controller.normalize({...state,topic:'sc-overview',detail:'sc-bengaluru-it',place:null}).topic,'sc-south-services');
 }finally{await window.happyDOM.close();stop();}
});
