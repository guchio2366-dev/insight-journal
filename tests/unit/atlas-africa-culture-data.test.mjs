import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {africaReligionRows} from '../../src/data/atlas/africa-religion-overview.ts';
import {africaLanguageFamilies} from '../../src/data/atlas/africa-language-overview.ts';
const read=(path)=>readFileSync(new URL('../../'+path,import.meta.url));

test('Pew factual excerpt covers each mapped African country once and applies the explicit mixed rule',()=>{
 const countries=JSON.parse(read('src/data/atlas/africa-countries.json'));
 assert.deepEqual(africaReligionRows.map(row=>row.countryCode).sort(),countries.map(row=>row.code).sort());
 for(const row of africaReligionRows){
  assert.ok(row.primaryShare>0&&row.primaryShare<=100);
  assert.ok(row.sourcePage>=2&&row.sourcePage<=21);
  assert.equal(row.mixed,row.primaryShare<50||(row.secondaryShare??0)>=25);
  if(row.secondary){assert.ok(row.secondaryShare>0);assert.ok(row.secondaryShare<=row.primaryShare);assert.ok(row.primaryShare+row.secondaryShare<=100);}
 }
 assert.equal(africaReligionRows.find(row=>row.countryCode==='CIV').mixed,true);
 assert.equal(africaReligionRows.find(row=>row.countryCode==='MUS').primary,'hindu');
 assert.equal(africaReligionRows.find(row=>row.countryCode==='CMR').secondaryShare,25.2);
 assert.equal(africaReligionRows.find(row=>row.countryCode==='TGO').mixed,false);
});

test('language asset retains source classifications and coordinates without inventing speaker density or ethnic areas',()=>{
 const raw=read('public/assets/atlas/africa-culture-v2/language-points.json');
 const {points}=JSON.parse(raw);
 const manifest=JSON.parse(read('public/assets/atlas/africa-culture-v2/manifest.json'));
 assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.assetSha256);
 assert.equal(points.length,manifest.count);assert.equal(new Set(points.map(p=>p.id)).size,points.length);
 assert.equal(manifest.license,'CC BY 4.0');
 const excluded=new Set(['Bookkeeping','Unattested','Sign Language']);
 for(const p of points){
  assert.ok(p.family&&p.familyId);assert.ok(!excluded.has(p.family));
  assert.equal(p.coordinates.length,2);assert.ok(p.coordinates.every(Number.isFinite));
  assert.ok(p.coordinates[0]>=-26&&p.coordinates[0]<=64&&p.coordinates[1]>=-36&&p.coordinates[1]<=38);
  assert.ok(p.countries.every(c=>/^[A-Z]{2}$/.test(c)));
  for(const key of ['ethnicity','speakers','population','geometry','density'])assert.equal(key in p,false);
 }
 for(const family of africaLanguageFamilies.filter(f=>f.id!=='other'))assert.ok(points.some(p=>p.family===family.id));
 assert.ok(points.some(p=>p.family==='Austronesian'&&p.countries.includes('MG')));
});
