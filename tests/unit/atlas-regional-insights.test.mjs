import test from 'node:test';
import assert from 'node:assert/strict';
import { findRegionalInsight, regionalInsights } from '../../src/data/atlas/regional-insights.ts';

test('同じ稲作でも西部と南部で異なる地域説明を選ぶ',()=>{
 assert.equal(findRegionalInsight('rice',-121.8,39.1)?.id,'sacramento-rice');
 assert.equal(findRegionalInsight('rice',-91.1,33.2)?.id,'lower-mississippi-rice');
});

test('狭い地域を広域説明より優先し、説明域を栽培境界と呼ばない',()=>{
 assert.equal(findRegionalInsight('cotton',-102,33.5)?.id,'west-texas-cotton');
 assert.equal(findRegionalInsight('cotton',-84,33.5)?.id,'southeast-cotton');
 assert.equal(findRegionalInsight('soybean',-91,41)?.id,'midwest-corn-soy');
});

test('地域原稿は一意で、通常版と短縮版、根拠を持つ',()=>{
 assert.equal(new Set(regionalInsights.map(entry=>entry.id)).size,regionalInsights.length);
 for(const entry of regionalInsights){
  assert.ok(entry.summary.length>=75,entry.id);assert.ok(entry.compactSummary.length>=35,entry.id);
  assert.ok(entry.summary.length>entry.compactSummary.length,entry.id);assert.ok(entry.sourceIds.length>0,entry.id);
 }
});
