import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { bundleCanadaSource } from '../fixtures/bundle-canada-source.mjs';

const code = await bundleCanadaSource('src/scripts/atlas-canada-agriculture-overview.ts',{globalName:'CensusOverviewUrl'});
const records=JSON.parse(await readFile('src/data/atlas/canada/census-agriculture.json','utf8')).records;
const ids=Object.keys(records),selected=ids.find(id=>records[id].cells.canola.value>0);
const options=ids.map(id=>'<option value="'+id+'">'+records[id].name+'</option>').join('');
async function page(search=''){
  const w=new Window({url:'https://example.com/insight-journal/atlas/north-america/canada/agriculture/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  // The selector uses the same official records as the native map; this fixture isolates view selection.
  w.document.write('<article data-canada-agriculture data-canada-crop="canola"><section data-canola-overview-reading></section><section data-canola-country-map></section><section data-canola-selected-reading hidden></section><section data-canola-selected-map hidden><select data-canada-census-region><option value=""></option>'+options+'</select></section><a href="?item=canola" data-canola-select-item>カノーラ</a><button data-canola-overview-return>全体へ戻る</button><select data-canola-year><option value="2021">2021</option><option value="2025">2025</option></select></article>');
  const root=w.document.querySelector('[data-canada-agriculture]');
  // Native region restoration precedes the overview initializer in the page's real script order.
  root.querySelector('[data-canada-census-region]').value=new URL(w.location.href).searchParams.get('ccs')??'';
  w.eval(code+";CensusOverviewUrl.initCanadaAgricultureOverview(document.querySelector('[data-canada-agriculture]'));");
  return w;
}
function visible(w,active){
  const root=w.document.querySelector('[data-canada-agriculture]');
  assert.equal(root.dataset.canolaReadingMode,active?'selected':'overview');
  for(const hook of ['selected-map','selected-reading'])assert.equal(root.querySelector('[data-canola-'+hook+']').hidden,!active);
  for(const hook of ['country-map','overview-reading'])assert.equal(root.querySelector('[data-canola-'+hook+']').hidden,active);
}
const query='?ccs='+selected+'&ccsOnly=1';

test('Valid CCS-only canola URLs expose the restored selection on initial load and reload',async()=>{
  const first=await page(query);try{
    visible(first,true);assert.equal(first.document.querySelector('[data-canada-census-region]').value,selected);
    assert.equal(new URL(first.location.href).searchParams.get('ccsOnly'),'1');
    assert.equal(new URL(first.location.href).searchParams.has('item'),false,'compatibility does not rewrite the URL');
    const reload=await page(first.location.search);try{visible(reload,true);}finally{await reload.happyDOM.close();}
  }finally{await first.happyDOM.close();}
});

test('Empty, invalid or isolated census flags retain overview and explicit overview has priority',async()=>{
  for(const search of ['', '?ccs=', '?ccs=unknown&ccsOnly=1','?ccsOnly=1','?ccsBounds=-120,40,-110,50',query+'&item=overview']){
    const w=await page(search);try{visible(w,false);}finally{await w.happyDOM.close();}
  }
});

test('Valid CCS compatibility preserves popstate, explicit return and Escape with the restored region',async()=>{
  const w=await page(query);try{
    const root=w.document.querySelector('[data-canada-agriculture]');
    root.querySelector('[data-canola-overview-return]').click();visible(w,false);
    assert.equal(new URL(w.location.href).searchParams.get('ccs'),selected);assert.equal(new URL(w.location.href).searchParams.get('ccsOnly'),'1');
    const reload=await page(w.location.search);try{visible(reload,false);}finally{await reload.happyDOM.close();}
    for(const [search,active] of [[query,true],[query+'&item=overview',false],['?ccs=unknown',false],[query,true]]){
      w.history.replaceState(null,'',search);w.dispatchEvent(new w.PopStateEvent('popstate'));visible(w,active);
    }
    root.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));visible(w,false);
    assert.equal(new URL(w.location.href).searchParams.get('item'),'overview');
    assert.equal(new URL(w.location.href).searchParams.get('ccs'),selected);
  }finally{await w.happyDOM.close();}
});

test('Generated item=canola URLs and existing annual-control entrances keep their selected view',async()=>{
  for(const search of [query+'&item=canola','?year=2025','?item=overview&year=2025']){
    const w=await page(search);try{
      visible(w,!search.includes('item=overview'));
      if(search.includes('item=overview')){
        const year=w.document.querySelector('[data-canola-year]');year.value='2021';year.dispatchEvent(new w.Event('change',{bubbles:true}));
        visible(w,true);assert.equal(new URL(w.location.href).searchParams.get('item'),'canola');
      }
    }finally{await w.happyDOM.close();}
  }
});
