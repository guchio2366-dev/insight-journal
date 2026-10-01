import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {calculatePayloadHash} from '../../src/lib/publication/serialize.ts';
import {loadAllPublicContent} from '../../scripts/lib/content.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const cropDir='assets/atlas/oceania-crops-v1';
async function fixture(){
 const dir=await mkdtemp(path.join(os.tmpdir(),'oceania-release-boundary-'));
 const put=async(name,raw)=>{const f=path.join(dir,name);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,raw);};
 const entries=(await loadAllPublicContent(root)).filter(x=>x.kind==='article');
 await put('_release.json',JSON.stringify({commitSha:'local',builtAt:'2026-10-01T00:00:00Z',articles:entries.map(({payload:p})=>({publicId:p.publicId,revision:p.revision,payloadHash:calculatePayloadHash(p)}))}));
 await put('pagefind/pagefind.js','console.log("public fixture")');
 for(const {payload:p} of entries){await put('articles/'+p.slug+'/index.html','<main>Public article</main>');if(p.geography.mode==='map')await put(p.geography.image.path,'<svg/>');}
 await put(cropDir+'/manifest.json',await readFile(path.join(root,'public',cropDir,'manifest.json')));
 await put(cropDir+'/wheat.values.gz',await readFile(path.join(root,'public',cropDir,'wheat.values.gz')));
 const run=()=>spawnSync(process.execPath,[path.join(root,'scripts/verify-release.mjs'),'--dir',dir],{cwd:root,encoding:'utf8'});
 const clean=async()=>{const absolute=path.resolve(dir),base=path.resolve(os.tmpdir())+path.sep;assert.ok(absolute.startsWith(base)&&path.basename(absolute).startsWith('oceania-release-boundary-'));await rm(absolute,{recursive:true,force:true});};
 return {dir,put,run,clean};
}
test('trusted wheat passes the wired release check while every text privacy rule remains active',async()=>{
 const f=await fixture();try{
  assert.equal(f.run().status,0);
  for(const [extension,content,expected] of [
   ['json',JSON.stringify({id:'a'.repeat(32)}),'Notion形式のID'],
   ['html','<p>'+('a'.repeat(32))+'</p>','Notion形式のID'],
   ['txt','PRIVATE_SENTINEL','PRIVATE_SENTINEL'],
   ['txt','https://app.notion.com/p/'+('a'.repeat(32)),'Notion URL'],
   ['txt','https://chatgpt.com/share/public-fixture','ChatGPT共有URL']]){
   const file=cropDir+'/untrusted.'+extension;await f.put(file,content);const r=f.run();assert.notEqual(r.status,0);assert.ok(r.stderr.includes(expected),r.stderr);await rm(path.join(f.dir,file));
  }
 }finally{await f.clean();}
});
test('other directories, unlisted names and changed numeric bytes cannot receive the exception',async()=>{
 const f=await fixture();try{
  const original=await readFile(path.join(root,'public',cropDir,'wheat.values.gz'));
  for(const name of ['assets/atlas/untrusted/wheat.values.gz',cropDir+'/notes.values.gz']){await f.put(name,original);const r=f.run();assert.notEqual(r.status,0);assert.ok(r.stderr.includes('Notion形式のID'),r.stderr);await rm(path.join(f.dir,name));}
  const changed=Buffer.from(original);changed[20]^=1;await f.put(cropDir+'/wheat.values.gz',changed);const r=f.run();assert.notEqual(r.status,0);assert.ok(r.stderr.includes('Pinned Oceania numeric asset hash mismatch'),r.stderr);
 }finally{await f.clean();}
});
