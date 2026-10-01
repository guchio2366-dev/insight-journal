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
 export {initAfricaOverviewAdapter} from './src/scripts/atlas-africa-overview';
 export {initCountryOverview} from './src/scripts/atlas-country-overview';
 export {initOverviewMap} from './src/scripts/atlas-overview-map';
 export {initLatinWorkspaceLayout} from './src/scripts/atlas-latin-workspace-layout';
 export {initLatinOverviewLinks} from './src/scripts/atlas-latin-overview-layout';
 import './src/scripts/atlas-latin-nature';
 export {initOceaniaLearningAtlas} from './src/scripts/atlas-oceania-learning';`,loader:'ts',resolveDir:repo},bundle:true,write:false,format:'iife',globalName:'RegionalClient',platform:'browser',plugins:[localModules],logLevel:'silent',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}});
// Run the actual region-owned overview controller, including its flag-retaining links.
const overviewSource=readFileSync(path.join(repo,'src/components/atlas/OceaniaOverviewPage.astro'),'utf8').split('<script>')[1].split('</script>')[0].replace(/^\s*import .*;\r?\n/gm,'');
const overviewCode=(await build({stdin:{contents:'const initOverviewMap=RegionalClient.initOverviewMap;'+overviewSource,loader:'ts',resolveDir:repo},write:false,format:'iife',logLevel:'silent'})).outputFiles[0].text;
after(()=>stop());

function open(relative,init){
 const url=new URL(relative,'https://example.test/insight-journal/atlas/'),win=new Window({url:url.href,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const directory=url.pathname.replace(/^\/insight-journal\//,'');
 win.document.body.innerHTML=readFileSync(path.join(repo,'dist',directory,'index.html'),'utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
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
 africa:'RegionalClient.initCountryOverview(document.querySelector("[data-country-overview]"));RegionalClient.initAfricaOverviewAdapter();',
 'latin-america':'const root=document.querySelector("[data-country-overview]");RegionalClient.initCountryOverview(root);RegionalClient.initLatinOverviewLinks(root);',
 oceania:overviewCode,
};
const cases=[
 {region:'russia',field:'agriculture/',query:'place=west&scope=region',overviewSelector:'[data-russia-overview-link]',overviewExpected:{place:'west',scope:'region'},fieldExpected:{place:'west',scope:'region'},links:'.russia-learning-fields [data-field-link],.russia-overview-entries [data-field-link]'},
 {region:'africa',field:'',query:'field=agriculture&place=GHA&region=west&zoom=country',overviewSelector:'[data-africa-overview-link]',overviewExpected:{country:'GHA',region:'west',zoom:'country'},fieldExpected:{place:'GHA',region:'west',zoom:'country'},links:'[data-overview-field],.africa-overview-actions a'},
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
