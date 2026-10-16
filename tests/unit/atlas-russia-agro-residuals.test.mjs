import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const supply=json('src/data/atlas/russia-wheat-supply-2020-21.json');
const evidence=json(supply.source.evidencePath);
const reference=await build({entryPoints:['src/data/atlas/russia-agro-reference.ts'],bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(reference.outputFiles[0].text).toString('base64'));
const controller=await build({entryPoints:['src/scripts/atlas-russia-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
after(()=>stop());

test('the dated USDA column preserves its import, stocks, uses and period without a fabricated residual',()=>{
 const pairs={beginningStocks:'Beginning Stocks',production:'Production',imports:'MY Imports',totalSupply:'Total Supply',exports:'MY Exports',feedAndResidual:'Feed and Residual',foodSeedIndustrial:'FSI Consumption',domesticUse:'Total Consumption',endingStocks:'Ending Stocks',totalDistribution:'Total Distribution'};
 for(const [key,row]of Object.entries(pairs))assert.equal(supply[key],Number(evidence.rows[row]));
 assert.equal(supply.production+supply.imports+supply.beginningStocks,supply.totalSupply);
 assert.equal(supply.foodSeedIndustrial+supply.feedAndResidual,supply.domesticUse);
 assert.equal(supply.domesticUse+supply.exports+supply.endingStocks,supply.totalDistribution);
 assert.equal(supply.totalDistribution,supply.totalSupply);
 assert.equal(supply.source.publishedAt,'2021-05-12');assert.equal(supply.source.page,6);
 assert.equal(supply.column,evidence.column);assert.equal(supply.unit,'1000 t');
 assert.equal(supply.periodStart,'2020-07-01');assert.equal(supply.periodEnd,'2021-06-30');
 for(const key of ['exportDestinations','domesticOriginUse','reExports'])assert.equal(supply[key],null);
});

test('the reference shows two equal-denominator bands and keeps the source-time estimate distinct from QCL',async()=>{
 const window=new Window(),node=window.document.createElement('div');node.innerHTML=api.renderRussiaWheatSupplyReference();
 const figures=[...node.querySelectorAll('.agro-band')];assert.equal(figures.length,2);
 for(const figure of figures){assert.match(figure.querySelector('figcaption').textContent,/93,082 千t/);const widths=[...figure.querySelectorAll('.agro-track>span')].map(n=>parseFloat(n.style.width));assert(Math.abs(widths.reduce((a,b)=>a+b,0)-100)<1e-9);}
 assert.match(node.textContent,/国内利用（原表公表量）：41,500 千t/);
 assert.match(node.textContent,/当年.*国産|国産収穫物/);assert.match(node.textContent,/飼料・残差/);
 assert.match(node.textContent,/現在の確定実績.*意味ではありません/);
 assert.match(node.textContent,/学習地域間の流通は輸出へ加算しません/);
 assert.equal(node.querySelectorAll('.agro-partner-pie,.agro-world-pie').length,0);
 await window.happyDOM.close();
});

let id=0;
async function harness(run){
 const window=new Window({url:'https://example.test/atlas/russia/agriculture/?layer=wheat&keep=source#reference'});
 const keys=['document','location','history','MutationObserver','fetch'],old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 for(const key of keys.slice(0,-1))globalThis[key]=window[key];
 const root=window.document.createElement('main');window.document.body.append(root);
 root.innerHTML='<div data-primary-map><svg><text>既存地図</text></svg></div><section class="russia-farming-trade-grid">旧小麦資料</section><section class="russia-farming-candidates">旧候補資料</section><div data-russia-agro-year-control hidden><select data-russia-agro-year>'+[2024,2023,2022,2021,2020].map(y=>`<option>${y}</option>`).join('')+'</select></div><section data-agro-statistics><script data-agro-config type="application/json"></script><h2 data-agro-heading></h2><p data-agro-status></p><label data-agro-series-control><select data-agro-series-select></select></label><button data-agro-retry hidden></button><div data-agro-content></div></section><section data-russia-forestry-statistics>旧森林資料</section>';
 root.querySelector('[data-agro-config]').textContent=JSON.stringify({scope:'ロシア',country:'RUS',topic:'wheat',topics:[],countries:[{code:'RUS',name:'ロシア'}],nationalOnly:true,url:'/fixture/',files:Object.fromEntries(['wheat-production','cattle-meat','cattle-milk'].map(id=>[id,{file:id+'.json'}])),labels:{}});
 const requests=[];
 globalThis.fetch=async url=>{requests.push(String(url));const name=String(url).split('/').at(-1).replace('.json','');return new Response(gunzipSync(readFileSync(`public/assets/atlas/regional-production-statistics-v1/by-series/${name}.json.gz`)));};
 const module=await import('data:text/javascript;base64,'+Buffer.from(controller.outputFiles[0].text+'\n//'+(++id)).toString('base64'));
 const settle=async predicate=>{for(let n=0;n<150;n++){if(predicate())return;await new Promise(r=>setImmediate(r));}assert.fail('Russia statistics did not settle');};
 const ready=()=>root.querySelector('[data-agro-statistics]').dataset.agroReady==='true';
 try{await run({window,root,requests,select:root.querySelector('[data-russia-agro-year]'),sync:s=>module.syncRussiaAgroStatistics(root,s),settle,ready});}
 finally{for(const key of keys)if(old[key]===undefined)delete globalThis[key];else globalThis[key]=old[key];await window.happyDOM.close();}
}

test('explicit year choice reveals official wheat while 2024 keeps its non-A gap and selection URL',async()=>harness(async({window,root,requests,select,sync,settle,ready})=>{
 const map=root.querySelector('[data-primary-map]').outerHTML;
 sync({topic:'wheat',active:true});await settle(ready);
 const production=()=>root.querySelector('[data-agro-stage="production"]');
 assert.match(production().textContent,/2024暦年/);assert.equal(production().querySelector('.agro-world-pie'),null);
 assert.equal(root.querySelector('[data-russia-agro-year-control]').hidden,false);
 select.value='2022';select.dispatchEvent(new window.Event('change'));await settle(()=>ready()&&production().textContent.includes('2022暦年'));
 assert.match(production().textContent,/104,233,944/);assert.ok(production().querySelector('.agro-world-pie'));
 assert.equal(new URL(window.location.href).searchParams.get('layer'),'wheat');assert.equal(new URL(window.location.href).searchParams.get('keep'),'source');assert.equal(window.location.hash,'#reference');
 assert.equal(new URL(window.location.href).searchParams.get('russiaStatsYear'),'2022');
 assert.equal(root.querySelector('[data-primary-map]').outerHTML,map);
 assert.equal(requests.length,1,'year choice reuses the same retained product slice');
 select.value='2024';select.dispatchEvent(new window.Event('change'));await settle(()=>ready()&&production().textContent.includes('2024暦年'));
 assert.equal(production().querySelector('.agro-world-pie'),null);assert.equal(new URL(window.location.href).searchParams.has('russiaStatsYear'),false);
}));

test('source references follow wheat only, stay closed, and restore the original unselected nodes',async()=>harness(async({window,root,sync,settle,ready})=>{
 const selectors=['.russia-farming-trade-grid','.russia-farming-candidates','[data-russia-forestry-statistics]'];
 const nodes=selectors.map(s=>root.querySelector(s));const order=[...root.children];
 sync({topic:'wheat',active:true});await settle(()=>ready()&&root.querySelector('[data-agro-existing-supply] [data-russia-wheat-supply]'));
 const use=root.querySelector('[data-agro-stage="use"]');assert.match(use.textContent,/2020\/21販売年度/);assert.equal(use.querySelector('details').open,false);
 assert.equal(root.querySelectorAll('[data-russia-wheat-supply]').length,1);
 sync({topic:'cattle',active:true});await settle(()=>ready()&&root.querySelector('[data-agro-series="cattle-meat"]'));
 assert.equal(root.querySelectorAll('[data-russia-wheat-supply]').length,0,'wheat does not appear as cattle supply');
 assert.equal(root.querySelectorAll('[data-russia-agro-reference]').length,3);
 for(const n of nodes)assert.equal(n.parentElement.open,false);
 sync({topic:'farming-all',active:true});await settle(()=>ready()&&root.querySelector('[data-agro-series="wheat-production"]'));
 assert.equal(root.querySelector('[data-russia-agro-year-control]').hidden,true);
 assert.equal(root.querySelectorAll('[data-russia-agro-reference]').length,0);
 assert.deepEqual([...root.children],order);nodes.forEach((n,i)=>assert.equal(root.querySelector(selectors[i]),n));
 assert.equal(root.querySelector('[data-russia-wheat-supply]'),null,'unselected presentation is restored');
}));

test('history restoration and invalid years never replace missing 2024 or trigger a map change',async()=>harness(async({window,root,sync,settle,ready})=>{
 window.history.replaceState({},'','?layer=wheat&russiaStatsYear=2021');sync({topic:'wheat',active:true});await settle(()=>ready()&&root.querySelector('[data-agro-stage="production"]').textContent.includes('2021暦年'));
 window.history.replaceState({},'','?layer=wheat&russiaStatsYear=1900');sync({topic:'wheat',active:true});await settle(()=>ready()&&root.querySelector('[data-agro-stage="production"]').textContent.includes('2024暦年'));
 assert.equal(root.querySelector('[data-agro-stage="production"] .agro-world-pie'),null);
 sync({topic:'wheat',active:false});assert.equal(root.querySelector('[data-agro-statistics]').hidden,true);assert.equal(root.querySelector('[data-russia-agro-year-control]').hidden,true);
}));

test('forest definitions preserve product stages, bark basis, pulp moisture and missing national trade',()=>{
 const source=readFileSync('src/components/atlas/RussiaForestryStatistics.astro','utf8');
 for(const pattern of [/樹皮を除く実材積/,/厚さ6mm超/,/含水率10%の風乾重量t/,/再輸出/,/全相手数量は引き続き未収録/])assert.match(source,pattern);
 const data=json('src/data/atlas/russia-forestry-statistics.json');
 assert.deepEqual(data.measures.map(m=>m.id),['forest-area','roundwood-production','sawnwood-production']);
 assert.equal(data.observations.length,30,'the original production/area series is preserved');
});
