import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {centralAgroCountries,centralAgroProduction,centralAgroSeries,centralWheatDestinations,renderCentralAgroRegion,renderCentralWheatReference,renderCentralWheatUse} from '../../src/lib/atlas-central-asia-agro.ts';
import {initCentralAsiaAgro} from '../../src/scripts/atlas-central-asia-agro.ts';

const retained=JSON.parse(readFileSync('src/data/atlas/central-asia-agro-production.json','utf8'));
const shared=JSON.parse(readFileSync(retained.source.path,'utf8'));
const parse=(doc,html)=>{const box=doc.createElement('div');box.innerHTML=html;return box;};

test('Central Asian production preserves all five original rows, World and source identity',()=>{
 assert.equal(createHash('sha256').update(readFileSync(retained.source.path)).digest('hex'),retained.source.sha256);
 assert.deepEqual(centralAgroCountries,['KAZ','KGZ','TJK','TKM','UZB']);
 for(const record of retained.records){
  for(const observation of record.observations){
   const original=shared.countries[observation.code].series.find(s=>s.id===record.id);
   assert.deepEqual(observation.row,original?.rows.find(r=>r.year===2024)??null);
   if(original)for(const key of ['domain','item','element','unit','definition','archiveSha256'])assert.equal(record.identity[key],original[key]);
  }
 }
 assert.equal(centralAgroProduction('wheat-production').value,28181615.46);
 assert.equal(centralAgroProduction('qcl-328-production').value,4139508.61);
 assert.equal(centralAgroProduction('qcl-328-production').world,null);
 assert.equal(centralAgroProduction('qcl-328-production').share,null,'cotton lint World cannot substitute for unginned cotton');
 assert.equal(centralAgroProduction('roundwood-production').value,4250285);
 assert.equal(centralAgroProduction('sawnwood-production').value,445303);
 for(const id of ['sheep-meat','goat-production']){
  const record=centralAgroProduction(id);assert.equal(record.value,null);assert.equal(record.share,null);assert.equal(record.coverage,0);
 }
});

test('regional extraction is deterministic and fails on mixed units, archive or World',()=>{
 execFileSync('python3',['-c',`
import copy,json,runpy
from pathlib import Path
m=runpy.run_path('scripts/prepare-central-asia-agro.py')
raw=m['SOURCE'].read_bytes()
assert m['extract'](raw)==json.loads(m['OUTPUT'].read_text())
data=json.loads(raw)
for key,value in [('unit','kg'),('archiveSha256','changed')]:
    broken=copy.deepcopy(data)
    s=next(s for s in broken['countries']['KAZ']['series'] if s['id']=='wheat-production')
    s[key]=value
    try:m['extract'](json.dumps(broken).encode())
    except ValueError:pass
    else:raise AssertionError(key)
broken=copy.deepcopy(data)
s=next(s for s in broken['countries']['KAZ']['series'] if s['id']=='wheat-production')
next(r for r in s['rows'] if r['year']==2024)['worldRawValue']='1'
try:m['extract'](json.dumps(broken).encode())
except ValueError:pass
else:raise AssertionError('World')
broken=copy.deepcopy(data)
broken['countries']['KAZ']['series']=[s for s in broken['countries']['KAZ']['series'] if s['id']!='wheat-production']
r=m['extract'](json.dumps(broken).encode())['records'][0]
assert r['productionRaw'] is None and not r['complete']
`],{stdio:'pipe'});
});

test('regional columns do not invent intra-regional use, extra-regional exports or pulp',async()=>{
 const w=new Window();
 try{
  for(const id of ['wheat-production','qcl-328-production','cattle-meat','roundwood-production','sawnwood-production','sheep-meat','goat-production']){
   const box=parse(w.document,renderCentralAgroRegion(id));
   assert.deepEqual([...box.querySelectorAll('[data-agro-stage]')].map(n=>n.dataset.agroStage),['production','use','destinations']);
   const use=box.querySelector('[data-agro-stage="use"]');assert.equal(use.querySelector('.agro-band'),null);assert.match(use.textContent,/域内取引を除いた/);assert.match(use.textContent,/生産−輸出を消費とは呼びません/);
   if(id==='sheep-meat'||id==='goat-production')assert.equal(box.querySelector('.agro-world-pie'),null);
   if(id==='qcl-328-production'){
    assert.match(box.querySelector('[data-agro-stage="production"]').textContent,/4,139,508\.61 t/);
    assert.match(box.querySelector('[data-agro-stage="production"]').textContent,/同版Worldが未収録/);
    assert.doesNotMatch(box.querySelector('[data-agro-stage="production"]').textContent,/地域合計・世界シェアを算出しません/);
    assert.equal(box.querySelector('.agro-world-pie'),null);
   }
   if(id==='roundwood-production'||id==='sawnwood-production')assert.match(use.textContent,/パルプは重量 t/);
  }
 }finally{await w.happyDOM.close();}
});

