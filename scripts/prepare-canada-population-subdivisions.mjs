/** Prepare source-joined CSD densities; counts are never spatially allocated. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {readZipEntries,inverseCanadaLambert,signedRingArea,pointInRings,simplifyPolygonTopology,validatePolygonTopology} from './lib/canada-geography.mjs';
const source=path.resolve(process.argv[2]??'data-source/atlas/canada/population-subdivisions');
const csvZip=await readFile(path.join(source,'98100002-eng.zip')),boundaryBytes=await readFile(path.join(source,'subdivisions-official.json'));
const officialGeometry=JSON.parse(boundaryBytes);
const table=readZipEntries(csvZip),entry=(zip,extension)=>[...zip].find(([name])=>name.endsWith(extension))?.[1];
function parseCsv(text){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))rows.push(row);row=[];value='';}else value+=c;}if(value||row.length){row.push(value);rows.push(row);}rows[0][0]=rows[0][0].replace(/^\uFEFF/,'');return rows;}
const rows=parseCsv(entry(table,'.csv').toString('utf8')),headers=rows.shift(),dguidIndex=headers.indexOf('DGUID'),nameIndex=headers.indexOf('GEO'),valueIndex=headers.indexOf('VALUE'),counts=new Map();
const numeric=(value,symbol='')=>({value:value===''||value===undefined?null:Number(value),symbol});
for(const row of rows){const dguid=row[dguidIndex];if(!/^2021A0005\d{7}$/.test(dguid??''))continue;const id=dguid.slice(-7),record=counts.get(id)??{id,dguid,name:row[nameIndex]};
 if(valueIndex>=0){const label=row[headers.findIndex(h=>h.startsWith('Population and dwelling counts'))],cell=numeric(row[valueIndex],row[headers.indexOf('STATUS')]);if(/^Population, 2021/.test(label))record.population=cell;if(/^Population density per square kilometre, 2021/.test(label))record.density=cell;if(/^Land area in square kilometres, 2021/.test(label))record.landArea=cell;}
 else {const read=label=>{const index=headers.findIndex(h=>h.includes(label));if(index<0)throw Error('Missing '+label);return numeric(row[index],row[index+1]);};record.population=read('Population, 2021');record.density=read('Population density per square kilometre, 2021');record.landArea=read('Land area in square kilometres, 2021');}
 counts.set(id,record);
}
const records=[...counts.values()];if(records.length!==5161||records.some(r=>!r.population||!r.density||!r.landArea))throw Error('Expected 5,161 source-complete CSD records; received '+records.length);
if(officialGeometry.spatialReference?.wkid!==3347||officialGeometry.exceededTransferLimit||officialGeometry.features?.length!==5161)throw Error('Incomplete official boundary response');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),sourceCorrections=[],diagnostics=[];
function polygonGroups(rings){
 const outers=rings.map((ring,index)=>({ring,index,area:signedRingArea(ring)})).filter(r=>r.area<0);
 if(!outers.length)throw Error('No original outer ring');
 const groups=outers.map(r=>[r.index]);
 for(let i=0;i<rings.length;i++)if(signedRingArea(rings[i])>0){
  // A hole can touch an outer ring at its first vertex. Use another original
  // vertex for containment, without moving or manufacturing a coordinate.
  const candidates=outers.filter(r=>rings[i].some(p=>pointInRings(p,[r.ring]))).sort((a,b)=>Math.abs(a.area)-Math.abs(b.area));
  if(!candidates.length)throw Error('Uncontained original interior ring');
  groups[outers.indexOf(candidates[0])].push(i);
 }
 return groups;
}
const transform=p=>inverseCanadaLambert(p).map(v=>Math.round(v*1e7)/1e7);
async function originalFeature(id){
 const url='https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer/9/query?'+new URLSearchParams({where:`CSDUID='${id}'`,outFields:'CSDUID,CSDNAME,PRUID',returnGeometry:'true',outSR:'3347',f:'json'});
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('Original CSD '+id+' HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer()),parsed=JSON.parse(bytes);if(parsed.features?.length!==1||parsed.features[0].attributes.CSDUID!==id)throw Error('Original CSD mismatch '+id);
 await writeFile(path.join(source,'csd-original-'+id+'.json'),bytes);sourceCorrections.push({id,url,sha256:hash(bytes),bytes:bytes.length});return parsed.features[0];
}
const features=[];
for(let f of officialGeometry.features){
 const id=String(f.attributes.CSDUID),rings=f.geometry?.rings;
 if(!counts.has(id)||!Array.isArray(rings)||!rings.length)throw Error('Unjoined/invalid official CSD '+id);
 let groups;try{groups=polygonGroups(rings);if(groups.some(g=>{const report=validatePolygonTopology(g.map(i=>rings[i]));return Object.keys(report.counts).some(k=>k!=='self-touch');}))throw Error('Generalized source topology');}
 catch{f=await originalFeature(id);groups=polygonGroups(f.geometry.rings);}
 const chosen=groups.map(indices=>simplifyPolygonTopology(indices.map(index=>f.geometry.rings[index]),250,{retryTolerances:[100,25],transform,transformOriginal:p=>inverseCanadaLambert(p)}));
 const coordinates=chosen.map(choice=>choice.outputRings);diagnostics.push({id,polygons:chosen.length,sourceVertices:f.geometry.rings.reduce((n,r)=>n+r.length,0),displayVertices:coordinates.flat().reduce((n,r)=>n+r.length,0),nativeFallbackPolygons:chosen.filter(c=>c.fallback).length,sourceIssues:chosen.flatMap(c=>Object.keys(c.source.counts)),displayIssues:chosen.flatMap(c=>Object.keys(c.output.counts))});
 features.push({type:'Feature',id,properties:{name:counts.get(id).name},geometry:coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates}});
}
const topology={generalization:'Official digital CSD boundaries in EPSG:3347. Source service generalization is 250 m with original-geometry fallback. Display uses existing topology-aware 250/100/25 m source-vertex simplification or all original vertices. Source contacts are recorded rather than repaired.',diagnostics,sourceCorrections};
if(features.length!==5161||new Set(features.map(f=>f.id)).size!==5161)throw Error('Incomplete original CSD boundary join');
const files={'subdivisions.json':JSON.stringify({year:2021,geography:'Census subdivision',records})+'\n','subdivisions.geojson':JSON.stringify({type:'FeatureCollection',features})+'\n'};
const acquisition=JSON.parse(await readFile(path.join(source,'../acquisition.json'),'utf8'));
const manifest={year:2021,retrievedAt:new Date().toISOString().slice(0,10),geography:'2021 Census subdivision (CSD)',sourceCount:5161,sourceTable:'98-10-0002-01',sourceUrls:['https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip','https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer/9'],sourceSha256:{tableZip:hash(csvZip),combinedBoundaryResponse:hash(boundaryBytes)},boundaryPages:acquisition.filter(r=>r.features),licence:'https://www.statcan.gc.ca/en/terms-conditions/open-licence',method:'Exact DGUID/CSDUID join. Population and density are original 2021 CSD values. No geographic allocation or interpolation. Display geometry is the official StatCan 2021 digital boundary (including administrative water extent); published density uses original land area, never polygon-derived area. Display borders are generalized with topology-aware source-vertex selection and original fallback. Generalization affects borders only; original table density is unchanged.',topology,outputs:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:hash(text)}]))};
files['subdivisions-manifest.json']=JSON.stringify(manifest,null,2)+'\n';await mkdir(path.join(source,'prepared'),{recursive:true});
const logSources=new Set((process.env.CANADA_REVIEW_LOG_SOURCES??'population/prepared/subdivisions.json,population/prepared/subdivisions.geojson,population/prepared/subdivisions-manifest.json').split(','));
for(const [file,text]of Object.entries(files)){
 await writeFile(path.join(source,'prepared',file),text);const encoded=gzipSync(text,{mtime:0}).toString('base64');
 console.log('CANADA_REVIEW_PREPARED_STATUS '+JSON.stringify({file,bytes:Buffer.byteLength(text),gzipBase64Bytes:encoded.length,sha256:hash(text)}));
 if(logSources.has('population/prepared/'+file))for(let offset=0;offset<encoded.length;offset+=120000)console.log('CANADA_REVIEW_SOURCE '+JSON.stringify({file:'population/prepared/'+file,part:offset/120000,parts:Math.ceil(encoded.length/120000),gzipBase64:encoded.slice(offset,offset+120000)}));
}
