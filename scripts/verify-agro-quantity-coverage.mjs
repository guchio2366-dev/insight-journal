import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {assessAgroQuantityCoverage} from '../src/lib/atlas-agro-quantity-coverage.ts';
import {existingAgroMarketingQuantities} from '../src/lib/atlas-agro-quantity-existing.ts';

const root=process.cwd(),args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const manifest=JSON.parse(await readFile(option('--manifest','src/data/atlas/agro-quantity-coverage.json'),'utf8'));
const local=(file)=>{if(path.isAbsolute(file)||file.split(/[\\/]/).includes('..'))throw Error('Source path must stay in this checkout: '+file);const resolved=path.resolve(root,file);if(!resolved.startsWith(root+path.sep))throw Error('Source path outside checkout');return resolved;};
const records=manifest.includeRetainedMarketingRecords?existingAgroMarketingQuantities():[];
for(const file of manifest.recordFiles??[]){
  const packet=JSON.parse(await readFile(local(file),'utf8'));
  const rows=Array.isArray(packet)?packet:packet.records;
  if(!Array.isArray(rows))throw Error('Expected normalized record array: '+file);
  records.push(...rows);
}
const assessment=assessAgroQuantityCoverage(manifest,records),hashes=new Map(),sourceErrors=[];
for(const record of records)for(const source of record.sources){
  try{
    const file=local(source.file);let actual=hashes.get(file);
    if(!actual){const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);actual=hash.digest('hex');hashes.set(file,actual);}
    if(actual!==source.sha256)sourceErrors.push(`${record.id}.${source.id}.file-sha256`);
  }catch(error){sourceErrors.push(`${record.id}.${source.id}.file: ${String(error)}`);}
}
const report={...assessment,dataGatePassed:assessment.dataGatePassed&&sourceErrors.length===0,normalizedRecords:records.length,sourceFilesHashed:hashes.size,sourceErrors,stage:'data-coverage-only',browserVerifiedByThisScript:false,publishedByThisScript:false};
const output=path.resolve(option('--out','review-artifacts/agro-statistics/coverage.json'));await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.dataGatePassed&&!args.includes('--report-only'))process.exitCode=1;
