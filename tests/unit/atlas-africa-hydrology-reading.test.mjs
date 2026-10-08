import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {
 africaHydrologySources,africaHydrologyRivers,africaHydrologyRiverById,
 africaHydrologyRiverForFeature,africaHydrologyBasinRelations,
 africaHydrologyBasinById,africaHydrologyOverview,africaHydrologyRelationScope,
} from '../../src/data/atlas/africa-hydrology-reading.ts';
import {reading} from '../../src/data/atlas/africa-reading.ts';
import {themeById} from '../../src/data/atlas/africa-themes.ts';

const repo=new URL('../../',import.meta.url);
const evidence=JSON.parse(readFileSync(new URL('src/data/atlas/africa-hydrology-evidence.json',repo),'utf8'));
const riverBytes=readFileSync(new URL(evidence.sources.rivers.asset,repo));
const basinBytes=readFileSync(new URL(evidence.sources.basins.asset,repo));
const rivers=JSON.parse(riverBytes).features;
const basins=JSON.parse(gunzipSync(basinBytes)).features;
const manifest=JSON.parse(readFileSync(new URL('public/assets/atlas/africa-water-v1/manifest.json',repo),'utf8'));
const lines=geometry=>geometry.type==='LineString'?[geometry.coordinates]:geometry.coordinates;

test('hydrology evidence pins the existing river and BasinATLAS files and their actual permissions',()=>{
 for(const [key,bytes,features] of [['rivers',riverBytes,rivers],['basins',basinBytes,basins]]){
  assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.sources[key].sha256);
  assert.equal(features.length,evidence.sources[key].featureCount);
  for(const property of ['sourceName','sourceUrl','period','license','licenseUrl'])assert.equal(africaHydrologySources[key][property],manifest.layers[key][property]);
 }
 assert.equal(rivers.length,90);assert.equal(basins.length,1037);
 assert.equal(evidence.sources.rivers.license,'Public domain');assert.equal(evidence.sources.basins.license,'CC BY 4.0');
});

test('nine overview rivers use exact original names and IDs, not neighboring or tributary lines',()=>{
 const expected={nile:['0047','0298'],congo:['0157','0263'],niger:['0046','0297'],zambezi:['0100','0448'],orange:['0049','0312'],limpopo:['0259'],senegal:['0386'],volta:['0094','0423'],okavango:['0308']};
 assert.deepEqual(africaHydrologyRivers.map(row=>row.id),Object.keys(expected));
 for(const river of africaHydrologyRivers){
  assert.strictEqual(africaHydrologyRiverById(river.id),river);
  assert.deepEqual(river.featureIds,expected[river.id].map(suffix=>'ne50-river-'+suffix));
  assert.deepEqual(rivers.filter(feature=>feature.properties.sourceName===river.sourceName).map(feature=>feature.id),river.featureIds);
  for(const id of river.featureIds){const feature=rivers.find(row=>row.id===id);assert.strictEqual(africaHydrologyRiverForFeature(feature),river);}
 }
 assert.equal(africaHydrologyRiverForFeature({id:'ne50-river-0298',properties:{sourceName:'Congo'}}),undefined);
 assert.equal(africaHydrologyRiverForFeature({properties:{id:'b-1060034260',sourceName:'Nile'}}),undefined);
 for(const feature of rivers.filter(row=>/Nile/.test(row.properties.sourceName)&&row.properties.sourceName!=='Nile'))assert.equal(africaHydrologyRiverForFeature(feature),undefined);
});

test('every label locator is an unchanged vertex of its named original River segment',()=>{
 for(const river of africaHydrologyRivers){
  assert.equal(river.labelCandidates.length,3);
  for(const candidate of river.labelCandidates){
   assert.ok(river.featureIds.includes(candidate.featureId));
   const feature=rivers.find(row=>row.id===candidate.featureId);
   assert.equal(feature.properties.featurecla,'River');
   assert.deepEqual(candidate.coordinates,lines(feature.geometry)[candidate.partIndex][candidate.vertexIndex]);
   assert.ok(candidate.coordinates.every(Number.isFinite));
  }
 }
});

