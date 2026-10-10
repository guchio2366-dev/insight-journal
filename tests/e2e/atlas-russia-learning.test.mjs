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
function assertLegend(element,layer){
 if(layer.field==='agriculture'){
  assert.equal(element.querySelectorAll('[data-farming-legend]').length,2);
  assert.match(element.textContent,/ha／元5分セル/);assert.match(element.textContent,/頭／km²/);
  assert.match(element.textContent,/有効0/);assert.match(element.textContent,/未収録/);
  return;
 }
 assert.deepEqual(legendLabels(element),Array.from(layer.legend,item=>item.label));
}
function assertPrimaryLegend(one,layer){
 if(layer.field==='agriculture'){
  const compact=one('primary-legend');assert.equal(compact.querySelectorAll('[data-farming-key]').length,2);assert.equal(compact.querySelectorAll('[data-farming-legend]').length,0);
  const legend=one('primary-legend-definitions');
  assert.equal(legend.closest('details').open,false);
  assert.equal(legend.querySelectorAll('[data-farming-legend]').length,2);
  assert.match(legend.querySelector('[data-farming-legend="wheat"] h3').textContent,/ha／元5分セル/);
  assert.match(legend.querySelector('[data-farming-legend="cattle"] h3').textContent,/頭／km²/);
  assert.match(legend.textContent,/有効0/);assert.match(legend.textContent,/未収録/);
  assert.equal(legend.querySelector('[data-farming-legend="cattle"] div').children.length,6);
  return;
 }
 if(layer.id!=='climate'){assertLegend(one('primary-legend'),layer);return;}
 const dictionary=one('primary-legend-definitions');assertLegend(dictionary,layer);
 assert.equal(dictionary.closest('details').hidden,false);
 const compact=[...one('primary-legend').children],full=[...dictionary.children];
 assert.equal(compact.length,layer.legend.length);
 for(let i=0;i<compact.length;i++){
  const code=layer.legend[i].label.split(' ')[0],label=compact[i].textContent.trim();
  assert.ok(label.startsWith(code));if(/^[A-Z][a-z]{1,2}$/.test(code))assert.ok(label.length>code.length,'Every climate code has a readable short meaning');
  const color=compact[i].querySelector('[style]')?.getAttribute('style');assert.ok(color,'Every essential class has its color or boundary symbol');
  assert.equal(color,full[i].querySelector('[style]')?.getAttribute('style'),'Essential and formal legends use the same class colors');
 }
}
function assertSources(element,sources){
 const urls=new Set([...element.querySelectorAll('a')].map(link=>link.href));
 for(const source of sources)assert.ok(urls.has(source.url),`Visible source missing: ${source.title}`);
}
function assertRealImage(element){
 const image=element.querySelector('image[data-farming-mode="quantity"]')??element.querySelector('image');assert.ok(image,'Initial distribution has a raster image');
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
   assert.equal(one('reading-status').textContent,'ロシアの概要');
   assert.equal(one('theme-title').textContent,D.russiaOverviewReadings[field].title);
   assert.equal(root.querySelectorAll('[data-theme][aria-pressed="true"]').length,0);
   assert.deepEqual([...one('place').options].map(option=>option.value),['all','west','siberia','far-east']);
   assert.ok(one('primary-map').querySelector('svg'));
   if(layer.kind==='raster')assertRealImage(one('primary-map'));
   else assert.ok(one('primary-map').querySelector('title'),'Industry representatives retain named marks');
   assertPrimaryLegend(one,layer);
   assert.equal(one('primary-period').textContent,layer.period);assert.ok(one('primary-unit').textContent.includes(layer.unit));
   assert.ok(one('takeaway').textContent.length>15);assert.equal(one('social-context').textContent,D.getRussiaTheme(state).social);
   assertSources(one('source-list'),[...D.russiaBoundarySources,...layer.sources,...D.getRussiaTheme(state).sources]);
   assert.equal(root.querySelector('.russia-learning-sources').open,false);
   assert.equal(root.querySelectorAll('[data-field-link]').length,4);
   assert.equal(root.querySelector('[data-scope="region"]').disabled,true);
  }finally{win.happyDOM.abort();}
 }
});

