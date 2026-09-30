import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const regions=['north-america','europe','latin-america','west-asia','africa','oceania','asia/east-asia','asia/southeast-asia','asia/south-central-asia','asia/south-asia','asia/central-asia'];
const controller=(await transform((await readFile('src/scripts/atlas-country-overview.ts','utf8'))+'\ninitCountryOverview(document.querySelector("[data-country-overview]"));',{loader:'ts',format:'iife'})).code;
async function page(region,search='',interactive=false){
  const w=new Window({url:`https://example.com/insight-journal/atlas/${region}/overview/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive}});
  w.document.body.innerHTML=(await readFile(`dist/atlas/${region}/overview/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
  if(interactive)w.eval(controller);
  return w;
}
test('11地域の概要は国一覧・5テーマ・準備中の本文を備え、存在するページへつながる',async()=>{
  const sitemap=await readFile('dist/sitemap.xml','utf8');
  for(const region of regions){
    const w=await page(region),d=w.document;
    try{
      const options=[...d.querySelectorAll('[data-overview-country] option')];
      assert.ok(options.length>0,region);
      assert.equal(new Set(options.map(o=>o.value)).size,options.length);
      assert.ok(options.every(o=>o.textContent.trim()&&!o.textContent.includes('undefined')));
      assert.deepEqual([...d.querySelectorAll('[role=tab]')].map(t=>t.textContent),['農林業','自然環境','主要産業','人口','政治']);
      assert.equal(d.querySelectorAll('[role=tabpanel]:not([hidden])').length,1);
      assert.match(d.querySelector('h1').textContent,/の概要/);
      assert.match(d.querySelector('.country-overview-status').textContent,/準備中/);
      assert.equal(d.querySelectorAll('[data-news-location]').length,0,'概要には操作対象の地図がない');
      assert.ok(sitemap.includes(`/atlas/${region}/overview/`));
      for(const a of d.querySelectorAll('.country-overview-fields a,.country-overview-regions a')){
        const url=new URL(a.href);await access(`dist/${url.pathname.replace('/insight-journal/','')}index.html`);
      }
      for(const tab of d.querySelectorAll('[role=tab]')) assert.equal(d.getElementById(tab.getAttribute('aria-controls')).getAttribute('aria-labelledby'),tab.id);
    }finally{await w.happyDOM.close();}
  }
});
test('国とテーマの直接指定・変更・キーボード操作・履歴が同じ内容を示す',async()=>{
  const w=await page('europe','?country=FRA&topic=politics',true),d=w.document;
  const picker=d.querySelector('[data-overview-country]');
  const selected=()=>d.querySelector('[role=tab][aria-selected=true]');
  try{
    assert.equal(picker.value,'FRA');assert.match(d.querySelector('h1').textContent,/フランス/);
    assert.equal(selected().dataset.overviewTopic,'politics');
    picker.value='DEU';picker.dispatchEvent(new w.Event('change'));
    assert.equal(selected().dataset.overviewTopic,'politics');assert.equal(new URL(w.location.href).searchParams.get('country'),'DEU');
    selected().dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
    assert.equal(selected().dataset.overviewTopic,'agriculture');assert.equal(d.activeElement,selected());
    selected().dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    assert.equal(selected().dataset.overviewTopic,'politics');assert.equal(d.querySelectorAll('[role=tabpanel]:not([hidden])').length,1);
    w.history.replaceState({},'','?country=GBR&topic=population');w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(picker.value,'GBR');assert.equal(selected().dataset.overviewTopic,'population');
    assert.match(d.querySelector('[role=tabpanel]:not([hidden]) .country-overview-introduction h2').textContent,/イギリスの人口/);
  }finally{await w.happyDOM.close();}
});
test('対象外の国やテーマは初期値に戻り、南アジアと中央アジアの選択肢を混ぜない',async()=>{
  for(const [region,country] of [['europe','GBR'],['asia/south-asia','IND'],['asia/central-asia','KAZ']]){
    const w=await page(region,'?country=XXX&topic=unknown',true),d=w.document;
    try{
      assert.equal(d.querySelector('[data-overview-country]').value,country);
      assert.equal(d.querySelector('[role=tab][aria-selected=true]').dataset.overviewTopic,'agriculture');
      if(region==='asia/south-asia')assert.equal(d.querySelector('option[value=KAZ]'),null);
      if(region==='asia/central-asia')assert.equal(d.querySelector('option[value=IND]'),null);
    }finally{await w.happyDOM.close();}
  }
});
