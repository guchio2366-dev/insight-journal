import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const input='data-source/atlas/canada/agriculture/beef',assets='public/assets/atlas/canada-beef-v1';await mkdir(assets,{recursive:true});
const raw=await readFile(`${input}/beef-selected.csv`,'utf8'),parse=l=>[...l.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));
const lines=raw.trim().split(/\r?\n/),h=parse(lines.shift()),records=lines.map(l=>Object.fromEntries(parse(l).map((v,i)=>[h[i],v])));
const provinces=JSON.parse(await readFile('src/data/atlas/canada/canola.json','utf8')).provinces,years=[2021,2025,2026];
const metrics=[{id:'beef',name:'肉用母牛',source:'Beef cows',unit:'千頭'},{id:'dairy',name:'乳牛（経産牛）',source:'Dairy cows',unit:'千頭'},{id:'total',name:'牛の総頭数（子牛を含む）',source:'Total cattle',unit:'千頭'}];
const data=years.flatMap(year=>provinces.map(({id,name})=>({year,id,name,values:Object.fromEntries(metrics.map(m=>{const r=records.find(r=>Number(r.REF_DATE)===year&&r.GEO===id&&r.Livestock===m.source);if(!r||r.UOM!=='Head'||r.SCALAR_FACTOR!=='thousands'||r['Survey date']!=='At July 1'||r['Farm type']!=='On all cattle operations')throw Error(`Invalid row ${year}/${id}/${m.id}`);return [m.id,{value:r.VALUE===''?null:Number(r.VALUE),status:r.STATUS,symbol:r.SYMBOL,vector:r.VECTOR,decimals:Number(r.DECIMALS)}];}))})));
await writeFile('src/data/atlas/canada/beef.json',JSON.stringify({years,provinces,metrics,data,surveyDate:'7月1日',unit:'千頭'},null,2)+'\n');
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex'),provenance=JSON.parse(await readFile(`${input}/provenance.json`,'utf8'));
for(const map of provenance.maps){await copyFile(`${input}/${map.id}-map-2021.jpg`,`${assets}/${map.id}-map-2021.jpg`);map.sha256=await hash(`${assets}/${map.id}-map-2021.jpg`);}
await copyFile(`${input}/beef-selected.csv`,`${assets}/beef-selected.csv`);
await writeFile(`${assets}/manifest.json`,JSON.stringify({...provenance,selectedCsvSha256:await hash(`${assets}/beef-selected.csv`),records:data.length,metrics,missing:records.filter(r=>r.VALUE==='').length,method:'Retain original thousand-head values, decimals and status symbols; missing stays null and published zero stays zero. July 1 inventories are not yearly production or slaughter flows. Census maps stay fixed at 2021, independent of annual survey year and metric.'},null,2)+'\n');console.log('Canada beef: 33 province/year records; 99 cells; 3 fixed census maps');
