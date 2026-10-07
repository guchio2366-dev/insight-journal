import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';

registerHooks({
 resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&context.parentURL&&!/\.[a-z]+$/i.test(specifier)){const resolved=new URL(specifier+'.ts',context.parentURL);if(existsSync(fileURLToPath(resolved)))return {url:resolved.href,shortCircuit:true};}return nextResolve(specifier,context);},
 load(url,context,nextLoad){if(url.startsWith('file:')&&url.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(fileURLToPath(url),'utf8'),shortCircuit:true};if(url.startsWith('file:')&&url.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(fileURLToPath(url),'utf8')),shortCircuit:true};return nextLoad(url,context);},
});
const nature=await import('../../src/lib/atlas-latin-nature.ts');
const stationClimate=await import('../../src/lib/atlas-latin-station-climate.ts');
const geometry=await import('../../src/lib/atlas-latin-america-geometry.ts');
const codec=await import('../../src/lib/atlas-latin-learning-state.ts');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const data=json('src/data/atlas/latin-america/nature.json');
const manifest=json('public/assets/atlas/latin-nature-v1/manifest.json');
const sourceGrid=json('public/assets/atlas/latin-america-climate-v1/latin-america.grid.json');

test('Every derived PNG pixel has the source class group and the exact original transparency mask',()=>{
 const bytes=readFileSync('public/assets/atlas/latin-nature-v1/climate-groups.png');
 assert.equal(sha(bytes),manifest.processing.png.sha256);
 let offset=8,idat=[];while(offset<bytes.length){const n=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);if(kind==='IHDR'){assert.equal(bytes.readUInt32BE(offset+8),sourceGrid.width);assert.equal(bytes.readUInt32BE(offset+12),sourceGrid.height);assert.equal(bytes[offset+17],6);}if(kind==='IDAT')idat.push(bytes.subarray(offset+8,offset+8+n));offset+=n+12;}
 const scan=inflateSync(Buffer.concat(idat));
 const colors=data.groups.map(g=>g.color.match(/\w\w/g).map(v=>parseInt(v,16)));
 let valid=0;for(let y=0;y<sourceGrid.height;y++){assert.equal(scan[y*(sourceGrid.width*4+1)],0);for(let x=0;x<sourceGrid.width;x++){
  const old=sourceGrid.values[y*sourceGrid.width+x],pos=y*(sourceGrid.width*4+1)+1+x*4;
  if(old===0){assert.equal(scan[pos+3],0);continue;}
  const group=manifest.processing.groupMapping[old];assert.ok(group);assert.deepEqual([...scan.subarray(pos,pos+4)],[...colors[group-1],255]);valid++;
 }}assert.equal(valid,174564);assert.equal(Object.values(manifest.processing.counts).reduce((a,b)=>a+b),valid);
});
test('Pinned publisher licence, baseline hashes and fresh source station normals are traceable',()=>{
 assert.equal(data.license,'CC BY 4.0');assert.equal(data.period,'1991–2020');assert.equal(data.sourceResolutionDegrees,.1);
 const metadata=json('data-source/atlas/latin-nature/koppen-figshare-v1-metadata.json');assert.equal(metadata.version,1);assert.equal(metadata.license.name,'CC BY 4.0');
 assert.equal(manifest.source.archiveChecksum.algorithm,'MD5');assert.equal(manifest.source.archiveChecksum.encoding,'base64');assert.equal(Buffer.from(manifest.source.archiveChecksum.value,'base64').toString('hex'),metadata.files.find(f=>f.id===45057352).computed_md5);assert.equal('archiveMd5' in manifest.source,false);
 assert.equal(sha(readFileSync('data-source/atlas/latin-nature/koppen-figshare-v1-metadata.json')),manifest.source.metadataSha256);
 assert.equal(sha(readFileSync('public/assets/atlas/latin-america-climate-v1/latin-america.grid.json')),manifest.source.baselineGridSha256);
 assert.equal(sha(readFileSync('scripts/prepare-latin-nature.mjs')),manifest.processing.scriptSha256);
 assert.equal(data.originalClasses.length,21);assert.equal(data.cities.length,16);
 for(const station of manifest.stationNormals.freshlyAuditedStations){assert.equal(station.match,true);assert.equal(station.comparedValues,24);assert.equal(sha(readFileSync('data-source/atlas/latin-nature/'+station.file)),station.sha256);const city=data.cities.find(c=>c.stationId===station.stationId);assert.deepEqual([station.longitude,station.latitude,station.elevationM],[city.longitude,city.latitude,city.elevationM]);}
 for(const city of data.cities){assert.equal(city.temperatureC.length,12);assert.equal(city.precipitationMm.length,12);assert.equal(city.period,'1991–2020');assert.ok(city.precipitationMm.every(v=>v===null||v>=0));}
 const lima=data.cities.find(c=>c.id==='lima');assert.ok(lima.precipitationMm.includes(0));assert.equal(data.noData.value,0);assert.match(data.noData.meaning,/観測値0では/);
});
test('Natural raster uses the same Mercator frame as boundaries; only keeps every context country',()=>{
 const state={layer:'climate',place:'CRI',scope:'central',only:true};
 const html=nature.renderLatinNatureMap(state,'test-climate');
 const [x,y]=geometry.projectLatin([-93,28]),[right,bottom]=geometry.projectLatin([-33,-56]);
 assert.match(html,new RegExp(`x="${x}" y="${y}" width="${right-x}" height="${bottom-y}"`));
 assert.equal((html.match(/data-nature-country=/g)||[]).length,34);
 assert.match(html,/data-nature-context/);assert.match(html,/clip-path="url\(#test-climate-only\)"/);
 assert.match(html,/viewBox="0 0 900 580"/);assert.match(html,/opacity="0.16"/);assert.match(html,/opacity="1"/);
 const w=new Window();w.document.body.innerHTML=html;assert.equal(w.document.querySelectorAll('[data-nature-country][aria-pressed=true]').length,1);void w.happyDOM.close();
 assert.match(html,/viewBox="[^\"]+"/);assert.match(html,/\/insight-journal\/assets\/atlas\/latin-nature-v1/);
 for(const [scope,place] of [['all','all'],['central','CRI'],['south','BRA'],['country','CUB']]){
  const layout=geometry.latinMapLayout(scope,place),rendered=nature.renderLatinNatureMap({layer:'climate',scope,place,only:false});assert.ok(rendered.includes(`transform="${layout.transform}"`));assert.ok(rendered.includes(`data-nature-frame="${layout.frame.join(' ')}"`));
  const [x,y,w,h]=layout.frame;assert.ok(layout.k>0);assert.ok(Math.abs((x+w/2)*layout.k+layout.tx-450)<1e-9);assert.ok(Math.abs((y+h/2)*layout.k+layout.ty-290)<1e-9);
 }
});
test('Agriculture and population source selections, fallback and nature case survive comparison/return',()=>{
 for(const layer of ['bana','coff','soyb','cattle']){
  const original={field:'agriculture',layer,place:'CRI',scope:'central',only:true,fallback:true};
  const compared=codec.latinComparisonState(original,'nature','climate');
  const round=codec.readLatinLearningState(codec.writeLatinLearningState(compared),'nature',['climate'],'climate');
  assert.deepEqual(round.source,compared.source);const restored=new URL(codec.latinSourceReturnUrl('/atlas/latin-america/',round),'https://example.test');assert.equal(restored.searchParams.get('layer'),layer);assert.equal(restored.searchParams.get('only'),'1');assert.equal(restored.searchParams.get('fallback'),'1');
 }
 const original={field:'nature',layer:'climate',place:'BRA',scope:'south',only:false,fallback:false,case:'amazon'};
 const compared=codec.latinComparisonState(original,'population','population');
 const round=codec.readLatinLearningState(codec.writeLatinLearningState(compared),'population',['density','population'],'density');
 const returned=new URL(codec.latinSourceReturnUrl('/atlas/latin-america/',round),'https://example.test');assert.equal(returned.searchParams.get('case'),'amazon');assert.equal(returned.searchParams.get('place'),'BRA');
});
test('South, central and Caribbean causes have official sources; highland stations are not city averages',()=>{
 for(const place of ['BRA','CRI','CUB','PAN','BOL']){const c=nature.latinNatureCases.find(c=>c.place===place);assert.ok(c);assert.ok(c.takeaway.length>30);assert.ok(c.sources.every(s=>new URL(s.url).protocol==='https:'));}
 const chart=nature.renderLatinNatureNormals('san-jose');assert.match(chart,/908m/);assert.match(chart,/観測所1点/);assert.match(chart,/1991–2020/);assert.match(chart,/月平均気温/);assert.match(chart,/降水量/);
 assert.match(chart,/<g font-size="24"/);assert.match(chart,/x="42" y="44" text-anchor="end"/);assert.match(chart,/左：降水量/);assert.match(chart,/右：月平均気温/);
 const water=nature.renderLatinNatureNormals('');assert.match(water,/雨 → 貯水/);assert.equal(/polyline/.test(water),false);
 assert.equal(nature.natureScopeForPlace('BRA','central'),'south');assert.equal(nature.natureScopeForPlace('CRI','south'),'central');assert.equal(nature.natureScopeForPlace('JAM','south'),'central');assert.equal(nature.natureScopeForPlace('BRA','all'),'all');assert.equal(nature.natureScopeForPlace('all','country'),'all');
});
test('Comparison introductions match the original crop or population quantity and its country',()=>{
 const banana=nature.natureComparisonReading({field:'agriculture',layer:'bana',place:'CRI'});assert.match(banana.title,/コスタリカ.*バナナ/);assert.match(banana.takeaway,/低地.*バナナ/);assert.doesNotMatch(banana.takeaway,/コーヒー/);
 const coffee=nature.natureComparisonReading({field:'agriculture',layer:'coff',place:'HND'});assert.match(coffee.title,/ホンジュラス.*コーヒー/);assert.match(coffee.takeaway,/高地/);assert.doesNotMatch(coffee.takeaway,/コスタリカ/);
 const density=nature.natureComparisonReading({field:'population',layer:'density',place:'BRA'});assert.match(density.title,/ブラジル.*人口密度/);assert.match(density.takeaway,/水供給.*交通/);assert.doesNotMatch(density.takeaway,/大豆/);
 const population=nature.natureComparisonReading({field:'population',layer:'population',place:'GTM'});assert.match(population.title,/グアテマラ.*人口規模/);assert.match(population.takeaway,/人口規模/);
});

