import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { project, unproject, displayCell } from '../../src/lib/atlas-europe-view.ts';


const entry=path.resolve('src/lib/atlas-europe-explorer.ts');
const bundled=await build({
  stdin:{contents:"import { initEuropeAtlas } from './atlas-europe-explorer.ts'; initEuropeAtlas();",resolveDir:path.dirname(entry),sourcefile:path.join(path.dirname(entry),'elevation-controller-test-entry.ts'),loader:'ts'},
  tsconfigRaw:{compilerOptions:{}},bundle:true,write:false,format:'iife',platform:'browser',
  plugins:[{name:'europe-elevation-local-source',setup(builder){
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
const bytes=gunzipSync(await readFile('public/assets/atlas/europe/physical-v1/elevation.bin.gz'));
const elevation=Float32Array.from(new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2));
const elevationAsset='/assets/atlas/europe/physical-v1/elevation.bin.gz';
const pointFor=predicate=>{
  const index=elevation.findIndex(predicate);
  assert.notEqual(index,-1,'The published elevation grid must contain the requested fixture');
  return unproject([(index%1800+.5)/1800*1200,(Math.floor(index/1800)+.5)/1502*1001]);
};
const zero=pointFor(value=>value===0),negative=pointFor(value=>value<0&&value!==-32768),alps=[9.5,46.6],ocean=[-20,55];
const defer=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};};
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
async function until(check,message='Europe elevation controller did not settle'){
  for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5));}
  throw Error(message);
}

