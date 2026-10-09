/** Match the site's Southeast Asian country rows to World rows from the same FAOSTAT archive. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {southeastCropPriority,southeastCropCountries} from '../../src/data/atlas/asia/southeast-asia-crop-priority.mjs';

const countryPath='public/assets/atlas/asia-farming-v1/statistics.json';
const worldPath='public/assets/atlas/europe/farming-statistics-v1/statistics.json';
const output='public/assets/atlas/southeast-asia-v1/world-shares.json';
const countryBytes=readFileSync(countryPath),worldBytes=readFileSync(worldPath);
const countryData=JSON.parse(countryBytes),worldData=JSON.parse(worldBytes);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=worldData.sources.find(row=>row.id==='QCL');
const countryArchive=countryData.inputs.find(row=>row.file===source?.archive.file);
if(!source||!countryArchive||source.archive.sha256!==countryArchive.sha256)throw Error('FAOSTAT country and World crop archives differ');
const years=Array.from({length:10},(_,index)=>2015+index);
if(JSON.stringify(countryData.years)!==JSON.stringify(years)||JSON.stringify(worldData.years)!==JSON.stringify(years))throw Error('FAOSTAT country and World year ranges differ');

const candidates=southeastCropPriority(countryData).selected;
const selected=candidates.flatMap(candidate=>{
 const matches=worldData.measures.filter(m=>m.domain==='QCL'&&m.itemCode===candidate.code&&m.elementCode==='5510'&&m.unit==='t');
 if(matches.length>1)throw Error(`Ambiguous World measure: ${candidate.code}`);
 return matches.map(measure=>({candidate,measure}));
});
if(selected.map(({candidate})=>candidate.code).join(',')!=='27,56,236')throw Error('Review the coverage before changing the Southeast crop share selection');

const series=selected.map(({candidate,measure})=>({
 id:measure.id,label:candidate.label,itemCode:candidate.code,elementCode:'5510',unit:'t',definition:measure.definition,
 years:years.map(year=>{
  const worldRows=worldData.world.observations.filter(row=>row[0]===measure.id&&row[1]===year);
  if(worldRows.length!==1||worldRows[0][3]!=='t'||!(Number(worldRows[0][2])>0))throw Error(`Invalid World row: ${measure.id} ${year}`);
  const world=Number(worldRows[0][2]),countries={};
  for(const code of southeastCropCountries){
   const rows=countryData.countries[code]?.observations.filter(row=>row.domain==='Production_Crops_Livestock'&&row.item===candidate.code&&row.elementCode==='5510'&&row.year===year&&row.unit==='t');
   if(!rows||rows.length>1)throw Error(`Missing country or duplicate FAOSTAT row: ${code} ${candidate.code} ${year}`);
   const row=rows[0];
   if(row?.value==null)continue;
   if(!Number.isFinite(row.value)||row.value<0||row.value>world)throw Error(`Invalid country value: ${code} ${candidate.code} ${year}`);
   countries[code]={value:row.value,share:row.value/world*100,flag:row.flag};
  }
  const reportedTotal=Object.values(countries).reduce((sum,row)=>sum+row.value,0);
  if(reportedTotal>world)throw Error(`Reported Southeast values exceed World: ${candidate.code} ${year}`);
  return {year,world,worldFlag:worldRows[0][4],countries,reportedRegion:{value:reportedTotal,share:reportedTotal/world*100,countryCount:Object.keys(countries).length,complete:Object.keys(countries).length===southeastCropCountries.length}};
 }),
}));

// Forestry and forest land use the same source archives for the country and World rows.
// Keep these distinct from crop production and from merchandise exports.
for(const [id,domain,itemCode,elementCode,unit,label] of [
 ['roundwood-production','FO','1861','5516','m3','丸太材'],
 ['sawnwood-production','FO','1872','5516','m3','製材'],
 ['forest-area','RL','6646','5110','1000 ha','森林面積'],
]){
 const measure=worldData.measures.find(row=>row.id===id&&row.domain===domain&&row.itemCode===itemCode&&row.elementCode===elementCode&&row.unit===unit);
 const archive=worldData.sources.find(row=>row.id===domain);
 const countryArchive=countryData.inputs.find(row=>row.file===archive?.archive.file);
 if(!measure||!archive||!countryArchive||archive.archive.sha256!==countryArchive.sha256)throw Error(`FAOSTAT country and World forestry archives differ: ${id}`);
 series.push({id,label,itemCode,elementCode,unit,definition:measure.definition,years:years.map(year=>{
  const worldRows=worldData.world.observations.filter(row=>row[0]===id&&row[1]===year);
  if(worldRows.length!==1||worldRows[0][3]!==unit||!(Number(worldRows[0][2])>0))throw Error(`Invalid World row: ${id} ${year}`);
  const world=Number(worldRows[0][2]),countries={};
  for(const code of southeastCropCountries){
   const rows=countryData.countries[code]?.observations.filter(row=>row.domain===(domain==='FO'?'Forestry':'Inputs_LandUse')&&row.item===itemCode&&row.elementCode===elementCode&&row.year===year&&row.unit===unit);
   if(!rows||rows.length>1)throw Error(`Missing country or duplicate FAOSTAT row: ${code} ${id} ${year}`);
   const row=rows[0];if(row?.value==null)continue;
   if(!Number.isFinite(row.value)||row.value<0||row.value>world)throw Error(`Invalid country value: ${code} ${id} ${year}`);
   countries[code]={value:row.value,share:row.value/world*100,flag:row.flag};
  }
  const reportedTotal=Object.values(countries).reduce((sum,row)=>sum+row.value,0);
  if(reportedTotal>world)throw Error(`Reported Southeast values exceed World: ${id} ${year}`);
  return {year,world,worldFlag:worldRows[0][4],countries,reportedRegion:{value:reportedTotal,share:reportedTotal/world*100,countryCount:Object.keys(countries).length,complete:Object.keys(countries).length===southeastCropCountries.length}};
 })});
}

const payload={schemaVersion:1,region:'southeast-asia',method:'Country value divided by the published World (Area Code 5000) value for the identical FAOSTAT item, element, year and unit. Crop production, forestry production and forest area have separate denominators. The 11-country reported sum is incomplete when any country lacks a row; it is not a complete regional total. Missing country observations are omitted, not zero. These are production or area shares, not export or domestic destination shares.',countries:southeastCropCountries,series,unavailable:candidates.filter(candidate=>!selected.some(row=>row.candidate.code===candidate.code)).map(({code,label})=>({itemCode:code,label,reason:'No matching World production row in the retained FAOSTAT World extract'})),sources:{country:{path:countryPath,sha256:sha256(countryBytes)},world:{path:worldPath,sha256:sha256(worldBytes)},archive:{file:source.archive.file,sha256:source.archive.sha256,releaseDate:source.releaseDate,landingUrl:source.landingUrl,license:source.license,licenseUrl:source.licenseUrl},archives:worldData.sources.filter(row=>['QCL','FO','RL'].includes(row.id)).map(row=>({domain:row.id,file:row.archive.file,sha256:row.archive.sha256,releaseDate:row.releaseDate,landingUrl:row.landingUrl,license:row.license,licenseUrl:row.licenseUrl}))}};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(payload)+'\n');
console.log(`${output}: ${selected.length} matched crops, ${series.length-selected.length} forestry and land series, ${payload.unavailable.length} crops without retained World rows`);
