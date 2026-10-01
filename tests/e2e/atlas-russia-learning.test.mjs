import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

const repo=fileURLToPath(new URL('../../',import.meta.url));
// Read only explicitly resolved local imports; this also avoids ancestor config lookup on Windows.
const localModules={name:'russia-local-modules',setup(builder){
 builder.onResolve({filter:/.*/},args=>{
  assert.ok(args.path.startsWith('.')||path.isAbsolute(args.path),`Unexpected external import: ${args.path}`);
  const target=path.resolve(args.resolveDir,args.path);
  const file=[target,target+'.ts',target+'.json',target+'.mjs'].find(candidate=>existsSync(candidate)&&statSync(candidate).isFile());
  assert.ok(file&&path.relative(repo,file).split(path.sep)[0]!=='..',`Missing or outside module: ${target}`);
  return {path:file,namespace:'russia-local'};
 });
 builder.onLoad({filter:/.*/,namespace:'russia-local'},args=>({
  contents:readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':args.path.endsWith('.ts')?'ts':'js',resolveDir:path.dirname(args.path),
 }));
}};
const bundle=await build({
 stdin:{contents:"import {initRussiaLearningAtlas} from './src/scripts/atlas-russia-learning'; import * as Data from './src/data/atlas/russia-learning'; export {initRussiaLearningAtlas,Data};",loader:'ts',resolveDir:repo},
 bundle:true,write:false,format:'iife',globalName:'RussiaClient',platform:'browser',plugins:[localModules],logLevel:'silent',
 define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')},
});
const referenceWindow=new Window({settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
referenceWindow.eval(bundle.outputFiles[0].text);
const model=referenceWindow.RussiaClient.Data;
after(()=>{referenceWindow.happyDOM.abort();stop();});
const fields=['nature','agriculture','industry','population'];
const html=field=>readFileSync(new URL(`../../dist/atlas/russia/${field}/index.html`,import.meta.url),'utf8');
const stripScripts=value=>value.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
function page(field,query='',interactive=true){
 const win=new Window({url:`https://example.test/insight-journal/atlas/russia/${field}/${query}`,settings:{enableJavaScriptEvaluation:interactive,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 win.document.body.innerHTML=stripScripts(html(field));
 win.ResizeObserver=class{observe(){} disconnect(){}};
 if(interactive)win.eval(bundle.outputFiles[0].text+';RussiaClient.initRussiaLearningAtlas(document.querySelector("[data-russia-learning]"));');
 const root=win.document.querySelector('[data-russia-learning]');
 return {win,root,one:hook=>root.querySelector(`[data-${hook}]`)};
}
const legendLabels=element=>[...element.children].map(item=>item.textContent.trim());
function assertLegend(element,layer){assert.deepEqual(legendLabels(element),Array.from(layer.legend,item=>item.label));}
function assertSources(element,sources){
 const urls=new Set([...element.querySelectorAll('a')].map(link=>link.href));
 for(const source of sources)assert.ok(urls.has(source.url),`Visible source missing: ${source.title}`);
}
function assertRealImage(element){
 const image=element.querySelector('image');assert.ok(image,'Initial distribution has a raster image');
 const url=new URL(image.getAttribute('href'),'https://example.test');
 const file=path.join(repo,'dist',url.pathname.replace(/^\/insight-journal\//,''));
 const bytes=readFileSync(file);
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],`Real PNG asset: ${url.pathname}`);
 assert.ok(bytes.length>100);
}

test('four built Russia fields show real initial distributions, complete legends, boundary sources and three learning regions',()=>{
 for(const field of fields){
  const {win,root,one}=page(field);
  try{
   const D=win.RussiaClient.Data,state=D.createRussiaState(win.location.search,field),layer=D.getRussiaLayer(state.layer,state);
   assert.equal(state.scope,'all');assert.equal(one('place').value,'all');
   assert.deepEqual([...one('place').options].map(option=>option.value),['all','west','siberia','far-east']);
   assert.ok(one('primary-map').querySelector('svg'));
   if(layer.kind==='raster')assertRealImage(one('primary-map'));
   else assert.ok(one('primary-map').querySelector('title'),'Industry representatives retain named marks');
   assertLegend(one('primary-legend'),layer);
   assert.equal(one('primary-period').textContent,layer.period);assert.ok(one('primary-unit').textContent.includes(layer.unit));
   assert.ok(one('takeaway').textContent.length>15);assert.equal(one('social-context').textContent,D.getRussiaTheme(state).social);
   assertSources(one('source-list'),[...D.russiaBoundarySources,...layer.sources,...D.getRussiaTheme(state).sources]);
   assert.equal(root.querySelector('.russia-learning-sources').open,false);
   assert.equal(root.querySelectorAll('[data-field-link]').length,4);
   assert.equal(root.querySelector('[data-scope="region"]').disabled,true);
  }finally{win.happyDOM.abort();}
 }
});

test('west wheat and climate comparison retains the original distribution, every legend, dates, both sources and a named return',()=>{
 const {win,root,one}=page('agriculture','?place=west&scope=region&theme=wheat-and-water&layer=wheat&compare=climate&keep=source#reference');
 try{
  const D=win.RussiaClient.Data,originalFrame=one('primary-map').querySelector('svg').getAttribute('viewBox');
  assertRealImage(one('primary-map'));
  one('comparison').click();
  const state=D.createRussiaState(win.location.search,'agriculture'),original=D.getRussiaLayer('wheat'),comparison=D.getRussiaLayer('climate');
  assert.equal(one('comparison-view').hidden,false);assert.equal(one('normal-view').hidden,true);
  assert.ok(one('original-map').querySelector('image').getAttribute('href').endsWith(original.image));
  assert.ok(one('comparison-map').querySelector('image').getAttribute('href').endsWith(comparison.image));
  assert.equal(one('original-map').querySelector('svg').getAttribute('viewBox'),originalFrame);
  assert.equal(one('comparison-map').querySelector('svg').getAttribute('viewBox'),originalFrame);
  assertLegend(one('original-legend'),original);assertLegend(one('comparison-legend'),comparison);
  assert.equal(one('original-period').textContent,'2020年');assert.equal(one('comparison-period').textContent,'1991–2020年');
  assert.ok(one('original-unit').textContent.includes(original.unit));assert.ok(one('comparison-unit').textContent.includes(comparison.unit));
  assertSources(one('source-list'),[...D.russiaBoundarySources,...original.sources,...comparison.sources]);
  assert.equal(one('comparison-explanation').textContent,D.getRussiaComparisonReading(state).message);
  assert.match(one('return').textContent,/欧州側・ウラル付近/);assert.equal(win.document.activeElement,one('return'));
  one('return').click();
  assert.equal(one('normal-view').hidden,false);assert.equal(one('place').value,'west');assert.equal(one('layer').value,'wheat');
  const url=new URL(win.location.href);assert.equal(url.searchParams.get('scope'),'region');assert.equal(url.searchParams.has('view'),false);
  assert.equal(url.searchParams.get('keep'),'source');assert.equal(url.hash,'#reference');
 }finally{win.happyDOM.abort();}
});

test('far-east density reload, history and field links retain regional selection, unknown parameters and hash with one history entry per action',()=>{
 const query='?place=far-east&scope=region&layer=density&compare=climate&view=comparison&keep=source#reference';
 const {win,root,one}=page('population',query);
 try{
  const D=win.RussiaClient.Data;
  assert.equal(one('place').value,'far-east');assert.equal(one('comparison-view').hidden,false);assert.match(one('return').textContent,/極東/);
  assertRealImage(one('original-map'));
  assert.ok(one('original-map').querySelector('image').getAttribute('href').endsWith(D.getRussiaLayer('density').image));
  assert.equal(one('original-map').querySelector('svg').getAttribute('viewBox'),D.russiaRegions.find(region=>region.code==='far-east').extent.join(' '));
  const reload=page('population',new URL(win.location.href).search+win.location.hash);
  try{assert.equal(reload.one('place').value,'far-east');assert.equal(reload.one('comparison-view').hidden,false);assert.match(reload.one('return').textContent,/極東/);}
  finally{reload.win.happyDOM.abort();}
  win.RussiaClient.initRussiaLearningAtlas(root);
  const previousHistory=win.history.length;
  one('place').value='west';one('place').dispatchEvent(new win.Event('change'));
  assert.equal(win.history.length,previousHistory+1);
  assert.equal(new URL(win.location.href).searchParams.get('keep'),'source');assert.equal(win.location.hash,'#reference');
  win.history.replaceState({},'',query);win.dispatchEvent(new win.PopStateEvent('popstate'));
  assert.equal(one('place').value,'far-east');assert.equal(one('layer').value,'density');assert.match(one('return').textContent,/極東/);
  for(const link of root.querySelectorAll('[data-field-link]')){
   const url=new URL(link.href),field=link.dataset.fieldLink,state=D.createRussiaState(url.search,field);
   assert.equal(url.pathname,`/insight-journal/atlas/russia/${field}/`);
   assert.equal(state.place,'far-east');assert.equal(state.scope,'region');assert.equal(state.comparison,false);
   const available=D.russiaThemes.filter(theme=>theme.field===field);
   assert.equal(state.theme,(available.find(theme=>theme.regionCodes.includes('far-east'))??available[0]).id);
  }
  win.history.replaceState({},'','?place=unknown&scope=region&layer=unknown&keep=source#reference');win.dispatchEvent(new win.PopStateEvent('popstate'));
  assert.equal(one('place').value,'all');assert.equal(root.querySelector('[data-scope="region"]').disabled,true);
  assert.equal(new URL(win.location.href).searchParams.get('keep'),'source');assert.equal(win.location.hash,'#reference');
 }finally{win.happyDOM.abort();}
});

test('all four server-rendered Russia pages remain readable without JavaScript and expose working field routes',()=>{
 for(const field of fields){
  const {win,root,one}=page(field,'',false);
  try{
   assert.ok(root,'Server HTML contains the dedicated region workspace');assert.equal(root.dataset.russiaReady,undefined);
   assert.ok(one('primary-map').querySelector('svg'));
   const state=model.createRussiaState('',field),layer=model.getRussiaLayer(state.layer,state);
   assertLegend(one('primary-legend'),layer);
   assert.ok(one('takeaway').textContent.length>15);assert.ok(one('primary-period').textContent.length>0);assert.ok(one('primary-unit').textContent.length>0);
   assert.equal(one('normal-view').hidden,false);assert.equal(one('comparison-view').hidden,true);assert.equal(one('place').value,'all');
   assert.equal(root.querySelector('[data-scope="all"]').getAttribute('aria-pressed'),'true');
   assert.ok(root.querySelector('noscript'));assert.equal(root.querySelector('.russia-learning-sources').open,false);
   assertSources(one('source-list'),[...model.russiaBoundarySources,...layer.sources,...model.getRussiaTheme(state).sources]);
   assert.match(one('source-list').textContent,/Natural Earth/);assert.match(root.querySelector('.russia-learning-sources').textContent,/係争/);
   assert.match(root.querySelector('.russia-learning-sources').textContent,/学習地域/);
   for(const link of root.querySelectorAll('[data-field-link]')){
    const url=new URL(link.href);assert.ok(existsSync(path.join(repo,'dist',url.pathname.replace(/^\/insight-journal\//,''),'index.html')));
   }
   assert.equal(root.querySelectorAll('[data-russia-overview-link],[data-russia-base-link]').length,0);
  }finally{win.happyDOM.abort();}
 }
});
