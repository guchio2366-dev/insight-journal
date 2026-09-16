import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {readIndustryState,writeIndustryState} from '../../src/lib/atlas-industry-state.ts';
const raw=JSON.parse(await readFile('public/assets/atlas/industry-v1/state-economy.json','utf8'));
const bundled=await build({stdin:{contents:"export * from './src/data/atlas/industry-state-economy.ts'",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {industryStateComparison,stateEconomyValue}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
test('州・DCの全51地域を保存し、秘匿・欠測を合算しない',()=>{
 assert.equal(raw.states.length,51);assert.equal(new Set(raw.states.map(s=>s.id)).size,51);
 for(const field of Object.values(raw.fields)){
  assert.equal(field.rows.length,51);
  for(const row of field.rows){
   if(row.cells.some(c=>c.value===null))assert.equal(row.value,null);
   else assert.ok(Math.abs(row.value-row.cells.reduce((a,c)=>a+c.value,0))<1e-6);
   for(const cell of row.cells)if(cell.flag==='D'||cell.raw==='(D)')assert.equal(cell.value,null);
  }
 }
});
test('州の金額単位・面積・順位を揃え、製造細分類を維持する',()=>{
 for(const [id,code,count] of [['auto','3361',9],['aerospace','3364',34],['shipbuilding','3366',25],['railway','3365',9]]){
  const c=industryStateComparison('manufacturing',id);assert.deepEqual(c.codes,[code]);assert.equal(c.total,count);
  assert.equal(stateEconomyValue(1e6,c),'1');
  for(const p of c.points){assert.ok(Math.abs((p.radius/32)**2-p.value/c.max)<1e-10);assert.equal(p.rank,1+c.points.filter(q=>q.value>p.value).length);}
 }
 const service=industryStateComparison('services','information');assert.equal(service.total,51);assert.equal(stateEconomyValue(1000,service),'1');
 assert.equal(industryStateComparison('all','all'),null);assert.equal(industryStateComparison('manufacturing','all'),null);assert.equal(industryStateComparison('services','auto'),null);assert.equal(industryStateComparison('services','finance'),null);
});
test('州選択をURLへ往復し、分野切替で解除する',()=>{
 const u=new URL('https://example.com/?sector=manufacturing&subsector=auto&industryState=26');
 const s=readIndustryState(u);assert.equal(s.industryState,'26');assert.equal(writeIndustryState(u,s).searchParams.get('industryState'),'26');
 assert.equal(writeIndustryState(u,{sector:'all',subsector:'all',industryRegion:null,industryInsight:null}).searchParams.has('industryState'),false);
 assert.equal(readIndustryState(new URL('https://example.com/?sector=manufacturing&subsector=auto&industryState=99')).industryState,undefined);
});
