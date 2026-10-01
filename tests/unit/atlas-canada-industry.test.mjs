import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {transform} from 'esbuild';

const sourceRoot='data-source/atlas/canada/industry',assetRoot='public/assets/atlas/canada-industry-v1';
const data=JSON.parse(await readFile('src/data/atlas/canada/industry.json','utf8'));
const geometry=JSON.parse(await readFile('src/data/atlas/canada/industry-geometry.json','utf8'));
const manifest=JSON.parse(await readFile(`${assetRoot}/manifest.json`,'utf8'));
const lib=await import(`data:text/javascript;base64,${Buffer.from((await transform(await readFile('src/lib/atlas-canada-industry.ts','utf8'),{loader:'ts',format:'esm'})).code).toString('base64')}`);
const hash=b=>createHash('sha256').update(b).digest('hex');
const parse=line=>{const cells=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){cells.push(value);value='';}else value+=c;}cells.push(value);return cells;};

test('Industry preserves all 156 official current-price shares and original vectors, decimals and flags',async()=>{
 const lines=(await readFile(`${sourceRoot}/industry-selected.csv`,'utf8')).trim().split(/\r?\n/),headers=parse(lines.shift());
 const records=lines.map(l=>Object.fromEntries(parse(l).map((v,i)=>[headers[i],v])));
 assert.deepEqual(data.years,[2023,2024,2025]);assert.equal(data.provinces.length,13);assert.equal(data.data.length,39);assert.equal(records.length,156);
 assert.equal(new Set(records.map(r=>`${r.REF_DATE}|${r.GEO}|${r['North American Industry Classification System (NAICS)']}`)).size,156);
 assert.deepEqual(new Set(data.metrics.map(m=>m.source)),new Set(['All industries [T001]','Mining, quarrying, and oil and gas extraction [21]','Manufacturing [31-33]','Services-producing industries [T003]']));
 for(const raw of records){const m=data.metrics.find(m=>m.source===raw['North American Industry Classification System (NAICS)']);assert.ok(m);const r=data.data.find(r=>String(r.year)===raw.REF_DATE&&r.id===raw.GEO),p=data.provinces.find(p=>p.id===raw.GEO);assert.ok(r&&p);assert.equal(raw.DGUID,`2021A0002${p.code}`);assert.equal(raw.UOM,'Percentage share');assert.equal(raw.SCALAR_FACTOR,'units');assert.equal(raw.DECIMALS,'2');assert.notEqual(raw.VALUE,'');const v=r.values[m.id];assert.equal(v.value,Number(raw.VALUE));assert.equal(v.status,raw.STATUS);assert.equal(v.symbol,raw.SYMBOL);assert.equal(v.vector,raw.VECTOR);assert.equal(v.decimals,2);assert.equal(v.status,'');assert.equal(v.symbol,'');assert.ok(v.value>=0&&v.value<=100);if(m.id==='all')assert.equal(v.value,100);}
 for(const year of data.years)assert.equal(records.filter(r=>r.REF_DATE===String(year)).length,52);
 const values=id=>data.data.find(r=>r.year===2025&&r.id===id).values;
 assert.deepEqual(['mining','manufacturing','services'].map(m=>values('Alberta')[m].value),[24.08,6.67,58.33]);
 assert.deepEqual(['mining','manufacturing','services'].map(m=>values('Ontario')[m].value),[1.31,9.04,79.79]);
 assert.deepEqual(['mining','manufacturing','services'].map(m=>values('Nunavut')[m].value),[46.90,.30,41.53]);
 assert.notEqual(values('Alberta').mining.value+values('Alberta').manufacturing.value+values('Alberta').services.value,100);
});

