import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stationAnnualRainfall,rainfallColor,settlementSubject,validateSettlementCollection} from '../../src/lib/atlas-west-asia-completion.mjs';
test('annual rainfall requires all twelve actual monthly normals and never fills missing values with zero',async()=>{
 const data=JSON.parse(await readFile('src/data/atlas/west-asia.json','utf8'));
 assert.equal(data.cities.length,18);
 for(const city of data.cities){const actual=stationAnnualRainfall(city);const complete=city.precipitationMm.length===12&&city.precipitationMm.every(v=>Number.isFinite(v)&&v!==null);assert.equal(actual,complete?Math.round(city.precipitationMm.reduce((a,b)=>a+b,0)*10)/10:null);assert.ok(city.normalPeriod&&city.sourceUrl);}
 assert.equal(stationAnnualRainfall({precipitationMm:Array(12).fill(0)}),0);
 for(const values of [Array(11).fill(1),[...Array(11).fill(1),null],[...Array(11).fill(1),NaN],[...Array(11).fill(1),-1]])assert.equal(stationAnnualRainfall({precipitationMm:values}),null);
 assert.notEqual(rainfallColor(0),rainfallColor(null));
});
test('settlement geometry must match an explicitly named category and its original color',()=>{
 const subject={file:'ethnicity.geojson.gz',categories:[{id:'group-a',color:'#765432',label:'掲載集団A'}]},manifest={regions:{'west-asia':{ethnicity:subject}}};
 assert.equal(settlementSubject(manifest,'ethnicity'),subject);
 const collection={type:'FeatureCollection',features:[{properties:{id:'group-a',color:'#765432'},geometry:{type:'Polygon',coordinates:[[[40,30],[41,30],[41,31],[40,30]]]}}]};
 assert.equal(validateSettlementCollection(collection,subject),collection);
 assert.throws(()=>validateSettlementCollection({...collection,features:[{...collection.features[0],properties:{id:'unknown',color:'#765432'}}]},subject));
 assert.throws(()=>validateSettlementCollection({...collection,features:[{...collection.features[0],properties:{id:'group-a',color:'#fff'}}]},subject));
});
