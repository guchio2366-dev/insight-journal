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

test('US sector hierarchy validates each supported Mexico field while retaining the original URL contract',()=>{
 assert.deepEqual(lib.mexicoIndustrySectors.map(s=>s.id),['all','manufacturing','resources','services','construction-real-estate']);
 const ids=data.states.map(s=>s.id),legacy=lib.readMexicoIndustryState(new URL('https://example.com/?state=14&metric=electronics&only=1'),ids);
 assert.equal(legacy.sector,undefined);assert.equal(legacy.subsector,undefined);
 for(const metric of lib.mexicoIndustryMetricChoices){
  const value={...legacy,sector:metric.sector,subsector:metric.id,metric:metric.id};
  const written=lib.writeMexicoIndustryState(new URL('https://example.com/?keep=yes'),value),restored=lib.readMexicoIndustryState(written,ids);
  assert.equal(restored.sector,metric.sector);assert.equal(restored.subsector,metric.id);assert.equal(restored.metric,metric.id);assert.equal(restored.state,'14');assert.equal(written.searchParams.get('keep'),'yes');
 }
 const mismatch=lib.readMexicoIndustryState(new URL('https://example.com/?sector=services&subsector=transport&metric=transport'),ids);
 assert.equal(mismatch.sector,'services');assert.equal(mismatch.subsector,'all');
 const invalid=lib.readMexicoIndustryState(new URL('https://example.com/?sector=other&subsector=aerospace&metric=aerospace'),ids);
 assert.equal(invalid.sector,undefined);assert.equal(invalid.metric,'transport');
});

test('The transport and electronics comparison rejects other fields while population comparisons retain them',()=>{
 const ids=data.states.map(s=>s.id);
 for(const choice of lib.mexicoIndustryMetricChoices){
  const supported=['transport','electronics'].includes(choice.id);
  const url=new URL(`https://example.com/?compare=electronics&state=14&metric=${choice.id}&sector=${choice.sector}&subsector=${choice.id}&only=1&zoom=1&fallback=1`);
  const state=lib.readMexicoIndustryState(url,ids);
  assert.equal(state.compare,supported?'electronics':null);assert.equal(state.metric,choice.id);
  assert.equal(state.sector,choice.sector);assert.equal(state.subsector,choice.id);assert.equal(state.state,'14');
  assert.equal(state.only,true);assert.equal(state.zoom,true);assert.equal(state.fallback,true);
  for(const target of [lib.writeMexicoIndustryState(url,{...state,compare:'electronics'}),lib.industryComparisonUrl(url,state,'electronics')]){
   assert.equal(target.searchParams.get('compare'),supported?'electronics':null);assert.equal(target.searchParams.get('metric'),choice.id);
   assert.equal(target.searchParams.get('state'),'14');assert.equal(target.searchParams.get('subsector'),choice.id);
  }
  const populationUrl=new URL(url);populationUrl.searchParams.set('compare','population');populationUrl.searchParams.set('from','population');populationUrl.searchParams.set('sourceState','09');populationUrl.searchParams.set('sourceView','population');
  const populationState=lib.readMexicoIndustryState(populationUrl,ids);
  assert.equal(populationState.compare,'population');assert.equal(populationState.metric,choice.id);
  assert.equal(populationState.sourceState,'09');assert.equal(populationState.sourceView,'population');assert.equal(populationState.from,'population');
 }
});

test('national industry entry remains unselected through category, zoom and comparison URL updates',()=>{
 const ids=data.states.map(s=>s.id),entry=new URL('https://example.com/industry/?only=1&zoom=1');
 const state=lib.readMexicoIndustryState(entry,ids);assert.equal(state.state,'');assert.equal(state.only,false);assert.equal(state.zoom,false);
 const category=lib.writeMexicoIndustryState(entry,{...state,sector:'resources',subsector:'mining'});assert.equal(category.searchParams.has('state'),false);
 const compare=lib.industryComparisonUrl(category,state,'population');assert.equal(compare.searchParams.has('state'),false);
});

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
 assert.deepEqual(state,{state:'08',sourceState:'08',metric:'electronics',compare:'population',sourceView:'population',from:'population',only:true,zoom:true,fallback:true});
 const serialized=lib.writeMexicoIndustryState(original,state);assert.deepEqual(lib.readMexicoIndustryState(serialized,ids),state);
 const back=lib.industryPopulationReturnUrl('/insight-journal/atlas/north-america/mexico/population/',original,state);
 assert.equal(back.origin,original.origin);assert.equal(back.pathname,'/insight-journal/atlas/north-america/mexico/population/');
 assert.equal(back.searchParams.get('view'),'population');assert.equal(back.searchParams.get('state'),'08');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');
 assert.equal(back.searchParams.has('metric'),false);assert.equal(back.searchParams.has('compare'),false);
 const pair=lib.industryComparisonUrl(original,state,'electronics');assert.equal(pair.searchParams.get('state'),'08');assert.equal(pair.searchParams.get('compare'),'electronics');assert.equal(pair.searchParams.has('sourceView'),false);assert.equal(pair.searchParams.has('sourceState'),false);
 assert.deepEqual(lib.readMexicoIndustryState(new URL('https://example.com/?state=33&sourceState=invalid&metric=all&compare=bad&from=population&only=yes&sourceView=bad&zoom=true'),ids),{state:'',sourceState:'',metric:'transport',compare:null,sourceView:'density',from:'industry',only:false,zoom:false,fallback:false});
});

