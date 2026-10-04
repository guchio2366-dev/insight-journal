import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync,inflateSync} from 'node:zlib';
import {
  ASIA_SEASONAL_MONTHS,ASIA_SEASONAL_BREAKS,ASIA_SEASONAL_COLORS,normalizeAsiaSeasonalMonth,
  validateAsiaSeasonalManifest,decodeAsiaSeasonalGrid,asiaSeasonalCellAt,readAsiaSeasonalSeries,
  readAsiaSeasonalCell,asiaSeasonalPrecipitationColor,
} from '../../src/lib/atlas-asia-seasonal-precipitation.ts';
import {makeCountryMask,monthlySourceValue} from '../../scripts/prepare-asia-seasonal-precipitation.mjs';

const assets=new URL('../../public/assets/atlas/asia-seasonal-precipitation-v1/',import.meta.url);
const root=new URL('../../',import.meta.url);
const read=name=>readFileSync(new URL(name,assets));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=validateAsiaSeasonalManifest(JSON.parse(read('manifest.json')));
const validation=JSON.parse(readFileSync(new URL('data-source/atlas/asia/seasonal-precipitation/validation.json',root)));
const regions=Object.fromEntries(await Promise.all(Object.entries(manifest.regions).map(async([id,record])=>[id,{record,grid:await decodeAsiaSeasonalGrid(read(record.values),record)}])));

test('pinned GPCC monthly source, period, rights, input hashes and all 39 asset hashes remain reviewable',()=>{
  assert.equal(manifest.source.inputSha256,'3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5');
  assert.equal(manifest.source.license,'CC BY 4.0');
  assert.equal(manifest.source.doi,'https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025');
  assert.equal(manifest.period,'1991–2020');assert.equal(manifest.unit,'mm/month');
  assert.equal(validation.sourceRecords,12);assert.equal(validation.sourceRecordStrideBytes,20736008);
  assert.equal(validation.sourceVariableRecordBytes,4147200);assert.equal(validation.sourceVariableOffset,21040);
  assert.deepEqual(validation.sourcePeriod,['1991-01-01','2020-12-31']);
  assert.deepEqual([validation.coordinates.firstLatitude,validation.coordinates.lastLatitude],[89.875,-89.875]);
  assert.equal(validation.coordinates.declaredLatitudeUnit,'degrees_south');
  assert.equal(Object.keys(manifest.files).length,39);
  for(const[name,file]of Object.entries(manifest.files)){const bytes=read(name);assert.equal(bytes.length,file.bytes,name);assert.equal(sha(bytes),file.sha256,name);}
  for(const input of manifest.inputs)assert.equal(sha(readFileSync(new URL(input.path,root))),input.sha256,input.path);
  assert.equal(sha(readFileSync(new URL(manifest.processing.script,root))),manifest.processing.scriptSha256);
  assert.ok(!Object.keys(manifest.files).some(name=>/\.nc(?:\.gz)?$/.test(name)));
  assert.match(manifest.source.sourceMethod,/at least 20 complete years/);
  assert.match(manifest.source.sourceMethod,/not 30 years of complete observations/);
  assert.ok(manifest.limitations.some(note=>/not a city average/.test(note)));
  assert.ok(manifest.limitations.some(note=>/crop calendars/.test(note)));
  assert.ok(manifest.limitations.some(note=>/available water supply/.test(note)));
});

test('source monthly stride skips ancillary fields and preserves real zero versus GPCC fill',()=>{
  const bytes=Buffer.alloc(16+12*64),variable={offset:16,attributes:{_FillValue:-99999.9921875}};
  for(let month=1;month<=12;month++){bytes.writeFloatBE(month*10,16+(month-1)*64);bytes.writeFloatBE(0,20+(month-1)*64);bytes.writeFloatBE(-99999.9921875,24+(month-1)*64);}
  assert.deepEqual(Array.from({length:12},(_,index)=>monthlySourceValue(bytes,variable,64,index+1,0)),Array.from({length:12},(_,index)=>(index+1)*10));
  assert.equal(monthlySourceValue(bytes,variable,64,7,1),0);assert.equal(monthlySourceValue(bytes,variable,64,7,2),-1);
  assert.throws(()=>monthlySourceValue(bytes,variable,64,13,0));
});

