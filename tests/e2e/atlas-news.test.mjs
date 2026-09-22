import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const bundle=await build({entryPoints:['src/scripts/atlas-news.ts'],bundle:true,write:false,format:'iife',globalName:'NewsTest'});
test('all field pages share one news rail and never publish unrelated sample articles',async()=>{
  for(const field of ['nature','agriculture','industry','population']){
    const html=await readFile(`dist/atlas/north-america/${field}/index.html`,'utf8');
    assert.equal((html.match(/<aside[^>]*data-news-rail/g)||[]).length,1);
    assert.match(html,/記事の追加を待っています/);
    assert.doesNotMatch(html,/data-news-open=/);
  }
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
    q('[data-news-close]').click();
    assert.equal(q('[data-news-reader]').hidden,true);
    assert.equal(q('[data-news-list]').hidden,false);
    assert.equal(window.document.activeElement,q('[data-news-open]'));
    assert.equal(moves,1);
  }finally{await window.happyDOM.close();}
});
