import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {articleMatchesNewsRegion} from '../../src/scripts/atlas-news.ts';

const bundle=await build({stdin:{contents:await readFile('src/scripts/atlas-news.ts','utf8'),loader:'ts',sourcefile:'atlas-news.ts'},bundle:true,write:false,format:'iife',globalName:'NewsTest'});
test('news filters select the public region or country tags while keeping Mexico in North America',()=>{
  assert.equal(articleMatchesNewsRegion({regions:['north_america'],countries:[]}),true);
  assert.equal(articleMatchesNewsRegion({regions:[],countries:['MX']}),true);
  assert.equal(articleMatchesNewsRegion({regions:['latin_america'],countries:[]},'latin-america'),true);
  for(const code of ['BR','AR','CL','CO','GT','SV','CU','JM','PE','UY'])assert.equal(articleMatchesNewsRegion({regions:['world'],countries:[code]},'latin-america'),true,code);
  for(const code of ['MX','US','CA','IN','JP'])assert.equal(articleMatchesNewsRegion({regions:[],countries:[code]},'latin-america'),false,code);
  assert.equal(articleMatchesNewsRegion({regions:['north_america'],countries:[]},'latin-america'),false);
  assert.equal(articleMatchesNewsRegion({regions:['asia'],countries:['IN']},'north-america'),false);
});
test('all field pages share one news rail and never publish unrelated sample articles',async()=>{
  for(const field of ['nature','agriculture','industry','population']){
    const html=await readFile(`dist/atlas/north-america/${field}/index.html`,'utf8');
    assert.equal((html.match(/<aside[^>]*data-news-rail/g)||[]).length,1);
    assert.match(html,/記事の追加を待っています/);
    assert.doesNotMatch(html,/data-news-open=/);
  }
});

test('Latin America uses the same news rail markup with its own public-region label and bounds',async()=>{
  const html=await readFile('dist/atlas/latin-america/index.html','utf8');
  assert.equal((html.match(/<aside[^>]*data-news-rail/g)||[]).length,1);
  assert.match(html,/data-news-region="latin-america"/);
  assert.match(html,/data-news-bounds="-93,-56,-33,28"/);
  assert.match(html,/中南米のニュース/);
  assert.match(html,/aria-label="中南米のニュース一覧"/);
  assert.match(html,/中南米に関連する公開記事を、ここに新着順で表示します。/);
  assert.doesNotMatch(html,/data-news-open=/,'unrelated public sample articles must not appear');
  const window=new Window();
  try{
    window.document.write(html);
    const rail=window.document.querySelector('[data-news-rail]'),shell=rail.parentElement;
    assert.ok(shell.matches('.atlas-desktop-shell[data-atlas-shell]'),'reader expansion uses the shared desktop shell');
    assert.equal(window.document.querySelectorAll('#atlas-news-heading').length,1);
    assert.equal(shell.querySelectorAll('[data-map-surface]').length,1);
    assert.equal(shell.querySelector('[data-map-surface]').getAttribute('tabindex'),'0','news location can focus the real map');
  }finally{await window.happyDOM.close();}
});
test('reader opens locally, preserves atlas state, moves only on explicit request, and restores focus',async()=>{
  const window=new Window({url:'https://example.com/atlas/north-america/industry/?sector=services',settings:{enableJavaScriptEvaluation:true}});
  try{
    window.document.body.innerHTML=`<div data-atlas-shell><aside data-news-rail><div data-news-list><a href="/articles/test/" data-news-open="test">Test</a></div><section data-news-reader hidden><button data-news-close>Back</button><div data-news-body></div></section><template data-news-template="test"><h2 tabindex="-1">Test article</h2><p id="detail">Body</p><a href="#detail">Details</a><button data-news-location data-lng="-90" data-lat="35">Map</button></template></aside><div data-map-surface tabindex="0"></div></div>`;
    const api=window.eval(bundle.outputFiles[0].text+'; NewsTest;');
    api.initAtlasNews(window.document.querySelector('[data-news-rail]'));
    const q=s=>window.document.querySelector(s);
    let moves=0;window.addEventListener('popstate',()=>moves++);
    const before=window.location.href;
    q('[data-news-open]').click();
    assert.equal(q('[data-news-reader]').hidden,false);
    assert.equal(q('[data-news-list]').hidden,true);
    assert.equal(window.location.href,before);
    assert.equal(moves,0);
    assert.equal(q('[data-news-body] a').getAttribute('href'),'#news-detail');
    q('[data-news-location]').click();
    assert.equal(moves,1);
    const url=new URL(window.location.href);
    assert.equal(url.searchParams.get('sector'),'services');
    assert.equal(url.searchParams.get('lng'),'-90');
    assert.equal(url.searchParams.get('lat'),'35');assert.equal(url.searchParams.get('z'),'4');assert.equal(url.searchParams.get('view'),'custom');
    assert.equal(url.searchParams.has('map'),false);
    q('[data-news-close]').click();
    assert.equal(q('[data-news-reader]').hidden,true);
    assert.equal(q('[data-news-list]').hidden,false);
    assert.equal(window.document.activeElement,q('[data-news-open]'));
    assert.equal(moves,1);
  }finally{await window.happyDOM.close();}
});

