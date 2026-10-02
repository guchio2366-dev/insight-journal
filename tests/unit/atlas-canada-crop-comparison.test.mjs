import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const code=await bundleCanadaSource('src/lib/atlas-canada-crop-comparison.ts',{platform:'node',format:'esm',minify:true});
const {buildCanadaCropNatureUrl:toNature,readCanadaCropComparison:read,writeCanadaCropComparisonCensusState:writeCensus}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const root='/atlas/north-america/canada/';
const paths={canola:'agriculture/',wheat:'agriculture/wheat/',beef:'agriculture/beef/'};

test('All three published crop routes carry independent source choices through nature views and reloads, including deployment bases',()=>{
 for(const prefix of ['', '/insight-journal'])for(const crop of ['canola','wheat','beef']){
  const query=crop==='beef'?'year=2026&province=Ontario&compare=Quebec&metric=dairy&map=hay&zoom=1':'year=2022&province=Alberta&compare=Manitoba&metric=harvested&zoom=1';
  const source=new URL(`https://example.com${prefix}${root}${paths[crop]}?${query}&private=omit#irrelevant`);
  for(const view of ['climate','landform','water']){
   const target=toNature(source,crop,'regina',view),comparison=read(new URL(target.href));
   assert.equal(target.pathname,`${prefix}${root}nature/`);assert.equal(target.searchParams.get('city'),'regina');assert.equal(target.searchParams.get('view'),view);
   assert.equal(comparison.crop,crop);assert.equal(comparison.returnUrl.pathname,source.pathname);assert.deepEqual(Object.fromEntries(comparison.returnUrl.searchParams),Object.fromEntries(new URLSearchParams(query)));assert.equal(comparison.returnUrl.hash,'');
   assert.ok(!target.search.includes('private'));assert.ok(!target.search.includes('irrelevant'));
   assert.equal(comparison.selectedMap.year,2021);assert.equal(comparison.maps.length,crop==='beef'?3:1);assert.equal(comparison.selectedMap.id,crop==='beef'?'hay':crop);
   assert.match(comparison.returnLabel,crop==='beef'?/肉牛.*オンタリオ.*ケベック.*2026年7月1日.*乳牛.*干草・栽培牧草/s:crop==='wheat'?/小麦.*アルバータ.*マニトバ.*2022年.*収穫/s:/カノーラ.*アルバータ.*マニトバ.*2022年.*収穫/s);
   assert.ok(comparison.selectedMap.image.startsWith(prefix+'/assets/'));
   // Nature comparison controls may reuse compare/year/zoom; source choices remain separate.
   target.searchParams.set('compare','winnipeg');target.searchParams.set('year','2000');target.searchParams.set('zoom','0');
   assert.deepEqual(read(target).state,comparison.state);
  }
 }
});

test('Crop contexts reject external destinations, unhandled crops, mismatched paths, source keys and duplicate choices',()=>{
 const url=new URL('https://example.com/insight-journal'+root+'nature/');
 const readRaw=(crop,raw)=>{const u=new URL(url);u.searchParams.set('crop',crop);u.searchParams.set('cropReturn',raw);return read(u);};
 for(const raw of [
  'https://evil.example/insight-journal'+root+'agriculture/',
  '//evil.example/insight-journal'+root+'agriculture/',
  '/insight-journal'+root+'agriculture/wheat/',
  root+'agriculture/',
  '/insight-journal'+root+'population/',
  '/insight-journal'+root+'agriculture/?redirect=https://evil.example',
  '/insight-journal'+root+'agriculture/?province=Alberta&province=Quebec',
  '/insight-journal'+root+'agriculture/?map=hay',
  '/insight-journal'+root+'agriculture/#outside',
  '\\evil.example\\agriculture/',
 ])assert.equal(readRaw('canola',raw),null,raw);
 for(const crop of ['barley','forestry','CANOLA','',null])assert.equal(readRaw(crop,'/insight-journal'+root+'agriculture/'),null);
 assert.equal(read(url),null);
 assert.throws(()=>toNature(new URL('https://example.com'+root+'population/'),'canola'),TypeError);
});

test('Invalid source choices resolve to published defaults without manufacturing a new crop, year, metric or map',()=>{
 const source=new URL('https://example.com'+root+'agriculture/beef/?year=9999&province=unknown&compare=unknown&metric=production&map=farm&zoom=2');
 const comparison=read(toNature(source,'beef','unknown','unknown'));
 assert.deepEqual(comparison.state,{year:2021,province:'Alberta',compare:null,metric:'beef',map:'beef',zoom:false});
 assert.equal(comparison.selectedMap.id,'beef');assert.equal(comparison.returnUrl.searchParams.has('compare'),false);
 const target=toNature(source,'beef','unknown','unknown');assert.equal(target.searchParams.get('city'),'regina');assert.equal(target.searchParams.get('view'),'climate');
});

