import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const route=await readFile('src/pages/atlas/north-america/overview/index.astro','utf8');
// Evaluate the real route adapter, including its DOM listeners, alongside the
// shared controller. Existing overview fixtures remove this inline script.
const adapter=route.match(/<script is:inline[^>]*>([\s\S]*?)<\/script>/)[1];
const mapController=await readFile('src/scripts/atlas-overview-map.ts','utf8');
const pageController=(await readFile('src/scripts/atlas-country-overview.ts','utf8')).replace(/^import .* from ['"]\.\/atlas-overview-map['"];?\r?\n/m,'');
const controller=(await transform(`${mapController}\n${pageController}\ninitCountryOverview(document.querySelector('[data-country-overview]'));`,{loader:'ts',format:'iife'})).code;
const html=await readFile('dist/atlas/north-america/overview/index.html','utf8');
const target='/insight-journal/atlas/north-america/mexico/overview/';
const mexicoCity='ne-1159151587';

async function page(search='',adapterFirst=true){
 const w=new Window({url:`https://example.test/insight-journal/atlas/north-america/overview/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.body.innerHTML=html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
 const stage=w.document.querySelector('[data-overview-map-stage]');Object.defineProperty(stage,'clientWidth',{value:1000});Object.defineProperty(stage,'clientHeight',{value:680});
 const redirects=[];w.location.replace=href=>redirects.push(new URL(href,w.location));
 const evaluateAdapter=()=>w.eval(`const mexicoOverview=${JSON.stringify(target)};\n${adapter}`);
 if(adapterFirst){evaluateAdapter();w.eval(controller);}else{w.eval(controller);evaluateAdapter();}
 return {w,redirects};
}

function assertMexico(url,state=null){assert.equal(url.pathname,target);assert.equal(url.searchParams.get('country'),'MEX');assert.equal(url.searchParams.get('state'),state);}

test('The actual Mexico route adapter resolves a city-only URL before or after shared initialization',async()=>{
 for(const adapterFirst of [true,false])for(const state of [null,'09']){const {w,redirects}=await page(`?city=${mexicoCity}${state?'&state='+state:''}`,adapterFirst);try{assert.equal(redirects.length,1);assertMexico(redirects[0],state);assert.equal(w.document.querySelector('[data-overview-country]').value,'MEX');}finally{await w.happyDOM.close();}}
});

test('The actual Mexico route adapter follows restored city-only history and country/map-city choices',async()=>{
 const {w,redirects}=await page('?country=CAN');try{
  assert.equal(redirects.length,0);w.history.replaceState({},'',`?city=${mexicoCity}&state=15`);w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.waitUntilComplete();assert.equal(redirects.length,1);assertMexico(redirects.at(-1),'15');
  w.history.replaceState({},'','?country=USA');w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.waitUntilComplete();const picker=w.document.querySelector('[data-overview-country]');picker.value='MEX';picker.dispatchEvent(new w.Event('change'));await w.happyDOM.waitUntilComplete();assert.equal(redirects.length,2);assertMexico(redirects.at(-1));
  w.history.replaceState({},'','?country=CAN');w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.waitUntilComplete();w.document.querySelector(`[data-overview-map-city="${mexicoCity}"]`).click();await w.happyDOM.waitUntilComplete();assert.equal(redirects.length,3);assertMexico(redirects.at(-1));
 }finally{await w.happyDOM.close();}
});

test('The actual Mexico route adapter leaves CAN/USA, their cities and incompatible Mexico-city URLs on the shared overview',async()=>{
 const config=JSON.parse(html.match(/<script type="application\/json" data-overview-config[^>]*>([\s\S]*?)<\/script>/)[1]);
 for(const country of ['CAN','USA']){
  const city=config.cities.find(city=>city.country===country).id;
  for(const search of [`?country=${country}`,`?city=${city}`,`?country=${country}&city=${mexicoCity}`]){const {w,redirects}=await page(search);try{await w.happyDOM.waitUntilComplete();assert.equal(redirects.length,0);assert.equal(w.document.querySelector('[data-overview-country]').value,country);}finally{await w.happyDOM.close();}}
 }
 const {w,redirects}=await page();try{for(const country of ['CAN','USA']){const picker=w.document.querySelector('[data-overview-country]');picker.value=country;picker.dispatchEvent(new w.Event('change'));await w.happyDOM.waitUntilComplete();assert.equal(redirects.length,0);const city=config.cities.find(city=>city.country===country).id;w.document.querySelector(`[data-overview-map-city="${city}"]`).click();await w.happyDOM.waitUntilComplete();assert.equal(redirects.length,0);assert.equal(picker.value,country);}}finally{await w.happyDOM.close();}
});
