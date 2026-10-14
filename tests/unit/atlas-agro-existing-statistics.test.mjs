import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const built=await build({entryPoints:['src/scripts/atlas-agro-existing-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {renderAgroExistingStatistics}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
async function fixture(marker,country,series){
 const window=new Window();globalThis.document=window.document;
 document.body.innerHTML=marker+'<div id="content"><div data-agro-existing-supply></div><div data-agro-existing-trade></div></div>';
 const content=document.getElementById('content');await renderAgroExistingStatistics(content,country,series);return {window,content,trade:content.querySelector('[data-agro-existing-trade]'),supply:content.querySelector('[data-agro-existing-supply]')};
}
test('East country partner charts retain 2023 money and external-partner coverage, not 2024 FAO tonnes',async()=>{
 const f=await fixture('<section data-east-farm-foundations></section>','CHN','rice-production');
 assert.equal(f.trade.querySelectorAll('[data-east-trade-flow]').length,2);assert.ok(f.trade.querySelectorAll('.east-pie').length>0);
 assert.match(f.trade.textContent,/2023暦年.*名目米ドル/s);assert.match(f.trade.textContent,/香港・マカオを含む東アジア内の相手を除外/);
 const g=await fixture('<section data-east-farm-foundations></section>','CHN','roundwood-production');assert.match(g.trade.textContent,/HS440320だけ/);assert.match(g.trade.textContent,/丸太総量の相手構成ではありません/);
});
test('Europe money chart remains a separate regional reference and national forestry keeps source-specific uses',async()=>{
 const f=await fixture('<section data-eu-verified-agriculture></section>','FRA','wheat-production');assert.equal(f.trade.querySelectorAll('.agro-partner-pie').length,1);assert.match(f.trade.textContent,/2021年.*current USD/s);assert.match(f.trade.textContent,/選択国全国の相手構成ではありません/);assert.match(f.trade.textContent,/35/);
 const g=await fixture('<section data-eu-verified-agriculture></section>','FIN','roundwood-production');assert.ok(g.supply.querySelectorAll('.agro-band').length>=4);assert.match(g.supply.textContent,/62,655.*樹皮あり/s);assert.match(g.supply.textContent,/副産物8,727千m³は別掲/);assert.match(g.supply.textContent,/在庫・在庫増減：未収録/);
});
test('India rice uses basmati-only partner denominator and never supplies another country with that reference',async()=>{
 const f=await fixture('<section data-south-central-farm-connections></section>','IND','rice-production');assert.equal(f.trade.querySelectorAll('.sc-flow-pie').length,1);assert.match(f.trade.textContent,/5,242,182t/);assert.match(f.supply.textContent,/国内用途・在庫の帯とは呼びません/);
 const g=await fixture('<section data-south-central-farm-connections></section>','PAK','rice-production');assert.equal(g.trade.children.length,0);
});
test('West reference targets only the matching, available regional product and labels its scope',async()=>{
 const f=await fixture('<section data-west-farm-supply><section data-west-wheat-trade>2023 CPC0111</section></section>','TUR','wheat-production');assert.equal(f.trade.querySelector('a')?.getAttribute('href'),'#agro-reference-west-wheat');assert.match(f.trade.textContent,/選択国全国の相手構成とは別範囲/);
 const g=await fixture('<section data-west-farm-supply><section data-west-wheat-trade></section></section>','TUR','rice-production');assert.equal(g.trade.children.length,0);
});
