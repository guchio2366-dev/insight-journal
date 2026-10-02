import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync, inflateSync } from 'node:zlib';
import { rasterizeRings, project } from '../../scripts/europe/prepare-drainage.mjs';
import { displayCell, frame } from '../../src/lib/atlas-europe-view.ts';
import { drainageLayer, drainageReading } from '../../src/data/atlas/europe/drainage-reading.ts';

const root = new URL('../../', import.meta.url);
const bytes = filename => readFileSync(new URL(filename, root));
const json = filename => JSON.parse(bytes(filename).toString('utf8'));
const base = 'public/assets/atlas/europe/drainage-v1/';
const manifest = json(base + 'manifest.json');
const basins = json(base + 'basins.json');
const proof = json('data-source/atlas/europe/drainage/selected-inputs.json');
const validation = json('data-source/atlas/europe/drainage/validation.json');
const raw = gunzipSync(bytes(base + 'values.bin.gz'));
const grid = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const sha = value => createHash('sha256').update(value).digest('hex');

test('actual BasinATLAS source entries, CC BY evidence, hashes and frame are retained', () => {
  assert.equal(manifest.license, 'CC BY 4.0');
  assert.equal(proof.licenseEvidence.figshareArticle.license.name, 'CC BY 4.0');
  assert.deepEqual(proof.licenseEvidence.figshareArticle.authors, ['Bernhard Lehner','Simon Linke','Michele Thieme']);
  assert.equal(proof.officialArchive.id, 20087237);
  assert.equal(proof.officialArchive.bytes, 4276492333);
  assert.equal(proof.officialArchive.wholeArchiveRetrieved, false);
  assert.equal(proof.officialArchive.wholeArchiveMd5Verified, false);
  assert.equal(proof.files.length, 4);
  for (const file of proof.files) {
    assert.ok(file.sourceFilename.startsWith('BasinATLAS_v10_lev04.'));
    assert.equal(file.crc32Verified, true);
    assert.match(file.sha256, /^[0-9a-f]{64}$/);
    assert.equal(file.fetchedRanges.length, 2);
  }
  assert.equal(proof.files.find(file => file.sourceFilename.endsWith('.shp')).sha256, '8eaf6b93575654dfedcae985a0c592c534e5cb2239fe5ad9daeba3355f6057ad');
  assert.deepEqual(manifest.bounds, [-25, 32, 65, 73]);
  assert.deepEqual(manifest.frame, frame);
  assert.equal(manifest.projection, 'EPSG:3857');
  assert.equal(raw.length, 1800 * 1502 * 4);
  assert.equal(manifest.lookup.gridType, 'display');
  assert.equal(manifest.processing.imageAndPickingUseSameMask, true);
  assert.equal(manifest.processing.originalGeometrySimplified, false);
  assert.equal(manifest.processing.gapFilling, false);
  assert.equal(manifest.processing.rawSourceIncludedInRepository, false);
  for (const [name, record] of Object.entries(manifest.files)) { assert.equal(sha(bytes(base + name)), record.sha256, name); assert.equal(bytes(base + name).length, record.bytes); }
  for (const input of manifest.inputs) assert.equal(sha(bytes(input.path)), input.sha256, input.path);
});

test('actual display-contributing basic identifier records include all relevant source regions', () => {
  assert.equal(basins.length, manifest.validation.visibleBasinUnits);
  assert.equal(basins.length, validation.selectedFeatures);
  assert.equal(new Set(basins.map(basin => basin.HYBAS_ID)).size, basins.length);
  assert.deepEqual(validation.selectedSourceRegions, {2:125,3:5,4:1});
  for (let i = 0; i < basins.length; i++) {
    const basin = basins[i];
    assert.deepEqual(Object.keys(basin), ['index', 'HYBAS_ID', 'PFAF_ID', 'NEXT_DOWN', 'MAIN_BAS']);
    assert.equal(basin.index, i + 1);
    assert.match(String(basin.HYBAS_ID), /^\d04\d{7}$/);
    for (const value of Object.values(basin)) assert.ok(Number.isSafeInteger(value) && value >= 0);
    assert.ok(drainageLayer.valueLabels[basin.index].includes(String(basin.HYBAS_ID)));
    assert.ok(drainageLayer.valueLabels[basin.index].includes(String(basin.PFAF_ID)));
  }
  assert.equal(Object.keys(drainageLayer.valueLabels).length, basins.length);
  assert.equal(drainageLayer.id, 'drainage');
  assert.equal(drainageLayer.field, 'nature');
  assert.equal(drainageLayer.nodata, -1);
  assert.equal(drainageLayer.gridType, 'display');
  assert.equal(drainageLayer.breaks, undefined, 'categorical units have no quantitative breaks');
  assert.deepEqual(drainageLayer.colors, manifest.colors);
});

