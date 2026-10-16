#!/usr/bin/env node
/** Run each regional owner's cloud-only browser checks against one fixed build.
 * No browser installation, sandbox changes, external desktop or release action. */
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {verifyAgroReviewIdentity} from './lib/agro-review-identity.mjs';

const root=resolve(process.env.AGRO_REVIEW_ROOT??'review-artifacts/all-region-agro');
const selected=new Set(process.argv.slice(2));
const entries=[
 ['us','scripts/capture-us-agro-residuals-review.mjs'],
 ['canada','scripts/capture-canada-agro-statistics-review.mjs'],
 ['mexico','scripts/capture-mexico-agro-statistics.mjs'],
 ['europe','scripts/europe/capture-selected-quantity-flow-review.mjs'],
 ['east-asia','scripts/east-asia/capture-selected-quantities.mjs'],
 ['southeast-asia','scripts/verify-southeast-agro-statistics-pc.mjs'],
 ['south-asia','scripts/capture-south-asia-agro-review.mjs'],
 ['central-asia','scripts/verify-central-asia-agro.mjs'],
 ['west-asia','scripts/capture-west-asia-agro-residuals-review.mjs'],
 ['africa','scripts/verify-africa-agro-review.mjs'],
 ['oceania','tests/browser/atlas-oceania-agro-trade.mjs'],
 ['latin-america','scripts/verify-latin-agro-quantity.mjs'],
 ['russia','scripts/verify-russia-agro-review.mjs'],
].filter(([region])=>!selected.size||selected.has(region));
if(!entries.length)throw new Error('No matching regional review');
await mkdir(root,{recursive:true});
const report={startedAt:new Date().toISOString(),status:'running',manualImageReview:'not-performed',regions:[]};
await verifyAgroReviewIdentity(report);
const chrome=process.env.AGRO_REVIEW_CHROME_PATH??process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium';
const env={...process.env,REVIEW_CHROME_PATH:chrome,CHROME_PATH:chrome,SOUTHEAST_AGRO_CHROME_PATH:chrome,RUSSIA_AGRO_CHROME_PATH:chrome,OCEANIA_AGRO_CHROME_PATH:chrome};
async function run([region,script]){
 const output=resolve(root,region);await mkdir(output,{recursive:true});
 const logPath=resolve(output,'execution.log'),log=createWriteStream(logPath);
 console.log(`start ${region}`);
 const child=spawn(process.execPath,[script],{env:{...env,AGRO_REVIEW_OUTPUT:output},stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 let launchError;
 const exitCode=await new Promise(done=>{child.on('error',error=>{launchError=String(error);done(1);});child.on('close',code=>done(code??1));});
 await new Promise(done=>log.end(done));
 const result={region,script,exitCode,log:logPath,output,...(launchError?{launchError}:{})};
 for(const file of await readdir(output)){
  if(!file.endsWith('.json'))continue;
  try{const detail=JSON.parse(await readFile(resolve(output,file),'utf8'));if(!detail.sourceIdentity)continue;
   result.report=resolve(output,file);result.status=detail.status;result.sourceIdentity=detail.sourceIdentity;result.runtimeSandbox=detail.runtimeSandbox;
   const cases=detail.cases??detail.checks??detail.operations??detail.scenes??detail.captures??detail.results??[];
   result.cases=Array.isArray(cases)?cases.length:typeof cases==='object'?Object.keys(cases).length:null;
   result.screenshots=(await readdir(output)).filter(file=>file.endsWith('.png')).length;
   result.error=detail.error??detail.failure??detail.blocker??detail.errors;
  }catch(error){result.reportReadError=String(error);}
 }
 result.identityMatches=result.sourceIdentity?.workingTreeSha256===report.sourceIdentity.workingTreeSha256;
 result.passed=exitCode===0&&result.runtimeSandbox?.verified===true&&result.identityMatches;
 report.regions.push(result);
 await writeFile(resolve(root,'browser-summary.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`finish ${region}: ${result.passed?'passed':'failed'} (exit ${exitCode})`);
}
let next=0;
await Promise.all(Array.from({length:Math.min(2,entries.length)},async()=>{while(next<entries.length)await run(entries[next++]);}));
report.finishedAt=new Date().toISOString();report.status=report.regions.every(region=>region.passed)?'passed':'failed';
await writeFile(resolve(root,'browser-summary.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,regions:report.regions.length,report:resolve(root,'browser-summary.json')}));
if(report.status!=='passed')process.exitCode=1;