function ringContains(point,ring){
 let inside=false;
 for(let previous=ring.length-1,current=0;current<ring.length;previous=current++){
  const [x1,y1]=ring[current],[x2,y2]=ring[previous];
  if((y1>point[1])!==(y2>point[1])&&point[0]<x1+(point[1]-y1)*(x2-x1)/(y2-y1))inside=!inside;
 }
 return inside;
}
function basinContains(point,feature){
 const [west,south,east,north]=feature.properties.fullBounds;
 if(point[0]<west||point[0]>east||point[1]<south||point[1]>north)return false;
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 return polygons.some(polygon=>ringContains(point,polygon[0])&&!polygon.slice(1).some(hole=>ringContains(point,hole)));
}

test('recompute every river vertex against all 1037 original display polygons, preserving mismatches',()=>{
 for(const row of evidence.rivers){
  const points=rivers.filter(feature=>row.featureIds.includes(feature.id)).flatMap(feature=>lines(feature.geometry).flat());
  const counts=new Map();let unmatched=0,multiple=0;
  for(const point of points){
   const hits=basins.filter(feature=>basinContains(point,feature));
   if(!hits.length)unmatched++;
   if(hits.length>1)multiple++;
   for(const feature of hits){const id=feature.properties.id;counts.set(id,(counts.get(id)??0)+1);}
  }
  const matches=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([basinId,containedVertices])=>({basinId,containedVertices}));
  const relation=row.basinRelation;
  assert.equal(points.length,relation.testedVertices,row.id);
  assert.deepEqual(matches,relation.allBasinMatches,row.id);
  assert.equal(unmatched,relation.outsideAllCollectedBasinsVertices,row.id);
  assert.equal(multiple,relation.multiplyContainedVertices,row.id);
  assert.equal(matches[0].basinId,relation.basinId,row.id);
  assert.equal(matches[0].containedVertices,relation.containedVertices,row.id);
  assert.equal(points.length-matches[0].containedVertices,relation.outsideRelatedBasinVertices,row.id);
  const basin=basins.find(feature=>feature.properties.id===relation.basinId);
  assert.equal(relation.sourceBasinName,basin.properties.name);
  for(const property of ['sourceAreaKm2','subBasins','endorheic','coastal'])assert.equal(relation[property],basin.properties[property]);
 }
 const niger=evidence.rivers.find(row=>row.id==='niger').basinRelation,zambezi=evidence.rivers.find(row=>row.id==='zambezi').basinRelation;
 assert.deepEqual([niger.containedVertices,niger.testedVertices,niger.outsideRelatedBasinVertices],[302,331,29]);
 assert.deepEqual([zambezi.containedVertices,zambezi.testedVertices,zambezi.outsideRelatedBasinVertices],[134,141,7]);
});

test('reading references preserve approved prose and keep spatial relations separate from authoritative basin names',()=>{
 assert.strictEqual(africaHydrologyRiverById('nile').reading,reading.nature[0]);
 assert.strictEqual(africaHydrologyRiverById('congo').reading,reading.nature[1]);
 assert.strictEqual(africaHydrologyRiverById('nile').theme,themeById('nile-water'));
 for(const river of africaHydrologyRivers.filter(row=>!['nile','congo'].includes(row.id)))assert.equal(river.reading,undefined);
 for(const relation of africaHydrologyBasinRelations){
  assert.strictEqual(africaHydrologyBasinById(relation.basinId),relation);
  assert.match(relation.label,/河道と重なる収録集水区$/);
  assert.match(relation.sourceBasinName,/^集水区 \d+/);
  assert.match(relation.scope,/頂点数の照合結果/);
  assert.match(relation.scope,/全流域の完全性/);
  assert.strictEqual(relation.reading,africaHydrologyRiverById(relation.riverId).reading);
 }
 assert.match(africaHydrologyRelationScope,/1:50,000,000/);
 assert.match(africaHydrologyRelationScope,/0\.008度/);
 assert.match(africaHydrologyOverview.river.groundwater,/地下水の分布を示す資料は未収録/);
 assert.match(africaHydrologyOverview.basin.scope,/正式な流域名ではありません/);
 assert.match(africaHydrologyOverview.basin.scope,/ニジェール川・ザンベジ川/);
});