test('one native region selector retains both farming distributions and other regions, with reload and explicit zoom',()=>{
 const {win,root,one}=page('agriculture','?scope=all&layer=wheat&compare=cattle&view=comparison');
 try{
  const frame=one('original-map').querySelector('svg').getAttribute('viewBox');
  one('place').focus();one('place').value='far-east';one('place').dispatchEvent(new win.Event('change'));
  assert.equal(win.document.activeElement,one('place'));assert.equal(root.querySelectorAll('[data-region-option]').length,0);
  assert.equal(one('place').value,'far-east');assert.equal(one('layer').value,'wheat');assert.equal(one('compare-layer').value,'cattle');
  assert.equal(new URL(win.location.href).searchParams.get('scope'),'all');
  for(const hook of ['original-map','comparison-map']){
   assert.equal(one(hook).querySelector('svg').getAttribute('viewBox'),frame);
   assert.equal(one(hook).querySelectorAll('[data-region-marker]').length,0);
   assert.equal(one(hook).querySelectorAll('[data-farming-place]').length,4);
  }
  const reloaded=page('agriculture',win.location.search);
  try{
   assert.equal(reloaded.one('original-map').querySelector('svg').getAttribute('viewBox'),frame);
   assert.equal(reloaded.one('place').value,'far-east');assert.equal(reloaded.one('layer').value,'wheat');
  }finally{reloaded.win.happyDOM.abort();}
  root.querySelector('[data-scope="region"]').click();
  assert.notEqual(one('original-map').querySelector('svg').getAttribute('viewBox'),frame);
  assert.equal(one('layer').value,'wheat');assert.equal(one('compare-layer').value,'cattle');
 }finally{win.happyDOM.abort();}
});

test('changing cattle distribution updates the reading without resetting the comparison or full frame',()=>{
 const {win,one}=page('agriculture','?scope=all&compare=climate');
 try{
  const frame=one('primary-map').querySelector('svg').getAttribute('viewBox');
  one('layer').value='cattle';one('layer').dispatchEvent(new win.Event('change'));
  assert.equal(new URL(win.location.href).searchParams.get('theme'),'cattle-and-feed');
  assert.match(one('theme-title').textContent,/牛と飼料/);
  assert.equal(one('compare-layer').value,'climate');
  assert.equal(one('primary-map').querySelector('svg').getAttribute('viewBox'),frame);
 }finally{win.happyDOM.abort();}
});

test('farming overview and product focus retain both distributions, separate units and the full frame after reload',()=>{
 const {win,root,one}=page('agriculture');
 try{
  assert.equal(one('layer').value,'farming-all');
  const frame=one('primary-map').querySelector('svg').getAttribute('viewBox');
  assert.deepEqual([...new Set([...one('primary-map').querySelectorAll('[data-farming-product]')].map(el=>el.dataset.farmingProduct))].sort(),['cattle','wheat']);
  const initialOpacity=Number(one('primary-map').querySelector('[data-farming-product="cattle"][data-farming-mode="texture"]').getAttribute('opacity'));
  assert.match(one('explanation').textContent,/2品目/);assert.match(one('explanation').textContent,/他の品目の全国分布格子は未収録/);
  assert.match(one('takeaway').textContent,/ロストフ.*オムスク.*ヤクーツク/);
  assert.equal(one('explanation').closest('details').open,false);assert.match(one('geography-reading').textContent,/冬小麦.*春小麦.*飼料.*肉・乳/);
  assert.ok(one('primary-legend').closest('.russia-learning-map-panel'));
  assert.equal(root.querySelector('.russia-learning-reading [data-primary-legend]'),null);
  assert.equal(one('primary-map').querySelectorAll('[data-region-marker]').length,0);assert.equal(one('primary-map').querySelectorAll('[data-farming-place]').length,4);
  assert.equal(one('primary-map').querySelectorAll('[data-farming-mode="missing"] rect[mask]').length,1);
  assert.match(one('primary-legend-definitions').textContent,/牛の有効0は点を描きません/);
  one('layer').value='wheat';one('layer').dispatchEvent(new win.Event('change'));
  const cattle=one('primary-map').querySelector('[data-farming-product="cattle"][data-farming-mode="texture"]');
  assert.ok(cattle);assert.ok(Number(cattle.getAttribute('opacity'))<initialOpacity);
  assert.equal(one('primary-map').querySelector('[data-farming-product="wheat"][data-farming-mode="outline"]').getAttribute('opacity'),'1');
  assert.equal(one('primary-map').querySelector('[data-place-product="cattle"]').getAttribute('opacity'),'0.32');
  assert.equal(one('primary-map').querySelector('svg').getAttribute('viewBox'),frame);
  one('place').value='siberia';one('place').dispatchEvent(new win.Event('change'));
  assert.match(one('geography-reading').textContent,/オムスク付近.*正の収穫面積/);
  assert.equal(one('layer').value,'wheat');assert.equal(one('primary-map').querySelectorAll('[data-region-marker]').length,0);
  const reloaded=page('agriculture',win.location.search);
  try{
   assert.equal(reloaded.one('layer').value,'wheat');assert.equal(reloaded.one('place').value,'siberia');
   assert.equal(Number(reloaded.one('primary-map').querySelector('[data-farming-product="cattle"][data-farming-mode="texture"]').getAttribute('opacity')),.22);
   assert.equal(reloaded.one('primary-map').querySelector('svg').getAttribute('viewBox'),frame);
  }finally{reloaded.win.happyDOM.abort();}
  one('layer').value='cattle';one('layer').dispatchEvent(new win.Event('change'));
  assert.equal(one('primary-map').querySelector('[data-place-product="wheat"]').getAttribute('opacity'),'0.32');
  assert.ok(one('primary-map').querySelector('[data-farming-product="cattle"][data-farming-mode="quantity"]'));
  assert.ok(one('primary-map').querySelector('[data-farming-product="wheat"][data-farming-mode="outline"]'));
  assertPrimaryLegend(one,model.getRussiaLayer('cattle'));
  one('place').value='all';one('place').dispatchEvent(new win.Event('change'));
  assert.equal(one('layer').value,'cattle');assert.match(one('theme-title').textContent,/牛と飼料/);
  const direct=page('agriculture','?layer=cattle');
  try{assert.match(direct.one('theme-title').textContent,/牛と飼料/);assert.equal(direct.one('layer').value,'cattle');}finally{direct.win.happyDOM.abort();}
  one('layer').value='farming-all';one('layer').dispatchEvent(new win.Event('change'));
  assert.equal(one('theme-title').textContent,model.russiaOverviewReadings.agriculture.title);
 }finally{win.happyDOM.abort();}
});

