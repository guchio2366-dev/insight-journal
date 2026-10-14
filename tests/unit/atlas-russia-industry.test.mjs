import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/data/atlas/russia-industry-catalog';export * from './src/lib/atlas-russia-industry';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const D=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
after(()=>stop());
test('Russia includes every agreed main/additional theme, with stages and missing data retained',()=>{
 const required=['oil','gas','coal','palladium','nickel','copper','gold','aluminum','steel','nitrogen','potash','phosphate','enrichment','logistics','diamond','helium','wheat','trucks','management'];
 assert.deepEqual(D.ruIndustries.map(i=>i.id),required);assert.equal(new Set(D.ruSites.map(s=>s.id)).size,48);
 for(const i of D.ruIndustries){assert.ok(i.reading.length>35);assert.ok(i.why.length>25);assert.ok(i.missing.length>15);assert.ok(D.ruSites.some(s=>s.industries.includes(i.id)));for(const key of i.sourceIds)assert.ok(D.ruSources[key]);for(const m of i.metrics){assert.ok(m.period&&m.scope&&m.note&&D.ruSources[m.source]);}}
 const text=id=>JSON.stringify(D.ruIndustries.find(i=>i.id===id));
 assert.match(text('coal'),/2023年/);assert.match(text('coal'),/short ton/);
 assert.match(text('nickel'),/フィンランド/);assert.match(text('diamond'),/合成品を含む工業用全市場/);
 assert.match(text('enrichment'),/能力/);assert.match(text('enrichment'),/秘匿Wは0/);
 for(const id of ['logistics','management'])assert.match(text(id),/物品需給式/);
 assert.match(D.ruSources.japanLng.method,/日本が報告/);assert.match(D.ruSources.chinaNi.method,/中国が報告/);assert.match(D.ruSources.usPd.method,/米国が報告/);
});
test('every city coordinate matches a pinned geographic source rather than an invented facility location',()=>{
 const gh=JSON.parse(readFileSync('public/assets/atlas/russia-population-v1/centres.json')).centres;
 const ne=JSON.parse(readFileSync('src/data/atlas/russia-industry-city-positions.json')).positions;
 for(const site of D.ruSites){const expected=site.positionSource==='ghsl'?gh.find(c=>c.name===site.positionName)?.coordinates:ne[site.positionName];assert.deepEqual(site.coordinates,expected,site.id);assert.ok(site.sourceIds.every(id=>D.ruSources[id]));assert.ok(site.note.length>12);}
 assert.ok(D.ruSites.find(s=>s.id==='nakhodka-port').coordinates[0]>130,'Reject the homonymous Yamal settlement');
});
const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
test('all sector labels fit without overlaps and source points stay separate at mobile and desktop map widths',()=>{
 for(const sector of D.ruSectors)for(const width of [760,960,1280]){
  const height=width*597/1200,labels=D.layoutRuIndustryLabels(sector.id,width,height),points=D.groupRuPoints(sector.id,width,height);
  assert.equal(labels.length,D.sectorIndustries(sector.id).length);
  assert.deepEqual(labels,D.layoutRuIndustryLabels(sector.id,width,height),'selection is not an input to label layout');
  for(const a of labels){assert.ok(a.box[0]>=0&&a.box[2]<=width&&a.box[1]>=0&&a.box[3]<=height);for(const b of labels)if(a.id!==b.id)assert.ok(!overlaps(a.box,b.box),a.id+'/'+b.id);for(const p of points)assert.ok(!overlaps(a.box,[p.point[0]-12,p.point[1]-12,p.point[0]+12,p.point[1]+12]),a.id+'/'+p.id);}
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i].point[0]-points[j].point[0],points[i].point[1]-points[j].point[1])>=20);
  assert.equal(points.flatMap(g=>g.sites).length,D.visibleRuSites(sector.id).length);
 }
});
test('sector, product, site and only restore safely while retaining unrelated query and hash',()=>{
 const u=new URL('https://example.test/insight-journal/atlas/russia/industry/?keep=yes#reference');
 for(const item of D.ruIndustries)for(const sector of item.sectors){const site=D.visibleRuSites(sector).find(s=>s.industries.includes(item.id));const state={sector,industry:item.id,site:site.id,only:true},url=D.writeRuIndustryState(u,state);assert.deepEqual(D.readRuIndustryState(url),state);assert.equal(url.searchParams.get('keep'),'yes');assert.equal(url.hash,'#reference');}
 assert.deepEqual(D.readRuIndustryState(new URL('?sector=__proto__&industry=constructor&site=bad&only=1',u)),{sector:'resources',industry:null,site:null,only:false});
 assert.equal(D.readRuIndustryState(new URL('?industryLocation=omsk-refining',u)).sector,'manufacturing');
});
