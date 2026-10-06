import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {transform} from 'esbuild';

const data = JSON.parse(await readFile('src/data/atlas/mexico/population.json','utf8'));
const geometry = JSON.parse(await readFile('src/data/atlas/mexico/geometry.json','utf8'));
const manifest = JSON.parse(await readFile('public/assets/atlas/mexico-population-v1/manifest.json','utf8'));
const module = await transform(await readFile('src/lib/atlas-mexico-population.ts','utf8'),{loader:'ts',format:'esm'});
const lib = await import(`data:text/javascript;base64,${Buffer.from(module.code).toString('base64')}`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const codes = data.states.map(row=>row.stateCode);

test('2020 state populations preserve every original CSV count and sum to the national count',async()=>{
 const csv=(await readFile('data-source/atlas/mexico/population/iter-2020-state-extract.csv','utf8')).trim().split(/\r?\n/);
 const columns=csv.shift().split(','),rows=csv.map(line=>Object.fromEntries(line.split(',').map((cell,index)=>[columns[index],cell])));
 assert.equal(data.referenceDate,'2020-03-15');assert.equal(data.referenceTime,'00:00');assert.equal(data.referenceYear,2020);
 assert.equal(data.populationUnit,'persons');assert.equal(data.densityUnit,'persons/km2');assert.equal(data.states.length,32);
 assert.deepEqual(codes,Array.from({length:32},(_,index)=>String(index+1).padStart(2,'0')));
 assert.equal(rows.length,33);assert.equal(data.nationalPopulation,126014024);
 assert.equal(data.states.reduce((sum,row)=>sum+row.population,0),126014024);
 for(const row of data.states){const raw=rows.find(raw=>raw.ENTIDAD===row.stateCode);assert.ok(raw);assert.equal(raw.MUN,'000');assert.equal(raw.LOC,'0000');assert.equal(row.population,Number(raw.POBTOT));assert.equal(row.population,Number(raw.POBFEM)+Number(raw.POBMAS));assert.equal(row.name,raw.NOM_ENT);assert.equal(row.populationStatus,'value');assert.equal(row.densityStatus,'value');assert.ok(row.population>0&&row.density>0);assert.ok(geometry.features.some(feature=>feature.properties.code===row.stateCode));}
 assert.deepEqual(data.statusCounts,{value:32,zero:0,missing:0,confidential:0,unavailable:0});
});

test('Published density and source reference stay independent of the 2025 display geometry',()=>{
 assert.equal(data.nationalDensity,64.3);
 assert.equal(data.states.find(row=>row.stateCode==='09').density,6163.3);
 assert.equal(data.states.find(row=>row.stateCode==='15').density,760.2);
 assert.equal(data.states.find(row=>row.stateCode==='08').density,15.1);
 assert.equal(data.states.find(row=>row.stateCode==='03').density,10.8);
 assert.equal(manifest.validation.densityFromDisplayGeometry,false);
 assert.equal(manifest.displayGeometry.densityAreaCalculation,false);
 assert.match(manifest.displayGeometry.reference,/2025/);
 assert.match(data.sources.density.method,/published/);
 for(const row of data.states){assert.equal(row.densityReferenceYear??data.referenceYear,2020);assert.equal(row.densityUnit,'persons/km2');assert.ok(Number.isInteger(row.densitySourcePdfPage));}
});

test('Selected extract, original PDF, original metadata licence and distributed values retain hashes',async()=>{
 for(const artifact of manifest.sourceArtifacts){const bytes=await readFile(`data-source/atlas/mexico/population/${artifact.file}`);assert.equal(bytes.length,artifact.bytes);assert.equal(hash(bytes),artifact.sha256);}
 const originalPdf=gunzipSync(await readFile('data-source/atlas/mexico/population/panorama-2020-mexico.pdf.gz'));
 assert.equal(originalPdf.length,10984344);assert.equal(hash(originalPdf),'7a412a523f31dd109a4cd79fc317580c62f3cc70ec84a0c4b896847d9bd0d3be');
 const metadata=await readFile('data-source/atlas/mexico/population/iter-2020-metadata.txt','utf8');
 assert.match(metadata,/license: https:\/\/www\.inegi\.org\.mx\/inegi\/terminos\.html/);
 assert.match(metadata,/modified: 2022-05-19/);assert.match(metadata,/temporal: 2020-03-15-2020-03-15/);
 const json=await readFile('public/assets/atlas/mexico-population-v1/population-2020.json');
 assert.equal(hash(json),manifest.generated.jsonSha256);assert.deepEqual(JSON.parse(json),data);
 const csv=await readFile('public/assets/atlas/mexico-population-v1/population-density-2020.csv');assert.equal(hash(csv),manifest.generated.csvSha256);
 assert.equal(manifest.license.url,'https://www.inegi.org.mx/inegi/terminos.html');
});

test('Population symbols encode area, including legends; zero and unavailable values stay distinct',()=>{
 for(const [a,b] of [[1e6,5e6],[5e6,1e7],[731391,16992418]]) assert.ok(Math.abs(lib.mexicoPopulationRadius(a)**2/lib.mexicoPopulationRadius(b)**2-a/b)<1e-12);
 assert.deepEqual(lib.mexicoPopulationLegendValues,[1e6,5e6,1e7]);
 assert.equal(lib.mexicoPopulationRadius(0),0);assert.equal(lib.mexicoPopulationRadius(-1),0);assert.equal(lib.mexicoPopulationRadius(NaN),0);
 assert.equal(lib.formatMexicoPopulation(0,'zero'),'0');assert.equal(lib.formatMexicoPopulation(null,'missing'),'欠測');assert.equal(lib.formatMexicoPopulation(null,'confidential'),'秘匿');assert.equal(lib.formatMexicoPopulation(null,'unavailable'),'未取得');
 assert.equal(lib.mexicoDensityColor(0,'zero'),lib.mexicoDensityBins[0].color);
 assert.equal(lib.mexicoDensityColor(null,'confidential'),'url(#mexico-population-missing)');
 for(const bin of lib.mexicoDensityBins){assert.equal(lib.mexicoDensityColor(bin.min),bin.color);if(Number.isFinite(bin.max))assert.equal(lib.mexicoDensityColor(bin.max-.01),bin.color);}
});

test('URL state survives refresh, comparison and targeted return; malformed parameters normalize safely',()=>{
 const source=new URL('https://example.test/insight-journal/atlas/north-america/mexico/population/?view=population&state=08&only=1&fallback=1');
 const state=lib.readMexicoPopulationState(source,codes);assert.equal(state.view,'population');assert.equal(state.state,'08');assert.equal(state.only,true);assert.equal(state.fallback,true);
 assert.deepEqual(lib.readMexicoPopulationState(lib.writeMexicoPopulationState(source,state),codes),state);
 const comparison=lib.mexicoPopulationScaleUrl(source,state);assert.equal(comparison.searchParams.get('compare'),'scale');assert.equal(comparison.searchParams.get('sourceView'),'population');
 const comparisonState=lib.readMexicoPopulationState(comparison,codes);const back=lib.mexicoPopulationReturnUrl(comparison,comparisonState);assert.equal(back.searchParams.get('view'),'population');assert.equal(back.searchParams.get('state'),'08');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');assert.equal(back.searchParams.get('compare'),null);
 for(const route of ['industry','nature']){const target=new URL(`/insight-journal/atlas/north-america/mexico/${route}/`,source);const result=(route==='industry'?lib.mexicoPopulationIndustryUrl:lib.mexicoPopulationNatureUrl)(target,state);assert.equal(result.pathname,target.pathname);assert.equal(result.searchParams.get('compare'),'population');assert.equal(result.searchParams.get('from'),'population');assert.equal(result.searchParams.get('state'),'08');assert.equal(result.searchParams.get('only'),'1');assert.equal(result.searchParams.get('sourceView'),'population');assert.equal(result.searchParams.get('fallback'),'1');if(route==='nature')assert.equal(result.searchParams.get('view'),'relief');}
 const invalid=lib.readMexicoPopulationState(new URL('https://example.test/?category=bad&view=bad&state=999&compare=https://evil.test&only=true&sourceView=bad&fallback=true'),codes);assert.deepEqual(invalid,{category:'distribution',view:'density',state:'',compare:null,sourceView:'density',only:false,fallback:false});
});

test('All population categories start nationally without inventing a selected state, including malformed isolation URLs',()=>{
 for(const category of ['distribution','ethnicity','religion'])for(const suffix of ['', '&state=99&only=1','&state=&only=1']){
  const source=new URL(`https://example.test/population/?category=${category}${suffix}&frame=120,80,600,400`);
  const state=lib.readMexicoPopulationState(source,codes);assert.equal(state.state,'');assert.equal(state.only,false);
  const saved=lib.writeMexicoPopulationState(source,state);assert.equal(saved.searchParams.has('state'),false);assert.equal(saved.searchParams.has('only'),false);assert.equal(saved.searchParams.get('frame'),'120,80,600,400');
  assert.equal(lib.readMexicoPopulationState(lib.mexicoPopulationScaleUrl(saved,state),codes).state,'');
  for(const helper of [lib.mexicoPopulationIndustryUrl,lib.mexicoPopulationNatureUrl]){const target=helper(new URL('https://example.test/compare/?state=09'),state);assert.equal(target.searchParams.has('state'),false);assert.equal(target.searchParams.get('sourceState'),'');assert.equal(target.searchParams.get('sourceOnly'),'0');}
 }
});

test('Population camera is bounded, zoomable, and independent from selected-state URL changes',()=>{
 const base=new URL('https://example.test/population/');assert.deepEqual(lib.readMexicoPopulationFrame(base),[0,0,900,580]);
 let frame=[0,0,900,580];for(let i=0;i<12;i++)frame=lib.zoomMexicoPopulationFrame(frame,'in');assert.equal(frame[2],180);assert.equal(frame[3],116);
 for(let i=0;i<12;i++)frame=lib.zoomMexicoPopulationFrame(frame,'out');assert.deepEqual(frame,[0,0,900,580]);
 for(const value of ['NaN,0,900,580','-1,0,900,580','0,0,999,580','900,0,200,200']){base.searchParams.set('frame',value);assert.deepEqual(lib.readMexicoPopulationFrame(base),[0,0,900,580]);}
 const source=new URL('https://example.test/population/?view=density&frame=120,80,600,400');const state=lib.readMexicoPopulationState(source,codes);const compared=lib.mexicoPopulationScaleUrl(source,state);const target={...lib.readMexicoPopulationState(compared,codes),state:'20',only:true};const saved=lib.writeMexicoPopulationState(compared,target);const back=lib.mexicoPopulationReturnUrl(saved,target);assert.equal(back.searchParams.has('state'),false);assert.deepEqual(lib.readMexicoPopulationFrame(back),[120,80,600,400]);assert.equal(back.searchParams.has('only'),false);
});

test('Unprepared population categories round-trip independently of source population data and comparison',()=>{
 for(const category of ['ethnicity','religion']){
  const source=new URL(`https://example.test/population/?category=${category}&view=population&state=08&only=1&fallback=1&compare=scale&sourceView=density&extra=keep`);
  const state=lib.readMexicoPopulationState(source,codes);assert.equal(state.category,category);
  const written=lib.writeMexicoPopulationState(source,state);assert.deepEqual(lib.readMexicoPopulationState(written,codes),state);assert.equal(written.searchParams.get('extra'),'keep');
  const back=lib.mexicoPopulationReturnUrl(written,state);assert.equal(back.searchParams.get('category'),category);assert.equal(back.searchParams.get('view'),'density');assert.equal(back.searchParams.get('state'),'08');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');
  const distribution=lib.writeMexicoPopulationState(written,{...state,category:'distribution'});assert.equal(distribution.searchParams.has('category'),false);assert.equal(distribution.searchParams.get('compare'),'scale');assert.equal(distribution.searchParams.get('view'),'population');
 }
});

test('Each static SVG substitute retains the 32 actual state outlines and matching encodings',async()=>{
 assert.equal(manifest.staticMaps.artifacts.length,3);
 for(const artifact of manifest.staticMaps.artifacts){const bytes=await readFile(`public/assets/atlas/mexico-population-v1/${artifact.file}`),svg=bytes.toString('utf8');assert.equal(hash(bytes),artifact.sha256);assert.equal(bytes.length,artifact.bytes);assert.equal((svg.match(/<path d=/g)??[]).length,32);assert.ok(!/NaN|Infinity/.test(svg));assert.match(svg,/2020年3月15日/);assert.match(svg,/表示州境は2025年/);assert.match(svg,/viewBox="0 0 900 580"/);assert.equal((svg.match(/<circle /g)??[]).length,artifact.file==='density.svg'?0:35);}
});
