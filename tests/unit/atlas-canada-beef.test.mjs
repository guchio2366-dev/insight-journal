import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
const d=JSON.parse(await readFile('src/data/atlas/canada/beef.json','utf8'));
const parse=l=>[...l.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));
const compiled=(await transform(await readFile('src/lib/atlas-canada-beef.ts','utf8'),{loader:'ts',format:'esm'})).code;
const lib=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('Cattle slice preserves 99 official July inventories and original thousand-head precision, class and farm scope',async()=>{
 const lines=(await readFile('data-source/atlas/canada/agriculture/beef/beef-selected.csv','utf8')).trim().split(/\r?\n/),h=parse(lines.shift());assert.equal(lines.length,99);assert.equal(d.data.length,33);
 for(const line of lines){const r=Object.fromEntries(parse(line).map((v,i)=>[h[i],v]));assert.equal(r.UOM,'Head');assert.equal(r.SCALAR_FACTOR,'thousands');assert.equal(r['Survey date'],'At July 1');assert.equal(r['Farm type'],'On all cattle operations');assert.equal(r.DECIMALS,'1');const m=d.metrics.find(m=>m.source===r.Livestock);assert.ok(m);const v=d.data.find(v=>String(v.year)===r.REF_DATE&&v.id===r.GEO).values[m.id];assert.equal(v.value,r.VALUE===''?null:Number(r.VALUE));assert.equal(v.status,r.STATUS);assert.equal(v.symbol,r.SYMBOL);assert.equal(v.vector,r.VECTOR);assert.equal(v.decimals,1);}
 const national=d.data.find(r=>r.year===2026&&r.id==='Canada');assert.equal(national.values.beef.value,3510.1);assert.equal(national.values.dairy.value,983);assert.equal(national.values.total.value,12100);assert.notEqual(national.values.beef.value,national.values.total.value-national.values.dairy.value);
});
test('Cattle manifest preserves fixed source-map quantities, independent survey timing and derivative hashes',async()=>{
 const m=JSON.parse(await readFile('public/assets/atlas/canada-beef-v1/manifest.json','utf8')),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(m.surveyDate,'At July 1');assert.equal(m.missing,0);assert.equal(m.selectedRows,99);assert.equal(m.maps.length,3);assert.equal(m.selectedCsvSha256,sha(await readFile('public/assets/atlas/canada-beef-v1/beef-selected.csv')));
 for(const map of m.maps){assert.equal(map.year,2021);assert.equal(map.crop.height,814);assert.equal(map.sha256,sha(await readFile(`public/assets/atlas/canada-beef-v1/${map.id}-map-2021.jpg`)));}
 assert.equal(m.maps[0].dot,2500);assert.equal(m.maps[1].total,18559652);assert.equal(m.maps[2].dot,3238);assert.equal(m.maps[2].total,5394265);assert.notEqual(m.maps[0].total,d.data.find(r=>r.year===2021&&r.id==='Canada').values.beef.value*1000);
});
test('Cattle URL state restores independent map, year, class, comparisons and zoom while rejecting invalid choices',()=>{
 const ids=d.provinces.map(p=>p.id),u=new URL('https://example.com/beef/?year=2026&province=Ontario&compare=Quebec&metric=dairy&map=hay&zoom=1&keep=1');const s=lib.readCanadaBeefState(u,d.years,ids);assert.deepEqual(s,{year:2026,province:'Ontario',compare:'Quebec',metric:'dairy',map:'hay',zoom:true});assert.equal(lib.writeCanadaBeefState(u,s).searchParams.get('keep'),'1');assert.deepEqual(lib.readCanadaBeefState(lib.writeCanadaBeefState(u,s),d.years,ids),s);
 const invalid=lib.readCanadaBeefState(new URL('https://example.com/?year=2000&province=invalid&compare=Alberta&metric=production&map=all'),d.years,ids);assert.deepEqual(invalid,{year:2021,province:'Alberta',compare:null,metric:'beef',map:'beef',zoom:false});assert.equal(lib.formatCanadaBeefValue(0),'0.0');assert.equal(lib.formatCanadaBeefValue(null),'未収録');assert.equal(lib.formatCanadaBeefValue(983),'983.0');
});
