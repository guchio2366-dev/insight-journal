import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {waterContains} from '../../src/data/atlas/asia-water.ts';
const base='public/assets/atlas/asia-presentation-v1/';
const manifest=JSON.parse(readFileSync(base+'manifest.json','utf8'));

test('農畜産物の概略図は集中域と周辺分布を持ち、名称の制限で地域全体を欠落させない',()=>{
 for(const record of Object.values(manifest.regions)){
  const farm=record.farming,data=JSON.parse(gunzipSync(readFileSync(base+farm.file)));
  assert.ok(data.features.some(f=>f.properties.distribution==='spread'));
  for(const product of farm.products){
   const areas=data.features.filter(f=>f.properties.id===product.id);
   assert.ok(areas.length>0,product.id);
   assert.ok(areas.some(f=>f.properties.distribution==='core'),product.id);
   for(const f of areas){assert.ok(['core','spread'].includes(f.properties.distribution));assert.equal(f.properties.color,product.color);assert.equal(f.properties.kind,product.kind);}
   for(const label of farm.labels.filter(l=>l.product===product.id))assert.ok(areas.some(f=>waterContains(f.geometry,label.coordinate)),product.id+' label must be inside displayed distribution');
  }
  for(const c of Object.values(farm.countryCoverage))assert.ok(c.coreCells<=c.displayCells&&c.displayCells<=c.landCells);
 }
 const east=manifest.regions['east-asia'].farming.countryCoverage;
 const south=manifest.regions['south-central-asia'].farming.countryCoverage;
 assert.ok(east.TWN.displayCells/east.TWN.landCells>.9,'Taiwan must not disappear because no component was among the six largest');
 assert.ok(east.JPN.displayCells/east.JPN.landCells>.9,'ordinary regional distribution in Japan remains visible');
 assert.ok(south.IND.displayCells/south.IND.landCells>.9,'the Indian overview includes ordinary distribution beyond concentration cores');
 assert.ok(south.KAZ.displayCells/south.KAZ.landCells>.4,'Central Asian distribution is not reduced to a few concentration pockets');
 assert.ok(south.KAZ.displayCells<south.KAZ.landCells,'sparse areas are not painted just to fill the map');
 assert.equal(south.MDV.displayCells,0,'missing source coverage must not be invented');
});
