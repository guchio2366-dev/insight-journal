import {formatJapanQuantity} from '../../src/lib/atlas-japan-number.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
import {readJapanState} from '../../src/lib/atlas-japan-state.ts';
import {japanIndustryClusters,japanIndustries,japanIndustryDefinition} from '../../src/data/atlas/japan-industry-clusters.ts';
const bytes=path=>readFileSync(new URL('../../'+path,import.meta.url));
const json=path=>JSON.parse(bytes(path));
const hash=path=>createHash('sha256').update(bytes(path)).digest('hex');
const base='public/assets/atlas/';
function png(raw){
 assert.deepEqual([...raw.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const width=raw.readUInt32BE(16),height=raw.readUInt32BE(20);assert.equal(raw[24],8);assert.equal(raw[25],6);assert.equal(raw[28],0);
 const chunks=[];for(let p=8;p<raw.length;){const n=raw.readUInt32BE(p);if(raw.toString('ascii',p+4,p+8)==='IDAT')chunks.push(raw.subarray(p+8,p+8+n));p+=12+n;}
 const rows=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(width*height*4),stride=width*4;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let r=0;r<height;r++){const filter=rows[r*(stride+1)];assert(filter<=4);for(let c=0;c<stride;c++){const i=r*stride+c,a=c>=4?pixels[i-4]:0,b=r?pixels[i-stride]:0,d=r&&c>=4?pixels[i-stride-4]:0;pixels[i]=(rows[r*(stride+1)+1+c]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,d)][filter])&255;}}
 return{width,height,pixels};
}
test('日本の産業は金融・電力の事実と数量の定義を分け、URLの立地を業種ごとに検証する',()=>{
 const context={prefectures:[],cities:[],sites:japanIndustryClusters.map(s=>s.id),siteIndustries:Object.fromEntries(japanIndustryClusters.map(s=>[s.id,s.industries]))};
 for(const id of ['auto','chips','steel','batteries','ships','chemicals','services','energy','logistics'])assert(japanIndustryClusters.filter(s=>s.industries.includes(id)).length>=2,id);
 assert.equal(japanIndustries.find(i=>i.id==='chips').label,'半導体製造');assert.match(japanIndustryDefinition.semiconductor,/半導体以外/);
 assert.equal(new Set(context.sites).size,context.sites.length);
 for(const id of ['services','energy','logistics']){const site=japanIndustryClusters.find(s=>s.industries.includes(id));const url=new URL('https://example.test/atlas/japan/industry/?topic='+id+'&site='+site.id);assert.equal(readJapanState(url,context).site,site.id);url.searchParams.set('topic','auto');assert.equal(readJapanState(url,context).site,null);}
});
test('農林業参考資料は原格子・値・出典hashを保持し牛用途の代用品を生成しない',()=>{
 const m=json(base+'japan-agriculture-v3/manifest.json');
 for(const input of m.inputs)assert.equal(hash(input.path),input.sha256,input.path);
 for(const [name,file] of Object.entries(m.files))assert.equal(hash(base+'japan-agriculture-v3/'+name),file.sha256,name);
 assert.deepEqual(m.layers.map(l=>l.id),['rice','wheat','pig','forest']);
 const original=json(base+'asia-farming-v1/manifest.json');
 for(const id of ['wheat','pig']){
  const layer=m.layers.find(l=>l.id===id),source=original.regions['east-asia'].layers.find(l=>l.id===id);
  assert.equal(layer.sourceResolutionDegrees,1/12);assert.equal(layer.year,2020);
  const data=gunzipSync(bytes(base+'japan-agriculture-v3/'+layer.grid)),raw=gunzipSync(bytes(base+'asia-farming-v1/'+source.grid));
  const dx=(source.bounds3857[2]-source.bounds3857[0])/source.width,dy=(source.bounds3857[3]-source.bounds3857[1])/source.height;
  const col=Math.round((layer.bounds3857[0]-source.bounds3857[0])/dx),row=Math.round((source.bounds3857[3]-layer.bounds3857[3])/dy);
  let checked=0,zero=0,missing=0;
  for(let r=0;r<layer.height;r++)for(let c=0;c<layer.width;c++){const v=data.readFloatLE((r*layer.width+c)*4);if(v<0){assert.equal(v,layer.noData);missing++;continue;}assert.equal(v,raw.readFloatLE(((r+row)*source.width+c+col)*4));checked++;if(v===0)zero++;}
  assert(checked>10000);assert.equal(zero,layer.validation.zeroLandPixels);assert(missing>0);
 }
 const forest=m.layers.find(l=>l.id==='forest');assert.equal(forest.grid,null);assert.equal(forest.sourceResolutionDegrees,null);assert.match(forest.method,/no area calculation/);
 assert.match(m.layers.find(l=>l.id==='rice').license,/CC BY-SA/);
});
test('気候記号は実際の原分類画素、数値は該当する原等値線の頂点に置く',()=>{
 const root=base+'japan-nature-v2/',m=json(root+'manifest.json'),annotations=json(root+'annotations.json');
 const grid=gunzipSync(bytes(root+m.climate.grid));
 for(const a of annotations.climate){const [col,row]=a.sourcePixel;assert.equal(grid[row*m.climate.width+col],a.sourceValue);assert.equal(m.climate.classes.find(c=>c.id===a.sourceValue).code,a.title);assert.equal(hash(root+m.climate.grid),a.sourceGridSha256);}
 for(const topic of ['precipitation','elevation']){const geo=json(root+m[topic].contours);for(const a of annotations[topic]){const f=geo.features.find(f=>f.properties.id===a.sourceFeature);assert(f);const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;assert(lines.some(line=>line.some(p=>p[0]===a.point[0]&&p[1]===a.point[1])));assert(a.title.startsWith(String(f.properties.value)));assert.equal(hash(root+m[topic].contours),a.sourceContourSha256);}}
});
test('人口の真のゼロ・欠測・正値は別々の凡例と集計を持ち全国の値を変えない',()=>{
 const m=json(base+'japan-v1/population.json');assert.notEqual(m.zeroColor,m.missingColor);assert(!m.colors.includes(m.zeroColor));assert(!m.colors.includes(m.missingColor));
 assert.equal(m.validation.zeroLandPixels,1266);assert.equal(m.validation.missingLandPixels,1);assert.equal(m.validation.positiveLandPixels,18582);assert.equal(m.validation.landPixels,m.validation.zeroLandPixels+m.validation.missingLandPixels+m.validation.positiveLandPixels);
 const data=gunzipSync(bytes(base+'japan-v1/'+m.grid)),image=png(bytes(base+'japan-v1/'+m.image));assert.equal(image.width,m.width);assert.equal(image.height,m.height);
 let zeros=0,missing=0;for(let i=0;i<data.length;i+=4){const value=data.readFloatLE(i),rgba=[...image.pixels.subarray(i,i+4)];if(value===0){zeros++;assert.deepEqual(rgba,[250,248,231,255]);}else if(value<0){if(rgba[3]){missing++;assert.deepEqual(rgba,[158,159,161,255]);}else assert.deepEqual(rgba,[0,0,0,0]);}else assert.equal(rgba[3],255);}
 assert.equal(zeros,m.validation.zeroLandPixels);assert.equal(missing,m.validation.missingLandPixels);
});


