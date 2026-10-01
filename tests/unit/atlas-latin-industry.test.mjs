import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,copyFile,access,rm} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {decodeWdiValue,prepareLatinIndustry} from '../../scripts/prepare-latin-industry.mjs';
import {industryLibrary} from './atlas-latin-industry-helpers.mjs';
import {Window} from 'happy-dom';
const data=JSON.parse(await readFile('src/data/atlas/latin-america/industry.json','utf8'));
const sourceDir='data-source/atlas/latin-america/industry';
const assets='public/assets/atlas/latin-industry-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');

test('2024 export shares retain original country/year/indicator values with no year mixing or scale inference',async()=>{
 assert.equal(data.referenceYear,2024);assert.equal(data.rows.length,34);
 assert.equal(new Set(data.rows.map(r=>r.country)).size,34);
 for(const metric of data.metrics){
  const raw=JSON.parse(await readFile(`${sourceDir}/${metric.id}-all-2023-2024.json`,'utf8'));
  assert.equal(raw[0].pages,1);assert.equal(raw[0].total,raw[1].length);
  for(const row of data.rows){const original=raw[1].find(r=>r.countryiso3code===row.country&&r.date==='2024');const value=row.values[metric.id];
   assert.equal(row.year,2024);assert.equal(value.value,original?.value??null);assert.equal(value.sourceValue,original?.value??null);
   if(original)assert.equal(original.indicator.id,metric.indicator);
   assert.equal('dollars' in value,false);assert.equal('gdp' in value,false);
  }
  assert.deepEqual(data.statusCounts[metric.id],{value:24,zero:0,missing:9,notCovered:1});
 }
 assert.equal(data.rows.find(r=>r.country==='CHL').values.ores.value,56.1402892229553);
 assert.equal(data.rows.find(r=>r.country==='CRI').values.manufactures.value,64.8602779613311);
 assert.equal(data.rows.find(r=>r.country==='DOM').values.manufactures.value,58.15363861978);
 assert.equal(data.rows.find(r=>r.country==='PRI').values.ores.status,'missing');
 assert.equal(data.rows.find(r=>r.country==='FLK').values.ores.status,'notCovered');
});

test('Numeric zero, API null and absent coverage cannot silently collapse or become confidential',()=>{
 assert.equal(decodeWdiValue({value:0}).status,'zero');assert.equal(decodeWdiValue({value:0}).value,0);
 assert.equal(decodeWdiValue({value:null}).status,'missing');assert.equal(decodeWdiValue(undefined).status,'notCovered');
 assert.throws(()=>decodeWdiValue({value:''}));assert.throws(()=>decodeWdiValue({value:-1}));assert.throws(()=>decodeWdiValue({value:101}));
 assert.throws(()=>decodeWdiValue({value:NaN}));
 assert.equal(data.rows.some(r=>Object.values(r.values).some(v=>v.status==='confidential')),false);
});

