import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {transform,build} from 'esbuild';
import {Window} from 'happy-dom';

// Asia and Oceania's published overviews have dedicated contracts in their overview test files.
const regions=['north-america','europe','latin-america','africa'];
const mapController=await readFile('src/scripts/atlas-overview-map.ts','utf8');
const pageController=(await readFile('src/scripts/atlas-country-overview.ts','utf8')).replace(/^import .* from ['"]\.\/atlas-overview-map['"];?\r?\n/m,'');
const controller=(await transform(`${mapController}\n${pageController}\ninitCountryOverview(document.querySelector('[data-country-overview]'));`,{loader:'ts',format:'iife'})).code;
const europeController=(await build({entryPoints:['src/scripts/atlas-europe-country-overview.ts'],bundle:true,write:false,format:'iife',globalName:'EuropeOverview'})).outputFiles[0].text+';EuropeOverview.initEuropeCountryOverview(document.querySelector("[data-country-overview]"));';
async function page(region,search='',interactive=false){
  const w=new Window({url:`https://example.com/insight-journal/atlas/${region}/overview/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
  w.document.body.innerHTML=(await readFile(`dist/atlas/${region}/overview/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
  if(interactive){
    const stage=w.document.querySelector('[data-overview-map-stage]');
    Object.defineProperty(stage,'clientWidth',{value:1000});
    Object.defineProperty(stage,'clientHeight',{value:680});
    w.eval(region==='europe'?europeController:controller);
  }
  return w;
}
const configuration=d=>JSON.parse(d.querySelector('[data-overview-config]').textContent);
const visiblePanels=d=>[...d.querySelectorAll('[role=tabpanel]')].filter(panel=>!panel.closest('[hidden]'));
const selectedTopic=d=>d.querySelector('[role=tab][aria-selected=true]');
const selectedCountries=d=>[...d.querySelectorAll('[data-overview-map-country][aria-pressed=true]')].map(country=>country.dataset.overviewMapCountry);
const canadaTopics=['agriculture','nature','industry','population','politics'];
const visibleCanadaReading=d=>visiblePanels(d)[0]?.querySelector('[data-overview-canada-topic]');

function assertCanadaPlacement(d,detail){
  assert.equal(d.querySelector('[data-overview-country-detail]'),detail,'the original detail node is reused');
  assert.equal(d.querySelectorAll('#overview-country-detail').length,1);
  assert.equal(detail.parentElement,d.querySelector('[data-overview-canada-slot]'));
  assert.equal(detail.hidden,false);
  assert.equal(d.querySelector('[data-overview-canada-slot]').hidden,false);
  assert.equal(d.querySelector('[data-overview-region-reading]').hidden,true);
  assert.ok([...d.querySelectorAll('[data-overview-generic-reading]')].every(reading=>reading.hidden));
  assert.equal(visiblePanels(d).length,1);
  assert.equal(visibleCanadaReading(d).hidden,false);
  assert.doesNotMatch(d.querySelector('.country-overview-heading').textContent,/準備中|予定/);
  assert.doesNotMatch(d.querySelector('[data-overview-detail-link]').textContent,/↓|下/);
  assert.ok([...d.querySelectorAll('[data-overview-country-name]')].every(name=>name.textContent==='カナダ'));
}

function assertGenericPlacement(d,detail,country){
  assert.equal(d.querySelector('[data-overview-country-detail]'),detail);
  assert.equal(detail.previousElementSibling,d.querySelector('[data-overview-country-detail-home]'));
  assert.equal(d.querySelector('[data-overview-canada-slot]').hidden,true);
  assert.equal(d.querySelector('[data-overview-region-reading]').hidden,false);
  assert.ok([...d.querySelectorAll('[data-overview-canada-topic]')].every(reading=>reading.hidden));
  assert.ok([...d.querySelectorAll('[data-overview-generic-reading]')].every(reading=>!reading.hidden));
  assert.equal(detail.hidden,!country);
  assert.equal(visiblePanels(d).length,country?1:0);
  assert.match(d.querySelector('[data-overview-status]').textContent,/準備中/);
}

test('Canada five topics use the built overview tabs with published links and folded sections and sources',async()=>{
  for(const topic of canadaTopics){
    const w=await page('north-america',`?country=CAN&topic=${topic}`,true),d=w.document;
    try{
      const detail=d.querySelector('[data-overview-country-detail]');
      assertCanadaPlacement(d,detail);
      assert.equal(selectedTopic(d).dataset.overviewTopic,topic);
      assert.deepEqual(selectedCountries(d),['CAN']);
      assert.deepEqual([...d.querySelectorAll('[role=tab]')].map(tab=>tab.dataset.overviewTopic),canadaTopics);
      assert.equal(d.querySelectorAll('[role=tabpanel]').length,5);
      const ids=[...d.querySelector('[data-country-overview]').querySelectorAll('[id]')].map(element=>element.id);
      assert.equal(new Set(ids).size,ids.length,'all overview IDs stay unique');
      for(const tab of d.querySelectorAll('[role=tab]'))assert.equal(d.getElementById(tab.getAttribute('aria-controls')).getAttribute('aria-labelledby'),tab.id);
      const compact=visibleCanadaReading(d),details=compact.querySelector('details');
      assert.equal(compact.dataset.overviewCanadaTopic,topic);
      assert.ok(compact.querySelector('.country-overview-canada-takeaway').textContent.trim().length>20);
      assert.doesNotMatch(compact.textContent,/準備中|説明する予定/);
      assert.equal(compact.querySelectorAll('.country-overview-canada-links a').length,3);
      assert.equal(details.open,false);
      assert.ok(details.querySelector('summary').textContent.includes('出典'));
      assert.equal(details.querySelectorAll('.country-overview-canada-section').length,3);
      assert.ok([...details.querySelectorAll('.country-overview-canada-section')].every(section=>section.querySelector('h3').textContent.trim()&&section.querySelector('p').textContent.trim()));
      assert.ok(details.querySelectorAll('.country-overview-canada-sources a').length>0);
      assert.match(details.querySelector('.country-overview-canada-sources').textContent,/2026-10-02/);
      for(const link of compact.querySelectorAll('a')){
        const url=new URL(link.href);
        assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');
        assert.ok(link.textContent.trim());
        if(url.origin===w.location.origin){
          assert.ok(url.pathname.startsWith('/insight-journal/atlas/north-america/canada/'),link.href);
          const destination=await readFile(`dist/${url.pathname.replace('/insight-journal/','')}index.html`,'utf8');
          if(url.hash){
            const source=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
            try{source.document.body.innerHTML=destination;assert.ok(source.document.getElementById(decodeURIComponent(url.hash.slice(1))),link.href);}
            finally{await source.happyDOM.close();}
          }
        }
      }
      if(topic==='nature'){
        const water=new URL(compact.querySelectorAll('.country-overview-canada-links a')[2].href);
        assert.equal(water.searchParams.get('view'),'water');assert.equal(water.searchParams.get('waterTopic'),'precipitation');
      }
      assertNorthAmericaFieldLinks(w,'CAN');
    }finally{await w.happyDOM.close();}
  }
});

test('Canada, Mexico, USA, region and history restore the original reading node and generic content',async()=>{
  const w=await page('north-america','?country=CAN&topic=nature',true),d=w.document,picker=d.querySelector('[data-overview-country]'),detail=d.querySelector('[data-overview-country-detail]');
  try{
    assertCanadaPlacement(d,detail);
    picker.value='MEX';picker.dispatchEvent(new w.Event('change'));
    assertGenericPlacement(d,detail,'MEX');assertNorthAmericaFieldLinks(w,'MEX');
    assert.equal(selectedTopic(d).dataset.overviewTopic,'nature');
    d.querySelector('[data-overview-label-country="USA"]').click();
    assertGenericPlacement(d,detail,'USA');assertNorthAmericaFieldLinks(w,'USA');
    d.querySelector('[data-overview-reset]').click();
    assertGenericPlacement(d,detail,'');assertNorthAmericaFieldLinks(w,'');
    for(const country of ['USA','MEX','CAN']){
      w.history.back();await w.happyDOM.waitUntilComplete();
      assert.equal(picker.value,country);assertNorthAmericaFieldLinks(w,country);
      country==='CAN'?assertCanadaPlacement(d,detail):assertGenericPlacement(d,detail,country);
      assert.equal(selectedTopic(d).dataset.overviewTopic,'nature');
    }
    assert.doesNotMatch(d.querySelector('[data-overview-announcement]').textContent,/地図の下/);
    w.history.forward();await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value,'MEX');assertGenericPlacement(d,detail,'MEX');
    picker.value='CAN';picker.dispatchEvent(new w.Event('change'));
    const city=configuration(d).cities.find(city=>city.country==='CAN');
    assert.ok(city);
    d.querySelector(`[data-overview-map-city="${city.id}"]`).click();
    assertCanadaPlacement(d,detail);assert.equal(new URL(w.location.href).searchParams.get('city'),city.id);
    assert.ok(d.querySelector('[data-overview-place-title]').textContent.includes(city.name));
    d.querySelector('[data-overview-reset]').click();assertGenericPlacement(d,detail,'');
    w.history.replaceState({},'','?country=XXX&topic=unknown');w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(picker.value,'');assertGenericPlacement(d,detail,'');
  }finally{await w.happyDOM.close();}
});

test('Canada reuses five-tab keyboard focus, URL updates and panel ARIA relationships',async()=>{
  const w=await page('north-america','?country=CAN&topic=nature',true),d=w.document;
  try{
    for(const [key,topic] of [['End','politics'],['Home','agriculture'],['ArrowLeft','politics'],['ArrowRight','agriculture']]){
      selectedTopic(d).dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true}));
      const selected=selectedTopic(d);
      assert.equal(selected.dataset.overviewTopic,topic);assert.equal(d.activeElement,selected);
      assert.equal(new URL(w.location.href).searchParams.get('topic'),topic);
      assert.equal(new URL(w.location.href).searchParams.get('country'),'CAN');
      assert.equal(visiblePanels(d).length,1);assert.equal(visiblePanels(d)[0].getAttribute('aria-labelledby'),selected.id);
      assert.equal(visibleCanadaReading(d).dataset.overviewCanadaTopic,topic);
    }
    const compact=visibleCanadaReading(d),details=compact.querySelector('details');
    assert.equal(details.open,false);
    details.open=true;
    assert.equal(details.querySelectorAll('.country-overview-canada-section').length,3);
    assert.equal(d.querySelectorAll('[role=tab]').length,5,'opening the native fold adds no extra tabs');
    assertNorthAmericaFieldLinks(w,'CAN');
  }finally{await w.happyDOM.close();}
});

