import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
const root=fileURLToPath(new URL('../../',import.meta.url));
const code=buildSync({stdin:{contents:"export * from './src/data/atlas/oceania-industry-catalog'; export * from './src/lib/atlas-oceania-industry-catalog'; export * from './src/data/atlas/oceania-learning';",resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}}).outputFiles[0].text;
const module={exports:{}};new Function('module','exports',code)(module,module.exports);const api=module.exports;
test('all researched proposals and additions have distinct stages, denominators and primary references',()=>{
 assert.deepEqual(api.oceaniaIndustryCatalog.map(x=>x.id),['iron','met-coal','thermal-coal','lng','lithium','gold','copper','nickel','rare-earths','uranium','aluminium','dairy','meat','wood','tuna','steel','tourism','education']);
 for(const item of api.oceaniaIndustryCatalog){assert(item.anchors.length);for(const anchor of item.anchors)assert(api.resolveOceaniaIndustryAnchor(anchor,api.oceaniaCountries).point.every(Number.isFinite));for(const field of ['scale','world','concentration']){assert(item[field].text.length>20,item.id);for(const source of item[field].sources)assert.match(api.oceaniaCatalogSources[source].url,/^https:\/\//);}assert(item.limitation.length>15);}
 assert.match(api.getOceaniaCatalogItem('dairy').scale.text,/加工のみ付加価値43億/);
 assert.match(api.getOceaniaCatalogItem('wood').world.text,/製材・パルプのシェアではない/);
 assert.match(api.getOceaniaCatalogItem('tuna').limitation,/アジア水域・公海/);
 assert.match(api.getOceaniaCatalogItem('rare-earths').limitation,/日本需要の充足率でも/);
 assert.match(api.getOceaniaCatalogItem('met-coal').limitation,/炭種未分類/);
 assert.match(api.getOceaniaCatalogItem('education').limitation,/州別輸出額/);
});
test('selection and explicit isolation preserve every annotation position and source coordinate at desktop and narrow widths',()=>{
 const win=new Window();try{for(const screen of [{width:950,height:950*710/1100},{width:640,height:350},{width:320,height:320*710/1100}]){
 const frame=[0,35,1100,710],parse=state=>{const holder=win.document.createElement('div');holder.innerHTML='<svg>'+api.renderOceaniaIndustryCatalogMap(state,api.oceaniaCountries,frame,screen)+'</svg>';return holder;};
 const initial=parse({}),labels=[...initial.querySelectorAll('[data-label-box]')].map(n=>n.dataset.labelBox);
 assert.equal(labels.length,18);const boxes=labels.map(v=>v.split(',').map(Number));
 for(const [i,a] of boxes.entries()){assert(a[0]>=0&&a[1]>=35&&a[0]+a[2]<=1100&&a[1]+a[3]<=745);for(const b of boxes.slice(i+1))assert(!(a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1]));}
 for(const item of api.oceaniaIndustryCatalog){const selected=parse({industry:item.id,industryOnly:true,sector:item.sector});assert.deepEqual([...selected.querySelectorAll('[data-label-box]')].map(n=>n.dataset.labelBox),labels);assert.equal(selected.querySelectorAll('[data-oceania-product-mark]:not([style="display:none"])').length,1);}
 }}finally{win.happyDOM.abort();}
});
test('product URL state validates identifiers and does not leak into another field',()=>{
 const selected=api.createOceaniaState('?product=uranium&productOnly=1','industry');assert.equal(selected.industry,'uranium');assert.equal(selected.industryOnly,true);assert.equal(selected.sector,'resources');
 const conflicting=api.createOceaniaState('?product=dairy&sector=services&industryLocation=lihir-project','industry');assert.equal(conflicting.sector,'manufacturing');assert.equal(conflicting.industryLocation,undefined);
 for(const query of ['?product=unknown&productOnly=1','?product=iron&layer=mines'])assert.equal(api.createOceaniaState(query,'industry').industry,undefined);
 assert.equal(api.createOceaniaState('?product=tourism&productOnly=1','agriculture').industry,undefined);
});
