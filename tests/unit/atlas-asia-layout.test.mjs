import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createAsiaLayout} from '../../src/scripts/atlas-asia-layout.ts';

test('項目を地図直下へ、既存統計をニュース・地図・説明の全幅下へ移し、選択イベントを保つ',async()=>{
 const window=new Window();
 window.document.body.innerHTML='<div data-asia-atlas><div data-asia-map-items></div><aside><div data-reading-map-legend>年と単位</div><label data-city-picker><select data-city-select><option value="tokyo">東京</option></select></label><details data-reading-details><section data-industry-panel><label data-industry-detail-label><select><option>愛知</option></select></label><div data-industry-content><table><tbody><tr><td>42</td></tr></tbody></table></div></section></details></aside><section data-asia-statistics hidden></section></div>';
 const root=window.document.querySelector('[data-asia-atlas]');
 const content=root.querySelector('[data-industry-content]');
 const city=root.querySelector('[data-city-select]');let selected=0;city.addEventListener('change',()=>selected++);
 const previous=globalThis.MutationObserver;globalThis.MutationObserver=window.MutationObserver;
 try{
  const layout=createAsiaLayout(root);layout.render({field:'industry'});
  assert.equal(root.querySelector('[data-reading-details]').open,true);
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

test('都市の雨温図・月別表だけを全幅下へ移し、選択説明と気候区分は右に保つ',()=>{
 const window=new Window();window.document.body.innerHTML='<div data-asia-atlas><div data-asia-map-legend></div><div data-asia-map-items></div><section data-asia-statistics hidden></section><aside><div data-reading-map-legend>全気候区分・1991–2020</div><article data-city-panel="tokyo"><figure data-city-statistics><svg><title>雨温図</title></svg></figure><section class="city-climate-reading"><h3 data-city-climate-class>Cfa</h3><p class="city-takeaway">夏に雨が多い</p></section><p class="climate-source">1991–2020年</p><details class="monthly-values"><summary>月別表</summary><table><tbody><tr><td>12.3℃</td></tr></tbody></table></details></article></aside></div>';
 const root=window.document.querySelector('[data-asia-atlas]'),layout=createAsiaLayout(root);
 layout.render({field:'natural',city:'tokyo'});
 assert.equal(root.querySelector('[data-asia-map-legend] [data-reading-map-legend]').textContent,'全気候区分・1991–2020');
 assert.equal(root.querySelector('[data-asia-statistics] svg title').textContent,'雨温図');
 assert.equal(root.querySelector('[data-asia-statistics] .monthly-values td').textContent,'12.3℃');
 assert.equal(root.querySelector('aside .city-climate-reading [data-city-climate-class]').textContent,'Cfa');
 assert.equal(root.querySelector('aside .city-takeaway').textContent,'夏に雨が多い');
 assert.equal(root.querySelector('[data-asia-statistics]').hidden,false);
 root.querySelector('[data-city-panel]').hidden=true;layout.render({field:'industry'});
 assert.equal(root.querySelector('[data-asia-statistics]').hidden,true);
 window.happyDOM.abort();
});
