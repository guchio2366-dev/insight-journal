import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
import {agroMarketingYearFlow} from '../../src/data/atlas/agro-marketing-year-flow.ts';
import {livestockStatistics} from '../../src/data/atlas/livestock-statistics.ts';

const html=readFileSync('dist/atlas/north-america/agriculture/index.html','utf8');
const document=()=>{const w=new Window();w.document.body.innerHTML=html;return w;};
const ids={corn:'maize-production',soybean:'soybean-production',wheat:'wheat-production',rice:'rice-milled-production',cotton:'cotton-lint-production'};
const verification=JSON.parse(readFileSync('data-source/atlas/us-agro-20261016/wasde-verification.json'));

test('built US crop bars keep a common supply denominator, exact quantities, domestic subsets and signed gaps',async()=>{
 const w=document();try{
  for(const [id,series] of Object.entries(ids)){
   const flow=agroMarketingYearFlow('USA',series),panel=w.document.querySelector(`[data-us-marketing-flow="${id}"]`);
   assert.ok(panel);const total=flow.production+flow.imports+flow.beginningStocks;
   assert.ok(panel.textContent.includes(verification.periods[id].start));assert.ok(panel.textContent.includes(verification.periods[id].end));
   assert.equal(Number(panel.dataset.usSupplyTotal),total);
   const table=panel.querySelector('table'),values=[...table.querySelectorAll('tbody tr')].map(tr=>Number(tr.children[1].textContent.replaceAll(',','')));
   assert.deepEqual(values,[flow.production,flow.imports,flow.beginningStocks,flow.domesticUse,flow.exports,flow.endingStocks]);
   const scale=Math.max(total,flow.domesticUse+flow.exports+flow.endingStocks),tracks=panel.querySelectorAll('.us-flow-track');
   assert.equal(tracks.length,2);
   assert.ok(Math.abs(parseFloat(tracks[0].querySelector('i').style.left)-total/scale*100)<1e-9);
   assert.equal(tracks[0].querySelector('i').style.left,tracks[1].querySelector('i').style.left);
   for(const [i,values] of [[0,[flow.production,flow.imports,flow.beginningStocks]],[1,[flow.domesticUse,flow.exports,flow.endingStocks]]]){
    const spans=tracks[i].querySelectorAll('span');assert.equal(spans.length,3);
    values.forEach((n,j)=>assert.ok(Math.abs(parseFloat(spans[j].style.width)-n/scale*100)<1e-9));
   }
   if(flow.domesticSubset)assert.ok(panel.querySelector('.us-flow-subset').textContent.includes(flow.domesticSubset.value.toFixed(2)));
   assert.match(panel.textContent,/国内利用へ重ねて加算しません|米|綿/);
  }
  assert.match(w.document.querySelector('[data-us-marketing-flow="wheat"]').textContent,/-0.01/);
  assert.match(w.document.querySelector('[data-us-marketing-flow="cotton"]').textContent,/-0.04/);
  assert.match(w.document.querySelector('[data-us-marketing-flow="cotton"]').textContent,/厳密なゼロ/);
  const cottonScope=w.document.querySelector('[data-us-marketing-flow="cotton"] [data-us-domestic-definition]').textContent;
  assert.match(cottonScope,/綿繊維の紡績等/);assert.match(cottonScope,/綿実の油・飼料利用は含みません/);
  assert.doesNotMatch(cottonScope,/食用・飼料・加工等を含む/);
 }finally{await w.happyDOM.close();}
});

test('US rice captions keep the primary milled basis distinct from the nested rough-rice reference; wheat retains product mismatch',async()=>{
 const w=document();try{
  const rice=w.document.querySelector('#exports-rice');
  assert.match(rice.textContent,/②③とも精米換算/);
  assert.doesNotMatch(rice.textContent,/籾米／精米の換算基準が異なる/);
  assert.match(rice.textContent,/2025暦年/);assert.match(rice.textContent,/最大輸出先/);assert.match(rice.textContent,/上位3市場/);
  assert.match(w.document.querySelector('#exports-wheat').textContent,/小麦粉等を含む小麦換算とは商品範囲も異なり/);
 }finally{await w.happyDOM.close();}
});

