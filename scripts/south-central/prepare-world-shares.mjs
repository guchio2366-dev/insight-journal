/** Reuse checked-in FAOSTAT rows, matching country and world by item, element, year and unit. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';

const asiaPath='public/assets/atlas/asia-farming-v1/statistics.json';
const worldPath='public/assets/atlas/europe/farming-statistics-v1/statistics.json';
const output='public/assets/atlas/south-central-asia-v1/world-shares.json';
const asiaBytes=readFileSync(asiaPath),worldBytes=readFileSync(worldPath);
const asia=JSON.parse(asiaBytes),europe=JSON.parse(worldBytes);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const countries=['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK','KAZ','KGZ','TJK','TKM','UZB'];
const ids=['rice-production','wheat-production','maize-production','soybean-production','cattle-stocks','sheep-stocks','chicken-stocks','cattle-milk','roundwood-production','sawnwood-production','forest-area'];
const domains={QCL:'Production_Crops_Livestock',FO:'Forestry',RL:'Inputs_LandUse'};
for(const source of europe.sources){
 const countryArchive=asia.inputs.find(s=>s.file===source.archive.file);
 if(!countryArchive||countryArchive.sha256!==source.archive.sha256)throw Error(`Country and world source releases differ: ${source.id}`);
}
const measures=europe.measures.filter(m=>ids.includes(m.id));
if(measures.length!==ids.length)throw Error('A world measure is missing');
const series=[];
for(const m of measures){
 const world=europe.world.observations.filter(r=>r[0]===m.id),years=[];
 for(let year=2015;year<=2024;year++){
  const global=world.find(r=>r[1]===year);
  if(!global||global[3]!==m.unit||!(Number(global[2])>0))throw Error(`World row missing or invalid: ${m.id} ${year}`);
  const values={};
  for(const code of countries){
   const row=asia.countries[code]?.observations.find(r=>r.domain===domains[m.domain]&&r.item===m.itemCode&&r.elementCode===m.elementCode&&r.year===year&&r.unit===m.unit);
   if(row?.value==null)continue;
   if(row.value<0||row.value>Number(global[2]))throw Error(`Invalid country numerator: ${code} ${m.id} ${year}`);
   values[code]={value:row.value,share:row.value/Number(global[2])*100,flag:row.flag};
  }
  years.push({year,world:Number(global[2]),worldFlag:global[4],countries:values});
 }
 series.push({id:m.id,label:m.label,domain:m.domain,itemCode:m.itemCode,elementCode:m.elementCode,unit:m.unit,definition:m.definition,years});
}
const payload={schemaVersion:1,region:'south-central-asia',method:'FAOSTAT published country numerator divided by the published World (Area Code 5000) denominator, same item, element, year and unit. Missing country rows are omitted, not zero. Animal stocks, forest area and wood products retain their own units and labels. These selected measures are not a crop-production top-ten ranking.',countries,series,sources:{country:{path:asiaPath,sha256:sha256(asiaBytes)},world:{path:worldPath,sha256:sha256(worldBytes),archive:europe.sources.map(s=>({id:s.id,sha256:s.archive.sha256,releaseDate:s.releaseDate,landingUrl:s.landingUrl,license:s.license,licenseUrl:s.licenseUrl}))}}};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(payload)+'\n');
console.log(`${output}: ${series.length} measures, ${countries.length} countries, ${Buffer.byteLength(JSON.stringify(payload))} bytes`);
