import test from 'node:test';
import assert from 'node:assert/strict';
import {japanFarmRegionalSeries,japanFarmRegionalSeriesById,formatFarmRegionalValue} from '../../src/data/atlas/japan-farm-regional-statistics.ts';
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
 assert.equal(hokkaidoTomato.rows.length,13);assert.equal(hokkaidoTomato.rows.reduce((sum,r)=>sum+r.value,0),51592);
 assert.equal(japanFarmRegionalSeriesById('milk-ikeda-2020').rows[0].value,2931);
 assert.equal(japanFarmRegionalSeriesById('beef-ikeda-2020').rows[0].value,6151);
 assert.notEqual(japanFarmRegionalSeriesById('milk-ikeda-2020').measure,'生乳生産量');
 for(const series of japanFarmRegionalSeries){assert(series.source.startsWith('https://'));assert(series.coverage);assert(series.year);assert(series.method);assert(series.rows.length);for(const row of series.rows){assert(Number.isFinite(row.value)&&row.value>=0);assert(row.point||row.prefecture);}}
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
