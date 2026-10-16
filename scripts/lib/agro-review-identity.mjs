import assert from 'node:assert/strict';
import {readFile,lstat,readlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';

/** A local working-tree capture is useful evidence, but must never masquerade
 * as a reviewed commit or a published release. Final CI keeps exact-SHA mode. */
export async function verifyAgroReviewIdentity(report){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const release=JSON.parse(await readFile(path.resolve('dist/_release.json'),'utf8'));
 const status=execFileSync('git',['status','--porcelain','--untracked-files=all'],{encoding:'utf8'}).trim();
 const inputStatus=execFileSync('git',['status','--porcelain','--untracked-files=all','--','src','public','scripts','tests','data-source','package.json','package-lock.json','astro.config.mjs','astro.config.ts','tsconfig.json','.nvmrc'],{encoding:'utf8'}).trim();
 const candidates=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(Boolean);
 const inputs=[...new Set(candidates)].filter(file=>/^(src|public|scripts|tests|data-source)\//.test(file)||/^(package(-lock)?\.json|astro\.config\.[cm]?[jt]s|tsconfig\.json|\.nvmrc)$/.test(file)).sort();
 const hash=createHash('sha256');
 for(const file of inputs){
  let digest;
  try{const info=await lstat(file);const bytes=info.isSymbolicLink()?Buffer.from(await readlink(file)):await readFile(file);digest=createHash('sha256').update(bytes).digest('hex');}
  catch(error){if(error.code!=='ENOENT')throw error;digest='deleted';}
  hash.update(file+'\0'+digest+'\n');
 }
 const worktree=process.env.AGRO_REVIEW_ALLOW_WORKTREE==='1';
 if(worktree)assert.equal(release.commitSha,'local','Working-tree preview requires an honestly labelled local build');
 else{assert.equal(release.commitSha,head,'Build must match the exact reviewed commit');assert.equal(inputStatus,'','Exact-commit review requires unchanged application, test and source inputs');}
 report.sourceIdentity={mode:worktree?'local-working-tree':'exact-commit',baseHead:head,buildIdentity:release.commitSha,workingTreeDirty:!!status,applicationInputsDirty:!!inputStatus,inputFiles:inputs.length,workingTreeSha256:hash.digest('hex'),publishedRelease:false};
 return report.sourceIdentity;
}

/** Inspect the running browser, rather than treating a launch option as proof. */
export async function verifyAgroBrowserSandbox(browser,report){
 const page=await browser.newPage();
 try{
  await page.goto('chrome://sandbox');const status=await page.locator('body').innerText();
  assert.match(status,/Layer 1 Sandbox\s+Namespace/);
  assert.match(status,/PID namespaces\s+Yes/);
  assert.match(status,/Network namespaces\s+Yes/);
  assert.match(status,/Seccomp-BPF sandbox\s+Yes/);
  assert.match(status,/adequately sandboxed/);
  report.runtimeSandbox={browserVersion:browser.version(),status,verified:true};
 }finally{await page.close();}
}