test('Source→normalization→public CSV SHA ledger and individual licence evidence are complete',async()=>{
 const manifest=JSON.parse(await readFile(`${assets}/manifest.json`,'utf8'));
 assert.equal(manifest.records,68);assert.equal(manifest.year,2024);
 for(const artifact of manifest.sourceFiles){const bytes=await readFile(`${sourceDir}/${artifact.file}`);assert.equal(bytes.length,artifact.bytes);assert.equal(sha(bytes),artifact.sha256);}
 const normalized=await readFile(manifest.normalized.file);assert.equal(sha(normalized),manifest.normalized.sha256);
 for(const artifact of manifest.published){const bytes=await readFile(`${assets}/${artifact.file}`);assert.equal(bytes.length,artifact.bytes);assert.equal(sha(bytes),artifact.sha256);}
 assert.deepEqual(await readFile(`${assets}/industry-selected-2024.csv`),await readFile(`${sourceDir}/industry-selected-2024.csv`));
 for(const id of ['ores','manufactures']){const glossary=await readFile(`${sourceDir}/${id}-glossary.html`,'utf8');assert.match(glossary,/CC BY-4\.0/);assert.match(glossary,/SITC/);}
 assert.equal(data.source.licence,'CC BY 4.0');assert.match(data.source.attribution,/UN Comtrade/);assert.match(data.notes.classification,/非鉄金属/);
 const facts=JSON.parse(await readFile(`${sourceDir}/reading-facts.json`,'utf8'));
 assert.deepEqual(manifest.sourceFiles.map(a=>a.file),[...facts.retainedFiles].sort());
 assert.equal(manifest.nonRetainedSnapshots.length,4);
 for(const snapshot of manifest.nonRetainedSnapshots){
  assert.equal(snapshot.retainedInCurrentPublicTree,false);assert.match(snapshot.sha256,/^[a-f0-9]{64}$/);assert.equal(snapshot.retrievedDate,'2026-10-01');
  assert.equal(manifest.sourceFiles.some(a=>a.file===snapshot.file),false);
  try{const original=await readFile(`${sourceDir}/${snapshot.file}`);assert.equal(sha(original),snapshot.sha256);assert.equal(original.length,snapshot.bytes);}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 assert.match(manifest.historicalRetentionNote,/earlier Git history/);
 const panama=facts.articles.find(a=>a.id==='panama-canal-fy2024');assert.equal(panama.quantitativeFacts[0].value,9944);assert.equal(panama.quantitativeFacts[1].value,-21);
});

test('A retained-input-only checkout regenerates the identical manifest and values without any article HTML',async()=>{
 const root=path.resolve(process.cwd()),temporary=await mkdtemp(path.join(root,'.latin-industry-regen-test-'));
 try{
  const facts=JSON.parse(await readFile(`${sourceDir}/reading-facts.json`,'utf8'));
  await mkdir(path.join(temporary,sourceDir),{recursive:true});await mkdir(path.join(temporary,'src/data/atlas'),{recursive:true});
  await copyFile('src/data/atlas/regional-countries.json',path.join(temporary,'src/data/atlas/regional-countries.json'));
  for(const file of facts.retainedFiles)await copyFile(`${sourceDir}/${file}`,path.join(temporary,sourceDir,file));
  for(const article of facts.articles)await assert.rejects(access(path.join(temporary,sourceDir,article.originalSnapshot.file)),{code:'ENOENT'});
  await prepareLatinIndustry(temporary);
  assert.deepEqual(await readFile(path.join(temporary,assets,'manifest.json')),await readFile(`${assets}/manifest.json`));
  assert.deepEqual(await readFile(path.join(temporary,'src/data/atlas/latin-america/industry.json')),await readFile('src/data/atlas/latin-america/industry.json'));
  assert.deepEqual(await readFile(path.join(temporary,assets,'industry-selected-2024.csv')),await readFile(`${assets}/industry-selected-2024.csv`));
 }finally{
  const resolved=path.resolve(temporary);assert.equal(path.dirname(resolved),root);assert.ok(path.basename(resolved).startsWith('.latin-industry-regen-test-'));
  await rm(resolved,{recursive:true,force:true});
 }
});

test('Both export classifications share bins; only mode preserves the complete geographic context',async()=>{
 const lib=await industryLibrary(),w=new Window();try{
  for(const layer of ['ores','manufactures']){
   w.document.body.innerHTML=lib.renderLatinIndustryMap({layer,place:'DOM',scope:'central',only:true},`test-${layer}`);
   assert.equal(w.document.querySelectorAll('[data-industry-context] path').length,34);
   assert.equal(w.document.querySelectorAll('[data-industry-country]').length,1);
   const shape=w.document.querySelector('[data-industry-country=DOM]'),value=data.rows.find(r=>r.country==='DOM').values[layer];
   assert.equal(shape.getAttribute('fill'),lib.latinIndustryColor(value.value,value.status));assert.equal(shape.dataset.status,value.status);
   assert.equal(shape.getAttribute('aria-pressed'),'true');assert.match(shape.querySelector('title').textContent,/2024/);
   assert.equal(w.document.querySelector('svg').getAttribute('viewBox'),'0 0 900 580');
  }
  assert.equal(lib.renderLatinIndustryLegend('ores'),lib.renderLatinIndustryLegend('manufactures'));
  assert.notEqual(lib.latinIndustryColor(null,'missing'),lib.latinIndustryColor(null,'notCovered'));
  assert.notEqual(lib.latinIndustryColor(0,'zero'),lib.latinIndustryColor(null,'missing'));
  assert.equal(lib.formatLatinIndustryValue(0,'zero'),'0%');assert.equal(lib.formatLatinIndustryValue(.001,'value'),'0.05%未満');
  for(const scope of ['all','central','south','country']){
   const state={layer:'ores',place:'CHL',scope,only:true};w.document.body.innerHTML=lib.renderLatinIndustryMap(state,`scope-${scope}`);
   assert.equal(w.document.querySelector('[data-industry-context]').getAttribute('transform'),lib.latinMapLayout(scope,'CHL').transform);
   assert.equal(w.document.querySelector('[data-industry-values]').getAttribute('transform'),lib.latinMapLayout(scope,'CHL').transform);
  }
 }finally{await w.happyDOM.close();}
});

test('Shared comparison codec retains original indicator, country, scope, only and fallback for a targeted return',async()=>{
 const lib=await industryLibrary();
 const original={field:'population',layer:'population',place:'CRI',scope:'central',only:true,fallback:true};
 const target=lib.latinComparisonState(original,'industry','manufactures');
 const query=lib.writeLatinLearningState(target),restored=lib.readLatinLearningState(query,'industry',['ores','manufactures','canal'],'ores');
 assert.deepEqual(restored,target);
 const back=new URL(lib.latinSourceReturnUrl('/insight-journal/atlas/latin-america/',restored),'https://example.com');
 assert.equal(back.pathname,'/insight-journal/atlas/latin-america/population/');assert.equal(back.searchParams.get('layer'),'population');
 assert.equal(back.searchParams.get('place'),'CRI');assert.equal(back.searchParams.get('scope'),'central');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');assert.equal(back.searchParams.has('from'),false);
 assert.equal(lib.readLatinLearningState('place=EVIL&layer=gdp&scope=country&only=1','industry',['ores','manufactures'],'ores').place,'all');
});
