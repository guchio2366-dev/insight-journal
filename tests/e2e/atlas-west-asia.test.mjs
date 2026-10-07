import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('西アジアの全4分野は共通枠・一つの地図・20の選択肢・出典を持つ',async()=>{
 for(const [route,field] of [['nature','natural'],['agriculture','agriculture'],['industry','industry'],['population','population']]){
  const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
  try{
   w.document.write(await readFile(`dist/atlas/west-asia/${route}/index.html`,'utf8'));const q=s=>w.document.querySelector(s),all=s=>[...w.document.querySelectorAll(s)];
   assert.equal(q('[data-west-atlas]').dataset.field,field);assert.equal(all('[data-map-surface]').length,1);
   assert.ok(q('[data-map-surface]').closest('[data-atlas-shell]'));assert.equal(q('[data-news-rail]').dataset.newsRegion,'west-asia');
   assert.deepEqual(all('.atlas-tabs a[data-west-field]').map(a=>a.textContent),['農林業','自然環境','主要産業','人口']);
   const overview=q('.atlas-tabs > a:first-child');
   assert.equal(overview.textContent,'概要');
   assert.equal(overview.getAttribute('href'),'/insight-journal/atlas/west-asia/overview/');
   assert.ok(overview.hasAttribute('data-atlas-overview-link'));
   assert.equal(overview.hasAttribute('data-west-field'),false,'概要は地図主題ではなく独立ページへ移動する');
   assert.equal(q('.atlas-tabs [aria-current]').getAttribute('href'),`/insight-journal/atlas/west-asia/${route}/`);
   assert.equal(all('[data-west-country] option').length,21);assert.equal(all('[data-west-chart]').length,18);
   assert.equal(q('[data-west-topic]'),null,'全項目のプルダウンを上部に重ねない');
   assert.equal(q('.west-heading'),null,'独自の大見出しで地図を押し下げない');
   assert.ok(q('.atlas-primary-grid>.atlas-national'),'解説は北米と同じ隣接パネル');
   assert.ok(q('.atlas-map-column .west-legend'));assert.ok(q('.atlas-map-column .west-map-lists'));
   const expected={natural:['気候区分','水資源','地形','標高（等高線）'],agriculture:['農畜産','林業'],industry:['地域主要産業'],population:['人口分布','人種・民族','宗教']};
   const groups=field==='industry'?all('.industry-tab-row [data-west-topic-button]'):all('[role=tablist] [data-west-standard-group]');
   if(field==='industry')assert.deepEqual(groups.map(b=>b.dataset.westTopicButton),['oil','gas','manufacturing','industrial-total','ports','services']);else assert.deepEqual(groups.map(b=>b.dataset.westStandardGroup),expected[field]);
   const active=groups.filter(b=>b.getAttribute('aria-selected')==='true');assert.equal(active.length,1);assert.equal(active[0].getAttribute('tabindex'),'0');
   for(const b of groups.filter(b=>b!==active[0])){assert.equal(b.getAttribute('aria-selected'),'false');assert.equal(b.getAttribute('tabindex'),'-1');}
   if(field==='agriculture')assert.ok(q('.atlas-map-column .atlas-key [data-west-topic-button]'));
   if(field==='industry'){assert.ok(q('.industry-controls .industry-tab-row [data-west-topic-button="manufacturing"]'));assert.equal(q('.atlas-map-column [data-west-topic-button]'),null);}
   if(field==='population')assert.ok(q('.atlas-map-column .west-additional-topics [data-west-topic-button="age-older"]'));
   if(field==='natural'){
    const waterTopics=all('[data-west-subgroup="水資源"] button');
    assert.deepEqual(waterTopics.map(b=>b.textContent),['河川・地下水','年降水量の分布','河川の流域']);
    assert.deepEqual(waterTopics.map(b=>b.dataset.westTopicButton),['rivers','annual-precipitation','basins']);
    assert.ok(waterTopics.every(b=>!b.disabled),'水資源では年降水量と河川を選び、観測所の月別値は雨温図に残る');
    assert.equal(q('[data-west-unavailable="降水量"]'),null);
   }
   assert.equal(all('.west-static-data tbody tr').length,20);assert.ok(q('[data-west-retry]'));
   assert.match(q('#west-sources').textContent,/欠測は0に置き換えず/);
   assert.match(q('#west-sources').textContent,/実効支配や領有権の確定を示しません/);
  }finally{await w.happyDOM.abort();w.close();}
 }
});

test('北米と西アジアの雨温図は同じ軸・凡例・描画を使用する',async()=>{
 const {readFile:read}=await import('node:fs/promises');
 const d=JSON.parse(await read('src/data/atlas/west-asia.json','utf8'));
 for(const city of d.cities){
  assert.ok(city.temperatureC.every(v=>v===null||(v>=-10&&v<=40)));assert.ok(city.precipitationMm.every(v=>v===null||(v>=0&&v<=350)));
 }
 for(const path of ['dist/atlas/north-america/nature/index.html','dist/atlas/west-asia/nature/index.html']){
  const html=await read(path,'utf8');assert.match(html,/viewBox="0 0 320 198"/);assert.match(html,/class="atlas-climate-bar"/);assert.match(html,/棒：降水量 mm/);assert.match(html,/線：気温 ℃/);
 }
});
