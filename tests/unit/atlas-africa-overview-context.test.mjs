import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';
import {readState,writeState,cropChoices,livestockChoices,cropMeasureChoices,canonicalAgriLayers,agriLayerKeys} from '../../src/data/atlas/africa-atlas.ts';

const mapController=await readFile('src/scripts/atlas-africa-overview-map.ts','utf8');
const pageController=(await readFile('src/scripts/atlas-africa-overview.ts','utf8')).replace(/^import \{[^}]+\} from ['"](?:\.\/atlas-africa-overview-map|\.\.\/data\/atlas\/africa-atlas)['"];?\r?\n/gm,'');
const choices=`const cropChoices=${JSON.stringify(cropChoices)},livestockChoices=${JSON.stringify(livestockChoices)},cropMeasureChoices=${JSON.stringify(cropMeasureChoices)},agriLayerKeys=${JSON.stringify(agriLayerKeys)},canonicalAgriLayers=${canonicalAgriLayers.toString()};`;
const controller=(await transform(choices+'\n'+mapController+'\n'+pageController+'\nglobalThis.africaOverviewTest={initAfricaOverview};',{loader:'ts',format:'iife'})).code;

function page(search){
 const w=new Window({url:'https://example.com/insight-journal/atlas/africa/overview/'+search,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const topicIds=['nature','agriculture','industry','population','politics'];
 const fields=['overview','agriculture','nature','industry','population'];
 const countries=['NGA','TZA'].map(code=>({code,name:code,takeaway:'Country reading',readings:topicIds.map(id=>({id,title:id,paragraphs:['Reading'],sources:[]}))}));
 const config={regionId:'africa',regionLabel:'Africa',bounds:[-27,-36,64,39],width:1000,height:800,countries,cities:[],topics:topicIds.map(id=>({id,label:id})),fields:fields.map(id=>({id,href:id==='overview'?'/insight-journal/atlas/africa/overview/':'/insight-journal/atlas/africa/?field='+id}))};
 w.document.body.innerHTML=`<main data-africa-overview>
  <script data-ao-config type="application/json">${JSON.stringify(config)}</script>
  <select data-ao-country><option value=""></option>${countries.map(c=>`<option value="${c.code}">${c.name}</option>`).join('')}</select>
  <select data-ao-topic>${topicIds.map(id=>`<option value="${id}">${id}</option>`).join('')}</select>
  <div data-overview-map-stage><svg data-overview-map></svg></div>
  <div data-ao-region-reading></div><div data-ao-country-reading></div>
  <span data-ao-location></span><span data-ao-country-name></span><span data-ao-takeaway></span><span data-ao-announcement></span>
  ${topicIds.map(id=>`<section data-ao-panel="${id}"><h2 data-ao-panel-title></h2><div data-ao-panel-copy></div><ul data-ao-panel-sources></ul></section>`).join('')}
  ${fields.map(id=>`<a data-ao-field="${id}" href="#">${id}</a>`).join('')}
 </main>`;
 const stage=w.document.querySelector('[data-overview-map-stage]');Object.defineProperty(stage,'clientWidth',{value:645});Object.defineProperty(stage,'clientHeight',{value:416});
 w.eval(controller);w.africaOverviewTest.initAfricaOverview(w.document.querySelector('[data-africa-overview]'));return w;
}

function fieldQuery(w,field){return new URL(w.document.querySelector(`[data-ao-field=${field}]`).href).searchParams;}

test('Africa overview retains all canonical crop, crop measure and livestock selections through field round trips',async()=>{
 const initial=page('?place=NGA&field=agriculture');
 try{
  for(const crop of cropChoices)for(const cropMeasure of cropMeasureChoices)for(const livestock of livestockChoices){
   const q=new URLSearchParams({place:'NGA',compare:'TZA',field:'agriculture',topic:'farming',metric:'AG.LND.ARBL.ZS',crop:crop.id,cropMeasure:cropMeasure.id,livestock:livestock.id,year:'2023',view:'distribution',layerClass:'crop-3',layerPoint:'7.5,9.5'});
   const w=page('?'+q);
   try{
    for(const field of ['overview','agriculture','nature','industry','population']){
     const out=fieldQuery(w,field);assert.equal(out.get('crop'),crop.id);assert.equal(out.get('cropMeasure'),cropMeasure.id);assert.equal(out.get('livestock'),livestock.id);
    }
    const out=fieldQuery(w,'agriculture'),state=readState('?'+out);
    assert.equal(state.crop,crop.id);assert.equal(state.cropMeasure,cropMeasure.id);assert.equal(state.livestock,livestock.id);assert.equal(state.year,2023);assert.equal(state.compare,'TZA');
    const overview=writeState(state,new URL('https://example.com/insight-journal/atlas/africa/overview/'));
    const back=page(overview.search);
    try{const restored=fieldQuery(back,'agriculture');assert.equal(restored.get('crop'),crop.id);assert.equal(restored.get('cropMeasure'),cropMeasure.id);assert.equal(restored.get('livestock'),livestock.id);assert.equal(restored.get('layerClass'),'crop-3');assert.equal(restored.get('layerPoint'),'7.5,9.5');}
    finally{await back.happyDOM.close();}
   }finally{await w.happyDOM.close();}
  }
 }finally{await initial.happyDOM.close();}
});

test('Africa overview rejects noncanonical commodity query values using the same enums as main state',async()=>{
 for(const values of [{crop:'MAIZ',livestock:'cow',cropMeasure:'yield'},{crop:'rice ',livestock:'goat',cropMeasure:'Production'},{crop:'',livestock:'',cropMeasure:''}]){
  const w=page('?'+new URLSearchParams({place:'NGA',field:'agriculture',...values}));
  try{for(const field of ['overview','agriculture','nature']){const q=fieldQuery(w,field);for(const key of ['crop','livestock','cropMeasure'])assert.equal(q.has(key),false);}const state=readState('?'+fieldQuery(w,'agriculture'));assert.equal(state.crop,'maize');assert.equal(state.livestock,'cattle');assert.equal(state.cropMeasure,'harvested');}
  finally{await w.happyDOM.close();}
 }
});

test('Africa overview keeps commodity and comparison source state after country changes and popstate',async()=>{
 const snapshot='field=agriculture&topic=farming&crop=cassava&cropMeasure=production&livestock=sheep&year=2021';
 const w=page('?'+new URLSearchParams({place:'NGA',compare:'TZA',field:'agriculture',topic:'farming',crop:'cassava',cropMeasure:'production',livestock:'sheep',sourceState:snapshot}));
 try{
  assert.equal(fieldQuery(w,'agriculture').get('sourceState'),snapshot);
  const select=w.document.querySelector('[data-ao-country]');select.value='TZA';select.dispatchEvent(new w.Event('change',{bubbles:true}));
  const changed=fieldQuery(w,'agriculture');assert.equal(changed.get('place'),'TZA');assert.equal(changed.has('compare'),false);assert.equal(changed.get('crop'),'cassava');assert.equal(changed.get('cropMeasure'),'production');assert.equal(changed.get('livestock'),'sheep');
  w.history.replaceState(null,'','?place=NGA&field=agriculture&topic=livestock&crop=wheat&cropMeasure=harvested&livestock=goats');w.dispatchEvent(new w.PopStateEvent('popstate'));
  const restored=fieldQuery(w,'agriculture');assert.equal(restored.get('topic'),'livestock');assert.equal(restored.get('crop'),'wheat');assert.equal(restored.get('cropMeasure'),'harvested');assert.equal(restored.get('livestock'),'goats');
 }finally{await w.happyDOM.close();}
});

test('Africa overview retains mixed layers, explicit all-off and outline state through every field and back',async()=>{
 for(const layers of ['livestock-goats,crop-rice-production,crop-maize-production',''])for(const outline of [false,true]){
  const canonical=canonicalAgriLayers(layers),q=new URLSearchParams({place:'NGA',field:'agriculture',topic:'farming',crop:'rice',cropMeasure:'production',livestock:'goats',agriLayers:layers});if(outline)q.set('agriOutline','1');
  const w=page('?'+q);
  try{
   for(const field of ['overview','agriculture','nature','industry','population']){
    const out=fieldQuery(w,field);assert.equal(out.has('agriLayers'),true);assert.equal(out.get('agriLayers'),canonical);assert.equal(out.get('agriOutline'),outline?'1':null);
    if(field!=='overview'){const state=readState('?'+out);assert.equal(state.agriLayers,canonical);assert.equal(state.agriOutline,outline);assert.equal(state.crop,'rice');assert.equal(state.livestock,'goats');}
   }
   const state=readState('?'+fieldQuery(w,'agriculture')),back=page(writeState(state,new URL('https://example.com/insight-journal/atlas/africa/overview/')).search);
   try{const restored=fieldQuery(back,'agriculture');assert.equal(restored.has('agriLayers'),true);assert.equal(restored.get('agriLayers'),canonical);assert.equal(restored.get('agriOutline'),outline?'1':null);assert.equal(restored.get('crop'),'rice');assert.equal(restored.get('cropMeasure'),'production');assert.equal(restored.get('livestock'),'goats');}
   finally{await back.happyDOM.close();}
  }finally{await w.happyDOM.close();}
 }
});

test('Africa overview changes country without turning all-off back on and restores mixed layers on popstate',async()=>{
 const w=page('?place=NGA&field=agriculture&crop=rice&agriLayers=&agriOutline=1');
 try{
  const picker=w.document.querySelector('[data-ao-country]');picker.value='TZA';picker.dispatchEvent(new w.Event('change',{bubbles:true}));const changed=fieldQuery(w,'agriculture');assert.equal(changed.get('place'),'TZA');assert.equal(changed.has('agriLayers'),true);assert.equal(changed.get('agriLayers'),'');assert.equal(changed.get('agriOutline'),'1');assert.equal(changed.get('crop'),'rice');
  w.history.replaceState(null,'','?place=NGA&field=agriculture&crop=wheat&agriLayers=livestock-sheep,crop-wheat-harvested');w.dispatchEvent(new w.PopStateEvent('popstate'));const restored=fieldQuery(w,'agriculture');assert.equal(restored.get('agriLayers'),'crop-wheat-harvested,livestock-sheep');assert.equal(restored.has('agriOutline'),false);assert.equal(restored.get('crop'),'wheat');
 }finally{await w.happyDOM.close();}
});
