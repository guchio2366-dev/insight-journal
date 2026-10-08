import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createAsiaLayout} from '../../src/scripts/atlas-asia-layout.ts';

test('月別比較の月操作をtoolbarへ置き、両凡例と値・イベントを保持して通常表示へ復帰する',()=>{
 const window=new Window();window.document.body.innerHTML='<main data-asia-atlas><div class="asia-toolbar"></div><div data-asia-map-items></div><div data-asia-map-legend></div><aside><div data-reading-map-legend>当月の全区間と年・単位</div><section data-seasonal-panel hidden><div class="seasonal-month-controls"><select data-seasonal-month><option value="m-04">4月</option><option value="m-07">7月</option></select></div><div data-seasonal-legend>月の全区間</div></section><section data-comparison-reading><div data-comparison-compact>元の作物と比較月の全区間</div></section></aside><section data-asia-statistics hidden></section></main>';
 const root=window.document.querySelector('main'),select=root.querySelector('[data-seasonal-month]'),controls=select.parentElement,home=controls.parentElement,keys=root.querySelector('[data-comparison-compact]');let changed=0;
 select.value='m-04';select.addEventListener('change',()=>changed++);
 const layout=createAsiaLayout(root);layout.render({field:'natural',topic:'seasonal-precipitation',back:'original-wheat'});
 assert.equal(root.dataset.seasonalActive,'true');assert.equal(controls.parentElement,root.querySelector('.asia-toolbar'));assert.equal(keys.parentElement,root.querySelector('[data-asia-map-legend]'));assert.equal(select.value,'m-04');
 select.value='m-07';select.dispatchEvent(new window.Event('change'));assert.equal(changed,1);
 layout.render({field:'natural',topic:'seasonal-precipitation',back:null});assert.equal(root.querySelector('[data-seasonal-legend]').hidden,true,'通常月別表示は年・単位付き主凡例を残して重複凡例を隠す');assert.equal(root.querySelector('[data-reading-map-legend]').parentElement,root.querySelector('[data-asia-map-legend]'));
 layout.render({field:'agriculture',topic:'wheat'});
 assert.equal(root.dataset.seasonalActive,'false');assert.equal(controls.parentElement,home);assert.equal(select.value,'m-07');assert.equal(keys.parentElement,root.querySelector('[data-comparison-reading]'));assert.equal(root.querySelector('[data-seasonal-legend]').hidden,false);window.happyDOM.abort();
});

test('項目を地図直下へ、既存統計を地図・説明の下へ移し、選択イベントを保つ',async()=>{
 const window=new Window();
 window.document.body.innerHTML='<div data-asia-atlas><div data-asia-map-items></div><aside><div data-reading-map-legend>年と単位</div><label data-city-picker><select data-city-select><option value="tokyo">東京</option></select></label><details data-reading-details><section data-industry-panel><label data-industry-detail-label><select><option>愛知</option></select></label><div data-industry-content><table><tbody><tr><td>42</td></tr></tbody></table></div></section></details></aside><section data-asia-statistics hidden></section></div>';
 const root=window.document.querySelector('[data-asia-atlas]');
 const content=root.querySelector('[data-industry-content]');
 const city=root.querySelector('[data-city-select]');let selected=0;city.addEventListener('change',()=>selected++);
 const previous=globalThis.MutationObserver;globalThis.MutationObserver=window.MutationObserver;
 try{
  const layout=createAsiaLayout(root);layout.render({field:'industry'});
  const details=root.querySelector('[data-reading-details]');assert.equal(details.open,false);
  details.open=true;layout.render({field:'natural'});assert.equal(details.open,true);
  details.open=false;layout.render({field:'industry'});assert.equal(details.open,false);
  assert.equal(root.querySelector('[data-asia-map-items] [data-reading-map-legend]').textContent,'年と単位');
  assert.equal(root.querySelector('[data-asia-map-items] [data-city-select]'),city);
  city.dispatchEvent(new window.Event('change'));assert.equal(selected,1);
  assert.equal(root.querySelector('[data-asia-statistics] [data-industry-content]'),content);
  assert.equal(root.querySelector('[data-asia-statistics]').hidden,false);
  root.querySelector('[data-industry-panel]').hidden=true;layout.render({field:'population'});
  assert.equal(root.querySelector('[data-asia-statistics]').hidden,true);
  root.querySelector('[data-industry-panel]').hidden=false;content.replaceChildren();layout.render({field:'industry'});
  assert.equal(root.querySelector('[data-asia-statistics]').hidden,true);
  content.innerHTML='<p>取得した既存統計</p>';
  await window.happyDOM.whenAsyncComplete();
  assert.equal(root.querySelector('[data-asia-statistics]').hidden,false);
 }finally{globalThis.MutationObserver=previous;window.happyDOM.abort();}
});