test('Population returns keep the original state when the industry target changes and the URL is restored',()=>{
 const ids=data.states.map(s=>s.id),origin='https://example.com';
 for(const view of ['density','population']){
  const entered=new URL(`${origin}/insight-journal/atlas/north-america/mexico/industry/?compare=population&state=09&from=population&sourceView=${view}&only=1&fallback=1`);
  const changed={...lib.readMexicoIndustryState(entered,ids),state:'05'};
  const back=lib.industryPopulationReturnUrl('/insight-journal/atlas/north-america/mexico/population/',entered,changed);
  assert.equal(back.searchParams.get('state'),'09');
  assert.equal(back.searchParams.get('view'),view);assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');
  const saved=lib.writeMexicoIndustryState(entered,changed);
  assert.equal(saved.searchParams.get('state'),'05');assert.equal(saved.searchParams.get('sourceState'),'09');
  const restored=lib.readMexicoIndustryState(saved,ids);
  assert.equal(restored.state,'05');assert.equal(restored.sourceState,'09');
  assert.equal(lib.industryPopulationReturnUrl('/population/',saved,{...restored,state:'10'}).searchParams.get('state'),'09');
 }
});

test('National population source and its original extent survive independent industry selection',()=>{
 const ids=data.states.map(s=>s.id);
 for(const view of ['density','population']){
  const entered=new URL(`https://example.com/industry/?compare=population&from=population&sourceState=&sourceOnly=0&sourceView=${view}`);
  const original=lib.readMexicoIndustryState(entered,ids);
  assert.equal(original.sourceState,'');assert.equal(original.sourceOnly,false);
  const saved=lib.writeMexicoIndustryState(entered,{...original,state:'14',only:true,zoom:true});
  const restored=lib.readMexicoIndustryState(saved,ids);
  assert.equal(restored.sourceState,'');assert.equal(restored.sourceOnly,false);assert.equal(restored.state,'14');
  const back=lib.industryPopulationReturnUrl('/population/',saved,restored);
  assert.equal(back.searchParams.get('view'),view);assert.equal(back.searchParams.has('state'),false);assert.equal(back.searchParams.has('only'),false);
  const selectedUrl=new URL(entered);selectedUrl.searchParams.set('state','09');selectedUrl.searchParams.set('sourceState','09');selectedUrl.searchParams.set('sourceOnly','1');
  const selected=lib.readMexicoIndustryState(selectedUrl,ids);assert.equal(selected.sourceState,'09');assert.equal(selected.sourceOnly,true);
  const selectedBack=lib.industryPopulationReturnUrl('/population/',entered,{...selected,state:'05',only:false,sourceState:'09',sourceOnly:true});
  assert.equal(selectedBack.searchParams.get('state'),'09');assert.equal(selectedBack.searchParams.get('only'),'1');
 }
});

test('Industry camera zoom clamps to the national map and round-trips independently of source population query',()=>{
 const ids=data.states.map(s=>s.id),origin=new URL('https://example.com/industry/?compare=population&from=population&sourceState=&sourceOnly=0');
 let frame=[0,0,900,580];for(let i=0;i<20;i++)frame=lib.zoomMexicoIndustryFrame(frame,'in');
 assert.equal(frame[2],180);assert.equal(frame[3],116);assert.ok(frame[0]>=0&&frame[1]>=0);
 assert.deepEqual(lib.industryCameraFrame([-80,10000,600,400]),[0,193.333,600,386.667]);
 const query='?view=population&reading=overview&frame=120,80,600,400';
 const state={...lib.readMexicoIndustryState(origin,ids),frame,sourcePopulationQuery:query};
 const saved=lib.writeMexicoIndustryState(origin,state),restored=lib.readMexicoIndustryState(saved,ids);
 assert.deepEqual(restored.frame,frame);
 const back=lib.industryPopulationReturnUrl('/population/',saved,restored);
 assert.equal(back.pathname,'/population/');assert.equal(back.searchParams.get('frame'),'120,80,600,400');assert.equal(back.searchParams.get('reading'),'overview');assert.equal(back.searchParams.has('industryFrame'),false);
 for(const invalid of ['https://elsewhere.example/?view=population','//elsewhere.example/?view=population','?view=invalid','?view=density&state=99'])assert.equal(lib.industryPopulationSourceQuery(invalid),null);
 assert.deepEqual(lib.zoomMexicoIndustryFrame(frame,'fit'),[0,0,900,580]);
 const reset=lib.writeMexicoIndustryState(saved,{...restored,frame:undefined});assert.equal(reset.searchParams.has('industryFrame'),false);
});
