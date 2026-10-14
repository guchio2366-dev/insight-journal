import test from 'node:test';
import assert from 'node:assert/strict';
import {southeastIndustryProfiles as profiles,southeastIndustrySources as sources,southeastFigureValue,southeastPalmProcessing} from '../../src/data/atlas/asia/southeast-asia-industry-catalog.ts';
import {readFileSync} from 'node:fs';
import {southeastIndustrySites as sites,southeastSiteSectors} from '../../src/data/atlas/asia/southeast-asia-industry-sites.ts';
import {placeSoutheastIndustryLabels,southeastLabelIntersects} from '../../src/lib/atlas-southeast-industry-labels.ts';

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
 assert.deepEqual([...a],[...b]);assert(a.size>=8);
 for(const box of a.values()){assert(box.left>=5&&box.top>=5&&box.right<=675&&box.bottom<=545);assert(!reserved.some(r=>southeastLabelIntersects(box,r)));}
 const boxes=[...a.values()];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!southeastLabelIntersects(boxes[i],boxes[j]));
});
