import test from 'node:test';
import assert from 'node:assert/strict';
import {japanFarmRegionalSeries,japanFarmRegionalSeriesById,formatFarmRegionalValue,farmRegionalDiameter} from '../../src/data/atlas/japan-farm-regional-statistics.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readJapanState,writeJapanState} from '../../src/lib/atlas-japan-state.ts';

const url=query=>new URL('https://example.org/insight-journal/atlas/japan/agriculture/'+query);
const context={prefectures:[],cities:[],sites:[],agricultureSites:[]};

test('徳島の全25地域・2品目をLibrary全行抽出と照合し、原本hashとは区別する',()=>{
 execFileSync('python3',['scripts/prepare-japan-tokushima-2025.py','--check']);
 const selected=JSON.parse(readFileSync(new URL('../../src/data/atlas/japan-farm-tokushima-2025.json',import.meta.url)));
 const audit=JSON.parse(readFileSync(new URL('../../data-source/atlas/japan-farm-regional/tokushima-2025-audit.json',import.meta.url)));
 assert.equal(audit.rawFile,null);assert.equal(audit.rawSha256,null);assert.equal(audit.library.hasMore,false);assert.equal(audit.library.totalLines,55);
 for(const [product,total,subtotal,hidden,absent,entities] of [['cabbage',18003.07,16698,9,1,336],['tomato',4516.38,4320.24,8,2,296]]){
  const series=japanFarmRegionalSeriesById(product+'-tokushima-2025');assert.equal(series.unit,'a');assert.match(series.year,/2025/);assert.equal(series.rows.length,25);
  assert.equal(series.rows[0].value,total);assert.equal(series.rows[0].name,'徳島県計');assert.equal(series.rows[0].prefecture,'JP-36');
  const cities=series.rows.slice(1);assert.equal(cities.filter(r=>r.value!==null).length,14);assert.equal(cities.filter(r=>r.status==='suppressed').length,hidden);assert.equal(cities.filter(r=>r.status==='no-occurrence').length,absent);
  assert.equal(cities.reduce((n,r)=>n+Math.round((r.value??0)*100),0),Math.round(subtotal*100));
  assert.equal(selected.slice(1).reduce((n,r)=>n+(r[product].entities==='-'?0:Number(r[product].entities)),0),entities);
  for(const input of selected){const row=series.rows.find(r=>r.id===input.id),token=input[product].area;assert(row);assert.equal(row.value,['x','-'].includes(token)?null:Number(token));assert.equal(row.status,token==='x'?'suppressed':token==='-'?'no-occurrence':undefined);}
  for(const row of cities){assert(!row.point&&!row.prefecture);assert(row.mapOmitted);}
 }
 const tomato=japanFarmRegionalSeriesById('tomato-tokushima-2025');
 assert.equal(formatFarmRegionalValue(tomato.rows.find(r=>r.id==='36203'),'a'),'849.57a');
 assert.equal(formatFarmRegionalValue(tomato.rows.find(r=>r.id==='36368'),'a'),'該当なし（－）');
 assert.equal(formatFarmRegionalValue(tomato.rows.find(r=>r.id==='36302'),'a'),'秘匿（X）');
});

