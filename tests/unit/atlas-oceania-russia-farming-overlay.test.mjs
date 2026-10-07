import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync,gunzipSync} from 'node:zlib';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
const json=path=>JSON.parse(read(path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Decode the delivered PNG independently of Pillow, including all PNG filters.
function pixels(bytes){
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(bytes[28],0);
 const chunks=[];
 for(let i=8;i<bytes.length;){const length=bytes.readUInt32BE(i);if(bytes.toString('ascii',i+4,i+8)==='IDAT')chunks.push(bytes.subarray(i+8,i+8+length));i+=length+12;}
 const rows=inflateSync(Buffer.concat(chunks)),stride=width*4,rgba=Buffer.alloc(height*stride);
 assert.equal(rows.length,height*(stride+1));
 for(let row=0;row<height;row++){
  const filter=rows[row*(stride+1)];assert.ok(filter<=4);
  for(let column=0;column<stride;column++){
   const at=row*stride+column,left=column>=4?rgba[at-4]:0,up=row?rgba[at-stride]:0,corner=row&&column>=4?rgba[at-stride-4]:0;
   let predictor=0;
   if(filter===1)predictor=left;
   if(filter===2)predictor=up;
   if(filter===3)predictor=Math.floor((left+up)/2);
   if(filter===4){const p=left+up-corner,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-corner);predictor=a<=b&&a<=c?left:b<=c?up:corner;}
   rgba[at]=(rows[row*(stride+1)+column+1]+predictor)&255;
  }
 }
 return {width,height,rgba};
}

for(const region of ['russia','oceania']){
 const base=`public/assets/atlas/${region}-farming-overlay-v1/`,manifest=json(base+'manifest.json');
 test(`${region} farming textures retain pinned source grids, years, bounds, units and separate zero/missing states`,()=>{
  assert.equal(manifest.year,2020);
  for(const [file,hash] of Object.entries(manifest.inputs))assert.equal(sha(read(file)),hash,file);
  for(const [file,record] of Object.entries(manifest.files)){const bytes=read(base+file);assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);}
  assert.match(manifest.method,/No aggregation, interpolation/);assert.match(manifest.limitations.join(' '),/not a validated national top-ten/);
  for(const layer of manifest.layers){
   const values=gunzipSync(read(layer.sourceGrid)),image=pixels(read(base+layer.image));
   assert.equal(values.length,layer.width*layer.height*4);assert.equal(image.width,layer.width*4);assert.equal(image.height,layer.height*4);
   assert.equal(layer.year,2020);assert.equal(layer.license,'CC BY 4.0');
   assert.deepEqual(layer.boundsUnwrapped,region==='russia'?[18,40,191,83]:[110,-58,250,25]);
   const original=json(`public/assets/atlas/${region}-${layer.kind==='crop'?'crops':'livestock'}-v1/manifest.json`).layers.find(item=>item.id===layer.id);
   assert.deepEqual(layer.breaks,original.breaks);assert.equal(layer.unit,original.unit);
   assert.match(layer.unit,layer.kind==='crop'?/ha/:/頭/);
   const quantity=layer.quantityImage?pixels(read(base+layer.quantityImage)):null;
   if(quantity){assert.equal(quantity.width,layer.width);assert.equal(quantity.height,layer.height);}
   const dots=layer.dotPixels??[[1,1],[1,2],[2,1],[2,2]];
   const counts={positive:0,zero:0,missing:0},missing=layer.kind==='livestock'?pixels(read(base+layer.missingImage)):null;
   if(missing){assert.equal(missing.width,layer.width);assert.equal(missing.height,layer.height);}
   const pixel=(row,column,dy,dx)=>(row*4+dy)*image.width*4+(column*4+dx)*4;
   const palette=layer.colors.map(color=>Buffer.from(color,'hex'));
   for(let row=0;row<layer.height;row++)for(let column=0;column<layer.width;column++){
    const value=values.readFloatLE((row*layer.width+column)*4);
    assert.ok(Number.isFinite(value)&&(value>=0||value===-1));
    counts[value>0?'positive':value===0?'zero':'missing']++;
    if(quantity){
     const at=(row*layer.width+column)*4;
     if(value===-1)assert.equal(quantity.rgba[at+3],0);
     else{
      assert.equal(quantity.rgba[at+3],255);
      const color=value===0?Buffer.from([246,245,235]):palette[layer.breaks.filter(bound=>value>=bound).length];
      if(!quantity.rgba.subarray(at,at+3).equals(color))assert.fail(`Native quantity class/zero mismatch ${layer.id} at ${row},${column}`);
     }
    }
    if(layer.kind==='livestock'){
     const alpha=(dy,dx)=>image.rgba[pixel(row,column,dy,dx)+3];
     if(value>0){
      const index=layer.breaks.filter(bound=>value>=bound).length,at=pixel(row,column,...dots[0]);
      if(alpha(...dots[0])!==layer.alphas[index]||alpha(...dots[0])===0||!image.rgba.subarray(at,at+3).equals(palette[index]))assert.fail(`Density class mismatch at native cell ${row},${column}`);
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)assert.equal(alpha(dy,dx),dots.some(([y,x])=>y===dy&&x===dx)?layer.alphas[index]:0);
     }else{
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)if(alpha(dy,dx)!==0)assert.fail(`Zero/missing density mark at ${row},${column}`);
     }
     assert.equal(missing.rgba[(row*layer.width+column)*4+3],value===-1?255:0,'Exact missing mask');
    }else if(value<=0){
     for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)if(image.rgba[pixel(row,column,dy,dx)+3]!==0)assert.fail(`Crop outline invents production in zero/missing cell ${row},${column}`);
    }
   }
   assert.deepEqual(counts,layer.sourceCounts);
  }
 });
}
