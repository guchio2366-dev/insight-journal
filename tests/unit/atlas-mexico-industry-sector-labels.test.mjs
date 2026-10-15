import test from 'node:test';
import assert from 'node:assert/strict';
import {adoptedIndustries} from '../../src/lib/atlas-mexico-industry-adopted.ts';
import {mexicoSectorClusters,mexicoSectorPoints,mexicoIndustryShortNames,mexicoClusterIndustryName,placeMexicoSectorLabels} from '../../src/lib/atlas-mexico-industry-sector-labels.ts';

test('Each separate sector uses only its source-backed activities and collapses coincident state points',()=>{
 for(const [sector,count] of [['resources',14],['manufacturing',21],['services',7]]){
  const industries=adoptedIndustries.filter(i=>i.sectors.includes(sector)),points=mexicoSectorPoints(sector),clusters=mexicoSectorClusters(sector);
  assert.equal(points.length,count);assert.equal(new Set(points.map(p=>p.state)).size,count);
  assert.deepEqual(new Set(clusters.flatMap(c=>c.states)),new Set(points.map(p=>p.state)));
  assert.deepEqual(new Set(clusters.flatMap(c=>c.industries.map(i=>i.id))),new Set(industries.map(i=>i.id)));
  for(const c of clusters){assert.ok(c.states.includes(c.anchor));assert.ok([...c.examples].length<=9);}
  for(const p of points)for(const i of p.industries){assert.ok(i.sectors.includes(sector));assert.ok(i.map.regions.some(r=>r.state===p.state));}
 }
 assert.ok(adoptedIndustries.every(i=>mexicoIndustryShortNames[i.id]));
 assert.match(mexicoSectorClusters('resources').find(c=>c.id==='north').examples,/銀/);
 assert.match(mexicoSectorClusters('resources').find(c=>c.id==='northeast').examples,/輸入ガス/);
 assert.doesNotMatch(mexicoSectorClusters('resources').find(c=>c.id==='northeast').examples,/石油/);
 assert.match(mexicoSectorClusters('services').find(c=>c.id==='central').examples,/金融・IT/);
 assert.equal(mexicoClusterIndustryName(mexicoSectorClusters('resources').find(c=>c.id==='northeast'),adoptedIndustries.find(i=>i.id==='oil-gas')),'輸入ガス');
});

test('Local annotations keep a bounded footprint, avoid points and never grow long correspondence lines',()=>{
 const points=[[70,60],[170,130],[230,150]],clusters=points.map((point,n)=>({id:String(n),point}));
 const boxes=placeMexicoSectorLabels(clusters,points,358,231),all=[...boxes.values()];assert.ok(boxes.size>=2);
 for(const b of all){assert.ok(b[0]>=4&&b[1]>=4&&b[2]<=354&&b[3]<=227);for(const p of points)assert.ok(p[0]<=b[0]-8||p[0]>=b[2]+8||p[1]<=b[1]-8||p[1]>=b[3]+8);}
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(all[i][2]<=all[j][0]||all[j][2]<=all[i][0]||all[i][3]<=all[j][1]||all[j][3]<=all[i][1]);
 assert.deepEqual([...boxes],[...placeMexicoSectorLabels(clusters,points,358,231)]);
 assert.equal(placeMexicoSectorLabels(clusters,points,80,40).size,0,'An unplaceable annotation is omitted; source data are retained outside the map');
});
