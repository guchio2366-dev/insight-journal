// Re-render the acquired geometries; does not classify or interpolate source values.
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {usPrecipitationBands as precipitationBands} from '../src/data/atlas/water-resources.ts';
const directory='public/assets/atlas/water-v1/',manifest=JSON.parse(await readFile(directory+'manifest.json','utf8'));
const base=JSON.parse(await readFile('public/assets/atlas/v3/base.geojson','utf8'));
const project=([x,y])=>[(x+128)/64*1800,(Math.asinh(Math.tan(52*Math.PI/180))-Math.asinh(Math.tan(y*Math.PI/180)))/(Math.asinh(Math.tan(52*Math.PI/180))-Math.asinh(Math.tan(22*Math.PI/180)))*1091];
const path=geometry=>{
 const {type,coordinates:c}=geometry,points=ring=>'M'+ring.map(p=>project(p).map(v=>v.toFixed(1)).join(',')).join('L');
 if(type==='Polygon')return c.map(ring=>points(ring)+'Z').join('');
 if(type==='MultiPolygon')return c.map(coordinates=>path({type:'Polygon',coordinates})).join('');
 if(type==='LineString')return c.length?points(c):'';
 if(type==='MultiLineString')return c.map(points).join('');
 return type==='GeometryCollection'?geometry.geometries.map(path).join(''):'';
};
const lines=g=>g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:g.type==='GeometryCollection'?g.geometries.flatMap(lines):[];
for(const mode of ['precipitation','basins']){
 const data=JSON.parse(gunzipSync(await readFile(directory+mode+'.geojson.gz')));
 if(mode==='precipitation'){
  for(const feature of data.features)if(feature.properties.kind==='band')feature.properties.color=precipitationBands.find(b=>b.id===feature.properties.id).color;
  await writeFile(directory+mode+'.geojson.gz',gzipSync(JSON.stringify(data),{level:9,mtime:0}));
 }
 const svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1091"><rect width="1800" height="1091" fill="#e4eff0"/>'];
 for(const feature of base.features)if(feature.properties.kind==='land')svg.push(`<path d="${path(feature.geometry)}" fill="#f0efea" stroke="#879695" fill-rule="evenodd"/>`);
 for(const feature of data.features){
  const p=feature.properties,stroke=p.kind==='isohyet'?'#416d7a':p.kind==='outline'?'#64736d':'none';
  svg.push(`<path d="${path(feature.geometry)}" fill="${p.color??'none'}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${p.major?3:1.4}"/>`);
 }
 for(const feature of base.features){
  const p=feature.properties;if(!['river','state'].includes(p.kind))continue;
  const main=mode==='basins'&&p.kind==='river'&&['Mississippi','Missouri','Ohio','Colorado','Columbia','Sacramento','San Joaquin'].includes(p.name);
  svg.push(`<path d="${path(feature.geometry)}" fill="none" stroke="${p.kind==='river'?'#17658b':'#777'}" stroke-width="${main?3:1}" opacity="${main?1:.6}"/>`);
 }
 if(mode==='precipitation'){
  const occupied=[];
  for(const feature of data.features){
   if(feature.properties.kind!=='isohyet')continue;
   for(const line of lines(feature.geometry).sort((a,b)=>b.length-a.length).slice(0,2)){
    if(line.length<2)continue;const [x,y]=project(line[Math.floor(line.length/2)]);
    if(occupied.some(([a,b])=>Math.abs(x-a)<100&&Math.abs(y-b)<35))continue;
    occupied.push([x,y]);svg.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="sans-serif" font-size="23" text-anchor="middle" fill="#234957" stroke="white" stroke-width="2" paint-order="stroke">${feature.properties.value.toLocaleString('en-US')}</text>`);
   }
  }
 }
 svg.push('</svg>');await sharp(Buffer.from(svg.join(''))).webp({quality:90,effort:6}).toFile(directory+mode+'-fallback.webp');
}
manifest.processing.displayRevision={date:'2026-10-11',generator:'scripts/refresh-us-water-display.mjs',palette:precipitationBands.map(b=>b.color),geometry:'Acquired source geometries and six isohyet values unchanged. No interpolation or extra threshold inferred.',unacquiredIsohyetsMm:[1250,1750],mainRivers:'Existing base source paths; basins display only.'};
for(const [name,record] of Object.entries(manifest.files)){const bytes=await readFile(directory+name);record.bytes=bytes.length;record.gzipBytes=gzipSync(bytes).length;record.sha256=createHash('sha256').update(bytes).digest('hex');}
await writeFile(directory+'manifest.json',JSON.stringify(manifest)+'\n');
