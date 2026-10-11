import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {bundleCanadaSource} from '../tests/fixtures/bundle-canada-source.mjs';

// This ledger checks editorial outlines against source cells; it never creates
// quantities for the outlines or changes the held Census geography/statistics.
const files={data:'public/assets/atlas/canada-census-agriculture-v1/census-agriculture.json',geometry:'public/assets/atlas/canada-census-agriculture-v1/ccs.geojson',belts:'src/data/atlas/canada/agriculture-production-belts.json'};
const bytes=Object.fromEntries(await Promise.all(Object.entries(files).map(async([key,file])=>[key,await readFile(file)])));
const census=JSON.parse(bytes.data),geometry=JSON.parse(bytes.geometry),reading=JSON.parse(bytes.belts);
const code=await bundleCanadaSource('src/lib/atlas-canada-agriculture-overview.ts',{format:'esm',platform:'node'});
const {canadaAgricultureInteriorAnchor}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function inside(point,ring){
 let result=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
 }
 return result;
}
const anchored=geometry.features.map(feature=>({dguid:String(feature.properties.DGUID),point:canadaAgricultureInteriorAnchor(feature)}));
const sha=value=>createHash('sha256').update(value).digest('hex');
const result={accessedAt:'2026-10-11',method:'Audit support only: published original CCS cells whose display anchor is inside each editorial belt. No sum, new quantity, reassignment or implied farm coordinates. Source polygons and all original cells remain untouched.',sourceDataSha256:sha(bytes.data),sourceGeometrySha256:sha(bytes.geometry),editorialBeltsSha256:sha(bytes.belts),belts:reading.belts.map(belt=>{
 if(['pork','chicken'].includes(belt.product))return {id:belt.id,product:belt.product,sourceGeography:'2021 official CD thematic distribution map',sourceUrl:reading.sources[belt.product].url,ccsValuesAcquired:false,provinceValuesAllocated:false};
 const matches=anchored.filter(region=>inside(region.point,belt.outline)&&census.records[region.dguid]?.cells[belt.product]?.status==='published'&&census.records[region.dguid].cells[belt.product].value>0);
 matches.sort((a,b)=>census.records[b.dguid].cells[belt.product].value-census.records[a.dguid].cells[belt.product].value);
 return {id:belt.id,product:belt.product,sourceGeography:'2021 CCS values',supportingPublishedRegionCount:matches.length,largestPublishedExamples:matches.slice(0,3).map(region=>({dguid:region.dguid,name:census.records[region.dguid].name,sourceCell:census.records[region.dguid].cells[belt.product],displayAnchor:region.point}))};
})};
await writeFile('data-source/atlas/canada/agriculture/production-belts/ccs-production-support.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({editorialBelts:result.belts.length,sourceCcs:geometry.features.length,allocatedProvinceValues:0}));
