import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Offline acquisition verification: no inferred monthly values or coordinates.
const htmlDirectory=process.argv[2];
if(!htmlDirectory)throw Error('Usage: node scripts/update-canada-climate-stations.mjs <original-html-directory>');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const extractionPath='data-source/atlas/canada/climate-source-extract.json';
const source=JSON.parse(await readFile(extractionPath,'utf8'));
const inventory=(await readFile('data-source/atlas/canada/station-inventory.csv','utf8')).split(/\r?\n/);
const additions=[['toronto','トロント','6158355'],['montreal','モントリオール','7025250'],['calgary','カルガリー','3031092'],['halifax','ハリファクス','8202250']];
for(const [id,name,climateId] of additions){
 const bytes=await readFile(`${htmlDirectory}/${id}-1991-2020.html`),html=bytes.toString('utf8');
 const inventoryRow=inventory.find(row=>row.includes(`"${climateId}"`));
 if(!inventoryRow)throw Error(`Missing official inventory: ${climateId}`);
 const cells=[...inventoryRow.matchAll(/"((?:[^"]|"")*)"/g)].map(match=>match[1].replaceAll('""','"'));
 if(cells[3]!==climateId||!html.includes(climateId))throw Error(`Station mismatch: ${id}`);
 const rows=[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(match=>match[0]);
 const rowFor=label=>{
  const matches=rows.filter(row=>row.includes(`<th>${label}</th>`)&&[...row.matchAll(/<td>/g)].length===14);
  if(matches.length!==1)throw Error(`Expected one 12-month + annual + quality row: ${id} ${label}`);
  return matches[0];
 };
 const station={id,name,climateId,station:cells[2],composite:cells[0],quality:cells[1],coordinates:[Number(cells[8]),Number(cells[7])],elevationM:Number(cells[9]),period:'1991–2020',sourceUrl:`https://climate.weather.gc.ca/climate_normals/results_1991_2020_e.html?climate_id=${climateId}&dispBack=0`,retrievedAt:'2026-10-11',sourceSha256:sha(bytes),temperatureRow:rowFor('Daily Average (&deg;C)'),precipitationRow:rowFor('Precipitation (mm)'),inventoryRow};
 source.stations=source.stations.filter(station=>station.id!==id);source.stations.push(station);
 console.log(`${id}: original HTML SHA-256 ${station.sourceSha256}; official inventory ${climateId}`);
}
await writeFile(extractionPath,JSON.stringify(source,null,2)+'\n');

// Read the existing world source only. Canada class geometry is not regenerated.
const rasterBytes=await readFile('data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif');
const manifestPath='public/assets/atlas/canada-climate-elevation-v1/koppen-manifest.json';
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(sha(rasterBytes)!=='7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361')throw Error('Original Köppen source hash mismatch');
const {data,info}=await sharp(rasterBytes).raw().toBuffer({resolveWithObject:true});
if(info.width!==3600||info.height!==1800)throw Error('Unexpected 0.1-degree raster dimensions');
const geometry=JSON.parse(await readFile('public/assets/atlas/canada-climate-elevation-v1/koppen.geojson','utf8'));
function inRing([x,y],ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [a,b]=ring[i],[c,d]=ring[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside;
}
const inPolygon=(point,polygon)=>inRing(point,polygon[0])&&!polygon.slice(1).some(ring=>inRing(point,ring));
const candidates=point=>geometry.features.filter(feature=>(feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates).some(polygon=>inPolygon(point,polygon))).map(feature=>String(feature.properties.id));
const samples=source.stations.map(station=>{
 const [lon,lat]=station.coordinates,column=Math.floor((lon+180)*10+1e-10),row=Math.floor((90-lat)*10+1e-10);
 const classCode=data[(row*info.width+column)*info.channels],code=manifest.classes.find(item=>item.code===classCode)?.id;
 if(!code)throw Error(`Unrepresented source class ${station.id}: ${classCode}`);
 const probe=[lon+1e-8,lat-1e-8],matches=candidates(probe);
 if(matches.length!==1||matches[0]!==code)throw Error(`Source cell and Canada overlay mismatch: ${station.id} ${code} ${matches}`);
 return {stationId:station.id,name:station.name,station:station.station,climateId:station.climateId,coordinates:station.coordinates,sourceRow:row,sourceColumn:column,code:classCode,id:code,overlayMatchesRawCell:true,coordinateSourceUrl:station.sourceUrl,boundaryCandidates:[...new Set([...candidates(station.coordinates),code])],interiorProbe:probe,interiorProbeMatchesRawCell:true};
});
manifest.verification.stationSpotchecks=samples;
manifest.stationSamples=samples.map(sample=>({...sample,class:sample.id,classCode:sample.code,id:sample.stationId,code:sample.id}));
manifest.stationSampleUpdate={date:'2026-10-11',script:'scripts/update-canada-climate-stations.mjs',scriptSha256:sha(await readFile('scripts/update-canada-climate-stations.mjs')),method:'Official ECCC inventory coordinates; direct source raster cell lookup; published Canada geometry interior-probe comparison. Climate geometries and class areas unchanged.'};
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(samples.map(sample=>`${sample.stationId}: ${sample.id} [${sample.sourceRow},${sample.sourceColumn}]`).join('\n'));
