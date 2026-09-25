// Rebuild the pinned public snapshot. Use --cache=/path/to/raw-cache for offline replay.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(path.join(root,'data-source/atlas/africa/manifest.json'),'utf8'));
const cacheArg=process.argv.find(a=>a.startsWith('--cache='));
const cache=cacheArg?path.resolve(cacheArg.slice(8)):path.join(root,'.cache/africa');
await mkdir(cache,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
async function load(source,filename){
 const file=path.join(cache,filename);let bytes;
 try{bytes=await readFile(file);}catch{const res=await fetch(source.url,{signal:AbortSignal.timeout(90000)});if(!res.ok)throw Error(`${res.status}: ${source.url}`);bytes=Buffer.from(await res.arrayBuffer());}
 if(sha(bytes)!==source.sha256)throw Error(`Snapshot changed: ${filename}. Review a new snapshot explicitly before updating the manifest.`);
 await writeFile(file,bytes);return JSON.parse(bytes);
}
const ne=await load(manifest.naturalEarth,'ne-50m.json');
const regions={'Northern Africa':'north','Western Africa':'west','Middle Africa':'central','Eastern Africa':'east','Southern Africa':'south'};
const features=[],countries=[];
for(const f of ne.features){const p=f.properties;if(!(p.CONTINENT==='Africa'||['MUS','SYC'].includes(p.ADM0_A3))||p.ADM0_A3==='SOL')continue;
 const code=({SDS:'SSD',SAH:'ESH'})[p.ADM0_A3]??p.ADM0_A3;let geometry=structuredClone(f.geometry);
 if(code==='SOM'){const other=ne.features.find(f=>f.properties.ADM0_A3==='SOL').geometry;geometry={type:'MultiPolygon',coordinates:[...(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates),...(other.type==='Polygon'?[other.coordinates]:other.coordinates)]};}
 const round=a=>typeof a[0]==='number'?a.map(v=>Number(v.toFixed(4))):a.map(round);geometry.coordinates=round(geometry.coordinates);
 features.push({type:'Feature',properties:{code},geometry});countries.push({code,name:code==='MLI'?'マリ':p.NAME_JA,region:regions[p.SUBREGION],point:[p.LABEL_X,p.LABEL_Y],statistical:code!=='ESH'});
}
countries.sort((a,b)=>a.code.localeCompare(b.code));
if(countries.length!==55||new Set(countries.map(c=>c.code)).size!==55)throw Error('Unexpected Africa coverage');
const series={};
for(const source of manifest.sources){const data=await load(source,`${source.id}.json`);if(Number(data[0]?.pages)!==1||!Array.isArray(data[1]))throw Error(`Incomplete ${source.id}`);series[source.id]={};for(const row of data[1]){if(!countries.some(c=>c.code===row.countryiso3code&&c.statistical))continue;(series[source.id][row.countryiso3code]??={})[row.date]=row.value;}}
const target=path.join(root,'src/data/atlas');
await writeFile(path.join(target,'africa-countries.json'),JSON.stringify(countries));
await writeFile(path.join(target,'africa-geography.json'),JSON.stringify({type:'FeatureCollection',features}));
await writeFile(path.join(target,'africa-statistics.json'),JSON.stringify({retrievedAt:manifest.retrievedAt,start:2000,end:2024,sources:manifest.sources,series}));
const rows=['country_code,country_name,indicator,year,value'];
for(const source of manifest.sources)for(const c of countries)for(let year=2000;year<=2024;year++){const v=series[source.id][c.code]?.[year]??null;rows.push([c.code,c.name,source.id,year,v??''].join(','));}
const out=path.join(root,'public/assets/atlas/africa');await mkdir(out,{recursive:true});
await writeFile(path.join(out,'indicators.csv'),'\uFEFF'+rows.join('\r\n')+'\r\n');
console.log(`Built ${countries.length} places, ${manifest.sources.length} indicators, ${rows.length-1} country/indicator/year rows (blank means missing).`);