test('source cell alignment, row orientation, native dimensions and independently pinned known-location months',()=>{
  assert.deepEqual(Object.keys(regions).sort(),['east-asia','south-central-asia','southeast-asia']);
  const sizes={'east-asia':[300,152],'southeast-asia':[212,168],'south-central-asia':[224,236]};
  for(const[id,{record,grid}]of Object.entries(regions)){
    assert.deepEqual([record.width,record.height],sizes[id]);
    assert.equal(grid.values.length,record.width*record.height*12);
    assert.equal(record.sourceCellDegrees,.25);assert.equal(record.rowOrder,'north-to-south');
    const[west,south,east,north]=record.bounds4326;
    assert.deepEqual(asiaSeasonalCellAt(grid,west+.125,north-.125),{column:0,row:0,index:0,center:[west+.125,north-.125]});
    assert.deepEqual(asiaSeasonalCellAt(grid,east-.125,south+.125).center,[east-.125,south+.125]);
    assert.equal(asiaSeasonalCellAt(grid,east,north),null);assert.equal(asiaSeasonalCellAt(grid,west,south),null);
    assert.equal(asiaSeasonalCellAt(grid,NaN,north),null);
    for(const sample of validation.regions[id].sourceSamples){
      const expected=sample.deliveredMonthlyNormals.map(value=>value<0?null:value);
      assert.deepEqual(readAsiaSeasonalSeries(grid,...sample.locator),expected.every(value=>value===null)?null:expected,sample.name);
      assert.notDeepEqual(sample.rawMonthlyNormals,sample.flippedLatitudeMonthlyNormals,sample.name);
      assert.deepEqual(asiaSeasonalCellAt(grid,...sample.locator).center,sample.sourceCell.center);
    }
  }
  const beijing=[2.240000009536743,5.460000038146973,8.359999656677246,21.809999465942383,36.5,76.5999984741211,170.72000122070312,112.13999938964844,53.58000183105469,28.030000686645508,12.979999542236328,2.299999952316284];
  assert.deepEqual(readAsiaSeasonalSeries(regions['east-asia'].grid,116.4,39.9),beijing);
  assert.equal(readAsiaSeasonalCell(regions['southeast-asia'].grid,106.84,-6.21,'m-01'),376.42999267578125);
  assert.equal(readAsiaSeasonalCell(regions['south-central-asia'].grid,77.21,28.61,'m-07'),195.63999938964844);
});

test('region masks remain independent, retain holes and do not borrow coastal or microstate cells',()=>{
  const polygon={type:'Feature',properties:{code:'AAA'},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]],[[.25,.25],[.75,.25],[.75,.75],[.25,.75],[.25,.25]]]}};
  const mask=makeCountryMask([polygon],[0,0,1,1],4,4,['AAA']);
  assert.deepEqual([...mask],[1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1]);
  assert.ok(makeCountryMask([polygon],[0,0,1,1],4,4,['BBB']).every(value=>value===0));
  assert.equal(readAsiaSeasonalSeries(regions['south-central-asia'].grid,91,31),null,'Chinese land outside south-central targets');
  assert.ok(readAsiaSeasonalSeries(regions['east-asia'].grid,91,31),'same original cell in east target region');
  assert.equal(readAsiaSeasonalSeries(regions['east-asia'].grid,77.21,28.61),null,'Indian land outside east targets');
  assert.ok(readAsiaSeasonalSeries(regions['south-central-asia'].grid,77.21,28.61));
  assert.equal(readAsiaSeasonalSeries(regions['east-asia'].grid,139.76,35.68),null,'Tokyo Bay source centre remains masked');
  assert.equal(readAsiaSeasonalSeries(regions['south-central-asia'].grid,73.51,4.18),null,'Maldives has no original land centre');
  assert.deepEqual(validation.regions['south-central-asia'].unresolvedCountries,['MDV']);
  assert.equal(regions['southeast-asia'].record.countryCoverage.find(entry=>entry.code==='SGP').completeSourceCellCenters,1);
});