async function setup(location='?layer=contours&render=static',fixture={}){
  const url=new URL(location,'https://example.com/insight-journal/atlas/europe/nature/');
  const field=url.pathname.match(/\/atlas\/europe\/(nature|agriculture|industry|population)\//)?.[1]??'nature';
  const html=(await readFile(`dist/atlas/europe/${field}/index.html`,'utf8'))
    .replace(/<script(?![^>]*type=["']application\/json["'])[^>]*>[\s\S]*?<\/script>/g,'')
    // Elevation, population and industry controller checks do not consume the
    // large farming geometry. Keep its contract while omitting those bytes.
    .replace(/(<script type="application\/json" data-eu-config>)([\s\S]*?)(<\/script>)/,(_,open,json,close)=>{const data=JSON.parse(json);data.farmingAreas.features=[];return open+JSON.stringify(data)+close;})
    .replace(/\sd="[^"]*"/g,' d=""');
  const w=new Window({url:url.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  // State commits and annotation rendering use separate frames; exercise a busy renderer.
  if(fixture.animationFrameDelay){
    const requestFrame=w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame=callback=>requestFrame(time=>w.setTimeout(()=>callback(time),fixture.animationFrameDelay));
  }
  w.document.body.innerHTML=html;
  const q=selector=>w.document.querySelector(selector),root=q('[data-europe-detail]');
  const config=JSON.parse(q('[data-eu-config]').textContent);
  assert.ok(q('[data-eu-selected-point]'),'Build the current Europe page before running the controller tests');
  assert.equal(config.layers.find(layer=>layer.id==='contours').valueUnit,'m','Built config must separate contour interval from lookup units');
  const stage=q('.eu-map-stage'),svg=q('[data-eu-static]');
  for(const node of [stage,svg]){
    Object.defineProperty(node,'clientWidth',{value:1200});Object.defineProperty(node,'clientHeight',{value:1001});
    node.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:1200,bottom:1001,width:1200,height:1001});
  }
  const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this;}};
  svg.getScreenCTM=()=>identity;
  w.DOMPoint=class{constructor(x=0,y=0){this.x=x;this.y=y;}matrixTransform(m){return new this.constructor(m.a*this.x+m.c*this.y+m.e,m.b*this.x+m.d*this.y+m.f);}};
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;
  const requests=[],warnings=[];
  w.console.warn=(...args)=>warnings.push(args.map(String).join(' '));
  w.fetch=async input=>{
    const asset=new URL(String(input),w.location.href).pathname.replace(/^\/insight-journal\//,'/');requests.push(asset);
    const injected=fixture.fetch?.(asset,requests.filter(item=>item===asset).length);
    if(injected!==undefined)return injected;
    return new Response(await readFile('public'+asset));
  };
  const clickPoint=coordinates=>{const [x,y]=project(coordinates);svg.dispatchEvent(new w.MouseEvent('click',{clientX:x,clientY:y,bubbles:true}));};
  const restore=href=>{w.history.replaceState({},'',href);w.dispatchEvent(new w.PopStateEvent('popstate'));};
  const choose=layer=>{
    const button=q(`[data-eu-topic="${layer}"]`)??q(`[data-eu-layer="${layer}"]`);
    assert.ok(button,`The existing ${layer} control must be present`);button.click();
  };
  w.eval(bundled.outputFiles[0].text);
  await until(()=>root.dataset.initialized==='true');await tick();
  return{w,q,config,requests,warnings,clickPoint,restore,choose};
}
function savedPoint(app){return new URL(app.w.location.href).searchParams.get('point')?.split(',').map(Number);}
function assertPoint(app,point){
  const saved=savedPoint(app);assert.ok(saved,'A selected grid point is present in the URL');
  assert.ok(saved.every((value,index)=>Math.abs(value-point[index])<1e-10),'URL coordinates preserve the selected display cell');
  const marker=app.q('[data-eu-selected-point]');assert.equal(marker.hidden,false);
  const [x,y]=project(point);
  // CSSOM serializes pixel values with limited decimal precision.
  assert.ok(Math.abs(parseFloat(marker.style.left)-x)<.01,`Marker x ${marker.style.left} corresponds to ${x}`);
  assert.ok(Math.abs(parseFloat(marker.style.top)-y)<.01,`Marker y ${marker.style.top} corresponds to ${y}`);
  assert.match(marker.getAttribute('aria-label'),/選択地点/);
}
function expectedReading(point){
  const cell=displayCell(elevation,point,-32768);assert.ok(cell);
  const value=cell.value===null?'データなし':`${cell.value.toLocaleString('ja-JP',{maximumFractionDigits:1})} m`;
  return `表示格子中心 ${cell.center[1].toFixed(3)}°N, ${cell.center[0].toFixed(3)}°E：${value}（ETOPO 2022）`;
}
async function assertReading(app,point){
  const result=app.q('[data-eu-subject-result]');
  await until(()=>result.textContent===expectedReading(point),`Expected the published elevation at ${point}`);
  assert.equal(result.hasAttribute('aria-busy'),false);assertPoint(app,point);
}

test('terrain keeps the named landforms visible; contours query real elevation including zero, below-sea-level land and ocean missingness',async()=>{
  assert.equal(displayCell(elevation,zero,-32768).value,0);
  assert.ok(displayCell(elevation,negative,-32768).value<0);
  assert.equal(displayCell(elevation,ocean,-32768).value,null);
  const app=await setup();
  try{
    app.choose('terrain');
    assert.equal(app.q('[data-eu-subject-grid]').hidden,true,'The landform overview does not ask for a numeric grid reading');
    assert.equal(app.q('[data-eu-subject-legend]').hidden,true,'The landform overview does not repeat the elevation key');
    assert.match(app.q('[data-eu-map-place="alps"][data-eu-map-kind="feature"]').textContent,/アルプス/);
    for(const point of [alps,zero,negative,ocean]){
      app.choose('contours');
      const view=app.q('[data-eu-static]').getAttribute('viewBox'),historyLength=app.w.history.length;
      app.clickPoint(point);await assertReading(app,point);
      assert.equal(app.w.history.length,historyLength+1,'One point click creates one restorable history entry');
      assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),view,'Selecting a value retains the current map extent');
      assert.equal(app.q('[data-eu-subject-grid]').closest('.eu-read-panel'),app.q('.eu-read-panel'),'The elevation result is beside the map');
      assert.match(app.q('[data-eu-legend-title]').textContent,/500m間隔/);
      assert.match(app.q('[data-eu-layer-note]').textContent,/1,000m間隔.*標高精度を意味しません/);
      assert.match(app.q('[data-eu-grid-title]').textContent,/標高.*m.*ETOPO 2022/);
      assert.doesNotMatch(app.q('[data-eu-subject-result]').textContent,/標高 m|500m間隔/);
    }
    assert.equal(app.requests.filter(asset=>asset===elevationAsset).length,1,'Contour lookups share the source grid cache');
    assert.deepEqual(app.warnings,[]);
  }finally{await app.w.happyDOM.close();}
});

for(const layer of ['terrain']){
  test(`${layer} named feature selection survives comparison return and a fresh page load`,async()=>{
    const app=await setup(`?layer=${layer}&render=static`);
    try{
      app.q('[data-eu-map-place="alps"][data-eu-map-kind="feature"]').click();
      assert.equal(new URL(app.w.location.href).searchParams.get('feature'),'alps');
      assert.equal(app.q('[data-eu-subject-grid]').hidden,true);
      assert.match(app.q('[data-eu-subject-title]').textContent,/アルプス/);
      const compareUrl=new URL(app.q('[data-eu-comparison-link="nature-density"]').href);
      const source=new URLSearchParams(compareUrl.searchParams.get('europeReturn'));
      assert.equal(source.get('layer'),layer);assert.equal(source.get('feature'),'alps');
      const comparison=await setup(compareUrl.href);
      try{
        const back=comparison.q('[data-eu-comparison-return]');assert.match(back.textContent,/アルプス.*元の選択へ戻る/);
        const backUrl=new URL(back.href);assert.equal(backUrl.pathname,'/insight-journal/atlas/europe/nature/');assert.equal(backUrl.searchParams.get('layer'),layer);assert.equal(backUrl.searchParams.has('europeReturn'),false);
        const reload=await setup(back.href);
        try{assert.equal(reload.q('[data-eu-subject-grid]').hidden,true);assert.equal(new URL(reload.w.location.href).searchParams.get('feature'),'alps');assert.match(reload.q('[data-eu-subject-title]').textContent,/アルプス/);}finally{await reload.w.happyDOM.close();}
      }finally{await comparison.w.happyDOM.close();}
    }finally{await app.w.happyDOM.close();}
  });
}

test('elevation drops a stale named district but preserves the actual point through comparison and reload',async()=>{
  const app=await setup('?layer=contours&feature=alps&point='+alps.join(',')+'&render=static');
  try{
    await assertReading(app,alps);
    assert.equal(new URL(app.w.location.href).searchParams.has('feature'),false);
    assert.equal(app.q('[data-eu-feature-list]').hidden,true);
    assert.equal(app.q('[data-eu-feature-card]').hidden,true);
    assert.match(app.q('[data-eu-subject-title]').textContent,/標高/);
    const comparison=await setup(app.q('[data-eu-comparison-link="nature-density"]').href);
    try{
      const back=comparison.q('[data-eu-comparison-return]');
      const reload=await setup(back.href);
      try{await assertReading(reload,alps);assert.equal(new URL(reload.w.location.href).searchParams.has('feature'),false);assert.equal(reload.q('[data-eu-feature-list]').hidden,true);}
      finally{await reload.w.happyDOM.close();}
    }finally{await comparison.w.happyDOM.close();}
  }finally{await app.w.happyDOM.close();}
});

test('back/forward popstate and reload restore arbitrary clicked points without inventing a feature selection',async()=>{
  const app=await setup();
  try{
    const unselected=app.w.location.href;
    app.clickPoint(alps);await assertReading(app,alps);const first=app.w.location.href;
    app.restore(unselected);
    assert.equal(savedPoint(app),undefined);
    assert.equal(app.q('[data-eu-selected-point]').hidden,true);
    assert.match(app.q('[data-eu-subject-result]').textContent,/地図を押すと/,'Back to an unselected view clears the completed old elevation');
    assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);
    app.restore(first);await assertReading(app,alps);
    app.clickPoint(negative);await assertReading(app,negative);const second=app.w.location.href;
    app.restore(first);await assertReading(app,alps);
    app.restore(second);await assertReading(app,negative);
    assert.equal(new URL(app.w.location.href).searchParams.has('feature'),false);
    const reload=await setup(second);
    try{await assertReading(reload,negative);}finally{await reload.w.happyDOM.close();}
    app.choose('climate');assert.equal(app.q('[data-eu-selected-point]').hidden,true,'A grid selection does not impersonate a climate station');
    app.choose('terrain');assert.equal(app.q('[data-eu-subject-grid]').hidden,true);
    app.choose('contours');await assertReading(app,negative);
  }finally{await app.w.happyDOM.close();}
});