test('Official table definition, raw metadata, selected extract and boundary licence match the SHA256 ledger',async()=>{
 const selected=await readFile(`${assetRoot}/industry-selected.csv`);assert.equal(hash(selected),manifest.selectedCsvSha256);assert.deepEqual(selected,await readFile(`${sourceRoot}/industry-selected.csv`));
 const meta=await readFile(`${sourceRoot}/36100400-metadata.csv`),metadataArtifact=manifest.statistics.artifacts.find(a=>a.file.endsWith('_MetaData.csv'));assert.equal(hash(meta),metadataArtifact.sha256);assert.equal(meta.length,metadataArtifact.bytes);assert.equal(hash(meta),'2f2838819dacfaef973c6d2a7786a1a7fd64c11bf0ccf600b3420fd4674197fc');
 assert.match(meta.toString('utf8'),/1,"Current price weights represent the gross domestic product \(GDP\) share of each industry of the provincial\/territorial total economy/);assert.match(meta.toString('utf8'),/2022 version 1\.0/);
 assert.equal(manifest.statistics.table,'36-10-0400-01');assert.equal(manifest.statistics.releaseDate,'2026-05-01');assert.equal(manifest.accessed,'2026-09-30');assert.equal(manifest.statistics.uom,'Percentage share');assert.equal(manifest.values,156);assert.equal(manifest.missing,0);
 assert.equal(manifest.statistics.artifacts.find(a=>a.file==='gdp-share.zip').sha256,'be6796c83f33297e680c80dcb1d43ec61eb842af061d59924707bc920bb2ecc6');
 assert.equal(manifest.statistics.artifacts.find(a=>a.file==='gdp-share/36100400.csv').sha256,'b789332f97a0eaa95d7f26738cfa11fd38616f810aecb526a55520e2267cb620');
 const licenceBytes=await readFile(`${sourceRoot}/boundary-license.json`),licence=JSON.parse(licenceBytes).result;assert.equal(hash(licenceBytes),manifest.boundaries.licenseMetadataArtifact.sha256);assert.equal(licence.id,'ef70dc3b-1069-4037-9bce-61f47e628a1d');assert.equal(licence.license_title,'Open Government Licence - Canada');assert.ok(licence.resources.some(r=>r.url==='https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer'));
 const requestBytes=await readFile(`${sourceRoot}/boundary-request.json`),request=JSON.parse(requestBytes);assert.equal(hash(requestBytes),manifest.boundaries.metadataArtifact.sha256);assert.equal(request.status,200);const url=new URL(request.url);assert.equal(url.hostname,'geo.statcan.gc.ca');assert.equal(url.searchParams.get('outSR'),'4326');assert.equal(url.searchParams.get('f'),'geojson');assert.equal(manifest.boundaries.referenceDate,'2021-01-01');
});

test('All 13 displayed province paths derive from official rings; only subpixel display rings are omitted and no area is estimated',async()=>{
 const original=gunzipSync(await readFile(`${sourceRoot}/province-boundaries-2021.geojson.gz`)),source=JSON.parse(original);assert.equal(hash(original),manifest.boundarySourceSha256);assert.equal(hash(original),'28966276a200b7c88f97cc4d1e770588e161e2fe63aa85ca9b736015aaeddd57');assert.equal(hash(await readFile('src/data/atlas/canada/industry-geometry.json')),manifest.geometrySha256);
 assert.equal(source.features.length,13);assert.equal(geometry.features.length,13);assert.equal(geometry.crs,'EPSG:4326');assert.deepEqual(new Set(geometry.features.map(f=>f.code)),new Set(['10','11','12','13','24','35','46','47','48','59','60','61','62']));
 const project=([lon,lat])=>[(lon+145)/95*900,(85-lat)/45*580];let points=0,ringsTotal=0,omitted=0,displayPoints=0;
 for(const f of source.features){const g=geometry.features.find(g=>g.code===f.properties.PRUID),p=data.provinces.find(p=>p.code===f.properties.PRUID);assert.ok(g&&p);assert.equal(g.id,f.properties.PRENAME);assert.equal(g.id,p.id);assert.equal(g.sourceDguid,f.properties.DGUID);const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat(),sourcePoints=new Set();let retained=0,xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
  for(const ring of rings){ringsTotal++;points+=ring.length;assert.deepEqual(ring[0],ring.at(-1));let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(const pair of ring){assert.ok(Number.isFinite(pair[0])&&Number.isFinite(pair[1]));const [x,y]=project(pair);sourcePoints.add(`${x.toFixed(2)},${y.toFixed(2)}`);xmin=Math.min(xmin,x);ymin=Math.min(ymin,y);xmax=Math.max(xmax,x);ymax=Math.max(ymax,y);a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,x);d=Math.max(d,y);}if(Math.hypot(c-a,d-b)<.5)omitted++;else retained++;}
  assert.equal(g.ringCount,rings.length);assert.equal(g.displayRings,retained);assert.deepEqual(g.bounds,[xmin,ymin,xmax,ymax]);assert.equal((g.path.match(/Z/g)??[]).length,retained);assert.equal((g.path.match(/M/g)??[]).length,retained);assert.ok(!/NaN|Infinity/.test(g.path));
  for(const token of g.path.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)){displayPoints++;assert.ok(sourcePoints.has(`${Number(token[1]).toFixed(2)},${Number(token[2]).toFixed(2)}`),'display vertices must be selected original vertices');}
  for(const segment of g.path.split('Z').filter(Boolean)){const coordinates=[...segment.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[2])]);assert.ok(coordinates.length>=4);assert.deepEqual(coordinates[0],coordinates.at(-1));}
 }
 assert.equal(points,729270);assert.equal(points,manifest.generalization.originalPoints);assert.equal(ringsTotal,manifest.generalization.ringCount);assert.equal(omitted,manifest.generalization.omittedSubpixelRings);assert.equal(displayPoints,manifest.generalization.displayPoints);assert.equal(manifest.generalization.displayTolerancePixels,.25);assert.match(manifest.generalization.method,/no area calculation/);assert.match(manifest.generalization.method,/not facilities/);assert.ok(!Object.keys(geometry.features[0]).some(k=>/area|density|production/i.test(k)));
});

