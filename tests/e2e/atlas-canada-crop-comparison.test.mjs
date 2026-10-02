import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bundleCanadaCropComparison as bundleCanadaSource} from '../fixtures/bundle-canada-crop-comparison.mjs';
import {Window} from 'happy-dom';
const bundled=(file,globalName)=>bundleCanadaSource(file,{globalName});
const agricultureCode=await bundled('src/scripts/atlas-canada-agriculture.ts','CropController');
const beefCode=await bundled('src/scripts/atlas-canada-beef.ts','CropController');
const helperCode=await bundled('src/lib/atlas-canada-crop-comparison.ts','CropComparison');
const root='/insight-journal/atlas/north-america/canada/';
const paths={canola:'agriculture/',wheat:'agriculture/wheat/',beef:'agriculture/beef/'};
async function fixture(crop,query){
 const w=new Window({url:'https://example.com'+root+paths[crop]+query,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const data=JSON.parse(await readFile(`src/data/atlas/canada/${crop}.json`,'utf8')),prefix=crop==='beef'?'beef':'canola';
 const select=(key,values)=>`<select data-${prefix}-${key}>${values.map(v=>`<option value="${v}">${v}</option>`).join('')}</select>`;
 const html=`<article data-canada-${crop==='beef'?'beef':'agriculture'} data-canada-crop="${crop}">
  ${select('year',data.years)}${select('province',data.provinces.map(p=>p.id))}${select('compare',['',...data.provinces.map(p=>p.id)])}${select('metric',data.metrics.map(m=>m.id))}
  ${crop==='beef'?select('map',['beef','pasture','hay']):''}
  <p data-${prefix}-comparison></p><button data-${prefix}-zoom></button><button data-${prefix}-map-reset></button>
  ${crop==='beef'?['beef','pasture','hay'].map(id=>`<figure data-beef-map-panel="${id}"><div data-beef-map-scroll></div></figure>`).join(''):'<div data-canola-map-scroll></div>'}
  <a data-canada-crop-nature data-canada-crop-nature-primary href="${root}nature/?city=regina">Regina</a>
  <a data-canada-crop-nature href="${root}nature/?city=regina&amp;view=landform">地形</a>
  <a data-canada-crop-nature href="${root}nature/?city=winnipeg&amp;view=water">水</a>
  <script type="application/json" data-${prefix}-config>${JSON.stringify(data)}</script>
 </article>`;
 w.document.write(html);w.eval(helperCode);w.eval(crop==='beef'?beefCode:agricultureCode);
 w.eval(`CropController.${crop==='beef'?'initCanadaBeef':'initCanadaAgriculture'}(document.querySelector('article'));`);
 return w;
}

test('Source controls and history regenerate all crop nature links with the live source selection while preserving their named destinations',async()=>{
 for(const crop of ['canola','wheat','beef']){
  const w=await fixture(crop,crop==='beef'?'?year=2026&province=Ontario&compare=Quebec&metric=dairy&map=hay&zoom=1&private=omit':'?year=2022&province=Alberta&compare=Manitoba&metric=harvested&zoom=1&private=omit');
  try{
   const prefix=crop==='beef'?'beef':'canola',q=s=>w.document.querySelector(s),links=()=>[...w.document.querySelectorAll('[data-canada-crop-nature]')];
   const contexts=()=>links().map(link=>w.eval(`CropComparison.readCanadaCropComparison(new URL(${JSON.stringify(link.href)}))`));
   const first=contexts();assert.ok(first.every(c=>c.crop===crop&&c.state.zoom));assert.deepEqual(links().map(l=>new URL(l.href).searchParams.get('city')),['regina','regina','winnipeg']);assert.deepEqual(links().map(l=>new URL(l.href).searchParams.get('view')),['climate','landform','water']);
   assert.ok(first.every(c=>!c.returnUrl.searchParams.has('private')));
   const change=(key,value)=>{q(`[data-${prefix}-${key}]`).value=value;q(`[data-${prefix}-${key}]`).dispatchEvent(new w.Event('change'));};
   change('year','2025');change('province','Saskatchewan');change('compare','Manitoba');change('metric',crop==='beef'?'total':'production');
   if(crop==='beef'){change('map','pasture');assert.match(q('[data-canada-crop-nature-primary]').textContent,/放牧地.*2021年.*Regina/);}
   for(const context of contexts()){assert.equal(context.state.year,2025);assert.equal(context.state.province,'Saskatchewan');assert.equal(context.state.compare,'Manitoba');assert.equal(context.state.metric,crop==='beef'?'total':'production');assert.ok(context.state.zoom);if(crop==='beef')assert.equal(context.selectedMap.id,'pasture');}
   q(`[data-${prefix}-map-reset]`).click();assert.ok(contexts().every(c=>!c.state.zoom));
   // A history navigation restores the saved source and updates links before the next click.
   w.history.replaceState(null,'',crop==='beef'?'?year=2021&province=Alberta&compare=Canada&metric=beef&map=beef&zoom=1':'?year=2020&province=Alberta&compare=Canada&metric=seeded&zoom=1');
   w.dispatchEvent(new w.PopStateEvent('popstate'));
   for(const context of contexts()){assert.equal(context.state.year,crop==='beef'?2021:2020);assert.equal(context.state.compare,'Canada');assert.ok(context.state.zoom);if(crop==='beef')assert.equal(context.selectedMap.id,'beef');}
  }finally{await w.happyDOM.close();}
 }
});
