import test from 'node:test';
import assert from 'node:assert/strict';
import {southeastIndustryProfiles as profiles,southeastIndustrySources as sources,southeastFigureValue,southeastPalmProcessing} from '../../src/data/atlas/asia/southeast-asia-industry-catalog.ts';
import {readFileSync} from 'node:fs';
import {southeastIndustrySites as sites,southeastSiteSectors} from '../../src/data/atlas/asia/southeast-asia-industry-sites.ts';
import {placeSoutheastIndustryLabels,southeastLabelIntersects} from '../../src/lib/atlas-southeast-industry-labels.ts';
import {southeastMapLabels,southeastMapKindSectors} from '../../src/data/atlas/asia/southeast-industry-map-scenes.ts';

test('14 main proposals and all four additions retain separate product stages and evidence scopes',()=>{
 assert.deepEqual(new Set(profiles.map(p=>p.id)),new Set(['metals','energy','lng','palm','rice','electronics','automotive','textiles','rubber','wood','food','logistics','tourism','it-bpm','hydro','finance','petrochemicals','solar']));
 for(const p of profiles){assert(p.reading&&p.why&&p.caveat);for(const key of ['scale','position','market']){assert(p[key].length);for(const f of p[key]){assert(f.year&&f.scope&&f.definition);assert(sources[f.source]?.url.startsWith('https://'));assert(f.value===null||Number.isFinite(f.value));if(f.numerator!==undefined){assert(f.denominator>0);assert(Math.abs(f.value-f.numerator/f.denominator*100)<.1);}}}}
 assert.equal(southeastFigureValue(profiles.find(p=>p.id==='rice').position[1]),'未取得');
 assert.match(profiles.find(p=>p.id==='it-bpm').caveat,/物品.*需給式/);
 assert.match(profiles.find(p=>p.id==='tourism').caveat,/フィリピン.*地域全体/);
});
test('MPOB state inputs reconcile to the reported total and retain original state geometry without invented zeroes',()=>{
 assert.equal(southeastPalmProcessing.reduce((sum,r)=>sum+r.inputTonnes,0),17266555);
 assert.equal(southeastPalmProcessing.filter(r=>['MY-01','MY-10'].includes(r.id)).reduce((sum,r)=>sum+r.inputTonnes,0),8975912);
 const original=JSON.parse(readFileSync(new URL('../../public/assets/atlas/asia-industry-v1/southeast-asia.json',import.meta.url)));
 const display=JSON.parse(readFileSync(new URL('../../public/assets/atlas/southeast-industry-20261014/palm-processing.geojson',import.meta.url)));
 assert.equal(display.features.length,7);
 for(const f of display.features){assert.deepEqual(f.geometry,original.geometry.features.find(g=>g.properties.id===f.properties.id).geometry);assert(f.properties.inputTonnes>0);assert.equal(f.properties.year,2025);}
 assert(!display.features.some(f=>f.properties.id==='MY-supra'||f.properties.id==='MY-16'));
});
test('processing and capacity use their own quantitative evidence; national quantities do not become site weights',()=>{
 const palm=profiles.find(p=>p.id==='palm'),rice=profiles.find(p=>p.id==='rice');
 assert.equal(palm.scale[0].value,15.629912+1.636643);
 assert.equal(palm.scale[0].source,'palmProcessing');assert.equal(palm.scale[1].value,54);
 assert.match(palm.caveat,/82.1%.*転用しない/);assert.equal(rice.scale[0].value,859.319);assert.match(rice.scale[0].scope,/HS100630/);
 assert.deepEqual(rice.countryEvidence,['THA','VNM','MMR','KHM']);
 assert.deepEqual(profiles.find(p=>p.id==='solar').countryEvidence,['KHM','MYS','THA','VNM']);
 assert.equal(sites.length,30);assert(!sites.some(s=>['solar','rice'].includes(s.kind)));
 for(const s of sites){assert.equal(s.facilityCoordinates,null);assert.equal(s.positionScope,'regional-guide');assert(southeastSiteSectors(s).length);assert(profiles.some(p=>p.id===s.kind));}
 assert.equal(sites.find(s=>s.id==='johor-food').kind,'palm');assert.equal(sites.find(s=>s.id==='bintulu-lng').kind,'lng');assert.equal(sites.find(s=>s.id==='namtheun-hydro').kind,'hydro');
});
test('dense label placement is deterministic, in bounds, non-overlapping and clears controls and anchors',()=>{
 const entries=Array.from({length:10},(_,i)=>({id:'site-'+i,x:260+(i%3)*20,y:210+Math.floor(i/3)*35,width:115,height:40}));
 const reserved=[{left:5,top:5,right:270,bottom:65},{left:600,top:5,right:670,bottom:125}];
 const a=placeSoutheastIndustryLabels(entries,680,550,reserved),b=placeSoutheastIndustryLabels([...entries].reverse(),680,550,reserved);
 assert.deepEqual([...a],[...b]);assert(a.size>0);assert(a.size<entries.length,'dense points may omit a label instead of drawing a long leader');
 for(const box of a.values()){assert(box.left>=5&&box.top>=5&&box.right<=675&&box.bottom<=545);assert(!reserved.some(r=>southeastLabelIntersects(box,r)));}
 for(const [id,box]of a){const p=entries.find(p=>p.id===id);assert(Math.hypot(Math.max(box.left,Math.min(p.x,box.right))-p.x,Math.max(box.top,Math.min(p.y,box.bottom))-p.y)<=48);}
 const boxes=[...a.values()];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!southeastLabelIntersects(boxes[i],boxes[j]));
});
test('each original point belongs to one stage-specific map, with no energy or raw-material points on manufacturing',()=>{
 const ids=sector=>sites.filter(s=>southeastSiteSectors(s).includes(sector)).map(s=>s.id);
 assert.deepEqual(ids('resource'),sites.filter(s=>s.stage==='raw'||profiles.find(p=>p.id===s.kind).sectors.includes('resource')).map(s=>s.id));
 for(const id of ['morowali-smelter','bintulu-lng','jurong-petro','maptaphut-petro','pengerang-petro','rayong-tires','binh-duong-furniture'])for(const sector of ['resource','manufacturing'])assert(ids(sector).includes(id),'Meaningful shared processing role: '+id);
 assert.equal(ids('manufacturing').length,16);assert.equal(ids('services').length,9);
 assert(ids('manufacturing').includes('morowali-smelter'));assert(ids('manufacturing').includes('rayong-tires'));assert(ids('manufacturing').includes('binh-duong-furniture'));
 assert(ids('services').includes('singapore-port'));assert(ids('services').includes('singapore-finance'));
 assert(sites.every(s=>southeastSiteSectors(s).length>0));
 assert.deepEqual(southeastMapKindSectors('lng'),['resource','manufacturing']);assert.deepEqual(southeastMapKindSectors('petrochemicals'),['resource','manufacturing']);
 assert.deepEqual(southeastMapKindSectors('rice'),['manufacturing']);assert.deepEqual(southeastMapKindSectors('solar'),['manufacturing']);
});
test('short labels group nearby examples of the same industry without relocating or aggregating their evidence',()=>{
 assert.equal(southeastMapLabels.length,28);
 assert.deepEqual(southeastMapLabels.flatMap(g=>g.siteIds).sort(),sites.map(s=>s.id).sort());
 for(const g of southeastMapLabels){
  assert.deepEqual(g.point,sites.find(s=>s.id===g.id).point);
  assert(g.place.length<=12&&g.industry.length<=8);
  for(const id of g.siteIds){const s=sites.find(s=>s.id===id);assert.equal(s.kind,g.kind);assert.deepEqual(southeastSiteSectors(s),g.sectors);assert(Math.hypot(g.point[0]-s.point[0],g.point[1]-s.point[1])<.6);}
 }
 assert.deepEqual(southeastMapLabels.find(g=>g.id==='penang').siteIds,['penang','kulim']);
 assert.deepEqual(southeastMapLabels.find(g=>g.id==='jurong-petro').siteIds,['jurong-petro','pengerang-petro']);
});
