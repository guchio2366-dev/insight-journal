import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';

const raw='data-source/atlas/canada-census-2021';
const assets='public/assets/atlas/canada-census-agriculture-v1';
const data=JSON.parse(await readFile('src/data/atlas/canada/census-agriculture.json','utf8'));
const manifest=JSON.parse(await readFile(`${assets}/manifest.json`,'utf8'));
const geometryBytes=await readFile(`${assets}/ccs.geojson`);
const geometry=JSON.parse(geometryBytes);
const hash=b=>createHash('sha256').update(b).digest('hex');
const productIds=['canola','wheat','beef','pasture','hay'];
const parse=line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));

// Read an original ZIP entry without a system-specific unzip dependency.
function zipEntry(zip,name){
 let end=-1;for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--){if(zip.readUInt32LE(i)===0x06054b50){end=i;break;}}
 assert.ok(end>=0,'original archive has central directory');let p=zip.readUInt32LE(end+16);const count=zip.readUInt16LE(end+10);
 for(let i=0;i<count;i++){assert.equal(zip.readUInt32LE(p),0x02014b50);const method=zip.readUInt16LE(p+10),size=zip.readUInt32LE(p+20),nameLength=zip.readUInt16LE(p+28),extraLength=zip.readUInt16LE(p+30),commentLength=zip.readUInt16LE(p+32),local=zip.readUInt32LE(p+42),entryName=zip.subarray(p+46,p+46+nameLength).toString();
  if(entryName===name){assert.equal(zip.readUInt32LE(local),0x04034b50);const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28),compressed=zip.subarray(start,start+size);assert.ok(method===0||method===8);return method===8?inflateRawSync(compressed):compressed;}
  p+=46+nameLength+extraLength+commentLength;
 }
 throw new Error(`Original ZIP entry missing: ${name}`);
}

test('all published CCS join official geographic polygons exactly and retain the ten uncovered territorial regions',()=>{
 assert.equal(data.year,2021);assert.deepEqual(Object.keys(data.products),productIds);assert.equal(geometry.features.length,1757);assert.equal(Object.keys(data.records).length,1757);
 const ids=new Set();for(const feature of geometry.features){const p=feature.properties;assert.ok(!ids.has(p.DGUID));ids.add(p.DGUID);const region=data.records[p.DGUID];assert.ok(region);assert.equal(region.uid,p.CCSUID);assert.equal(region.name,p.CCSNAME);assert.equal(region.provinceCode,p.PRUID);assert.match(p.CCSUID,/^\d{7}$/);assert.match(p.DGUID,/^2021S0502\d{7}$/);}
 const covered=Object.values(data.records).filter(r=>r.covered),uncovered=Object.values(data.records).filter(r=>!r.covered);assert.equal(covered.length,1747);assert.equal(uncovered.length,10);assert.deepEqual([...new Set(uncovered.map(r=>r.provinceCode))].sort(),['60','61','62']);
 for(const r of uncovered)for(const id of productIds)assert.deepEqual(r.cells[id],{value:null,quality:null,status:'not-covered',components:[]});assert.deepEqual(manifest.statistics.unmatchedPublishedDguids,[]);
 // Agriculture's nine-digit GEO code is not CCSUID; the join uses DGUID.
 assert.equal(data.records['2021S05024810036'].uid,'4810036');assert.equal(data.records['2021S05024810036'].cells.canola.value,118846);
});

