import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { project } from '../../src/lib/atlas-europe-view.ts';
import { europeDrainageBasins, europeDrainageCell, europeDrainageOutline, readEuropeDrainageValues } from '../../src/lib/atlas-europe-drainage.ts';

const entry=path.resolve('src/lib/atlas-europe-explorer.ts');
const bundled=await build({
  stdin:{contents:"import { initEuropeAtlas } from './atlas-europe-explorer.ts'; initEuropeAtlas();",resolveDir:path.dirname(entry),sourcefile:path.join(path.dirname(entry),'drainage-controller-test-entry.ts'),loader:'ts'},
  tsconfigRaw:{compilerOptions:{}},bundle:true,write:false,format:'iife',platform:'browser',
  plugins:[{name:'europe-controller-local-source',setup(builder){
    builder.onResolve({filter:/.*/},async args=>{
      if(args.path.includes('maplibre-gl-worker.mjs?worker&url'))return{path:'maplibre-worker-url',namespace:'europe-test-worker'};
      if(args.path.startsWith('maplibre-gl'))return{path:args.path,external:true};
      if(!args.path.startsWith('.'))throw Error('Expected local Europe source: '+args.path);
      const absolute=path.resolve(args.resolveDir,args.path);
      for(const candidate of [absolute,absolute+'.ts',absolute+'.json',absolute+'.mjs',absolute+'.js']){
        try{await access(candidate);return{path:candidate,namespace:'europe-test-source'};}catch{}
      }
      throw Error('Missing Europe source: '+args.path);
    });
    builder.onLoad({filter:/.*/,namespace:'europe-test-source'},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)}));
    builder.onLoad({filter:/.*/,namespace:'europe-test-worker'},()=>({contents:'export default "/test-unused-map-worker.js";',loader:'js'}));
  }}],
});
const html=(await readFile('dist/atlas/europe/nature/index.html','utf8')).replace(/<script(?![^>]*type=["']application\/json["'])[^>]*>[\s\S]*?<\/script>/g,'');
const bytes=gunzipSync(await readFile('public/assets/atlas/europe/drainage-v1/values.bin.gz'));
const values=readEuropeDrainageValues(bytes);
const present=new Set(values);
const listed=europeDrainageBasins.filter(basin=>present.has(basin.index));
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
async function until(check,message='Europe controller did not settle'){
  for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5));}
  throw Error(message);
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));

