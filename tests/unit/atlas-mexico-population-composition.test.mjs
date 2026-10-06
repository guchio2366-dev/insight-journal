import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const module=await transform(await readFile('src/lib/atlas-mexico-population-composition.ts','utf8'),{loader:'ts',format:'esm'});
const lib=await import(`data:text/javascript;base64,${Buffer.from(module.code).toString('base64')}`);
const metric={id:'indigenous_language',category:'ethnicity',countRadiusReference:10000,countMaximumRadius:30,states:{'08':{count:100,denominator:1000,status:'value'}}};
const data={referenceYear:2020,metrics:[metric,{id:'noReligion',category:'religion'}]};
const official=JSON.parse(await readFile('src/data/atlas/mexico/population-composition.json','utf8'));

test('Religion overview compares three absolute shares with common bins while all eight details retain their own bins',()=>{
 const before=JSON.stringify(official),overview=lib.mexicoCompositionOverviewMetrics(official,'religion');
 assert.deepEqual(overview.map(m=>m.id),['catholic','protestant_evangelical','no_religion']);
 assert.equal(official.metrics.filter(m=>m.category==='religion').length,8);
 for(const m of overview){
  for(const share of [0,.5,1,5,10,25,50,75,100])assert.equal(lib.mexicoCompositionOverviewColor({count:share*10,denominator:1000,status:share?'value':'zero'},m),lib.mexicoCompositionColor({count:share*10,denominator:1000,status:share?'value':'zero'},{...m,shareBins:lib.mexicoCompositionShareBins}));
  for(const bin of m.shareBins)assert.equal(lib.mexicoCompositionColor({count:bin.min*10000,denominator:1000000,status:bin.min?'value':'zero'},m),bin.color);
  const national=lib.mexicoCompositionNationalRecord(m);assert.equal(national.count,m.nationalCount);assert.equal(national.denominator,m.nationalDenominator);
 }
 assert.equal(JSON.stringify(official),before);
 assert.equal(lib.mexicoCompositionOverviewMetrics(official,'ethnicity').length,3);
});

test('Bare categories open a national overview; explicit metric links and national comparison returns remain durable',()=>{
 for(const category of ['ethnicity','religion']){
  const bare=new URL(`https://example.test/?category=${category}&reading=overview`);
  const overview=lib.readMexicoCompositionSelection(bare,official,category);assert.equal(overview.overview,true);
  const saved=lib.writeMexicoCompositionSelection(bare,overview,category);assert.equal(saved.searchParams.get('compositionView'),'overview');assert.equal(saved.searchParams.has('compositionMetric'),false);
  const m=official.metrics.find(m=>m.category===category);
  const source=new URL(`https://example.test/?category=${category}&compositionMetric=${m.id}&compositionMeasure=share&reading=item&frame=120,80,600,400`);
  const detail=lib.readMexicoCompositionSelection(source,official,category);assert.equal(detail.overview,false);
  const compared=lib.mexicoCompositionComparisonUrl(source),selection=lib.readMexicoCompositionSelection(compared,official,category);
  assert.equal(selection.compare,true);compared.searchParams.set('state','09');assert.equal(lib.mexicoCompositionReturnUrl(compared,selection).href,source.href);
 }
});

