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
 assert.equal(readPopulationState(new URL('https://example.org/?popReligionStory=utah-lds')).story,'utah-lds');assert.equal(readPopulationState(new URL('https://example.org/?popReligionStory=bad')).story,'');
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


test('city URL state uses the exact climate-city catalog and rejects unknown keys',async()=>{
 const {populationCityProfiles}=await import('../../src/data/atlas/population-reading.ts');
 const {populationCityReligionProfiles,religionStoryIds}=await import('../../src/data/atlas/population-religion-reading.ts');
 const cities=JSON.parse(await readFile('public/assets/atlas/nature-v1/climate-cities.json','utf8'));
 assert.deepEqual(Object.keys(populationCityProfiles).sort(),cities.map(c=>c.id).sort());
 assert.deepEqual(Object.keys(populationCityReligionProfiles).sort(),cities.map(c=>c.id).sort());
 for(const city of cities){const url=new URL('https://example.org/?city=seattle&popCity='+city.id);const state=readPopulationState(url);assert.equal(state.city,city.id);assert.equal(writePopulationState(url,state).searchParams.get('city'),'seattle');assert.ok(populationCityProfiles[city.id].jobs);}
 for(const profile of Object.values(populationCityReligionProfiles))for(const story of profile.stories)assert.ok(religionStoryIds.includes(story));
 for(const id of ['bad','__proto__','constructor'])assert.equal(readPopulationState(new URL('https://example.org/?popCity='+id)).city,'');
});

test('composition preserves 100% geometry without promoting missing religious groups to zero',async()=>{
 const {populationComposition}=await import('../../src/lib/atlas-population-chart.ts');
 const raw=JSON.parse(await readFile('data/atlas/population-religion-reviewed.json','utf8'));
 const items=Object.entries(raw.national).map(([label,n])=>({label,value:n.status==='value'?n.value:null,color:'#123456'}));
 const chart=populationComposition(items);assert.ok(Math.abs(chart.known-94.9)<1e-8);assert.ok(Math.abs(chart.remainder-5.1)<1e-8);assert.equal(chart.slices.find(s=>s.label==='protestant').value,40);assert.ok(Math.abs(chart.slices.reduce((n,s)=>n+s.value,0)-100)<1e-8);assert.ok(!chart.slices.some(s=>s.label==='otherChristian'));assert.equal(items.find(s=>s.label==='otherChristian').value,null);
 assert.equal(populationComposition([{label:'invalid',value:101,color:'#fff'}]),null);
 const full=populationComposition([{label:'a',value:60,color:'#fff'},{label:'b',value:40,color:'#000'}]);assert.equal(full.remainder,0);assert.equal(full.slices[1].offset,60);
});

test('fallback city coordinates share the raster and religion SVG extents',async()=>{
 const {populationFallbackExtent,populationFallbackBox,projectPopulationFallback}=await import('../../src/lib/atlas-population-projection.ts');
 for(const padding of [0,.1]){const extent=populationFallbackExtent(undefined,padding),box=populationFallbackBox({left:0,top:0,right:1200,bottom:720},extent);const ny=projectPopulationFallback([-74,40.7],box,extent);assert.ok(ny.x>900&&ny.x<1100);assert.ok(ny.y>200&&ny.y<400);const center=projectPopulationFallback([-95.5,24],box,extent);assert.ok(Math.abs(center.x-600)<1e-8);assert.ok(box.bottom<=720&&box.top>=0);}
});