test('Retained 2021 paper figures are reference metadata; the selected GIS product uses exact published definitions',async()=>{
 for(const crop of ['canola','wheat','beef']){
  const source=new URL('https://example.com'+root+paths[crop]),context=read(toNature(source,crop));
  assert.equal(context.productId,crop);assert.equal(context.product.id,crop);assert.equal(context.product.unit,crop==='beef'?'頭':'ha');
  const manifest=JSON.parse(await readFile(`public/assets/atlas/${crop==='canola'?'canada-agriculture-v1':crop==='wheat'?'canada-wheat-v1':'canada-beef-v1'}/manifest.json`,'utf8'));
  for(const map of context.maps){await access('public'+map.image);assert.equal(map.width,1133);assert.equal(map.height,814);assert.equal(map.year,2021);assert.ok(map.source.startsWith('https://www150.statcan.gc.ca/'));}
  if(crop==='beef'){assert.deepEqual(context.maps.map(m=>m.id),['beef','pasture','hay']);assert.match(context.maps[0].dot,/2,500頭/);assert.match(context.maps[1].dot,/16,188 ha/);assert.match(context.maps[2].dot,/3,238 ha/);assert.equal(manifest.maps.length,context.maps.length);}
  else{assert.match(context.selectedMap.dot,crop==='canola'?/4,047 ha/:/6,070 ha/);assert.equal(manifest.map.year,context.selectedMap.year);}
 }
});

test('Native CCS selection, only-filter and geographic bounds survive source return and independent nature history',()=>{
 const id='2021S05024810036',bounds='-115,51,-108,57';
 for(const crop of ['canola','wheat','beef']){
  const source=new URL('https://example.com/insight-journal'+root+paths[crop]+'?year=2021&province=Alberta&ccs='+id+'&ccsOnly=1&ccsBounds='+bounds);
  const target=toNature(source,crop),comparison=read(target);
  assert.deepEqual(comparison.censusState,{selected:id,only:true,bounds:[-115,51,-108,57]});assert.equal(comparison.returnUrl.searchParams.get('ccs'),id);assert.equal(comparison.returnUrl.searchParams.get('ccsOnly'),'1');assert.equal(comparison.returnUrl.searchParams.get('ccsBounds'),bounds);assert.match(comparison.returnLabel,/Vermilion River County.*CCS 4810036.*のみ/);assert.equal(comparison.selectedRegion.name,'Vermilion River County');
  target.searchParams.set('city','winnipeg');target.searchParams.set('only','0');target.searchParams.set('frame','0,0,900,580');assert.deepEqual(read(target).censusState,comparison.censusState);
  const changed=writeCensus(target,{selected:'2021S05021001214',only:false,bounds:null}),after=read(changed);
  assert.equal(changed.searchParams.get('city'),'winnipeg');assert.deepEqual(after.state,comparison.state);assert.deepEqual(after.censusState,{selected:'2021S05021001214',only:false,bounds:null});assert.equal(after.returnUrl.searchParams.has('ccsOnly'),false);assert.equal(after.returnUrl.searchParams.has('ccsBounds'),false);
 }
});

test('Unknown CCS and malformed cameras sanitize without creating geographic selections or unsafe returns',()=>{
 for(const query of ['ccs=unknown&ccsOnly=1','ccs=__proto__&ccsOnly=1','ccsBounds=-110,,-100,60','ccsBounds=-110,50,-100,Infinity','ccsBounds=-110,60,-100,50','ccsBounds=-200,50,-100,60']){
  const comparison=read(toNature(new URL('https://example.com'+root+'agriculture/?'+query),'canola'));assert.deepEqual(comparison.censusState,{selected:null,only:false,bounds:null});assert.equal(comparison.returnUrl.searchParams.has('ccs'),false);assert.equal(comparison.returnUrl.searchParams.has('ccsBounds'),false);
 }
 const bad=new URL('https://example.com'+root+'nature/?crop=canola&cropReturn=https://evil.example/');assert.equal(writeCensus(bad,{selected:'2021S05024810036'}).href,bad.href);
 const duplicate=new URL('https://example.com'+root+'nature/');duplicate.searchParams.set('crop','canola');duplicate.searchParams.set('cropReturn',root+'agriculture/?ccs=2021S05024810036&ccs=2021S05021001214');assert.equal(read(duplicate),null);
});
