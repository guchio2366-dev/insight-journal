import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {westIndustrySites,westIndustryRoles} from '../../src/data/atlas/west-asia-industry.mjs';
import {westProductionAdopted} from '../../src/data/atlas/west-asia-topics.mjs';
import shares from '../../src/data/atlas/west-asia-world-shares.json' with {type:'json'};

test('industry roles preserve the region network and keep the offshore oil field away from Abu Dhabi city',()=>{
 assert.equal(westIndustrySites.length,12);
 assert.deepEqual(westIndustryRoles['industry-extraction'],['resource']);
 assert.deepEqual(westIndustrySites.filter(s=>s.kind==='resource').map(s=>s.id),['eastern-oil','upper-zakum']);
 assert(!westIndustrySites.some(s=>s.id==='abudhabi'));
 assert(westIndustrySites.some(s=>s.id==='suez'&&s.country==='network'));
});
test('world production shares use the same retained FAOSTAT archive and preserve missing world totals',()=>{
 const west=JSON.parse(readFileSync('public/assets/atlas/west-asia-v1/statistics.json','utf8'));
 const archive=west.inputs.find(x=>x.file.startsWith('Production_Crops_Livestock'));
 assert.equal(shares.archiveSha256,archive.sha256);
 assert.equal(westProductionAdopted.length,10);
 assert.deepEqual(Object.entries(shares.rows).filter(([,rows])=>rows).map(([id])=>id),['wheat','cattle-milk','barley','rice','chicken-meat','hen-eggs','cattle-meat']);
 for(const rows of Object.values(shares.rows))if(rows){assert.equal(rows.length,10);for(const row of rows){assert(row.reported>0&&row.reported<=20);assert(row.region>0&&row.region<=row.world);assert(Math.abs(row.percent-row.region/row.world*100)<.00051);}}
 for(const id of ['dates','olives','buffalo-milk'])assert.equal(shares.rows[id],null);
});