test('wheat reference excludes all four regional destinations and preserves the one-ton discrepancy',async()=>{
 const split=centralWheatDestinations();
 assert.deepEqual(split.intra.map(p=>p.code),['UZB','TJK','TKM','KGZ']);
 assert.equal(split.intraTotal,4608827);assert.equal(split.extraTotal,2507638);assert.equal(split.partnerTotal,7116465);assert.equal(split.roundingGap,1);
 assert(split.extra.some(p=>p.code==='AFG'));assert(!split.extra.some(p=>centralAgroCountries.includes(p.code)));
 const w=new Window();try{
  const box=parse(w.document,renderCentralWheatReference());
  assert.equal(box.querySelectorAll('tbody tr').length,46);assert.equal(box.firstElementChild.open,false);
  assert.match(box.textContent,/粉の原穀換算基準は未確認/);assert.match(box.textContent,/WASDE販売年度・小麦基準へ接合しません/);
  assert.match(box.textContent,/\+1 t/);assert.equal(box.querySelector('.agro-partner-pie'),null);
 }finally{await w.happyDOM.close();}
 assert.match(renderCentralWheatUse(),/3\.9 百万t/);assert.match(renderCentralWheatUse(),/国内利用 9 百万tのうち/);assert.match(renderCentralWheatUse(),/二重加算せず/);
});

test('region adapter keeps overview, hides on field changes and survives asynchronous country replacement',async()=>{
 const w=new Window(),d=w.document;
 d.body.innerHTML='<div data-asia-atlas data-focus="central-asia"><main data-asia-explorer data-field="agriculture" data-topic="overview"><select data-country-select><option value="">地域</option><option>KAZ</option><option>UZB</option></select></main><section data-south-central-farm-connections><p>元の地域参考</p></section><section data-agro-statistics hidden><div data-agro-content><p>既存概説</p></div></section></div>';
 const root=d.querySelector('[data-asia-atlas]'),explorer=root.querySelector('main'),native=root.querySelector('[data-agro-statistics]'),content=native.querySelector('[data-agro-content]'),country=root.querySelector('select');
 const overview=content.innerHTML,api=initCentralAsiaAgro(root),region=root.querySelector('[data-central-agro-region]');
 const settle=async()=>{await new Promise(r=>setTimeout(r,5));};
 try{
  assert(region.hidden);assert.equal(content.innerHTML,overview);
  explorer.dataset.topic='wheat';await settle();assert(!region.hidden);assert.equal(region.querySelector('[data-central-agro-series]').dataset.centralAgroSeries,'wheat-production');
  assert.equal(root.querySelector('[data-south-central-farm-connections]').parentElement.open,false,'older references collapse for selected regional quantities');
  country.value='KAZ';native.hidden=false;
  content.innerHTML='<div data-agro-country="KAZ" data-agro-series="wheat-production"><section data-agro-stage="use"></section><section data-agro-stage="destinations"></section></div>';
  await settle();assert(region.hidden);assert.equal(native.querySelectorAll('[data-central-agro-native]').length,2);
  native.dataset.agroReady='true';await settle();assert.equal(native.querySelectorAll('[data-central-agro-native]').length,2,'unchanged render never duplicates references');
  country.value='UZB';content.innerHTML='<div data-agro-country="KAZ" data-agro-series="wheat-production"><section data-agro-stage="use"></section></div>';await settle();assert.equal(native.querySelectorAll('[data-central-agro-native]').length,0,'late old country response cannot acquire evidence');
  content.innerHTML='<div data-agro-country="UZB" data-agro-series="wheat-production"><section data-agro-stage="use"></section></div>';await settle();assert.equal(native.querySelectorAll('[data-central-agro-native]').length,0);
  country.value='';native.hidden=true;explorer.dataset.topic='forest';await settle();
  const picker=region.querySelector('select');assert.equal(picker.options.length,2);picker.value='sawnwood-production';picker.dispatchEvent(new w.Event('change'));await settle();assert.equal(region.querySelector('[data-central-agro-series]').dataset.centralAgroSeries,'sawnwood-production');
  explorer.dataset.field='natural';await settle();assert(region.hidden);
  explorer.dataset.field='agriculture';explorer.dataset.topic='overview';content.innerHTML=overview;await settle();assert(region.hidden);assert.equal(content.innerHTML,overview,'published unselected DOM restored byte for byte');
  assert.equal(root.querySelector('[data-south-central-farm-connections]').parentElement,root,'overview restores the original reference node and its place');
  assert.deepEqual(centralAgroSeries('overview'),[]);assert.deepEqual(centralAgroSeries('rice'),[]);
 }finally{api.disconnect();await w.happyDOM.close();}
});
