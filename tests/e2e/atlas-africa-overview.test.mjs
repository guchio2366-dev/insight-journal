import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';
import {cropChoices,livestockChoices,cropMeasureChoices} from '../../src/data/atlas/africa-atlas.ts';
const mapController=await readFile('src/scripts/atlas-africa-overview-map.ts','utf8');
const pageController=(await readFile('src/scripts/atlas-africa-overview.ts','utf8')).replace(/^import \{(?:initAfricaOverviewMap|cropChoices,livestockChoices,cropMeasureChoices)\} from ['"][^'"]+['"];?\r?\n/gm,'');
const choices=`const cropChoices=${JSON.stringify(cropChoices)},livestockChoices=${JSON.stringify(livestockChoices)},cropMeasureChoices=${JSON.stringify(cropMeasureChoices)};`;
const controller=(await transform(choices+'\n'+mapController+'\n'+pageController+'\ninitAfricaOverview(document.querySelector("[data-africa-overview]"));',{loader:'ts',format:'iife'})).code;
async function page(query=''){
 const w=new Window({url:'https://example.com/insight-journal/atlas/africa/overview/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.body.innerHTML=(await readFile('dist/atlas/africa/overview/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
 const stage=w.document.querySelector('[data-overview-map-stage]');Object.defineProperty(stage,'clientWidth',{value:645});Object.defineProperty(stage,'clientHeight',{value:416});
 w.eval(controller);return w;
}
const config=w=>JSON.parse(w.document.querySelector('[data-ao-config]').textContent);
function choose(w,selector,value){const select=w.document.querySelector(selector);select.value=value;select.dispatchEvent(new w.Event('change',{bubbles:true}));}
test('Africa55対象の概論は5テーマの実本文、全4分野入口、出典を持つ',async()=>{
 const w=await page(),d=w.document,c=config(w);
 try{assert.equal(c.countries.length,55);assert.equal(new Set(c.countries.map(x=>x.code)).size,55);assert.deepEqual([...d.querySelectorAll('.ao-fields a')].map(x=>x.textContent.trim()),['概要','農林業','自然環境','主要産業','人口']);assert.equal(d.querySelectorAll('[data-ao-region-reading] .ao-section').length,5);assert.doesNotMatch(d.querySelector('[data-ao-region-reading]').textContent,/準備しています|準備中|本文は未/);
 for(const country of c.countries){assert.deepEqual(country.readings.map(r=>r.id),['nature','agriculture','industry','population','politics']);for(const r of country.readings){assert.ok(r.paragraphs.length>=2);assert.ok(r.sources.length);for(const source of r.sources){const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.ok(source.label);}}}}
 finally{await w.happyDOM.close();}
});
test('legacy国URLをplaceへ復元し、比較国・年・地域・zoomを4分野へ保持',async()=>{
 const w=await page('?country=EGY&reading=industry&compare=SDN&year=2023&region=north&zoom=country&only=1&fallback=1'),d=w.document;
 try{assert.equal(d.querySelector('[data-ao-country]').value,'EGY');assert.equal(d.querySelector('[data-ao-topic]').value,'industry');assert.equal(d.querySelector('[data-ao-panel=industry]').hidden,false);assert.match(d.querySelector('[data-ao-panel=industry]').textContent,/2021年/);assert.equal(new URL(w.location.href).searchParams.get('country'),null);assert.equal(new URL(w.location.href).searchParams.get('place'),'EGY');
 for(const a of d.querySelectorAll('.ao-fields a')){const url=new URL(a.href);assert.equal(url.searchParams.get('place'),'EGY');assert.equal(url.searchParams.get('compare'),'SDN');assert.equal(url.searchParams.get('year'),'2023');assert.equal(url.searchParams.get('region'),'north');assert.equal(url.searchParams.get('zoom'),'country');assert.equal(url.searchParams.get('only'),'1');assert.equal(url.searchParams.get('fallback'),'1');if(a.dataset.aoField!=='overview')assert.equal(url.searchParams.get('field'),a.dataset.aoField);}
 choose(w,'[data-ao-country]','SDN');assert.equal(new URL(w.location.href).searchParams.get('compare'),null);assert.ok([...d.querySelectorAll('.ao-fields a')].every(a=>new URL(a.href).searchParams.get('compare')===null));}
 finally{await w.happyDOM.close();}
});
test('地図・都市・keyboard・reading・履歴が同じ国を保ち手動frameを動かさない',async()=>{
 const w=await page(),d=w.document;
 try{d.querySelector('[data-overview-zoom=in]').click();const frame=d.querySelector('[data-overview-map]').getAttribute('viewBox');d.querySelector('[data-overview-map-country=NGA]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(d.querySelector('[data-ao-country]').value,'NGA');choose(w,'[data-ao-topic]','population');assert.equal(d.querySelector('[data-overview-map]').getAttribute('viewBox'),frame);assert.equal(d.querySelector('[data-ao-panel=population]').hidden,false);assert.match(d.querySelector('[data-ao-panel=population]').textContent,/国平均/);
 const city=config(w).cities.find(c=>c.country==='EGY');assert.ok(city);d.querySelector('[data-overview-map-city="'+city.id+'"]').click();assert.equal(d.querySelector('[data-ao-country]').value,'EGY');assert.match(d.querySelector('[data-ao-location]').textContent,new RegExp(city.name));w.history.replaceState(null,'','?place=ZAF&reading=politics');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(d.querySelector('[data-ao-country]').value,'ZAF');assert.equal(d.querySelector('[data-ao-panel=politics]').hidden,false);d.querySelector('[data-overview-reset]').click();assert.equal(d.querySelector('[data-ao-region-reading]').hidden,false);assert.ok([...d.querySelectorAll('.ao-fields a')].every(a=>!new URL(a.href).searchParams.has('place')));}
 finally{await w.happyDOM.close();}
});
test('西サハラの未収録は他国や0で補わず、地域内事例と母集団を区別',async()=>{
 const w=await page('?place=ESH&reading=industry'),d=w.document;
 try{assert.match(d.querySelector('[data-ao-panel=industry]').textContent,/未収録/);assert.doesNotMatch(d.querySelector('[data-ao-panel=industry]').textContent,/：0 /);assert.match(d.querySelector('[data-ao-panel=industry]').textContent,/地域内で比較する事例/);const egypt=config(w).countries.find(c=>c.code==='EGY');assert.match(egypt.readings.find(r=>r.id==='population').paragraphs.join(' '),/母集団も資料年も違い/);assert.match(egypt.readings.find(r=>r.id==='politics').paragraphs.join(' '),/現在の加盟状況を示すものではありません/);}
 finally{await w.happyDOM.close();}
});

test('概論から同じ分野へ戻ると元の実分布・凡例選択・照会点・比較復帰snapshotを保持',async()=>{
 const source='field=population&topic=distribution&layerClass=density-3&view=distribution&year=2021';
 const w=await page('?place=NGA&compare=TZA&year=2023&region=west&zoom=country&field=population&topic=distribution&layerClass=density-3&layerPoint=3.5,6.4&view=distribution&sourceState='+encodeURIComponent(source)),d=w.document;
 try{for(const link of d.querySelectorAll('[data-ao-field=population]')){const q=new URL(link.href).searchParams;assert.equal(q.get('place'),'NGA');assert.equal(q.get('compare'),'TZA');assert.equal(q.get('year'),'2023');assert.equal(q.get('layerClass'),'density-3');assert.equal(q.get('layerPoint'),'3.5,6.4');assert.equal(q.get('view'),'distribution');assert.equal(q.get('sourceState'),source);}const nature=new URL(d.querySelector('[data-ao-field=nature]').href).searchParams;assert.equal(nature.get('place'),'NGA');assert.equal(nature.get('layerClass'),null);assert.equal(nature.get('sourceState'),null);}
 finally{await w.happyDOM.close();}
});
