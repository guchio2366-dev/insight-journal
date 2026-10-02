import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {europeCountryOverviews,europeCountryOverviewSources,europeOverviewTopics,overviewFactIds,formatOverviewFact} from '../../src/data/atlas/europe/country-overviews.ts';
import countries from '../../src/data/atlas/europe/countries.json' with {type:'json'};

const bundles=await Promise.all(['atlas-europe-country-overview','atlas-europe-country-overview-return'].map(name=>build({entryPoints:[new URL(`../../src/scripts/${name}.ts`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1')],bundle:true,write:false,format:'iife',globalName:'OverviewModule',platform:'browser'})));
const config={width:1200,height:900,basePath:'/insight-journal',countries,cities:[{id:'berlin',name:'ベルリン',country:'DEU',point:[650,350],capital:true,rank:1}],topics:europeOverviewTopics,fields:['agriculture','nature','industry','population'].map(id=>({id,href:`/insight-journal/atlas/europe/${id}/`})),overviews:europeCountryOverviews.map(item=>({...item,facts:item.facts.map(fact=>({...fact,valueText:formatOverviewFact(fact)}))})),sources:europeCountryOverviewSources,factIds:overviewFactIds};
function setup(search='?country=DEU&topic=agriculture'){
 const window=new Window({url:`https://example.test/insight-journal/atlas/europe/overview/${search}`,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.body.innerHTML=`<article data-country-overview><select data-overview-country><option value=""></option>${countries.map(c=>`<option value="${c.code}">${c.name}</option>`).join('')}</select><div data-overview-map-stage><svg data-overview-map>${countries.map(c=>`<path data-overview-map-country="${c.code}"></path>`).join('')}</svg><button data-overview-reset>全体へ</button></div><div class="overview-region-reading" data-overview-region-reading><h2>欧州</h2><p class="overview-region-intro">地域の要点</p></div><div data-overview-place-summary><strong data-overview-place-title></strong><p data-overview-place-description></p><a data-overview-detail-link></a></div><div data-overview-europe-country-slot hidden></div><section data-overview-country-detail hidden><span data-eu-country-selected-city hidden></span><h2 data-overview-country-name></h2>${europeOverviewTopics.map(t=>`<button data-overview-topic="${t.id}" role="tab">${t.label}</button><section id="overview-panel-${t.id}"><p data-eu-country-takeaway></p><p data-eu-country-body></p><nav data-eu-country-links></nav><section data-eu-country-facts><dl data-eu-country-fact-list></dl></section><p data-eu-country-evidence-note></p><ul data-eu-country-sources></ul></section>`).join('')}<dl data-eu-country-all-facts></dl></section>${config.fields.map(f=>`<a data-overview-field="${f.id}">${f.id}</a>`).join('')}<a data-overview-current-link href="/insight-journal/atlas/europe/overview/"></a><p data-overview-announcement></p><script type="application/json" data-overview-config>${JSON.stringify(config)}</script></article>`;
 window.eval(bundles[0].outputFiles[0].text+';window.testOverviewModule=OverviewModule;');const root=window.document.querySelector('article');window.testOverviewModule.initEuropeCountryOverview(root);
 return{window,root,close:()=>window.happyDOM.abort()};
}
function countrySelect(s,code){const picker=s.root.querySelector('[data-overview-country]');picker.value=code;picker.dispatchEvent(new s.window.Event('change'));}
function topicSelect(s,id){s.root.querySelector(`[data-overview-topic="${id}"]`).click();return s.root.querySelector(`#overview-panel-${id}`);}

test('actual overview controller renders all 45×5 country-specific copies and matching sources/entry routes',()=>{
 const s=setup();try{
  for(const country of europeCountryOverviews){countrySelect(s,country.code);
   assert.equal(s.root.dataset.overviewSelectedCountry,country.code);
   assert.equal(s.root.querySelector('[data-overview-country-name]').textContent,country.name);
   assert.equal(s.root.querySelector('[data-overview-region-reading]').hidden,true);
   for(const topic of europeOverviewTopics){const panel=topicSelect(s,topic.id),copy=country.topics[topic.id];
    assert.equal(panel.hidden,false);assert.equal(panel.querySelector('[data-eu-country-takeaway]').textContent,copy.takeaway);assert.equal(panel.querySelector('[data-eu-country-body]').textContent,copy.body);
    assert.equal(s.root.querySelectorAll('[aria-selected="true"]').length,1);
    assert.equal(panel.querySelectorAll('[data-eu-country-sources] li').length,copy.sourceIds.length);
    const actual=[...panel.querySelectorAll('[data-eu-country-links] a')];assert.equal(actual.length,copy.links.length);
    for(const link of actual){const u=new URL(link.href);if(u.pathname.startsWith('/insight-journal/atlas/europe/')){assert.equal(u.searchParams.get('place'),country.code);const target=new URL(u.searchParams.get('overviewReturn'),u);assert.equal(target.searchParams.get('country'),country.code);assert.equal(target.searchParams.get('topic'),topic.id);}}
   }
  }
 }finally{s.close();}
});

test('zero, negative growth and missing values survive the UI; missing is never displayed as zero',()=>{
 const s=setup();try{
  countrySelect(s,'MCO');let panel=topicSelect(s,'agriculture');assert.match(panel.querySelector('[data-eu-country-fact-list]').textContent,/森林面積比率0 陸地面積比 %/);
  countrySelect(s,'VAT');panel=topicSelect(s,'population');assert.equal(panel.querySelector('[data-eu-country-facts]').hidden,true);assert.equal(s.root.querySelectorAll('[data-eu-country-all-facts] dd').length,10);for(const dd of s.root.querySelectorAll('[data-eu-country-all-facts] dd'))assert.equal(dd.textContent,'未掲載');
  countrySelect(s,'ITA');topicSelect(s,'population');const growth=europeCountryOverviews.find(c=>c.code==='ITA').facts.find(f=>f.id==='growth');assert.ok(growth.value<0);assert.ok(s.root.querySelector('[data-eu-country-all-facts]').textContent.includes(formatOverviewFact(growth)));
 }finally{s.close();}
});

test('country/topic/city URL reload, keyboard tabs, popstate, reset and named field return preserve the original question',()=>{
 const s=setup('?country=DEU&topic=politics&city=berlin');try{
  assert.equal(s.root.querySelector('#overview-panel-politics').hidden,false);
  const cityLabel=s.root.querySelector('[data-eu-country-selected-city]');assert.equal(cityLabel.closest('[hidden]'),null);assert.match(cityLabel.textContent,/ベルリン/);
  let link=new URL(s.root.querySelector('[data-overview-field="nature"]').href),target=new URL(link.searchParams.get('overviewReturn'),link);assert.equal(target.searchParams.get('city'),'berlin');assert.equal(target.searchParams.get('topic'),'politics');
  s.root.querySelector('[data-overview-topic="politics"]').dispatchEvent(new s.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(new URL(s.window.location.href).searchParams.get('topic'),'agriculture');assert.equal(s.window.document.activeElement.dataset.overviewTopic,'agriculture');
  countrySelect(s,'FIN');assert.equal(new URL(s.window.location.href).searchParams.has('city'),false);
  assert.equal(cityLabel.hidden,true);assert.equal(cityLabel.textContent,'');
  s.window.history.replaceState({},'','?country=VAT&topic=politics');s.window.dispatchEvent(new s.window.PopStateEvent('popstate'));assert.equal(s.root.dataset.overviewSelectedCountry,'VAT');assert.equal(s.root.querySelector('#overview-panel-politics').hidden,false);
  s.root.querySelector('[data-overview-reset]').click();assert.equal(s.root.querySelector('[data-overview-region-reading]').hidden,false);assert.equal(s.root.querySelector('[data-overview-europe-country-slot]').hidden,true);assert.equal(new URL(s.window.location.href).searchParams.has('country'),false);
 }finally{s.close();}
});

test('field arrival inserts one country-named return and rejects an external return URL',()=>{
 for(const [returnTo,expected] of [['/insight-journal/atlas/europe/overview/?country=DEU&topic=politics','ドイツ'],['https://other.test/atlas/europe/overview/?country=DEU&topic=politics',null]]){
  const window=new Window({url:`https://example.test/insight-journal/atlas/europe/nature/?place=DEU&overviewReturn=${encodeURIComponent(returnTo)}`,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});try{
   window.document.body.innerHTML='<article><nav class="eu-breadcrumb"></nav></article>';window.eval(bundles[1].outputFiles[0].text+';window.testOverviewModule=OverviewModule;');const root=window.document.querySelector('article');window.testOverviewModule.initEuropeCountryOverviewReturn(root);window.testOverviewModule.initEuropeCountryOverviewReturn(root);
   assert.equal(root.querySelectorAll('[data-eu-country-overview-return]').length,expected?1:0);if(expected){const a=root.querySelector('a');assert.match(a.textContent,new RegExp(expected));assert.equal(new URL(a.href).searchParams.get('topic'),'politics');}
  }finally{window.happyDOM.abort();}
 }
});