const northAmericaFields=['agriculture','nature','industry','population'];
const northAmericaCountryPaths={USA:'',CAN:'canada/',MEX:'mexico/'};
function assertNorthAmericaFieldLinks(w,country){
  for(const field of northAmericaFields){
    const link=w.document.querySelector(`[data-overview-field="${field}"]`);
    assert.ok(link,field);
    assert.equal(new URL(link.href).pathname,`/insight-journal/atlas/north-america/${northAmericaCountryPaths[country]??''}${field}/`);
    assert.equal(new URL(link.href).search,'');
  }
}

test('North America overview resolves every country field route and returns to the same country',async()=>{
  for(const country of ['CAN','MEX','USA']){
    const overview=await page('north-america',`?country=${country}&topic=industry`,true);
    try{
      assertNorthAmericaFieldLinks(overview,country);
      for(const field of northAmericaFields){
        const destination=new URL(overview.document.querySelector(`[data-overview-field="${field}"]`).href);
        const fieldWindow=new Window({url:destination.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
        let returnUrl;
        try{
          fieldWindow.document.body.innerHTML=(await readFile(`dist/${destination.pathname.replace('/insight-journal/','')}index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
          const selector=country==='CAN'?'.canada-fields a':country==='MEX'?'.mexico-fields a':'[data-atlas-overview-link]';
          const overviewPath=country==='MEX'?'/insight-journal/atlas/north-america/mexico/overview/':'/insight-journal/atlas/north-america/overview/';
          const link=[...fieldWindow.document.querySelectorAll(selector)].find(link=>new URL(link.href).pathname===overviewPath);
          assert.ok(link,`${country} ${field}: overview return exists`);
          returnUrl=new URL(link.href);
          assert.equal(returnUrl.searchParams.get('country'),country,`${country} ${field}: country retained`);
        }finally{await fieldWindow.happyDOM.close();}
        const returned=country==='MEX'
          ? new Window({url:returnUrl.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}})
          : await page('north-america',returnUrl.search,true);
        try{
          if(country==='MEX'){
            returned.document.body.innerHTML=(await readFile('dist/atlas/north-america/mexico/overview/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
            assert.equal(returned.document.querySelector('[data-mexico-workspace]').dataset.mexicoField,'overview');
            assert.equal(returned.document.querySelectorAll('[data-mexico-overview-shape]').length,32);
            assert.match(returned.document.querySelector('.mexico-overview-intro').textContent,/126,014,024/);
            const links=[...returned.document.querySelectorAll('.mexico-overview-intro .mexico-overview-field-links a')];
            assert.equal(links.length,northAmericaFields.length);
            for(const field of northAmericaFields)assert.ok(links.some(link=>new URL(link.href).pathname===`/insight-journal/atlas/north-america/mexico/${field}/`),`${country} ${field}: dedicated overview field route`);
          }else{assert.equal(returned.document.querySelector('[data-overview-country]').value,country);assertNorthAmericaFieldLinks(returned,country);}
        }
        finally{await returned.happyDOM.close();}
      }
    }finally{await overview.happyDOM.close();}
  }
});

test('North America country changes and restored history update all field destinations safely',async()=>{
  const w=await page('north-america','?country=CAN',true),picker=w.document.querySelector('[data-overview-country]');
  try{
    assertNorthAmericaFieldLinks(w,'CAN');
    picker.value='MEX';picker.dispatchEvent(new w.Event('change'));
    assertNorthAmericaFieldLinks(w,'MEX');
    w.document.querySelector('[data-overview-label-country="USA"]').click();
    assertNorthAmericaFieldLinks(w,'USA');
    w.history.back();await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value,'MEX');assertNorthAmericaFieldLinks(w,'MEX');
    w.history.back();await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value,'CAN');assertNorthAmericaFieldLinks(w,'CAN');
    w.history.forward();await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value,'MEX');assertNorthAmericaFieldLinks(w,'MEX');
    for(const country of ['CAN','MEX','XXX','FRA','']){
      w.history.replaceState({},'',country?`?country=${country}`:w.location.pathname);
      w.dispatchEvent(new w.PopStateEvent('popstate'));
      assert.equal(picker.value,['CAN','MEX'].includes(country)?country:'');
      assertNorthAmericaFieldLinks(w,['CAN','MEX'].includes(country)?country:'');
    }
    picker.value='CAN';picker.dispatchEvent(new w.Event('change'));
    w.document.querySelector('[data-overview-reset]').click();
    assert.equal(picker.value,'');assertNorthAmericaFieldLinks(w,'');
  }finally{await w.happyDOM.close();}
});

test('Static North America overview keeps regionwide defaults until the client reads the country URL',async()=>{
  const w=await page('north-america','?country=CAN');
  try{
    assert.equal(w.document.querySelector('[data-overview-country]').value,'');
    assertNorthAmericaFieldLinks(w,'');
    const config=configuration(w.document);
    for(const field of config.fields){
      assert.equal(field.href,`/insight-journal/atlas/north-america/${field.id}/`);
      for(const [country,path] of Object.entries(northAmericaCountryPaths)){
        assert.equal(field.countryHrefs[country],`/insight-journal/atlas/north-america/${path}${field.id}/`);
        await access(`dist/atlas/north-america/${path}${field.id}/index.html`);
      }
    }
  }finally{await w.happyDOM.close();}
});

test('共通概要4地域の初期HTMLは白地図と地域概況を示し、国別の本文は選択まで隠す',async()=>{
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
      assert.deepEqual([...d.querySelectorAll('[role=tab]')].map(t=>t.textContent),['農林業','自然環境',region==='europe'?'産業':'主要産業','人口','政治']);
      assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);
      assert.equal(d.querySelector('[data-overview-detail-link]').hidden,true);
      assert.equal(visiblePanels(d).length,0);
      assert.match(d.querySelector('h1').textContent,/の概要と白地図/);
      if(region==='europe')assert.equal(d.querySelector('.country-overview-status'),null);
      else assert.match(d.querySelector('.country-overview-status').textContent,/準備中/);
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

test('共通概要4地域で国名選択は地図と国別本文に連動し、全体へ戻すと選択を解除する',async()=>{
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
    assert.ok(visiblePanels(d)[0].querySelector('[data-eu-country-takeaway]').textContent.trim());assert.match(d.querySelector('#overview-country-title').textContent,/イギリス/);assert.deepEqual(selectedCountries(d),['GBR']);
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
    const cityLabel=d.querySelector('[data-eu-country-selected-city]');assert.equal(cityLabel.closest('[hidden]'),null);assert.ok(cityLabel.textContent.includes(city.name),'selected city is named in the visible country heading');
    const picker=d.querySelector('[data-overview-country]');picker.value=city.country==='FRA'?'DEU':'FRA';picker.dispatchEvent(new w.Event('change'));
    assert.equal(new URL(w.location.href).searchParams.has('city'),false);assert.equal(d.querySelectorAll('[data-overview-map-city][aria-pressed=true]').length,0);
    assert.equal(cityLabel.hidden,true);
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

test('対象外の国は地域全体に戻り、不明なテーマを既定へ戻す',async()=>{
  for(const region of ['europe']){
    const w=await page(region,'?country=XXX&topic=unknown',true),d=w.document;
    try{
      assert.equal(d.querySelector('[data-overview-country]').value,'');assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);
      assert.equal(selectedTopic(d).dataset.overviewTopic,'agriculture');assert.equal(new URL(w.location.href).searchParams.has('country'),false);assert.equal(new URL(w.location.href).searchParams.has('topic'),false);
    }finally{await w.happyDOM.close();}
  }
  const w=await page('europe','?country=FRA&topic=unknown',true);
  try{assert.equal(w.document.querySelector('[data-overview-country]').value,'FRA');assert.equal(selectedTopic(w.document).dataset.overviewTopic,'agriculture');assert.equal(new URL(w.location.href).searchParams.get('topic'),'agriculture');}
  finally{await w.happyDOM.close();}
});
