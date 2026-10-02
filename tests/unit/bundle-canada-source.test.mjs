import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';

async function withSource(files,verify){
 const temporaryRoot=path.resolve(tmpdir());
 const directory=await mkdtemp(path.join(temporaryRoot,'canada-source-bundle-'));
 try{
  for(const [name,contents] of Object.entries(files))await writeFile(path.join(directory,name),contents);
  await verify(path.join(directory,'entry.ts'));
 }finally{
  assert.equal(path.dirname(path.resolve(directory)),temporaryRoot);
  await rm(directory,{recursive:true,force:true});
 }
}

test('Canada fixture bundles the real lazy MapLibre dependency from a local source module',async()=>{
 await withSource({
  'entry.ts':"export {probe} from './local';",
  'local.ts':"export async function probe(){const {LngLat,getVersion}=await import('maplibre-gl');return {version:getVersion(),coordinates:new LngLat(-75,45).toArray()};}",
 },async entry=>{
  const code=await bundleCanadaSource(entry,{format:'esm'});
  const {probe}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  assert.deepEqual(await probe(),{version:'6.9.0',coordinates:[-75,45]});
 });
});

for(const nested of [false,true])test(`Canada fixture rejects unapproved bare imports in ${nested?'local modules':'the entry'}`,async()=>{
 await withSource(nested?{
  'entry.ts':"import './local';",
  'local.ts':"import 'happy-dom';",
 }:{'entry.ts':"import 'happy-dom';"},async entry=>{
  await assert.rejects(bundleCanadaSource(entry,{logLevel:'silent'}),/Expected a local source import: happy-dom/);
 });
});