test('All 16 retained stations expose their own values, geographic reading and comparison return',async()=>{
 const w=new Window();
 try{for(const city of data.cities){
  const selected=nature.natureCityCase(city.id);assert.equal(selected.place,city.countryCode);assert.equal(selected.city,city.id);
  assert.equal(nature.natureCaseForPlace(city.countryCode,selected.id).city,city.id);
  assert.equal(nature.natureScopeForPlace(city.countryCode,'all'),'all');
  w.document.body.innerHTML=nature.renderLatinNatureNormals(city.id);
  const section=w.document.querySelector('[data-nature-city-id]');assert.equal(section.dataset.natureCityId,city.id);
  assert.equal(section.firstElementChild.textContent,city.name+'の雨温図');assert.equal(section.children[1].tagName.toLowerCase(),'svg');
  assert.equal(section.children[2].getAttribute('data-nature-city-climate'),'');assert.equal(section.children[3].getAttribute('data-nature-city-reason'),'');assert.equal(section.children[4].getAttribute('data-nature-city-agriculture'),'');assert.ok(section.children[4].textContent.length>30);
  assert.ok(section.children[2].textContent.length>25);assert.ok(section.children[3].textContent.length>30);
  const rows=[...section.querySelectorAll('tbody tr')];assert.equal(rows.length,12);
  rows.forEach((row,i)=>assert.deepEqual([...row.querySelectorAll('td')].map(cell=>cell.textContent),[city.temperatureC[i],city.precipitationMm[i]].map(v=>v===null?'欠測':String(v))));
  assert.equal(section.querySelector('details a').href,city.sourceUrl);assert.equal(selected.sources[0].url,city.sourceUrl);
  assert.ok(selected.sources.every(source=>new URL(source.url).protocol==='https:'));
  const original={field:'nature',layer:'climate',place:city.countryCode,scope:'all',only:false,fallback:false,case:selected.id};
  const compared=codec.latinComparisonState(original,'agriculture','all');
  const round=codec.readLatinLearningState(codec.writeLatinLearningState(compared),'agriculture',['all'],'all');
  const returned=new URL(codec.latinSourceReturnUrl('/atlas/latin-america/',round),'https://example.test');
  assert.equal(returned.searchParams.get('case'),selected.id);assert.equal(returned.searchParams.get('place'),city.countryCode);assert.equal(returned.searchParams.get('scope'),'all');
 }}finally{await w.happyDOM.close();}
});

