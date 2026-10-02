import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const regions=['asia/east-asia','asia/southeast-asia','asia/south-central-asia','asia/south-asia','asia/central-asia','west-asia'];
const mapController=await readFile('src/scripts/atlas-asia-overview-map.ts','utf8');
const pageController=(await readFile('src/scripts/atlas-asia-overview.ts','utf8')).replace(/^import \{initAsiaOverviewMap\} from ['"]\.\/atlas-asia-overview-map['"];?\r?\n/m,'');
const controller=(await transform(`${mapController}\n${pageController}\ninitAsiaOverview(document.querySelector('[data-asia-overview]'));`,{loader:'ts',format:'iife'})).code;
async function page(region,query=''){
 const w=new Window({url:`https://example.com/insight-journal/atlas/${region}/overview/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.body.innerHTML=(await readFile(`dist/atlas/${region}/overview/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
 const stage=w.document.querySelector('[data-overview-map-stage]');Object.defineProperty(stage,'clientWidth',{value:645});Object.defineProperty(stage,'clientHeight',{value:416});
 w.eval(controller);return w;
}
const config=w=>JSON.parse(w.document.querySelector('[data-ao-config]').textContent);
function choose(w,selector,value){const select=w.document.querySelector(selector);select.value=value;select.dispatchEvent(new w.Event('change',{bubbles:true}));}

test('Asia6概要は地域の5テーマ、国ごとの5テーマと有効な主5分野を持つ',async()=>{
 for(const region of regions){const w=await page(region),d=w.document,c=config(w);assert.equal(d.querySelectorAll('.ao-fields a').length,5);assert.equal(d.querySelectorAll('[data-ao-region-reading] .ao-section').length,5);assert.doesNotMatch(d.querySelector('[data-ao-region-reading]').textContent,/準備しています|準備中|本文は未/);assert.ok(c.countries.length);for(const country of c.countries){assert.deepEqual(country.readings.map(r=>r.id),['nature','agriculture','industry','population','politics']);for(const reading of country.readings){assert.ok(reading.paragraphs.every(p=>p.length>15));assert.ok(reading.sources.length);assert.ok(reading.sources.every(s=>s.url.startsWith('https://')));}}assert.equal(d.querySelector('[data-ao-country-reading]').hidden,true);w.happyDOM.abort();}
});

test('国/都市/テーマのURL復元と4分野への国保持、既cameraqueryを保持する',async()=>{
 for(const [region,country,key,lng,lat]of [['asia/east-asia','JPN','place',139,35],['west-asia','SAU','country',45,24]]){const w=await page(region,`?country=${country}&topic=industry&lng=${lng}&lat=${lat}&z=4`),d=w.document;assert.equal(d.querySelector('[data-ao-country]').value,country);assert.equal(d.querySelector('[data-ao-topic]').value,'industry');assert.equal(d.querySelector('[data-ao-country-reading]').hidden,false);assert.equal(d.querySelector('[data-ao-panel=industry]').hidden,false);assert.match(d.querySelector('[data-ao-panel=industry]').textContent,/GDP/);assert.equal(d.querySelector(`[data-overview-map-country=${country}]`).getAttribute('aria-pressed'),'true');for(const a of d.querySelectorAll('.ao-fields [data-ao-field]')){const url=new URL(a.href);assert.equal(url.searchParams.get(a.dataset.aoField==='overview'?'country':key),country);assert.equal(url.searchParams.get('lng'),String(lng));assert.equal(url.searchParams.get('z'),'4');}assert.equal(d.querySelector('[data-overview-map]').getAttribute('viewBox'),`0 0 ${config(w).width} ${config(w).height}`,'選択だけでcameraを動かさない');w.happyDOM.abort();}
 const w=await page('asia/south-asia','?place=IND&topic=population');assert.equal(w.document.querySelector('[data-ao-country]').value,'IND');assert.equal(new URL(w.location.href).searchParams.get('country'),'IND');assert.equal(new URL(w.location.href).searchParams.get('place'),null);w.happyDOM.abort();
});

test('一覧・地図keyboard・テーマ変更・historyとregion跨ぎが同じ選択を保つ',async()=>{
 const w=await page('asia/south-asia'),d=w.document;
 choose(w,'[data-ao-country]','IND');choose(w,'[data-ao-topic]','politics');assert.match(d.querySelector('[data-ao-panel=politics]').textContent,/協同組合/);
 d.querySelector('[data-overview-zoom=in]').click();const frame=d.querySelector('[data-overview-map]').getAttribute('viewBox');
 const peer=new URL(d.querySelector('[data-ao-peer=south-central-asia]').href);assert.equal(peer.searchParams.get('country'),'IND');assert.equal(peer.searchParams.get('topic'),'politics');assert.equal(new URL(d.querySelector('[data-ao-peer=central-asia]').href).searchParams.get('country'),null);
 const npl=d.querySelector('[data-overview-map-country=NPL]');npl.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(d.querySelector('[data-ao-country]').value,'NPL');assert.match(d.querySelector('[data-ao-panel=politics]').textContent,/管理計画/);
 assert.equal(d.querySelector('[data-overview-map]').getAttribute('viewBox'),frame,'国選択後も手動zoom frameを保持');choose(w,'[data-ao-topic]','nature');assert.equal(d.querySelector('[data-overview-map]').getAttribute('viewBox'),frame,'テーマ選択もframeを保持');
 w.history.replaceState(null,'','?country=IND&topic=nature');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(d.querySelector('[data-ao-country]').value,'IND');assert.equal(d.querySelector('[data-ao-panel=nature]').hidden,false);
 w.history.replaceState(null,'','?country=KAZ&city=unknown&topic=unknown');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(d.querySelector('[data-ao-country]').value,'');assert.equal(d.querySelector('[data-ao-region-reading]').hidden,false);assert.equal(new URL(d.querySelector('[data-ao-field=industry]').href).searchParams.get('place'),null);w.happyDOM.abort();
});

test('国の輪郭・国名label・都市名の操作とcityだけのURLが同じ国解説へつながる',async()=>{
 const w=await page('asia/east-asia'),d=w.document;
 d.querySelector('[data-overview-map-country=CHN]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(d.querySelector('[data-ao-country]').value,'CHN');
 d.querySelector('[data-overview-label-country=JPN]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(d.querySelector('[data-ao-country]').value,'JPN');
 const city=config(w).cities.find(c=>c.country==='JPN');assert.ok(city);
 d.querySelector(`[data-overview-map-city="${city.id}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(d.querySelector('[data-ao-country]').value,'JPN');assert.match(d.querySelector('[data-ao-location]').textContent,new RegExp(city.name));assert.equal(new URL(w.location.href).searchParams.get('city'),city.id);
 const reload=await page('asia/east-asia',`?city=${city.id}&topic=population`);assert.equal(reload.document.querySelector('[data-ao-country]').value,'JPN');assert.equal(reload.document.querySelector('[data-ao-panel=population]').hidden,false);assert.equal(new URL(reload.location.href).searchParams.get('country'),'JPN');w.happyDOM.abort();reload.happyDOM.abort();
});

test('欠測を他国や0で補わず、国別量と都市範囲の出典・年を区別する',async()=>{
 const w=await page('asia/east-asia','?country=TWN&topic=industry');assert.match(w.document.querySelector('[data-ao-panel=industry]').textContent,/台湾の系列がないため欠測/);assert.doesNotMatch(w.document.querySelector('[data-ao-panel=industry]').textContent,/GDPの0％/);const d=config(w);const jp=d.countries.find(c=>c.code==='JPN');assert.match(jp.readings.find(r=>r.id==='agriculture').paragraphs[0],/2024年/);assert.match(jp.readings.find(r=>r.id==='population').paragraphs[0],/2020年.*2025年.*行政市/);w.happyDOM.abort();
});
