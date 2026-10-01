import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCsv,decodeOfficialValue} from '../../scripts/prepare-mexico-industry.mjs';
import * as lib from '../../src/lib/atlas-mexico-industry.ts';

const root='data-source/atlas/mexico/industry';
const assets='public/assets/atlas/mexico-industry-v1';
const data=JSON.parse(await readFile('src/data/atlas/mexico/industry.json','utf8'));
const manifest=JSON.parse(await readFile(`${assets}/manifest.json`,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');

test('ETEF 2025 retains 64 original values, state keys, statuses and the thousand-to-billion unit conversion',async()=>{
 const originals=parseCsv(await readFile(`${root}/etef-official-annual-2007-2025.csv`,'utf8'));
 const selected=originals.filter(r=>r.ANIO==='2025'&&['334','336'].includes(r.CODIGO_SCIAN));
 assert.equal(selected.length,64);assert.equal(data.states.length,32);assert.equal(data.rows.length,32);
 assert.deepEqual(data.states.map(s=>s.id),Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')));
 for(const original of selected){
  const metric=data.metrics.find(m=>m.code===original.CODIGO_SCIAN),row=data.rows.find(r=>r.id===original.CVE_ENT);assert.ok(metric&&row);
  const value=row.values[metric.id];assert.equal(row.year,2025);assert.equal(original.COBERTURA,'Estatal');
  assert.equal(value.sourceStatus,original.ESTATUS_CIFRA);assert.equal(value.publicationStatus,original.ESTATUS);
  assert.equal(value.sourceValue,original.VAL_USD===''?null:Number(original.VAL_USD));
  if(original.ESTATUS_CIFRA==='Disponible')assert.equal(value.value,Number(original.VAL_USD)/1_000_000);else assert.equal(value.value,null);
 }
 assert.equal(data.rows.find(r=>r.id==='05').values.transport.value,40.7852);
 assert.equal(data.rows.find(r=>r.id==='08').values.electronics.value,65.701302);
 assert.equal(data.rows.find(r=>r.id==='06').values.transport.status,'confidential');
 assert.equal(data.rows.find(r=>r.id==='03').values.transport.status,'unknown');
 assert.deepEqual(data.statusCounts.transport,{available:24,zero:0,confidential:1,unknown:7,notSignificant:0,notApplicable:0});
 assert.deepEqual(data.statusCounts.electronics,{available:15,zero:0,confidential:5,unknown:12,notSignificant:0,notApplicable:0});
 assert.equal(data.rows.some(r=>'share' in r||'gdp' in r),false);
});

test('The source ZIP, extraction, metadata, licence and normalized data match the SHA256 ledger',async()=>{
 for(const artifact of manifest.sourceFiles){const bytes=await readFile(`${root}/${artifact.file}`);assert.equal(bytes.length,artifact.bytes);assert.equal(sha(bytes),artifact.sha256);}
 const zipped=manifest.sourceFiles.find(f=>f.file.endsWith('.zip'));assert.equal(zipped.sha256,'4bb29b3ece7776d1c3fa1cf894e4ec77dfcae9b251f3002050783c0a08c9d75b');
 const normalized=await readFile(manifest.normalized.file);assert.equal(sha(normalized),manifest.normalized.sha256);assert.equal(normalized.length,manifest.normalized.bytes);
 assert.deepEqual(await readFile(`${assets}/industry-selected-2025.csv`),await readFile(`${root}/industry-selected-2025.csv`));
 assert.equal(parseCsv(await readFile(`${assets}/industry-selected-2025.csv`,'utf8')).length,64);
 const metadata=await readFile(`${assets}/official-metadata.txt`,'utf8');assert.match(metadata,/modified:\s*2026-03-31T06:00/);assert.match(metadata,/license:\s*https:\/\/www\.inegi\.org\.mx\/inegi\/terminos\.html/);
 assert.equal(data.source.metadataUrl,'https://www.inegi.org.mx/rnm/index.php/catalog/1108');assert.match(data.source.sourceUnit,/thousands/);assert.match(data.source.displayUnit,/billions/);
 assert.match(data.notes.confidential,/000/);assert.match(data.notes.scope,/RENEM/);assert.match(data.notes.classificationMetadata,/2007/);assert.equal(manifest.records,64);assert.equal(manifest.year,2025);
});

test('Zero, unknown, confidential, below-threshold and unretrieved amounts remain distinguishable',()=>{
 const base={ESTATUS:'Cifras Preliminares.'};
 assert.equal(decodeOfficialValue({...base,VAL_USD:'0',ESTATUS_CIFRA:'Disponible'}).status,'zero');
 assert.equal(decodeOfficialValue({...base,VAL_USD:'1000',ESTATUS_CIFRA:'Disponible'}).value,.001);
 assert.equal(decodeOfficialValue({...base,VAL_USD:'',ESTATUS_CIFRA:'No disponible'}).status,'unknown');
 assert.equal(decodeOfficialValue({...base,VAL_USD:'',ESTATUS_CIFRA:'Confidencial'}).status,'confidential');
 assert.equal(decodeOfficialValue({...base,VAL_USD:'',ESTATUS_CIFRA:'No Significativo'}).status,'notSignificant');
 assert.throws(()=>decodeOfficialValue({...base,VAL_USD:'',ESTATUS_CIFRA:'Disponible'}));
 assert.throws(()=>decodeOfficialValue({...base,VAL_USD:'0',ESTATUS_CIFRA:'Confidencial'}));
 assert.throws(()=>decodeOfficialValue({...base,VAL_USD:'1',ESTATUS_CIFRA:'surprise'}));
 assert.throws(()=>decodeOfficialValue({...base,VAL_USD:'-1',ESTATUS_CIFRA:'Disponible'}));
 assert.notEqual(lib.industryExportColor(null,'unknown'),lib.industryExportColor(null,'confidential'));
 assert.notEqual(lib.industryExportColor(0,'zero'),lib.industryExportColor(null,'unknown'));
 assert.notEqual(lib.industryExportColor(null,'unretrieved'),lib.industryExportColor(null,'unknown'));
 assert.equal(lib.formatIndustryBillions(0),'0');assert.equal(lib.formatIndustryBillions(null),'—');assert.equal(lib.formatIndustryBillions(.0004),'0.001未満');assert.equal(lib.formatIndustryBillions(.0024),'0.002');
 assert.deepEqual(parseCsv('A,B\n"a,b","x""y"\n'),[{A:'a,b',B:'x"y'}]);
});

test('Dedicated comparison URLs round-trip state, source population view and selection without arbitrary return destinations',()=>{
 const ids=data.states.map(s=>s.id);
 const original=new URL('https://example.com/insight-journal/atlas/north-america/mexico/industry/?compare=population&state=08&metric=electronics&sourceView=population&from=population&only=1&zoom=1&fallback=1');
 const state=lib.readMexicoIndustryState(original,ids);
 assert.deepEqual(state,{state:'08',metric:'electronics',compare:'population',sourceView:'population',from:'population',only:true,zoom:true,fallback:true});
 const serialized=lib.writeMexicoIndustryState(original,state);assert.deepEqual(lib.readMexicoIndustryState(serialized,ids),state);
 const back=lib.industryPopulationReturnUrl('/insight-journal/atlas/north-america/mexico/population/',original,state);
 assert.equal(back.origin,original.origin);assert.equal(back.pathname,'/insight-journal/atlas/north-america/mexico/population/');
 assert.equal(back.searchParams.get('view'),'population');assert.equal(back.searchParams.get('state'),'08');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');
 assert.equal(back.searchParams.has('metric'),false);assert.equal(back.searchParams.has('compare'),false);
 const pair=lib.industryComparisonUrl(original,state,'electronics');assert.equal(pair.searchParams.get('state'),'08');assert.equal(pair.searchParams.get('compare'),'electronics');assert.equal(pair.searchParams.has('sourceView'),false);
 assert.deepEqual(lib.readMexicoIndustryState(new URL('https://example.com/?state=33&metric=all&compare=bad&from=population&only=yes&sourceView=bad&zoom=true'),ids),{state:'05',metric:'transport',compare:null,sourceView:'density',from:'industry',only:false,zoom:false,fallback:false});
});