test('a deferred old point cannot replace a newer point when the shared elevation response arrives',async()=>{
  const gate=defer(),app=await setup(undefined,{fetch:asset=>asset===elevationAsset?gate.promise:undefined});
  try{
    app.clickPoint(alps);await until(()=>app.requests.includes(elevationAsset));
    assert.equal(app.q('[data-eu-subject-result]').getAttribute('aria-busy'),'true');
    app.clickPoint(negative);assertPoint(app,negative);
    const latest=app.w.location.href;gate.resolve(new Response(bytes));await assertReading(app,negative);await tick();
    assert.equal(app.w.location.href,latest);assert.equal(app.q('[data-eu-subject-result]').textContent,expectedReading(negative));
    assert.equal(app.requests.filter(asset=>asset===elevationAsset).length,1);
  }finally{gate.resolve(new Response(bytes));await app.w.happyDOM.close();}
});

for(const failed of [false,true]){
  test(`switching to climate clears busy state and rejects a late elevation ${failed?'failure':'success'}`,async()=>{
    const gate=defer(),app=await setup(undefined,{fetch:asset=>asset===elevationAsset?gate.promise:undefined});
    try{
      app.clickPoint(alps);await until(()=>app.requests.includes(elevationAsset));
      app.choose('climate');
      const result=app.q('[data-eu-subject-result]'),message=result.textContent,latest=app.w.location.href;
      assert.equal(result.hasAttribute('aria-busy'),false);assert.doesNotMatch(message,/読み込んでいます/);
      assert.equal(app.q('[data-eu-subject-grid]').hidden,true);assert.equal(app.q('[data-eu-selected-point]').hidden,true);
      gate.resolve(failed?new Response('',{status:503}):new Response(bytes));await tick();await tick();
      assert.equal(result.textContent,message);assert.equal(result.hasAttribute('aria-busy'),false);assert.equal(app.w.location.href,latest);
      assert.match(app.q('[data-eu-map-title]').textContent,/気候/);
    }finally{gate.resolve(new Response(bytes));await app.w.happyDOM.close();}
  });
}