test('geometry is the complete byte-identical official WGS84 output, with no new vertices, points or approximation',async()=>{
 assert.equal(geometry.type,'FeatureCollection');assert.deepEqual(geometryBytes,await readFile(`${raw}/ccs-source-4326.geojson`));assert.equal(geometryBytes.length,6615415);assert.equal(hash(geometryBytes),'8af9e387fe7087e3692ce07942b9cff96bd8c229a6bb753f5d4cd20b7af447a9');
 let vertices=0;const bounds=[180,90,-180,-90];function visit(c){if(typeof c[0]==='number'){assert.equal(c.length,2);assert.ok(c.every(Number.isFinite));assert.ok(c[0]>=-180&&c[0]<=180&&c[1]>=-90&&c[1]<=90);vertices++;bounds[0]=Math.min(bounds[0],c[0]);bounds[1]=Math.min(bounds[1],c[1]);bounds[2]=Math.max(bounds[2],c[0]);bounds[3]=Math.max(bounds[3],c[1]);}else c.forEach(visit);}
 for(const f of geometry.features){assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));visit(f.geometry.coordinates);}
 assert.equal(vertices,154854);assert.equal(data.geometry.vertexCount,vertices);assert.deepEqual(data.geometry.bounds,bounds);assert.equal(data.geometry.crs,'EPSG:4326');assert.equal(data.geometry.sourceCrs,'EPSG:3347');assert.equal(data.geometry.sourceGeneralizationMetres,5000);assert.equal(data.geometry.idProperty,'DGUID');assert.equal(data.geometry.url,`/assets/atlas/canada-census-agriculture-v1/ccs.geojson`);
 const zip=await readFile(`${raw}/leca000e21a_e.zip`);assert.equal(hash(zip),data.geometry.archive.sha256);assert.match(zipEntry(zip,'leca000e21a_e.xml').toString(),/Open Government Licence - Canada/);const dbf=zipEntry(zip,'lccs000e21a_e.dbf');assert.equal(dbf.readUInt32LE(4),1757);
});

test('every numeric, F, zero, vector and unit comes from retained exact rows of original official CSV archives',async()=>{
 const allRegions=Object.entries(data.records).filter(([,r])=>r.covered).map(([dguid,r])=>[dguid,r.cells]);allRegions.push(['2021A000011124',Object.fromEntries(productIds.map(id=>[id,data.products[id].national]))]);for(const p of data.provinces)allRegions.push([p.dguid,p.cells]);const rowsByVector=new Map();
 for(const table of manifest.statistics.tables){const zip=await readFile(`${raw}/${table.archive.file}`);assert.equal(hash(zip),table.archive.sha256);const original=zipEntry(zip,`${table.id}.csv`);assert.equal(hash(original),table.csv.sha256);const originalLines=new Set(original.toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/));const selected=await readFile(`${raw}/${table.selected.file}`);assert.equal(hash(selected),table.selected.sha256);const lines=selected.toString().trimEnd().split('\n');const headers=parse(lines.shift());assert.equal(lines.length,table.selected.rows);
  for(const line of lines){assert.ok(originalLines.has(line),'selected row text is retained from the original CSV');const row=Object.fromEntries(parse(line).map((v,i)=>[headers[i],v]));assert.equal(row.REF_DATE,'2021');assert.equal(row.UOM,'Number');assert.equal(row.SCALAR_FACTOR,'units');assert.equal(row['Unit of measure'],table.id==='32100370'?'Number of animals':'Hectares');assert.ok(!rowsByVector.has(row.VECTOR));rowsByVector.set(row.VECTOR,{...row,table:table.id,variable:parse(line)[3]});}
  assert.equal(hash(await readFile(`${raw}/${table.metadata.file}`)),table.metadata.sha256);
 }
 let checked=0;for(const [dguid,cells] of allRegions)for(const id of productIds){const cell=cells[id];assert.equal(cell.components.length,data.products[id].sourceVariables.length);for(const component of cell.components){const row=rowsByVector.get(component.vector);assert.ok(row);assert.equal(row.DGUID,dguid);assert.equal(row.table,data.products[id].sourceTableId);assert.equal(component.variable,row.variable);assert.equal(component.value,row.VALUE===''?null:Number(row.VALUE));assert.equal(component.quality,row.STATUS);assert.equal(component.coordinate,row.COORDINATE);assert.equal(component.unit,row['Unit of measure']);assert.equal(component.symbol,row.SYMBOL);assert.equal(component.decimals,Number(row.DECIMALS));checked++;}}
 assert.equal(checked,rowsByVector.size);assert.equal(checked,12327);
});

test('published zero, quality F and missing geographic coverage remain three distinct states',()=>{
 const expected={canola:[1604,143,1046],wheat:[1356,391,389],beef:[1318,429,164],pasture:[791,956,89],hay:[1157,590,88]};
 for(const id of productIds){const cells=Object.values(data.records).map(r=>r.cells[id]);const [published,f,zero]=expected[id];assert.equal(cells.filter(c=>c.status==='published').length,published);assert.equal(cells.filter(c=>c.status==='quality-f').length,f);assert.equal(cells.filter(c=>c.status==='not-covered').length,10);assert.equal(cells.filter(c=>c.value===0).length,zero);assert.deepEqual(manifest.statistics.counts[id],{published,qualityF:f,notCovered:10,zero});for(const cell of cells){if(cell.status==='published')assert.ok(Number.isFinite(cell.value)&&cell.value>=0);else assert.equal(cell.value,null);for(const c of cell.components){assert.match(c.quality,/^[A-F]$/);if(c.quality==='F')assert.equal(c.value,null);else assert.ok(Number.isFinite(c.value));}}}
});