async function setup(search='?layer=drainage&render=static',fixture={}){
  const w=new Window({url:'https://example.com/insight-journal/atlas/europe/nature/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  w.document.body.innerHTML=html;
  const q=selector=>w.document.querySelector(selector),root=q('[data-europe-detail]');
  const config=JSON.parse(q('[data-eu-config]').textContent);
  const grid=q('[data-eu-subject-grid]'),result=q('[data-eu-subject-result]');
  const gridHome=grid.parentElement,resultSemantics={role:result.getAttribute('role'),live:result.getAttribute('aria-live')};
  assert.ok(config.layers.some(layer=>layer.id==='drainage'),'Built HTML must contain the current drainage config');
  const stage=q('.eu-map-stage'),svg=q('[data-eu-static]');
  for(const node of [stage,svg]){Object.defineProperty(node,'clientWidth',{value:1200});Object.defineProperty(node,'clientHeight',{value:1001});}
  const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this;}};
  svg.getScreenCTM=()=>identity;
  w.DOMPoint=class{constructor(x=0,y=0){this.x=x;this.y=y;}matrixTransform(m){return new this.constructor(m.a*this.x+m.c*this.y+m.e,m.b*this.x+m.d*this.y+m.f);}};
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.ImageData=class{constructor(data,width,height){this.data=data;this.width=width;this.height=height;}};
  w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;
  const draws=[],requests=[],warnings=[];
  w.console.warn=(...args)=>warnings.push(args.map(String).join(' '));
  w.HTMLCanvasElement.prototype.getContext=function(){return{putImageData:image=>draws.push({rgba:Uint8ClampedArray.from(image.data),width:image.width,height:image.height})};};
  w.HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/png;base64,'+Buffer.from('outline-'+draws.length).toString('base64');};
  w.fetch=async input=>{
    const url=new URL(String(input),w.location.href),asset=url.pathname.replace(/^\/insight-journal\//,'/');requests.push(asset);
    const injected=fixture.fetch?.(asset,requests.filter(item=>item===asset).length);
    if(injected!==undefined)return injected;
    return new Response(await readFile('public'+asset));
  };
  const choose=basin=>{q('[data-eu-drainage-choice]').value=basin??'';q('[data-eu-drainage-choice]').dispatchEvent(new w.Event('change',{bubbles:true}));};
  const restore=(layer,basin)=>{const url=new URL(w.location.href);url.pathname='/insight-journal/atlas/europe/'+(['wheat','barley','treecover'].includes(layer)?'agriculture':'nature')+'/';url.search='';url.searchParams.set('layer',layer);url.searchParams.set('render','static');if(['wheat','barley'].includes(layer))url.searchParams.set('single','1');if(basin)url.searchParams.set('basin',basin);w.history.replaceState({},'',url);w.dispatchEvent(new w.PopStateEvent('popstate'));};
  const clickPoint=coordinates=>{const [x,y]=project(coordinates);svg.dispatchEvent(new w.MouseEvent('click',{clientX:x,clientY:y,bubbles:true}));};
  w.eval(bundled.outputFiles[0].text);
  await until(()=>root.dataset.initialized==='true');await tick();
  return{w,q,config,draws,requests,warnings,choose,restore,clickPoint,grid,result,gridHome,resultSemantics};
}

test('drainage lookup feedback follows the basin choice with one live result, and other subjects restore its existing home',async()=>{
  const app=await setup();
  const controls=app.q('[data-eu-drainage-controls]');
  const assertSameReading=()=>{
    assert.equal(app.w.document.querySelectorAll('[data-eu-subject-grid]').length,1);
    assert.equal(app.w.document.querySelectorAll('[data-eu-subject-result]').length,1);
    assert.ok(app.q('[data-eu-subject-grid]')===app.grid,'Move the existing value panel rather than copying it');
    assert.ok(app.q('[data-eu-subject-result]')===app.result,'Keep the original live result node');
    assert.equal(app.result.getAttribute('role'),app.resultSemantics.role);
    assert.equal(app.result.getAttribute('aria-live'),app.resultSemantics.live);
    assert.equal(app.result.getAttribute('aria-live'),'polite');
  };
  const assertDrainageLocation=()=>{
    assertSameReading();
    assert.ok(app.grid.closest('[data-eu-drainage-controls]')===controls,'Drainage feedback belongs in the basin controls');
    assert.ok(app.grid.previousElementSibling===app.q('[data-eu-basin-summary]'),'The value follows the existing basin summary directly');
    assert.ok(app.q('[data-eu-drainage-choice]').compareDocumentPosition(app.grid)&app.w.Node.DOCUMENT_POSITION_FOLLOWING,'Feedback follows the existing basin selector');
    assert.equal(controls.hidden,false);assert.equal(app.grid.hidden,false);
    assert.equal(app.q('[data-eu-layer-source]').href,app.config.layers.find(layer=>layer.id==='drainage').source);
  };
  const chooseTopic=layer=>{const button=app.q(`[data-eu-topic="${layer}"]`);assert.ok(button);button.click();};
  try{
    assertDrainageLocation();
    const london=app.config.cities.find(city=>city.id==='london');
    app.clickPoint(london.coordinates);
    await until(()=>!app.result.hasAttribute('aria-busy')&&app.result.textContent.includes('HYBAS_ID'));
    assertDrainageLocation();
    app.clickPoint([-30,55]);
    assert.equal(app.result.textContent,'表示範囲外です。');
    assert.equal(app.result.hasAttribute('aria-busy'),false);assertDrainageLocation();

    chooseTopic('terrain');assertSameReading();
    assert.equal(app.grid.hidden,true,'The named-landform map does not show a numeric grid reading');
    for(const layer of ['contours']){
      chooseTopic(layer);assertSameReading();
      assert.ok(app.grid.closest('.eu-read-panel')===app.q('.eu-read-panel'),'Elevation feedback remains beside the map');
      assert.equal(controls.contains(app.grid),false);assert.equal(controls.hidden,true);assert.equal(app.grid.hidden,false);
    }
    for(const layer of ['water','precipitation','climate']){
      chooseTopic(layer);assertSameReading();
      if(layer==='precipitation')assert.ok(app.grid.closest('.eu-read-panel'),'Precipitation value stays beside the map');
      assert.equal(controls.contains(app.grid),false);assert.equal(controls.hidden,true);
      assert.equal(app.grid.hidden,layer!=='precipitation');
    }
    chooseTopic('water');chooseTopic('drainage');assertDrainageLocation();
    assert.match(app.result.textContent,/地図を押すと/);
    assert.deepEqual(app.warnings,[]);
  }finally{await app.w.happyDOM.close();}
});

for(const action of ['choice','clear','popstate','out-of-range']){
  test(`a cold London grid click cannot override a newer ${action} selection when the actual drainage response arrives`,async()=>{
    const gate=defer(),app=await setup(undefined,{fetch:asset=>asset.endsWith('/drainage-v1/values.bin.gz')?gate.promise:undefined});
    try{
      const london=app.config.cities.find(city=>city.id==='london'),a=europeDrainageCell(values,london.coordinates);
      assert.ok(a,'The source London point must fall in a published display section');
      const b=listed.find(basin=>basin.index!==a.index),id=String(b.HYBAS_ID);
      app.clickPoint(london.coordinates);assert.match(app.q('[data-eu-subject-result]').textContent,/読み込んでいます/);
      await until(()=>app.requests.some(asset=>asset.endsWith('/drainage-v1/values.bin.gz')));
      if(action==='choice')app.choose(id);
      if(action==='clear')app.q('[data-eu-drainage-clear]').click();
      if(action==='popstate')app.restore('drainage',id);
      if(action==='out-of-range')app.clickPoint([-30,55]);
      assert.doesNotMatch(app.q('[data-eu-subject-result]').textContent,/読み込んでいます/,'A cancelled grid read stops claiming to load immediately');
      assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);
      gate.resolve(new Response(bytes));
      if(action==='clear'||action==='out-of-range'){
        await tick();await tick();
        assert.equal(new URL(app.w.location.href).searchParams.has('basin'),false);
        assert.equal(new URL(app.w.location.href).searchParams.has('point'),false);
        assert.equal(app.q('[data-eu-drainage-choice]').value,'');
        assert.equal(app.q('[data-eu-drainage-selection]').style.display,'none');
        assert.equal(app.draws.length,0,'No superseded grid response paints an outline after clear');
        assert.doesNotMatch(app.q('[data-eu-basin-summary]').textContent,/HYBAS_ID/);
      }else{
        await until(()=>app.draws.length===1);
        assert.equal(new URL(app.w.location.href).searchParams.get('basin'),id);
        assert.equal(app.q('[data-eu-drainage-choice]').value,id);
        assert.match(app.q('[data-eu-basin-summary]').textContent,new RegExp(id));
        assert.deepEqual(app.draws[0].rgba,europeDrainageOutline(values,b.index).rgba,'The production canvas receives only the newer selected section boundary');
      }
      assert.doesNotMatch(app.q('[data-eu-subject-result]').textContent,new RegExp(String(a.basin.HYBAS_ID)),'The superseded point result never replaces the current reading');
      assert.doesNotMatch(app.q('[data-eu-subject-result]').textContent,/読み込んでいます/);
      assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);
    }finally{gate.resolve(new Response(bytes));await app.w.happyDOM.close();}
  });
}

