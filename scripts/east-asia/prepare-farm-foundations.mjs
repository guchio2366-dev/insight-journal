/** Match East Asian FAOSTAT country rows to World rows from the same archives. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const countryPath='public/assets/atlas/asia-farming-v1/statistics.json';
const worldPath='public/assets/atlas/europe/farming-statistics-v1/statistics.json';
const output='public/assets/atlas/east-asia-v1/farm-foundations.json';
const countryBytes=readFileSync(countryPath),worldBytes=readFileSync(worldPath);
const countryData=JSON.parse(countryBytes),worldData=JSON.parse(worldBytes);
const countries=['CHN','JPN','KOR','TWN'];
const tradePath='public/assets/atlas/asia-trade-v1/east-asia.json.gz';
const tradeBytes=readFileSync(tradePath),tradeData=JSON.parse(gunzipSync(tradeBytes));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const domainName={QCL:'Production_Crops_Livestock',FO:'Forestry',RL:'Inputs_LandUse'};
for(const source of worldData.sources){
 const countryArchive=countryData.inputs.find(input=>input.file===source.archive.file);
 if(!countryArchive||countryArchive.sha256!==source.archive.sha256)throw Error(`FAOSTAT releases differ: ${source.id}`);
}
const wanted=['rice-production','wheat-production','maize-production','soybean-production','roundwood-production','sawnwood-production','forest-area'];
const series=wanted.map(id=>{
 const measure=worldData.measures.find(row=>row.id===id);if(!measure)throw Error(`World measure missing: ${id}`);
 return {id,label:measure.label,domain:measure.domain,itemCode:measure.itemCode,elementCode:measure.elementCode,unit:measure.unit,years:Array.from({length:10},(_,offset)=>{
  const year=2015+offset,worldRows=worldData.world.observations.filter(row=>row[0]===id&&row[1]===year);
  if(worldRows.length!==1||worldRows[0][3]!==measure.unit||!(Number(worldRows[0][2])>0))throw Error(`World row invalid: ${id} ${year}`);
  const world=Number(worldRows[0][2]),values={};
  for(const code of countries){
   const rows=countryData.countries[code].observations.filter(row=>row.domain===domainName[measure.domain]&&row.item===measure.itemCode&&row.elementCode===measure.elementCode&&row.year===year&&row.unit===measure.unit);
   if(rows.length>1)throw Error(`Duplicate country row: ${code} ${id} ${year}`);
   const row=rows[0];if(row?.value==null)continue;
   if(row.value<0||row.value>world)throw Error(`Country value invalid: ${code} ${id} ${year}`);
   values[code]={value:row.value,share:row.value/world*100,flag:row.flag};
  }
  return {year,world,worldFlag:worldRows[0][4],countries:values};
 })};
});
// This candidate list is the retained source subset, not every FAOSTAT crop.
const cropItems=[27,15,56,236,328,667,125,156,254,836,656,191,201,79];
const candidates=cropItems.map(item=>{
 const code=String(item),rows=countries.map(country=>countryData.countries[country].observations.find(row=>row.domain==='Production_Crops_Livestock'&&row.item===code&&row.elementCode==='5510'&&row.year===2020&&row.unit==='t'));
 return {itemCode:code,label:countryData.items['Production_Crops_Livestock:'+code],tonnes:rows.reduce((sum,row)=>sum+(row?.value??0),0),reportedCountries:rows.filter(row=>row?.value!=null).length,flags:[...new Set(rows.flatMap(row=>row?.value!=null?[row.flag]:[]))]};
}).sort((a,b)=>b.tonnes-a.tonnes);
const forestFlows=Object.fromEntries(countries.map(code=>[code,Object.fromEntries([['roundwood','1861'],['sawnwood','1872']].map(([name,item])=>[name,Object.fromEntries([['production','5516'],['imports','5616'],['exports','5916']].map(([flow,element])=>{
 const rows=countryData.countries[code].observations.filter(row=>row.domain==='Forestry'&&row.item===item&&row.elementCode===element&&row.year===2024&&row.unit==='m3');
 if(rows.length>1)throw Error(`Duplicate forest flow: ${code} ${item} ${element}`);
 return [flow,rows[0]?.value==null?null:{value:rows[0].value,flag:rows[0].flag}];
}))]))]));
const exportDestinations=Object.fromEntries(countries.map(code=>{
 const record=tradeData.countries[code],partners=record?.partners?.TOTAL;
 if(!partners)return [code,null];
 if(Math.abs(partners.values.reduce((sum,[,value])=>sum+value,0)-partners.world)>Math.max(1,partners.world*1e-6))throw Error(`Partner sum differs: ${code}`);
 return [code,{world:partners.world,top:partners.values.slice(0,3).map(([partnerCode,value])=>({partnerCode,value,sourceName:tradeData.partners[String(partnerCode)]?.name??String(partnerCode)})),other:partners.world-partners.values.slice(0,3).reduce((sum,[,value])=>sum+value,0)}];
}));
const payload={schemaVersion:1,region:'east-asia',countries,method:'Matched country and published World FAOSTAT rows by archive, item, element, year and unit. Missing values are omitted, never zero. Crop candidates are only the 14 distinct items retained in the Asia country dataset; ranking is their reported 2020 production weight, not economic value or a complete crop ranking. Forest production, imports and exports are separately reported 2024 cubic metres; they are not domestic disposition. Export partners are 2023 ALL GOODS current USD, not timber destinations.',series,cropCandidates:{selected:candidates.slice(0,10),next:candidates.slice(10)},forestFlows,exportDestinations,sources:{country:{path:countryPath,sha256:sha256(countryBytes)},world:{path:worldPath,sha256:sha256(worldBytes)},trade:{path:tradePath,sha256:sha256(tradeBytes),source:'https://comtradeplus.un.org/',terms:'https://uncomtrade.org/docs/policy-on-use-and-re-dissemination/'},archive:worldData.sources.map(({id,archive,license,licenseUrl,landingUrl,releaseDate})=>({id,file:archive.file,sha256:archive.sha256,license,licenseUrl,landingUrl,releaseDate}))}};
mkdirSync('public/assets/atlas/east-asia-v1',{recursive:true});writeFileSync(output,JSON.stringify(payload)+'\n');
console.log(`${output}: ${series.length} series, ${candidates.length} crop candidates`);