test('a failed elevation lookup clears busy state and a new click retries the real source',async()=>{
  const app=await setup(undefined,{fetch:(asset,count)=>asset===elevationAsset&&count===1?new Response('',{status:503}):undefined});
  try{
    app.clickPoint(alps);await until(()=>app.q('[data-eu-subject-result]').textContent.includes('数値を読み込めませんでした'));
    assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);assertPoint(app,alps);
    app.clickPoint(zero);await assertReading(app,zero);assert.equal(app.requests.filter(asset=>asset===elevationAsset).length,2);
  }finally{await app.w.happyDOM.close();}
});

test('a slow elevation response cannot overwrite the newer precipitation value at the saved point',async()=>{
  const gate=defer(),app=await setup(undefined,{fetch:asset=>asset===elevationAsset?gate.promise:undefined});
  try{
    app.clickPoint(alps);await until(()=>app.requests.includes(elevationAsset));
    app.choose('precipitation');
    const result=app.q('[data-eu-subject-result]');
    await until(()=>!result.hasAttribute('aria-busy')&&result.textContent.includes('mm'));
    assert.ok(app.requests.some(asset=>asset.endsWith('/precipitation-v1/values.bin.gz')));
    const message=result.textContent,latest=app.w.location.href;assertPoint(app,alps);
    gate.resolve(new Response(bytes));await tick();await tick();
    assert.equal(result.textContent,message);assert.equal(result.hasAttribute('aria-busy'),false);
    assert.equal(app.w.location.href,latest);assert.equal(new URL(latest).searchParams.get('layer'),'precipitation');
    assert.doesNotMatch(result.textContent,/ETOPO/);
  }finally{gate.resolve(new Response(bytes));await app.w.happyDOM.close();}
});

