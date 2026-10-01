import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

// Oceania's published four-field overview has its own contract in atlas-oceania-overview.test.mjs.
const regions=['north-america','europe','latin-america','west-asia','africa','asia/east-asia','asia/southeast-asia','asia/south-central-asia','asia/south-asia','asia/central-asia'];
const mapController=await readFile('src/scripts/atlas-overview-map.ts','utf8');
const pageController=(await readFile('src/scripts/atlas-country-overview.ts','utf8')).replace(/^import .* from ['"]\.\/atlas-overview-map['"];?\r?\n/m,'');
const controller=(await transform(`${mapController}\n${pageController}\ninitCountryOverview(document.querySelector('[data-country-overview]'));`,{loader:'ts',format:'iife'})).code;
async function page(region,search='',interactive=false){
  const w=new Window({url:`https://example.com/insight-journal/atlas/${region}/overview/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
  w.document.body.innerHTML=(await readFile(`dist/atlas/${region}/overview/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
  if(interactive){
    const stage=w.document.querySelector('[data-overview-map-stage]');
    Object.defineProperty(stage,'clientWidth',{value:1000});
    Object.defineProperty(stage,'clientHeight',{value:680});
    w.eval(controller);
  }
  return w;
}
const configuration=d=>JSON.parse(d.querySelector('[data-overview-config]').textContent);
const visiblePanels=d=>[...d.querySelectorAll('[role=tabpanel]')].filter(panel=>!panel.closest('[hidden]'));
const selectedTopic=d=>d.querySelector('[role=tab][aria-selected=true]');
const selectedCountries=d=>[...d.querySelectorAll('[data-overview-map-country][aria-pressed=true]')].map(country=>country.dataset.overviewMapCountry);

test('共通概要10地域の初期HTMLは白地図と地域概況を示し、国別の本文は選択まで隠す',async()=>{
  const sitemap=await readFile('dist/sitemap.xml','utf8');
  for(const region of regions){
    const w=await page(region),d=w.document;
    try{
      const picker=d.querySelector('[data-overview-country]'),options=[...picker.options].filter(option=>option.value),config=configuration(d);
      assert.ok(options.length>0,region);
      assert.equal(picker.value,'',`${region}: 国は未選択`);
      assert.match(picker.options[0].textContent,/全体/);
      assert.equal(new Set(options.map(o=>o.value)).size,options.length);
      assert.ok(options.every(o=>o.textContent.trim()&&!o.textContent.includes('undefined')));
      const codes=options.map(option=>option.value).sort();
      assert.deepEqual([...d.querySelectorAll('[data-overview-map-country]')].map(path=>path.dataset.overviewMapCountry).sort(),codes,`${region}: 一覧の全国に地図形状がある`);
      assert.deepEqual([...d.querySelectorAll('[data-overview-label-country]')].map(label=>label.dataset.overviewLabelCountry).sort(),codes,`${region}: 一覧の全国に国名がある`);
      assert.deepEqual(config.countries.map(country=>country.code).sort(),codes);
      assert.ok(config.countries.every(country=>country.bounds?.length===4&&country.bounds.every(Number.isFinite)),`${region}: 国別の拡大範囲を持つ`);
      assert.ok(d.querySelector('[data-overview-map]'));
      assert.ok(config.cities.length>0,`${region}: 主要都市がある`);
      assert.equal(d.querySelectorAll('[data-overview-map-city]').length,config.cities.length);
      assert.equal(d.querySelectorAll('[data-overview-city-dot]').length,config.cities.length);
      assert.ok(config.cities.every(city=>codes.includes(city.country)),`${region}: 都市は選択可能な国に属する`);
      const mapSources=[...d.querySelectorAll('.overview-map-source a')];
      assert.ok(mapSources.some(link=>link.href.startsWith('https://www.naturalearthdata.com/')||link.href.startsWith('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/')),region);
      assert.ok(mapSources.every(link=>link.textContent.trim()&&new URL(link.href).protocol==='https:'));
      assert.deepEqual([...d.querySelectorAll('[role=tab]')].map(t=>t.textContent),['農林業','自然環境','主要産業','人口','政治']);
      assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);
      assert.equal(d.querySelector('[data-overview-detail-link]').hidden,true);
      assert.equal(visiblePanels(d).length,0);
      assert.match(d.querySelector('h1').textContent,/の概要と白地図/);
      assert.match(d.querySelector('.country-overview-status').textContent,/準備中/);
      assert.equal(d.querySelectorAll('[data-news-location]').length,0,'記事側の分野地図用操作を概要では表示しない');
      const reading=d.querySelector('.overview-region-reading');
      assert.ok(reading&&!reading.closest('[hidden]'));
      assert.equal(reading.querySelectorAll('.overview-region-section').length,4);
      if(region==='europe'){
        assert.match(reading.textContent,/EU（欧州連合）.*27か国/);
        assert.match(reading.textContent,/欧州全体とは範囲が異なります/);
        assert.match(reading.textContent,/第二次世界大戦/);
        const citations=[...reading.querySelectorAll('.overview-inline-sources a')];
        assert.ok(citations.length>=4);
        assert.ok(citations.every(link=>new URL(link.href).hostname.endsWith('europa.eu')));
      }else{
        assert.match(reading.textContent,/本文を準備/);
        assert.doesNotMatch(reading.textContent,/EU（欧州連合）.*27か国/);
      }
      assert.ok(sitemap.includes(`/atlas/${region}/overview/`));
      for(const a of d.querySelectorAll('.country-overview-fields a,.country-overview-regions a')){
        const url=new URL(a.href);await access(`dist/${url.pathname.replace('/insight-journal/','')}index.html`);
      }
      for(const tab of d.querySelectorAll('[role=tab]'))assert.equal(d.getElementById(tab.getAttribute('aria-controls')).getAttribute('aria-labelledby'),tab.id);
    }finally{await w.happyDOM.close();}
  }
});

test('共通概要10地域で国名選択は地図と国別本文に連動し、全体へ戻すと選択を解除する',async()=>{
  for(const region of regions){
    const w=await page(region,'',true),d=w.document;
    try{
      const config=configuration(d),svg=d.querySelector('[data-overview-map]'),initialFrame=svg.getAttribute('viewBox');
      assert.equal(d.querySelector('[data-overview-country]').value,'');
      assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);
      assert.deepEqual(selectedCountries(d),[]);
      const country=config.countries[0];
      d.querySelector(`[data-overview-label-country="${country.code}"]`).click();
      assert.equal(d.querySelector('[data-overview-country]').value,country.code);
      assert.equal(d.querySelector('[data-overview-country-detail]').hidden,false);
      assert.equal(d.querySelector('[data-overview-detail-link]').hidden,false);
      assert.equal(visiblePanels(d).length,1);
      assert.deepEqual(selectedCountries(d),[country.code]);
      assert.equal(d.querySelector('[data-overview-place-title]').textContent,country.name);
      assert.equal(new URL(w.location.href).searchParams.get('country'),country.code);
      assert.notEqual(svg.getAttribute('viewBox'),initialFrame);
      d.querySelector('[data-overview-reset]').click();
      assert.equal(d.querySelector('[data-overview-country]').value,'');
      assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);
      assert.equal(d.querySelector('[data-overview-detail-link]').hidden,true);
      assert.equal(visiblePanels(d).length,0);
      assert.deepEqual(selectedCountries(d),[]);
      assert.equal(svg.getAttribute('viewBox'),initialFrame);
      for(const key of ['country','city','topic'])assert.equal(new URL(w.location.href).searchParams.has(key),false);
    }finally{await w.happyDOM.close();}
  }
});

test('国とテーマの直接指定・国変更・キーボード操作・履歴が同じ内容を示す',async()=>{
  const w=await page('europe','?country=FRA&topic=politics',true),d=w.document,picker=d.querySelector('[data-overview-country]');
  const selected=()=>selectedTopic(d);
  try{
    assert.equal(picker.value,'FRA');assert.match(d.querySelector('#overview-country-title').textContent,/フランス/);
    assert.equal(selected().dataset.overviewTopic,'politics');assert.deepEqual(selectedCountries(d),['FRA']);
    picker.value='DEU';picker.dispatchEvent(new w.Event('change'));
    assert.equal(selected().dataset.overviewTopic,'politics');assert.equal(new URL(w.location.href).searchParams.get('country'),'DEU');
    assert.deepEqual(selectedCountries(d),['DEU']);
    selected().dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
    assert.equal(selected().dataset.overviewTopic,'agriculture');assert.equal(d.activeElement,selected());
    selected().dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    assert.equal(selected().dataset.overviewTopic,'politics');assert.equal(visiblePanels(d).length,1);
    selected().dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(selected().dataset.overviewTopic,'agriculture');
    selected().dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(selected().dataset.overviewTopic,'politics');assert.equal(d.activeElement,selected());
    w.history.replaceState({},'','?country=GBR&topic=population');w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(picker.value,'GBR');assert.equal(selected().dataset.overviewTopic,'population');
    assert.match(visiblePanels(d)[0].querySelector('.country-overview-introduction h2').textContent,/イギリスの人口/);assert.deepEqual(selectedCountries(d),['GBR']);
    w.history.replaceState({},'','?country=XXX&topic=unknown');w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(picker.value,'');assert.equal(visiblePanels(d).length,0);assert.deepEqual(selectedCountries(d),[]);
  }finally{await w.happyDOM.close();}
});

test('都市選択と直接リンクが所属国を選び、国を変更すると都市の選択を解除する',async()=>{
  const w=await page('europe','',true),d=w.document;
  let city;
  try{
    const target=[...d.querySelectorAll('[data-overview-map-city]')].find(button=>!button.hidden);
    assert.ok(target,'初期地図に選択できる都市名がある');city=configuration(d).cities.find(city=>city.id===target.dataset.overviewMapCity);
    target.click();
    assert.equal(d.querySelector('[data-overview-country]').value,city.country);assert.equal(new URL(w.location.href).searchParams.get('city'),city.id);
    assert.deepEqual(selectedCountries(d),[city.country]);assert.equal(d.querySelector('[data-overview-country-detail]').hidden,false);
    assert.ok(d.querySelector('[data-overview-place-title]').textContent.includes(city.name));assert.equal(target.getAttribute('aria-pressed'),'true');
    const picker=d.querySelector('[data-overview-country]');picker.value=city.country==='FRA'?'DEU':'FRA';picker.dispatchEvent(new w.Event('change'));
    assert.equal(new URL(w.location.href).searchParams.has('city'),false);assert.equal(d.querySelectorAll('[data-overview-map-city][aria-pressed=true]').length,0);
  }finally{await w.happyDOM.close();}
  const direct=await page('europe',`?city=${encodeURIComponent(city.id)}&topic=nature`,true);
  try{
    assert.equal(direct.document.querySelector('[data-overview-country]').value,city.country);assert.equal(selectedTopic(direct.document).dataset.overviewTopic,'nature');
    assert.equal(new URL(direct.location.href).searchParams.get('country'),city.country);
  }finally{await direct.happyDOM.close();}
  const otherCountry=city.country==='FRA'?'DEU':'FRA',conflicting=await page('europe',`?country=${otherCountry}&city=${encodeURIComponent(city.id)}`,true);
  try{assert.equal(conflicting.document.querySelector('[data-overview-country]').value,otherCountry);assert.equal(new URL(conflicting.location.href).searchParams.has('city'),false);}
  finally{await conflicting.happyDOM.close();}
});

test('対象外の国は地域全体に戻り、南アジアと中央アジアの選択肢を混ぜない',async()=>{
  for(const region of ['europe','asia/south-asia','asia/central-asia']){
    const w=await page(region,'?country=XXX&topic=unknown',true),d=w.document;
    try{
      assert.equal(d.querySelector('[data-overview-country]').value,'');assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);
      assert.equal(selectedTopic(d).dataset.overviewTopic,'agriculture');assert.equal(new URL(w.location.href).searchParams.has('country'),false);assert.equal(new URL(w.location.href).searchParams.has('topic'),false);
      if(region==='asia/south-asia')assert.equal(d.querySelector('option[value=KAZ]'),null);
      if(region==='asia/central-asia')assert.equal(d.querySelector('option[value=IND]'),null);
    }finally{await w.happyDOM.close();}
  }
  const w=await page('europe','?country=FRA&topic=unknown',true);
  try{assert.equal(w.document.querySelector('[data-overview-country]').value,'FRA');assert.equal(selectedTopic(w.document).dataset.overviewTopic,'agriculture');assert.equal(new URL(w.location.href).searchParams.get('topic'),'agriculture');}
  finally{await w.happyDOM.close();}
});
