import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {eastForestSites,eastOceanNames} from '../../src/data/atlas/east-asia-review-geography.ts';
const read=name=>readFileSync(new URL('../../'+name,import.meta.url));
const coast=JSON.parse(read('public/assets/atlas/east-asia-v2/coast.json'));
const insideRing=([x,y],ring)=>{let on=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)on=!on;}return on;};
const inside=(point,geometry)=>(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).some(rings=>insideRing(point,rings[0])&&!rings.slice(1).some(r=>insideRing(point,r)));
test('regional coast keeps source islands, a pinned original, and land/sea samples',()=>{
 const audit=JSON.parse(read('data-source/atlas/east-asia/second-feedback/coast-provenance.json'));
 assert.equal(createHash('sha256').update(read('public/assets/atlas/east-asia-v2/coast.json')).digest('hex'),audit.output.sha256);
 assert.match(audit.sourceUrl,/v5\.1\.2/);assert.equal(audit.license,'Public domain');
 assert.deepEqual(coast.features.filter(f=>f.properties.target).map(f=>f.properties.code).sort(),['CHN','JPN','KOR','MNG','PRK','TWN']);
 for(const row of audit.countryAreas){const feature=coast.features.find(f=>f.properties.code===row.code);assert(feature);assert.equal(feature.geometry.type==='Polygon'?1:feature.geometry.coordinates.length,row.displayComponents);assert.equal(row.displayComponents,row.sourceComponents);assert(row.boundaryHausdorffMetres<3300);}
 for(const [code,point] of [['JPN',[139.76,35.68]],['JPN',[144.38,43.33]],['TWN',[121,23.7]],['KOR',[126.98,37.56]]])assert(inside(point,coast.features.find(f=>f.properties.code===code).geometry),code+' known land sample');
 for(const point of [[139.85,35.43],[125,30],[133,40]])assert(!coast.features.some(f=>inside(point,f.geometry)),'known sea sample '+point);
 assert(audit.output.gzipBytes<audit.previousDetailed.gzipBytes*.4);
});
test('every crop name locates the actual concentration core, including Japan and Korea rice',()=>{
 const labels=JSON.parse(read('public/assets/atlas/east-asia-v2/farm-labels.json'));
 const original=read('public/assets/atlas/'+labels.sourceFile);
 assert.equal(createHash('sha256').update(original).digest('hex'),labels.sourceSha256);
 const farms=JSON.parse(gunzipSync(original));assert.equal(labels.labels.length,14);
 for(const label of labels.labels){const core=farms.features.find(f=>f.properties.id===label.product&&f.properties.distribution==='core');assert(inside(label.coordinate,core.geometry),label.id+' must stay inside the source core');if(label.anchorCountry)assert(inside(label.coordinate,coast.features.find(f=>f.properties.code===label.anchorCountry).geometry),label.id+' country');}
 for(const crop of ['rice','wheat','maize','soybean','cotton','tea'])assert(labels.labels.filter(l=>l.product===crop).length>=2);
 assert.deepEqual(labels.labels.filter(l=>l.anchorCountry).map(l=>l.anchorCountry).sort(),['JPN','KOR']);
});
test('forestry and current names preserve distinct source meanings and source coordinates',()=>{
 assert.equal(eastForestSites.length,4);assert.equal(eastForestSites.filter(s=>s.kind==='port').length,1);
 assert.deepEqual(eastForestSites.find(s=>s.id==='ishinomaki').point,[141.293617,38.422427]);
 assert.deepEqual(eastForestSites.find(s=>s.id==='shimizu').point,[138.509894,35.014444]);
 for(const site of eastForestSites){assert(site.source.startsWith('https://'));assert.equal('volume' in site,false);}
 assert.deepEqual(eastOceanNames.map(n=>n.name),['黒潮','親潮','対馬暖流','北西季節風']);
 for(const item of eastOceanNames)assert.equal(new URL(item.source).hostname.endsWith('jma.go.jp'),true);
});