test('徳島は確認済みの県参照点だけを描き、市町村の数値・秘匿・該当なしを表選択で保持する',async()=>{
 const {build}=await import('esbuild');const bundle=await build({entryPoints:['src/scripts/atlas-japan-foundation-presentations.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {japanFoundationPresentation}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const state=readJapanState(url('?topic=tomato&farmData=tomato-tokushima-2025&farmRegion=36203&lng=134&lat=34&z=6'),context);
 const view=japanFoundationPresentation(state,null,{'JP-36':[134.56,34.07]});
 assert.deepEqual(view.labels.map(r=>r.id),['farm-JP-36']);assert.match(view.labels[0].subtitle,/4,516.38a/);assert.match(view.selection.title,/小松島市.*849.57a/);assert.match(view.legend[1].label,/県.*計のみ/);
 for(const [id,expected] of [['36302','秘匿'],['36368','該当なし']]){
  const next=readJapanState(writeJapanState(url(''),{...state,farmRegion:id}),context);assert.deepEqual(next.camera,state.camera);
  assert.match(japanFoundationPresentation(next).selection.title,new RegExp(expected));assert.equal(japanFoundationPresentation({...next,showCrops:false}).labels.length,0);
 }
});

test('公表数量は出典の年・単位・集計地域を保持し、掲載外と丸めた0を区別する',()=>{
 assert.equal(japanFarmRegionalSeries.length,10);
 const potato=japanFarmRegionalSeriesById('potato-spring-2025');
 assert.equal(potato.rows.length,15);assert.equal(potato.rows.find(r=>r.id==='JP-01').value,1692000);
 assert.equal(potato.rows.find(r=>r.id==='JP-42').value,64400);assert.equal(potato.rows.find(r=>r.id==='JP-47'),undefined);
 assert.equal(potato.unit,'t');assert.match(potato.coverage,/春植えのみ/);
 const apple=japanFarmRegionalSeriesById('apple-aomori-2025');
 assert.equal(apple.rows.reduce((sum,r)=>sum+r.value,0),19961);
 assert.equal(formatFarmRegionalValue(apple.rows.find(r=>r.id==='shimokita'),apple.unit),'0（丸め値）ha');
 const hokkaidoTomato=japanFarmRegionalSeriesById('tomato-hokkaido-2020');
 assert.equal(hokkaidoTomato.rows.length,14);assert.equal(hokkaidoTomato.rows.filter(r=>r.value!==null).length,13);assert.equal(hokkaidoTomato.rows.reduce((sum,r)=>sum+(r.value??0),0),51592);
 const nemuro=hokkaidoTomato.rows.find(r=>r.id==='nemuro');assert.equal(nemuro.value,null);assert.equal(formatFarmRegionalValue(nemuro,'t'),'未掲載');
 assert.equal(japanFarmRegionalSeriesById('milk-ikeda-2020').rows[0].value,2931);
 assert.equal(japanFarmRegionalSeriesById('beef-ikeda-2020').rows[0].value,6151);
 assert.notEqual(japanFarmRegionalSeriesById('milk-ikeda-2020').measure,'生乳生産量');
 for(const series of japanFarmRegionalSeries){assert(series.source.startsWith('https://'));assert(series.coverage);assert(series.year);assert(series.method);assert(series.rows.length);for(const row of series.rows){if(row.value===null){assert(['suppressed','not-reported','no-occurrence'].includes(row.status));}else{assert(Number.isFinite(row.value)&&row.value>=0);assert(row.point||row.prefecture||row.mapOmitted);}}}
});

test('数量円は未知値を0にせず、同一系列内で面積を比較し、全0でも有限になる',()=>{
 const missing={id:'missing',name:'未掲載例',value:null,status:'not-reported'};
 const suppressed={id:'hidden',name:'秘匿例',value:null,status:'suppressed'};
 const zero={id:'zero',name:'丸めた0',value:0,status:'rounded-zero'};
 const low={id:'low',name:'25',value:25},high={id:'high',name:'100',value:100};
 const rows=[missing,suppressed,zero,low,high];
 assert.equal(farmRegionalDiameter(missing,rows),null);assert.equal(farmRegionalDiameter(suppressed,rows),null);
 assert.equal(formatFarmRegionalValue(suppressed,'頭'),'秘匿（X）');
 assert.equal(farmRegionalDiameter(low,rows),15);assert.equal(farmRegionalDiameter(high,rows),30);
 assert.equal(farmRegionalDiameter(zero,[zero]),7);
});

test('引継ぎ値と出典を保持し、転記ファイルのhashを原本hashと混同しない',()=>{
 const directory=new URL('../../data-source/atlas/japan-farm-regional/',import.meta.url);
 const bytes=readFileSync(new URL('inherited-transcription.json',directory));
 const inherited=JSON.parse(bytes),audit=JSON.parse(readFileSync(new URL('audit.json',directory)));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.transcription.sha256);
 for(const original of inherited.series){const current=japanFarmRegionalSeriesById(original.id);assert.equal(current.source,original.source);assert.equal(current.unit,original.unit);assert.equal(current.year,original.year);for(const row of original.rows){const actual=current.rows.find(r=>r.id===row.id);assert.equal(actual.value,row.value);assert.equal(actual.status,row.status);}}
 for(const source of [...audit.sources,...audit.unreconfirmed]){assert.equal(source.rawFile,null);assert.equal(source.rawSha256,null);}
});

test('地域図は数量のない地域に円を作らず、OFFでも原表の選択は保持する',async()=>{
 const {build}=await import('esbuild');
 const bundle=await build({entryPoints:['src/scripts/atlas-japan-foundation-presentations.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {japanFoundationPresentation}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const state=readJapanState(url('?topic=tomato&farmData=tomato-hokkaido-2020&farmRegion=nemuro'),context);
 const view=japanFoundationPresentation(state);
 assert.equal(view.labels.length,13);assert(!view.labels.some(l=>l.id==='farm-nemuro'));
 assert.match(view.selection.title,/根室.*未掲載/);assert.match(view.reading.overview,/ミニトマト/);
 assert.equal(japanFoundationPresentation({...state,showCrops:false}).labels.length,0);
 assert.match(japanFoundationPresentation({...state,showCrops:false}).selection.title,/未掲載/);
 const apple=japanFoundationPresentation(readJapanState(url('?topic=apple&farmData=apple-aomori-2025'),context));
 assert.equal(apple.labels.length,6);assert(apple.labels.some(l=>l.id==='farm-shimokita'&&/丸め値/.test(l.subtitle)));
});

test('地域公表資料の直URLは品目と記載地域だけ受け入れ、選択してもカメラを動かさない',()=>{
 const original=url('?topic=apple&farmData=apple-aomori-2025&farmRegion=chunan&lng=140.5&lat=40.7&z=5.5');
 const state=readJapanState(original,context);assert.equal(state.farmData,'apple-aomori-2025');assert.equal(state.farmRegion,'chunan');
 assert.deepEqual(readJapanState(writeJapanState(original,state),context),state);
 assert.deepEqual(readJapanState(writeJapanState(original,{...state,farmRegion:'tosei'}),context).camera,state.camera);
 assert.equal(readJapanState(url('?topic=beef&farmData=apple-aomori-2025&farmRegion=chunan'),context).farmData,null);
 assert.equal(readJapanState(url('?topic=apple&farmData=apple-aomori-2025&farmRegion=JP-99'),context).farmRegion,null);
 assert.equal(readJapanState(url('?topic=forest&farmData=apple-aomori-2025'),context).farmData,null);
 assert.equal(readJapanState(url('?topic=apple&farmData=unknown'),context).farmData,null);
});