test('the map owns a single source-backed key and arrow keys preserve the selected point across nature topics',async()=>{
  const point=[9.5,46.6],app=await setup('?layer=terrain&render=static&point='+point.join(','));
  try{
    assert.equal(app.q('[data-eu-subject-grid]').hidden,true);
    const host=app.q('[data-eu-map-legend]');
    assert.equal(app.q('[data-eu-subject-legend]').parentElement,host);
    assert.equal(app.q('[data-eu-climate-legend]').parentElement,host);
    assert.equal(app.q('.eu-read-panel [data-eu-subject-legend]'),null);
    assert.equal(app.w.document.querySelectorAll('[data-eu-subject-legend]').length,1);
    assert.ok(app.q('.eu-map-stage').compareDocumentPosition(host)&4);
    const terrain=app.q('[data-eu-topic="terrain"]');terrain.focus();
    terrain.dispatchEvent(new app.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    await assertReading(app,point);
    const contours=app.q('[data-eu-topic="contours"]');
    assert.equal(app.w.document.activeElement,contours);
    assert.equal(contours.getAttribute('aria-selected'),'true');
    assert.equal(contours.tabIndex,0);assert.equal(terrain.tabIndex,-1);assertPoint(app,point);
    contours.dispatchEvent(new app.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    assert.equal(new URL(app.w.location.href).searchParams.get('layer'),'climate');
    assert.equal(app.w.document.activeElement,app.q('[data-eu-topic="climate"]'));
    assert.equal(app.q('[data-eu-climate-legend]').hidden,false);
    assert.equal(app.q('[data-eu-subject-legend]').hidden,true);
    assert.deepEqual(savedPoint(app),point);
  }finally{await app.w.happyDOM.close();}
});

test('a click outside the published extent clears the old point instead of leaving its elevation visible',async()=>{
  const point=[9.5,46.6],app=await setup('?layer=contours&render=static&point='+point.join(','));
  try{
    await assertReading(app,point);
    app.clickPoint([70,50]);
    assert.equal(savedPoint(app),undefined);
    assert.equal(app.q('[data-eu-selected-point]').hidden,true);
    assert.equal(app.q('[data-eu-subject-result]').textContent,'表示範囲外です。');
    assert.equal(app.q('[data-eu-subject-result]').hasAttribute('aria-busy'),false);
  }finally{await app.w.happyDOM.close();}
});

for(const topic of ['ethnicity'])test(`${topic} keeps the unselected legend and the explicit source scale beneath the map`,async()=>{
  const app=await setup(`https://example.com/insight-journal/atlas/europe/population/?layer=${topic}&render=static`);
  try{
    const legend=app.q('.eu-culture-legend');
    assert.equal(legend.parentElement,app.q('[data-eu-map-legend]'));
    assert.equal(legend.hidden,false);assert.equal(app.q('[data-eu-subject-legend]').hidden,true);
    assert.equal(app.w.document.querySelectorAll('.eu-culture-legend').length,1);
    assert.equal(legend.children.length,7);
    assert.ok([...legend.querySelectorAll('[data-culture-scale-key]')].every(key=>key.hidden));
    assert.equal(legend.lastElementChild.hidden,false);
    assert.match(legend.lastElementChild.textContent,topic==='religion'?/未掲載・資料未取得.*0%ではありません/:/未掲載・3対象以外.*0%ではありません/);
    assert.match(legend.lastElementChild.querySelector('i').getAttribute('style'),/#b8bec7/);
    assert.match(app.q('[data-culture-denominator]').textContent,/分母/);
    const select=(selector,value)=>{const node=app.q(selector);node.value=value;node.dispatchEvent(new app.w.Event('change',{bubbles:true}));};
    select('[data-culture-case]','england-wales-2021');
    select('[data-culture-category]',topic==='religion'?'ts030-02':'ts021-17');
    assert.equal(legend.lastElementChild.hidden,true);
    assert.equal(legend.querySelectorAll('[data-culture-scale-key]:not([hidden])').length,6);
    assert.match(legend.querySelectorAll('[data-culture-scale-key]')[5].textContent,/未掲載・数値なし/);
    app.choose('contours');
    assert.equal(legend.hidden,true);assert.equal(app.q('[data-eu-subject-legend]').hidden,false);
  }finally{await app.w.happyDOM.close();}
});

for(const topic of ['ethnicity'])test(`${topic} shows all three published response compositions without an initial case and preserves explicit selection/history`,async()=>{
  const app=await setup(`/insight-journal/atlas/europe/population/?layer=${topic}&render=static`,{animationFrameDelay:40});
  try{
    const visibleCompositions=()=>app.w.document.querySelectorAll('[data-eu-composition]:not([hidden])').length;
    const initial=app.w.location.href,full=app.q('[data-eu-static]').getAttribute('viewBox');
    const key=app.q('[data-eu-culture-composition-key]');assert.equal(key.hidden,false);
    await until(()=>app.w.document.querySelectorAll('[data-eu-composition]').length===3,'The annotation frame renders all three compositions');
    assert.equal(key.querySelectorAll('[data-eu-composition-table]').length,3);
    assert.equal(app.q('[data-culture-case]').value,'');assert.equal(app.q('[data-culture-category]').value,'');assert.equal(app.q('[data-culture-area]').value,'');
    await until(()=>app.w.document.querySelectorAll('[data-eu-composition]:not([hidden])').length===3);
    const expected=topic==='ethnicity'?[5,5,8]:[9,9,12];
    for(const [index,code] of ['E92000001','W92000004','HRV'].entries()){
      const button=app.q(`[data-eu-composition="${topic}-${code}"]`);assert.equal(button.querySelectorAll('circle').length,expected[index]);
      assert.equal(button.querySelector('svg').getAttribute('viewBox'),'0 0 56 56');
      assert.equal(key.querySelector(`[data-eu-composition-table="${code}"]`).querySelectorAll('tbody tr').length,expected[index]);
    }
    assert.match(app.q('[data-culture-overview]').textContent,topic==='religion'?/Czechia.*Estonia.*欧州全域の完成分布ではありません/: /自己認識.*言語分布.*実践/);
    app.q(`[data-eu-composition="${topic}-HRV"]`).click();
    await until(()=>visibleCompositions()===0,'Selecting a census case hides every overview composition');
    assert.equal(app.q('[data-culture-case]').value,'croatia-national-2021');assert.equal(key.hidden,true);
    assert.equal(app.q('[data-culture-category]').value,'');assert.equal(app.q('[data-culture-area]').value,'');
    assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),full);assert.equal(app.w.document.querySelectorAll('[data-eu-composition]:not([hidden])').length,0);
    assert.equal(new URL(app.w.location.href).searchParams.has('feature'),false);
    app.restore(initial);assert.equal(key.hidden,false);assert.equal(app.q('[data-culture-case]').value,'');
    await until(()=>app.w.document.querySelectorAll('[data-eu-composition]:not([hidden])').length===3);
    const select=app.q('[data-culture-case]');select.value='england-wales-2021';select.dispatchEvent(new app.w.Event('change'));
    await until(()=>visibleCompositions()===0,'The case selector hides every overview composition');
    select.value='';select.dispatchEvent(new app.w.Event('change'));
    await until(()=>visibleCompositions()===3,'Clearing the case restores all three overview compositions');
    assert.equal(key.hidden,false);
    assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),full);
  }finally{await app.w.happyDOM.close();}
});

