import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import stats from '../../src/data/atlas/africa-regional-statistics.json' with {type:'json'};
import {readState,writeState,africaAgriVisibleLayers} from '../../src/data/atlas/africa-atlas.ts';
import {africaProductionZonePath} from '../../src/scripts/atlas-africa-layers.ts';
const root=new URL('../../',import.meta.url);
test('regional shares use exact publisher regional and World rows, never model quantities or filled missing rows',()=>{
 const retained=JSON.parse(readFileSync(new URL('data-source/atlas/livestock/faostat-qcl-2024-extract.json',root),'utf8'));
 for(const source of stats.source.retainedFiles){const bytes=readFileSync(new URL(source.path,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);}
 for(const [region,rows]of Object.entries(stats.regions))for(const row of rows){
  if(row.share===null){assert.match(row.status,/未取得/);continue;}
  assert.equal(row.regional.year,2024);assert.equal(row.world.year,2024);assert.equal(row.regional.itemCode,row.world.itemCode);assert.equal(row.regional.elementCode,'5510');assert.equal(row.world.elementCode,'5510');assert.equal(row.regional.unit,'t');assert.equal(row.world.unit,'t');assert.equal(row.regional.areaCode,stats.regionCodes[region]);assert.equal(row.world.areaCode,'5000');
  assert.equal(row.share,Number(row.regional.rawValue)/Number(row.world.rawValue)*100);
  if(row.id!=='coffee')for(const point of [row.regional,row.world]){const source=retained.find(x=>x['Area Code']===point.areaCode&&x['Item Code']===point.itemCode&&x.Year==='2024');assert.equal(point.rawValue,source.Value);assert.equal(point.flag,source.Flag);}
 }
 assert.deepEqual(stats.regions.all.filter(x=>x.share!==null).map(x=>x.id),['coffee','cattle-meat','cattle-milk']);
 assert.deepEqual(stats.unavailable.map(x=>x.id),['trade','calories']);
});
test('crop/livestock visibility is URL-stable and independent of the reading focus',()=>{
 for(const group of ['all','crops','livestock']){const state=readState(`?field=agriculture&crop=rice&agriDisplay=${group}`);assert.equal(state.crop,'rice');assert.equal(readState(writeState({...state},new URL('https://example.com/atlas/africa/')).search).agriDisplay,group);const visible=africaAgriVisibleLayers(state);assert.equal(visible.length,group==='all'?9:group==='crops'?6:3);assert(visible.every(x=>group==='all'||x.startsWith(group==='crops'?'crop-':'livestock-')));}
});
test('production-zone outlines keep disjoint source components and holes without a top-N cap',()=>{
 const disconnected=Array.from({length:100},(_,i)=>[i*2,0]);const d=africaProductionZonePath(disconnected,[-27,-200,64,39]);assert.equal((d.match(/M/g)||[]).length,100);assert.equal((d.match(/Z/g)||[]).length,100);
 const ring=[];for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(row!==1||col!==1)ring.push([row,col]);assert.equal((africaProductionZonePath(ring,[-27,-36,64,39]).match(/M/g)||[]).length,2);
});