test('after real cache eviction an old A outline stays hidden while B awaits a failed lookup',async()=>{
  const a=listed[0],b=listed[1],gate=defer();let failedRequest=false;
  const app=await setup('?layer=drainage&render=static&basin='+a.HYBAS_ID,{fetch:(asset,count)=>asset.endsWith('/drainage-v1/values.bin.gz')&&count===2?(failedRequest=true,gate.promise):undefined});
  try{
    await until(()=>app.draws.length===1);const old=app.q('[data-eu-drainage-selection]').getAttribute('href');assert.ok(old);assert.equal(app.q('[data-eu-drainage-selection]').style.display,'');
    const london=app.config.cities.find(city=>city.id==='london');
    // The controller deliberately keeps at most three grids. Real subject/URL
    // changes and SVG clicks evict A without exposing any private cache API.
    for(const layer of ['wheat','barley','treecover']){
      app.restore(layer);app.clickPoint(london.coordinates);
      await until(()=>!app.q(layer==='wheat'?'[data-eu-grid-result]':'[data-eu-subject-result]').textContent.includes('読み込んでいます'));
    }
    app.restore('drainage',String(b.HYBAS_ID));await until(()=>failedRequest);
    assert.equal(app.q('[data-eu-drainage-selection]').style.display,'none','A must disappear immediately when selected B has not been drawn');
    gate.resolve(new Response('',{status:503}));await until(()=>app.q('[data-eu-basin-summary]').textContent.includes('取得できません'));
    assert.equal(new URL(app.w.location.href).searchParams.get('basin'),String(b.HYBAS_ID));assert.equal(app.q('[data-eu-drainage-choice]').value,String(b.HYBAS_ID));
    assert.equal(app.q('[data-eu-drainage-selection]').style.display,'none');assert.equal(app.draws.length,1,'Failed B never reuses the old A outline');
  }finally{gate.resolve(new Response('',{status:503}));await app.w.happyDOM.close();}
});

