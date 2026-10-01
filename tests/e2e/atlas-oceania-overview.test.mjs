import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const component=await readFile('src/components/atlas/OceaniaOverviewPage.astro','utf8');
const inline=component.match(/<script>\s*([\s\S]*?)<\/script>/)[1].replace(/^\s*import .* from ['"][^'"]+['"];?\r?\n/gm,'');
const mapController=await readFile('src/scripts/atlas-overview-map.ts','utf8');
const controller=(await transform(`${mapController}\n${inline}`,{loader:'ts',format:'iife'})).code;
const site='https://example.com/insight-journal/atlas/oceania/overview/';
async function page(search='',interactive=false){
  const w=new Window({url:site+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
  w.document.body.innerHTML=(await readFile('dist/atlas/oceania/overview/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
  if(interactive){
    const stage=w.document.querySelector('[data-overview-map-stage]');
    Object.defineProperty(stage,'clientWidth',{value:1000});
    Object.defineProperty(stage,'clientHeight',{value:680});
    w.eval(controller);
  }
  return w;
}
const configuration=d=>JSON.parse(d.querySelector('[data-overview-config]').textContent);
const selectedCountries=d=>[...d.querySelectorAll('[data-overview-map-country][aria-pressed=true]')].map(path=>path.dataset.overviewMapCountry);
function fieldLinks(d){return [...d.querySelectorAll('.oceania-overview-navigation [data-oceania-field-link]')];}
function assertLinks(d,place,scope){
  const config=configuration(d),links=fieldLinks(d);
  assert.deepEqual(links.map(a=>a.dataset.oceaniaFieldLink),['nature','agriculture','industry','population']);
  for(const a of links){
    const url=new URL(a.href),field=config.fields.find(f=>f.id===a.dataset.oceaniaFieldLink);
    const theme=field.themes.find(t=>t.countryCodes.includes(place))??field.themes[0];
    assert.equal(url.pathname,`/insight-journal/atlas/oceania/${field.id}/`);
    assert.equal(url.searchParams.get('place'),place||'all');
    assert.equal(url.searchParams.get('scope'),scope);
    assert.equal(url.searchParams.get('theme'),theme.id);
    assert.equal(url.searchParams.get('layer'),theme.layer);
    assert.equal(url.searchParams.get('compare'),theme.compare);
  }
  for(const a of d.querySelectorAll('[data-oceania-base-link]')){
    const url=new URL(a.href);
    assert.equal(url.pathname,'/insight-journal/atlas/oceania/base-map/');
    assert.equal(url.searchParams.get('place'),place||null);
    assert.equal(url.searchParams.get('scope'),scope);
  }
}

test('Oceania published overview SSR retains all 25 places, 16 cities, four ready entries and source-backed history',async()=>{
  const w=await page(),d=w.document;
  try{
    const picker=d.querySelector('[data-overview-country]'),config=configuration(d);
    const codes=[...picker.options].filter(o=>o.value).map(o=>o.value).sort();
    assert.equal(codes.length,25);assert.equal(new Set(codes).size,25);assert.equal(picker.value,'');
    assert.deepEqual([...d.querySelectorAll('[data-overview-map-country]')].map(path=>path.dataset.overviewMapCountry).sort(),codes);
    assert.deepEqual([...d.querySelectorAll('[data-overview-label-country]')].map(label=>label.dataset.overviewLabelCountry).sort(),codes);
    assert.deepEqual(config.countries.map(c=>c.code).sort(),codes);
    assert.ok(config.countries.every(c=>c.name&&c.bounds?.length===4&&c.bounds.every(Number.isFinite)));
    assert.equal(config.cities.length,16);
    assert.equal(d.querySelectorAll('[data-overview-map-city]').length,16);
    assert.equal(d.querySelectorAll('[data-overview-city-dot]').length,16);
    assert.ok(config.cities.every(c=>codes.includes(c.country)&&c.point.length===2&&c.point.every(Number.isFinite)));
    assert.match(d.querySelector('h1').textContent,/オセアニアの概要と白地図/);
    const reading=d.querySelector('.overview-region-reading');
    assert.ok(reading&&!reading.closest('[hidden]'));
    assert.match(reading.querySelector('h2').textContent,/海/);
    assert.match(reading.textContent,/加工|交通/);assert.match(reading.textContent,/制度/);
    assert.equal(d.querySelectorAll('[role=tab]').length,0);
    assert.doesNotMatch(d.querySelector('.oceania-overview-navigation').textContent,/準備/);
    const links=fieldLinks(d);assert.equal(links.length,4);
    for(const a of links){
      const url=new URL(a.href);assert.equal(url.searchParams.get('place'),'all');assert.equal(url.searchParams.get('scope'),'all');
      await access(`dist/${url.pathname.replace('/insight-journal/','')}index.html`);
    }
    await access('dist/atlas/oceania/base-map/index.html');
    assert.ok(reading.querySelectorAll('.overview-region-section').length>=3);
    const citations=[...reading.querySelectorAll('.overview-inline-sources a')];
    assert.ok(citations.some(a=>new URL(a.href).hostname==='www.dfat.gov.au'));
    assert.ok(citations.some(a=>new URL(a.href).hostname==='www.mfat.govt.nz'));
    assert.ok(citations.some(a=>new URL(a.href).hostname==='forumsec.org'));
    assert.ok([...reading.querySelectorAll('a')].some(a=>a.href.startsWith('https://www.naturalearthdata.com/')));
    assert.ok(citations.every(a=>a.textContent.trim()&&new URL(a.href).protocol==='https:'));
    assert.ok([...reading.querySelectorAll('details')].every(detail=>!detail.open));
    assert.equal(d.querySelectorAll('[data-news-location]').length,0);
    assert.ok((await readFile('dist/sitemap.xml','utf8')).includes('/atlas/oceania/overview/'));
  }finally{await w.happyDOM.close();}
});

test('Oceania map, country picker, cities and whole-region reset keep the four learning entries synchronized',async()=>{
  const w=await page('',true),d=w.document,picker=d.querySelector('[data-overview-country]');
  try{
    const config=configuration(d),svg=d.querySelector('[data-overview-map]'),initialFrame=svg.getAttribute('viewBox');
    assertLinks(d,'','all');assert.deepEqual(selectedCountries(d),[]);
    const initialHistory=w.history.length;
    d.querySelector('[data-overview-label-country="NZL"]').click();
    assert.equal(picker.value,'NZL');assert.deepEqual(selectedCountries(d),['NZL']);assertLinks(d,'NZL','country');
    assert.notEqual(svg.getAttribute('viewBox'),initialFrame);assert.equal(w.history.length,initialHistory+1);
    assert.equal(d.querySelector('[data-overview-place-title]').textContent,config.countries.find(c=>c.code==='NZL').name);
    assert.ok(d.querySelector('[data-oceania-entry-place]').textContent.includes('ニュージーランド'));
    picker.value='TUV';picker.dispatchEvent(new w.Event('change'));
    assert.deepEqual(selectedCountries(d),['TUV']);assertLinks(d,'TUV','country');
    d.querySelector('[data-overview-reset]').click();
    picker.value='PNG';picker.dispatchEvent(new w.Event('change'));
    const cityButton=[...d.querySelectorAll('[data-overview-map-city]')].find(button=>button.dataset.country==='PNG'&&!button.hidden);
    assert.ok(cityButton,'PNG expansion exposes a city label that a reader can select');
    const city=config.cities.find(c=>c.id===cityButton.dataset.overviewMapCity);
    cityButton.click();
    assert.equal(picker.value,'PNG');assert.deepEqual(selectedCountries(d),['PNG']);assertLinks(d,'PNG','country');
    assert.equal(new URL(w.location.href).searchParams.get('city'),city.id);
    assert.ok(d.querySelector('[data-overview-place-title]').textContent.includes(city.name));
    assert.equal(d.querySelector(`[data-overview-map-city="${city.id}"]`).getAttribute('aria-pressed'),'true');
    picker.value='FJI';picker.dispatchEvent(new w.Event('change'));
    assert.equal(new URL(w.location.href).searchParams.has('city'),false);assertLinks(d,'FJI','country');
    d.querySelector('[data-overview-reset]').click();
    assert.equal(picker.value,'');assert.deepEqual(selectedCountries(d),[]);assertLinks(d,'','all');
    assert.equal(svg.getAttribute('viewBox'),initialFrame);
    const url=new URL(w.location.href);assert.equal(url.searchParams.get('place'),'all');assert.equal(url.searchParams.get('scope'),'all');
    for(const key of ['city','country','topic'])assert.equal(url.searchParams.has(key),false);
    assert.match(d.querySelector('[data-overview-announcement]').textContent,/全体/);
  }finally{await w.happyDOM.close();}
});

test('Oceania selected place and all/theme scopes survive direct links and history, with legacy city conflicts normalized',async()=>{
  for(const scope of ['all','theme','country']){
    const w=await page(`?place=NZL&scope=${scope}&keep=source#reference`,true),d=w.document;
    try{
      assert.equal(d.querySelector('[data-overview-country]').value,'NZL');assertLinks(d,'NZL',scope);
      assert.equal(new URL(w.location.href).searchParams.get('keep'),'source');assert.equal(w.location.hash,'#reference');
      w.history.replaceState({},'','?place=PNG&scope=theme');w.dispatchEvent(new w.PopStateEvent('popstate'));
      assert.equal(d.querySelector('[data-overview-country]').value,'PNG');assert.deepEqual(selectedCountries(d),['PNG']);assertLinks(d,'PNG','theme');
      w.history.replaceState({},'','?place=all&scope=all');w.dispatchEvent(new w.PopStateEvent('popstate'));
      assert.equal(d.querySelector('[data-overview-country]').value,'');assertLinks(d,'','all');assert.deepEqual(selectedCountries(d),[]);
    }finally{await w.happyDOM.close();}
  }
  const fixture=await page(),city=configuration(fixture.document).cities.find(c=>c.country==='PNG');await fixture.happyDOM.close();
  for(const [query,place,citySelected] of [
    [`?city=${encodeURIComponent(city.id)}`,'PNG',true],
    [`?place=NZL&city=${encodeURIComponent(city.id)}`,'NZL',false],
    ['?country=NZL&topic=politics','NZL',false],
    ['?place=all&country=NZL&scope=country','',false],
    ['?place=XXX&scope=country','',false],
  ]){
    const w=await page(query,true),d=w.document;
    try{
      assert.equal(d.querySelector('[data-overview-country]').value,place);
      assertLinks(d,place,place?'country':'all');
      const url=new URL(w.location.href);assert.equal(url.searchParams.has('country'),false);assert.equal(url.searchParams.has('topic'),false);
      assert.equal(url.searchParams.has('city'),citySelected);
    }finally{await w.happyDOM.close();}
  }
});
