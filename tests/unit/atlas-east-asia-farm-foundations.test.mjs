import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const data=JSON.parse(readFileSync('public/assets/atlas/east-asia-v1/farm-foundations.json'));
const source=JSON.parse(readFileSync(data.sources.country.path));
const world=JSON.parse(readFileSync(data.sources.world.path));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('East farming shares, forest flows and candidate ranks come from matching source records',()=>{
 assert.deepEqual(data.countries,['CHN','JPN','KOR','TWN']);
 assert.equal(hash(data.sources.country.path),data.sources.country.sha256);
 assert.equal(hash(data.sources.world.path),data.sources.world.sha256);
 assert.equal(hash(data.sources.trade.path),data.sources.trade.sha256);
 for(const series of data.series){
  const archive=world.sources.find(row=>row.id===series.domain).archive;
  assert.equal(source.inputs.find(row=>row.file===archive.file).sha256,archive.sha256);
  assert.equal(series.years.length,10);
  for(const year of series.years){
   const global=world.world.observations.find(row=>row[0]===series.id&&row[1]===year.year);
   assert.equal(year.world,Number(global[2]));assert.equal(series.unit,global[3]);
   for(const [code,value] of Object.entries(year.countries)){
    const domain={QCL:'Production_Crops_Livestock',FO:'Forestry',RL:'Inputs_LandUse'}[series.domain];
    const rows=source.countries[code].observations.filter(row=>row.domain===domain&&row.item===series.itemCode&&row.elementCode===series.elementCode&&row.year===year.year&&row.unit===series.unit);
    assert.equal(rows.length,1);assert.equal(value.value,rows[0].value);assert.equal(value.flag,rows[0].flag);
    assert.ok(Math.abs(value.share-value.value/year.world*100)<1e-9);
   }
  }
 }
 assert.equal(data.series.find(row=>row.id==='forest-area').years.at(-1).countries.TWN,undefined,'missing Taiwanese forest area must not become zero');
 assert.equal(data.forestFlows.TWN.sawnwood.production.value,37700);
 assert.equal(data.forestFlows.JPN.roundwood.imports.value,1853999);
 assert.equal(data.cropFlows.wheat.JPN.production.value,1029000);
 assert.ok(data.cropFlows.wheat.JPN.imports>0);
 assert.deepEqual(data.cropCandidates.selected.map(row=>row.itemCode),['56','27','15','156','236','328','667','125','79','836']);
 assert.equal(data.cropCandidates.next[0].itemCode,'254');
 assert.equal(data.cropCandidates.selected.find(row=>row.itemCode==='328').reportedCountries,1);
});

