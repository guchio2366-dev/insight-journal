import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const module=await transform(await readFile('src/lib/atlas-mexico-population-composition.ts','utf8'),{loader:'ts',format:'esm'});
const lib=await import(`data:text/javascript;base64,${Buffer.from(module.code).toString('base64')}`);
const metric={id:'indigenous_language',category:'ethnicity',countRadiusReference:10000,countMaximumRadius:30,states:{'08':{count:100,denominator:1000,status:'value'}}};
const data={referenceYear:2020,metrics:[metric,{id:'noReligion',category:'religion'}]};

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
