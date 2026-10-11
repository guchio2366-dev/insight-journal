import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
const base='public/assets/atlas/canada-population-grid-v1/';
const manifest=JSON.parse(await readFile(base+'manifest.json'));
const inputs=JSON.parse(await readFile(base+'source-inputs.json'));
const bytes=gunzipSync(await readFile(base+'density.bin.gz'));
const cells=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function pngPixels(raw) {
  assert.deepEqual(raw.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = raw.readUInt32BE(16), height = raw.readUInt32BE(20);
  assert.equal(raw[24], 8); assert.equal(raw[25], 6); assert.equal(raw[28], 0);
  const chunks = [];
  for (let offset = 8; offset < raw.length;) {
    const length = raw.readUInt32BE(offset), kind = raw.toString('ascii', offset + 4, offset + 8);
    if (kind === 'IDAT') chunks.push(raw.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  assert.equal(filtered.length, height * (stride + 1));
  const rgba = Buffer.alloc(height * stride);
  for (let row = 0; row < height; row++) {
    const filter = filtered[row * (stride + 1)];
    assert.ok(filter <= 4);
    for (let col = 0; col < stride; col++) {
      const at = row * stride + col;
      const left = col >= 4 ? rgba[at - 4] : 0, up = row ? rgba[at - stride] : 0;
      const upperLeft = row && col >= 4 ? rgba[at - stride - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upperLeft, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? up : upperLeft;
      }
      rgba[at] = (filtered[row * (stride + 1) + col + 1] + predictor) & 255;
    }
  }
  return { width, height, rgba };
}

test('Fine distribution is the genuine 2020 equal-area population model with 24 audited originals',()=>{
 assert.equal(manifest.populationYear,2020);assert.equal(inputs.product,'GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0');
 assert.equal(inputs.tiles.length,24);assert.equal(new Set(inputs.tiles.map(t=>t.file)).size,24);
 for(const tile of inputs.tiles){assert.match(tile.sha256,/^[a-f0-9]{64}$/);assert.match(tile.memberSha256,/^[a-f0-9]{64}$/);assert.equal(tile.originalRasterMetadata.noData,-200);assert.deepEqual(tile.originalRasterMetadata.resolutionMetres,[1000,1000]);assert.equal(tile.originalRasterMetadata.crs,'ESRI:54009');}
 assert.equal(manifest.processing.sourceAggregationMetres,5000);assert.match(manifest.processing.display,/No continuous interpolation/);
 assert.match(manifest.limitations.join(' '),/not 2021 Census/);assert.match(manifest.limitations.join(' '),/Do not sum display pixels/);
});
test('Missing cells and genuine zero values stay distinct throughout the complete lookup',()=>{
 assert.equal(bytes.length,manifest.width*manifest.height*4);assert(cells.every(v=>Number.isFinite(v)&&(v>=0||v===-1)));
 assert.equal(cells.filter(v=>v>=0).length,manifest.coverage.validPixels);assert.equal(cells.filter(v=>v===0).length,389522);
 assert.equal(cells.filter(v=>v>0).length,manifest.coverage.positivePixels);
 assert.equal(cells.filter(v=>v===-1).length,manifest.coverage.noDataInsideCanadaPixels+manifest.coverage.outsideCanadaPixels);
 assert.equal(manifest.noData,-1);assert(manifest.coverage.noDataInsideCanadaPixels>0);
});
test('Ten real CMA reference coordinates retain the audited original 5 km sample, never the CMA total',()=>{
 assert.equal(manifest.knownPlaceSamples.length,10);
 for(const record of manifest.knownPlaceSamples){const [col,row]=record.pixel;assert.equal(cells[row*manifest.width+col],record.noData?-1:record.densityPeoplePerKm2);assert.match(record.coordinateMeaning,/not municipal centre/);}
 assert.equal(manifest.knownPlaceSamples.find(r=>r.id==='933').densityPeoplePerKm2,1940.1361083984375);
});
test('Published image, Float32 lookup, source inventory and producer match their recorded byte hashes',async()=>{
 for(const [file,record]of Object.entries(manifest.files)){const raw=await readFile(base+file);assert.equal(raw.length,record.bytes);assert.equal(sha(raw),record.sha256);}
 assert.equal(sha(await readFile('scripts/prepare-canada-population-grid.py')),manifest.processing.scriptSha256);
 assert.equal(sha(await readFile(manifest.processing.boundaryFile)),manifest.processing.boundarySha256);
 assert.equal(sha(await readFile(manifest.processing.citySampleCoordinatesFile)),manifest.processing.citySampleCoordinatesSha256);
});


test('Every published PNG pixel represents the same density lookup, including transparent missing cells',async()=>{
 const png=pngPixels(await readFile(base+'density.png'));assert.equal(png.width,manifest.width);assert.equal(png.height,manifest.height);
 const colors=manifest.colors.map(color=>[...color.slice(1).match(/../g).map(c=>parseInt(c,16)),255]);
 for(let i=0;i<cells.length;i++){
  const expected=cells[i]===-1?[0,0,0,0]:colors[manifest.breaks.filter(b=>cells[i]>=b).length];
  for(let channel=0;channel<4;channel++)if(png.rgba[i*4+channel]!==expected[channel])assert.fail('Source image/grid mismatch at '+i);
 }
});