test('west wheat and climate comparison retains the original distribution, every legend, dates, both sources and a named return',()=>{
 const {win,root,one}=page('agriculture','?place=west&scope=region&theme=wheat-and-water&layer=wheat&compare=climate&keep=source#reference');
 try{
  const D=win.RussiaClient.Data,originalFrame=one('primary-map').querySelector('svg').getAttribute('viewBox');
  assertRealImage(one('primary-map'));
  one('comparison').click();
  const state=D.createRussiaState(win.location.search,'agriculture'),original=D.getRussiaLayer('wheat'),comparison=D.getRussiaLayer('climate');
  assert.equal(one('comparison-view').hidden,false);assert.equal(one('normal-view').hidden,true);
  assert.ok(one('original-map').querySelector('image[data-farming-mode="quantity"]').getAttribute('href').endsWith(original.image));
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
   assertPrimaryLegend(one,layer);
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
   const overviewLinks=root.querySelectorAll('[data-russia-overview-link]');assert.equal(overviewLinks.length,1);assert.equal(new URL(overviewLinks[0].href).pathname,'/insight-journal/atlas/russia/');assert.equal(root.querySelectorAll('[data-russia-base-link]').length,0);
  }finally{win.happyDOM.abort();}
 }
});

test('industry location selection keeps all eight examples and scoped quantities, restores the URL and returns to overview',()=>{
 const {win,root,one}=page('industry');try{
  assert.equal(root.querySelectorAll('[data-primary-map] [data-russia-industry-location]').length,8);
  for(const id of ['west-siberia-oil','yamal-nenets-gas','kuzbass-coal','omsk-refining']){root.querySelector(`[data-russia-industry-location="${id}"]`).dispatchEvent(new win.MouseEvent('click',{bubbles:true}));assert.equal(new URL(win.location.href).searchParams.get('industryLocation'),id);assert.equal(root.querySelectorAll('[data-primary-map] [data-russia-industry-location]').length,8);assert.match(one('takeaway').textContent,/全国|推定精製能力/);}
  assert.match(one('takeaway').textContent,/日量44万バレル.*実際の処理量/);
  const key=root.querySelector('[data-russia-industry-location="kuzbass-coal"]');key.dispatchEvent(new win.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(new URL(win.location.href).searchParams.get('industryLocation'),'kuzbass-coal');
  assert.ok([...root.querySelectorAll('[data-field-link]')].filter(a=>a.dataset.fieldLink!=='industry').every(a=>!new URL(a.href).searchParams.has('industryLocation')));
  const restored=page('industry',win.location.search);try{assert.match(restored.one('takeaway').textContent,/全国.*ショートトン/);restored.one('russia-industry-return').click();assert.equal(new URL(restored.win.location.href).searchParams.has('industryLocation'),false);assert.equal(restored.root.querySelectorAll('[data-primary-map] [data-russia-industry-location]').length,8);}finally{restored.win.happyDOM.abort();}
 }finally{win.happyDOM.abort();}
});