test('配置ホストのない既存コントローラー画面はDOMを変えない',()=>{
 const window=new Window();window.document.body.innerHTML='<section data-asia-atlas><div data-industry-content>既存値</div></section>';
 const root=window.document.querySelector('[data-asia-atlas]'),before=root.innerHTML;
 createAsiaLayout(root).render({field:'natural'});
 assert.equal(root.innerHTML,before);window.happyDOM.abort();
});

test('都市選択を既存国toolbarへ移し、選択値・イベント・気候主題のhidden同期を維持する',()=>{
 const window=new Window();window.document.body.innerHTML='<div data-asia-atlas><div class="asia-toolbar"><select data-country-select><option>全体</option></select></div><div data-asia-map-items><label data-city-picker>都市の雨温図<select data-city-select><option value="">都市を選ぶ</option><option value="tokyo">東京 · 日本</option></select></label></div><section data-asia-statistics hidden></section></div>';
 const root=window.document.querySelector('[data-asia-atlas]'),picker=root.querySelector('[data-city-picker]'),select=picker.querySelector('select');let changed=0;
 select.value='tokyo';select.addEventListener('change',()=>changed++);
 const layout=createAsiaLayout(root);layout.render({field:'natural',topic:'climate',city:'tokyo'});
 assert.equal(root.querySelector('.asia-toolbar [data-city-picker]'),picker);
 assert.equal(root.querySelector('[data-asia-map-items] [data-city-picker]'),null);
 assert.equal(select.value,'tokyo');select.dispatchEvent(new window.Event('change'));assert.equal(changed,1);
 picker.hidden=true;layout.render({field:'agriculture'});assert.equal(picker.parentElement.hidden,true);
 picker.hidden=false;layout.render({field:'natural',topic:'climate',city:'tokyo'});
 assert.equal(picker.parentElement.hidden,false);assert.equal(select.value,'tokyo');window.happyDOM.abort();
});

test('1024pxの未選択気候だけ都市選択を説明欄へ移し、選択後と幅・主題・focusの変更後も同じ選択とイベントを保つ',()=>{
 const window=new Window({width:1440,height:1000});window.document.body.innerHTML='<main data-asia-atlas><div class="asia-toolbar"></div><div data-asia-map-items><label data-city-picker><select data-city-select><option value="tokyo">東京</option></select></label></div><aside class="asia-reading-dock"></aside><section data-asia-statistics hidden></section></main>';
 const root=window.document.querySelector('main'),picker=root.querySelector('[data-city-picker]'),city=picker.querySelector('select'),toolbar=root.querySelector('.asia-toolbar'),dock=root.querySelector('.asia-reading-dock');let changes=0;
 city.addEventListener('change',()=>changes++);const layout=createAsiaLayout(root);
 try{
  layout.render({field:'natural',topic:null,city:null});assert.equal(picker.parentElement.parentElement,toolbar);
  // Happy DOM dispatches resize/MQL changes synchronously. Start outside the
  // query so its initially false change-listener state observes both edges.
  window.happyDOM.setViewport({width:1024,height:768});assert.equal(picker.parentElement.parentElement,dock);assert.equal(city.value,'tokyo');
  city.dispatchEvent(new window.Event('change'));assert.equal(changes,1);
  layout.render({field:'natural',topic:'climate',city:'tokyo'});assert.equal(picker.parentElement.parentElement,toolbar);assert.equal(dock.hidden,true);
  layout.render({field:'natural',topic:'climate',city:null});assert.equal(picker.parentElement.parentElement,dock);assert.equal(dock.hidden,false);
  window.happyDOM.setViewport({width:1440,height:1000});assert.equal(picker.parentElement.parentElement,toolbar);
  window.happyDOM.setViewport({width:1024,height:768});assert.equal(picker.parentElement.parentElement,dock);
  layout.render({field:'natural',topic:'seasonal-precipitation'});assert.equal(picker.parentElement.parentElement,toolbar);
  layout.render({field:'natural',topic:'climate'});assert.equal(picker.parentElement.parentElement,dock);
  const focus=window.document.createElement('nav');focus.className='asia-focus-navigation';root.append(focus);
  layout.render({field:'natural',topic:'climate'});assert.equal(picker.parentElement.parentElement,toolbar);
  assert.equal(root.querySelector('[data-city-select]'),city);assert.equal(city.value,'tokyo');city.dispatchEvent(new window.Event('change'));assert.equal(changes,2);
 }finally{window.happyDOM.abort();}
});

