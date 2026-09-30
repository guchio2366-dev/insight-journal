import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const input='data-source/atlas/canada',output='src/data/atlas/canada';
await mkdir(output,{recursive:true});
await mkdir('public/assets/atlas/canada-nature-v1',{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=JSON.parse(await readFile(`${input}/climate-source-extract.json`,'utf8'));
function numbers(row){return [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].slice(0,13).map(([,value])=>{const text=value.trim().replaceAll(',','');return /^[-+]?\d+(\.\d+)?$/.test(text)?Number(text):null;});}
const stations=source.stations.map(({temperatureRow,precipitationRow,inventoryRow,...s})=>{
 const t=numbers(temperatureRow),p=numbers(precipitationRow);
 if(t.length!==13||p.length!==13)throw Error(`Expected 12 months + annual: ${s.id}`);
 return {...s,temperatureC:t.slice(0,12),precipitationMm:p.slice(0,12),annualTemperatureC:t[12],annualPrecipitationMm:p[12]};
});
await writeFile(`${output}/climate.json`,JSON.stringify({period:'1991–2020',stations},null,2)+'\n');
const inside=([x,y])=>x>=-145&&x<=-50&&y>=40&&y<=85;
const coordinates=g=>g.type==='LineString'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat(2):g.coordinates.flat();
const assets=[];
for(const type of ['rivers','lakes']){
 const raw=await readFile(`${input}/${type}.geojson`),data=JSON.parse(raw);
 const features=data.features.filter(f=>coordinates(f.geometry).some(inside)).map(f=>({properties:{name:f.properties.name,nameJa:f.properties.name_ja??f.properties.name},geometry:f.geometry}));
 const bytes=Buffer.from(JSON.stringify({type:'FeatureCollection',features})+'\n');
 await writeFile(`${output}/${type}.json`,bytes);
 assets.push({file:`${type}.json`,count:features.length,inputSha256:sha(raw),sha256:sha(bytes),source:`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_${type==='rivers'?'rivers_lake_centerlines':'lakes'}.geojson`,license:'Public domain',method:'Keep features having a source vertex in Canada display bounds; coordinates unchanged. Includes cross-border waters; not a national clipping or discharge map.'});
}
const image=await readFile(`${input}/physiographic-regions.jpg`);
const thumbnail=await sharp(image).resize({width:1600,withoutEnlargement:true}).jpeg({quality:88}).toBuffer();
await writeFile('public/assets/atlas/canada-nature-v1/physiographic-regions.jpg',thumbnail);
await writeFile('public/assets/atlas/canada-nature-v1/physiographic-regions-full.jpg',image);
const manifest={retrievedAt:'2026-09-30',climate:{publisher:source.publisher,period:'1991–2020',count:stations.length,sourceExtractSha256:sha(await readFile(`${input}/climate-source-extract.json`)),terms:'https://www.canada.ca/en/transparency/terms.html',method:'Extract published numeric facts. Missing or annotated cells stay null; no inferred replacement. 30-year composite values, not current weather or national averages.'},waters:assets,physiography:{publisher:'Natural Resources Canada',title:'Atlas of Canada 6th Edition: Physiographic Regions',edition:2009,baseGeologyYear:1967,source:'https://open.canada.ca/data/en/dataset/dcdd5e21-8893-11e0-8ea0-6cf049291510',download:'https://ftp.geogratis.gc.ca/pub/nrcan_rncan/raster/atlas_6_ed/eng/6422_physiographic_regions.zip',license:'Open Government Licence – Canada',licenseUrl:'https://open.canada.ca/en/open-government-licence-canada',inputSha256:sha(image),thumbnailSha256:sha(thumbnail),method:'Official historical map, unchanged layout; JPEG resized for display. Its Lambert projection is not overlaid onto the separate locator map.'}};
await writeFile('public/assets/atlas/canada-nature-v1/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Canada: ${stations.length} climate composites; ${assets.map(a=>`${a.count} ${a.file}`).join(', ')}`);
