import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMexicoSurfaceManifest, mexicoSurfaceGradient, mexicoSurfaceTickPosition} from '../../src/lib/atlas-mexico-quantitative.ts';

const layer = unit => ({image:{file:'native.png',width:900,height:580,sha256:'a'.repeat(64)},legend:{domain:[0,4000],ticks:[0,500,1000,4000],colorStops:[{value:0,color:'#f7fbff'},{value:1000,color:'#9ecae1'},{value:4000,color:'#08306b'}],unit},titleJa:'数値面',periodLabelJa:'対象期間',sourceLabelJa:'公式資料',descriptionJa:'数値を色へ対応',limitationsJa:['欠測は透明'],sourceUrl:'https://example.test/official',provenanceFile:'source.json'});
const manifest = () => ({schemaVersion:1,layers:{precipitation:layer('mm/年'),elevation:layer('m')}});

test('Surface contract requires the atlas projection frame, quantitative units, metadata and local assets',()=>{
  assert.equal(validateMexicoSurfaceManifest(manifest()).layers.precipitation.legend.unit,'mm/年');
  for (const mutate of [
    m=>m.layers.precipitation.image.width=132,
    m=>m.layers.precipitation.image.file='https://example.test/image.png',
    m=>m.layers.precipitation.legend.unit='mm/月',
    m=>m.layers.precipitation.periodLabelJa='',
    m=>m.layers.elevation.provenanceFile='../source.json',
  ]) {const invalid=manifest();mutate(invalid);assert.throws(()=>validateMexicoSurfaceManifest(invalid));}
});

test('Legend gradient and tick positions follow numerical distances, not equally spaced categories',()=>{
  const legend=manifest().layers.precipitation.legend;
  assert.equal(mexicoSurfaceGradient(legend),'linear-gradient(to right, #f7fbff 0%, #9ecae1 25%, #08306b 100%)');
  assert.equal(mexicoSurfaceTickPosition(legend,500),12.5);
  const elevation={...legend,domain:[-600,5500]};
  assert.equal(mexicoSurfaceTickPosition(elevation,-600),0);
  assert.equal(mexicoSurfaceTickPosition(elevation,5500),100);
});

test('Out-of-order color stops, out-of-domain ticks and truncated scales are rejected',()=>{
  for(const mutate of [
    m=>m.layers.precipitation.legend.colorStops[1].value=-1,
    m=>m.layers.precipitation.legend.ticks.push(5000),
    m=>m.layers.elevation.legend.colorStops.pop(),
  ]) {const invalid=manifest();mutate(invalid);assert.throws(()=>validateMexicoSurfaceManifest(invalid));}
});

test('250mm band legends reject gaps, mismatched domain endpoints and a different interval',()=>{
  const valid=manifest();
  valid.layers.precipitation.legend.bands=Array.from({length:16},(_,i)=>({min:i*250,max:(i+1)*250,color:'#2171b5'}));
  valid.layers.precipitation.legend.interval=250;
  valid.layers.precipitation.image.file='gpcc/derived.svg';
  assert.doesNotThrow(()=>validateMexicoSurfaceManifest(valid));
  for(const mutate of [
    m=>m.layers.precipitation.legend.bands[2].min=750,
    m=>m.layers.precipitation.legend.bands.pop(),
    m=>m.layers.precipitation.legend.interval=500,
  ]) {const invalid=structuredClone(valid);mutate(invalid);assert.throws(()=>validateMexicoSurfaceManifest(invalid));}
});
