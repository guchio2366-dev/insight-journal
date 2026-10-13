import test from 'node:test';
import assert from 'node:assert/strict';
import {japanFarmRegionalSeries,japanFarmRegionalSeriesById,formatFarmRegionalValue,farmRegionalDiameter} from '../../src/data/atlas/japan-farm-regional-statistics.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readJapanState,writeJapanState} from '../../src/lib/atlas-japan-state.ts';

const url=query=>new URL('https://example.org/insight-journal/atlas/japan/agriculture/'+query);
const context={prefectures:[],cities:[],sites:[],agricultureSites:[]};

test('公表数量は出典の年・単位・集計地域を保持し、掲載外と丸めた0を区別する',()=>{
 assert.equal(japanFarmRegionalSeries.length,8);
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
 for(const series of japanFarmRegionalSeries){assert(series.source.startsWith('https://'));assert(series.coverage);assert(series.year);assert(series.method);assert(series.rows.length);for(const row of series.rows){if(row.value===null){assert(['suppressed','not-reported'].includes(row.status));}else{assert(Number.isFinite(row.value)&&row.value>=0);assert(row.point||row.prefecture);}}}
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
