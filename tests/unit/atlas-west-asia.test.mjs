import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readWestState,westSearch,gridIndex,decodeWestGrid,zoomWestView,panWestView} from '../../src/lib/atlas-west-asia-state.mjs';
import {westFields,westTopics,observation} from '../../src/data/atlas/west-asia-topics.mjs';
import {westPrecipitationLayer} from '../../src/lib/atlas-west-asia-precipitation.mjs';
const base=new URL('../../public/assets/atlas/west-asia-v1/',import.meta.url);
const json=async f=>JSON.parse(await readFile(new URL(f,base),'utf8'));
const snapshot=await json('data.json');
const annualManifest=JSON.parse(await readFile(new URL('../west-asia-precipitation-v1/manifest.json',base),'utf8'));
const data={...snapshot,layers:[...snapshot.layers,westPrecipitationLayer(annualManifest,snapshot)]};

test('西アジア18とイラン・エジプトの20対象を全4分野で扱い、未収録を0にしない',()=>{
 assert.deepEqual(data.countries.map(c=>c.code).sort(),'ARM AZE BHR CYP GEO IRQ ISR JOR KWT LBN OMN QAT SAU PSE SYR TUR ARE YEM IRN EGY'.split(' ').sort());
 for(const field of westFields)assert.ok(westTopics.some(t=>t.field===field.id));
 for(const t of westTopics){if(t.layer)assert.ok(data.layers.some(l=>l.id===t.layer),t.id);if(t.indicator)assert.ok(data.worldBank.indicators[t.indicator],t.id);}
 const oil=westTopics.find(t=>t.id==='oil');
 assert.equal(observation(data,oil,'SAU',2024).value,null);
 assert.ok(observation(data,oil,'SAU',2021).value>0);
 const fixtures={worldBank:{indicators:{x:[{code:'A',year:2020,value:0},{code:'B',year:2020,value:null}]}}};
 assert.equal(observation(fixtures,{indicator:'x'},'A',2020).value,0);
 assert.equal(observation(fixtures,{indicator:'x'},'B',2020).value,null);
 assert.equal(observation(fixtures,{indicator:'x'},'C',2020).value,null);
 const pasture=westTopics.find(t=>t.id==='pasture');assert.ok(observation(data,pasture,'SAU',2022).value>0);
});
test('気候色は北米の23凡例と全30色の作成定義に一致し、分類値を置換しない',async()=>{
 const north=JSON.parse(await readFile(new URL('../../public/assets/atlas/nature-v1/climate-legend.json',import.meta.url),'utf8'));
 assert.equal(data.classes.length,30);
 for(const c of north)assert.equal(data.classes.find(x=>x.code===c.code).color,c.color,c.code);
 const source=await readFile(new URL('../../scripts/refine-atlas-nature.py',import.meta.url),'utf8');
 const region=source.split('def climate(')[1].split('\ndef ')[0];
 const codes=region.match(/codes\s*=\s*['"]([^'"]+)['"]\.split\(\)/)[1].split(/\s+/);
 const colors=region.match(/palette\s*=\s*['"]([^'"]+)['"]\.split\(\)/)[1].split(/\s+/);
 codes.forEach((code,i)=>assert.equal(data.classes.find(x=>x.code===code).color,'#'+colors[i]));
 const l=data.layers.find(l=>l.id==='climate'),b=await readFile(new URL(l.grid,base));
 const values=await decodeWestGrid(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),l);
 assert.ok(values.every(v=>v===-9999||Number.isInteger(v)&&v>=1&&v<=30));
 const city=data.cities.find(c=>c.id==='riyadh');assert.equal(values[gridIndex(...city.coordinates,l)],4);
 assert.equal(gridIndex(0,0,l),-1);
});
test('国・都市・地点・表示範囲と年がURLを往復し、不正な値は解除される',()=>{
 const s=readWestState('?country=SAU&city=riyadh&topic=climate&year=2021&map=10,20,400,300&at=46.7,24.9','natural',data);
 assert.deepEqual(readWestState(westSearch(s),'natural',data),s);
 const ag=readWestState(westSearch(s,'agriculture'),'agriculture',data);assert.equal(ag.topic,'wheat');assert.equal(ag.city,'riyadh');assert.deepEqual(ag.view,s.view);assert.deepEqual(ag.point,s.point);
 const bad=readWestState('?country=XXX&city=nonexistent&topic=ports&map=0,0,-2,NaN&year=1800&at=999,0','natural',data);
 assert.equal(bad.country,'');assert.equal(bad.city,'');assert.equal(bad.topic,'climate');assert.equal(bad.view,null);assert.equal(bad.year,2024);assert.equal(bad.point,null);
 assert.equal(readWestState('?country=BHR&city=riyadh','natural',data).city,'');
});
test('圧縮済み・配信側で展開済みの格子を同じ値として読み、破損を拒否する',async()=>{
 const values=new Float32Array([0,-9999,4,12.5]);const l={width:2,height:2};
 const bytes=Buffer.from(values.buffer),compressed=gzipSync(bytes);
 assert.deepEqual([...await decodeWestGrid(values.buffer,l)],[...values]);
 assert.deepEqual([...await decodeWestGrid(compressed.buffer.slice(compressed.byteOffset,compressed.byteOffset+compressed.byteLength),l)],[...values]);
 await assert.rejects(decodeWestGrid(new ArrayBuffer(3),l));
 await assert.rejects(decodeWestGrid(new Float32Array([NaN,1,2,3]).buffer,l));
});
test('縦長・横長の表示を繰り返し拡縮・移動してもURLへ復元できる範囲を保つ',()=>{
 for(const initial of [[0,0,450,1050],[0,0,800,30]]){
  const ratio=initial[2]/initial[3];let v=initial;
  for(const factor of [...Array(20).fill(.65),...Array(20).fill(1.54)]){
   v=zoomWestView(v,factor);assert.ok(Math.min(v[2],v[3])>=15-1e-9);assert.ok(Math.max(v[2],v[3])<=3000+1e-9);assert.ok(Math.abs(v[2]/v[3]-ratio)<1e-8);
   const s=readWestState('','natural',data);s.view=v;assert.notEqual(readWestState(westSearch(s),'natural',data).view,null);
  }
  v=panWestView(v,1e6,-1e6);assert.equal(v[0],4000);assert.equal(v[1],-4000);
  v=zoomWestView(v,.65);const s=readWestState('','natural',data);s.view=v;assert.notEqual(readWestState(westSearch(s),'natural',data).view,null);
 }
});
test('ナイル川を含む流域はエジプトの南側を切り落とさず、都市人口は固定範囲を使う',async()=>{
 const basins=await json('basins.json');const nile=basins.features.find(f=>f.properties.name.includes('ナイル川')&&f.properties.countries.includes('EGY'));
 assert.ok(nile);assert.ok(nile.properties.bounds[1]<0);assert.ok(nile.properties.bounds[3]>30);
 assert.ok(data.urban.cities.length>=20);
 for(const city of data.urban.cities){assert.deepEqual(Object.keys(city.history),['2000','2010','2020']);assert.ok(city.areaKm2>0);assert.ok(city.coordinates[0]>=23&&city.coordinates[0]<=64);}
 for(const city of data.cities){assert.equal(city.temperatureC.length,12);assert.equal(city.precipitationMm.length,12);assert.equal(city.normalPeriod,'1991–2020');assert.ok(city.sourceSha256[0].length===64);}
});
test('出荷するデータは資料台帳のハッシュと寸法に一致する',async()=>{
 const manifest=await json('manifest.json');
 for(const [name,record] of Object.entries(manifest.files)){const b=await readFile(new URL(name,base));assert.equal(b.length,record.bytes,name);assert.equal(createHash('sha256').update(b).digest('hex'),record.sha256,name);}
 for(const l of data.layers.filter(l=>l.grid)){const b=gunzipSync(await readFile(new URL(l.grid,base)));assert.equal(b.length,l.width*l.height*4,l.id);}
 const coverage=await json('coverage.json');assert.equal(coverage.length*4,80);for(const c of coverage){assert.ok(c.agriculture.rows>0,c.code);assert.ok(c.population.national>0,c.code);}
});