test('religion shows the 2020 country compositions and keeps national census details separate',async()=>{
  const app=await setup('/insight-journal/atlas/europe/population/?layer=religion&render=static');
  try{
    assert.equal(app.w.document.querySelectorAll('[data-eu-religion-national]:not([hidden])').length,0);
    const colorKey=app.q('[data-eu-religion-color-key]');
    assert.equal(colorKey.parentElement,app.q('[data-eu-map-legend]'));
    assert.equal(colorKey.hidden,false);
    assert.equal(app.q('[data-eu-pew-map-key]').hidden,false);
    assert.equal(app.w.document.querySelectorAll('[data-eu-pew-marker]').length,40);
    assert.equal(app.q('[data-eu-shape="CZE"]').style.fill,app.q('[data-eu-shape="DEU"]').style.fill);
    assert.equal(app.q('[data-eu-pew-marker="CZE"] .eu-pew-marker-bar').children[2].style.width,'72.8%');
    assert.equal(app.q('[data-eu-pew-marker="ALB"] .eu-pew-marker-bar').children[1].style.width,'74.5%');
    assert.match(app.q('[data-eu-shape="VAT"]').style.fill,/(#f2eee5|rgb\(242, 238, 229\))/);
    assert.equal(app.w.document.querySelectorAll('[data-eu-religion-evidence]:not([hidden])').length,0);
    assert.match(app.q('[data-culture-takeaway]').textContent,/概説.*67.1%.*25.3%.*6.0%/);
    assert.match(app.q('[data-culture-overview]').textContent,/解説.*オスマン帝国/);
    app.q('[data-eu-pew-marker="SRB"]').click();
    await until(()=>!app.q('[data-eu-religion-evidence-reading]').hidden);
    assert.equal(app.q('[data-eu-religion-evidence-reading]').previousElementSibling,null);
    assert.equal(app.q('[data-culture-case]').value,'');
    assert.match(app.q('[data-eu-religion-evidence-reading]').textContent,/2020年推計.*キリスト教 91.5%.*イスラム教 4.4%.*正教会.*5,387,426人/s);
    app.q('[data-eu-religion-local="religion-subotica"]').click();
    await until(()=>app.w.document.querySelectorAll('[data-eu-religion-evidence]:not([hidden])').length===1);
    assert.match(app.q('[data-eu-religion-evidence-reading]').textContent,/カトリック.*59,748人.*正教会.*37,674人/s);
    assert.equal(new URL(app.w.location.href).searchParams.get('feature'),'religion-subotica');
    app.q('[data-eu-religion-back]').click();
    assert.equal(app.q('[data-eu-religion-evidence-reading]').hidden,true);
    assert.equal(app.q('[data-eu-pew-map-key]').hidden,false);
  }finally{await app.w.happyDOM.close();}
});


test('産業分野は国を自動選択せず、全拠点を保ったまま強調し全体へ戻れる',async()=>{
  const app=await setup('/insight-journal/atlas/europe/industry/?layer=hubs&render=static');
  try{
    const full=app.q('[data-eu-static]').getAttribute('viewBox');
    app.q('[data-eu-industry-group="自動車・機械"]').click();await tick();
    const params=new URL(app.w.location.href).searchParams;
    assert.equal(params.get('industryGroup'),'自動車・機械');assert.equal(params.has('place'),false);assert.equal(params.has('feature'),false);
    assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),full);
    const config=app.config.readings.filter(item=>item.field==='industry');
    assert.equal(config.filter(item=>app.q(`[data-eu-feature-point="${item.id}"]`).style.display!=='none').length,22);
    assert.match(app.q('[data-eu-subject-takeaway]').textContent,/ドイツ南部.*チェコ/);
    const country=app.q('[data-eu-country-navigation]');country.value='DEU';country.dispatchEvent(new app.w.Event('change'));
    assert.match(app.q('[data-eu-country-overview]').href,/\/atlas\/europe\/overview\/\?country=DEU$/);
    app.choose('hubs');await tick();
    assert.equal(app.q('[data-eu-country-reader]').hidden,true);
    assert.equal(new URL(app.w.location.href).searchParams.has('industryGroup'),false);
    assert.equal(new URL(app.w.location.href).searchParams.has('place'),false);
  }finally{await app.w.happyDOM.close();}
});