test('both milk ratios use displayed raw-milk production, while marketings stay separate in the supply balance',async()=>{
 const w=document();try{
  for(const basis of ['fat','skim']){
   const d=livestockStatistics.supply['dairy-'+basis],panel=w.document.querySelector(`[data-milk-panel="${basis}"]`),paragraphs=panel.querySelectorAll('.animal-production');
   assert.ok(paragraphs[1].textContent.includes((d.exports/d.rawMilkProduction*100).toFixed(1)+'%'));
   assert.match(paragraphs[0].textContent,/231.7/);
   const production=panel.querySelector('.animal-supply-key strong');assert.match(production.textContent,/230.7/);
  }
  assert.match(w.document.querySelector('[data-livestock-stat-panel="broilers"] [data-agri-flow-stage="production"]').textContent,/①は鶏肉全体、②はブロイラー肉/);
 }finally{await w.happyDOM.close();}
});

test('forestry product panels follow three-column meaning without substituting pulp-for-paper shares or historical roundwood equivalents',async()=>{
 const w=document();try{
  assert.equal(w.document.querySelector('[data-forest-statistics]').getAttribute('aria-label'),'米国の林産物統計と州別用途の参考');
  const products=w.document.querySelectorAll('[data-us-forest-product]');assert.equal(products.length,3);
  for(const product of products){
   assert.equal(product.open,false);assert.equal(product.closest('[data-forest-statistics]').hidden,true);
   assert.deepEqual([...product.querySelectorAll('[data-us-forest-stage]')].map(n=>n.dataset.usForestStage),['production','use','destinations']);
   assert.match(product.textContent,/米国生産量：未収録/);
  }
  const pulp=w.document.querySelector('[data-us-forest-product="wood-pulp"]');assert.equal(pulp.querySelector('.us-forest-share'),null);
  assert.match(pulp.textContent,/189 百万t/);assert.match(pulp.textContent,/19%.*採用しない/);
  assert.match(w.document.querySelector('[data-forest-national]').textContent,/2017年.*丸太換算/s);
  assert.match(w.document.querySelector('#forest-stat-title').textContent,/南部の一州/);
 }finally{await w.happyDOM.close();}
});

const controller=await build({entryPoints:['src/scripts/atlas-agriculture-details.ts'],bundle:true,write:false,format:'iife',globalName:'UsAgroTest'});
test('US product, relation, forestry, overview and restored-selection states preserve the unselected national overview',async()=>{
 const w=new Window({url:'https://example.test/insight-journal/atlas/north-america/agriculture/',settings:{enableJavaScriptEvaluation:true}});
 try{
  w.document.body.innerHTML=html.replace(/<script\b(?![^>]*type="application\/json")[\s\S]*?<\/script>/g,'');
  w.ResizeObserver=class{observe(){}};
  w.eval(controller.outputFiles[0].text+';window.UsAgroTest=UsAgroTest;');
  const root=w.document.querySelector('[data-atlas-explorer]'),q=s=>root.querySelector(s),overview=q('[data-agri-overview]').innerHTML;
  const api=w.UsAgroTest.createAgricultureDetails(root,(_state,_push,url)=>w.history.replaceState({},'',url.href));
  assert.equal(q('[data-agri-statistics]').hidden,true);assert.equal(q('[data-forest-statistics]').hidden,true);
  api.selectProduct('soybean');assert.equal(q('[data-stat-panel="soybean"]').hidden,false);
  const flow=q('[data-us-marketing-flow="soybean"]');api.selectRelation('corn-soy-hogs');assert.equal(q('[data-us-marketing-flow="soybean"]'),flow);
  w.history.replaceState({},'','?agriReading=forestry:timber');api.restore();assert.equal(q('[data-forest-statistics]').hidden,false);assert.equal(q('[data-agri-statistics]').hidden,true);
  api.overview();assert.equal(q('[data-forest-statistics]').hidden,true);assert.equal(q('[data-agri-statistics]').hidden,true);assert.equal(q('[data-agri-overview]').innerHTML,overview);
  w.history.replaceState({},'','?agriReading=product:rice');api.restore();assert.equal(q('[data-stat-panel="rice"]').hidden,false);
  api.overview();assert.equal(q('[data-agri-overview]').innerHTML,overview);
 }finally{await w.happyDOM.close();}
});