test('Latin news locations use the Latin URL state and clear incompatible readings without changing the field',async()=>{
  const window=new Window({url:'https://example.com/atlas/latin-america/?field=nature&view=rivers&topic=amazon&city=manaus&place=BRA&map=-60,-3,3',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  try{
    window.document.body.innerHTML=`<div data-atlas-shell><aside data-news-rail data-news-region="latin-america" data-news-bounds="-93,-56,-33,28"><div data-news-list><a href="/articles/latin/" data-news-open="latin">Latin</a></div><section data-news-reader hidden><button data-news-close>Back</button><div data-news-body></div></section><template data-news-template="latin"><h2 tabindex="-1">Latin article</h2><button data-news-location data-lng="-46.63" data-lat="-23.55">Map</button></template></aside><div data-map-surface tabindex="0"></div></div>`;
    const api=window.eval(bundle.outputFiles[0].text+'; NewsTest;'),q=s=>window.document.querySelector(s);
    api.initAtlasNews(q('[data-news-rail]'));
    let moves=0;window.addEventListener('popstate',()=>moves++);
    const before=window.location.href;
    q('[data-news-open]').click();assert.equal(window.location.href,before);assert.equal(moves,0);
    assert.equal(q('[data-atlas-shell]').classList.contains('is-reading-news'),true);
    q('[data-news-location]').click();
    const url=new URL(window.location.href);
    assert.equal(url.searchParams.get('map'),'-46.63,-23.55,4');assert.equal(url.searchParams.get('field'),'nature');assert.equal(url.searchParams.get('view'),'rivers');
    for(const key of ['topic','city','place','lng','lat','z'])assert.equal(url.searchParams.has(key),false,key);
    assert.equal(moves,1);assert.equal(window.document.activeElement,q('[data-map-surface]'));
    q('[data-news-close]').click();assert.equal(window.document.activeElement,q('[data-news-open]'));assert.equal(moves,1);
    assert.equal(q('[data-atlas-shell]').classList.contains('is-reading-news'),false);
  }finally{await window.happyDOM.close();}
});

test('Latin news location actions reject missing or out-of-region coordinates and accept the equator',async()=>{
  const window=new Window({url:'https://example.com/atlas/latin-america/?field=agriculture&crop=soyb',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  try{
    window.document.body.innerHTML='<aside data-news-rail data-news-region="latin-america" data-news-bounds="-93,-56,-33,28"><div data-news-list></div><section data-news-reader hidden><div data-news-body></div></section><button data-news-location>Map</button></aside>';
    const api=window.eval(bundle.outputFiles[0].text+'; NewsTest;'),rail=window.document.querySelector('[data-news-rail]'),button=rail.querySelector('button');
    api.initAtlasNews(rail);let moves=0;window.addEventListener('popstate',()=>moves++);
    const before=window.location.href;
    for(const [lng,lat] of [['-99','20'],['-60','35'],['-60','-60'],['-20','0'],['-60',''],['NaN','0']]){button.dataset.lng=lng;button.dataset.lat=lat;button.click();assert.equal(window.location.href,before);}
    assert.equal(moves,0);
    button.dataset.lng='-60';button.dataset.lat='0';button.click();
    const url=new URL(window.location.href);assert.equal(url.searchParams.get('map'),'-60,0,4');assert.equal(url.searchParams.get('crop'),'soyb');assert.equal(moves,1);
  }finally{await window.happyDOM.close();}
});
