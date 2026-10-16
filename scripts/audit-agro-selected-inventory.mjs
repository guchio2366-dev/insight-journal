/** Read built page configuration; never infer observations from map colours. */
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {agroTopicSeries} from '../src/lib/atlas-agro-statistics.ts';
import {agroMarketingYearFlow} from '../src/data/atlas/agro-marketing-year-flow.ts';
import {agroEastQuantityFlow} from '../src/data/atlas/agro-east-quantity-flow.ts';
import {agroRegionIds} from '../src/lib/atlas-agro-quantity-contract.ts';

const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const dist=path.resolve(option('--dist','dist')),output=path.resolve(option('--out','review-artifacts/agro-statistics/inventory.json'));
const labels={'米国':'us','カナダ':'canada','メキシコ':'mexico','欧州':'europe','東アジア':'east-asia','東南アジア':'southeast-asia','南アジア':'south-asia','中央アジア':'central-asia','西アジア・中東':'west-asia','アフリカ':'africa','オセアニア':'oceania','中南米':'latin-america','ロシア':'russia'};
const central=new Set(['KAZ','KGZ','TJK','TKM','UZB']),overview=new Set(['overview','all','farming-overview','farming-all','crops']);
const manifest=JSON.parse(await readFile(path.join(dist,'assets/atlas/regional-production-statistics-v1/manifest.json'),'utf8'));
const release=JSON.parse(await readFile(path.join(dist,'_release.json'),'utf8'));
const entries=new Map(),configurations=[];
const add=(region,scopeId,topic,route,origin,seriesIds=agroTopicSeries(topic))=>{
  if(!region||scopeId==='JPN'||overview.has(topic))return;
  const key=[region,scopeId,topic].join('|');
  let entry=entries.get(key);
  if(!entry){entry={region,scopeId:scopeId||region,scopeKind:scopeId?'country':'region',topic,seriesIds,baselineMissingSeries:seriesIds.filter(id=>!manifest.files[id]&&!agroMarketingYearFlow(scopeId,id)&&!agroEastQuantityFlow(scopeId,id)),routes:[],origins:[]};entries.set(key,entry);}
  if(!entry.routes.includes(route))entry.routes.push(route);
  if(!entry.origins.includes(origin))entry.origins.push(origin);
};
async function walk(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())await walk(file);
  else if(entry.name==='index.html'){
   const html=await readFile(file,'utf8'),route='/'+path.relative(dist,file).replace(/index\.html$/,'').split(path.sep).join('/');
   for(const match of html.matchAll(/<script\b(?=[^>]*\bdata-agro-config(?:\s|=|>))[^>]*>([\s\S]*?)<\/script>/g)){
    const config=JSON.parse(match[1]);
    const topics=[...new Set(config.topics?.length?config.topics:[config.topic])].filter(topic=>!overview.has(topic));
    const countries=config.countries?.length?config.countries.map(country=>country.code):[config.country||''];
    configurations.push({route,scope:config.scope,topics,countries,nationalOnly:config.nationalOnly});
    for(const country of countries)for(const topic of topics){
     const region=config.scope==='南・中央アジア'?(central.has(country)?'central-asia':'south-asia'):labels[config.scope];
     add(region,country,topic,route,'common-config');
    }
   }
   if(route==='/atlas/north-america/agriculture/'){
    for(const match of html.matchAll(/data-stat-select="([^"]+)"/g)){
     const mapping={corn:'maize-production',soybean:'soybean-production',wheat:'wheat-production',rice:'rice-milled-production',cotton:'cotton-lint-production'};
     add('us','USA',match[1],route,'native-us',[mapping[match[1]]]);
    }
    for(const match of html.matchAll(/data-livestock-select="([^"]+)"/g)){
     const mapping={beef:'cattle-meat',dairy:'cattle-milk',hogs:'pig-meat',broilers:'chicken-meat',layers:'chicken-eggs'};
     add('us','USA',match[1],route,'native-us',[mapping[match[1]]]);
    }
    if(html.includes('data-forestry-select'))add('us','USA','forest',route,'native-us');
   }
   if(route==='/atlas/north-america/mexico/agriculture/'){
    for(const match of html.matchAll(/data-mexico-agriculture-three-columns="([^"]+)"/g))add('mexico','MEX',match[1],route,'native-mexico');
   }
  }
 }
}
await walk(path.join(dist,'atlas'));
const rows=[...entries.values()].sort((a,b)=>a.region.localeCompare(b.region)||a.scopeId.localeCompare(b.scopeId)||a.topic.localeCompare(b.topic));
const regions=agroRegionIds.map(id=>({id,selections:rows.filter(row=>row.region===id).length,scopes:new Set(rows.filter(row=>row.region===id).map(row=>row.scopeId)).size,unresolvedSeriesMappings:[...new Set(rows.filter(row=>row.region===id).flatMap(row=>row.baselineMissingSeries))]}));
const report={sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),releaseSha:release.commitSha,status:'inventory-only',dataCompletionClaimed:false,note:'Built common configuration and native US/Mexico product panels. Regional native panels, contextual non-commodity topics and delegated source definitions still require explicit inventory review. Missing series are mapping/source requirements, never imputed zero.',regions,configurations,entries:rows};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({releaseSha:report.releaseSha,status:report.status,totalSelections:rows.length,regions,output},null,2));
