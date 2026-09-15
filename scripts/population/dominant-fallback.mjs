// Build only new fallbacks, from the same reviewed data and color functions as the interactive map.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {dominantCategory,ethnicityColors} from '../../src/lib/atlas-population-dominant.ts';
import {populationVoteStates} from '../../src/data/atlas/population-focus.ts';
import {populationColor} from '../../src/lib/atlas-population-data.ts';
import {religionDominantColors} from '../../src/lib/atlas-population-religion.ts';
const base=new URL('../../public/assets/atlas/population/v1/',import.meta.url);
const read=async name=>JSON.parse(gunzipSync(await readFile(new URL(name+'.json.gz',base))));
const geometry=JSON.parse(await readFile(new URL('counties.geo.json',base),'utf8'));
const ethnicity=await read('ethnicity'),votes=await read('votes');
const religion=await read('religion-dominant');
const winners=new Map(ethnicity.rows.map(row=>[row.id,dominantCategory(row.counts)]));
const ballots=new Map(votes.rows.map(row=>[row.id,row]));
const mercator=lat=>180/Math.PI*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
async function render(name,bounds,features,color){
 const [[left,south],[right,north]]=bounds,top=mercator(north),bottom=mercator(south);
 const scale=Math.min(1200/(right-left),720/(top-bottom)),ox=(1200-(right-left)*scale)/2,oy=(720-(top-bottom)*scale)/2;
 const point=([lon,lat])=>(ox+(lon-left)*scale).toFixed(2)+','+(oy+(top-mercator(lat))*scale).toFixed(2);
 const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:g.type==='GeometryCollection'?g.geometries.flatMap(polygons):[];
 const paths=features.map(f=>'<path d="'+polygons(f.geometry).flatMap(p=>p.map(r=>'M'+r.map(point).join('L')+'Z')).join('')+'" fill="'+color(f.properties.id)+'"/>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720"><rect width="1200" height="720" fill="#edf1ef"/><g stroke="#637c7c" stroke-width=".3" fill-rule="evenodd">'+paths+'</g></svg>';
 await writeFile(new URL(name+'.webp',base),await sharp(Buffer.from(svg)).webp({quality:90}).toBuffer());
}
await render('ethnicity-dominant',[[-125,24],[-66,50]],geometry.features,id=>{const group=winners.get(id);return group==null?'#c8ccd0':ethnicityColors[group];});
const religionGeometry=await read('religion-counties-2020.geo');
const religionRows=new Map(religion.rows.map(row=>[row.id,row]));
await render('religion-dominant',[[-125,24],[-66,50]],religionGeometry.features,id=>religionDominantColors[religionRows.get(id)?.category]??'#c8ccd0');
for(const state of populationVoteStates)if(state.bounds)await render('vote-state-'+state.id,state.bounds,geometry.features.filter(f=>f.properties.id.startsWith('county:'+state.id)),id=>{const v=ballots.get(id);return populationColor(v?.total>0?(v.r-v.d)/v.total*100:null,'vote');});
