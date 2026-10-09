import {readFileSync,writeFileSync} from 'node:fs';
import {westProductionAdopted,westTopics,observation} from '../../src/data/atlas/west-asia-topics.mjs';
const local=JSON.parse(readFileSync('public/assets/atlas/west-asia-v1/data.json','utf8'));
const westSource=JSON.parse(readFileSync('public/assets/atlas/west-asia-v1/statistics.json','utf8'));
const europe=JSON.parse(readFileSync('public/assets/atlas/europe/farming-statistics-v1/statistics.json','utf8'));
const westArchive=westSource.inputs.find(x=>x.file.startsWith('Production_Crops_Livestock'));
const worldArchive=europe.sources.find(x=>x.id==='QCL').archive;
if(!westArchive||westArchive.sha256!==worldArchive.sha256)throw Error('West and World FAOSTAT archives differ');
const years=Array.from({length:10},(_,i)=>2015+i);
const rows={};
for(const id of westProductionAdopted){
 const topic=westTopics.find(t=>t.id===id);
 const measure=europe.measures.find(m=>m.domain==='QCL'&&m.itemCode===topic.faoItem&&m.elementCode===topic.faoElement&&m.unit==='t');
 if(!measure){rows[id]=null;continue;}
 rows[id]=years.map(year=>{
  const world=europe.world.observations.find(o=>o[0]===measure.id&&o[1]===year&&o[3]==='t');
  const values=local.countries.map(c=>observation(local,topic,c.code,year).value).filter(Number.isFinite);
  const region=values.reduce((a,b)=>a+b,0),denominator=Number(world?.[2]);
  if(!Number.isFinite(denominator)||denominator<=0||region>denominator)throw Error(`${id} ${year}: invalid denominator`);
  return {year,region,reported:values.length,world:denominator,percent:Number((region/denominator*100).toFixed(3))};
 });
}
const out={schemaVersion:1,scope:'FAOSTATが収録した西アジア・中東の20対象の生産量合計／FAOSTAT世界合計。未報告国は0としない。',sourceUrl:westArchive.url,archiveSha256:westArchive.sha256,yearRange:[2015,2024],rows};
writeFileSync('src/data/atlas/west-asia-world-shares.json',JSON.stringify(out,null,2)+'\n');
console.log(`World shares: ${Object.values(rows).filter(Boolean).length}/${westProductionAdopted.length} products`);
