import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../../src/data/atlas/west-asia.json' with {type:'json'};
import {westIndustryCatalog as catalog,westIndustryAdoption as adoption,westIndustrySources as sources,westIndustrySectors as sectors} from '../../src/data/atlas/west-asia-industry-catalog.mjs';
import {readWestIndustryState,westIndustrySearch,layoutWestIndustryLabels,westIndustryFrame,projectWestIndustry,comparableWestIndustryRows} from '../../src/lib/atlas-west-asia-industry.mjs';

test('research adoption covers every main series and all four additions without a world industry route',()=>{
 assert.equal(catalog.length,21);assert.equal(new Set(catalog.map(i=>i.id)).size,21);
 assert.deepEqual(new Set(catalog.map(i=>i.id)),new Set([...adoption.main,...adoption.additions]));
 assert.deepEqual(adoption.additions,['steel','boron','helium','defense']);
 for(const i of catalog){assert(i.summary.length>35);assert(i.why.length>30);assert(i.metrics.length&&i.world.length&&i.locations.length);assert(i.limits.includes('未')||i.limits.includes('別'));assert(i.sectors.every(s=>sectors.some(x=>x.id===s)));}
});
test('national, city, company, stage, units and years remain explicit; compatible map groups are homogeneous',()=>{
 for(const i of catalog){
  for(const r of i.metrics){assert(Number.isFinite(r.value));assert(r.year&&r.unit&&r.measure&&r.denominator);assert(sources[r.source]?.url.startsWith('https://'));if(r.country)assert(data.countries.some(c=>c.code===r.country));}
  for(const f of i.world)assert(sources[f.source]?.url.startsWith('https://'));
  const groups=Object.groupBy(i.metrics.filter(r=>r.group),r=>r.group);
  for(const rows of Object.values(groups)){assert.equal(new Set(rows.map(r=>r.year)).size,1);assert.equal(new Set(rows.map(r=>r.unit)).size,1);assert.equal(new Set(rows.map(r=>r.measure)).size,1);}
 }
 assert.equal(catalog.find(i=>i.id==='lng').metrics[0].value,81.51);
 assert.equal(catalog.find(i=>i.id==='potash').metrics[0].unit,'百万t K₂O換算');
 assert(comparableWestIndustryRows(catalog.find(i=>i.id==='steel')).every(r=>r.measure==='粗鋼生産'));
 assert.equal(comparableWestIndustryRows(catalog.find(i=>i.id==='finance')).length,0);
});
test('locations have individual evidence and stage, offshore oil remains offshore, headquarters is distinct',()=>{
 for(const i of catalog)for(const l of i.locations){assert(sources[l.source]?.url.startsWith('https://'));assert(l.stage&&l.note&&l.status);assert(l.coordinates.length===2&&l.coordinates.every(Number.isFinite));const [x,y]=projectWestIndustry(l.coordinates);assert(x>=0&&x<=1000&&y>=0&&y<=987);}
 const defence=catalog.find(i=>i.id==='defense');assert(defence.locations.some(l=>l.stage==='企業本社'));assert(defence.locations.some(l=>l.stage==='製造施設'));
 const aluminium=catalog.find(i=>i.id==='aluminium');assert(aluminium.locations.some(l=>l.name==='アルタウィーラ'&&l.note.includes('25%')));
 assert(catalog.find(i=>i.id==='crude').locations.some(l=>l.name.includes('上部ザクム')&&l.coordinates[0]<54));
});
test('label layout has no collisions at desktop and mobile widths and never uses selection state',()=>{
 for(const sector of sectors)for(const width of [280,300,320,340,390,750,1050]){
  const height=width*.987,items=catalog.filter(i=>i.sectors.includes(sector.id)),rows=layoutWestIndustryLabels(items,width,height,westIndustryFrame);
  assert.equal(rows.length,items.length);
  for(const r of rows){assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height-62,`${sector.id} ${width} ${r.id} remains in map`);}
  for(let a=0;a<rows.length;a++)for(let b=a+1;b<rows.length;b++){const r=rows[a],s=rows[b];assert(r.x+r.width<=s.x||s.x+s.width<=r.x||r.y+r.height<=s.y||s.y+s.height<=r.y,`${sector.id}/${width} ${r.id}/${s.id} overlap`);}
  assert.deepEqual(rows,layoutWestIndustryLabels(items,width,height,westIndustryFrame));
 }
});
test('URL state restores country, industry, explicit filter and camera; invalid state cannot create invented places',()=>{
 const state=readWestIndustryState('?sector=resources&industry=lng&place=1&country=QAT&only=1&map=10,20,800,789.6');
 assert.deepEqual(readWestIndustryState(westIndustrySearch(state)),state);
 assert.equal(readWestIndustryState('?industry=unknown&place=33&country=XXX&map=nan,0,5,5').industry,null);
 assert.equal(readWestIndustryState('?industry=lng&place=-1').place,null);
 assert.equal(readWestIndustryState('?topic=industry-petrochemical&country=ARE').industry,'polymers');
 assert.equal(readWestIndustryState('?topic=industry-services').sector,'services');
 assert.equal(readWestIndustryState('?sector=resources&industry=apparel').industry,null);
});
