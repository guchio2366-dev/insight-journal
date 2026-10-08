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
 assert.deepEqual(data.cropCandidates.selected.map(row=>row.itemCode),['56','27','15','156','236','328','667','125','79','836']);
 assert.equal(data.cropCandidates.next[0].itemCode,'254');
 assert.equal(data.cropCandidates.selected.find(row=>row.itemCode==='328').reportedCountries,1);
});

test('East under-map reading changes with country and topic without treating missing forest as zero',async()=>{
 const output=await build({entryPoints:['src/scripts/atlas-east-asia-farm-foundations.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {renderEastAsiaFarmFoundations}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 const window=new Window(),old=globalThis.document;globalThis.document=window.document;
 try{
  const root=window.document.createElement('main');root.innerHTML='<section data-east-farm-foundations hidden><div data-east-forest-flows></div><div data-east-export-partners></div><div data-east-world-share></div></section>';
  const section=root.querySelector('[data-east-farm-foundations]');
  renderEastAsiaFarmFoundations(root,'east-asia',true,'overview',undefined);
  assert.equal(section.hidden,false);assert.match(section.textContent,/4対象の丸太生産量/);
  assert.equal(section.querySelectorAll('[data-east-world-share] .east-bar').length,4);
  renderEastAsiaFarmFoundations(root,'east-asia',true,'forest',{code:'TWN',name:'台湾'});
  assert.match(section.querySelector('[data-east-world-share]').textContent,/森林面積は未掲載.*公表0とは異なります/);
  assert.match(section.querySelector('[data-east-export-partners]').textContent,/全商品輸出先.*丸太・製材の輸出先/);
  renderEastAsiaFarmFoundations(root,'east-asia',true,'wheat',{code:'JPN',name:'日本'});
  assert.match(section.querySelector('[data-east-world-share]').textContent,/小麦生産量/);
  assert.equal(section.querySelectorAll('[data-east-world-share] tbody tr').length,10);
  renderEastAsiaFarmFoundations(root,'east-asia',false,'wheat',{code:'JPN',name:'日本'});
  assert.equal(section.hidden,true);
 }finally{globalThis.document=old;await window.happyDOM.close();}
});
