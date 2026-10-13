import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import religion from '../../src/data/atlas/africa-religion-evidence.json' with {type:'json'};
import languages from '../../src/data/atlas/africa-home-language-evidence.json' with {type:'json'};
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';

test('Ghana religious-affiliation excerpt reconciles every source region and excludes the Christian subtotal from categories',()=>{
 assert.equal(religion.total,30753327);assert.equal(religion.groups.length,8);assert.equal(religion.regions.length,16);
 assert.equal(religion.groups.reduce((sum,row)=>sum+row.national,0),religion.total);
 assert.equal(religion.groups.filter(row=>row.christian).reduce((sum,row)=>sum+row.national,0),21932708);
 for(const region of religion.regions)assert.equal(Object.values(region.counts).reduce((sum,n)=>sum+n,0),region.total,region.name);
 for(const group of religion.groups)assert.equal(religion.regions.reduce((sum,region)=>sum+region.counts[group.id],0),group.national,group.id);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../data-source/atlas/africa/culture/ghana-2021-religion-table-5-7.csv',import.meta.url))).digest('hex'),religion.source.excerptSha256);
 assert.equal(religion.source.originalPdfSha256,null);assert(religion.limits.some(note=>note.includes('30,484,536')));
});

test('South Africa home-language evidence preserves population definition, small percentages, rounding and all province columns',()=>{
 assert.equal(languages.languages.length,17);assert.equal(languages.provinces.length,9);
 assert.equal(languages.languages.find(row=>row.id==='IsiZulu').provinces['KwaZulu-Natal'],80);
 assert.equal(languages.languages.find(row=>row.id==='IsiXhosa').provinces['Eastern Cape'],81.8);
 assert.equal(languages.languages.find(row=>row.id==='Sign language').publishedNational,'0.02');
 assert.equal(languages.languages.find(row=>row.id==='Khoi, Nama & San languages').publishedProvince['Northern Cape'],'0.17');
 for(const row of languages.languages)assert.deepEqual(Object.keys(row.provinces),languages.provinces);
 assert.notEqual(languages.languages.reduce((sum,row)=>sum+row.national,0),100,'published rounding is not normalized');
 assert.match(languages.unit,/aged 1 or older/);assert.equal(languages.source.originalPdfSha256,null);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../data-source/atlas/africa/culture/south-africa-2022-home-language-table-2-9.csv',import.meta.url))).digest('hex'),languages.source.excerptSha256);
});

test('individual-language selections use the existing classification URL and retain source state without speaker geometry',()=>{
 const points=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-culture-v2/language-points.json',import.meta.url))).points;
 for(const point of points.filter(row=>/Swahili|Zulu|Xhosa|Somali/.test(row.name))){const state=readState('?field=population&topic=language&layerClass=language:'+point.id);assert.equal(state.layerClass,'language:'+point.id);assert.deepEqual(readState(writeState({...state},new URL('https://example.com/')).search),state);assert.equal(Object.hasOwn(point,'speakerCount'),false);assert.equal(Object.hasOwn(point,'geometry'),false);}
});
