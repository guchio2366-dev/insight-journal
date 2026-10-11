/** Prepare source-joined CSD densities; counts are never spatially allocated. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {readZipEntries,inverseCanadaLambert,shapefilePolygonGroups} from './lib/canada-geography.mjs';
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
const features=officialGeometry.features.map(f=>{
 const id=String(f.attributes.CSDUID),rings=f.geometry?.rings;
 if(!counts.has(id)||!Array.isArray(rings)||!rings.length)throw Error('Unjoined/invalid official CSD '+id);
 const groups=shapefilePolygonGroups(rings),coordinates=groups.map(indices=>indices.map(index=>rings[index].map(point=>inverseCanadaLambert(point).map(value=>Math.round(value*1e7)/1e7))));
 return {type:'Feature',id,properties:{name:counts.get(id).name},geometry:coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates}};
});
const topology={generalization:'Official REST service maxAllowableOffset=1000 metres in EPSG:3347; geometryPrecision=0. Source ring winding/containment preserves original multipart and holes. Coordinates are transformed to EPSG:4326; no client-created boundaries or statistics.'};
if(features.length!==5161||new Set(features.map(f=>f.id)).size!==5161)throw Error('Incomplete original CSD boundary join');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={'subdivisions.json':JSON.stringify({year:2021,geography:'Census subdivision',records})+'\n','subdivisions.geojson':JSON.stringify({type:'FeatureCollection',features})+'\n'};
const manifest={year:2021,retrievedAt:new Date().toISOString().slice(0,10),geography:'2021 Census subdivision (CSD)',sourceCount:5161,sourceTable:'98-10-0002-01',sourceUrls:['https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip','https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/9'],sourceSha256:{tableZip:hash(csvZip),boundaryResponse:hash(boundaryBytes)},licence:'https://www.statcan.gc.ca/en/terms-conditions/open-licence',method:'Exact DGUID/CSDUID join. Population and density are original 2021 CSD values. No geographic allocation or interpolation. Display geometry is paginated official StatCan 2021 cartographic-boundary REST data with source-side 1000 metre generalization in EPSG:3347. Original outer rings, holes and multipart structure are preserved during coordinate conversion to EPSG:4326. Generalization affects displayed borders only; original table density is unchanged.',topology,outputs:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:hash(text)}]))};
files['subdivisions-manifest.json']=JSON.stringify(manifest,null,2)+'\n';await mkdir(path.join(source,'prepared'),{recursive:true});
const logSources=new Set((process.env.CANADA_REVIEW_LOG_SOURCES??'population/prepared/subdivisions.json,population/prepared/subdivisions-manifest.json').split(','));
for(const [file,text]of Object.entries(files)){
 await writeFile(path.join(source,'prepared',file),text);const encoded=gzipSync(text,{mtime:0}).toString('base64');
 console.log('CANADA_REVIEW_PREPARED_STATUS '+JSON.stringify({file,bytes:Buffer.byteLength(text),gzipBase64Bytes:encoded.length,sha256:hash(text)}));
 if(logSources.has('population/prepared/'+file))for(let offset=0;offset<encoded.length;offset+=120000)console.log('CANADA_REVIEW_SOURCE '+JSON.stringify({file:'population/prepared/'+file,part:offset/120000,parts:Math.ceil(encoded.length/120000),gzipBase64:encoded.slice(offset,offset+120000)}));
}
