import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const directory='data-source/atlas/mexico/population-composition';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const data=read('src/data/atlas/mexico/population-composition.json');
const basic=read(`${directory}/ethnicity-basic-state-extract.json`);
const identity=read(`${directory}/indigenous-identity-state-extract.json`);
const religion=read(`${directory}/religion-state-extract.json`);
const population=read('src/data/atlas/mexico/population.json');
const metric=id=>data.metrics.find(row=>row.id===id);
const codes=Array.from({length:32},(_,index)=>String(index+1).padStart(2,'0'));

test('composition preserves 32 official states and the three different ethnicity populations',()=>{
 assert.equal(data.metrics.length,11);
 for(const profile of data.metrics)assert.deepEqual(Object.keys(profile.states).sort(),codes);
 assert.equal(metric('indigenous_language').nationalCount,7364645);
 assert.equal(metric('indigenous_language').nationalDenominator,119976584);
 assert.equal(metric('afro_identity').nationalCount,2576213);
 assert.equal(metric('afro_identity').nationalDenominator,126014024);
 assert.equal(metric('indigenous_identity_estimate').nationalCount,23229089);
 assert.equal(metric('indigenous_identity_estimate').nationalDenominator,119692898);
 assert.equal(metric('indigenous_identity_estimate').isEstimate,true);
 assert.notEqual(metric('indigenous_identity_estimate').nationalDenominator,metric('indigenous_language').nationalDenominator);
});

test('every ethnic count, denominator and nonresponse is the original official extraction',()=>{
 for(const [id,dataset,key] of [
  ['indigenous_language',basic,'indigenousLanguageAge3Plus'],
  ['afro_identity',basic,'afroMexicanSelfIdentificationAllAges'],
  ['indigenous_identity_estimate',identity,'indigenousSelfIdentificationAge3PlusPrivateDwellings'],
 ])for(const state of dataset.states){
  const original=state[key],published=metric(id).states[state.stateCode];
  assert.equal(published.count,original.count);
  assert.equal(published.denominator,original.denominator);
  assert.equal(published.unknownCount,original.unspecifiedCount);
  assert.deepEqual(published.sourceCells,original.sourceCells);
  assert.equal(published.count+(original.doesNotSpeakCount ?? original.doesNotIdentifyCount)+published.unknownCount,published.denominator);
 }
});

test('sample confidence intervals remain from the same INPI table rather than derived counts',()=>{
 for(const state of identity.states){
  const original=state.indigenousSelfIdentificationAge3PlusPrivateDwellings;
  const published=metric('indigenous_identity_estimate').states[state.stateCode];
  assert.deepEqual(published.confidenceInterval90,original.percentageConfidenceInterval90);
  assert.deepEqual(published.countConfidenceInterval90,original.countConfidenceInterval90);
  assert.equal(published.countCVPercentage,original.countCVPercentage);
  const share=100*published.count/published.denominator;
  assert.ok(published.confidenceInterval90.lower<=share&&share<=published.confidenceInterval90.upper);
 }
});

test('religious leaves form eight exhaustive categories with nonresponse retained',()=>{
 const definitions={catholic:['catholic'],protestant_evangelical:['protestant_evangelical'],no_religion:['no_religion'],unaffiliated_believer:['unaffiliated_believer'],jewish:['jewish'],islamic:['islamic'],other_religions_combined:['ethnic_roots','afro_roots','spiritualist','other_religions'],religion_unspecified:['unspecified']};
 for(const original of religion){
  let total=0;
  for(const [id,keys] of Object.entries(definitions)){
   const row=metric(id).states[original.entityCode];
   assert.equal(row.count,keys.reduce((sum,key)=>sum+original[key],0));
   assert.equal(row.denominator,original.populationTotal);
   assert.equal(row.denominator,population.states.find(state=>state.stateCode===original.entityCode).population);
   assert.equal(row.unknownCount,original.unspecified);
   total+=row.count;
  }
  assert.equal(total,original.populationTotal);
 }
 assert.equal(metric('other_religions_combined').nationalCount,181311);
 assert.equal(metric('religion_unspecified').nationalCount,491814);
});

test('published files and original source bytes match the composition provenance',()=>{
 const root='public/assets/atlas/mexico-population-composition-v1';
 const manifest=read(`${root}/manifest.json`);
 for(const artifact of manifest.sourceArtifacts){
  const bytes=readFileSync(`${directory}/${artifact.file}`);
  assert.equal(bytes.length,artifact.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);
 }
 for(const artifact of Object.values(manifest.generated)){
  const bytes=readFileSync(`${root}/${artifact.file}`);
  assert.equal(bytes.length,artifact.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);
 }
 assert.deepEqual(read(`${root}/composition-2020.json`),data);
 assert.equal(manifest.validation.metrics,11);
 assert.equal(manifest.groundwaterIncluded,false);
 assert.ok(!manifest.sourceArtifacts.some(row=>/inpi.*\.xlsx/i.test(row.file)));
});
