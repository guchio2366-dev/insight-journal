import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const d=JSON.parse(await readFile('src/data/atlas/canada/wheat.json','utf8'));
const parse=line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));
test('All-wheat data preserve all 132 source values, units, quality and revision markers without mixing crop categories',async()=>{
 const lines=(await readFile('data-source/atlas/canada/agriculture/wheat/wheat-selected.csv','utf8')).trim().split(/\r?\n/),h=parse(lines.shift());
 const rows=lines.map(l=>Object.fromEntries(parse(l).map((v,i)=>[h[i],v])));assert.equal(rows.length,132);assert.equal(d.data.length,44);
 for(const r of rows){assert.equal(r['Type of crop'],'Wheat, all');assert.equal(r.SCALAR_FACTOR,'units');const m=d.metrics.find(m=>m.source===r['Harvest disposition']),v=d.data.find(v=>String(v.year)===r.REF_DATE&&v.id===r.GEO).values[m.id];assert.equal(v.value,r.VALUE===''?null:Number(r.VALUE));assert.equal(v.status,r.STATUS);assert.equal(v.symbol,r.SYMBOL);assert.equal(v.vector,r.VECTOR);assert.equal(v.decimals,Number(r.DECIMALS));assert.equal(r.UOM,m.id==='production'?'Metric tonnes':'Hectares');}
 const row=(year,id)=>d.data.find(r=>r.year===year&&r.id===id);
 assert.equal(row(2021,'Canada').values.seeded.value,9491860);assert.equal(row(2021,'Saskatchewan').values.seeded.value,4827426);
 assert.equal(row(2021,'Newfoundland and Labrador').values.seeded.value,null);assert.equal(row(2021,'Newfoundland and Labrador').values.seeded.status,'F');assert.equal(row(2022,'Newfoundland and Labrador').values.seeded.value,0);
 assert.equal(row(2022,'Canada').values.production.value,34878782);assert.equal(row(2022,'Canada').values.production.symbol,'r');
});
test('Wheat provenance keeps the 2021 census map, independent annual totals and correct dot quantities',async()=>{
 const m=JSON.parse(await readFile('public/assets/atlas/canada-wheat-v1/manifest.json','utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(m.crop,'Wheat, all');assert.match(m.definition,/winter wheat seeded in the fall/);assert.equal(m.map.year,2021);assert.equal(m.map.dotAcres,15000);assert.equal(m.map.dotHectares,6070);assert.equal(m.map.totalHectares,9413876);assert.notEqual(m.map.totalHectares,d.data.find(r=>r.year===2021&&r.id==='Canada').values.seeded.value);assert.equal(m.missing,9);
 assert.equal(m.selectedCsvSha256,sha(await readFile('data-source/atlas/canada/agriculture/wheat/wheat-selected.csv')));assert.equal(m.mapSha256,sha(await readFile('public/assets/atlas/canada-wheat-v1/wheat-map-2021.jpg')));assert.equal(m.licence,'Statistics Canada Open Licence');
});
