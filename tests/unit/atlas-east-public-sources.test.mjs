import test from 'node:test';
import assert from 'node:assert/strict';
import {eastCoalPrimaryUrl,eastPublicSourceScanText} from '../../src/data/atlas/east-asia-public-sources.ts';
const privateId=/(?<![a-z0-9])[0-9a-f]{32}(?![a-z0-9])/i;
test('release scan accepts the exact verified corporate URL but retains private-ID detection elsewhere',()=>{
 assert.equal(privateId.test(eastPublicSourceScanText(eastCoalPrimaryUrl)),false);
 const id=eastCoalPrimaryUrl.match(/[0-9a-f]{32}/)[0];
 for(const text of [id,eastCoalPrimaryUrl+' '+id,eastCoalPrimaryUrl.replace('www.ceic.com','private.example'),eastCoalPrimaryUrl.replace('https:','http:')])assert(privateId.test(eastPublicSourceScanText(text)));
 assert(eastPublicSourceScanText(eastCoalPrimaryUrl+' PRIVATE_SENTINEL notion.so').includes('PRIVATE_SENTINEL notion.so'));
});