test('社会区分・発電施設の選択欄は元分野を離れると隠れ、主題別のhiddenも保つ',()=>{
 const window=new Window();window.document.body.innerHTML='<div data-asia-atlas><div data-asia-map-items></div><section data-asia-statistics hidden></section><section data-social-panel hidden><label data-social-metric-label>年齢</label><label data-social-area-label hidden>区域</label></section><section data-industry-panel><label data-industry-search-label>発電施設</label></section></div>';
 const root=window.document.querySelector('[data-asia-atlas]'),layout=createAsiaLayout(root);
 const metric=root.querySelector('[data-social-metric-label]'),area=root.querySelector('[data-social-area-label]'),power=root.querySelector('[data-industry-search-label]');
 layout.render({field:'industry'});
 assert.equal(metric.parentElement.hidden,true);assert.equal(area.parentElement.hidden,true);assert.equal(power.parentElement.hidden,false);
 root.querySelector('[data-industry-panel]').hidden=true;root.querySelector('[data-social-panel]').hidden=false;layout.render({field:'population'});
 assert.equal(power.parentElement.hidden,true);assert.equal(metric.parentElement.hidden,false);assert.equal(area.parentElement.hidden,true);assert.equal(metric.hidden,false);
 root.querySelector('[data-social-panel]').hidden=true;layout.render({field:'agriculture'});
 assert.equal(metric.parentElement.hidden,true);assert.equal(power.parentElement.hidden,true);
 window.happyDOM.abort();
});

