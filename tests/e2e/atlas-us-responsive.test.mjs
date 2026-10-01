import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

// Verify the release CSS cascade. The accompanying browser QA verifies geometry.
const formatted=new Map();
const usCss=(await transform(await readFile('src/styles/atlas-us-responsive.css','utf8'),{loader:'css'})).code;
async function open(path,width,height=757){
  const window=new Window({width,height,settings:{disableCSSFileLoading:true}});
  window.document.write(await readFile(`dist/atlas/${path}/index.html`,'utf8'));
  for(const node of window.document.querySelectorAll('style,link[rel=stylesheet]')){
    const path=node.tagName==='LINK'?`dist/${node.getAttribute('href').split('/insight-journal/')[1]}`:null;
    const key=path??node.textContent;
    if(!formatted.has(key))formatted.set(key,(await transform(path?await readFile(path,'utf8'):node.textContent,{loader:'css'})).code);
    const style=window.document.createElement('style');style.textContent=formatted.get(key);node.replaceWith(style);
  }
  const css=(selector,property)=>window.getComputedStyle(window.document.querySelector(selector)).getPropertyValue(property).replace(/\s+/g,'');
  function snapshot(){
    return ['.atlas-desktop-shell','.atlas-news','.atlas-explorer','.atlas-primary-grid','.atlas-map-frame','.atlas-national'].filter(s=>window.document.querySelector(s)).map(selector=>[selector,...['display','grid-template-columns','height','min-height','max-height','aspect-ratio','overflow','font-size'].map(p=>css(selector,p))]);
  }
  function injectUs(){const style=window.document.createElement('style');style.textContent=usCss;window.document.head.append(style);}
  return {window,css,snapshot,injectUs};
}

for(const [field,id] of [['agriculture','agriculture'],['nature','natural'],['industry','industry'],['population','population']]){
  test(`US ${field}: the compact news stays beside the map at both small-laptop edges`,async()=>{
    for(const width of [960,1024,1180,1199]){
      const page=await open(`north-america/${field}`,width);
      try{
        const {window,css}=page;
        assert.equal(css('.atlas-desktop-shell','display'),'grid',`${width}px shell`);
        assert.equal(css('.atlas-desktop-shell','grid-template-columns'),'160pxminmax(0,1fr)',`${width}px news column`);
        assert.equal(css('.atlas-news','position'),'sticky');
        assert.equal(css('.atlas-news','width'),'auto');
        assert.equal(css('.atlas-news','min-height'),'0px');
        assert.equal(css('.atlas-news','height'),'calc(100dvh-82px)');
        assert.equal(css('.atlas-news-list','padding-left'),'12px');
        assert.equal(css('.regional-navigation','display'),'flex');
        assert.equal(css('.regional-navigation','flex-wrap'),'wrap');
        assert.equal(css('.regional-countries','margin-top'),'0px');
        assert.equal(css('.atlas-primary-grid','display'),'grid');
        assert.notEqual(css(`[data-field-national=${id}]`,'display'),'none');
        assert.equal(window.document.querySelector(`[data-field-national=${id}]`).hidden,false);
        assert.equal(window.document.querySelector('.atlas-tabs').querySelectorAll('a').length,5);
        if(field==='agriculture'){
          assert.equal(window.document.querySelector('[data-crop-key]').hidden,false);
          assert.ok(window.document.querySelectorAll('[data-crop-key] a').length>=10,'all existing crop, livestock and forestry entries remain available');
        }
        if(field==='nature'){
          assert.equal(css('.atlas-us-natural-takeaway','display'),'block');
          assert.match(window.document.querySelector('.atlas-us-natural-takeaway').textContent,/山地が雨の分布を変え/);
          const link=window.document.querySelector('.atlas-us-natural-takeaway [data-cross-link=agriculture]');
          assert.ok(link,'the existing agriculture comparison action is available before the long city reading');
          assert.ok(link.getAttribute('href').includes('/atlas/north-america/agriculture/'));
          assert.equal(css('.atlas-us-natural-takeaway a','min-height'),'44px');
          assert.equal(css('.atlas-us-natural-takeaway p','font-size'),'14px');
        }
        if(field==='population'){
          assert.equal(window.document.querySelector('[data-population-reading]').hidden,false);
          assert.equal(css('.population-national','display'),'flex');
          assert.equal(css('.population-national','flex-direction'),'column');
          assert.equal(css('[data-pop-reading]','order'),'1');
          assert.equal(css('[data-pop-story-index]','order'),'2');
          assert.equal(css('[data-pop-reading-body]','display'),'flex');
          assert.equal(css('[data-pop-reading-body]','flex-direction'),'column');
          const button=window.document.createElement('button');button.className='population-reading-action';
          window.document.querySelector('[data-pop-reading-body]').append(button);
          assert.equal(css('[data-pop-reading-body]>.population-reading-action','order'),'-1');
          assert.equal(css('[data-pop-reading-body]>.population-reading-action','min-height'),'44px');
        }
        if(field==='industry'){
          window.document.querySelector('[data-atlas-explorer]').setAttribute('data-industry-subsector','all');
          assert.equal(css('.atlas-map-frame','height'),'clamp(320px,calc(100dvh-350px),430px)');
          assert.equal(css('.atlas-map-frame','min-height'),'0px','the runtime overview must not restore its old 620px minimum');
          assert.equal(css('.atlas-map-frame','max-height'),'none');
          assert.equal(css('.atlas-map-frame','aspect-ratio'),'auto');
        }
      }finally{await page.window.happyDOM.close();}
    }
  });
}

