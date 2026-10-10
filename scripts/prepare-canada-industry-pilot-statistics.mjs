/** Re-extract only the pilot's additional indicators from the already held 2021 CSVs. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseCsv} from './prepare-mexico-industry.mjs';
const dir='public/assets/atlas/canada-industry-parity-v1/',out='data-source/atlas/canada/industry/pilot/';
const base=JSON.parse(await readFile('src/data/atlas/canada/industry-parity.json','utf8'));
const gdpBytes=await readFile(dir+'gdp-2021.csv.gz'),empBytes=await readFile(dir+'employment-2021.csv.gz'),gdp=parseCsv(gunzipSync(gdpBytes).toString()),emp=parseCsv(gunzipSync(empBytes).toString());
const metrics=[],selected=[];
for(const [id,label,code]of [['refining','石油・石炭製品製造','324'],['transport','運輸・倉庫','48-49']]){
 const rows=gdp.filter(r=>r.REF_DATE==='2021'&&r.Prices==='Current dollars'&&r['North American Industry Classification System (NAICS)'].endsWith('['+code+']'));assert.equal(rows.length,13);
 for(const r of rows){assert.equal(r.SCALAR_FACTOR,'millions');assert.equal(r.UOM,'Dollars');assert.equal(r.STATUS,'');assert.equal(r.SYMBOL,'');assert(r.VALUE.trim());}
 const provinces=base.metrics[0].provinces.map(p=>({...p,gdp:Number(rows.find(r=>r.GEO===p.id).VALUE)}));let employment=null;
 if(id==='transport'){const row=emp.filter(r=>r.GEO==='Canada'&&r['North American Industry Classification System (NAICS)'].endsWith('[48-49]'));assert.equal(row.length,1);assert.equal(row[0].STATUS,'');assert.equal(row[0].SYMBOL,'');assert.equal(row[0].UOM,'Persons in thousands');employment=Number(row[0].VALUE);}
 metrics.push({id,label,sector:id==='refining'?'manufacturing':'services',gdpCodes:[code],employmentCodes:employment===null?[]:['48-49'],gdp:Math.round(provinces.reduce((sum,p)=>sum+p.gdp,0)*10)/10,employment,provinces});selected.push(...rows);
}
await writeFile('src/data/atlas/canada/industry-pilot-statistics.json',JSON.stringify(metrics,null,2)+'\n');
const fields=Object.keys(selected[0]),quote=s=>'"'+s.replaceAll('"','""')+'"';
await writeFile(out+'gdp-selected-2021.csv',[fields,...selected.map(r=>fields.map(k=>r[k]))].map(row=>row.map(quote).join(',')).join('\n')+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
await writeFile(out+'provenance.json',JSON.stringify({accessed:'2026-10-10',inputGDP:dir+'gdp-2021.csv.gz',inputGDPsha256:hash(gdpBytes),inputEmploymentsha256:hash(empBytes),gdpSource:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610040201',employmentSource:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410002301',newRows:26,gdpUnit:'百万CAD・基本価格・当年価格・2021',employmentUnit:'千人・2021年平均・準州除外',missing:'精製に対応する細分類雇用はこの抽出原表にない。0にはしない。',classification:'学習分類に精製・精錬を重複表示。統計は原NAICS区分のまま保持し表示分類を合算しない。'},null,2)+'\n');
console.log('Retained 2021 sources -> 26 GDP rows; refinery employment null; transport employment 986.7 thousand.');