test('pasture and hay preserve both original grades and refuse a partial total when one component is F',()=>{
 for(const r of Object.values(data.records).filter(r=>r.covered)){for(const id of ['pasture','hay']){const cell=r.cells[id];assert.equal(cell.components.length,2);assert.equal(cell.quality,null,'derived sums have no official grade');const f=cell.components.some(c=>c.quality==='F');assert.equal(cell.status,f?'quality-f':'published');assert.equal(cell.value,f?null:cell.components[0].value+cell.components[1].value);}}
 assert.ok(Object.values(data.records).some(r=>r.cells.pasture.components.some(c=>c.quality==='F')&&r.cells.pasture.components.some(c=>c.value!==null)));assert.ok(Object.values(data.records).some(r=>r.cells.hay.components.some(c=>c.quality==='E')));
 assert.deepEqual(data.products.pasture.sourceVariables,['Tame or seeded pasture','Natural land for pasture']);assert.deepEqual(data.products.hay.sourceVariables,['Alfalfa and alfalfa mixtures','All other tame hay and fodder crops']);
 assert.equal(data.products.hay.displayName,'干草・栽培牧草（アルファルファ＋その他）');assert.equal(data.products.hay.originalTotalHay.value,5394265);assert.equal(data.products.hay.originalTotalHay.comparable,false);assert.match(data.products.hay.definition,/採種用牧草は含めない/);
});

test('government national values come from national source cells and remain separate from annual surveys and regional sums',()=>{
 const expected={canola:9012449,wheat:9413876,beef:3776389,pasture:18559652,hay:5238906};for(const id of productIds){const cell=data.products[id].national;assert.equal(cell.value,expected[id]);assert.equal(cell.status,'published');assert.ok(cell.components.every(c=>c.quality==='A'));assert.equal(data.products[id].releasedAt,'2022-05-11');assert.equal(data.products[id].unit,id==='beef'?'頭':'ha');}
 assert.equal(data.products.beef.national.quality,'A');assert.equal(data.products.pasture.national.quality,null);assert.equal(data.products.hay.national.quality,null);assert.notEqual(Object.values(data.records).reduce((sum,r)=>sum+(r.cells.canola.value??0),0),data.products.canola.national.value);assert.match(data.source.randomTabularAdjustment,/地域値から全国・州の公表値を再計算しない/);assert.match(data.source.geographicMeaning,/本拠地/);assert.match(data.source.geographicMeaning,/所在地を表すものではない/);
});

test('public data and source ledger retain dates, licenses, attribution, extraction and exact output checksums',async()=>{
 const dataBytes=await readFile('src/data/atlas/canada/census-agriculture.json');assert.deepEqual(dataBytes,await readFile(`${assets}/census-agriculture.json`));assert.equal(hash(dataBytes),manifest.output.data.sha256);assert.equal(dataBytes.length,manifest.output.data.bytes);assert.equal(hash(geometryBytes),manifest.output.geometry.sha256);assert.equal(manifest.accessedAt,'2026-10-02');assert.equal(manifest.source.referenceDate,'2021-05-11');assert.equal(manifest.geometry.referenceDate,'2021-01-01');assert.equal(manifest.geometry.releasedAt,'2022-09-27');assert.equal(data.licence.name,'Statistics Canada Open Licence');assert.equal(data.geometry.licence.name,'Open Government Licence - Canada');assert.match(data.attribution,/does not constitute an endorsement/);assert.match(manifest.geometry.method,/No additional simplification/);assert.match(manifest.statistics.dimensionFilter.unitDimension,/Unit of measure/);assert.equal(manifest.statistics.dimensionFilter.uomColumn,'Number');assert.deepEqual(JSON.parse(await readFile(`${raw}/manifest.json`,'utf8')),manifest);
});
