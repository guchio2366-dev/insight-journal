/** Simplify only display state borders in the unchanged Lambert map frame.
 * Crop polygons already clipped by the source generator are not simplified.
 */
import {build} from 'esbuild';import fs from 'node:fs/promises';import crypto from 'node:crypto';
const built=await build({entryPoints:['src/lib/atlas-mexico-geometry.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {stateFeatures,projectLonLat}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const tolerance=.15;
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=dx||dy?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function simplify(points){if(points.length<=4)return points;const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];while(stack.length){const [a,b]=stack.pop();let max=tolerance,at=-1;for(let i=a+1;i<b;i++){const d=distance(points[i],points[a],points[b]);if(d>max){max=d;at=i;}}if(at>=0){keep.add(at);stack.push([a,at],[at,b]);}}const result=[...keep].sort((a,b)=>a-b).map(i=>points[i]);return result.length>=4?result:points;}
let originalVertices=0,displayVertices=0;
const states=stateFeatures.map(feature=>{const rings=feature.geometry.type==='Polygon'?feature.geometry.coordinates:feature.geometry.coordinates.flat();const path=rings.map(ring=>{originalVertices+=ring.length;const points=simplify(ring.map(projectLonLat));displayVertices+=points.length;return points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('')+'Z';}).join('');return {code:feature.properties.code,nameJa:feature.properties.nameJa,path};});
const source=await fs.readFile('src/data/atlas/mexico/geometry.json');
const data={mapViewBox:'0 0 900 580',method:'Ramer-Douglas-Peucker in the existing projected display frame; no coordinate distortion. Crop geometry is unchanged and already clipped to Mexico by its audited source generator.',toleranceMapUnits:tolerance,originalVertices,displayVertices,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),states};
await fs.writeFile('public/assets/atlas/mexico-agriculture-v2/display-states.json',JSON.stringify(data)+'\n');console.log({originalVertices,displayVertices,bytes:JSON.stringify(data).length});
