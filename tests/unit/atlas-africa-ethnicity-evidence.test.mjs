import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import census from '../../src/data/atlas/africa-ethnicity-evidence.json' with {type:'json'};
import {africaEthnicityEvidence,ethnicityRegionComposition,ethnicityRegionNames} from '../../src/data/atlas/africa-ethnicity-evidence.ts';

test('the Ghana numerical excerpt keeps every publisher row and reconciles the distinct census denominator',()=>{
 const bytes=readFileSync(new URL('../../'+census.source.excerptPath,import.meta.url)),lines=bytes.toString().trim().split('\n'),headers=lines.shift().split(','),raw=lines.map(line=>Object.fromEntries(line.split(',').map((value,index)=>[headers[index],value])));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),census.source.excerptSha256);
 assert.equal(census.denominator,30484536);assert.equal(census.wholeResidentPopulation,30832019);assert.notEqual(census.denominator,census.wholeResidentPopulation);
 assert.equal(census.groups.length,9);assert.equal(census.regions.length,16);assert.equal(census.source.table,'5.5');assert.equal(census.source.pdfPage,64);assert.equal(census.source.originalPdfSha256,null);
 for(const group of census.groups){const row=raw.find(row=>row.group===group.id);assert.equal(group.national,Number(row.national));assert.equal(group.publishedPercent,Number(row.publishedPercent));assert.equal(Number((group.national/census.denominator*100).toFixed(1)),group.publishedPercent);}
 for(const region of census.regions){assert.equal(region.total,Number(raw[0][region.name]));assert.equal(Object.values(region.counts).reduce((a,b)=>a+b,0),region.total);assert.equal(Object.keys(region.counts).length,9);for(const group of census.groups)assert.equal(region.counts[group.id],Number(raw.find(row=>row.group===group.id)[region.name]));}
 assert.equal(census.regions.reduce((sum,row)=>sum+row.total,0),census.denominator);
 for(const group of census.groups)assert.equal(census.regions.reduce((sum,row)=>sum+row.counts[group.id],0),group.national);
 for(const key of ['geometry','coordinates','languageFamily','religion'])assert.equal(key in census,false);
});

test('regional comparisons preserve mixed places and use their own reported denominator',()=>{
 const expected={Western:'Akan',Volta:'Ewe',Northern:'Mole-Dagbani',Savannah:'Guan',Oti:'Gurma'};
 for(const region of census.regions){const rows=ethnicityRegionComposition(region);assert.equal(rows.length,9);assert.ok(ethnicityRegionNames[region.name]);assert.ok(rows.every(row=>row.share===row.count/region.total*100));if(expected[region.name])assert.equal(rows[0].id,expected[region.name]);}
 const accra=ethnicityRegionComposition(census.regions.find(row=>row.name==='Greater Accra'));assert.equal(accra[0].id,'Akan');assert.ok(accra[0].share<50);
 assert.match(africaEthnicityEvidence.scope,/全域は未取得/);assert.match(census.limits.join(' '),/全住民.*割合へ換算しない/);
});
