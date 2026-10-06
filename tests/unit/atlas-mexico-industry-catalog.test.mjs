import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCsv,decodeOfficialValue} from '../../scripts/prepare-mexico-industry.mjs';
import {buildCatalog,combineOfficialValues,INDUSTRY_CODES} from '../../scripts/prepare-mexico-industry-catalog.mjs';

const input='data-source/atlas/mexico/industry';
const assets='public/assets/atlas/mexico-industry-v1';
const raw=await readFile(input+'/etef-official-annual-2007-2025.csv');
const records=parseCsv(raw.toString('utf8'));
const legacyBytes=await readFile('src/data/atlas/mexico/industry.json');
const legacy=JSON.parse(legacyBytes);
const data=JSON.parse(await readFile('src/data/atlas/mexico/industry-catalog.json','utf8'));
const manifest=JSON.parse(await readFile(assets+'/catalog-manifest.json','utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Catalogue derives 192 values from unchanged official 2025 records and preserves 64 prior values',()=>{
 const built=buildCatalog(records,legacy);
 assert.deepEqual(built.data,data);
 assert.equal(built.fixedValuesVerified,64);
 assert.equal(built.selected.length,736);
 assert.equal(data.metrics.length,6);
 assert.equal(data.rows.length,32);
 assert.deepEqual(data.rows.map(r=>r.id),Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')));
 assert.deepEqual(data.metrics.map(m=>m.id),['oil-gas','mining','food','chemicals','metals','machinery']);
 assert.equal(data.sourceUnit,'thousands USD FOB');
 assert.equal(data.displayUnit,'billions USD FOB');
 for(const row of data.rows)for(const metric of data.metrics){
  const values=metric.sourceCodes.map(code=>decodeOfficialValue(records.find(r=>r.ANIO==='2025'&&r.CVE_ENT===row.id&&r.CODIGO_SCIAN===code)));
  const actual=row.values[metric.id];
  assert.equal(actual.publicationStatus,'Cifras Preliminares.');
  if(values.some(v=>v.value===null)){
   assert.equal(actual.value,null);
   assert.equal(actual.sourceValue,null);
  }else{
   assert.equal(actual.sourceValue,values.reduce((sum,v)=>sum+v.sourceValue,0));
   assert.equal(actual.value,actual.sourceValue/1_000_000);
  }
 }
 assert.equal(data.metrics.some(m=>m.sector==='services'||m.sector==='construction-real-estate'),false);
 assert.equal(data.metrics.some(m=>m.sourceCodes.some(c=>['000','111','112','114'].includes(c))),false);
});

test('Unknown, confidential, insignificant and zero components cannot become fabricated aggregate amounts',()=>{
 const value=(sourceValue,sourceStatus)=>decodeOfficialValue({VAL_USD:sourceValue,ESTATUS_CIFRA:sourceStatus,ESTATUS:'Cifras Preliminares.'});
 const positive=value('1000','Disponible'),zero=value('0','Disponible'),unknown=value('','No disponible'),confidential=value('','Confidencial'),insignificant=value('','No Significativo');
 assert.equal(combineOfficialValues([positive,zero]).value,.001);
 assert.equal(combineOfficialValues([zero,zero]).status,'zero');
 assert.equal(combineOfficialValues([positive,unknown]).value,null);
 assert.equal(combineOfficialValues([positive,unknown]).status,'unknown');
 assert.equal(combineOfficialValues([unknown,confidential]).status,'confidential');
 assert.equal(combineOfficialValues([positive,confidential]).sourceValue,null);
 assert.equal(combineOfficialValues([zero,insignificant]).value,null);
 assert.equal(combineOfficialValues([insignificant,positive]).status,'notSignificant');
 assert.throws(()=>combineOfficialValues([]));
 assert.throws(()=>combineOfficialValues([positive,{...zero,publicationStatus:'Cifras Definitivas.'}]));
 assert.deepEqual(combineOfficialValues([unknown]),unknown);
});

test('Ledger verifies source bytes, fixed legacy data, complete raw export subset and reproducible outputs',async()=>{
 assert.equal(raw.length,manifest.input.bytes);
 assert.equal(sha(raw),manifest.input.sha256);
 assert.equal(sha(raw),'a120b1f1e7f7ce5a3bc61871d8d302bd104dfcdf65a044a89990353056b196bf');
 assert.equal(sha(legacyBytes),manifest.legacy.sha256);
 assert.equal(manifest.legacy.fixedValuesVerified,64);
 assert.equal(sha(legacyBytes),'d4a0723124b1c84e429775ff52d78b90925c3619fffc6216051eb8869925412b');
 const extract=await readFile(manifest.extract.file);
 assert.equal(extract.length,manifest.extract.bytes);assert.equal(sha(extract),manifest.extract.sha256);
 const selected=parseCsv(extract.toString('utf8'));
 assert.equal(selected.length,736);
 assert.deepEqual([...new Set(selected.map(r=>r.CODIGO_SCIAN))],INDUSTRY_CODES);
 assert.deepEqual(selected,records.filter(r=>r.ANIO==='2025'&&INDUSTRY_CODES.includes(r.CODIGO_SCIAN)));
 const normalized=await readFile(manifest.normalized.file);
 assert.equal(normalized.length,manifest.normalized.bytes);assert.equal(sha(normalized),manifest.normalized.sha256);
 assert.equal(manifest.source.licenseUrl,'https://www.inegi.org.mx/inegi/terminos.html');
 assert.match(data.source.classification,/2018/);assert.match(data.source.classification,/2007/);
 assert.deepEqual(manifest.statusCounts.metals,{available:17,zero:0,confidential:8,unknown:7,notSignificant:0,notApplicable:0});
});

test('Geographic examples retain authoritative sources and do not claim facility coordinates or measured service exports',()=>{
 assert.deepEqual(Object.keys(data.sectorReadings),['resources','services','construction-real-estate']);
 for(const [sector,reading] of Object.entries(data.sectorReadings)){
  assert.ok(reading.sourceURL.startsWith('https://'));
  assert.ok(reading.sourceYear);
  assert.ok(reading.places.length>=2);
  for(const place of reading.places){assert.ok(legacy.states.some(s=>s.id===place.state));assert.equal('coordinates' in place,false);}
 }
 assert.match(data.notes.topStates,/公開/);assert.match(data.notes.topStates,/全国順位/);
 const oilTop=data.metrics.find(m=>m.id==='oil-gas').topStates;
 const expected=data.rows.filter(r=>r.values['oil-gas'].value>0).sort((a,b)=>b.values['oil-gas'].value-a.values['oil-gas'].value||a.id.localeCompare(b.id)).slice(0,3).map(r=>r.id);
 assert.deepEqual(oilTop,expected);
});
