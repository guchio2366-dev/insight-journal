import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {southeastCropPriority,southeastCropCountries} from '../../src/data/atlas/asia/southeast-asia-crop-priority.mjs';

const data=JSON.parse(readFileSync('public/assets/atlas/southeast-asia-v1/world-shares.json'));
const country=JSON.parse(readFileSync(data.sources.country.path));
const world=JSON.parse(readFileSync(data.sources.world.path));
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('Southeast crop world shares use the matching FAOSTAT release, item, element, year and unit',()=>{
 assert.equal(data.region,'southeast-asia');
 assert.equal(sha256(data.sources.country.path),data.sources.country.sha256);
 assert.equal(sha256(data.sources.world.path),data.sources.world.sha256);
 assert.equal(country.inputs.find(row=>row.file===data.sources.archive.file).sha256,data.sources.archive.sha256);
 assert.equal(world.sources.find(row=>row.id==='QCL').archive.sha256,data.sources.archive.sha256);
 assert.deepEqual(data.countries,southeastCropCountries);
 assert.deepEqual(data.series.map(row=>row.itemCode),['27','56','236']);
 assert.deepEqual([...data.series.map(row=>row.itemCode),...data.unavailable.map(row=>row.itemCode)].sort(),southeastCropPriority(country).selected.map(row=>row.code).sort());
 for(const series of data.series){
  assert.equal(series.years.length,10);
  for(const year of series.years){
   const denominator=world.world.observations.filter(row=>row[0]===series.id&&row[1]===year.year);
   assert.equal(denominator.length,1);
   assert.equal(series.unit,denominator[0][3]);
   assert.equal(year.world,Number(denominator[0][2]));
   let sum=0;
   for(const [code,result] of Object.entries(year.countries)){
    assert.ok(data.countries.includes(code));
    const numerator=country.countries[code].observations.filter(row=>row.domain==='Production_Crops_Livestock'&&row.item===series.itemCode&&row.elementCode===series.elementCode&&row.year===year.year&&row.unit===series.unit);
    assert.equal(numerator.length,1);
    assert.equal(result.value,numerator[0].value);
    assert.equal(result.flag,numerator[0].flag);
    assert.ok(Math.abs(result.share-result.value/year.world*100)<1e-9);
    sum+=result.value;
   }
   assert.ok(Math.abs(year.reportedRegion.value-sum)<1e-6);
   assert.equal(year.reportedRegion.countryCount,Object.keys(year.countries).length);
   assert.equal(year.reportedRegion.complete,Object.keys(year.countries).length===data.countries.length);
  }
 }
 const rice2020=data.series.find(row=>row.itemCode==='27').years.find(row=>row.year===2020);
 assert.ok(rice2020.countries.IDN.share>7&&rice2020.countries.IDN.share<7.1);
 assert.equal(rice2020.countries.SGP,undefined,'missing country rows must remain absent');
 assert.equal(rice2020.reportedRegion.complete,false,'a partial country sum must not be labelled the complete region');
});

test('the shared under-map panel draws the sourced Southeast trend and handles unsupported crops',async()=>{
 const output=await build({entryPoints:['src/scripts/atlas-asia-farming-panel.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {renderSouthCentralFarmConnections}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 const window=new Window(),oldDocument=globalThis.document;globalThis.document=window.document;
 try{
  const root=window.document.createElement('main');root.innerHTML='<section data-south-central-farm-connections hidden><div data-south-central-world-share></div></section>';
  const section=root.querySelector('[data-south-central-farm-connections]'),content=()=>root.querySelector('[data-south-central-world-share]');
  renderSouthCentralFarmConnections(root,'southeast-asia',true,'overview',undefined);
  assert.equal(section.hidden,false);
  assert.match(content().textContent,/インドネシアの米（籾米）.*2024年.*6\.48％/);
  assert.match(content().textContent,/ベトナム.*タイ.*地域全体の世界比ではありません/);
  assert.equal(content().querySelectorAll('svg.sc-share-chart').length,1);
  assert.equal(content().querySelectorAll('tbody tr').length,10);
  renderSouthCentralFarmConnections(root,'southeast-asia',true,'maize',{code:'VNM',name:'ベトナム'});
  assert.match(content().textContent,/ベトナムのトウモロコシ.*2024年.*0\.36％/);
  assert.equal(content().querySelectorAll('svg.sc-share-chart').length,1);
  renderSouthCentralFarmConnections(root,'southeast-asia',true,'oilpalm',{code:'IDN',name:'インドネシア'});
  assert.match(content().textContent,/未収録/);
  assert.equal(content().querySelectorAll('svg').length,0);
  renderSouthCentralFarmConnections(root,'southeast-asia',false,'rice',undefined);
  assert.equal(section.hidden,true);
 }finally{globalThis.document=oldDocument;await window.happyDOM.close();}
});