test('all cube values and real-zero monthly counts agree with coverage, not missing sentinels',()=>{
  let zeroCount=0;
  for(const[id,{record,grid}]of Object.entries(regions)){
    const size=record.width*record.height;
    for(let month=0;month<12;month++){
      let valid=0,zero=0,missing=0,minimum=Infinity,maximum=-Infinity;
      for(let index=0;index<size;index++){
        const value=grid.values[month*size+index];assert.ok(Number.isFinite(value)&&value>=-1);
        if(value===-1)missing++;
        else {assert.ok(value>=0);valid++;if(value===0)zero++;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}
      }
      const expected=validation.regions[id].monthlyStatistics[month];
      assert.deepEqual([valid,zero,missing,minimum,maximum],[expected.validCells,expected.zeroCells,expected.missingCells,expected.minimum,expected.maximum]);
      zeroCount+=zero;
    }
  }
  assert.ok(zeroCount>500,'actual GPCC zero values survive independently of missing values');
});

function decodePng(raw){
  assert.deepEqual(raw.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
  const width=raw.readUInt32BE(16),height=raw.readUInt32BE(20);assert.equal(raw[24],8);assert.equal(raw[25],6);assert.equal(raw[28],0);
  const chunks=[];
  for(let offset=8;offset<raw.length;){const length=raw.readUInt32BE(offset);if(raw.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(raw.subarray(offset+8,offset+8+length));offset+=length+12;}
  const rows=inflateSync(Buffer.concat(chunks)),rgba=Buffer.alloc(width*height*4);
  assert.equal(rows.length,height*(width*4+1));
  for(let row=0;row<height;row++){assert.equal(rows[row*(width*4+1)],0);rows.copy(rgba,row*width*4,row*(width*4+1)+1,(row+1)*(width*4+1));}
  return{width,height,rgba};
}

test('every pixel of all 36 small Mercator PNGs matches its actual original geographic monthly cell and fixed class',()=>{
  const thresholds=[10,25,50,100,150,200,300];
  const palette=['f3ead6','e2e5c7','c8dbc8','a6cfcf','7ab9cb','4c9abd','2778a5','14537d'].map(color=>[...Buffer.from(color,'hex'),255]);
  let pixelCount=0;
  for(const[id,{record,grid}]of Object.entries(regions)){
    const[west,south,east,north]=record.bounds4326,display=record.display;
    assert.equal(display.width,record.width);assert.ok(display.width<=300&&display.height<=300);
    const project=lat=>Math.asinh(Math.tan(lat*Math.PI/180)),top=project(north),bottom=project(south);
    const indices=[];
    for(let row=0;row<display.height;row++)for(let column=0;column<display.width;column++){
      const longitude=west+(column+.5)/display.width*(east-west);
      const latitude=Math.atan(Math.sinh(top-(row+.5)/display.height*(top-bottom)))*180/Math.PI;
      const sourceColumn=Math.floor((longitude+180)/.25),sourceRow=Math.floor((90-latitude)/.25);
      indices.push((sourceRow-record.sourceRowOffset)*record.width+sourceColumn-record.sourceColumnOffset);
    }
    for(let month=0;month<12;month++){
      const image=decodePng(read(record.months[month].image));assert.deepEqual([image.width,image.height],[display.width,display.height]);
      for(let index=0;index<indices.length;index++){
        const value=grid.values[month*record.width*record.height+indices[index]],expected=value<0?[0,0,0,0]:palette[thresholds.filter(threshold=>value>=threshold).length];
        for(let channel=0;channel<4;channel++)if(image.rgba[index*4+channel]!==expected[channel])assert.fail(`${id} month ${month+1} pixel ${index} differs from native cell`);
        pixelCount++;
      }
    }
  }
  assert.ok(pixelCount>1_800_000);
});

test('month handling defaults to July, preserves all twelve choices and shares exact threshold semantics',()=>{
  assert.equal(normalizeAsiaSeasonalMonth(null),'m-07');assert.equal(normalizeAsiaSeasonalMonth('m-13'),'m-07');
  assert.equal(normalizeAsiaSeasonalMonth('m-01'),'m-01');assert.equal(normalizeAsiaSeasonalMonth('12'),'m-12');
  assert.deepEqual(ASIA_SEASONAL_MONTHS.map(month=>normalizeAsiaSeasonalMonth(month.month)),ASIA_SEASONAL_MONTHS.map(month=>month.id));
  assert.deepEqual([...ASIA_SEASONAL_BREAKS],[10,25,50,100,150,200,300]);
  assert.equal(asiaSeasonalPrecipitationColor(0),ASIA_SEASONAL_COLORS[0]);assert.equal(asiaSeasonalPrecipitationColor(-1),null);
  ASIA_SEASONAL_BREAKS.forEach((value,index)=>{assert.equal(asiaSeasonalPrecipitationColor(value-.001),ASIA_SEASONAL_COLORS[index]);assert.equal(asiaSeasonalPrecipitationColor(value),ASIA_SEASONAL_COLORS[index+1]);});
});

const synthetic=()=>{
  const bytes=Buffer.alloc(2*2*12*4);
  for(let month=0;month<12;month++)[month===0?0:month,10+month,-1,month===5?-1:30+month].forEach((value,index)=>bytes.writeFloatLE(value,(month*4+index)*4));
  const metadata={...manifest.regions['east-asia'],width:2,height:2,bounds4326:[0,0,.5,.5],firstCellCenter:[.125,.375],lastCellCenter:[.375,.125],sourceColumnOffset:720,sourceRowOffset:358,uncompressedBytes:bytes.length,uncompressedSha256:sha(bytes)};
  return{bytes,metadata};
};

test('decoder reads month-major LE float32, preserves partial missing months and verifies decompressed integrity',async()=>{
  const{bytes,metadata}=synthetic();const grid=await decodeAsiaSeasonalGrid(gzipSync(bytes),metadata);
  assert.deepEqual(readAsiaSeasonalSeries(grid,.125,.375),[0,1,2,3,4,5,6,7,8,9,10,11]);
  assert.deepEqual(readAsiaSeasonalSeries(grid,.375,.125),[30,31,32,33,34,null,36,37,38,39,40,41]);
  assert.equal(readAsiaSeasonalSeries(grid,.125,.125),null);
  assert.equal(readAsiaSeasonalCell(grid,.125,.375,'m-01'),0);assert.equal(readAsiaSeasonalCell(grid,.375,.125,'m-06'),null);
  assert.deepEqual((await decodeAsiaSeasonalGrid(bytes,metadata)).values,grid.values);
  await assert.rejects(decodeAsiaSeasonalGrid(bytes.subarray(0,bytes.length-4),metadata),/byte length/);
  const corrupt=Buffer.from(bytes);corrupt.writeFloatLE(5,0);await assert.rejects(decodeAsiaSeasonalGrid(corrupt,metadata),/checksum/);
  const invalid=Buffer.from(bytes);invalid.writeFloatLE(NaN,0);await assert.rejects(decodeAsiaSeasonalGrid(invalid,{...metadata,uncompressedSha256:sha(invalid)}),/Invalid seasonal precipitation value/);
});

test('manifest rejects period, coordinate orientation, dimensions, month order, class, source and asset tampering',()=>{
  const invalid=modify=>{const value=structuredClone(manifest);modify(value);assert.throws(()=>validateAsiaSeasonalManifest(value));};
  invalid(value=>value.period='1981–2010');invalid(value=>value.source.inputSha256='0'.repeat(64));
  invalid(value=>value.regions['east-asia'].rowOrder='south-to-north');invalid(value=>value.regions['east-asia'].width++);
  invalid(value=>value.regions['east-asia'].bounds4326[0]+=.125);invalid(value=>value.regions['east-asia'].firstCellCenter.reverse());
  invalid(value=>value.regions['east-asia'].display.bounds3857[0]+=100);
  invalid(value=>value.regions['east-asia'].months[0].month=2);invalid(value=>value.regions['east-asia'].months[0].image='../outside.png');
  invalid(value=>value.regions['east-asia'].valuesSha256='0'.repeat(64));invalid(value=>value.colors[0]='#000000');
});