test('crop import partner totals match the retained HS import values to WITS rounding',async()=>{
 const output=await build({entryPoints:['src/data/atlas/east-asia-crop-partners.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {cropImportPartners}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 assert.deepEqual(Object.keys(cropImportPartners),['CHN','KOR','TWN']);
 const hs={rice:'1006',wheat:'1001',maize:'1005',soybean:'1201'};
 for(const [code,topics] of Object.entries(cropImportPartners))for(const [topic,row] of Object.entries(topics)){
  assert.ok(Math.abs(row.total-data.cropFlows[topic][code].imports)<=10,`${code} ${topic} total`);
  assert.ok(row.top.every(part=>part.value>0)&&row.top.reduce((sum,part)=>sum+part.value,0)<row.total);
  assert.match(row.source,new RegExp(`/country/${code==='TWN'?'OAS':code}/year/2023/tradeflow/Imports/partner/ALL/product/${topic==='soybean'?'120100':hs[topic]}$`));
 }
});

test('East under-map reading changes with country and topic without treating missing forest as zero',async()=>{
 const output=await build({entryPoints:['src/scripts/atlas-east-asia-farm-foundations.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {renderEastAsiaFarmFoundations}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 const window=new Window(),old=globalThis.document;globalThis.document=window.document;
 try{
  const root=window.document.createElement('main');root.innerHTML='<section data-east-farm-foundations hidden><h2 data-east-foundations-title></h2><p data-east-foundations-lead></p><h3 data-east-supply-title></h3><div data-east-forest-flows></div><h3 data-east-partner-title></h3><div data-east-export-partners></div><h3 data-east-share-title></h3><div data-east-world-share></div></section>';
  const section=root.querySelector('[data-east-farm-foundations]');
  renderEastAsiaFarmFoundations(root,'east-asia',true,'overview',undefined);
  assert.equal(section.hidden,false);assert.match(section.textContent,/4対象の丸太生産量/);
  assert.equal(section.querySelectorAll('[data-east-world-share] .east-bar').length,4);
  renderEastAsiaFarmFoundations(root,'east-asia',true,'forest',{code:'TWN',name:'台湾'});
  assert.match(section.querySelector('[data-east-world-share]').textContent,/森林面積は未掲載.*公表0とは異なります/);
  assert.match(section.querySelector('[data-east-export-partners]').textContent,/その他のアジア（台湾等）の全商品輸出先/);
  assert.match(section.querySelector('[data-east-export-partners]').textContent,/全商品輸出先.*丸太・製材の輸出先/);
  for(const [code,name,topic,partner] of [['CHN','中国','rice','ベトナム'],['CHN','中国','wheat','豪州'],['CHN','中国','maize','ブラジル'],['CHN','中国','soybean','ブラジル'],['KOR','韓国','rice','中国'],['TWN','台湾','rice','米国']]){
   renderEastAsiaFarmFoundations(root,'east-asia',true,topic,{code,name});
   assert.equal(section.querySelector('[data-east-partner-title]').textContent,'品目別の輸入元');
   assert.match(section.querySelector('[data-east-foundations-lead]').textContent,/選んだ品目の輸入額が分母/);
   assert.match(section.querySelector('[data-east-export-partners]').textContent,new RegExp(`${partner}.*輸入額`));
   assert.doesNotMatch(section.querySelector('[data-east-export-partners]').textContent,/全商品輸出先/);
   assert.match(section.querySelector('[data-east-export-partners] a').href,/wits\.worldbank\.org/);
  }
  for(const [code,name,topic] of [['KOR','韓国','wheat'],['TWN','台湾','soybean']]){
   renderEastAsiaFarmFoundations(root,'east-asia',true,topic,{code,name});
   assert.match(section.querySelector('[data-east-export-partners]').textContent,/詳細対象外/);
   assert.equal(section.querySelectorAll('[data-east-export-partners] .east-pie').length,0);
  }
  renderEastAsiaFarmFoundations(root,'east-asia',true,'wheat',{code:'JPN',name:'日本'});
  assert.match(section.querySelector('[data-east-supply-title]').textContent,/日本の小麦：供給と国内消費/);
  assert.match(section.querySelector('[data-east-forest-flows]').textContent,/国内生産は総供給の17.3％、純輸入が80.9％/);
  assert.match(section.querySelector('[data-east-forest-flows]').textContent,/総供給 631.2万t.*2023年度/);
  assert.equal(section.querySelectorAll('[data-east-forest-flows] .east-wheat-segments').length,2);
  assert.match(section.querySelector('[data-east-forest-flows]').textContent,/国内生産 17.3％.*純輸入 80.9％.*在庫減 1.8％/);
  assert.match(section.querySelector('[data-east-forest-flows] details').textContent,/国内生産109.4万t.*純輸入510.4万t.*在庫減11.4万t.*粗食料494.4万t.*加工用24.2万t.*その他112.6万t/);
  assert.match(section.querySelector('[data-east-forest-flows]').textContent,/加工用24.2万tはしょうゆ・でん粉等.*製粉やパン用を指しません/);
  assert.match(section.querySelector('[data-east-forest-flows]').textContent,/小麦粉の用途別生産：パン用182.3万t、めん用154.1万t、菓子用50.3万t.*原麦重量の内訳ではありません/);
  assert.match(section.querySelector('[data-east-partner-title]').textContent,/小麦の輸入相手国/);
  assert.match(section.querySelector('[data-east-export-partners]').textContent,/カナダ.*米国.*豪州.*財務省貿易統計/);
  assert.match(section.querySelector('[data-east-export-partners] svg').textContent,/総輸入量.*4.48.*百万t/);
  assert.match(section.querySelector('[data-east-export-partners]').textContent,/範囲が異なります/);
  assert.equal(section.querySelectorAll('[data-east-world-share] .east-wheat-trend circle').length,5);
  assert.match(section.querySelector('[data-east-world-share] .east-wheat-trend').textContent,/0％.*10％.*20％.*16％.*15％.*17％/);
  assert.match(section.querySelector('[data-east-world-share]').textContent,/17％.*631.2万t.*0.13％/);
  assert.doesNotMatch(section.querySelector('[data-east-world-share]').textContent,/次候補/);
  renderEastAsiaFarmFoundations(root,'east-asia',true,'cotton',{code:'CHN',name:'中国'});
  assert.match(section.querySelector('[data-east-world-share]').textContent,/今回の7指標に含まれません/);
  renderEastAsiaFarmFoundations(root,'east-asia',false,'wheat',{code:'JPN',name:'日本'});
  assert.equal(section.hidden,true);
 }finally{globalThis.document=old;await window.happyDOM.close();}
});