test('US mobile, regular desktop and the geographic overview keep their existing news arrangement',async()=>{
  for(const width of [390,959,1200,1366,1920]){
    const page=await open('north-america/nature',width);
    try{
      assert.equal(page.css('.atlas-desktop-shell','display'),width<1200?'flex':'grid');
      if(width<1200)assert.equal(page.css('.atlas-desktop-shell','flex-direction'),'column');
      else assert.equal(page.css('.atlas-desktop-shell','grid-template-columns'),width<1600?'clamp(220px,19vw,340px)minmax(0,1fr)':'clamp(300px,23vw,380px)minmax(0,1fr)');
      const before=page.snapshot();page.injectUs();assert.deepEqual(page.snapshot(),before,`${width}px unrelated cascade`);
      assert.equal(page.css('.atlas-us-natural-takeaway','display'),'none',`${width}px retains the original natural reading`);
    }finally{await page.window.happyDOM.close();}
  }
  const overview=await open('north-america',1180);
  try{assert.equal(overview.css('.atlas-desktop-shell','display'),'flex');assert.equal(overview.css('.atlas-news','height'),'300px');}
  finally{await overview.window.happyDOM.close();}
});

test('US news articles retain the expanded reading mode on a small laptop',async()=>{
  const page=await open('north-america/nature',1180);
  try{
    page.window.document.querySelector('.atlas-desktop-shell').classList.add('is-reading-news');
    assert.equal(page.css('.atlas-desktop-shell','display'),'flex');
    assert.equal(page.css('.atlas-desktop-shell','flex-direction'),'column');
    assert.equal(page.css('.atlas-news','height'),'70dvh');
  }finally{await page.window.happyDOM.close();}
});

test('the US override cannot change Canada, Mexico, Europe or Asian layouts',async()=>{
  for(const path of ['north-america/canada/nature','north-america/mexico/nature','europe/nature','asia/east-asia/nature','west-asia/nature']){
    const page=await open(path,1180);
    try{
      assert.equal(page.window.document.querySelector('[data-atlas-explorer]'),null,path);
      const before=page.snapshot();page.injectUs();assert.deepEqual(page.snapshot(),before,path);
    }finally{await page.window.happyDOM.close();}
  }
});
