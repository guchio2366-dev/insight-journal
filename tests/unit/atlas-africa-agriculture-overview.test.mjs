import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {africaAgriContextPlace} from '../../src/scripts/atlas-africa-layers.ts';
import {projectAfrica} from '../../src/lib/atlas-africa-geometry.ts';

const expected=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];

test('Madagascar is an existing country locator for overview and rice, including rice-only, and stays outside unrelated viewports',()=>{
 const country=JSON.parse(readFileSync(new URL('../../src/data/atlas/africa-countries.json',import.meta.url),'utf8')).find(row=>row.code==='MDG');
 const all=[0,0,1100,907],rice='crop-rice-harvested';
 for(const [overview,focused,layers]of [[true,'crop-maize-harvested',expected],[false,rice,expected],[false,rice,[rice]]])assert.deepEqual(africaAgriContextPlace(overview,focused,layers,all),country);
 assert.equal(africaAgriContextPlace(false,'crop-maize-harvested',expected,all),null);
 assert.equal(africaAgriContextPlace(true,'crop-maize-harvested',['crop-maize-harvested'],all),null);
 const [left,top]=projectAfrica([10,-15]),[right,bottom]=projectAfrica([35,-36]);
 assert.equal(africaAgriContextPlace(false,rice,expected,[left,top,right-left,bottom-top]),null,'southern mainland view does not acquire an off-map country label');
 const [eastLeft,eastTop]=projectAfrica([25,15]),[eastRight,eastBottom]=projectAfrica([52,-27]);
 assert.deepEqual(africaAgriContextPlace(false,rice,expected,[eastLeft,eastTop,eastRight-eastLeft,eastBottom-eastTop]),country);
});
