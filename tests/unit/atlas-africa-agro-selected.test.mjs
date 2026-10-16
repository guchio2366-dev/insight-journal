import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import marketing from '../../src/data/atlas/africa-agro-marketing-year.json' with {type:'json'};
import regional from '../../src/data/atlas/africa-regional-statistics.json' with {type:'json'};
import trade from '../../src/data/atlas/africa-maize-trade-reference.json' with {type:'json'};
import {readState} from '../../src/data/atlas/africa-atlas.ts';
const compiled=await build({entryPoints:['src/scripts/atlas-africa-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const state=query=>readState('?field=agriculture&overview=0&'+query);
const rootPath=new URL('../../',import.meta.url);
const expected={EGY:[7,10.56,0],ZAF:[17.35,.11,2.05],NGA:[.13,6.23,.38]};

test('three Africa national rows match the hashed historical table, independent World, stocks and domestic-use columns',()=>{
 const source=readFileSync(new URL('scripts/data/wasde0926.txt',rootPath)),text=source.toString();
 assert.equal(marketing.records.length,3);
 for(const row of marketing.records){
  assert.equal(createHash('sha256').update(source).digest('hex'),row.source.sha256);
  const body=text.split(`WASDE - 675 - ${row.source.page}`)[1].split(/WASDE - 675 - \d+/)[0].split('2024/25')[1].split('2025/26')[0];
  assert(body.includes(row.rawLine));assert(body.includes(row.worldRawLine));
  assert.equal(row.periodType,'publisher-marketing-year');assert.equal(row.periodStart,null);assert.equal(row.periodEnd,null);assert.equal(row.year,'2024/25');assert.equal(row.unit,'百万t');
  const exp=expected[row.countryCode];assert.equal(row.production,exp[0]);assert.equal(row.exports,exp[2]);
  assert.equal(row.imports,exp[1]);
  assert.equal(row.worldProduction,row.seriesId==='wheat-production'?799.10:1235.03);
  for(const [key,value]of Object.entries(row.rawValues))assert.equal(row[key],Number(value));
  const gap=(['production','imports','beginningStocks'].reduce((sum,key)=>sum+Math.round(row[key]*100),0)-['domesticUse','exports','endingStocks'].reduce((sum,key)=>sum+Math.round(row[key]*100),0))/100;assert.equal(gap,row.roundingGap);
  assert(row.domesticFeed<=row.domesticUse);assert.notEqual(row.domesticUse,row.production-row.exports);
  assert.equal(row.exportDestinations,null);assert(row.notes.some(note=>note.includes('域内向け')));
 }
 const output=readFileSync(new URL('src/data/atlas/africa-agro-marketing-year.json',rootPath),'utf8');execFileSync('python',['scripts/prepare-africa-agro-statistics.py']);assert.equal(readFileSync(new URL('src/data/atlas/africa-agro-marketing-year.json',rootPath),'utf8'),output);
 const check=execFileSync('python',['-c',`import runpy\nm=runpy.run_path('scripts/prepare-africa-agro-statistics.py')\ntry: m['extract'](b'wrong revision')\nexcept ValueError: print('rejected')`],{encoding:'utf8'});assert.equal(check.trim(),'rejected');
});

test('WITS whole-export quantity remains missing; all 84 table rows and their hash are retained without invented shares',()=>{
 const csv=readFileSync(new URL(trade.file,rootPath));assert.equal(createHash('sha256').update(csv).digest('hex'),trade.sha256);
 const rows=JSON.parse(execFileSync('python',['-c',`import csv,json;print(json.dumps(list(csv.DictReader(open('${trade.file}')))))`],{encoding:'utf8'}));
 assert.equal(rows.length,84);assert.equal(rows.find(row=>row.partner==='World').quantity,'');assert.equal(trade.worldQuantity,null);
 for(const name of ['Saint Helena','Portugal','Bunkers'])assert.equal(rows.find(row=>row.partner===name).quantity,'');
 assert.equal(rows.find(row=>row.partner==='Special Categories').quantity,'818835');
 const sorted=rows.filter(row=>row.quantity&&row.partner!=='World').sort((a,b)=>Number(b.quantity)-Number(a.quantity));
 assert.deepEqual(trade.topQuantityRows,sorted.slice(0,5).map(({partner,quantity,unit})=>({partner,quantity,unit})));
 assert.deepEqual(trade.topQuantityRows.map(row=>row.partner),['Zimbabwe','Botswana','Namibia','Mozambique','Eswatini']);
});

async function dom(run){const window=new Window(),previous=globalThis.document;globalThis.document=window.document;try{await run(window);}finally{globalThis.document=previous;await window.happyDOM.close();}}
function parse(window,html){const root=window.document.createElement('main');root.innerHTML=html;return root;}

test('regional product statistics use publisher regional/World pairs and keep missing rows out of donuts',()=>dom(window=>{
 for(const region of Object.keys(regional.regions))for(const crop of ['maize','rice','wheat','cassava','coffee','tea']){
  const root=parse(window,api.renderAfricaRegionalStatistics(state(`crop=${crop}&region=${region}`))),row=regional.regions[region].find(row=>row.id===crop);
  assert.equal(root.querySelectorAll('.agro-columns>section').length,3);
  assert.deepEqual([...root.querySelectorAll('[data-agro-stage]')].map(node=>node.dataset.agroStage),['production','use','destinations']);
  if(row.share===null)assert.equal(root.querySelector('.agro-world-pie'),null);
  else {assert.match(root.querySelector('.agro-world-pie').getAttribute('aria-label'),new RegExp((Number(row.regional.rawValue)/Number(row.world.rawValue)*100).toLocaleString('ja-JP',{maximumFractionDigits:2})+'%'));assert(root.textContent.includes(row.regional.rawValue));}
  assert.match(root.querySelector('[data-agro-stage="use"]').textContent,/生産−輸出を消費とせず/);assert.equal(root.querySelector('[data-agro-stage="destinations"] .agro-partner-pie'),null);
 }
 const cattle=state('topic=livestock&livestock=cattle&region=east'),milk=parse(window,api.renderAfricaRegionalStatistics(cattle,'cattle-milk'));
 assert.equal(milk.querySelector('[data-africa-stat-series]').value,'cattle-milk');assert.match(milk.querySelector('h2').textContent,/生乳/);
}));

test('national flow separates domestic feed, imports and stocks; calendar WITS reference cannot become the WASDE partner donut',()=>dom(window=>{
 for(const query of ['crop=maize&place=ZAF','crop=maize&place=EGY','crop=wheat&place=NGA']){
  const root=parse(window,api.renderAfricaMarketingStatistics(state(query)));
  assert.equal(root.querySelectorAll('.agro-columns>section').length,3);assert.equal(root.querySelectorAll('[data-agro-stage="use"] .agro-band').length,2);
  assert.match(root.textContent,/国内利用の内数：飼料/);assert.match(root.textContent,/国内利用は生産−輸出ではない/);
  const destinations=root.querySelector('[data-agro-stage="destinations"]');assert.equal(destinations.querySelector('.agro-partner-pie'),null);assert.match(destinations.textContent,/同じ販売年度・商品範囲.*未収録/);
 }
 const south=parse(window,api.renderAfricaMarketingStatistics(state('crop=maize&place=ZAF'))),reference=south.querySelector('[data-africa-trade-reference]');assert.equal(reference.open,false);assert.match(reference.textContent,/World輸出数量が空欄/);assert.match(reference.textContent,/アフリカ域内/);assert.match(reference.textContent,/1,521,100/);
 const nigeria=parse(window,api.renderAfricaMarketingStatistics(state('crop=wheat&place=NGA')));assert.match(nigeria.textContent,/292.31%/);assert.match(nigeria.textContent,/国産分.*追跡した比率ではありません/);
 const egypt=parse(window,api.renderAfricaMarketingStatistics(state('crop=maize&place=EGY')));assert.match(egypt.querySelector('[data-agro-stage="use"]').textContent,/輸出量 0 百万t/);
}));

test('forestry gaps distinguish roundwood, sawnwood and wood-pulp product units without converting forest area',()=>dom(window=>{
 const root=parse(window,api.renderAfricaRegionalStatistics(state('topic=forestry&metric=AG.LND.FRST.ZS')));
 for(const expected of ['丸太（燃料材を含む） · m³','製材 · m³','木材パルプ · t','体積から重量への換算や歩留まりを推定しない'])assert(root.textContent.includes(expected));
 assert.equal(root.querySelector('.agro-world-pie'),null);assert.equal(root.querySelector('.agro-track'),null);
}));

test('custom statistics preserve the unselected overview, clear on field/country changes and retain selected product/details during unchanged renders',()=>dom(window=>{
 const root=window.document.createElement('main');root.innerHTML='<section data-africa-selected-agro hidden></section>';window.document.body.append(root);const host=root.firstElementChild;
 api.syncAfricaAgroStatistics(root,state('crop=coffee'));assert.equal(host.hidden,false);assert.match(host.querySelector('h2').textContent,/コーヒー/);
 host.querySelector('details').open=true;const previous=host.firstElementChild;api.syncAfricaAgroStatistics(root,state('crop=coffee'));assert.equal(host.firstElementChild,previous);assert.equal(host.querySelector('details').open,true);
 const cattle=state('topic=livestock&livestock=cattle');api.syncAfricaAgroStatistics(root,cattle);const picker=host.querySelector('select');picker.focus();picker.value='cattle-milk';picker.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(host.querySelector('select').value,'cattle-milk');assert.equal(window.document.activeElement,host.querySelector('select'));api.syncAfricaAgroStatistics(root,cattle);assert.match(host.querySelector('h2').textContent,/生乳/);
 for(const input of [readState('?field=agriculture'),state('crop=coffee&place=KEN'),readState('?field=nature'),readState('?field=industry')]){api.syncAfricaAgroStatistics(root,input);assert.equal(host.hidden,true);assert.equal(host.childElementCount,0);}
 api.syncAfricaAgroStatistics(root,state('crop=maize&place=ZAF'));assert.match(host.querySelector('h2').textContent,/南アフリカ/);api.syncAfricaAgroStatistics(root,state('crop=maize&place=EGY'));assert.match(host.querySelector('h2').textContent,/エジプト/);assert.equal(host.querySelector('[data-africa-trade-reference]'),null);
 api.syncAfricaAgroStatistics(root,state('crop=coffee'));assert.match(host.querySelector('h2').textContent,/コーヒー/);
 assert.equal(api.africaAgroMode(readState('?field=agriculture')),null);assert.equal(api.africaAgroMode(state('crop=coffee&place=KEN')),'national');
}));

test('Egypt remains a national forestry observation; the Africa override cannot sum it into a regional supply',()=>{
 const data=JSON.parse(readFileSync(new URL('public/assets/atlas/regional-production-statistics-v1/statistics.json',rootPath),'utf8'));
 const forest=state('metric=AG.LND.FRST.ZS&topic=forestry&place=EGY');assert.equal(api.africaAgroMode(forest),'national');
 for(const id of ['roundwood','sawnwood'])for(const [suffix,element]of [['production','5516'],['imports','5616'],['exports','5916']]){
  const series=data.countries.EGY.series.find(row=>row.id===id+'-'+suffix),row=series?.rows.find(row=>row.year===2024);assert(series&&row);assert.equal(series.domain,'FO');assert.equal(series.unit,'m3');assert.equal(series.element,element);assert(row.value>=0);assert.equal(suffix==='production',row.worldValue!==null);
 }
 assert.equal(data.countries.EGY.series.find(row=>row.id==='wood-pulp-production'),undefined);
});

test('both supply-use bands keep one supply denominator and leave Nigeria rounding outside the stack',()=>dom(window=>{
 const row=marketing.records.find(row=>row.countryCode==='NGA'),root=parse(window,api.renderAfricaMarketingStatistics(state('crop=wheat&place=NGA'))),bands=[...root.querySelectorAll('[data-agro-stage="use"] .agro-band')];
 assert.equal(bands.length,2);for(const band of bands)assert.equal(Number(band.dataset.africaSupplyDenominator),6.81);
 const useTrack=bands[1].querySelector('.agro-track'),segments=[...useTrack.querySelectorAll('span')],widths=segments.map(segment=>Number.parseFloat(segment.style.width));
 assert.equal(segments.length,3,'feed and rounding cannot become extra stacked uses');
 for(const [index,value]of [row.domesticUse,row.exports,row.endingStocks].entries())assert(Math.abs(widths[index]-value/6.81*100)<1e-10);
 assert(widths.reduce((sum,value)=>sum+value,0)<100,'the shortfall is not renormalized away');assert.equal(Number.parseFloat(useTrack.querySelector('.africa-supply-limit').style.left),100);
 assert.match(useTrack.getAttribute('aria-label'),/総供給 6.81 百万t を100%/);assert.match(root.textContent,/公表丸め差 \+0.01 百万tは帯の用途へ加算せず/);
}));
