import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const output=await build({entryPoints:['src/data/atlas/agro-east-quantity-flow.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {agroEastQuantityFlow}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const qcl=read('public/assets/atlas/asia-farming-v1/statistics.json');
const world=read('src/data/atlas/shared-world-statistics.json');
const exportsRaw=read('data-source/atlas/east-asia/statistics-2023/wits/CHN-Export-120100.json');
const importsRaw=read('data-source/atlas/east-asia/statistics-2023/wits/CHN-Import-120100.json');
const worldRow=data=>data.rows.find(row=>row.partner==='World');

test('Chinese soy production and world share retain the exact same QCL year, product, unit and archive',()=>{
 const flow=agroEastQuantityFlow('CHN','soybean-production');
 const original=qcl.countries.CHN.observations.find(row=>row.domain==='Production_Crops_Livestock'&&row.item==='236'&&row.elementCode==='5510'&&row.year===2023&&row.unit==='t');
 const denominator=world.world['QCL:236:5510:2023:t'];
 assert.ok(flow);assert.equal(flow.year,2023);assert.equal(flow.unit,'t');
 assert.equal(flow.production,original.value);assert.equal(flow.worldProduction,Number(denominator.rawValue));
 assert.equal(flow.productionFlag,original.flag);assert.equal(flow.worldProductionFlag,denominator.flag);
 assert.equal(flow.provenance.productionArchiveSha256,denominator.archiveSha256);
 assert.equal(flow.provenance.productionArchiveSha256,qcl.inputs.find(row=>row.file.startsWith('Production_Crops')).sha256);
 assert.equal(flow.production,20841700);assert.equal(flow.worldProduction,370876094.01);
 assert.equal(flow.countryName,'中国本土');
 assert.equal(flow.provenance.sourceCountryNames.production,qcl.countries.CHN.sourceNames.Production_Crops_Livestock.name);
 assert.equal(flow.provenance.sourceCountryNames.tradeReporter,exportsRaw.reporter);
});

test('gross imports and exports use the retained 2023 HS120100 quantity cells with exact kg-to-tonne conversion',()=>{
 const flow=agroEastQuantityFlow('CHN','soybean-production');
 for(const raw of [importsRaw,exportsRaw]){assert.equal(raw.year,2023);assert.equal(raw.product,'120100');assert.equal(raw.classification,'HS 1988/92 (H0)');assert.equal(worldRow(raw).quantityUnit,'Kg');}
 assert.equal(flow.imports,Number(worldRow(importsRaw).quantity)/1000);
 assert.equal(flow.exports,Number(worldRow(exportsRaw).quantity)/1000);
 assert.equal(flow.imports,87387600);assert.equal(flow.exports,71398.1);
 assert.equal(flow.source.importUrl,importsRaw.source);assert.equal(flow.source.exportUrl,exportsRaw.source);
 for(const [path,sha] of [[flow.provenance.importPath,flow.provenance.importSha256],[flow.provenance.exportPath,flow.provenance.exportSha256]])assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),sha);
 assert.equal(flow.provenance.tradeProductDescription,'Soya beans');
 assert.equal(flow.provenance.productDescriptionVerification.url,exportsRaw.source);
 assert.equal(flow.provenance.importProductDescriptionVerification.url,importsRaw.source);
});

test('all 42 foreign partner quantities remain available, including East Asia, and keep the reported rounding gap',()=>{
 const flow=agroEastQuantityFlow('CHN','soybean-production');
 const original=exportsRaw.rows.filter(row=>row.partner!=='World');
 assert.equal(flow.partners.length,42);assert.equal(original.length,42);
 assert.deepEqual(flow.partners,original.map(row=>({code:row.partner,name:row.partner,value:Number(row.quantity)/1000})));
 for(const name of ['Korea, Rep.','Japan','Other Asia, nes','Hong Kong, China','Macao'])assert.ok(flow.partners.some(row=>row.name===name),name+' is a foreign destination of China');
 assert.ok(flow.partners.every(row=>Number.isFinite(row.value)&&row.value>=0));
 const sumKg=original.reduce((sum,row)=>sum+BigInt(row.quantity),0n);
 assert.equal(sumKg-BigInt(worldRow(exportsRaw).quantity),15n);
 assert.equal(flow.partnerRoundingGap,0.015);
 assert.ok(Math.abs(flow.partners.reduce((sum,row)=>sum+row.value,0)-flow.exports-flow.partnerRoundingGap)<1e-9);
 assert.equal(flow.partners.some(row=>row.name==='Other' || row.name==='その他'),false,'a positive rounding excess is not an invented residual partner');
 assert.ok(flow.partners.find(row=>row.name==='Korea, Rep.').value/flow.exports>0.56,'partner shares use the WITS export denominator');
});

test('the stockless apparent quantity is not actual domestic use or a forced partition of production',()=>{
 const flow=agroEastQuantityFlow('CHN','soybean-production');
 const apparent=flow.production+flow.imports-flow.exports;
 assert.equal(apparent,108157901.9);
 assert.equal(flow.actualDomesticUse,null);assert.equal(flow.stockVariation,null);
 assert.ok(apparent/flow.production>5,'imported raw beans can make the apparent amount larger than domestic production');
 assert.ok((apparent+flow.exports)/flow.production>1,'domestic and export ratios must not be forced to 100%');
 assert.match(flow.notes.join(' '),/在庫変動.*未収録/);
 assert.match(flow.notes.join(' '),/国産大豆の仕向け割合ではありません/);
 assert.match(flow.notes.join(' '),/提供元・改訂版が異なる/);
});

test('Japan, overviews, unmatched products and unverified countries receive no invented fallback; callers cannot mutate retained values',()=>{
 for(const [country,series] of [['JPN','soybean-production'],['','soybean-production'],['east-asia','soybean-production'],['TWN','soybean-production'],['PRK','soybean-production'],['MNG','soybean-production'],['CHN','rice-production'],['CHN','sawnwood-production'],['CHN','236']])assert.equal(agroEastQuantityFlow(country,series),undefined);
 const first=agroEastQuantityFlow('CHN','soybean-production');first.production=0;first.partners[0].value=0;first.notes.length=0;
 const next=agroEastQuantityFlow('CHN','soybean-production');assert.equal(next.production,20841700);assert.equal(next.partners[0].value,40404);assert.ok(next.notes.length>0);
});
