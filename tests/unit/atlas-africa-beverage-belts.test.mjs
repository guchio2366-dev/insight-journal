import test from 'node:test';
import assert from 'node:assert/strict';
import {africaBeverageBelts,africaBeverageSources,africaBeverageNote,africaBeveragePointNote} from '../../src/data/atlas/africa-beverage-belts.ts';
import {africaCommodityColor} from '../../src/scripts/atlas-africa-layers.ts';

test('every authored belt retains an identifiable source, locality, year and reuse note without numeric grid claims',()=>{
 const sources=new Map(africaBeverageSources.map(s=>[s.id,s]));assert.equal(sources.size,africaBeverageSources.length);
 assert.equal(new Set(africaBeverageBelts.map(b=>b.id)).size,africaBeverageBelts.length);
 for(const belt of africaBeverageBelts){const source=sources.get(belt.source);assert(source,belt.id+' must retain provenance');assert(source.period&&source.locator&&source.reuse);assert.match(source.url,/^https:\/\//);assert.match(belt.country,/^[A-Z]{3}$/);assert(belt.places);assert(belt.line.length>=2);assert(belt.radius>0&&belt.radius<=.7,'display belts cannot fill a whole country');assert(belt.line.every(p=>p.length===2&&p.every(Number.isFinite)));assert.equal('cells' in belt,false);assert.equal('production' in belt,false);assert.equal('harvestedArea' in belt,false);}
 assert.match(africaBeverageNote,/資料年は2000–2025年.*年不記載/);assert.match(africaBeveragePointNote,/地点の生産量・収穫面積は示しません/);
});

test('supported major and smaller disconnected production areas survive, with nine distinct commodity colors',()=>{
 for(const id of ['eth-highlands','uga-elgon','tza-kagera','civ-east','cmr-mungo','bdi-highlands','mdg-east','ken-west-tea','ken-east-tea','mwi-south-tea','mwi-north-tea','tza-northeast-tea','tza-northwest-tea'])assert(africaBeverageBelts.some(b=>b.id===id),id+' must not be lost to a feature cap');
 const products=['maize','rice','wheat','cassava','coffee','tea','cattle','goats','sheep'];assert.equal(new Set(products.map(africaCommodityColor)).size,9);
 const historic=sourcesFor('mdg');assert.match(historic.period,/2000.*歴史/);assert.match(historic.locator,/現在の面積・順位を示す根拠にはしない/);
});
function sourcesFor(id){return africaBeverageSources.find(s=>s.id===id);}
