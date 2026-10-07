import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseCsv} from '../../scripts/prepare-mexico-industry.mjs';
import * as geometry from '../../src/lib/atlas-mexico-population-localities.ts';

const assets='public/assets/atlas/mexico-population-localities-v1/';
const source='data-source/atlas/mexico/population-localities/';
const manifest=JSON.parse(await readFile(assets+'manifest.json','utf8'));
const states=JSON.parse(await readFile('src/data/atlas/mexico/population.json','utf8')).states;
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');

test('Every published point retains a unique official locality key, count and name and reconciles all 32 state totals',async()=>{
 assert.deepEqual(JSON.parse(await readFile(source+'manifest.json','utf8')),manifest);
 assert.deepEqual(JSON.parse(await readFile('src/data/atlas/mexico/population-localities.json','utf8')),manifest);
 const raw=await readFile(source+manifest.sourceSelectedFields.file);
 assert.equal(sha(raw),manifest.sourceSelectedFields.sha256);
 const original=parseCsv(gunzipSync(raw).toString('utf8'));
 const official=new Map(original.map(row=>[row.ENTIDAD+row.MUN+row.LOC,row]));
 assert.equal(original.length,189432);assert.equal(official.size,original.length);
 const used=new Set();let national=0;
 for(const chunk of manifest.chunks){
  const zipped=await readFile(assets+chunk.file);assert.equal(zipped.length,chunk.bytes);assert.equal(sha(zipped),chunk.sha256);
  const points=JSON.parse(gunzipSync(zipped));assert.equal(points.length,chunk.localities);
  let total=0;
  for(const [x,y,count,key,name,municipality]of points){
   assert.match(key,/^\d{9}$/);assert(!used.has(key));used.add(key);
   assert.equal(key.slice(0,2),chunk.stateCode);assert.notEqual(key.slice(2,5),'000');
   assert(Number(key.slice(5))>=1&&Number(key.slice(5))<=9997);
   const row=official.get(key);assert(row);assert.match(row.POBTOT,/^\d+$/);
   assert.equal(count,Number(row.POBTOT));assert.equal(name,row.NOM_LOC);assert.equal(municipality,row.NOM_MUN);
   assert(Number.isSafeInteger(count)&&count>0);assert(x>=0&&x<=900&&y>=0&&y<=580);
   assert(x>=chunk.bounds[0]&&x<=chunk.bounds[2]&&y>=chunk.bounds[1]&&y<=chunk.bounds[3]);
   total+=count;
  }
  assert.equal(total,chunk.population);assert.equal(total,states.find(state=>state.stateCode===chunk.stateCode).population);national+=total;
 }
 assert.equal(used.size,official.size);assert.equal(national,126014024);
});

test('The small nationwide payload partitions original points and preserves population-weighted locations and totals',async()=>{
 const groups=new Map();
 for(const chunk of manifest.chunks){
  const points=JSON.parse(gunzipSync(await readFile(assets+chunk.file)));
  for(const [x,y,population]of points){
   const key=[chunk.stateCode,Math.floor(x/4),Math.floor(y/4)].join(':');
   const group=groups.get(key)??{count:0,population:0,x:0,y:0};
   group.count++;group.population+=population;group.x+=x*population;group.y+=y*population;groups.set(key,group);
  }
 }
 const bytes=await readFile(assets+manifest.overview.file);assert.equal(sha(bytes),manifest.overview.sha256);
 assert.equal(bytes.length,manifest.overview.bytes);assert(bytes.length<350000);
 const clusters=JSON.parse(gunzipSync(bytes));assert.equal(clusters.length,8359);assert.equal(clusters.length,groups.size);
 for(const [x,y,population,count,state,,minX,minY,maxX,maxY]of clusters){
  const key=[state,Math.floor(x/4),Math.floor(y/4)].join(':');const group=groups.get(key);assert(group,key);
  assert.equal(population,group.population);assert.equal(count,group.count);
  assert(Math.abs(x-group.x/population)<.00002&&Math.abs(y-group.y/population)<.00002);
  assert(x>=minX-.00001&&x<=maxX+.00001&&y>=minY-.00001&&y<=maxY+.00001);groups.delete(key);
 }
 assert.equal(groups.size,0);
 assert.equal(clusters.reduce((sum,row)=>sum+row[2],0),126014024);
 assert.equal(clusters.reduce((sum,row)=>sum+row[3],0),189432);
});

test('The circle area remains proportional to people at each zoom while the largest circle stays within 14 CSS pixels',()=>{
 for(const zoom of [1,2,10,150])for(const maximum of [1,250,2000000,10000000]){
  const scale=geometry.localitySymbolScale(maximum,zoom),large=geometry.localitySymbolRadius(maximum,scale),small=geometry.localitySymbolRadius(maximum/4,scale);
  assert(large<=14.000001);assert(Math.abs(large*large/(small*small)-4)<.000001);
 }
 assert.equal(geometry.localitySymbolRadius(-1,.001),0);
});

test('A saved camera restores geographic proportions and clamps pan and zoom to the national map',()=>{
 const national=geometry.localityNationalFrame;
 for(const value of ['NaN,0,90,58','0,0,900,10','-1,0,90,58','850,550,90,58'])assert.deepEqual(geometry.readLocalityFrame(new URL('https://example.test/?localityFrame='+value)),national);
 let frame=geometry.localityZoom(national,.01,[900,580]);
 assert(frame[0]>=0&&frame[1]>=0&&frame[0]+frame[2]<=900.001&&frame[1]+frame[3]<=580.001);
 assert.deepEqual(geometry.readLocalityFrame(new URL('https://example.test/?localityFrame='+frame.join(','))),frame);
 assert.deepEqual(geometry.localityZoom(frame,1000),national);
 assert(geometry.localityFrameIntersects([0,0,90,58],[80,50,100,70]));
 assert(!geometry.localityFrameIntersects([0,0,90,58],[91,59,100,70]));
});
