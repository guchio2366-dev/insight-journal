import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {japanAgricultureProducts as products,japanAgricultureSites as sites,japanAgricultureSources as sources,japanAgricultureTopics,getJapanAgricultureReading,japanAgriculturePointCollection,japanAgricultureWheat as wheat,japanForestrySupply as wood,japanForestrySites as woodSites} from '../../src/data/atlas/japan-agriculture-v2.ts';
test('日本の10品目は別用途の畜産を分け、公的産地資料へ到達できる',()=>{
 assert.equal(products.length,10);assert.equal(new Set(products.map(p=>p.id)).size,10);
 for(const product of products){assert(sites.filter(s=>s.products.includes(product.id)).length>=2,product.id);assert(product.selectionReason);for(const id of product.sourceIds)assert(sources.some(s=>s.id===id),id);}
 assert(products.some(p=>p.id==='milk'));assert(products.some(p=>p.id==='beef'));assert(products.some(p=>p.id==='pork'));
 assert.deepEqual(new Set(japanAgricultureTopics),new Set(['all','forest',...products.map(p=>p.id)]));
});
test('代表点は県全域・市町村全域・園地境界や生産量へ変換しない',()=>{
 const geo=japanAgriculturePointCollection();assert.equal(geo.features.length,sites.length);
 for(const f of geo.features){assert.equal(f.geometry.type,'Point');assert.equal(f.properties.geometryKind,'representative-point');assert.equal(f.properties.quantity,null);assert.equal(f.properties.extent,null);assert(f.properties.coordinateMethod.includes('概略'));for(const id of f.properties.sourceIds)assert(sources.some(s=>s.id===id));const [lng,lat]=f.geometry.coordinates;assert(lng>=129&&lng<=146&&lat>=30&&lat<=46);}
});
test('残した別品目の参照地点も実際の地点を解説し、森林・不明選択は適切な概説へ戻す',()=>{
 assert.equal(getJapanAgricultureReading('milk','betsukai-milk').title,'酪農｜別海');
 assert.equal(getJapanAgricultureReading('rice','betsukai-milk').title,'酪農｜別海');
 assert.equal(getJapanAgricultureReading('rice','unknown').title,'米');
 assert.equal(getJapanAgricultureReading('forest','betsukai-milk').title,'森林の存在と、木材を使う仕組みを分ける');
 assert.equal(getJapanAgricultureReading('missing','unknown').title,'日本の農畜産業を、産地の事例から読む');
 assert(sources.find(s=>s.id==='municipal-2024').status==='download-blocked');
});
test('小麦の異なる集計範囲を保持し、木材の同年丸太換算の需給は整合する',()=>{
 const use=Object.values(wheat.domesticUse).reduce((a,b)=>a+b,0);
 assert.equal(wheat.production+wheat.netImports-wheat.inventoryChange,use);
 assert.equal(wheat.origins.rows.reduce((a,b)=>a+b.tonnes,0),wheat.origins.total);
 assert.notEqual(wheat.origins.total,wheat.netImports*1000);
 assert.equal(wood.domesticProduction+wood.imports,wood.totalSupply);
 assert.equal(wood.domesticConsumption+wood.exports,wood.totalSupply);
 assert(Math.abs(wood.domesticUses.reduce((a,b)=>a+b.value,0)-wood.domesticConsumption)<=1);
 assert.equal(Number((wood.domesticProduction/wood.totalSupply*100).toFixed(1)),wood.selfSufficiency.total);
 assert.equal(wood.partners,null);assert(wood.unit.includes('丸太換算'));
});
test('生成した公開資料は元の代表点・出典と一致し、hashを検証できる',()=>{
 const base=new URL('../../public/assets/atlas/japan-agriculture-v2/',import.meta.url);
 const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',base),'utf8'));
 for(const file of manifest.files){const bytes=fs.readFileSync(new URL(file.name,base));assert.equal(bytes.length,file.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);}
 assert.deepEqual(JSON.parse(fs.readFileSync(new URL('sites.geojson',base),'utf8')),japanAgriculturePointCollection());
});

 test('木材利用の点は森林面・伐採量を表さず、森林の解説と公開資料に独立して接続する',()=>{
  const base=new URL('../../public/assets/atlas/japan-agriculture-v2/',import.meta.url);
  const geo=JSON.parse(fs.readFileSync(new URL('wood-sites.geojson',base),'utf8'));
  assert.equal(woodSites.length,3);assert.equal(geo.features.length,woodSites.length);
  for(const s of woodSites){assert.equal(s.geometryKind,'wood-use-reference-point');assert.equal(s.quantity,null);assert.equal(s.extent,null);assert(!sites.some(p=>p.id===s.id));for(const id of s.sourceIds){const source=sources.find(p=>p.id===id);assert(source);assert.match(source.period,/2024年度白書/);}assert.equal(getJapanAgricultureReading('forest',s.id).title,s.name);assert.notEqual(getJapanAgricultureReading('rice',s.id).title,s.name);assert.deepEqual(geo.features.find(f=>f.id===s.id).geometry.coordinates,s.coordinates);}
 });

test('森林3施設の実表示の詳細には農場・園地向けの位置説明を出さない',async()=>{
 const {build}=await import('esbuild');
 const bundle=await build({entryPoints:['src/scripts/atlas-japan-foundation-presentations.ts'],bundle:true,write:false,format:'esm',platform:'node',tsconfigRaw:{},define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal/')}});
 const {japanFoundationPresentation}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 for(const site of woodSites){
  const view=japanFoundationPresentation({field:'agriculture',topic:'forest',site:site.id,prefecture:null,city:null,feature:null,camera:null,returnTo:null});
  assert.equal(view.selection.title,site.name);
  assert.match(view.selection.body,/施設・敷地の正確な位置ではない/);
  assert.doesNotMatch([view.selection.title,view.selection.body,...Object.values(view.reading)].join(' '),/農場|園地|農業/);
 }
});