test('New station countries use actual local observations and old cases remain compatible',()=>{
 for(const [country,city] of [['JAM','kingston'],['BLZ','belize'],['PER','lima'],['COL','bogota'],['CHL','santiago'],['ECU','quito-izobamba'],['URY','montevideo']])assert.equal(nature.natureCaseForPlace(country).city,city);
 assert.equal(nature.natureCaseForPlace('CHL','station-lima').city,'santiago');
 assert.equal(nature.natureCaseForPlace('CHL','station-punta-arenas').city,'punta-arenas');
 for(const previous of nature.latinNatureCases)assert.equal(nature.natureCaseForPlace(previous.place,previous.id).id,previous.id);
 assert.equal(nature.natureCaseForPlace('all').id,'overview');assert.equal(nature.natureCityCase('unknown'),undefined);
 const missing=nature.renderLatinNatureNormals('unknown');assert.match(missing,/未収録/);assert.doesNotMatch(missing,/<svg|polyline|<rect/);
 const page=readFileSync('src/components/atlas/LatinNaturePage.astro','utf8');assert.doesNotMatch(page,/data-nature-city[\s>]|latin-nature-city-control/);assert.match(page,/latinNatureData.cities.map/);
});


test('Station classifications use the retained 24 normals and disclose the map distinction',()=>{
 const expected=['Aw','Aw','Am','Aw','Am','Aw','Cfa','Am','BWh','Cfb','Cfa','Csb','ET','Cfb','Cfc','Cfa'];
 data.cities.forEach((city,i)=>{assert.equal(stationClimate.classifyLatinStation(city.temperatureC,city.precipitationMm),expected[i]);const chart=nature.renderLatinNatureNormals(city.id);assert.ok(chart.includes('（'+expected[i]+'）'));assert.match(chart,/当サイトが判定/);assert.match(chart,/観測所の区分と異なる場合/);});
 const all=value=>Array(12).fill(value);
 assert.equal(stationClimate.classifyLatinStation(all(10),all(100)),'ET');assert.equal(stationClimate.classifyLatinStation(all(0),all(100)),'EF');
 assert.equal(stationClimate.classifyLatinStation(all(18),all(60)),'Af');
 assert.equal(stationClimate.classifyLatinStation(all(28),all(0)),'BWh','Aridity has priority over tropical temperature');
 assert.equal(stationClimate.classifyLatinStation([null,...all(20).slice(1)],all(100)),undefined);
 assert.equal(stationClimate.classifyLatinStation(all(20),[-1,...all(100).slice(1)]),undefined);
});
test('All stations use exact fitted coordinates; labels adapt and source maps have no actions',async()=>{
 const w=new Window();try{
  const layout=geometry.latinMapLayout('all','all');
  for(const cityScale of [1,1.7,2.5]){
   w.document.body.innerHTML=nature.renderLatinNatureMap({layer:'climate',place:'all',scope:'all',only:false,cityScale,interactiveCities:true});
   const markers=[...w.document.querySelectorAll('[data-nature-city-point]')];assert.equal(markers.length,16);assert.equal(w.document.querySelectorAll('[data-nature-country][aria-pressed=true]').length,0);
   for(const [i,node]of markers.entries()){const city=data.cities[i],[x,y]=geometry.projectLatin([city.longitude,city.latitude]);assert.ok(Math.abs(Number(node.dataset.natureCityX)-(x*layout.k+layout.tx))<1e-8);assert.ok(Math.abs(Number(node.dataset.natureCityY)-(y*layout.k+layout.ty))<1e-8);assert.equal(node.getAttribute('tabindex'),'0');assert.match(node.getAttribute('aria-label'),/雨温図/);assert.equal(node.querySelector('title'),null);}
   assert.equal(w.document.querySelectorAll('.is-major').length,cityScale===1?8:cityScale===1.7?6:4);
  }
  w.document.body.innerHTML=nature.renderLatinNatureMap({layer:'climate',place:'all',scope:'all',only:false,interactiveCities:false});assert.equal(w.document.querySelectorAll('[data-nature-city-point][role=button]').length,0);
 }finally{await w.happyDOM.close();}
});
