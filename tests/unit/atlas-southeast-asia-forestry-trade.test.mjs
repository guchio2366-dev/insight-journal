import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const farm=JSON.parse(readFileSync('public/assets/atlas/asia-farming-v1/statistics.json'));
const trade=JSON.parse(gunzipSync(readFileSync('public/assets/atlas/asia-trade-v1/southeast-asia.json.gz')));
const manifest=JSON.parse(readFileSync('public/assets/atlas/asia-trade-v1/manifest.json'));

test('Southeast forestry comparison and trade destinations have valid, separate denominators',()=>{
 assert.equal(manifest.year,2023);assert.equal(manifest.unit,'current USD');
 for(const code of ['IDN','VNM','THA']){
  for(const item of ['1861','1872']){
   const row=farm.countries[code].observations.find(row=>row.domain==='Forestry'&&row.item===item&&row.element==='Production'&&row.year===2024);
   assert.ok(row?.value>0);assert.equal(row.unit,'m3');
  }
 }
 for(const [code,hs] of [['IDN','1511'],['VNM','0901'],['VNM','44'],['THA','1006'],['THA','4001']]){
  assert.ok(trade.countries[code].products[hs]?.X>0);
 }
 const chapter=trade.countries.IDN.products['15'].X;
 const partners=trade.countries.IDN.partners['15'];
 assert.equal(partners.world,chapter);
 assert.ok(trade.countries.IDN.products['1511'].X<chapter,'HS15 partner shares cannot be relabelled HS1511');
 assert.ok(partners.values.reduce((sum,[,value])=>sum+value,0)<=chapter+1);
});