test('all 2,703,600 image pixels exactly match the integer float32 lookup and missing mask', () => {
  const png = bytes(base + 'drainage.png'), imageData = [];
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.subarray(offset + 4, offset + 8).toString('ascii'), data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { assert.equal(data.readUInt32BE(0), 1800); assert.equal(data.readUInt32BE(4), 1502); assert.equal(data[8], 8); assert.equal(data[9], 6); }
    if (type === 'IDAT') imageData.push(data);
    offset += length + 12;
  }
  const scanlines = inflateSync(Buffer.concat(imageData));
  assert.equal(scanlines.length, 1502 * (1800 * 4 + 1));
  const colors = manifest.colorAssignments.map(item => Buffer.from(item.color.slice(1), 'hex'));
  const counts = Array(basins.length).fill(0);
  let mismatches = 0, valid = 0, adjacentSameColor = 0;
  for (let row = 0; row < 1502; row++) assert.equal(scanlines[row * (1800 * 4 + 1)], 0);
  for (let p = 0; p < grid.length; p++) {
    const row = Math.floor(p / 1800), col = p % 1800, offset = row * (1800 * 4 + 1) + 1 + col * 4, value = grid[p];
    if (value === -1) { if (scanlines[offset + 3] !== 0) mismatches++; continue; }
    if (!Number.isInteger(value) || value < 1 || value > basins.length) { mismatches++; continue; }
    counts[value - 1]++; valid++;
    const color = colors[value - 1];
    if (scanlines[offset + 3] !== 255 || scanlines[offset] !== color[0] || scanlines[offset + 1] !== color[1] || scanlines[offset + 2] !== color[2]) mismatches++;
    for (const neighbor of [col < 1799 ? grid[p + 1] : -1, row < 1501 ? grid[p + 1800] : -1]) if (neighbor > 0 && neighbor !== value && manifest.colorAssignments[value - 1].color === manifest.colorAssignments[neighbor - 1].color) adjacentSameColor++;
  }
  assert.equal(mismatches, 0);
  assert.equal(adjacentSameColor, 0, 'different neighboring units have different categorical colors');
  assert.equal(valid, manifest.validation.validDisplayPixels);
  assert.equal(counts.filter(count => count > 0).length, basins.length, 'all metadata units actually contribute to the displayed mask');
  assert.deepEqual(counts, manifest.colorAssignments.map(item => item.displayPixelCenters));
});

test('pixel-centre polygon filling preserves holes without expanding boundaries', () => {
  const mask = new Uint16Array(1800 * 1502);
  rasterizeRings(mask, [ [[0,50],[4,50],[4,54],[0,54],[0,50]], [[1,51],[3,51],[3,53],[1,53],[1,51]] ], 7);
  const at = point => { const [x,y] = project(point); return mask[Math.floor(y)*1800+Math.floor(x)]; };
  assert.equal(at([.5,52]), 7);
  assert.equal(at([2,52]), 0, 'an interior hole stays missing');
  assert.equal(at([-.5,52]), 0, 'the polygon is not expanded into nearby gaps');
  assert.equal(at([2,54.5]), 0);
});

test('known source examples use shared EPSG:3857 picking, including a coastal pixel-centre distinction', () => {
  const expected = { London:2040048790, Paris:2040022150, Berlin:2040024170, Warsaw:2040026550, Moscow:2040315940, Helsinki:2040028670, Reykjavik:2040057170, Oslo:2040033480, Rome:2040014550, Madrid:2040018840, 'Russia 60E/60N':3040481930, 'Russia 64E/55N':3040481930, 'Russia 61E/65N':3040203170 };
  for (const sample of validation.geometrySamples) {
    const picked = displayCell(grid, sample.point, -1);
    assert.equal(picked.value, sample.lookupIndex, sample.name);
    assert.equal(basins[picked.value - 1].HYBAS_ID, expected[sample.name], sample.name);
    assert.equal(sample.sourceDisplayCenterHYBAS_ID, expected[sample.name]);
    for (let i=0;i<2;i++) assert.ok(Math.abs(picked.center[i]-sample.displayCenter[i])<1e-10);
  }
  assert.equal(validation.geometrySamples.find(sample => sample.name === 'Reykjavik').sourcePointHYBAS_ID, null, 'do not pretend an exact coastal point and its raster centre are identical');
  assert.equal(displayCell(grid, [-15,50], -1).value, null);
  assert.equal(displayCell(grid, [65,55], -1), null);
  assert.equal(displayCell(grid, [0,32], -1), null);
});

