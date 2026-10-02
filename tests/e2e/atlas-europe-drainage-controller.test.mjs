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
  return{w,q,config,draws,requests,warnings,choose,restore,clickPoint};
}

for(const action of ['choice','clear','popstate']){
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
      assert.doesNotMatch(app.q('[data-eu-subject-result]').textContent,/読み込んでいます/,'A cancelled grid read stops claiming to load immediately');
      assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);
      gate.resolve(new Response(bytes));
      if(action==='clear'){
        await tick();await tick();
        assert.equal(new URL(app.w.location.href).searchParams.has('basin'),false);
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
