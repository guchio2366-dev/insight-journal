import test from 'node:test';
import assert from 'node:assert/strict';
import {cityAgricultureUrl} from '../../src/lib/atlas-city-agriculture-link.ts';
import {readAgricultureReadingState,readAgricultureDetailState} from '../../src/lib/atlas-agriculture-detail-state.ts';
import {readAtlasState} from '../../src/lib/atlas-state.ts';

test('都市から品目へは古い対象を除き、位置・都市・他分野の状態と対応する統計を保持する',()=>{
  const source=new URL('https://example.com/insight-journal/atlas/north-america/nature/?city=denver&lng=-104.8&lat=39.7&z=5&view=custom&crop=rice&region=sacramento-rice&relation=california-rice-water&animal=dairy&animalRegion=california-dairy&agriReading=relation:california-rice-water&agriProduct=rice&agriLayers=none&stats=rice&livestockStats=beef&milkBasis=skim&sector=services&popView=religion#crop-rice');
  for(const product of ['wheat','dairy','specialty']){
    const result=cityAgricultureUrl(source,'/insight-journal/atlas/north-america/','denver',product);
    assert.equal(result.pathname,'/insight-journal/atlas/north-america/agriculture/');
    assert.deepEqual(readAgricultureReadingState(result).view,{kind:'product',id:product});
    const state=readAtlasState(result);
    assert.equal(state.field,'agriculture');assert.equal(state.city,'denver');assert.deepEqual(state.camera,{lng:-104.8,lat:39.7,zoom:5});assert.equal(state.view,'custom');
    for(const key of ['region','relation','animal','animalRegion'])assert.equal(result.searchParams.get(key),null);
    for(const key of ['milkBasis','sector','popView'])assert.equal(result.searchParams.get(key),source.searchParams.get(key));
    assert.deepEqual(state.agriLayers,[product==='dairy'?'livestock':'crops']);
    if(product==='wheat')assert.equal(readAgricultureDetailState(result).stats,'wheat');
    if(product==='dairy')assert.equal(readAgricultureDetailState(result).livestockStats,'dairy');
    assert.equal(result.hash,product==='dairy'?'#livestock-dairy':'#crop-'+product);
  }
  assert.equal(source.searchParams.get('agriProduct'),'rice');
});
