import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const html=await readFile('dist/atlas/north-america/canada/industry/index.html','utf8');
const code=await bundleCanadaSource('src/scripts/atlas-canada-industry.ts',{globalName:'IndustryParity'});
async function page(search=''){const w=new Window({url:'https://example.com/insight-journal/atlas/north-america/canada/industry/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));w.eval(code+"\nIndustryParity.initCanadaIndustry(document.querySelector('[data-canada-industry]'))");return w;}
const data=JSON.parse(await readFile('src/data/atlas/canada/industry-parity.json','utf8'));
test('Canada industry uses the US five-sector order, map/sidebar structure and no old map-top controls',async()=>{const w=await page();try{const d=w.document;assert.deepEqual([...d.querySelectorAll('[data-ca-sector]')].map(b=>b.dataset.caSector),['all','manufacturing','resources','services','construction-real-estate']);assert.equal(d.querySelectorAll('[data-ca-province-shape]').length,13);assert.equal(d.querySelectorAll('[data-ca-bars] li').length,12);assert.equal(d.querySelectorAll('[data-industry-year],[data-industry-compare],[data-industry-save],.country-industry-map-controls').length,0);assert.equal(d.querySelector('[data-ca-map]').getAttribute('viewBox'),'0 0 900 580');assert.match(d.querySelector('#canada-industry-sources').textContent,/36-10-0402-01.*14-10-0023-01.*2021/s);}finally{await w.happyDOM.close();}});
test('Every sector and subfield drives one selected tab, geographic explanation and valid share denominators',async()=>{const w=await page();try{const q=s=>w.document.querySelector(s);for(const sector of [...w.document.querySelectorAll('[data-ca-sector]')]){sector.click();const id=sector.dataset.caSector;assert.equal(q('[data-ca-sector][aria-selected=true]').dataset.caSector,id);for(const b of w.document.querySelectorAll(`[data-ca-subtabs="${id}"] [data-ca-subsector]`)){b.click();const metric=data.metrics.find(m=>m.id===(b.dataset.caSubsector==='all'?id:b.dataset.caSubsector));q('[data-ca-place="Ontario"]').click();assert.equal(q('[data-ca-title]').textContent,metric.label);const ontario=metric.provinces.find(p=>p.id==='Ontario');assert.ok(q('[data-ca-value]').textContent.includes(ontario.gdp.toLocaleString('ja-JP',{maximumFractionDigits:1})));assert.match(q('[data-ca-reading]').textContent,/全国計の/);assert.ok([...w.document.querySelectorAll('.industry-paired-cell strong')].every(e=>e.textContent==='—'||Number.parseFloat(e.textContent)>=0&&Number.parseFloat(e.textContent)<=100));}}}finally{await w.happyDOM.close();}});
test('Keyboard selection, URL reload and popstate keep the industry and province; unavailable employment stays missing',async()=>{const w=await page('?sector=manufacturing&subsector=auto&province=Ontario');try{const q=s=>w.document.querySelector(s);assert.equal(q('[data-ca-title]').textContent,'自動車');assert.match(q('[data-ca-numbers]').textContent,/対応する細分類/);assert.ok(q('[data-ca-bars]').textContent.includes('—'));const active=q('[data-ca-sector][aria-selected=true]');active.focus();active.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(q('[data-ca-sector][aria-selected=true]').dataset.caSector,'resources');assert.equal(w.document.activeElement,q('[data-ca-sector][aria-selected=true]'));q('[data-ca-subsector="oil-gas"]').click();q('[data-ca-place="Alberta"]').click();assert.equal(new URL(w.location.href).searchParams.get('province'),'Alberta');w.history.replaceState(null,'','?sector=services&subsector=finance&province=Quebec');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-ca-title]').textContent,'金融・保険');assert.equal(q('[data-ca-heading]').textContent,'ケベック');}finally{await w.happyDOM.close();}});
test('Old provincial-share URLs translate to the new sector view without pretending old years are the new GDP series',async()=>{const w=await page('?metric=mining&year=2025&province=Alberta&compare=Ontario');try{const d=w.document;assert.equal(d.querySelector('[data-ca-title]').textContent,'資源・エネルギー');assert.match(d.querySelector('[data-ca-value]').textContent,/2021年/);assert.equal(d.querySelector('[data-industry-year]'),null);}finally{await w.happyDOM.close();}});

test('The initial international supply case uses its own year and denominator while domestic statistics remain available', async()=>{
 const w=await page();try{const q=s=>w.document.querySelector(s),card=q('[data-ca-international]');
  assert.equal(card.hidden,false);assert.match(card.textContent,/2024年.*カナダ全国/s);
  assert.match(q('[data-ca-international-indicator="exports"]').textContent,/420万バレル／日/);
  assert.match(q('[data-ca-international-indicator="us-share"]').textContent,/93%/);
  assert.match(q('[data-ca-international-indicator="alberta-share"]').textContent,/91%/);
  assert.match(card.textContent,/分母：カナダの原油輸出量/);
  assert.match(card.textContent,/2025年6月11日公表/);
  assert.match(q('[data-ca-international-definitions]').textContent,/2025-06-11.*2026-10-07/s);
  assert.match(q('.canada-industry-statistics').textContent,/2021年/);
  assert.equal(q('.canada-industry-statistics').open,false);
  assert.equal(q('[data-ca-national-patterns]').textContent.includes('国内GDPは'),false);
 }finally{await w.happyDOM.close();}
});

test('The oil case selects Alberta oil/gas through the existing URL state and disappears in unrelated fields', async()=>{
 const w=await page();try{const q=s=>w.document.querySelector(s);
  q('[data-ca-international-place]').click();
  assert.deepEqual(Object.fromEntries(new URL(w.location.href).searchParams),{sector:'resources',subsector:'oil-gas',province:'Alberta'});
  assert.equal(q('[data-ca-heading]').textContent,'アルバータ');
  assert.equal(q('[data-ca-international]').hidden,false);
  assert.match(q('[data-ca-value]').textContent,/2021年/);
  q('[data-ca-sector="manufacturing"]').click();
  assert.equal(q('[data-ca-international]').hidden,true);
  q('[data-ca-sector="resources"]').click();q('[data-ca-subsector="mining"]').click();
  assert.equal(q('[data-ca-international]').hidden,true);
  w.history.replaceState(null,'','?sector=resources&subsector=oil-gas&province=Alberta');w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(q('[data-ca-international]').hidden,false);
  q('[data-ca-place="Saskatchewan"]').click();assert.equal(q('[data-ca-international]').hidden,true);
 }finally{await w.happyDOM.close();}
});