test('都市の雨温図の直下に気候説明を保ち、月別表・出典も右の同じ都市に保持する',()=>{
 const window=new Window();window.document.body.innerHTML='<div data-asia-atlas><div data-asia-map-legend></div><div data-asia-map-items></div><section data-asia-statistics hidden></section><aside><div data-reading-map-legend>全気候区分・1991–2020</div><article data-city-panel="tokyo"><figure data-city-statistics><svg><title>雨温図</title></svg></figure><section class="city-climate-reading"><h3 data-city-climate-class>Cfa</h3><p class="city-takeaway">夏に雨が多い</p></section><p class="climate-source">1991–2020年</p><details class="monthly-values"><summary>月別表</summary><table><tbody><tr><td>12.3℃</td></tr></tbody></table></details></article></aside></div>';
 const root=window.document.querySelector('[data-asia-atlas]'),layout=createAsiaLayout(root);
 layout.render({field:'natural',city:'tokyo'});
 assert.equal(root.querySelector('[data-asia-map-legend] [data-reading-map-legend]').textContent,'全気候区分・1991–2020');
 assert.equal(root.querySelector('aside [data-city-statistics] svg title').textContent,'雨温図');
 assert.equal(root.querySelector('aside .monthly-values td').textContent,'12.3℃');
 assert.equal(root.querySelector('aside .city-climate-reading [data-city-climate-class]').textContent,'Cfa');
 assert.equal(root.querySelector('aside .city-takeaway').textContent,'夏に雨が多い');
 assert.equal(root.querySelector('[data-city-statistics]').nextElementSibling.className,'city-climate-reading');
 assert.equal(root.querySelector('aside .climate-source').textContent,'1991–2020年');
 assert.equal(root.querySelector('[data-asia-statistics]').hidden,true);
 root.querySelector('[data-city-panel]').hidden=true;layout.render({field:'industry'});
 assert.equal(root.querySelector('[data-asia-statistics]').hidden,true);
 window.happyDOM.abort();
});
test('都市選択は右列先頭の図を表示し、比較リンクを地図下へ移してイベントを維持する',()=>{
 const window=new Window();window.document.body.innerHTML='<main data-asia-atlas><div data-asia-map-items></div><section data-asia-statistics hidden></section><aside><div data-city-reading-host hidden><article data-city-panel="tokyo"><figure data-city-statistics>東京の雨温図</figure><section class="city-farming"><p>地域の出典付き本文</p><button data-compare="agriculture">同じ場所の農業</button></section></article></div><section class="asia-reading-dock"><div data-reading-dock-links><button data-dock-compare="population">人口</button></div><div data-comparison-return hidden><button data-comparison-back>戻る</button></div></section></aside></main>';
 const root=window.document.querySelector('main'),button=root.querySelector('.city-farming button');let clicks=0;button.addEventListener('click',()=>clicks++);
 const layout=createAsiaLayout(root);layout.render({field:'natural',city:'tokyo'});
 assert.equal(root.querySelector('[data-city-reading-host]').hidden,false);assert.equal(root.querySelector('.asia-reading-dock').hidden,true);
 assert.equal(root.querySelector('aside').firstElementChild,root.querySelector('[data-city-reading-host]'));
 assert.equal(root.querySelector('[data-reading-dock-links]').parentElement,root.querySelector('[data-asia-map-items]'));
 assert.equal(root.querySelector('[data-comparison-return]').parentElement,root.querySelector('[data-asia-map-items]'));
 assert.ok(root.querySelector('[data-asia-map-items]').contains(button));button.click();assert.equal(clicks,1);
 assert.match(root.querySelector('.city-farming').textContent,/地域の出典付き本文/);
 layout.render({field:'natural',city:null});assert.equal(root.querySelector('[data-city-reading-host]').hidden,true);assert.equal(root.querySelector('.asia-reading-dock').hidden,false);window.happyDOM.abort();
});

test('気候と民族の操作ボタンは地図直下へ残し、正式名と既存イベントを維持する',()=>{
 const window=new Window();window.document.body.innerHTML='<div data-asia-atlas><div class="asia-map-panel"><div data-asia-map-legend></div><section class="asia-legend" data-climate-legend><details><summary>温帯</summary><button data-climate-class="14"><i></i><b>Cfa</b><span>温暖湿潤気候</span></button></details></section><section class="asia-legend" data-settlement-legend="ethnicity" hidden><button data-settlement-choice="a">集団A</button></section><section class="asia-legend" data-physical-legend>資料の定義</section><div data-asia-map-items></div></div><div data-reading-map-legend>1991–2020年</div><details data-asia-map-method></details><section data-asia-statistics hidden></section></div>';
 const root=window.document.querySelector('[data-asia-atlas]'),climate=root.querySelector('[data-climate-class]'),settlement=root.querySelector('[data-settlement-choice]');let chosen=0;
 climate.addEventListener('click',()=>chosen++);settlement.addEventListener('click',()=>chosen+=10);
 createAsiaLayout(root).render({field:'natural'});
 assert.equal(root.querySelector('[data-asia-map-legend] [data-climate-class]'),climate);
 assert.equal(climate.closest('details'),null,'class selection is always available beside the map');
 assert.match(climate.getAttribute('aria-label'),/Cfa.*温暖湿潤気候/);
 assert.equal(climate.querySelector('span').hidden,true,'only the code is compact; the full name is accessible');
 climate.click();assert.equal(chosen,1);
 assert.equal(root.querySelector('[data-asia-map-items] [data-settlement-choice]'),settlement);
 assert.equal(settlement.closest('details'),null);
 settlement.click();assert.equal(chosen,11);
 assert.equal(root.querySelector('[data-asia-map-method] button'),null,'methods contain no selection buttons');
 window.happyDOM.abort();
});