test('産業は10分野の復元でも他分野の拠点と欧州全体の表示を保つ',async()=>{
  const app=await setup('/insight-journal/atlas/europe/industry/?layer=hubs&industryGroup=化学・医薬品&render=static');
  try{
    const full=app.q('[data-eu-static]').getAttribute('viewBox');
    assert.equal(app.q('[data-eu-industry-scope-host]').hidden,true);
    assert.equal(app.q('[data-eu-country-reader]').hidden,true);
    assert.match(app.q('[data-eu-subject-takeaway]').textContent,/ライン川下流.*化学/);
    app.restore('?layer=hubs&place=NLD&feature=rotterdam&render=static');await tick();
    assert.equal(app.q('[data-eu-country-reader]').hidden,true);assert.match(app.q('[data-eu-subject-title]').textContent,/ロッテルダム/);
    assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),full);
    app.restore('?layer=hubs&industryGroup=食品加工&render=static');await tick();
    assert.match(app.q('[data-eu-subject-title]').textContent,/食品加工/);
    assert.equal(app.q('[data-eu-topic="hubs"][data-eu-industry-group="食品加工"]').getAttribute('aria-pressed'),'true');
    const points=app.config.readings.filter(item=>item.field==='industry');assert.ok(points.every(item=>app.q(`[data-eu-feature-point="${item.id}"]`).style.display!=='none'));
  }finally{await app.w.happyDOM.close();}
});

