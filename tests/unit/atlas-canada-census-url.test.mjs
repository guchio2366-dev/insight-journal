import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleCanadaSource } from '../fixtures/bundle-canada-source.mjs';

const source = await bundleCanadaSource('src/lib/atlas-canada-census-map.ts', {format:'esm',platform:'node'});
const helper = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const ids = Object.keys(JSON.parse(await readFile('src/data/atlas/canada/census-agriculture.json','utf8')).records);
const camera = value => helper.readCanadaCensusMapState(new URL('https://example.com/?ccsBounds='+encodeURIComponent(value)),ids).bounds;

test('CCS camera rejects every empty or whitespace-only coordinate without changing region selection', () => {
  for(const fields of [['','40','10','50'],['-120','','-110','50'],['-120','40','','50'],['-120','40','-110','']]){
    const url=new URL('https://example.com/?ccs='+ids[0]+'&ccsOnly=1&ccsBounds='+encodeURIComponent(fields.join(',')));
    const state=helper.readCanadaCensusMapState(url,ids);
    assert.deepEqual(state,{selected:ids[0],only:true,bounds:null});
  }
  for(const whitespace of [' ','\t','\n'])assert.equal(camera(['-120',whitespace,'-110','50'].join(',')),null);
  for(const invalid of ['',',,,','-120,40,-110','-120,40,-110,50,60','-120,NaN,-110,50','-120,40,Infinity,50','10,20,5,40'])assert.equal(camera(invalid),null);
});

test('CCS camera accepts real numeric zero and surrounding whitespace with ordered geographic bounds', () => {
  assert.deepEqual(camera('0,0,10,10'),[0,0,10,10]);
  assert.deepEqual(camera('-10,-10,0,0'),[-10,-10,0,0]);
  assert.deepEqual(camera(' -120 , 40 , -110 , 50 '),[-120,40,-110,50]);
  assert.deepEqual(camera('-180,-85.051,180,85.051'),[-180,-85.051,180,85.051]);
});

test('CCS state round-trips while preserving explicit overview and annual parameters', () => {
  const initial=new URL('https://example.com/?item=overview&year=2025&province=Alberta&keep=yes');
  const state={selected:ids[0],only:true,bounds:[0,0,10,10]};
  const result=helper.writeCanadaCensusMapState(initial,state);
  assert.deepEqual(helper.readCanadaCensusMapState(result,ids),state);
  for(const [key,value] of initial.searchParams)assert.equal(result.searchParams.get(key),value);
});
