import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const output=await build({entryPoints:['src/data/atlas/agro-existing-europe-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {existingEuropeForestryReferences}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const source=JSON.parse(readFileSync('src/data/atlas/europe/europe_wood_key_comparisons_2024.json'));
const codes={DEU:'DE',AUT:'AT',FIN:'FI',SWE:'SE',PRT:'PT'};
const reference=(country,series,kind)=>existingEuropeForestryReferences(country,series).find(row=>row.kind===kind);
const amount=(ref,id)=>ref.rows.find(row=>row.id===id)?.value;

test('all eight retained national product balances keep their thousand-m3 values, stock nulls and source flags',()=>{
 for(const country of ['DEU','AUT','FIN','SWE'])for(const [selectedSeries,product] of [['industrial-roundwood-production','RW_IN'],['sawnwood-production','SN']]){
  const ref=reference(country,selectedSeries,'balance'),original=source.balances.find(row=>row.country_code===codes[country]&&row.product_code===product);
  assert.ok(ref,country+'/'+product);assert.equal(ref.year,2024);assert.equal(ref.unit,'THS_M3');
  for(const [id,key] of [['production','production'],['imports','imports'],['exports','exports'],['supply','supply'],['apparent-consumption','apparent_consumption'],['stocks','stocks']])assert.equal(amount(ref,id),original[key]);
  assert.equal(amount(ref,'stocks'),null,'uncollected stock must never become zero');
  assert.equal(ref.rows.find(row=>row.id==='production').flag,original.observation_flags.PRD??null);
  assert.equal(ref.selectionRelation,'same-product');assert.match(ref.source.url,/ec\.europa\.eu/);
  assert.ok(Math.abs(amount(ref,'production')+amount(ref,'imports')-amount(ref,'supply'))<1e-8);
  assert.ok(Math.abs(amount(ref,'exports')+amount(ref,'apparent-consumption')-amount(ref,'supply'))<1e-8);
  assert.match(ref.notes.join(' '),/実消費・実用途・国産材消費ではありません/);
 }
 assert.equal(reference('AUT','industrial-roundwood-production','balance').rows[0].flag,'d');
 assert.equal(reference('SWE','industrial-roundwood-production','balance').rows[0].flag,'p');
});

test('industrial roundwood is a labelled subset of total roundwood and is not a fuelwood balance',()=>{
 const totalSelection=reference('DEU','roundwood-production','balance'),industrialSelection=reference('DEU','industrial-roundwood-production','balance');
 assert.equal(totalSelection.productCode,'RW_IN');assert.equal(totalSelection.selectionRelation,'subset-of-selected');
 assert.equal(amount(totalSelection,'production'),47296.31);
 assert.match(totalSelection.productLabel,/燃料材を除く/);
 assert.match(totalSelection.notes.join(' '),/丸太1861.*置き換えません/);
 assert.equal(industrialSelection.selectionRelation,'same-product');
 assert.equal(reference('DEU','wood-fuel-production','balance'),undefined);
 const removal=reference('DEU','roundwood-production','removals');
 assert.equal(amount(removal,'total'),70831.89);
 assert.notEqual(amount(removal,'total'),amount(totalSelection,'production'));
});

test('five-country removal composition uses four disjoint uses without adding the industrial subtotal',()=>{
 for(const country of Object.keys(codes)){
  const ref=reference(country,'roundwood-production','removals'),original=source.removal_assortments.find(row=>row.country_code===codes[country]);
  assert.ok(ref,country);assert.equal(ref.unit,'THS_M3_UNDER_BARK');assert.equal(ref.barkBasis,'under-bark');assert.equal(ref.productCode,'RW');
  const components=ref.rows.filter(row=>row.role==='component');assert.equal(components.length,4);
  assert.deepEqual(components.map(row=>row.id),['fuelwood','sawlogs','pulpwood','other-industrial']);
  const sum=components.reduce((total,row)=>total+row.value,0);
  assert.ok(Math.abs(sum-amount(ref,'total'))<=.1);
  assert.equal(ref.detailRows.length,1);assert.equal(ref.detailRows[0].value,original.values.RW_IN.value);
  assert.equal(ref.detailRows[0].role,'total');assert.equal(amount(ref,'total'),original.values.RW.value);
  assert.match(ref.notes.join(' '),/パルプ用材には板用原料も含みます/);
 }
 assert.equal(reference('AUT','roundwood-production','removals').rows.find(row=>row.id==='other-industrial').value,0,'the source-reported zero is retained');
 assert.equal(reference('AUT','roundwood-production','removals').rows.find(row=>row.id==='other-industrial').flag,'d');
 assert.equal(reference('FIN','industrial-roundwood-production','removals').selectionRelation,'broader-product-reference');
});

test('Finnish first-use inputs retain over-bark units and exclude both subtotals and by-products from the band',()=>{
 const ref=reference('FIN','roundwood-production','industrial-input'),components=ref.rows.filter(row=>row.role==='component');
 assert.equal(ref.unit,'THS_M3_SOLID_OVER_BARK');assert.equal(ref.barkBasis,'over-bark');assert.equal(ref.selectionRelation,'different-stage-reference');
 assert.deepEqual(components.map(row=>row.value),[25413,2508,233,34501]);
 assert.equal(components.reduce((sum,row)=>sum+row.value,0),62655);
 assert.equal(amount(ref,'TOL_YHT'),62655);
 assert.equal(ref.rows.some(row=>row.id==='PUUTEOL_YHT'||row.id==='MEKPKTEOL'||row.id==='SELTEOL'),false,'nested totals cannot enter the composition');
 assert.equal(ref.detailRows.length,8,'all original hierarchical input rows remain separate');
 assert.equal(ref.byproducts.length,8);
 assert.equal(ref.byproducts.find(row=>row.id==='TOL_YHT').value,8727);
 const nil=ref.byproducts.find(row=>row.id==='VANTEOL');assert.equal(nil.value,null);assert.equal(nil.flag,'-');
 assert.match(ref.notes.join(' '),/8,727.*構成帯へ足しません/);
 assert.match(ref.notes.join(' '),/輸入チップ・おがくず/);
 assert.match(ref.notes.join(' '),/null・記号「-」.*数量ゼロ/);
 assert.equal(reference('FIN','sawnwood-production','industrial-input'),undefined,'all-industry input is not a sawnwood supply balance');
});

test('UK market shares are confined to large-mill softwood products, not all wood or export-destination use',()=>{
 const ref=reference('GBR','sawnwood-production','market-shares');
 assert.equal(ref.year,2024);assert.equal(ref.unit,'percent');assert.equal(ref.barkBasis,'not-applicable');assert.equal(ref.selectionRelation,'subset-of-selected');
 assert.deepEqual(ref.rows.map(row=>row.value),[25,38,30,7]);assert.equal(ref.rows.reduce((sum,row)=>sum+row.value,0),100);
 assert.match(ref.scope,/年間製材生産25,000m³以上.*針葉樹/);
 assert.equal(ref.source.table,'2.17a');assert.equal(ref.source.printedPage,44);
 assert.match(ref.notes.join(' '),/全英国の消費.*全欧州.*マツだけ/);
 assert.match(ref.notes.join(' '),/輸出相手国別の使途を追跡した図ではありません/);
 assert.equal(reference('GBR','roundwood-production','market-shares'),undefined);
 assert.equal(reference('DEU','sawnwood-production','market-shares'),undefined);
});

test('missing geographies and unrelated product selections do not inherit another country reference',()=>{
 for(const country of ['', 'EU27','RUS','FRA','CAN','JPN'])assert.deepEqual(existingEuropeForestryReferences(country,'roundwood-production'),[],country);
 for(const id of ['forest-area','cattle-meat','wheat-production','overview','forest','pulp-production'])assert.deepEqual(existingEuropeForestryReferences('FIN',id),[],id);
 assert.deepEqual(existingEuropeForestryReferences('PRT','sawnwood-production'),[]);
});

test('reference calls return fresh rows and do not mutate their retained input packet',()=>{
 const first=existingEuropeForestryReferences('FIN','roundwood-production'),before=JSON.stringify(first);
 first[0].rows[0].value=-1;first[0].notes.push('caller mutation');first[0].source.title='changed';
 first.find(ref=>ref.kind==='industrial-input').byproducts[0].value=-2;
 const next=existingEuropeForestryReferences('FIN','roundwood-production');
 assert.equal(JSON.stringify(next),before);
 assert.equal(source.balances.find(row=>row.country_code==='FI'&&row.product_code==='RW_IN').production,54637.15);
});