test('気候の空の都市選択と全体へ操作は雨温図を解除して概要を復元する',async()=>{
  const app=await setup('?layer=climate&render=static');
  try{
    const choice=app.q('[data-eu-city-choice]');
    for(const reset of [()=>{choice.value='';choice.dispatchEvent(new app.w.Event('change'));},()=>app.q('[data-eu-reset]').click()]){
      choice.value='london';choice.dispatchEvent(new app.w.Event('change'));await tick();
      assert.equal(app.q('[data-eu-climate-overview]').hidden,true);
      reset();await tick();
      assert.equal(choice.value,'');assert.equal(app.q('[data-eu-climate-overview]').hidden,false);
      assert.equal(app.q('[data-eu-climate-statistics]').hidden,true);
      assert.ok([...app.w.document.querySelectorAll('[data-city-reading]')].every(node=>node.hidden));
      assert.equal(new URL(app.w.location.href).searchParams.has('city'),false);
    }
  }finally{await app.w.happyDOM.abort();}
});

test('a named population city reads its published density cell beside the map without changing the camera',async()=>{
  const app=await setup('/insight-journal/atlas/europe/population/?layer=density&render=static');
  try{
    const full=app.q('[data-eu-static]').getAttribute('viewBox'),choice=app.q('[data-eu-feature-choice]');
    const paris=app.config.populationCities.find(city=>city.name==='パリ');
    choice.value=paris.id;choice.dispatchEvent(new app.w.Event('change'));
    await until(()=>app.q('[data-eu-subject-result]').textContent.endsWith('（2020）'));
    assert.deepEqual(savedPoint(app),paris.coordinates);
    const bytes=gunzipSync(await readFile('public/assets/atlas/europe/population-v1/density.bin.gz'));
    const values=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4),cell=displayCell(values,paris.coordinates,-1);
    assert.match(app.q('[data-eu-subject-result]').textContent,new RegExp(cell.value.toLocaleString('ja-JP',{maximumFractionDigits:1})+' 人/km²'));
    assert.ok(app.q('[data-eu-subject-grid]').closest('.eu-read-panel'));
    assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),full);
    assert.equal(new URL(app.w.location.href).searchParams.get('feature'),paris.id);
  }finally{await app.w.happyDOM.abort();}
});

test('industry country readings retain existing quantities and add only relevant WDI definition links',async()=>{
 const baseline=JSON.parse(await readFile('src/data/atlas/europe/country-overview-society.json','utf8'));
 for(const code of ['DEU','GBR','FRA','ITA']){const app=await setup(`/insight-journal/atlas/europe/industry/?layer=hubs&place=${code}&render=static`);try{
  assert.equal(app.q('[data-eu-subject-intro]').textContent,baseline.countries[code].industry.body);
  assert.equal(app.config.industryOverviews[code].facts,undefined);
  const definitions=[...app.q('[data-eu-reading-sources]').querySelectorAll('[data-eu-industry-definition]')];assert.equal(definitions.length,2);assert.deepEqual(definitions.map(a=>new URL(a.href).pathname.split('/').at(-1)).sort(),['NV.IND.MANF.ZS','NV.SRV.TOTL.ZS']);
  assert.match(app.q('[data-eu-subject-note]').textContent,/国全体のGDP.*製造業は鉱工業・建設業/);
  if(code==='FRA')assert.match(app.q('[data-eu-subject-note]').textContent,/海外領土/);
 }finally{await app.w.happyDOM.close();}}
});
