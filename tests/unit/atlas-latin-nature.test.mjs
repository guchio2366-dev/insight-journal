import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';

registerHooks({
 resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&context.parentURL&&!/\.[a-z]+$/i.test(specifier)){const resolved=new URL(specifier+'.ts',context.parentURL);if(existsSync(fileURLToPath(resolved)))return {url:resolved.href,shortCircuit:true};}return nextResolve(specifier,context);},
 load(url,context,nextLoad){if(url.startsWith('file:')&&url.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(fileURLToPath(url),'utf8'),shortCircuit:true};if(url.startsWith('file:')&&url.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(fileURLToPath(url),'utf8')),shortCircuit:true};return nextLoad(url,context);},
});
const nature=await import('../../src/lib/atlas-latin-nature.ts');
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
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
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
 const water=nature.renderLatinNatureNormals('');assert.match(water,/雨 → 貯水/);assert.equal(/polyline/.test(water),false);
 assert.equal(nature.natureScopeForPlace('BRA','central'),'south');assert.equal(nature.natureScopeForPlace('CRI','south'),'central');assert.equal(nature.natureScopeForPlace('JAM','south'),'central');assert.equal(nature.natureScopeForPlace('BRA','all'),'all');assert.equal(nature.natureScopeForPlace('all','country'),'all');
});
