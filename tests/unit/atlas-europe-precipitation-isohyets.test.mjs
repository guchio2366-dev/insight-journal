import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
import {sumCompleteMonthlyNormals,displayCoordinate,sourceCellIndex} from '../../scripts/europe/prepare-precipitation.mjs';
import {europePrecipitationLayer,europePrecipitationReading} from '../../src/data/atlas/europe/water-reading.ts';

const root=new URL('../../',import.meta.url),base='public/assets/atlas/europe/precipitation-contours-v1/';
const bytes=name=>readFileSync(new URL(name,root));
const json=name=>JSON.parse(bytes(name));
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=json(base+'manifest.json'),window=json(base+'native-window.json');
const f32=data=>new Float32Array(data.buffer,data.byteOffset,data.length/4);
const monthly=f32(gunzipSync(bytes(window.monthlyWindow.path)));
const annual=f32(gunzipSync(bytes(base+'native-annual.bin.gz')));
const geometry=JSON.parse(gunzipSync(bytes(base+'geometry.json.gz')));
const original=json('public/assets/atlas/europe/precipitation-v1/manifest.json');
const originalGrid=f32(gunzipSync(bytes('public/assets/atlas/europe/precipitation-v1/values.bin.gz')));

test('native contour values are complete twelve-month sums of the pinned source, preserving every original point lookup',()=>{
  assert.equal(window.originalArchiveSha256,'3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5');
  assert.equal(window.originalArchiveMd5,'d701c717e08ce6ad457c9f4004984d65');
  assert.equal(sha(bytes(window.monthlyWindow.path)),window.monthlyWindow.sha256);
  assert.equal(window.months,12);assert.equal(window.rows,166);assert.equal(window.columns,362);
  assert.equal(window.longitude[0],-25.125);assert.equal(window.latitude[0],73.125);
  const size=window.rows*window.columns;assert.equal(monthly.length,size*12);assert.equal(annual.length,size);
  let valid=0;
  for(let i=0;i<size;i++){
    const expected=sumCompleteMonthlyNormals(Array.from({length:12},(_,month)=>monthly[month*size+i]),window.sourceNoData);
    assert.equal(annual[i],expected===null?-1:Math.fround(expected));if(expected!==null)valid++;
  }
  assert.equal(valid,manifest.validation.validNativeNodes);
  assert.equal(sha(bytes('public/assets/atlas/europe/precipitation-v1/values.bin.gz')),manifest.numericLookup.sha256);
  for(let i=0;i<originalGrid.length;i++){
    if(originalGrid[i]<0)continue;
    const coordinate=displayCoordinate(i%1800,Math.floor(i/1800)),source=sourceCellIndex(...coordinate);
    const r=source.row-67,c=source.column-619;
    assert.equal(originalGrid[i],annual[r*window.columns+c]);
  }
  assert.equal(europePrecipitationLayer.grid,'/assets/atlas/europe/precipitation-v1/values.bin.gz');
});

