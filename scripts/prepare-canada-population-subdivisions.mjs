/** Prepare source-joined CSD densities; counts are never spatially allocated. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {readZipEntries,parseDbf,readShapeRecords,inverseCanadaLambert,shapefilePolygonGroups,simplifyPolygonTopology} from './lib/canada-geography.mjs';
const source=path.resolve(process.argv[2]??'data-source/atlas/canada/population-subdivisions');
const csvZip=await readFile(path.join(source,'98100002-eng.zip')),boundaryZip=await readFile(path.join(source,'lcsd000b21a_e.zip'));
const table=readZipEntries(csvZip),boundary=readZipEntries(boundaryZip),entry=(zip,extension)=>[...zip].find(([name])=>name.endsWith(extension))?.[1];
function parseCsv(text){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))rows.push(row);row=[];value='';}else value+=c;}if(value||row.length){row.push(value);rows.push(row);}rows[0][0]=rows[0][0].replace(/^\uFEFF/,'');return rows;}
const rows=parseCsv(entry(table,'.csv').toString('utf8')),headers=rows.shift(),dguidIndex=headers.indexOf('DGUID'),nameIndex=headers.indexOf('GEO'),valueIndex=headers.indexOf('VALUE'),counts=new Map();
const numeric=(value,symbol='')=>({value:value===''||value===undefined?null:Number(value),symbol});
for(const row of rows){const dguid=row[dguidIndex];if(!/^2021A0005\d{7}$/.test(dguid??''))continue;const id=dguid.slice(-7),record=counts.get(id)??{id,dguid,name:row[nameIndex]};
 if(valueIndex>=0){const label=row[headers.findIndex(h=>h.startsWith('Population and dwelling counts'))],cell=numeric(row[valueIndex],row[headers.indexOf('STATUS')]);if(/^Population, 2021/.test(label))record.population=cell;if(/^Population density per square kilometre, 2021/.test(label))record.density=cell;if(/^Land area in square kilometres, 2021/.test(label))record.landArea=cell;}
 else {const read=label=>{const index=headers.findIndex(h=>h.includes(label));if(index<0)throw Error('Missing '+label);return numeric(row[index],row[index+1]);};record.population=read('Population, 2021');record.density=read('Population density per square kilometre, 2021');record.landArea=read('Land area in square kilometres, 2021');}
 counts.set(id,record);
}
const records=[...counts.values()];if(records.length!==5161||records.some(r=>!r.population||!r.density||!r.landArea))throw Error('Expected 5,161 source-complete CSD records; received '+records.length);
const dbf=parseDbf(entry(boundary,'.dbf')),shapes=readShapeRecords(entry(boundary,'.shp')),projection=entry(boundary,'.prj').toString(),licence=entry(boundary,'.xml')?.toString()??'';
if(!projection.includes('Statistics_Canada_Lambert')||!licence.includes('Open Government Licence'))throw Error('Unverified source CRS/licence');
const features=[],topology={sourceContacts:0,originalFallbacks:0,rings:0,sourceVertices:0,displayVertices:0};
for(let index=0;index<dbf.length;index++){
 const id=dbf[index].CSDUID,record=counts.get(id);if(!record)throw Error('Unjoined original CSD '+id);
 const native=shapes[index].rings,polygons=shapefilePolygonGroups(native),coordinates=[];
 for(const indexes of polygons){const rings=indexes.map(i=>native[i]),selected=simplifyPolygonTopology(rings,250,{retryTolerances:[100,25],transform:p=>inverseCanadaLambert(p).map(n=>Number(n.toFixed(7))),transformOriginal:p=>inverseCanadaLambert(p).map(n=>Number(n.toFixed(9)))});
  if(!selected.output.valid&&!selected.sourceContactsPreserved)throw Error('Unresolved source/display topology '+id+' '+JSON.stringify(selected.output.counts));
  topology.sourceContacts+=selected.sourceContactsPreserved?1:0;topology.originalFallbacks+=selected.fallback?1:0;topology.rings+=rings.length;topology.sourceVertices+=rings.reduce((n,r)=>n+r.length,0);topology.displayVertices+=selected.outputRings.reduce((n,r)=>n+r.length,0);coordinates.push(selected.outputRings);
 }
 features.push({type:'Feature',id,properties:{name:record.name},geometry:{type:'MultiPolygon',coordinates}});
 if(index%500===0)console.log('Canada population source-boundary joins '+index+'/'+dbf.length);
}
if(features.length!==5161||new Set(features.map(f=>f.id)).size!==5161)throw Error('Incomplete original CSD boundary join');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={'subdivisions.json':JSON.stringify({year:2021,geography:'Census subdivision',records})+'\n','subdivisions.geojson':JSON.stringify({type:'FeatureCollection',features})+'\n'};
const manifest={year:2021,retrievedAt:new Date().toISOString().slice(0,10),geography:'2021 Census subdivision (CSD)',sourceCount:5161,sourceTable:'98-10-0002-01',sourceUrls:['https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip','https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000b21a_e.zip'],sourceSha256:{tableZip:hash(csvZip),boundaryZip:hash(boundaryZip)},licence:'https://www.statcan.gc.ca/en/terms-conditions/open-licence',method:'Exact DGUID/CSDUID join. Population and density are original 2021 CSD values. No geographic allocation or interpolation. Display boundaries retain multipart/hole structure and use 250 m simplification with 100/25 m retries; invalid candidates retain original vertices. Per-polygon topology checked before and after EPSG:3347 to EPSG:4326 conversion. Cross-CSD topology is not claimed.',topology,outputs:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:hash(text)}]))};
files['subdivisions-manifest.json']=JSON.stringify(manifest,null,2)+'\n';await mkdir(path.join(source,'prepared'),{recursive:true});
for(const [file,text]of Object.entries(files)){await writeFile(path.join(source,'prepared',file),text);const encoded=gzipSync(text,{mtime:0}).toString('base64');for(let offset=0;offset<encoded.length;offset+=120000)console.log('CANADA_REVIEW_SOURCE '+JSON.stringify({file:'population/prepared/'+file,part:offset/120000,parts:Math.ceil(encoded.length/120000),gzipBase64:encoded.slice(offset,offset+120000)}));}
