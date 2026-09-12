import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../public/assets/atlas/v3/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
test('配信データのハッシュ・容量と対象年を固定する',()=>{
 const manifest=json('manifest.json');assert.equal(manifest.agriculture.year,2023);
 assert.equal(manifest.agriculture.selection.Name,'2023_30m_cdls');
 for(const [name,record] of Object.entries(manifest.files)){const bytes=readFileSync(new URL(name,root));assert.equal(bytes.length,record.bytes,name);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,name);}
 assert.ok(Object.values(manifest.files).reduce((n,f)=>n+f.bytes,0)<2_500_000);
});
test('作物域は州IDでなく共通の緯度経度を持ち、全作物と重なりを含む',()=>{
 const data=json('agriculture.geojson');assert.deepEqual(data.features.map(f=>f.properties.id),['corn','soybean','wheat','cotton','rice','specialty','corn-soybean']);
 const check=c=>{if(typeof c[0]==='number'){assert.ok(c[0]>=-128&&c[0]<=-64);assert.ok(c[1]>=22&&c[1]<=52);}else c.forEach(check);};
 data.features.forEach(f=>{check(f.geometry.coordinates);assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));assert.equal(f.properties.year,2023);assert.equal(f.properties.state,undefined);});
});
test('基礎地理と代替表示に必要なデータが揃っている',()=>{
 const kinds=new Set(json('base.geojson').features.map(f=>f.properties.kind));
 for(const k of ['land','state','river','lake'])assert.ok(kinds.has(k));
 assert.ok(json('labels.json').length>=48);assert.ok(json('crop-labels.json').length>=6);
 assert.ok(json('land.geojson').features.every(f=>f.properties.name));
 for(const name of ['relief.webp','agriculture-fallback.webp','land-fallback.webp'])assert.ok(statSync(new URL(name,root)).size>10000);
});