test('every 250 mm line vertex matches its actual donor values and every segment bounds both adjacent blue bands',()=>{
  assert.deepEqual(geometry.lines.map(line=>line.level),Array.from({length:12},(_,i)=>(i+1)*250));
  const pointKey=p=>p.map(v=>v.toFixed(9)).join(',');
  const edgeKey=(a,b)=>[pointKey(a),pointKey(b)].sort().join('|');
  const edges=geometry.bands.map(band=>new Set(band.polygons.flatMap(polygon=>polygon.flatMap(ring=>ring.slice(1).map((p,i)=>edgeKey(ring[i],p))))));
  let vertexCount=0,edgeCount=0;
  for(const [index,line] of geometry.lines.entries())for(const part of line.parts){
    for(const [x,y] of part){
      const c=(x-window.longitude[0])/.25,r=(window.latitude[0]-y)/.25;
      let expected;
      if(Math.abs(r-Math.round(r))<1e-7){
        const rr=Math.round(r),cc=Math.min(Math.floor(c),window.columns-2),a=annual[rr*window.columns+cc],b=annual[rr*window.columns+cc+1];
        assert.ok(a>=0&&b>=0);expected=a+(c-cc)*(b-a);
      }else{
        assert.ok(Math.abs(c-Math.round(c))<1e-7);
        const cc=Math.round(c),rr=Math.min(Math.floor(r),window.rows-2),a=annual[rr*window.columns+cc],b=annual[(rr+1)*window.columns+cc];
        assert.ok(a>=0&&b>=0);expected=a+(r-rr)*(b-a);
      }
      assert.ok(Math.abs(expected-line.level)<.0001,`${line.level} mm line interpolates actual valid source edges`);vertexCount++;
    }
    for(let i=1;i<part.length;i++){
      if(pointKey(part[i-1])===pointKey(part[i]))continue;
      const key=edgeKey(part[i-1],part[i]);assert.ok(edges[index].has(key)&&edges[index+1].has(key),'Both blue bands use exactly this line boundary');edgeCount++;
    }
  }
  assert.equal(vertexCount,manifest.validation.verifiedLineVertices);assert.equal(edgeCount,manifest.validation.verifiedSharedBandEdges);
  assert.deepEqual(geometry.bands.map(band=>band.color),europePrecipitationLayer.colors);
});

function rgba(name){
  const png=bytes(name),parts=[];
  for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);if(kind==='IDAT')parts.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
  return inflateSync(Buffer.concat(parts));
}
test('published lines and bands use one SVG, preserve all source-missing pixels and retain source-period and interpolation limits',()=>{
  for(const [name,record] of Object.entries(manifest.files))assert.equal(sha(bytes(base+name)),record.sha256,name);
  assert.equal(manifest.inputSha256,original.inputSha256);assert.equal(manifest.period,original.period);assert.equal(manifest.license,'CC BY 4.0');
  const svg=bytes(base+'precipitation.svg').toString();
  for(const level of manifest.breaks)assert.ok(svg.includes(`data-isohyet-mm="${level}"`));
  assert.ok(svg.includes('data-isobands="250mm"'));assert.ok(svg.includes('data-isohyets="250mm"'));
  const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)),top=mercator(73),bottom=mercator(32);
  const projected=parts=>parts.flat().flatMap(([lon,lat])=>[(lon+25)*20,(top-mercator(lat))/(top-bottom)*1502]);
  const actualPaths=new Map([...svg.matchAll(/<path data-isohyet-mm="(\d+)" d="([^"]*)"\/>/g)].map(match=>[Number(match[1]),match[2]]));
  for(const line of geometry.lines){
    const actual=actualPaths.get(line.level).match(/-?\d+(?:\.\d+)?/g).map(Number),expected=projected(line.parts);
    assert.equal(actual.length,expected.length);
    for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<.002,'Actual SVG line uses the verified native geometry and correct north-positive Mercator projection');
  }
  const old=rgba('public/assets/atlas/europe/precipitation-v1/precipitation.png'),next=rgba(base+'precipitation.png');
  let painted=0;
  for(let row=0;row<1502;row++){
    assert.equal(old[row*(1800*4+1)],0);assert.equal(next[row*(1800*4+1)],0);
    for(let column=0;column<1800;column++){const i=row*(1800*4+1)+1+column*4+3;if(old[i]===0)assert.equal(next[i],0);if(next[i])painted++;}
  }
  assert.equal(painted,manifest.rendering.paintedPixels);assert.equal(manifest.rendering.sourceMissingPixelsFilled,0);
  assert.equal(europePrecipitationLayer.image,'/assets/atlas/europe/precipitation-contours-v1/precipitation.png');
  assert.match(europePrecipitationReading.note,/四隅.*完全な年値/);assert.match(europePrecipitationReading.note,/地点照会.*最寄り原格子/);
});