test('direct reload and native selection restore the same source ID; missing display cells do not become zero or a guessed section',async()=>{
  const a=listed[0],b=listed[1],app=await setup('?layer=drainage&render=static&basin='+a.HYBAS_ID);
  try{
    await until(()=>app.draws.length===1);assert.equal(app.q('[data-eu-drainage-choice]').value,String(a.HYBAS_ID));assert.deepEqual(app.draws[0].rgba,europeDrainageOutline(values,a.index).rgba);
    app.choose(String(b.HYBAS_ID));await until(()=>app.draws.length===2);assert.equal(new URL(app.w.location.href).searchParams.get('basin'),String(b.HYBAS_ID));assert.deepEqual(app.draws[1].rgba,europeDrainageOutline(values,b.index).rgba);
    const reload=await setup(new URL(app.w.location.href).search);
    try{await until(()=>reload.draws.length===1);assert.equal(reload.q('[data-eu-drainage-choice]').value,String(b.HYBAS_ID));assert.deepEqual(reload.draws[0].rgba,app.draws[1].rgba);}finally{await reload.w.happyDOM.close();}
    const ocean=[-20,55];assert.equal(europeDrainageCell(values,ocean),undefined);
    app.clickPoint(ocean);await until(()=>!new URL(app.w.location.href).searchParams.has('basin'));
    assert.equal(app.q('[data-eu-drainage-choice]').value,'');assert.equal(app.q('[data-eu-drainage-selection]').style.display,'none');assert.match(app.q('[data-eu-basin-summary]').textContent,/有効な区画がありません/);assert.match(app.q('[data-eu-subject-result]').textContent,/データなし/);assert.doesNotMatch(app.q('[data-eu-subject-result]').textContent,/：0 /);
  }finally{await app.w.happyDOM.close();}
});

