import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {readPopulationState,writePopulationState} from '../../src/lib/atlas-population-state.ts';
import {populationColor,density} from '../../src/lib/atlas-population-data.ts';
import {createPopulationLoader} from '../../src/lib/atlas-population-loader.ts';
import {missingColor,densityColors,shareColors,voteColors} from '../../src/data/atlas/population.ts';
const base='public/assets/atlas/population/v1/';const data=async n=>JSON.parse(await readFile(base+n+'.json','utf8'));
test('population URL validates views, groups and geometry while preserving global state',()=>{
 const url=new URL('https://example.org/?crop=rice&z=9&popView=bad&popEthnicity=bad&popGeo=<script>');const state=readPopulationState(url);assert.equal(state.view,'distribution');assert.equal(state.ethnicity,'white');assert.equal(state.geo,'');state.view='religion';state.religion='muslim';state.geo='state:06';const encoded=writePopulationState(url,state);assert.deepEqual(readPopulationState(encoded),state);assert.equal(encoded.searchParams.get('z'),'9');assert.equal(encoded.searchParams.get('crop'),'rice');
});
test('zeros, exact thresholds, missing data and vote sign have distinct colors',()=>{
 assert.equal(populationColor(null,'distribution'),missingColor);assert.equal(populationColor(0,'distribution'),densityColors[0]);assert.equal(populationColor(1,'distribution'),densityColors[1]);assert.equal(populationColor(10,'distribution'),densityColors[3]);assert.equal(populationColor(10000,'distribution'),densityColors[6]);assert.equal(populationColor(.9,'ethnicity'),shareColors[1]);assert.equal(populationColor(1,'ethnicity'),shareColors[2]);assert.equal(populationColor(101,'ethnicity'),missingColor);for(const [v,i] of [[-15,0],[-5,1],[0,2],[5,3],[15,4]])assert.equal(populationColor(v,'vote'),voteColors[i]);assert.equal(density({population:[null,null],area:2}),null);assert.equal(density({population:[1,null],area:0}),null);
});
test('national ACS totals and all eight mutually exclusive groups reconcile in every county',async()=>{
 const p=await data('counties'),e=await data('ethnicity');assert.equal(p.rows.length,3144);assert.equal(Object.keys(p.states).length,51);assert.equal(p.rows.reduce((n,r)=>n+r.population[0],0),334922499);assert.equal(p.classification.reduce((a,b)=>a+b,0),p.national);const lookup=new Map(p.rows.map(r=>[r.id,r]));for(const r of e.rows)assert.equal(r.counts.reduce((n,c)=>n+c[0],0),lookup.get(r.id).population[0]);assert.equal(e.national.reduce((n,c)=>n+c[0],0),p.national);
});
test('metro geometry, suppressed NY values and compression budgets reconcile',async()=>{
 for(const [code,count] of [['35620',4917],['31080',3108],['19100',1704]]){const d=await data('metro-'+code),g=await data('metro-'+code+'.geo');assert.equal(d.rows.length,count);assert.deepEqual(new Set(d.rows.map(r=>r.id)),new Set(g.features.map(f=>f.properties.id)));assert.equal(d.rows.filter(r=>r.population[0]===null).length,code==='35620'?14:0);const bytes=(await stat(base+'metro-'+code+'.geo.json.gz')).size+(await stat(base+'metro-'+code+'.outlines.geo.json.gz')).size;assert.ok(bytes<1_000_000,code+' '+bytes);}
 assert.ok((await stat(base+'counties.geo.json.gz')).size<1_000_000);
});
test('election totals use valid votes and truthful geography gaps',async()=>{
 const d=await data('votes');assert.equal(d.rows.filter(r=>r.total===null).length,35);assert.equal(d.national.total,155238302);for(const r of d.rows)if(r.total!==null)assert.equal(r.d+r.r+r.other,r.total);const ct=d.rows.filter(r=>r.id.startsWith('county:09'));assert.equal(ct.length,9);assert.equal(ct.reduce((n,r)=>n+r.total,0),1759010);assert.equal(d.rows.find(r=>r.id==='county:35011').total,null);
});
test('loader retries invalid payloads and accepts compressed or already decompressed responses',async()=>{
 const original=globalThis.fetch;let calls=0;const content=JSON.stringify({version:1,rows:[]});globalThis.fetch=async()=>{calls++;return new Response(calls===1?'{}':content)};
 try{const loader=createPopulationLoader('/');await assert.rejects(loader.get('counties'));assert.equal((await loader.get('counties')).version,1);await loader.get('counties');assert.equal(calls,2);const {gzipSync}=await import('node:zlib');globalThis.fetch=async()=>new Response(gzipSync(content));assert.equal((await createPopulationLoader('/').get('counties')).version,1);}finally{globalThis.fetch=original;}
});

test('metro LRU refreshes the whole metro when any one of its files is reused',async()=>{
 const original=globalThis.fetch, requests=[];globalThis.fetch=async url=>{requests.push(url);return new Response(JSON.stringify(String(url).includes('.geo.')?{type:'FeatureCollection',features:[]}:{version:1,rows:[]}));};
 try{const loader=createPopulationLoader('/');await loader.get('metro-35620');await loader.get('metro-35620.geo');await loader.get('metro-31080');await loader.get('metro-35620.geo');await loader.get('metro-19100');await loader.get('metro-35620');assert.equal(requests.filter(x=>x==='/metro-35620.json.gz').length,1);await loader.get('metro-31080');assert.equal(requests.filter(x=>x==='/metro-31080.json.gz').length,2);}finally{globalThis.fetch=original;}
});
test('an evicted request failure does not discard a newer request with the same key',async()=>{
 const original=globalThis.fetch;let rejectOld,calls=0;globalThis.fetch=async url=>{if(String(url).includes('metro-35620')){calls++;if(calls===1)return new Promise((_,reject)=>rejectOld=reject);}return new Response(JSON.stringify({version:1,rows:[]}));};
 try{const loader=createPopulationLoader('/');const old=loader.get('metro-35620');const rejected=assert.rejects(old);await loader.get('metro-31080');await loader.get('metro-19100');await loader.get('metro-35620');rejectOld(new Error('late failure'));await rejected;await loader.get('metro-35620');assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
