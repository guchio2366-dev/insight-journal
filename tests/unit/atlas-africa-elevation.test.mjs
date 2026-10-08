import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {africaRasterCategory} from '../../src/scripts/atlas-africa-layers.ts';
const read=file=>readFileSync(new URL('../../'+file,import.meta.url));
const base='public/assets/atlas/africa-elevation-500m-v1/';
const manifest=JSON.parse(read(base+'manifest.json')),layer=manifest.layers.elevation;
const geometry=JSON.parse(gunzipSync(read(base+layer.file)));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('500 m product derives only from the immutable published display grid and preserves source limits',()=>{
 assert.equal(digest(read(manifest.input.file)),manifest.input.sha256);
 assert.equal(digest(read(manifest.input.manifest)),manifest.input.manifestSha256);
 assert.equal(digest(read(manifest.processing.script)),manifest.processing.scriptSha256);
 assert.equal(digest(read(base+layer.file)),manifest.files[layer.file].sha256);
 assert.equal(layer.resolutionDegrees,.1);assert.equal(layer.width,910);assert.equal(layer.height,750);
 assert.equal(layer.displayMinM,-137);assert.equal(layer.displayMaxM,4497);
 assert.equal(layer.verticalDatum,'EGM2008 geoid (EPSG:3855)');assert.match(layer.method,/欠測に接する四角形は除外/);
 const source=JSON.parse(read(manifest.input.manifest));
 assert.equal(digest(read('public/assets/atlas/africa-physical-v1/elevation.png')),source.files['elevation.png'].sha256,'agriculture backdrop remains unchanged');
 assert.deepEqual(layer.breaks,[0,500,1000,1500,2000,2500,3000,3500,4000]);
 assert.equal(africaRasterCategory(-137,layer).id,'band-0');assert.equal(africaRasterCategory(0,layer).id,'band-1');assert.equal(africaRasterCategory(4497,layer).id,'band-9');assert.equal(africaRasterCategory(-32768,layer),null);
});
test('all 500 m contour segments coincide with retained isoband boundaries, including holes and separated parts',()=>{
 const bands=geometry.features.filter(f=>f.properties.kind==='band'),lines=geometry.features.filter(f=>f.properties.kind==='contour');
 assert.equal(bands.length,10);assert.deepEqual(lines.map(f=>f.properties.elevationM),[0,500,1000,1500,2000,2500,3000,3500,4000]);
 const edge=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
 const boundary=new Set();
 for(const f of bands){assert.equal(f.geometry.type,'MultiPolygon');assert.ok(f.geometry.coordinates.length);for(const polygon of f.geometry.coordinates)for(const ring of polygon){assert.deepEqual(ring[0],ring.at(-1));for(let i=1;i<ring.length;i++)boundary.add(edge(ring[i-1],ring[i]));}}
 for(const f of lines){assert.equal(f.geometry.type,'MultiLineString');assert.ok(f.geometry.coordinates.length);for(const line of f.geometry.coordinates)for(let i=1;i<line.length;i++)assert(boundary.has(edge(line[i-1],line[i])),`unmatched contour edge at ${f.properties.elevationM} m`);}
 for(const [index,band] of bands.entries()){assert.equal(band.properties.color,layer.legend[index].color);assert.equal(band.properties.classId,layer.legend[index].id);}
});