test('original small positive model quantities never become a displayed zero',async()=>{
 assert.equal(formatJapanQuantity(0),'0');
 assert.equal(formatJapanQuantity(.1),'0.1');
 for(const name of ['public/assets/atlas/japan-v1/population.density.gz','public/assets/atlas/japan-agriculture-v3/pig.float32.gz']){
  const decoded=gunzipSync(bytes(name));
  const view=new DataView(decoded.buffer,decoded.byteOffset,decoded.byteLength);
  let small=0;
  for(let i=0;i<view.byteLength;i+=4){const value=view.getFloat32(i,true);if(value>0&&value<.05){assert.equal(formatJapanQuantity(value),'0超〜0.1未満');small++;}}
  assert(small>0,'fixture has real positive values below one-decimal rounding precision');
 }
});

 test('全国の産地・木材利用・産業の概略点は共通の詳細海岸線の陸域にある',async()=>{
  const {japanAgricultureSites,japanForestrySites}=await import('../../src/data/atlas/japan-agriculture-v2.ts');
  const land=json(base+'japan-v1/geography.json').features[0].geometry;
  const inRing=([x,y],ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
  const inPolygon=(p,rings)=>inRing(p,rings[0])&&!rings.slice(1).some(r=>inRing(p,r));
  const polygons=land.type==='MultiPolygon'?land.coordinates:[land.coordinates];
  for(const s of [...japanIndustryClusters,...japanAgricultureSites,...japanForestrySites])assert(polygons.some(poly=>inPolygon(s.point??s.coordinates,poly)),s.id);
  assert.deepEqual(new Set(japanIndustryClusters.filter(s=>s.industries.includes('energy')).map(s=>s.label)),new Set(['火力発電','水力発電','地熱発電','風力発電','太陽光発電','原子力発電']));
 });