test('an out-of-range click clears a completed drainage selection and its comparison snapshot; popstate restores either history state',async()=>{
  const app=await setup();
  const url=()=>new URL(app.w.location.href);
  const sourceChoices=()=>[...app.w.document.querySelectorAll('[data-eu-comparison-link]')].map(link=>new URLSearchParams(new URL(link.href).searchParams.get('europeReturn')));
  const assertCleared=()=>{
    assert.equal(url().searchParams.has('point'),false,'The invalid point does not survive in URL state');
    assert.equal(url().searchParams.has('basin'),false,'The previous basin is cleared with the invalid point');
    assert.equal(app.q('[data-eu-drainage-choice]').value,'');
    assert.equal(app.q('[data-eu-drainage-selection]').style.display,'none');
    assert.equal(app.q('[data-eu-selected-point]').hidden,true);
    assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);
    assert.ok(app.q('[data-eu-subject-result]').closest('[data-eu-drainage-controls]')===app.q('[data-eu-drainage-controls]'),'Range feedback stays with the cleared selector during history restoration');
    assert.doesNotMatch(app.q('[data-eu-basin-summary]').textContent,/HYBAS_ID/);
    const snapshots=sourceChoices();assert.ok(snapshots.length>0);
    for(const source of snapshots){assert.equal(source.has('point'),false);assert.equal(source.has('basin'),false);}
  };
  const replay=href=>{app.w.history.replaceState({},'',href);app.w.dispatchEvent(new app.w.PopStateEvent('popstate'));};
  try{
    const london=app.config.cities.find(city=>city.id==='london'),cell=europeDrainageCell(values,london.coordinates);
    assert.ok(cell);const id=String(cell.basin.HYBAS_ID);
    app.clickPoint(london.coordinates);
    await until(()=>app.draws.length===1&&url().searchParams.get('basin')===id&&!app.q('[data-eu-subject-result]').hasAttribute('aria-busy'));
    assert.equal(app.q('[data-eu-drainage-choice]').value,id);
    assert.equal(app.q('[data-eu-drainage-selection]').style.display,'');
    assert.ok(url().searchParams.get('point'));
    for(const source of sourceChoices()){assert.equal(source.get('basin'),id);assert.ok(source.get('point'));}
    const selected=app.w.location.href,historyLength=app.w.history.length;

    app.clickPoint([-30,55]);assertCleared();
    assert.equal(app.q('[data-eu-subject-result]').textContent,'表示範囲外です。');
    assert.equal(app.w.history.length,historyLength+1,'The range-out click creates one cleared state');
    const cleared=app.w.location.href;
    await tick();assertCleared();

    replay(selected);
    await until(()=>url().searchParams.get('basin')===id&&!app.q('[data-eu-subject-result]').hasAttribute('aria-busy'));
    assert.equal(app.q('[data-eu-drainage-choice]').value,id);
    assert.equal(app.q('[data-eu-drainage-selection]').style.display,'');
    assert.equal(url().searchParams.get('point'),new URL(selected).searchParams.get('point'));
    for(const source of sourceChoices()){assert.equal(source.get('basin'),id);assert.ok(source.get('point'));}
    assert.equal(app.w.history.length,historyLength+1,'Restoring the selected grid must not create a history entry');

    replay(cleared);await tick();assertCleared();
    assert.match(app.q('[data-eu-subject-result]').textContent,/地図を押すと/);
    assert.equal(app.w.history.length,historyLength+1,'Forward to the cleared state must not create a history entry');
    assert.equal(app.draws.length,1,'The cleared state never repaints the previous basin');
  }finally{await app.w.happyDOM.close();}
});

test('a drainage section names a representative river only when its retained MAIN_BAS agrees',async()=>{
  const app=await setup();
  try{
    for(const river of app.config.readings.filter(item=>item.field==='nature'&&item.layer==='water')){
      const cell=europeDrainageCell(values,river.coordinates);assert.ok(cell);
      app.choose(String(cell.basin.HYBAS_ID));
      await until(()=>app.q('[data-eu-basin-summary]').textContent.includes(river.name));
      assert.match(app.q('[data-eu-basin-summary]').textContent,/同じMAIN_BAS.*モデル区画/);
      assert.match(app.q('[data-eu-basin-summary]').textContent,/流域全体とは限りません/);
    }
  }finally{await app.w.happyDOM.abort();}
});
