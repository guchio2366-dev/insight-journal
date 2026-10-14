import test from 'node:test';
import assert from 'node:assert/strict';
import {usIndustries,usIndustrySites,usIndustrySources,usResearchRequirements,usSitesForSector,usIndustryFlows} from '../../src/data/atlas/us-industry.ts';
import {readUsIndustryState,writeUsIndustryState,layoutUsIndustryLabels,projectUsIndustry} from '../../src/lib/atlas-us-industry.ts';

test('all accepted research candidates have metrics, definitions, sources and a mapped evidence example',()=>{
 for(const id of usResearchRequirements){const item=usIndustries.find(i=>i.id===id);assert.ok(item,id);assert.ok(item.reading.length>20);assert.ok(item.why.length>20);assert.ok(item.metrics.length);assert.ok(usIndustrySites.some(s=>s.industry===id),`${id}: location evidence`);for(const m of item.metrics){assert.ok(m.period);assert.ok(m.definition);assert.ok(usIndustrySources[m.source],`${id}/${m.source}`);if(m.status==='missing')assert.equal(m.display,'未取得');}}
 assert.equal(new Set(usIndustries.map(i=>i.id)).size,usIndustries.length);assert.equal(new Set(usIndustrySites.map(s=>s.id)).size,usIndustrySites.length);assert.deepEqual(usIndustryFlows,[]);
 for(const s of usIndustrySites){assert.ok(s.sources.length);assert.ok(s.sources.every(id=>usIndustrySources[id]));assert.ok(s.scope);assert.ok(s.period);assert.ok(s.coordinates.every(Number.isFinite));}
});
test('agriculture is background; processing and semiconductor stages keep distinct denominators',()=>{
 assert.equal(usIndustries.some(i=>i.id==='corn'||i.id==='soybean'),false);
 assert.match(usIndustries.find(i=>i.id==='oilseed-processing').metrics[0].definition,/処理|世界/);
 assert.equal(usIndustrySites.find(s=>s.id==='az-packaging-plan').status,'planned');assert.equal(usIndustrySites.find(s=>s.id==='rio-rancho-packaging').status,'operating');
 assert.equal(usIndustrySites.some(s=>s.id==='baytown-chemical-refining'),false);assert.equal(usIndustrySites.some(s=>s.id==='puget-refinery-petrochemicals'),false);
 assert.match(usIndustries.find(i=>i.id==='chip-design').metrics.at(-1).definition,/全工程|企業世界売上/);
 assert.ok(usSitesForSector('resources').some(s=>s.industry==='refining'));assert.ok(usSitesForSector('manufacturing').some(s=>s.industry==='refining'));
});
test('URL state preserves unrelated fields, canonicalizes legacy references and rejects invalid scopes',()=>{
 const old=new URL('https://example.test/industry/?sector=manufacturing&subsector=electronics&crop=rice');const state=readUsIndustryState(old);assert.equal(state.industry,'chip-design');assert.equal(writeUsIndustryState(old,state).searchParams.get('crop'),'rice');
 assert.equal(readUsIndustryState(new URL('https://example.test/?sector=services&industry=crude-oil')).industry,null);
 assert.equal(readUsIndustryState(new URL('https://example.test/?sector=manufacturing&subsector=auto&industryRegion=michigan-auto')).site,'michigan-auto-auto');
 for(const sector of ['resources','manufacturing','services','construction-real-estate']){const s=readUsIndustryState(new URL(`https://example.test/?sector=${sector}`));assert.deepEqual(readUsIndustryState(writeUsIndustryState(old,s)),s);}
});
test('CONUS and source-backed Alaska locations remain inside their designated panels',()=>{
 for(const s of usIndustrySites){const [x,y]=projectUsIndustry(s.coordinates);assert.ok(x>=0&&x<=1000&&y>=0&&y<=600,`${s.id}: ${x},${y}`);}
 const [x,y]=projectUsIndustry([-149.9,61.2]);assert.ok(x<200&&y>438);
});
test('industry label boxes fit the tested PC map widths without collisions',()=>{
 for(const [width,height] of [[1110,666],[760,456],[700,420],[540,324],[358,620]])for(const sector of ['resources','manufacturing','services','construction-real-estate']){
  const ids=[...new Set(usSitesForSector(sector).map(s=>s.industry))],inputs=ids.map(id=>({id,anchor:[width*.45,height*.5],width:Math.min(175,Math.max(126,usIndustries.find(i=>i.id===id).short.length*12+22))})),boxes=layoutUsIndustryLabels(inputs,width,height);
  for(const a of boxes){assert.ok(a.left>=0&&a.top>=0&&a.left+a.width<=width&&a.top+a.height<=height,`${width}/${sector}/${a.id}: bounds`);for(const b of boxes.filter(b=>b!==a))assert.ok(!(a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top),`${width}/${sector}: ${a.id}/${b.id}`);}
 }
});
