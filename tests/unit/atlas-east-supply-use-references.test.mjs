import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const retained=JSON.parse(readFileSync('src/data/atlas/east-asia-supply-use-references.json'));
const compiled=await build({entryPoints:['src/scripts/atlas-east-supply-use-references.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {eastSupplyUseReference,renderEastSupplyUseReference}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const source=readFileSync('scripts/data/wasde0926.txt'),text=source.toString();

test('four East references retain same-report national and World rows, processing stage, period and raw precision',()=>{
 assert.equal(retained.records.length,4);
 assert.deepEqual(retained.records.map(r=>[r.countryCode,r.seriesId]),[['KOR','maize-production'],['CHN','rice-milled-production'],['KOR','rice-milled-production'],['CHN','cotton-lint-production']]);
 const columns={22:['beginningStocks','production','imports','feed','domesticUse','exports','endingStocks'],24:['beginningStocks','production','imports','domesticUse','exports','endingStocks'],26:['beginningStocks','production','imports','domesticUse','exports','lossAdjustment','endingStocks']};
 for(const row of retained.records){
  assert.equal(createHash('sha256').update(source).digest('hex'),row.source.sha256);
  assert.ok(text.includes(row.rawLine));assert.ok(text.includes(row.worldRawLine));
  const page=text.split('WASDE - 675 - '+row.source.page)[1].split('WASDE - 675 - ')[0].split('2024/25')[1].split('2025/26')[0];
  assert.ok(page.includes(row.rawLine));assert.ok(page.includes(row.worldRawLine));
  assert.deepEqual(row.rawLine.trim().split(/\s{2,}/).slice(1),columns[row.source.page].map(k=>row.rawValues[k]));
  for(const key of columns[row.source.page])assert.equal(row[key],Number(row.rawValues[key]));
  assert.equal(row.worldProduction,Number(row.worldProductionRawValue));
  assert.equal(row.year,'2024/25');assert.equal(row.periodType,'publisher-marketing-year');assert.equal(row.periodStart,null);assert.equal(row.periodEnd,null);
  assert.equal(row.exportDestinations,null);
  assert.ok(Math.abs(row.beginningStocks+row.production+row.imports-row.domesticUse-row.exports-row.endingStocks-(row.lossAdjustment??0)-row.roundingGap)<1e-9);
 }
 assert.equal(eastSupplyUseReference('CHN','rice').worldProduction,542.30);
 assert.equal(eastSupplyUseReference('CHN','rice').production,145.28);
 assert.equal(eastSupplyUseReference('CHN','cotton').unit,'百万480lb俵');
 assert.equal(eastSupplyUseReference('CHN','cotton').production,32);
});

test('Korean corn keeps published domestic use/feed and rounded exports rather than a harvest subtraction or exact-zero ratio',async()=>{
 const row=eastSupplyUseReference('KOR','maize');
 assert.equal(row.production,.09);assert.equal(row.imports,11.44);assert.equal(row.domesticUse,11.45);assert.equal(row.feed,9.25);
 assert.notEqual(row.domesticUse,row.production-row.exports);
 assert.equal(row.exportsRoundedZero,true);assert.equal(row.rawValues.exports,'0.00');assert.equal(row.roundingGap,-.01);
 const window=new Window();try{
  const host=window.document.createElement('div');renderEastSupplyUseReference(host,'maize','KOR');
  assert.equal(host.firstElementChild.tagName,'DETAILS');assert.equal(host.firstElementChild.open,false);
  assert.match(host.textContent,/輸出 0\.00 は公表丸め値.*厳密なゼロ/s);
  assert.match(host.textContent,/飼料 9\.25 百万t は国内利用 11\.45 の内数/);
  assert.doesNotMatch(host.textContent,/生産との数量比 0\.00%/);
  assert.equal(host.querySelectorAll('.agro-track').length,2);
  assert.equal(host.querySelectorAll('.agro-track>span').length,6,'feed is not double-counted in either balance');
  assert.match(host.textContent,/−0\.01|\-0\.01/);
 }finally{await window.happyDOM.close();}
});

test('rice and cotton remain explicit alternate bases; references neither alias QCL nor invent matching partner quantities',async()=>{
 const window=new Window();try{
  for(const [country,topic] of [['CHN','rice'],['KOR','rice'],['CHN','cotton']]){
   const host=window.document.createElement('div');renderEastSupplyUseReference(host,topic,country,false);
   assert.equal(host.firstElementChild.tagName,'SECTION');assert.equal(host.querySelector('summary'),null);
   assert.match(host.textContent,topic==='rice'?/①のQCL籾米/:/①のQCL種子綿/);
   assert.match(host.textContent,/期間・製品基準が異なる参考/);
   assert.match(host.textContent,/同販売年度・同製品の全相手数量は未収録/);
   assert.match(host.querySelector('a').href,/wasde0926\.txt$/);
  }
  for(const [country,topic] of [['JPN','rice'],['TWN','rice'],['PRK','maize'],['MNG','maize'],['CHN','overview'],['CHN','rice-production']])assert.equal(eastSupplyUseReference(country,topic),undefined);
  const first=eastSupplyUseReference('KOR','rice');first.domesticUse=0;assert.equal(eastSupplyUseReference('KOR','rice').domesticUse,4.25);
 }finally{await window.happyDOM.close();}
});

test('regional extraction is reproducible and rejects modified source bytes',()=>{
 const result=execFileSync('python',['-c',"import importlib.util,json,pathlib; p=pathlib.Path('scripts/east-asia/prepare-supply-use-references.py'); s=importlib.util.spec_from_file_location('east_supply',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); raw=pathlib.Path(m.SOURCE).read_bytes(); print(json.dumps(m.parse(raw),ensure_ascii=False));\ntry: m.parse(raw+b'changed')\nexcept ValueError: pass\nelse: raise AssertionError('modified source accepted')"],{encoding:'utf8'});
 assert.deepEqual(JSON.parse(result),retained);
});