test('45-country coverage and explanatory text retain missingness and model limits', () => {
  assert.equal(manifest.countryCoverage.length, 45);
  assert.deepEqual(manifest.validation.unresolvedDisplayCountries, ['VAT','MCO']);
  assert.deepEqual(manifest.validation.allMissingDisplayCountries, []);
  for (const country of manifest.countryCoverage) assert.equal(country.displayPixelCenters, country.validDisplayPixelCenters+country.missingDisplayPixelCenters);
  assert.equal(manifest.countryCoverage.reduce((sum,c)=>sum+c.validDisplayPixelCenters,0), manifest.validation.validDisplayPixels);
  assert.equal(validation.overlapPixelsBeforeCountryClipping, 0);
  assert.equal(manifest.sourceGlobalFeatures, 1342);
  assert.equal(manifest.sourceRegionFeatures, basins.length);
  assert.equal(manifest.validation.visibleBasinUnits, basins.length);
  assert.match(manifest.sourceSelection, /All 1342 global/);
  assert.equal(manifest.processing.quantityDerived, false);
  assert.match(drainageReading.note, /北緯60度/);
  assert.match(drainageReading.note, /流量・地下水量/);
  assert.match(drainageReading.body, /流域全体/);
  assert.match(drainageReading.note, /色に量の順序はありません/);
  assert.match(drainageReading.disclaimer, /無保証/);
});

const cache = new URL('../europe-water-research/', root);
const rawSourceAvailable = ['shp','dbf','shx','prj'].every(ext => existsSync(new URL(`BasinATLAS_v10_lev04.${ext}`, cache)));
test('verified private BasinATLAS bytes independently confirm identifier rows and native polygon containment', { skip: !rawSourceAvailable }, () => {
  const source = Object.fromEntries(['shp','dbf','shx','prj'].map(ext => [ext,readFileSync(new URL(`BasinATLAS_v10_lev04.${ext}`,cache))]));
  for(const file of proof.files) assert.equal(sha(source[file.sourceFilename.split('.').at(-1)]),file.sha256);
  const dbf=source.dbf, h=dbf.readUInt16LE(8), r=dbf.readUInt16LE(10), fields={}; let fieldOffset=1;
  for(let p=32;dbf[p]!==13;p+=32){ const name=dbf.subarray(p,p+11).toString().replace(/\0.*$/,''); fields[name]={offset:fieldOffset,length:dbf[p+16]}; fieldOffset+=dbf[p+16]; }
  const rows=[];
  for(let row=0;row<dbf.readUInt32LE(4);row++){
    const record={}; for(const name of ['HYBAS_ID','PFAF_ID','NEXT_DOWN','MAIN_BAS']){ const f=fields[name],p=h+row*r+f.offset;record[name]=Number(dbf.subarray(p,p+f.length).toString().trim()); }
    rows.push({row,...record});
  }
  rows.sort((a,b)=>a.HYBAS_ID-b.HYBAS_ID);
  assert.equal(rows.length,1342);
  const actualById=new Map(rows.map(({row,...ids})=>[ids.HYBAS_ID,ids]));
  for(const basin of basins) assert.deepEqual(basin,{index:basin.index,...actualById.get(basin.HYBAS_ID)});
  // Independent nonzero winding test in native longitude/latitude; rendering uses scanlines in projected space.
  function contains(row,[x,y]){
    const p=source.shx.readUInt32BE(100+row*8)*2+8, parts=source.shp.readUInt32LE(p+36),points=source.shp.readUInt32LE(p+40),start=p+44+parts*4;
    let winding=0;
    for(let part=0;part<parts;part++){
      const first=source.shp.readUInt32LE(p+44+part*4),last=part+1<parts?source.shp.readUInt32LE(p+48+part*4):points;
      for(let i=first;i<last-1;i++){
        const ax=source.shp.readDoubleLE(start+i*16),ay=source.shp.readDoubleLE(start+i*16+8),bx=source.shp.readDoubleLE(start+(i+1)*16),by=source.shp.readDoubleLE(start+(i+1)*16+8);
        const side=(bx-ax)*(y-ay)-(x-ax)*(by-ay);
        if(ay<=y&&by>y&&side>0)winding++;
        else if(ay>y&&by<=y&&side<0)winding--;
      }
    }
    return winding!==0;
  }
  for(const sample of validation.geometrySamples){
    const atPoint=rows.find(record=>contains(record.row,sample.point));
    const atCenter=rows.find(record=>contains(record.row,sample.displayCenter));
    assert.equal(atPoint?.HYBAS_ID??null,sample.sourcePointHYBAS_ID,sample.name+' exact point');
    assert.equal(atCenter?.HYBAS_ID??null,sample.sourceDisplayCenterHYBAS_ID,sample.name+' display centre');
    assert.equal(atCenter.HYBAS_ID,basins[sample.lookupIndex-1].HYBAS_ID);
  }
});