test('Composition percentages retain their own population universe and distinguish zero, confidential, missing and undefined denominators',()=>{
 assert.equal(lib.mexicoCompositionShare({count:100,denominator:1000,status:'value'}),10);
 assert.equal(lib.mexicoCompositionShare({count:100,denominator:800,status:'value'}),12.5);
 assert.equal(lib.mexicoCompositionShare({count:0,denominator:800,status:'zero'}),0);
 for(const record of [{count:0,denominator:0,status:'zero'},{count:100,denominator:null,status:'value'},{count:100,denominator:80,status:'value'},{count:100,denominator:800,status:'confidential'},{count:null,denominator:800,status:'missing'}])assert.equal(lib.mexicoCompositionShare(record),null);
 assert.equal(lib.mexicoCompositionColor({count:0,denominator:100,status:'zero'},metric),lib.mexicoCompositionShareBins[0].color);
 assert.equal(lib.mexicoCompositionColor({count:100,denominator:100,status:'value'},metric),lib.mexicoCompositionShareBins.at(-1).color);
});
test('Count circles encode the actual count with a fixed metric reference, independently of a state denominator',()=>{
 const radius=count=>lib.mexicoCompositionRadius({count,denominator:50000,status:count?'value':'zero'},metric);
 assert.ok(Math.abs(radius(1000)**2/radius(4000)**2-.25)<1e-12);assert.equal(radius(10000),30);assert.equal(radius(0),0);
 assert.equal(lib.mexicoCompositionRadius({count:1000,denominator:0,status:'value'},metric),radius(1000));
 assert.equal(lib.mexicoCompositionRadius({count:1000,denominator:50000,status:'confidential'},metric),0);
});
test('Tiny positive percentages remain distinct from a true zero at the published display precision',()=>{
 const minor={...metric,sharePrecision:3};
 assert.equal(lib.formatMexicoCompositionShare({count:1,denominator:1_000_000,status:'value'},minor),'<0.001%');
 assert.equal(lib.formatMexicoCompositionShare({count:0,denominator:1_000_000,status:'zero'},minor),'0%');
 assert.equal(lib.formatMexicoCompositionShare({count:32,denominator:1_000_000,status:'value'},minor),'0.003%');
 assert.equal(lib.formatMexicoCompositionShare({count:null,denominator:1_000_000,status:'missing'},minor),'欠測');
});
test('Compact circle-key labels convert published integers exactly without changing the count or circle radius',()=>{
 for(const [count,label]of [[200,'200人'],[1000,'1,000人'],[15000,'1.5万人'],[300000,'30万人'],[1500000,'150万人'],[3000000,'300万人'],[10001,'1.0001万人']])assert.equal(lib.formatMexicoCompositionCountKey(count),label);
});
test('A composition comparison returns the exact originating metric, measure and state without overwriting unrelated source flags',()=>{
 const source=new URL('https://example.test/population/?category=ethnicity&compositionMetric=indigenous_language&compositionMeasure=count&view=population&state=08&only=1&fallback=1&metric=cattle&measure=quantity&from=agriculture&sourceMetric=cattle&sourceCrops=0&sourceLivestock=1&reading=item');
 const parsed=lib.readMexicoCompositionSelection(source,data,'ethnicity');const written=lib.writeMexicoCompositionSelection(source,parsed,'ethnicity');
 for(const key of ['metric','measure','from','sourceMetric','sourceCrops','sourceLivestock','view','state','only','fallback'])assert.equal(written.searchParams.get(key),source.searchParams.get(key),key);
 const compared=lib.mexicoCompositionComparisonUrl(written);const selected=lib.readMexicoCompositionSelection(compared,data,'ethnicity');assert.equal(selected.compare,true);
 compared.searchParams.set('state','09');assert.equal(lib.mexicoCompositionReturnUrl(compared,selected).href,written.href);
 const invalid=new URL(compared);invalid.searchParams.set('compositionFrom','https://evil.test');assert.equal(lib.readMexicoCompositionSelection(invalid,data,'ethnicity').compare,false);
 for(const sourceQuery of ['?category=ethnicity&compositionMetric=indigenous_language&compositionMeasure=count&state=99&only=1','?category=ethnicity&compositionMetric=indigenous_language&compositionMeasure=density&state=08']){invalid.searchParams.set('compositionFrom',sourceQuery);assert.equal(lib.readMexicoCompositionSelection(invalid,data,'ethnicity').compare,false);}
 const distribution=lib.writeMexicoCompositionSelection(written,parsed,'distribution');for(const key of lib.mexicoCompositionKeys)assert.equal(distribution.searchParams.has(key),false);assert.equal(distribution.searchParams.get('sourceMetric'),'cattle');assert.equal(distribution.searchParams.get('metric'),'cattle');
});
