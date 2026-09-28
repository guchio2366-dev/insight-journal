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
   assert.deepEqual(all('.atlas-tabs a').map(a=>a.textContent),['農林業','自然環境','主要産業','人口']);
   assert.equal(q('.atlas-tabs [aria-current]').getAttribute('href'),`/insight-journal/atlas/west-asia/${route}/`);
   assert.equal(all('[data-west-country] option').length,21);assert.equal(all('[data-west-chart]').length,18);
   assert.equal(all('.west-static-data tbody tr').length,20);assert.ok(q('[data-west-retry]'));
   assert.match(q('#west-sources').textContent,/欠測は0に置き換えず/);
   assert.match(q('#west-sources').textContent,/実効支配や領有権の確定を示しません/);
  }finally{await w.happyDOM.abort();w.close();}
 }
});