test('Industry state validates years and industry scope, keeps unrelated page queries but whitelists local return parameters',()=>{
 const ids=data.provinces.map(p=>p.id),source=new URL('https://example.com/insight-journal/atlas/north-america/canada/industry/?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1&keep=yes&next=https://evil.example/');const state=lib.readCanadaIndustryState(source,data.years,ids);
 assert.deepEqual(state,{year:2023,province:'Ontario',compare:'Quebec',metric:'manufacturing',only:true,zoom:true});const saved=lib.writeCanadaIndustryState(source,state);assert.equal(saved.searchParams.get('keep'),'yes');assert.deepEqual(lib.readCanadaIndustryState(saved,data.years,ids),state);
 const target=lib.canadaIndustryComparisonUrl(source,new URL('https://example.com/insight-journal/atlas/north-america/canada/nature/?city=ottawa&view=water&water=St.+Lawrence&only=1'),state),back=new URLSearchParams(target.searchParams.get('industryReturn'));assert.equal(target.origin,source.origin);assert.equal(target.searchParams.get('city'),'ottawa');assert.equal(target.searchParams.get('water'),'St. Lawrence');assert.deepEqual([...back.keys()],['year','province','metric','compare','only','zoom']);assert.equal(back.get('compare'),'Quebec');assert.equal(back.has('keep'),false);assert.equal(back.has('next'),false);assert.equal(back.has('city'),false);
 assert.deepEqual(lib.readCanadaIndustryState(new URL('https://example.com/?year=2029&province=unknown&compare=Alberta&metric=all&only=true&zoom=country'),data.years,ids),{year:2025,province:'Alberta',compare:null,metric:'mining',only:false,zoom:false});assert.equal(lib.readCanadaIndustryState(new URL('https://example.com/?province=Ontario&compare=Ontario'),data.years,ids).compare,null);assert.equal(lib.readCanadaIndustryState(new URL('https://example.com/?metric=211&compare=unknown'),data.years,ids).metric,'mining');assert.equal(lib.formatCanadaIndustryValue(0),'0.00');assert.equal(lib.formatCanadaIndustryValue(null),'欠損');assert.notEqual(lib.industryShareColor(null),lib.industryShareColor(0));
});
