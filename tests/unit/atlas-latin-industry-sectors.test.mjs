import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {industryBundle} from './atlas-latin-industry-helpers.mjs';
import {Window} from 'happy-dom';
const code=await industryBundle("export * from './src/lib/atlas-latin-industry-sectors.ts';export * from './src/lib/atlas-latin-industry-layers.ts';",'esm','node');
const lib=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const data=JSON.parse(await readFile('src/data/atlas/latin-america/industry-sectors.json','utf8'));
const initial={sector:'resources',industry:null,site:null,single:false,scope:'all',place:'all'};
test('Adopted coordinates and raw sources remain independently traceable to the original Natural Earth features',async()=>{
 const original=JSON.parse(await readFile(data.coordinateSource.subsetPath,'utf8'));
 assert.equal(original.fullInputSha256,data.coordinateSource.inputSha256);
 for(const site of data.sites.filter(s=>s.coordinateSource.type==='locality-guide')){const feature=original.features.find(f=>f.properties.NE_ID===site.coordinateSource.neId);assert.ok(feature,site.id);assert.equal(feature.properties.NAME,site.coordinateSource.sourceName);assert.equal(feature.properties.ADM0NAME,site.coordinateSource.sourceCountry);assert.deepEqual(feature.geometry.coordinates,site.coordinates);}
 for(const s of data.sites){assert.ok(s.note&&s.coordinateMeaning&&s.sources.length);for(const ref of s.sources)assert.ok(data.sources.some(source=>source.id===ref));}
});
test('Separate maps follow the displayed process, while dual mining/processing and raw aquaculture keep their source facts',()=>{
 const resource=lib.sectorSites('resources'),manufacturing=lib.sectorSites('manufacturing'),services=lib.sectorSites('services');
 assert.equal(resource.length,27);assert.equal(manufacturing.length,45);assert.equal(services.length,13);
 for(const s of resource)assert.ok(data.sites.find(raw=>raw.id===s.id).sectors.includes('resources'),s.id);
 for(const raw of data.sites.filter(s=>s.stageKind==='processing'&&s.sectors.includes('resources')&&s.sectors.includes('manufacturing')))assert.deepEqual(lib.industrySectorsForSite(raw.id),['resources','manufacturing'],'Shared processing reference: '+raw.id);
 for(const s of manufacturing)assert.equal(s.stageKind,'processing',s.id);
 for(const s of services)assert.equal(s.stageKind,'service',s.id);
 for(const id of ['refining','steel','aluminum','alumina'])assert.ok(lib.sectorIndustries('resources').some(i=>i.id===id));
 assert.match(resource.find(s=>s.id==='araxa-niobium').stage,/採掘/);assert.match(manufacturing.find(s=>s.id==='araxa-niobium').stage,/フェロニオブ/);
 assert.deepEqual(lib.industrySectorsForSite('reduc'),['resources','manufacturing']);assert.deepEqual(lib.industrySectorsForSite('araxa-niobium'),['resources','manufacturing']);
 assert.deepEqual(lib.industryReferenceSites('manufacturing').map(s=>s.id),['guayas-shrimp','oro-shrimp']);
 for(const s of [...resource,...manufacturing,...services]){const raw=data.sites.find(r=>r.id===s.id);assert.deepEqual(s.coordinates,raw.coordinates);assert.equal(s.note,raw.note);assert.deepEqual(s.sources,raw.sources);}
});
test('Same-industry clusters retain every mapped source ID, country, phase and coordinate without summing quantities',()=>{
 for(const [width,height] of [[960,770],[640,440],[360,600],[328,600],[300,600]])for(const sector of data.sectors){
  const scene=lib.industrySectorScene({...initial,sector:sector.id},width,height),ids=[];
  for(const c of scene.clusters){assert.ok(Math.hypot(c.point[0]-c.displayPoint[0],c.point[1]-c.displayPoint[1])<=24.001);for(const s of c.members){ids.push(s.id);assert.equal(s.industry,c.industry);assert.equal(s.country,c.members[0].country);assert.equal(s.stageKind,c.stageKind);assert.deepEqual(s.coordinates,data.sites.find(r=>r.id===s.id).coordinates);}}
  assert.deepEqual(ids.sort(),lib.sectorSites(sector.id).map(s=>s.id).sort());assert.ok(scene.clusters.length<scene.visible.length);for(let i=0;i<scene.clusters.length;i++)for(let j=i+1;j<scene.clusters.length;j++)assert.ok(Math.hypot(scene.clusters[i].displayPoint[0]-scene.clusters[j].displayPoint[0],scene.clusters[i].displayPoint[1]-scene.clusters[j].displayPoint[1])>=11.99);
 }
});
test('Selection and explicit single mode never participate in camera, cluster or candidate-label layout',()=>{
 for(const sector of data.sectors){const state={...initial,sector:sector.id},base=lib.industrySectorScene(state,960,770);for(const i of lib.sectorIndustries(sector.id))for(const single of [false,true])assert.deepEqual(lib.industrySectorScene({...state,industry:i.id,site:lib.sectorSites(sector.id).find(s=>s.industry===i.id).id,single},960,770),base);}
});
test('The overview has few noninteractive captions and short leaders; selected labels are alternative states',async()=>{
 const w=new Window();try{for(const [width,height] of [[960,770],[640,440],[360,600],[300,600]])for(const sector of data.sectors){
  const state={...initial,sector:sector.id},scene=lib.industrySectorScene(state,width,height),sets=[scene.overviewLabels,...lib.sectorIndustries(sector.id).map(i=>scene.labels.filter(l=>l.industry===i.id))];
  assert.ok(scene.overviewLabels.length>0&&scene.overviewLabels.length<=(width<620?4:8));
  for(const labels of sets)for(let i=0;i<labels.length;i++){const a=labels[i];assert.ok(a.x>=8&&a.x+a.width<=width-8&&a.y-a.height>=8&&a.y<=height-8);const nx=Math.max(a.x,Math.min(a.anchorX,a.x+a.width)),ny=Math.max(a.y-a.height,Math.min(a.anchorY,a.y));assert.ok(Math.hypot(nx-a.anchorX,ny-a.anchorY)<=36.001);for(let j=i+1;j<labels.length;j++){const b=labels[j];assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y-a.height<b.y&&a.y>b.y-b.height));}}
  w.document.body.innerHTML=lib.renderIndustrySectorMap(state,width,height);assert.equal(w.document.querySelectorAll('[data-lis-label][role=button],[data-lis-label][tabindex]').length,0);assert.equal(w.document.querySelector('[data-lis-svg]').dataset.lisMapSector,sector.id);
  assert.equal(w.document.querySelectorAll('[data-lis-label]').length,scene.overviewLabels.length);
 }}finally{await w.happyDOM.close();}
});
test('Single mode hides other product clusters and keeps geography, original coordinates and the selected labels',async()=>{
 const w=new Window();try{const state={...initial,sector:'manufacturing',industry:'refining',single:true};w.document.body.innerHTML=lib.renderIndustrySectorMap(state);const marks=[...w.document.querySelectorAll('[data-lis-cluster]')];assert.ok(marks.length);assert.ok(marks.every(m=>m.dataset.industry==='refining'));assert.equal(w.document.querySelectorAll('svg>g:first-child>path').length,34);const members=marks.flatMap(m=>m.dataset.lisMembers.split(' '));assert.deepEqual(members.sort(),lib.sectorSites('manufacturing').filter(s=>s.industry==='refining').map(s=>s.id).sort());}finally{await w.happyDOM.close();}
});
test('URLs retain country flags, normalize old resource-processing entries and preserve unmapped raw-material references',()=>{
 const state={...initial,sector:'manufacturing',industry:'refining',site:'reduc',single:true,scope:'south',place:'BRA'},url=lib.writeIndustrySectorState(new URL('https://example.test/industry/?only=1&fallback=1'),state);assert.deepEqual(lib.readIndustrySectorState(url),state);assert.equal(url.searchParams.get('only'),'1');assert.equal(url.searchParams.get('fallback'),'1');
 const legacy=lib.readIndustrySectorState(new URL('https://example.test/?sector=resources&site=reduc&single=1'));assert.equal(legacy.sector,'resources');assert.equal(legacy.site,'reduc');
 const raw=lib.readIndustrySectorState(new URL('https://example.test/?sector=manufacturing&site=guayas-shrimp'));assert.equal(raw.site,'guayas-shrimp');assert.equal(raw.industry,'shrimp');
 assert.deepEqual(lib.readIndustrySectorState(new URL('https://example.test/?sector=bad&industry=constructor&site=unknown&place=XX')),initial);
 const bad=lib.readIndustrySectorState(new URL('https://example.test/?sector=services&industry=copper&site=atacama&single=1'));assert.equal(bad.industry,null);assert.equal(bad.site,null);assert.equal(bad.single,false);
 const country=lib.readIndustrySectorState(new URL('https://example.test/?place=BRA&scope=country'));assert.equal(country.contextScope,'country');assert.equal(country.scope,'all');
});
test('Central and South scopes use countries and each map has only its own displayed phase and source members',()=>{
 assert.equal(lib.sectorSitesForScope('manufacturing','central').length,3);assert.equal(lib.sectorSitesForScope('resources','central').length,0);
 assert.ok(lib.sectorSitesForScope('services','central').some(s=>s.id==='panama-canal'));assert.ok(!lib.sectorSitesForScope('services','south').some(s=>s.id==='panama-canal'));
 for(const sector of data.sectors)for(const scope of ['all','south','central']){const scene=lib.industrySectorScene({...initial,sector:sector.id,scope});const expected=new Set(lib.sectorSitesForScope(sector.id,scope).map(s=>s.id));assert.ok(scene.clusters.every(c=>c.members.every(s=>expected.has(s.id))));}
});
