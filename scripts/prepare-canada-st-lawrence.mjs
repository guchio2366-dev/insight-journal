import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceDirectory='data-source/atlas/canada/st-lawrence';
/** Offline, narrowly scoped replacement of the truncated Natural Earth reach. */
export async function writeCanadaStLawrenceDisplay(){
 const featureBytes=await readFile(`${sourceDirectory}/feature.json`),expandedBytes=await readFile(`${sourceDirectory}/expanded.geojson`);
 assert.equal(sha(featureBytes),'ee7df12a7dee9d8e7d737aee4b929a065212677e78fc0c6f11153c6ead0dfd95');
 assert.equal(sha(expandedBytes),'be20c9ef313a4e521c62ad47f0c48ac67c633d60b669a9459ff2b2662626d643');
 const feature=JSON.parse(featureBytes),expanded=JSON.parse(expandedBytes),geometry=feature.geometry;
 assert.equal(feature.id,'4d00fe4cba2011d892e2080020a0f4c9');assert.equal(expanded.properties.status,'official');
 assert.deepEqual(geometry,expanded.geometry);assert.equal(geometry.type,'MultiPolygon');
 const points=geometry.coordinates.flat(2),bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
 // The service's metadata bbox is broader than its held geometry. Preserve
 // both without changing coordinates or treating metadata as geometry.
 assert.ok(bounds[0]>=feature.bbox[0]&&bounds[1]>=feature.bbox[1]&&bounds[2]<=feature.bbox[2]&&bounds[3]<=feature.bbox[3]);
 assert.ok(points.every(point=>point.length===2&&point.every(Number.isFinite)));
 for(const polygon of geometry.coordinates)for(const ring of polygon){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}
 const path='src/data/atlas/canada/rivers.json',rivers=JSON.parse(await readFile(path));
 const targets=rivers.features.filter(item=>item.properties.name==='St. Lawrence');assert.equal(targets.length,1);
 const otherFeatures=JSON.stringify(rivers.features.filter(item=>item.properties.name!=='St. Lawrence'));
 targets[0].geometry=geometry;targets[0].properties.sourceId='nrcan-cgndb-st-lawrence';
 assert.equal(JSON.stringify(rivers.features.filter(item=>item.properties.name!=='St. Lawrence')),otherFeatures);
 const output=Buffer.from(JSON.stringify(rivers)+'\n');await writeFile(path,output);
 const oldSource=JSON.parse(await readFile('data-source/atlas/canada/rivers.geojson'));
 const oldReach=oldSource.features.find(item=>item.properties.name==='St. Lawrence');assert.equal(oldReach.geometry.coordinates.flat().length,7);
 const source={id:'nrcan-cgndb-st-lawrence',publisher:'Natural Resources Canada / Geographical Names Board of Canada',title:'CGNDB St. Lawrence River official geographical feature',catalogueUrl:'https://geonames.nrcan.gc.ca/search-place-names/unique?id=EFGFK',featureUrl:'https://geogratis.gc.ca/services/geoname/en/features/4d00fe4cba2011d892e2080020a0f4c9.json',expandedUrl:'https://geogratis.gc.ca/services/geoname/en/geonames/EFGFK.geojson?expand=feature',termsUrl:'https://www.canada.ca/en/transparency/terms.html',retrievedAt:'2026-10-11',featureId:feature.id,geonameId:expanded.properties.cgndbid,status:expanded.properties.status,sourceRelevance:expanded.properties.relevance,sourceAccuracy:expanded.properties.accuracy,sourceMetadataNote:'Relevance and accuracy are held raw API fields; no cartographic scale or accuracy-unit claim is inferred.',bounds,sourceMetadataBounds:feature.bbox,geometryType:geometry.type,polygonCount:geometry.coordinates.length,ringCount:geometry.coordinates.reduce((sum,p)=>sum+p.length,0),vertexCount:points.length,featureSha256:sha(featureBytes),expandedSha256:sha(expandedBytes),geometrySha256:sha(JSON.stringify(geometry)),method:'Replace only the St. Lawrence feature with the exact official geographical-feature MultiPolygon. No clipping, simplification, joining, inferred river centerline or invented downstream coordinates. Display the footprint outline; this is not a wetted-area, navigation-channel, bathymetry or flow-quantity dataset. The original metadata bbox is broader than the geometry bounds; both are recorded independently.',originalNaturalEarth:{retainedFile:'data-source/atlas/canada/rivers.geojson',geometryType:oldReach.geometry.type,vertexCount:7,geometrySha256:sha(JSON.stringify(oldReach.geometry))},otherRiverCount:rivers.features.length-1,otherRiverFeaturesSha256:sha(otherFeatures),displaySha256:sha(output)};
 // Keep the complete acquisition record in the source archive. Public
 // attribution uses the canonical CGNDB name URL/ID and original-byte hashes.
 await writeFile(`${sourceDirectory}/provenance.json`,JSON.stringify(source,null,2)+'\n');
 const {featureUrl,featureId,...publicSource}=source;
 publicSource.sourceArchive=`${sourceDirectory}/provenance.json`;
 await writeFile('public/assets/atlas/canada-nature-v1/st-lawrence-manifest.json',JSON.stringify(publicSource,null,2)+'\n');
 const manifestPath='public/assets/atlas/canada-nature-v1/manifest.json',manifest=JSON.parse(await readFile(manifestPath));
 const entry=manifest.waters.find(item=>item.file==='rivers.json');entry.sha256=sha(output);entry.replacementSources=[publicSource];
 entry.method='Natural Earth source vertices remain unchanged for all rivers except St. Lawrence, whose original 7-vertex upstream reach is retained in the source archive and whose display uses the unchanged official CGNDB geographical-feature footprint. Cross-border waters retained; no river-flow or basin-area calculation.';
 await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 return source;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const source=await writeCanadaStLawrenceDisplay();console.log(`St. Lawrence: ${source.vertexCount} exact official vertices; ${source.otherRiverCount} other rivers unchanged`);}
