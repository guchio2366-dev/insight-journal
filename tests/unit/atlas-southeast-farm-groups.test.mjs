import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {southeastFarmGroups,southeastFarmGroupTopics,southeastFarmGroup,southeastFarmVisibleProducts,southeastFarmOverviewTopic} from '../../src/data/atlas/asia/southeast-asia-farm-groups.ts';
import {southeastFarmCropLabels,renderSoutheastLivestockMarkers} from '../../src/lib/atlas-southeast-farm-map.ts';
import {createSoutheastFarmNavigation} from '../../src/scripts/atlas-southeast-farm-navigation.ts';
import {createAsiaNavigation} from '../../src/scripts/atlas-asia-navigation.ts';
import {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';

const manifest=JSON.parse(readFileSync('public/assets/atlas/asia-presentation-v1/manifest.json','utf8'));
const farm=manifest.regions['southeast-asia'].farming;
const camera={lng:110,lat:9,zoom:4};
const base={field:'agriculture',topic:'overview',place:'VNM',city:null,point:[108.1,12.7],detail:null,story:null,back:null,camera};

test('four farm views contain every existing product once, while forestry remains separate',()=>{
 assert.equal(southeastFarmGroups.length,4);
 const products=southeastFarmGroups.flatMap(group=>group.products);
 assert.equal(new Set(products).size,products.length);
 assert.deepEqual([...products].sort(),farm.products.map(product=>product.id).sort());
 assert.deepEqual(southeastFarmVisibleProducts('overview'),['rice','maize']);
 assert.equal(southeastFarmGroup('forest'),null);
 for(const group of southeastFarmGroups)for(const id of group.products){
  assert.equal(farm.products.find(product=>product.id===id).kind,group.kind);
  assert.equal(southeastFarmGroup(id).id,group.id);
  assert.equal(southeastFarmOverviewTopic(id),group.id);
  assert.deepEqual(southeastFarmVisibleProducts(id,true),[id]);
 }
});

test('each group and selected product survives URL reload, comparison and return at the same place',()=>{
 const context={countries:['VNM'],cities:[],bounds:[90,-12,142,28],fields:['natural','agriculture'],topics:{natural:['terrain'],agriculture:['overview','forest',...southeastFarmGroupTopics,...farm.products.map(product=>product.id)]}};
 const url=new URL('https://example.test/atlas/asia/southeast-asia/agriculture/');
 for(const topic of [...southeastFarmGroupTopics,...farm.products.map(product=>product.id)]){
  const before={...base,topic},reloaded=readAsiaAtlasState(writeAsiaAtlasState(url,before),context);
  assert.equal(reloaded.topic,topic);
  const comparison={...startAsiaComparison(url,reloaded,'natural'),topic:'terrain'};
  const returned=restoreAsiaComparison(url,comparison,context);
  assert.equal(returned.topic,topic);assert.deepEqual(returned.point,before.point);assert.deepEqual(returned.camera,camera);assert.equal(returned.place,'VNM');
  assert.equal(southeastFarmGroup(returned.topic).id,southeastFarmGroup(topic).id);
 }
});

test('common navigation switches the group, limits its choices and returns a product to its own group',async()=>{
 const window=new Window(),document=window.document,root=document.body;
 root.innerHTML=`<div data-agriculture-topics>${southeastFarmGroups.map(group=>`<button data-southeast-farm-group="${group.id}" data-farm-group-topic="${group.id}"></button>`).join('')}<button data-farm-group="forestry" data-farm-group-topic="forest"></button></div><button data-farm-choice="overview" hidden></button>${['crop','livestock'].map(kind=>`<div class="asia-farm-key-row">${farm.products.filter(product=>product.kind===kind).map(product=>`<button data-farm-choice="${product.id}" data-kind="${kind}"></button>`).join('')}</div>`).join('')}<label data-farming-selector><select data-farming-topic><option value="overview"></option>${[...farm.products.map(product=>product.id),'forest'].map(id=>`<option value="${id}">${id}</option>`).join('')}</select></label><a data-farm-insight-source href="https://example.test/source">source</a><p data-reading-dock-title></p><p data-reading-dock-summary></p><p data-farm-density-key></p><div data-farm-switches></div>`;
 let state={...base},common;
 const navigation=createSoutheastFarmNavigation(root,()=>state);
 const render=()=>{common?.render();navigation.render();};
 const chooseFarm=topic=>{state={...state,topic:topic==='overview'?southeastFarmOverviewTopic(state.topic):topic,single:false};render();};
 common=createAsiaNavigation(root,undefined,()=>state,next=>{state=next;render();},()=>{},()=>{},chooseFarm);
 const visible=()=>[...root.querySelectorAll('[data-farm-choice][data-kind]')].filter(button=>!button.hidden).map(button=>button.dataset.farmChoice);
 try{
  render();assert.deepEqual(visible(),['rice','maize']);assert.equal(root.querySelector('[data-farm-insight-source]').hidden,true);
  for(const group of southeastFarmGroups){
   root.querySelector(`[data-southeast-farm-group="${group.id}"]`).click();
   assert.equal(state.topic,group.id);assert.equal(root.dataset.southeastFarmGroup,group.id);assert.deepEqual(visible(),farm.products.filter(product=>group.products.includes(product.id)).map(product=>product.id));
   const product=group.products.at(-1);root.querySelector(`[data-farm-choice="${product}"]`).click();
   assert.equal(state.topic,product);assert.equal(root.dataset.southeastFarmGroup,group.id);assert.equal(root.querySelector('[data-farm-insight-source]').hidden,false);
   const back=root.querySelector(`[data-farm-choice="${group.id}"]`);assert.equal(back.hidden,false);back.click();assert.equal(state.topic,group.id);assert.equal(back.hidden,true);assert.equal(root.querySelector('[data-farm-insight-source]').hidden,true);
  }
  root.querySelector('[data-farm-group="forestry"]').click();
  assert.equal(state.topic,'forest');assert.equal(root.dataset.southeastFarmGroup,'forest');assert.equal(root.querySelector('[data-farming-selector]').hidden,true);
  root.querySelector('[data-southeast-farm-group="farm-grains"]').click();
  assert.equal(root.querySelector('[data-farming-selector]').hidden,false);assert.deepEqual(visible(),['rice','maize']);
  state={...base,overlay:'water'};render();assert.deepEqual(visible(),['rice']);assert.match(root.querySelector('[data-reading-dock-title]').textContent,/米.*雨.*川/);
 }finally{await window.happyDOM.close();}
});

test('crop names use only retained source anchors in the visible group and preserve the input',()=>{
 const original=JSON.stringify(farm.labels);
 for(const group of southeastFarmGroups){
  const labels=southeastFarmCropLabels(farm.labels,group.id);
  assert.ok(labels.every(label=>group.products.includes(label.product)));
  if(group.kind==='livestock')assert.equal(labels.length,0);
  else for(const product of group.products){const names=labels.filter(label=>label.product===product);assert.equal(names.length,2);for(const label of names)assert.ok(farm.labels.includes(label));}
 }
 assert.ok(southeastFarmCropLabels(farm.labels,'maize',true).every(label=>label.product==='maize'));
 assert.equal(JSON.stringify(farm.labels),original);
});

test('small livestock badges retain source points, names and keyboard buttons without crop clutter',async()=>{
 const window=new Window(),document=window.document,root=document.body,buttons=new Map();let selected=null;
 const bounds={left:0,top:0,right:1000,bottom:600},obstacles=[{left:900,top:0,right:1000,bottom:150}],leaders=[];
 const button=(id,text,kind,action)=>{let element=buttons.get(id);if(!element){element=document.createElement('button');element.type='button';element.onclick=action;root.append(element);buttons.set(id,element);}element.className=kind;element.textContent=text;element.hidden=true;return element;};
 const project=coordinate=>({x:(coordinate[0]-90)*18,y:(28-coordinate[1])*14});
 const render=topic=>{for(const element of buttons.values())element.hidden=true;return renderSoutheastLivestockMarkers({labels:farm.labels,topic,bounds,obstacles,project,button,chooseFarm:id=>{selected=id;},line:(...args)=>leaders.push(args)});};
 try{
  assert.equal(render('farm-grains').length,0);
  const placed=render('farm-livestock'),visible=[...buttons.values()].filter(element=>!element.hidden);
  assert.equal(visible.length,8);assert.equal(placed.length,visible.length);
  for(const product of ['cattle','buffalo','pig','chicken'])assert.equal(visible.filter(element=>element.dataset.southeastLivestock===product).length,2);
  for(const rect of placed){assert.ok(rect.left>=bounds.left&&rect.right<=bounds.right&&rect.top>=bounds.top&&rect.bottom<=bounds.bottom);assert.ok(!obstacles.some(box=>rect.left<box.right&&rect.right>box.left&&rect.top<box.bottom&&rect.bottom>box.top));}
  const chicken=visible.find(element=>element.dataset.southeastLivestock==='chicken');assert.equal(chicken.querySelector('span').textContent,'鶏');chicken.click();assert.equal(selected,'chicken');
  const points=new Set(farm.labels.filter(label=>label.kind==='livestock').map(label=>{const point=project(label.coordinate);return `${point.x},${point.y}`;}));
  assert.ok(leaders.every(([x,y])=>points.has(`${x},${y}`)));
  render('chicken');assert.equal([...buttons.values()].filter(element=>!element.hidden&&element.dataset.southeastLivestock==='chicken').length,3);
 }finally{await window.happyDOM.close();}
});


test('crop label limits apply after the viewport filter, keeping real mainland and island anchors',()=>{
 const islands={bounds:{left:0,top:0,right:1000,bottom:400},project:([lon,lat])=>({x:(lon-90)*20,y:(5-lat)*20})};
 const mainland={bounds:{left:0,top:0,right:400,bottom:320},project:([lon,lat])=>({x:(lon-90)*20,y:(26-lat)*20})};
 const rice=southeastFarmCropLabels(farm.labels,'farm-grains',false,islands).filter(label=>label.product==='rice');
 const maize=southeastFarmCropLabels(farm.labels,'farm-grains',false,mainland).filter(label=>label.product==='maize');
 assert.equal(rice.length,2);assert.ok(rice.some(label=>label.id==='rice-4'));
 assert.equal(maize.length,2);assert.ok(maize.some(label=>label.id==='maize-4'));
 for(const label of [...rice,...maize])assert.ok(farm.labels.includes(label),'retained source point, never a guessed label position');
});
