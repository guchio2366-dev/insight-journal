import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createAsiaNavigation} from '../../src/scripts/atlas-asia-navigation.ts';
import {createEastIndustryClusters} from '../../src/scripts/atlas-east-asia-industry-clusters.ts';
import {eastSectors,eastSectorIndustries,eastSectorTopics} from '../../src/data/atlas/east-asia-industry-sectors.ts';

test('East sector navigation uses one native picker, restores selections and has no false missing-map notice',async()=>{
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 const region={topics:eastSectorTopics,countries:['CHN','JPN','KOR','TWN','MNG','PRK']};
 const camera={lng:118,lat:32,zoom:3.4};let state={field:'industry',topic:'east-clusters',sector:null,place:null,detail:null,city:null,camera};
 window.document.body.innerHTML=`<div data-region="east-asia"><div data-industry-navigation>
 ${eastSectors.map(s=>`<button data-east-industry-sector="${s.id}"></button><label class="east-industry-choices" data-east-industry-kinds="${s.id}"><select data-east-industry-item="${s.id}"><option value="${s.topic}">この分野の分布</option>${eastSectorIndustries.filter(i=>i.sectors.includes(s.id)).map(i=>`<option value="east-${i.id}">${i.label}</option>`).join('')}</select></label>`).join('')}
 <p data-industry-navigation-note></p></div><div data-east-cluster-reading>
 <h2 data-east-cluster-title></h2><p data-east-cluster-lead></p><p data-east-cluster-reason></p>
 <button data-east-industry-only></button><button data-east-industry-clear></button><div data-east-cluster-detail></div><div data-east-cluster-sources></div><div data-east-industry-site-list></div>
 </div></div>`;
 const root=window.document.querySelector('[data-region]');let clusters,navigation;
 const render=()=>{clusters.render();navigation.render();};
 const navigate=(next,fit)=>{assert.equal(fit,false);assert.deepEqual(next.camera,camera);state=next;render();};
 clusters=createEastIndustryClusters(root,()=>state,navigate,()=>camera);
 navigation=createAsiaNavigation(root,region,()=>state,navigate,()=>{},()=>{},()=>{});
 const check=sector=>{
  assert.deepEqual([...root.querySelectorAll('[data-east-industry-kinds]')].filter(n=>!n.hidden).map(n=>n.dataset.eastIndustryKinds),[sector]);
  assert.equal(root.querySelector('[data-industry-navigation-note]').hidden,true,'a sourced clusters map is available');
 };
 try{
  render();check('manufacturing');
  for(const sector of eastSectors){
   root.querySelector(`[data-east-industry-sector="${sector.id}"]`).click();check(sector.id);
   for(const kind of eastSectorIndustries.filter(i=>i.sectors.includes(sector.id))){
    const picker=root.querySelector(`[data-east-industry-item="${sector.id}"]`);picker.value='east-'+kind.id;picker.dispatchEvent(new window.Event('change'));check(sector.id);
    assert.equal(state.topic,'east-'+kind.id);assert.equal(state.sector,sector.id);
   }
   root.querySelector('[data-east-industry-clear]').click();check(sector.id);
   const saved={...state};state={...state,field:'population',topic:'density'};render();
   assert.equal(root.querySelector('[data-industry-navigation]').hidden,true);
   state=saved;render();check(sector.id);assert.equal(root.querySelector(`[data-east-industry-item="${sector.id}"]`).value,saved.topic);
  }
 }finally{globalThis.document=previous;await window.happyDOM.close();}
});

test('shared navigation retains genuine missing-subsector notices outside East clusters',async()=>{
 const window=new Window();
 window.document.body.innerHTML='<div data-region="south-central-asia"><div data-industry-navigation></div><p data-industry-navigation-note></p></div>';
 const root=window.document.querySelector('[data-region]'),region={topics:[{id:'manufacturing',title:'地域の製造業',kind:'national'}],countries:['IND']};
 let state={field:'industry',topic:'manufacturing',sector:'services',subsector:'all',place:null};
 const navigation=createAsiaNavigation(root,region,()=>state,()=>{},()=>{},()=>{},()=>{});
 try{
  navigation.render();assert.equal(root.querySelector('[data-industry-navigation-note]').hidden,false);
  state={...state,sector:'manufacturing'};navigation.render();assert.equal(root.querySelector('[data-industry-navigation-note]').hidden,true);
 }finally{await window.happyDOM.close();}
});
