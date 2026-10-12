import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {industryBundle} from './atlas-latin-industry-helpers.mjs';
import {Window} from 'happy-dom';
const code=await industryBundle("export * from './src/lib/atlas-latin-industry-sectors.ts';",'esm','node');
const lib=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const data=JSON.parse(await readFile('src/data/atlas/latin-america/industry-sectors.json','utf8'));
const initial={sector:'resources',industry:null,site:null,single:false,scope:'all',place:'all'};
test('Adopted city guide coordinates independently match original Natural Earth identifiers and geometry',async()=>{
 const original=JSON.parse(await readFile('data-source/atlas/latin-america/industry-sectors-20261012/coordinate-original-subset.geojson','utf8'));
 assert.equal(original.fullInputSha256,data.coordinateSource.inputSha256);
 for(const site of data.sites.filter(s=>s.coordinateSource.type==='locality-guide')){const feature=original.features.find(f=>f.properties.NE_ID===site.coordinateSource.neId);assert.ok(feature,site.id);assert.equal(feature.properties.NAME,site.coordinateSource.sourceName);assert.equal(feature.properties.ADM0NAME,site.coordinateSource.sourceCountry);assert.deepEqual(feature.geometry.coordinates,site.coordinates);}
});
test('Three industrial purposes have sourced industries, process stages and distinct coordinate meanings',()=>{
 assert.deepEqual(data.sectors.map(s=>s.id),['resources','manufacturing','services']);
 assert.ok(data.industries.length>=15);assert.ok(data.sites.length>=30);assert.deepEqual(data.flows,[]);
 for(const i of data.industries){assert.ok(i.overview&&i.why&&i.sources.length);for(const sector of i.sectors)assert.ok(lib.sectorSites(sector).some(s=>s.industry===i.id));}
 for(const s of data.sites){assert.ok(s.coordinateMeaning&&s.note&&s.sources.length);assert.equal(s.coordinates.length,2);assert.ok(s.coordinates.every(Number.isFinite));assert.ok(['extraction','processing','service'].includes(s.stageKind));for(const id of s.sources)assert.ok(data.sources.some(x=>x.id===id));}
 for(const id of ['refining','aluminum','steel'])assert.ok(data.industries.find(i=>i.id===id).sectors.includes('resources')&&data.industries.find(i=>i.id===id).sectors.includes('manufacturing'));
 const air=data.sites.find(s=>s.id==='gaviao');assert.equal(air.coordinateSource.publisher,'DECEA AISWEB');assert.ok(Math.abs(air.coordinates[0]+48+24/60+17/3600)<1e-8);assert.ok(Math.abs(air.coordinates[1]+21+45/60+52/3600)<1e-8);
});
test('Site and industry selection never enter the camera or label placement calculation',async()=>{
 const w=new Window();try{for(const sector of data.sectors){const state={...initial,sector:sector.id},base=lib.industrySectorScene(state,960,770);for(const i of lib.sectorIndustries(sector.id)){for(const single of [false,true]){const current=lib.industrySectorScene({...state,industry:i.id,site:lib.sectorSites(sector.id).find(s=>s.industry===i.id).id,single},960,770);assert.deepEqual(current.frame,base.frame);assert.deepEqual(current.labels,base.labels);}}
 w.document.body.innerHTML=lib.renderIndustrySectorMap({...state,industry:lib.sectorIndustries(sector.id)[0].id});assert.equal(w.document.querySelectorAll('[data-lis-site]').length,lib.sectorSites(sector.id).length);assert.equal(w.document.querySelectorAll('svg').length,1);}}
 finally{await w.happyDOM.close();}
});
test('Only explicit single mode removes peers, retaining source coordinates and geographic context',async()=>{
 const w=new Window();try{w.document.body.innerHTML=lib.renderIndustrySectorMap({...initial,industry:'refining',single:true});const marks=[...w.document.querySelectorAll('[data-lis-site]')];assert.equal(marks.length,data.sites.filter(s=>s.sectors.includes('resources')&&s.industry==='refining').length);assert.ok(marks.every(m=>m.dataset.industry==='refining'));assert.equal(w.document.querySelectorAll('svg>g:first-child>path').length,34);for(const m of marks)assert.equal(m.dataset.sourceCoordinate,data.sites.find(s=>s.id===m.dataset.lisSite).coordinates.join(','));}finally{await w.happyDOM.close();}
});
test('URL restores sector/site/single/scope; malformed site cannot create an industry or fake geography',()=>{
 const state={...initial,sector:'manufacturing',industry:'refining',site:'reduc',single:true,scope:'south',place:'BRA'},url=lib.writeIndustrySectorState(new URL('https://example.test/industry/?only=1&fallback=1'),state);assert.deepEqual(lib.readIndustrySectorState(url),state);assert.equal(url.searchParams.get('only'),'1');assert.equal(url.searchParams.get('fallback'),'1');
 const bad=lib.readIndustrySectorState(new URL('https://example.test/industry/?sector=invalid&industry=constructor&site=unknown&scope=country&single=1&place=XX'));assert.deepEqual(bad,initial);
 const incoherent=lib.readIndustrySectorState(new URL('https://example.test/industry/?sector=services&industry=copper&site=atacama&single=1'));assert.equal(incoherent.industry,null);assert.equal(incoherent.site,null);assert.equal(incoherent.single,false);
 const country=lib.readIndustrySectorState(new URL('https://example.test/industry/?place=BRA&scope=country'));assert.equal(country.contextScope,'country');assert.equal(country.scope,'all');assert.equal(lib.writeIndustrySectorState(new URL('https://example.test/industry/'),country).searchParams.get('scope'),'country');
});
test('Whole-region primary labels remain readable without pair overlaps and with short correspondence lines',()=>{
 for(const sector of data.sectors){const scene=lib.industrySectorScene({...initial,sector:sector.id},960,770);assert.ok(scene.labels.length>0);for(const industry of lib.sectorIndustries(sector.id))assert.ok(scene.labels.some(l=>l.industry===industry.id),industry.id+' must be named on the initial map');for(let i=0;i<scene.labels.length;i++){const a=scene.labels[i],lx=Math.max(a.x,Math.min(a.anchorX,a.x+a.width)),ly=Math.max(a.y-a.height+5,Math.min(a.anchorY,a.y-4));assert.ok(Math.hypot(lx-a.anchorX,ly-a.anchorY)<=60,'correspondence line too long: '+a.text);for(let j=i+1;j<scene.labels.length;j++){const b=scene.labels[j];assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y-a.height<b.y&&a.y>b.y-b.height),sector.id+' '+a.text+'/'+b.text);}}}
});
test('Nearby marks are separated using bounded offsets without changing original coordinates',()=>{
 for(const sector of data.sectors){const scene=lib.industrySectorScene({...initial,sector:sector.id},960,770);for(let i=0;i<scene.visible.length;i++){const a=scene.visible[i];assert.ok(Math.hypot(a.point[0]-a.displayPoint[0],a.point[1]-a.displayPoint[1])<=36);assert.deepEqual(a.coordinates,data.sites.find(s=>s.id===a.id).coordinates);for(let j=i+1;j<scene.visible.length;j++){const b=scene.visible[j];assert.ok(Math.hypot(a.displayPoint[0]-b.displayPoint[0],a.displayPoint[1]-b.displayPoint[1])>=16,a.id+'/'+b.id);}}}
});
