/** Reposition only display-label metadata using retained GLW4 values and
 * retained polygons; no source download, new area, buffer, or geometry rewrite. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const window=[-5,46,2,50];
const raw=await fs.readFile(path.join(root,'public/assets/atlas/europe/farming-v1/cattle.bin.gz'));
const bytes=gunzipSync(raw);assert(bytes.length===1080*492*4,'source dimensions');
const grid=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
const sha=createHash('sha256').update(raw).digest('hex');
const manifestPath=path.join(root,'public/assets/atlas/europe/farming-overview-v3/manifest.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
function assert(value,message){if(!value)throw new Error(message);}
function insideRing(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function insideGeometry(x,y,g){const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polygons.some(rings=>insideRing(x,y,rings[0])&&!rings.slice(1).some(ring=>insideRing(x,y,ring)));}
const records=[];
for(const kind of ['dominant','secondary']){
 const file=path.join(root,`src/data/atlas/europe/farming-${kind}-overview.json`),data=JSON.parse(await fs.readFile(file,'utf8'));
 const cattle=data.features.find(f=>f.properties.id==='cattle');assert(cattle,'cattle feature');
 const valid=new Map();
 function supported(row,col){if(row<0||row>=492||col<0||col>=1080)return 0;const at=row*1080+col;if(!valid.has(at)){const value=grid[at],x=-25+(col+.5)/12,y=73-(row+.5)/12;valid.set(at,value>0&&insideGeometry(x,y,cattle.geometry)?value:0);}return valid.get(at);}
 let best=null;
 for(let row=0;row<492;row++){const y=73-(row+.5)/12;if(y<window[1]||y>window[3])continue;
 for(let col=0;col<1080;col++){const x=-25+(col+.5)/12;if(x<window[0]||x>window[2]||!supported(row,col))continue;let score=0;
 for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++)score+=supported(row-dr,col-dc);
 if(!best||score>best.score)best={row,col,score,coordinate:[Number(x.toFixed(6)),Number(y.toFixed(6))],value:grid[row*1080+col]};}}
 assert(best,'no supported western-France anchor');
 const record=manifest.records.find(r=>r.kind===kind&&r.id==='cattle');assert(record.sourceGridSha256===sha,'source identity');
 cattle.properties.labelCoordinate=best.coordinate;
 record.sourceAnchor=best.coordinate;record.anchorCellValue=best.value;record.regionalAnchorWindow=window;
 record.anchorRule='maximum 7x7 sum of positive source values in retained display polygons within the western-France window; separates total cattle from the northern-Italy chicken label; not a milk-cow distribution or Europe-wide ranking';
 await fs.writeFile(file,JSON.stringify(data)+'\n');records.push({kind,...best,sourceGridSha256:sha});
}
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(records));
