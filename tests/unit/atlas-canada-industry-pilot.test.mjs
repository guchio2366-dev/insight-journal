import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseCsv} from '../../scripts/prepare-mexico-industry.mjs';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const pilot=JSON.parse(await readFile('src/data/atlas/canada/industry-pilot.json','utf8'));
const metrics=JSON.parse(await readFile('src/data/atlas/canada/industry-pilot-statistics.json','utf8'));
const compiled=await bundleCanadaSource('src/lib/atlas-canada-industry-pilot.ts',{platform:'node',format:'esm'}),lib=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('Every adopted industry has multiple source-supported locations; overlapping processors reuse the same records',()=>{
 assert.deepEqual(pilot.sectors.map(s=>s.id),['resources','manufacturing','services']);
 assert.equal(new Set(pilot.clusters.map(c=>c.id)).size,pilot.clusters.length);
 for(const i of pilot.industries)for(const sector of i.sectors)assert(pilot.clusters.filter(c=>c.industry===i.id&&c.sectors.includes(sector)).length>=2,i.id+' has multiple locations in '+sector);
 for(const c of pilot.clusters){assert(c.coordinates.every(Number.isFinite));assert(c.coordinates[0]>=-141&&c.coordinates[0]<=-45);assert(c.coordinates[1]>=41&&c.coordinates[1]<=65);assert(c.sources.length);for(const id of c.sources){assert(pilot.sources[id]);assert.match(pilot.sources[id].url,/^https:\/\//);}assert.equal(c.value,undefined,'No production/employment stand-ins on locator marks');}
 for(const id of ['edmonton','sudbury','long-harbour','kitimat'])assert.deepEqual(pilot.clusters.find(c=>c.id===id).sectors,['resources','manufacturing']);
 assert.deepEqual(pilot.flows.map(f=>[f.from,f.to,f.kind,f.source]),[['voisey','long-harbour','documented-supply','voiseys-bay']]);
});
test('New 2021 petroleum/coal and transport GDP are reproduced from retained raw rows, with missing employment kept null',async()=>{
 const archive=await readFile('public/assets/atlas/canada-industry-parity-v1/gdp-2021.csv.gz'),rows=parseCsv(gunzipSync(archive).toString());
 const provenance=JSON.parse(await readFile('data-source/atlas/canada/industry/pilot/provenance.json','utf8'));assert.equal(createHash('sha256').update(archive).digest('hex'),provenance.inputGDPsha256);
 for(const m of metrics){const source=rows.filter(r=>r.REF_DATE==='2021'&&r.Prices==='Current dollars'&&r['North American Industry Classification System (NAICS)'].endsWith('['+m.gdpCodes[0]+']'));assert.equal(source.length,13);assert.equal(m.provinces.length,13);for(const p of m.provinces){const r=source.find(r=>r.GEO===p.id);assert.equal(r.STATUS,'');assert.equal(r.SYMBOL,'');assert.equal(r.SCALAR_FACTOR,'millions');assert.equal(p.gdp,Number(r.VALUE));}assert.equal(m.gdp,Math.round(source.reduce((sum,r)=>sum+Number(r.VALUE),0)*10)/10);}
 assert.equal(metrics[0].employment,null);assert.equal(metrics[1].employment,986.7);
});
test('URL state retains camera and only mode through history while rejecting cross-category sites and invalid frames',()=>{
 const read=q=>lib.readPilotState(new URL('https://example.com/industry/'+q),['Ontario','Alberta']);
 const state=read('?sector=manufacturing&subsector=refining&site=edmonton&only=1&industryFrame=50,220,940,510');assert.equal(state.site,'edmonton');assert.equal(state.only,true);assert.deepEqual(state.frame,[50,220,940,510]);
 assert.equal(read('?sector=services&subsector=refining&site=edmonton&only=1').site,null);assert.equal(read('?sector=services&only=1').only,false);
 for(const q of ['?industryFrame=1,2,0,100','?industryFrame=1,,900,500','?industryFrame=NaN,1,900,500'])assert.equal(read(q).frame,null);
 const u=lib.writePilotState(new URL('https://example.com/industry/?year=2025&metric=mining&compare=Quebec'),state);assert.equal(u.searchParams.has('year'),false);assert.equal(u.searchParams.has('metric'),false);assert.deepEqual(lib.readPilotState(u,['Ontario','Alberta']),state);
});
