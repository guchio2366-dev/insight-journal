import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
const d=JSON.parse(await readFile('src/data/atlas/canada/canola.json','utf8'));
const {code}=await transform(await readFile('src/lib/atlas-canada-agriculture.ts','utf8'),{loader:'ts',format:'esm'});
const {readCanadaAgricultureState:read,writeCanadaAgricultureState:write}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('Canadian canola retains official values, absent data, revised symbols and distinct units',()=>{
 assert.equal(d.data.length,44);assert.equal(d.data.reduce((n,r)=>n+Object.keys(r.values).length,0),132);
 const row=id=>d.data.find(r=>r.year===2021&&r.id===id);
 assert.equal(row('Canada').values.seeded.value,9012449);assert.equal(row('Saskatchewan').values.seeded.value,4848301);
 assert.equal(row('Canada').values.production.value,14248281);assert.equal(row('Canada').values.production.symbol,'r');
 assert.equal(row('New Brunswick').values.seeded.value,null);assert.equal(row('New Brunswick').values.seeded.status,'F');assert.equal(row('Newfoundland and Labrador').values.seeded.value,0);
 assert.deepEqual(d.metrics.map(m=>m.unit),['ha','ha','t']);assert.deepEqual(d.years,[2020,2021,2022,2025]);
});
test('Canadian agriculture state validates inputs and preserves requested year, comparison, metric, zoom and unrelated parameters',()=>{
 const ids=d.provinces.map(p=>p.id),url=new URL('https://example.com/?extra=1'),state={year:2025,province:'Manitoba',compare:'Saskatchewan',metric:'production',zoom:true};
 assert.deepEqual(read(write(url,state),d.years,ids),state);assert.equal(write(url,state).searchParams.get('extra'),'1');
 assert.deepEqual(read(new URL('https://example.com/?year=2026&province=unknown&compare=unknown&metric=unknown'),d.years,ids),{year:2021,province:'Saskatchewan',compare:null,metric:'seeded',zoom:false});
 assert.equal(read(new URL('https://example.com/?province=Manitoba&compare=Manitoba'),d.years,ids).compare,null);
});
test('Canadian agriculture source ledger verifies retained CSV and cropped map and keeps census-map year separate',async()=>{
 const m=JSON.parse(await readFile('public/assets/atlas/canada-agriculture-v1/manifest.json','utf8'));
 const sha=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(m.map.year,2021);assert.equal(m.map.dotAcres,10000);assert.equal(m.map.dotHectares,4047);assert.equal(m.licence,'Statistics Canada Open Licence');
 assert.equal(m.selectedCsvSha256,sha(await readFile('data-source/atlas/canada/agriculture/canola-selected.csv')));
 assert.equal(m.mapSha256,sha(await readFile('public/assets/atlas/canada-agriculture-v1/canola-map-2021.jpg')));
 assert.ok(m.missing>0);assert.deepEqual(m.map.crop,{left:0,top:0,width:1133,height:814});
});
