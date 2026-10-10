import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

const repo=fileURLToPath(new URL('../../',import.meta.url));
const localModules={name:'regional-navigation-local-modules',setup(builder){
 builder.onResolve({filter:/.*/},args=>{assert.ok(args.path.startsWith('.')||path.isAbsolute(args.path));const target=path.resolve(args.resolveDir,args.path),file=[target,target+'.ts',target+'.json',target+'.mjs'].find(candidate=>existsSync(candidate)&&statSync(candidate).isFile());assert.ok(file&&path.relative(repo,file).split(path.sep)[0]!=='..');return {path:file,namespace:'regional-local'};});
 builder.onLoad({filter:/.*/,namespace:'regional-local'},args=>({contents:readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':args.path.endsWith('.ts')?'ts':'js',resolveDir:path.dirname(args.path)}));
}};
const bundle=await build({stdin:{contents:`
 export {initRussiaLearningAtlas} from './src/scripts/atlas-russia-learning';
 export {initializeAfricaAtlas} from './src/scripts/atlas-africa';
 export {initAfricaOverview} from './src/scripts/atlas-africa-overview';
 export {initCountryOverview} from './src/scripts/atlas-country-overview';
 export {initOverviewMap} from './src/scripts/atlas-overview-map';
 export {initLatinWorkspaceLayout} from './src/scripts/atlas-latin-workspace-layout';
 export {initialiseLatinAgriculture as initLatinAgriculture} from './src/scripts/atlas-latin-agriculture';
 export {initLatinPopulation} from './src/scripts/atlas-latin-america-population';
 export {initLatinOverviewLinks} from './src/scripts/atlas-latin-overview-layout';
 import './src/scripts/atlas-latin-nature';
 import './src/scripts/atlas-latin-water-terrain';
 export {initOceaniaLearningAtlas} from './src/scripts/atlas-oceania-learning';`,loader:'ts',resolveDir:repo},bundle:true,write:false,format:'iife',globalName:'RegionalClient',platform:'browser',plugins:[localModules],logLevel:'silent',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}});
// Run the actual region-owned overview controller, including its flag-retaining links.
const overviewSource=readFileSync(path.join(repo,'src/components/atlas/OceaniaOverviewPage.astro'),'utf8').split('<script>')[1].split('</script>')[0].replace(/^\s*import .*;\r?\n/gm,'');
const overviewCode=(await build({stdin:{contents:'const initOverviewMap=RegionalClient.initOverviewMap;'+overviewSource,loader:'ts',resolveDir:repo},write:false,format:'iife',logLevel:'silent'})).outputFiles[0].text;
after(()=>stop());

function open(relative,init){
 const url=new URL(relative,'https://example.test/insight-journal/atlas/'),win=new Window({url:url.href,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const directory=url.pathname.replace(/^\/insight-journal\//,'');
 win.document.write(readFileSync(path.join(repo,'dist',directory,'index.html'),'utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style>[\s\S]*?<\/style>/g,''));
 win.ResizeObserver=class{observe(){} disconnect(){}};
 Object.defineProperty(win.document,'fonts',{value:{ready:Promise.resolve()}});
 win.fetch=async href=>{const asset=new URL(href,url),file=path.join(repo,'dist',asset.pathname.replace(/^\/insight-journal\//,''));return {ok:true,blob:async()=>new win.Blob([readFileSync(file)],{type:'image/png'})};};
 win.eval(bundle.outputFiles[0].text);
 win.eval(init);
 return win;
}
const flags={only:'1',fallback:'1'};
function assertParameters(link,expected){const url=new URL(link.href);for(const [key,value] of Object.entries({...expected,...flags}))assert.equal(url.searchParams.get(key),value,`${link.textContent.trim()}: ${key}`);}
const fieldInit={
 russia:'RegionalClient.initRussiaLearningAtlas(document.querySelector("[data-russia-learning]"));',
 africa:'RegionalClient.initializeAfricaAtlas();',
 'latin-america':'RegionalClient.initLatinWorkspaceLayout();',
 oceania:'RegionalClient.initOceaniaLearningAtlas(document.querySelector("[data-oceania-learning]"));',
};
const overviewInit={
 russia:fieldInit.russia,
 africa:'RegionalClient.initAfricaOverview(document.querySelector("[data-africa-overview]"));',
 'latin-america':'const root=document.querySelector("[data-country-overview]");RegionalClient.initCountryOverview(root);RegionalClient.initLatinOverviewLinks(root);',
 oceania:overviewCode,
};
const cases=[
 {region:'russia',field:'agriculture/',query:'place=west&scope=region',overviewSelector:'[data-russia-overview-link]',overviewExpected:{place:'west',scope:'region'},fieldExpected:{place:'west',scope:'region'},links:'.russia-learning-fields [data-field-link],.russia-overview-entries [data-field-link]'},
 {region:'africa',field:'',query:'field=agriculture&place=GHA&region=west&zoom=country',overviewSelector:'[data-africa-overview-link]',overviewExpected:{place:'GHA',region:'west',zoom:'country'},fieldExpected:{place:'GHA',region:'west',zoom:'country'},links:'.ao-fields [data-ao-field]:not([data-ao-field="overview"]),.ao-reading-links [data-ao-field]'},
 {region:'latin-america',field:'nature/',query:'place=CRI&scope=central',overviewSelector:'.latin-fields a',overviewExpected:{country:'CRI',scope:'central'},fieldExpected:{place:'CRI',scope:'central'},links:'.country-overview-fields [data-overview-field]'},
 {region:'oceania',field:'agriculture/',query:'place=AUS&scope=all',overviewSelector:'[data-oceania-overview-link]',overviewExpected:{place:'AUS',scope:'all'},fieldExpected:{place:'AUS',scope:'all'},links:'[data-oceania-field-link]'},
];
for(const item of cases)test(`${item.region} field → overview → every field entrance retains country, scope and display flags`,async()=>{
 const field=open(`${item.region}/${item.field}?${item.query}&only=1&fallback=1`,fieldInit[item.region]);
 try{
  await field.happyDOM.waitUntilComplete();
  const overviewLink=field.document.querySelector(item.overviewSelector);assert.ok(overviewLink);assertParameters(overviewLink,item.overviewExpected);
  const overview=open(overviewLink.href,overviewInit[item.region]);
  try{await overview.happyDOM.waitUntilComplete();const links=[...overview.document.querySelectorAll(item.links)];assert.ok(links.length>=4);for(const link of links)assertParameters(link,item.fieldExpected);}
  finally{await overview.happyDOM.close();}
 }finally{await field.happyDOM.close();}
});

test('Latin overview preserves incoming regional scope, then updates scope when a different country is chosen',async()=>{
 const win=open('latin-america/overview/?country=CRI&scope=central&only=1&fallback=1',overviewInit['latin-america']);
 try{await win.happyDOM.waitUntilComplete();for(const link of win.document.querySelectorAll('[data-overview-field]'))assertParameters(link,{place:'CRI',scope:'central'});const picker=win.document.querySelector('[data-overview-country]');picker.value='BRA';picker.dispatchEvent(new win.Event('change',{bubbles:true}));await win.happyDOM.waitUntilComplete();for(const link of win.document.querySelectorAll('[data-overview-field]'))assertParameters(link,{place:'BRA',scope:'country'});win.history.replaceState({},'','?country=CRI&scope=central&only=1&fallback=1');win.dispatchEvent(new win.PopStateEvent('popstate'));await win.happyDOM.waitUntilComplete();for(const link of win.document.querySelectorAll('[data-overview-field]'))assertParameters(link,{place:'CRI',scope:'central'});}
 finally{await win.happyDOM.close();}
});

function assertLatinSection(win,section){
 const root=win.document.querySelector('[data-latin-workspace]');
 assert.equal(new URL(win.location).searchParams.get('section'),section==='climate'||section==='agriculture'||section==='population'?null:section);
 const ready=['climate','agriculture','population','water','rivers','rainfall','terrain','elevation'].includes(section);
 assert.equal(root.classList.contains('has-unavailable-section'),!ready);
 const panelSection=section==='water'?'rivers':section;
 if(['rivers','rainfall','terrain','elevation'].includes(panelSection)){
  assert.equal(root.dataset.foundationReady,'true');
  assert.equal(root.querySelector(`[data-foundation-map="${panelSection}"]`).closest('[data-latin-section-panel]').hidden,false);
  assert.equal(root.querySelector(`[data-foundation-reading="${panelSection}"]`).hidden,false);
 }
 assert.equal(root.querySelector(`[data-latin-section="${section}"]`).getAttribute('aria-pressed'),'true');
}

test('Latin actual nature controller restores water and rainfall categories on reload and country history round trips',async()=>{
 const win=open('latin-america/nature/?place=CRI&scope=country&only=1',fieldInit['latin-america']);
 try{
  await win.happyDOM.waitUntilComplete();
  win.document.querySelector('[data-latin-section="water"]').click();
  win.document.querySelector('[data-latin-section="rainfall"]').click();
  await win.happyDOM.waitUntilComplete();assertLatinSection(win,'rainfall');
  assert.equal(win.document.querySelector('[data-latin-section="water"]').getAttribute('aria-pressed'),'true');
  const beforeCountry=win.location.href,reload=open(beforeCountry,fieldInit['latin-america']);
  try{await reload.happyDOM.waitUntilComplete();assertLatinSection(reload,'rainfall');assert.equal(reload.document.querySelector('[data-latin-water-items]').hidden,false);}finally{await reload.happyDOM.close();}
  const picker=win.document.querySelector('select[data-nature-place]');picker.value='BRA';picker.dispatchEvent(new win.Event('change',{bubbles:true}));await win.happyDOM.waitUntilComplete();assertLatinSection(win,'rainfall');assert.equal(new URL(win.location).searchParams.get('place'),'BRA');
  const afterCountry=win.location.href;
  win.history.back();await win.happyDOM.waitUntilComplete();assert.equal(win.location.href,beforeCountry);assertLatinSection(win,'rainfall');assert.equal(picker.value,'CRI');
  win.history.forward();await win.happyDOM.waitUntilComplete();assert.equal(win.location.href,afterCountry);assertLatinSection(win,'rainfall');assert.equal(picker.value,'BRA');
  win.document.querySelector('[data-latin-section="climate"]').click();await win.happyDOM.waitUntilComplete();assertLatinSection(win,'climate');
  win.history.back();await win.happyDOM.waitUntilComplete();assertLatinSection(win,'rainfall');
  win.history.forward();await win.happyDOM.waitUntilComplete();assertLatinSection(win,'climate');
 }finally{await win.happyDOM.close();}
});

for(const [field,section,init,placeSelector,available] of [
 ['population','ethnicity','RegionalClient.initLatinPopulation(document.querySelector("[data-latin-field=population]"));RegionalClient.initLatinWorkspaceLayout();','[data-lp-place-select]','population'],
])test(`Latin actual ${field} controller retains its unavailable category on reload and restores the ready map on history navigation`,async()=>{
 const win=open(`latin-america/${field}/?place=CRI&scope=country&only=1`,init);
 try{
  await win.happyDOM.waitUntilComplete();win.document.querySelector(`[data-latin-section="${section}"]`).click();await win.happyDOM.waitUntilComplete();assertLatinSection(win,section);
  const selectedUrl=win.location.href,reload=open(selectedUrl,init);
  try{await reload.happyDOM.waitUntilComplete();assertLatinSection(reload,section);}finally{await reload.happyDOM.close();}
  const picker=win.document.querySelector(placeSelector);picker.value='BRA';picker.dispatchEvent(new win.Event('change',{bubbles:true}));await win.happyDOM.waitUntilComplete();assertLatinSection(win,section);
  win.history.back();await win.happyDOM.waitUntilComplete();assert.equal(win.location.href,selectedUrl);assertLatinSection(win,section);assert.equal(picker.value,'CRI');
  win.document.querySelector(`[data-latin-section="${available}"]`).click();await win.happyDOM.waitUntilComplete();assertLatinSection(win,available);
  assert.equal(win.document.querySelector('.latin-fields a[aria-current]').href.includes('section='),false);
 }finally{await win.happyDOM.close();}
});

test('Latin forestry links to the independent module and legacy section bookmarks keep the ready farming map',async()=>{
 const init='RegionalClient.initLatinAgriculture(document.querySelector("[data-latin-field=agriculture]"));RegionalClient.initLatinWorkspaceLayout();';
 const win=open('latin-america/agriculture/?place=CRI&scope=country&section=forestry&only=1',init);
 try{
  await win.happyDOM.waitUntilComplete();
  const root=win.document.querySelector('[data-latin-workspace]'),link=root.querySelector('.latin-agriculture-subfields a');
  assert.equal(new URL(link.href).pathname,'/insight-journal/atlas/latin-america/agriculture/forestry/');
  assert.equal(root.querySelector('[data-latin-section="forestry"]'),null);
  assert.equal(root.classList.contains('has-unavailable-section'),false);
  assert.equal(root.querySelector('[data-latin-section="agriculture"]').getAttribute('aria-pressed'),'true');
  const legacy=win.location.href;
  root.querySelector('[data-latin-section="agriculture"]').click();await win.happyDOM.waitUntilComplete();assertLatinSection(win,'agriculture');
  win.history.back();await win.happyDOM.waitUntilComplete();assert.equal(win.location.href,legacy);assert.equal(root.classList.contains('has-unavailable-section'),false);assert.equal(new URL(link.href).pathname,'/insight-journal/atlas/latin-america/agriculture/forestry/');
 }finally{await win.happyDOM.close();}
});
