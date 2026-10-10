import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

async function bundled(relative){
 const result=await build({entryPoints:[new URL('../../'+relative,import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {oceaniaCulture}=await bundled('src/data/atlas/oceania-culture.ts');
const {africaCulture}=await bundled('src/data/atlas/africa-culture.ts');
const {russiaCulture}=await bundled('src/data/atlas/russia-culture.ts');
const {pew2020EuropeRows,pew2020EuropeRow}=await bundled('src/data/atlas/europe/pew-religion-2020.ts');
const {cultureShare,culturePercentage,cultureShortLabel}=await bundled('src/lib/atlas-culture.ts');
const {initPopulationCulture}=await bundled('src/scripts/atlas-culture.ts');
const verified=JSON.parse(readFileSync(new URL('../../data-source/atlas/population-culture/verified-excerpts.json',import.meta.url)));
after(()=>stop());

test('country figures agree with manually verified primary-source excerpts without adding residuals',()=>{
 const source=id=>verified.tables.find(table=>table.id===id).rows.map(row=>row[1]);
 const aus=oceaniaCulture.records.find(record=>record.id==='AUS'),nz=oceaniaCulture.records.find(record=>record.id==='NZL');
 for(const [table,id] of [[aus.topics.ethnicity,'AUS-ancestry'],[aus.topics.religion,'AUS-religion'],[nz.topics.ethnicity,'NZL-ethnicity'],[nz.topics.religion,'NZL-religion']])assert.deepEqual(table.rows.map(row=>row[1]),source(id));
 assert.equal(aus.topics.ethnicity.supplement.value,source('AUS-indigenous-status')[0]);
 assert.match(aus.topics.ethnicity.definition,/Ancestry.*最大2回答/);
 assert.match(aus.topics.ethnicity.supplement.definition,/Indigenous status.*別の質問/);
 assert.match(nz.topics.ethnicity.definition,/自己認識.*total response/);
 assert.equal(Math.round(nz.topics.ethnicity.rows.reduce((sum,row)=>sum+Number(row[1]),0)*10)/10,114.8);
 assert.equal(Math.round(aus.topics.religion.rows.reduce((sum,row)=>sum+Number(row[1]),0)*10)/10,100.1);
 assert.equal(nz.topics.religion.rows.length,3,'partial release stays partial');
 assert.notEqual(aus.topics.religion.rows[2][1],'38.4','broad secular category is not No Religion so described');
 assert.notEqual(aus.topics.religion.rows[3][1],'6.9','not stated / inadequately described is not just not stated');
});

test('South Africa preserves Census population-group definitions, all faith categories and rounded zero',()=>{
 const record=africaCulture.records[0];
 for(const [topic,id] of [['ethnicity','ZAF-population-group'],['religion','ZAF-religion']])assert.deepEqual(record.topics[topic].rows.map(row=>row[1]),verified.tables.find(table=>table.id===id).rows.map(row=>row[1]));
 assert.match(record.topics.ethnicity.definition,/人種的自己認識.*民族自己認識や家庭内言語とは別/);
 assert.equal(record.topics.religion.rows.length,10);assert.equal(record.topics.religion.rows[4][1],'0.0');assert.match(record.topics.religion.note,/0.0%は不在ではありません/);
 assert.equal(record.topics.religion.licenseUrl,'https://www.statssa.gov.za/?page_id=425');assert.match(record.topics.religion.note,/Insight Journalによる独自加工/);
 assert.equal(africaCulture.records.length,1,'other African countries are explicitly missing');
});

test('Russia reuses the existing seven-group excerpt, including bounds and translation terms',()=>{
 const table=russiaCulture.records[0].topics.religion;
 assert.deepEqual(table.rows.map(row=>row[1]),pew2020EuropeRow('RUS').shares);
 assert.deepEqual(table.rows.map(row=>row[1]),['69.9','8.2','20.2','0.4','<0.1','<0.1','1.2']);
 assert.equal(table.rows.length,7);assert.equal(russiaCulture.records[0].topics.ethnicity,undefined);
 assert.equal(pew2020EuropeRows.filter(row=>row.code==='RUS').length,1);
 assert.match(table.note,/Pew Research Center has published the original content in English but has not reviewed or approved this translation\./);
 assert.match(table.definition,/全年齢.*全国.*推計/);
 assert.equal(cultureShare('<0.1'),null);assert.equal(cultureShare(''),null);assert.equal(cultureShare('0.0'),0);assert.equal(culturePercentage('<0.1'),'0.1%未満');
 assert.equal(cultureShortLabel('English（イングランド系）'),'イングランド系');
 assert.equal(cultureShortLabel('その他の宗教（仏教などを含む）'),'その他の宗教（仏教などを含む）');
});

test('country selection and right-only single category retain all map groups and URL context across reload/back',()=>{
 const dom=new Window({url:'https://example.com/atlas/oceania/population/?topic=ethnicity&keep=context'});
 const saved={};for(const key of ['window','document','location','history']){saved[key]=globalThis[key];globalThis[key]=key==='window'?dom:dom[key];}
 try{
  dom.document.body.innerHTML='<article data-oceania-learning data-field="population"><button data-population-topic="distribution"></button><button data-population-topic="ethnicity"></button><button data-population-topic="religion"></button><section data-population-culture="oceania"><script type="application/json" data-culture-config></script>'+['ethnicity','religion'].map(topic=>`<div data-culture-panel="${topic}"><div class="culture-map">`+oceaniaCulture.records.map(record=>`<button data-culture-record="${record.id}">`+record.topics[topic].rows.map(row=>`<span>${row[0]} ${row[1]}</span>`).join('')+'</button>').join('')+'</div><div class="culture-selected" data-culture-selected></div><button data-culture-reset></button></div>').join('')+'</section></article>';
  const root=dom.document.querySelector('[data-population-culture]');root.querySelector('[data-culture-config]').textContent=JSON.stringify(oceaniaCulture);initPopulationCulture(root);initPopulationCulture(root);
  const panel=root.querySelector('[data-culture-panel=ethnicity]'),map=panel.querySelector('.culture-map'),count=map.querySelectorAll('span').length;
  panel.querySelector('[data-culture-record=AUS]').click();assert.equal(map.querySelectorAll('span').length,count);assert.equal(map.querySelector('[data-culture-record=NZL]').hidden,false);
  assert.equal(dom.location.search,'?topic=ethnicity&keep=context&culturePlace=AUS','initialization is idempotent');
  const select=panel.querySelector('select');select.value='0';select.dispatchEvent(new dom.Event('change'));
  assert.equal(panel.querySelector('.culture-single-value').textContent,'English（イングランド系）：33.0%');assert.equal(panel.querySelector('.culture-selected table').hidden,true);assert.equal(map.querySelectorAll('span').length,count);
  dom.dispatchEvent(new dom.PopStateEvent('popstate'));assert.equal(panel.querySelector('.culture-selected table').hidden,false);assert.match(panel.querySelector('.culture-selected').textContent,/先住民自己認識 3.2%/);
  dom.document.querySelector('[data-population-topic=religion]').click();assert.equal(panel.hidden,true);assert.equal(root.querySelector('[data-culture-panel=religion]').hidden,false);assert.equal(new URLSearchParams(dom.location.search).get('keep'),'context');
  dom.document.querySelector('[data-population-topic=distribution]').click();assert.equal(root.hidden,true);assert.equal(root.closest('article').dataset.cultureActive,'false');
  dom.history.replaceState(null,'','?topic=ethnicity&culturePlace=unknown');dom.dispatchEvent(new dom.PopStateEvent('popstate'));assert.match(panel.querySelector('[data-culture-selected]').textContent,/国・地域を選ぶと/);assert.equal(map.querySelectorAll('span').length,count);
 }finally{for(const key of Object.keys(saved))globalThis[key]=saved[key];dom.happyDOM.abort();}
});
