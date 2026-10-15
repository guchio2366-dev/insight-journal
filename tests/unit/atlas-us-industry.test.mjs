import test from 'node:test';
import assert from 'node:assert/strict';
import {usIndustries,usIndustrySites,usIndustrySources,usResearchRequirements,usSitesForSector,usIndustryFlows} from '../../src/data/atlas/us-industry.ts';
import {readUsIndustryState,writeUsIndustryState,layoutUsIndustryLabels,groupUsIndustryPoints,usMapLabelBudget,projectUsIndustry} from '../../src/lib/atlas-us-industry.ts';

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
 for(const industry of ['refining','biofuels'])for(const sector of ['resources','manufacturing'])assert.ok(usSitesForSector(sector).some(s=>s.industry===industry));
 const all=['resources','manufacturing','services','construction-real-estate'].flatMap(s=>usSitesForSector(s).map(p=>p.id));assert.equal(new Set(all).size,usIndustrySites.length);
});
test('URL state preserves unrelated fields, canonicalizes legacy references and rejects invalid scopes',()=>{
 const old=new URL('https://example.test/industry/?sector=manufacturing&subsector=electronics&crop=rice');const state=readUsIndustryState(old);assert.equal(state.industry,'chip-design');assert.equal(writeUsIndustryState(old,state).searchParams.get('crop'),'rice');
 assert.equal(readUsIndustryState(new URL('https://example.test/?sector=services&industry=crude-oil')).industry,null);
 const fuel=readUsIndustryState(new URL('https://example.test/?sector=resources&industry=refining'));assert.equal(fuel.sector,'resources');assert.equal(fuel.industry,'refining');
 assert.equal(readUsIndustryState(new URL('https://example.test/?sector=manufacturing&subsector=auto&industryRegion=michigan-auto')).site,'michigan-auto-auto');
 for(const sector of ['resources','manufacturing','services','construction-real-estate']){const s=readUsIndustryState(new URL(`https://example.test/?sector=${sector}`));assert.deepEqual(readUsIndustryState(writeUsIndustryState(old,s)),s);}
});
test('CONUS and source-backed Alaska locations remain inside their designated panels',()=>{
 for(const s of usIndustrySites){const [x,y]=projectUsIndustry(s.coordinates);assert.ok(x>=0&&x<=1000&&y>=0&&y<=600,`${s.id}: ${x},${y}`);}
 const [x,y]=projectUsIndustry([-149.9,61.2]);assert.ok(x<200&&y>438);
});
test('nearby annotations have a density limit, no shelf fallback and only short guides',()=>{
 for(const [width,height] of [[1110,666],[760,456],[700,420],[540,324],[358,215]])for(const sector of ['resources','manufacturing','services','construction-real-estate']){
  const ids=[...new Set(usSitesForSector(sector).map(s=>s.industry))],inputs=ids.map((id,n)=>({id,anchor:[width*(.2+n%3*.25),height*(.2+Math.floor(n/3)*.15)],width:170})),boxes=layoutUsIndustryLabels(inputs,width,height);
  assert.ok(boxes.length<=usMapLabelBudget(width));
  for(const a of boxes){assert.ok(a.left>=0&&a.top>=0&&a.left+a.width<=width&&a.top+a.height<=height,`${width}/${sector}/${a.id}: bounds`);for(const b of boxes.filter(b=>b!==a))assert.ok(!(a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top),`${width}/${sector}: ${a.id}/${b.id}`);}
  for(const box of boxes){const x=Math.max(box.left,Math.min(box.left+box.width,box.anchor[0])),y=Math.max(box.top,Math.min(box.top+box.height,box.anchor[1]));assert.ok(Math.hypot(x-box.anchor[0],y-box.anchor[1])<=24);}
  assert.deepEqual(layoutUsIndustryLabels(inputs,width,height),boxes);
 }
 const crowded=Array.from({length:19},(_,i)=>({id:String(i),anchor:[250,150],width:160}));assert.ok(layoutUsIndustryLabels(crowded,540,324).length<19);
});
test('point grouping retains every original example and never joins different industries or distant locations',()=>{
 const sample=usIndustrySites.find(s=>s.industry==='auto'),other=usIndustrySites.find(s=>s.industry==='aerospace');
 const inputs=[{site:{...sample,id:'a'},point:[100,100]},{site:{...sample,id:'b'},point:[110,100]},{site:{...sample,id:'c'},point:[150,100]},{site:{...other,id:'d'},point:[100,100]}];
 const groups=groupUsIndustryPoints(inputs);assert.equal(groups.length,3);assert.deepEqual(groups[0].anchor,[100,100]);assert.deepEqual(groups.flatMap(g=>g.sites.map(s=>s.id)).sort(),['a','b','c','d']);assert.ok(groups.every(g=>g.sites.every(s=>s.industry===g.industry)));
});
