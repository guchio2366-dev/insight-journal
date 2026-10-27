import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {southeastRainfallBreaks,southeastRainfallColors,southeastRainfallColor,southeastRainfallLegend,southeastRainfallMissingColor} from '../../src/lib/atlas-southeast-rainfall.ts';

const manifest=JSON.parse(readFileSync(new URL('../../public/assets/atlas/asia-presentation-v1/manifest.json',import.meta.url),'utf8'));
const bands=manifest.regions['southeast-asia'].rainfall.bands;

test('SEA annual rainfall uses seven ordered blue classes with an open-ended wet class',()=>{
 assert.deepEqual(southeastRainfallBreaks,[1000,1500,2000,2500,3000,4000]);
 const legend=southeastRainfallLegend();
 assert.equal(legend.length,7);
 assert.equal(new Set(legend.map(item=>item.color)).size,7);
 assert.deepEqual(legend.map(item=>item.color),[...southeastRainfallColors]);
 assert.equal(legend[0].label,'1,000未満');
 assert.equal(legend.at(-1).label,'4,000以上');
 assert.equal(legend.at(-1).upper,null);
 const luminance=color=>{
  const rgb=color.slice(1).match(/../g).map(hex=>parseInt(hex,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 };
 for(let i=1;i<legend.length;i++){
  assert.equal(legend[i].lower,legend[i-1].upper);
  assert.ok(luminance(legend[i].color)<luminance(legend[i-1].color),'higher rainfall stays darker');
  assert.match(legend[i].label,i===legend.length-1?/以上$/:/以上.*未満$/);
 }
});

test('all retained 250 mm bands have one legend color, including exact display thresholds',()=>{
 assert.equal(bands.interval,250);
 const legend=southeastRainfallLegend();
 for(const threshold of southeastRainfallBreaks){
  assert.ok(bands.breaks.includes(threshold),'a new class must follow an existing polygon boundary');
  assert.notEqual(southeastRainfallColor(threshold-.01),southeastRainfallColor(threshold));
 }
 for(let i=0;i<bands.breaks.length-1;i++){
  const lower=bands.breaks[i],upper=bands.breaks[i+1];
  const entries=legend.filter(item=>lower>=item.lower&&(item.upper===null||lower<item.upper));
  assert.equal(entries.length,1);
  assert.equal(southeastRainfallColor(lower),entries[0].color);
  assert.equal(southeastRainfallColor(upper-.01),entries[0].color,'no display threshold splits an existing 250 mm band');
 }
 for(const value of [4000,12250,13336,20000])assert.equal(southeastRainfallColor(value),legend.at(-1).color);
 for(const value of [-32768,-1,NaN,Infinity])assert.equal(southeastRainfallColor(value),southeastRainfallMissingColor);
 assert.notEqual(southeastRainfallColor(0),southeastRainfallMissingColor);
});

test('display grouping retains the source grid and its values above 4,000 mm',()=>{
 const compressed=readFileSync(new URL('../../'+bands.sourceGrid,import.meta.url));
 assert.equal(createHash('sha256').update(compressed).digest('hex'),bands.sourceGridSHA256);
 const raw=gunzipSync(compressed);
 let minimum=Infinity,maximum=-Infinity,valid=0,below1000=0,below500=0,wet=0;
 for(let i=0;i<raw.length;i+=2){
  const value=raw.readInt16LE(i);
  if(value===-32768)continue;
  valid++;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);
  if(value<1000)below1000++;
  if(value<500)below500++;
  if(value>=4000)wet++;
 }
 // These are counts of valid display cells, not geographic area shares.
 assert.equal(valid,bands.validCellCount);
 assert.equal(minimum,660);
 assert.equal(maximum,13336);
 assert.equal(below1000,3172);
 assert.equal(below500,0);
 assert.equal(wet,33648);
});
