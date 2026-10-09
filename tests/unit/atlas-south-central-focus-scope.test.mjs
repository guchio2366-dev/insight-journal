import test from 'node:test';
import assert from 'node:assert/strict';
import {asiaFocusCountries,asiaFocusIndustry,asiaFocusWaterRivers,asiaFocusShareExample,asiaFocusViews} from '../../src/data/atlas/asia-focus.ts';
import {asiaWaterFocus} from '../../src/data/atlas/asia-water-focus.ts';
import shares from '../../public/assets/atlas/south-central-asia-v1/world-shares.json' with {type:'json'};

test('南・中央アジアの入口は重ならない国と、その地域で出典のある事例を使う',()=>{
 const south=new Set(asiaFocusCountries['south-asia']),central=new Set(asiaFocusCountries['central-asia']);
 assert.equal(south.size,8);assert.equal(central.size,5);
 assert.ok([...south].every(code=>!central.has(code)));
 for(const id of ['south-asia','central-asia']){
  const {groups,sites}=asiaFocusIndustry(id),codes=new Set(asiaFocusCountries[id]);
  assert.ok(groups.length>=4&&sites.length>=5,id);
  assert.ok(sites.every(site=>codes.has(site.country)&&groups.some(group=>group.id===site.group)),id);
  assert.ok(asiaFocusWaterRivers[id].every(river=>asiaWaterFocus['south-central-asia'].some(item=>item.river===river)),id);
  const {country,product}=asiaFocusShareExample[id],record=shares.series.find(series=>series.id===product)?.years.find(year=>year.year===2024)?.countries[country];
  assert.ok(codes.has(country)&&record&&record.share>=0,id);
  assert.ok(asiaFocusViews[id].bounds.length===4);
 }
 assert.ok(asiaFocusIndustry('south-asia').sites.some(site=>site.country==='IND'));
 assert.ok(asiaFocusIndustry('central-asia').sites.every(site=>site.country!=='IND'));
});
