import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {renderCanadaWaterOrigin} from '../../src/scripts/atlas-canada-water-origin.ts';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';

const base='https://example.com/insight-journal/atlas/north-america/canada/';
const sourceCode=await bundleCanadaSource('src/scripts/atlas-canada-industry-comparison.ts',{globalName:'IndustrySource'})+'\n'+await bundleCanadaSource('src/scripts/atlas-canada-population-comparison.ts',{globalName:'PopulationSource'});
const json=async name=>JSON.parse(await readFile(`src/data/atlas/canada/${name}.json`,'utf8'));
const [industry,industryGeometry,population,populationGeometry]=await Promise.all(['industry','industry-geometry','population','population-geometry'].map(json));
const config={industry:{...industry,geometry:industryGeometry.features},population:{...population,geometry:populationGeometry.features},cities:[{id:'ottawa',name:'Ottawa'}]};
const nature={view:'water',city:'ottawa',compare:null,water:'St. Lawrence',only:true,frame:null};
const water=topic=>({topic,area:null,only:false,frame:null});
const q=(root,selector)=>root.querySelector(selector);

function page(search=''){
 const w=new Window({url:base+'nature/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.body.innerHTML=`<article class="canada-nature is-water-resource" data-root>
 <div data-water-origin hidden><p data-water-origin-text></p><a data-water-origin-return hidden></a><details><summary>分布・凡例</summary><svg data-water-origin-map viewBox="0 0 900 580" role="img"></svg><div data-water-origin-legend></div></details></div>
 <a data-canada-forestry-return hidden href="${base}agriculture/forestry/">林業の森林図・州比較へ戻る</a>
 <a data-canada-industry-return hidden href="${base}industry/">主要産業の州別構成・比較へ戻る</a>
 <a data-canada-population-return hidden href="${base}population/">人口の都市圏分布・比較へ戻る</a>
 <a data-canada-crop-return hidden href="${base}agriculture/">農畜産の比較へ戻る</a>
 <svg data-canada-map><path class="canada-land" d="M0,0H900V580H0Z"/><g data-canada-forest-context-map style="display:none"><image href="/assets/forest-needleleaf-2020.png" width="900" height="580"/></g><g data-canada-industry-context-map></g><g data-canada-population-context-map></g></svg>
 <p data-canada-forest-context-legend hidden><i style="background:rgb(42,85,42)"></i>温帯・亜寒帯の針葉樹林（NRCan、2020年、元データ30m）<a href="${base}agriculture/forestry/#canada-forestry-sources">森林分類・利用条件</a></p>
 <p data-canada-industry-context-legend hidden></p><p data-canada-population-context-legend hidden></p><p data-canada-position-caption>位置図</p>
 <section data-canada-industry-context hidden><h2 data-canada-industry-context-heading></h2><p data-canada-industry-context-text></p><svg data-canada-industry-context-mini-map></svg><p data-canada-industry-context-mini-legend></p><details><summary>出典</summary><p>基本価格・当年価格。州境界2021年。<a href="${base}industry/#canada-industry-sources">統計と出典</a></p></details></section>
 <section data-canada-population-context hidden><p data-canada-population-context-text></p><svg data-canada-population-context-mini-map></svg><p data-canada-population-context-mini-legend></p><details><summary>出典</summary><p>境界2021年。人口2016/2021年。密度2021年。<a href="${base}population/#canada-population-sources">定義・出典</a></p></details></section></article>`;
 w.eval(sourceCode);
 return {w,root:q(w.document,'[data-root]')};
}
function renderSource(w,kind){w.eval(`${kind==='industry'?'IndustrySource.renderIndustryNatureComparison':'PopulationSource.renderPopulationNatureComparison'}(document.querySelector('[data-root]'),${JSON.stringify(config)},${JSON.stringify(nature)});`);}
function mapSignature(layer){return [...layer.querySelectorAll('path,circle,image')].map(element=>({tag:element.tagName,d:element.getAttribute('d'),fill:element.getAttribute('fill'),stroke:element.getAttribute('stroke'),cx:element.getAttribute('cx'),cy:element.getAttribute('cy'),r:element.getAttribute('r'),display:element.style.display,title:element.querySelector('title')?.textContent??null}));}

test('actual manufacturing renderer retains exact selected province distribution, all color bins and sanitized return for every resource topic',async()=>{
 const saved={year:'2024',province:'Ontario',compare:'Quebec',metric:'manufacturing',only:'1',zoom:'1'};
 const {w,root}=page('?'+new URLSearchParams({industryReturn:new URLSearchParams({...saved,next:'https://evil.example/'}).toString()}));
 try{
  renderSource(w,'industry');
  const original=q(root,'[data-canada-industry-context-map]'),signature=mapSignature(original),sourceLegend=q(root,'[data-canada-industry-context-legend]'),sourceReturn=q(root,'[data-canada-industry-return]');
  const sourceLabel=sourceLegend.firstChild.textContent.split('境界2021年。')[0]+'境界2021年。';
  assert.match(sourceLegend.textContent,/湖は青.*縁・線を赤で強調/s);
  assert.equal(signature.length,2);
  for(const topic of ['precipitation','drainage','groundwater','aquifers']){
   const before=w.location.href,length=w.history.length;
   assert.equal(renderCanadaWaterOrigin(root,water(topic)),true);
   assert.deepEqual(mapSignature(q(root,'[data-water-origin-source="industry"]')),signature);
   assert.ok(q(root,'[data-water-origin-legend]').textContent.includes(sourceLabel));
   assert.doesNotMatch(q(root,'[data-water-origin-legend]').textContent,/湖は青|縁・線を赤で強調/);
   assert.match(q(root,'[data-water-origin-legend]').textContent,/水資源の新しい図とは別図で照合/);
   assert.equal(q(root,'[data-water-origin-legend]').querySelectorAll('i').length,6);
   assert.match(q(root,'[data-water-origin-text]').textContent,/五大湖・St\. Lawrence.*ON・QC/);
   assert.equal(q(root,'[data-water-origin-return]').href,sourceReturn.href);
   assert.equal(q(root,'[data-water-origin-return]').textContent,sourceReturn.textContent);
   assert.deepEqual(Object.fromEntries(new URL(q(root,'[data-water-origin-return]').href).searchParams),saved);
   assert.equal(w.location.href,before);assert.equal(w.history.length,length);
   assert.equal(q(root,'[data-water-origin]').querySelectorAll('[data-canada-industry-context-map],[data-canada-industry-context-province],[data-canada-industry-context-scale]').length,0);
   renderSource(w,'industry');
   assert.deepEqual(mapSignature(original),signature);
  }
  assert.match(q(root,'[data-water-origin-text]').textContent,/BC州南西部.*全国の水文地質区分とは対象・縮尺/s);
 }finally{await w.happyDOM.close();}
});

test('actual CMA population and density output, labels and matching scales survive without replacing original geometry or changing saved 2016 selection',async()=>{
 const saved={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected'};
 const {w,root}=page('?'+new URLSearchParams({populationReturn:new URLSearchParams(saved).toString()}));
 try{
  for(const metric of ['population','density']){
   const state={...saved,metric};w.history.replaceState(null,'','?'+new URLSearchParams({populationReturn:new URLSearchParams(state).toString()}));
   renderSource(w,'population');const original=q(root,'[data-canada-population-context-map]'),signature=mapSignature(original);
   assert.ok(signature.length>2);assert.equal(renderCanadaWaterOrigin(root,water('precipitation')),true);
   assert.deepEqual(mapSignature(q(root,'[data-water-origin-source="population"]')),signature);
   assert.equal(q(root,'[data-water-origin-map]').getAttribute('viewBox'),'0 0 900 580');
   assert.equal(q(root,'[data-water-origin-return]').href,q(root,'[data-canada-population-return]').href);
   assert.match(q(root,'[data-water-origin-text]').textContent,/一点の平年値.*利用可能水量・土壌水分/);
   const mapText=q(root,'[data-water-origin-map]').textContent;
   assert.match(mapText,metric==='population'?/100万人.*500万人/s:/50未満.*600以上.*人\/km²/s);
   assert.match(q(root,'[data-water-origin-legend]').textContent,/境界2021年.*人口2016\/2021年/s);
   assert.equal(original.querySelectorAll('[data-canada-population-context-cma]').length,2);
  }
 }finally{await w.happyDOM.close();}
});

test('forestry copies the original 2020 image and green key, preserves source link and optional closed distribution details',async()=>{
 const {w,root}=page();
 try{
  const source=q(root,'[data-canada-forestry-return]');source.hidden=false;source.href+='?year=2024&province=British+Columbia&compare=Quebec&metric=wood&cover=taiga&zoom=1';
  assert.equal(renderCanadaWaterOrigin(root,water('drainage')),true);
  assert.equal(q(root,'[data-water-origin-map] image').getAttribute('href'),q(root,'[data-canada-forest-context-map] image').getAttribute('href'));
  assert.equal(q(root,'[data-water-origin-legend] i').style.background,q(root,'[data-canada-forest-context-legend] i').style.background);
  assert.match(q(root,'[data-water-origin-text]').textContent,/Fraser川・BC沿岸.*統計排水地域/s);
  assert.match(q(root,'[data-water-origin-text]').textContent,/流量・利用可能水量・灌漑量は示しません/);
  assert.equal(q(root,'[data-water-origin-return]').href,source.href);
  assert.equal(q(root,'[data-water-origin] details').open,false);
  assert.ok(q(root,'[data-water-origin-legend] a').href.endsWith('#canada-forestry-sources'));
 }finally{await w.happyDOM.close();}
});

test('crop readonly fallback retains camera, selected visibility, F and unrecorded patterns, complete legend and exact return without cloning live canvas',async()=>{
 const saved='/insight-journal/atlas/north-america/canada/agriculture/beef/?year=2024&province=Alberta&compare=Saskatchewan&metric=cattle&map=hay&ccs=4601011&ccsOnly=1&ccsBounds=-115,45,-95,55';
 const {w,root}=page('?'+new URLSearchParams({crop:'beef',cropReturn:saved}));
 try{
  const source=q(root,'[data-canada-crop-return]');source.hidden=false;source.href=saved;source.textContent='2024年の肉牛・2021年の乾草地域比較へ戻る';
  root.insertAdjacentHTML('beforeend',`<p data-canada-crop-origin>元の年別表：Alberta・Saskatchewanの2024年肉牛。地図は2021年。</p><p data-canada-crop-map-key>全国申告値 2,345 ha。CCSは実際の畑ではありません。</p><div data-canada-crop-gis><span data-canada-census-product-title>アルファルファ＋その他の乾草</span><svg data-canada-census-fallback style="visibility:hidden" aria-hidden="true" tabindex="-1" viewBox="200 300 400 257"><title id="crop-title">2021年 乾草</title><defs><pattern id="crop-f"><rect fill="#e7e0d3"/></pattern><pattern id="crop-missing"><rect fill="#d7dcdb"/></pattern></defs><g><path data-canada-census-shape="1" class="canada-census-region is-selected" d="M1,2L3,4Z" fill="url(#crop-f)" role="button" tabindex="0" aria-pressed="true"><title>非公表 F</title></path><path data-canada-census-shape="2" d="M10,20L30,40Z" fill="url(#crop-missing)" hidden><title>対象外・未収録</title></path></g></svg><div data-canada-census-live><canvas></canvas></div><div data-canada-census-legend class="canada-census-legend"><strong>乾草／2021年／ha</strong><ul><li><i style="background:#e7e0d3"></i>非公表 F</li><li><i class="is-not-covered"></i>対象外・未収録</li><li><i style="background:#ffff00"></i>公表ゼロ 0</li></ul></div><details class="canada-census-sources"><summary>原表・定義</summary><p>地域別申告値。面積密度ではありません。</p><a href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210037001">2021年の原表</a></details></div>`);
  const native=q(root,'[data-canada-crop-gis]'),fallback=q(root,'[data-canada-census-fallback]');
  assert.equal(renderCanadaWaterOrigin(root,water('groundwater')),true);
  const map=q(root,'[data-water-origin-map]'),copy=q(root,'[data-water-origin-source="crop"]');
  assert.equal(map.getAttribute('viewBox'),fallback.getAttribute('viewBox'));
  assert.equal(map.querySelectorAll('canvas').length,0);assert.equal(native.parentElement,root);assert.equal(native.querySelector('canvas').parentElement.dataset.canadaCensusLive,'');
  const paths=copy.querySelectorAll('path');assert.equal(paths.length,2);assert.equal(paths[1].hasAttribute('hidden'),true);
  assert.equal(paths[0].hasAttribute('tabindex'),false);assert.equal(paths[0].hasAttribute('role'),false);assert.equal(paths[0].hasAttribute('aria-pressed'),false);
  assert.equal(paths[0].getAttribute('fill'),'url(#canada-water-origin-crop-crop-f)');assert.ok(copy.querySelector('#canada-water-origin-crop-crop-f'));
  assert.ok(root.querySelector('#crop-f'));assert.equal(root.querySelectorAll('#crop-f').length,1);
  assert.match(q(root,'[data-water-origin-legend]').textContent,/非公表 F.*対象外・未収録.*公表ゼロ 0/s);
  assert.equal(q(root,'[data-water-origin-legend] a').href,'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210037001');
  assert.equal(q(root,'[data-water-origin-return]').href,source.href);assert.equal(q(root,'[data-water-origin-return]').textContent,source.textContent);
  assert.match(q(root,'[data-water-origin-text]').textContent,/2024年肉牛.*2021年のアルファルファ.*冬の飼料/s);
  assert.match(q(root,'[data-water-origin-text]').textContent,/実際の畑・放牧地・牛の所在地/);
 }finally{await w.happyDOM.close();}
});

test('plain and rejected comparison returns hide origin; surface and other views clear stale copies without altering source DOM',async()=>{
 const {w,root}=page('?industryReturn=invalid&populationReturn=topic%3Dreligion');
 try{
  assert.equal(renderCanadaWaterOrigin(root,water('precipitation')),false);assert.equal(q(root,'[data-water-origin]').hidden,true);
  q(root,'[data-canada-forestry-return]').hidden=false;renderCanadaWaterOrigin(root,water('aquifers'));
  assert.equal(renderCanadaWaterOrigin(root,water('surface')),false);assert.equal(q(root,'[data-water-origin-map]').childNodes.length,0);assert.equal(q(root,'[data-water-origin-return]').hasAttribute('href'),false);
  assert.equal(q(root,'[data-canada-forest-context-map] image').getAttribute('href'),'/assets/forest-needleleaf-2020.png');
  root.classList.remove('is-water-resource');assert.equal(renderCanadaWaterOrigin(root,water('drainage')),false);
 }finally{await w.happyDOM.close();}
});
