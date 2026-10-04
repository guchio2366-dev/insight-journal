/** Offline, pinned GPCC v2025 monthly normals for three Asia regions.
 * node scripts/prepare-asia-seasonal-precipitation.mjs --source <private .nc.gz>
 * Native numeric cells are never interpolated. Small display PNGs are nearest
 * source-cell samples in Web Mercator, independently of the numeric cube.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readNetcdfHeader,sourceCellIndex} from './prepare-west-asia-precipitation.mjs';
import {ASIA_SEASONAL_MONTHS,ASIA_SEASONAL_BREAKS,ASIA_SEASONAL_COLORS,ASIA_SEASONAL_SOURCE_SHA256,validateAsiaSeasonalManifest} from '../src/lib/atlas-asia-seasonal-precipitation.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public/assets/atlas/asia-seasonal-precipitation-v1');
const provenance=path.join(root,'data-source/atlas/asia/seasonal-precipitation');
export const regionDefinitions={
  'east-asia':{bounds:[72,17,147,55],codes:'CHN JPN KOR MNG PRK TWN'.split(' ')},
  'southeast-asia':{bounds:[90,-12,143,30],codes:'BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM'.split(' ')},
  'south-central-asia':{bounds:[44,-2,100,57],codes:'AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB'.split(' ')},
};
export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const earthRadius=6378137;
const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
const geographic=y=>(2*Math.atan(Math.exp(y))-Math.PI/2)*180/Math.PI;

/** Source cell centre mask. Ring crossing parity preserves polygon holes. */
export function makeCountryMask(features,bounds,width,height,codes) {
  const [west,, ,north]=bounds,mask=new Uint8Array(width*height);
  const project=([lon,lat])=>[(lon-west)*4,(north-lat)*4];
  for(const feature of features) {
    const countryId=codes.indexOf(feature.properties.code)+1;
    if(!countryId)continue;
    const geometry=feature.geometry;
    if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))throw Error('Invalid country mask geometry');
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
    for(const polygon of polygons) {
      const rings=polygon.map(ring=>ring.map(project));
      const ys=rings.flatMap(ring=>ring.map(point=>point[1]));
      const first=Math.max(0,Math.ceil(Math.min(...ys)-.5)),last=Math.min(height-1,Math.floor(Math.max(...ys)-.5));
      for(let row=first;row<=last;row++) {
        const crossings=[],y=row+.5;
        for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
          const a=ring[j],b=ring[i];
          if((a[1]>y)!==(b[1]>y))crossings.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
        }
        crossings.sort((a,b)=>a-b);
        for(let i=0;i+1<crossings.length;i+=2) {
          const left=Math.max(0,Math.ceil(crossings[i]-.5)),right=Math.min(width-1,Math.floor(crossings[i+1]-.5));
          for(let column=left;column<=right;column++)mask[row*width+column]=countryId;
        }
      }
    }
  }
  return mask;
}

export function monthlySourceValue(bytes,variable,recordStride,month,sourceIndex) {
  if(!Number.isInteger(month)||month<1||month>12||sourceIndex<0||sourceIndex>=1440*720)throw Error('Invalid source month/cell');
  const value=bytes.readFloatBE(variable.offset+(month-1)*recordStride+sourceIndex*4);
  return Number.isFinite(value)&&value>=0&&value!==variable.attributes._FillValue?value:-1;
}

const crcTable=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^value>>>1:value>>>1;return value>>>0;});
const crc32=bytes=>{let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^value>>>8;return (value^0xffffffff)>>>0;};
function pngChunk(type,data) {
  const name=Buffer.from(type),buffer=Buffer.alloc(data.length+12);buffer.writeUInt32BE(data.length,0);name.copy(buffer,4);data.copy(buffer,8);
  buffer.writeUInt32BE(crc32(Buffer.concat([name,data])),data.length+8);return buffer;
}
export function encodePng(rgba,width,height) {
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc(height*(width*4+1));
  for(let row=0;row<height;row++)rgba.copy(rows,row*(width*4+1)+1,row*width*4,(row+1)*width*4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',zlib.deflateSync(rows,{level:9})),pngChunk('IEND',Buffer.alloc(0))]);
}

export function displayCellCoordinate(bounds,width,height,column,row) {
  const [west,south,east,north]=bounds,top=mercator(north),bottom=mercator(south);
  return [west+(column+.5)/width*(east-west),geographic(top-(row+.5)/height*(top-bottom))];
}

const validationPlaces={
  'east-asia':[['Tokyo',139.76,35.68],['Beijing',116.4,39.9],['Ulaanbaatar',106.92,47.92]],
  'southeast-asia':[['Bangkok',100.5,13.75],['Jakarta',106.84,-6.21],['Hanoi',105.85,21.03]],
  'south-central-asia':[['New Delhi',77.21,28.61],['Dhaka',90.41,23.81],['Tashkent',69.24,41.3]],
};

export async function prepareAsiaSeasonalPrecipitation(sourcePath) {
  const archive=await fs.readFile(sourcePath);
  if(sha256(archive)!==ASIA_SEASONAL_SOURCE_SHA256)throw Error('Pinned GPCC archive checksum mismatch');
  const bytes=zlib.gunzipSync(archive),header=readNetcdfHeader(bytes);
  const variable=header.variables.find(item=>item.name==='gpcc_precip');
  const lon=header.variables.find(item=>item.name==='lon'),lat=header.variables.find(item=>item.name==='lat');
  if(header.records!==12||header.globals.time_coverage_start!=='1991-01-01'||header.globals.time_coverage_end!=='2020-12-31'||
     !header.globals.title.includes('1991-2020')||variable?.attributes.units!=='mm/month'||variable.type!==5||variable.recordBytes!==1440*720*4||
     variable.dimensions.map(item=>item.name).join(',')!=='time,lat,lon'||lon?.type!==6||lat?.type!==6)throw Error('Unexpected GPCC period or variable');
  const longitudeCenters=Array.from({length:1440},(_,index)=>bytes.readDoubleBE(lon.offset+index*8));
  const latitudeCenters=Array.from({length:720},(_,index)=>bytes.readDoubleBE(lat.offset+index*8));
  if(!longitudeCenters.every((value,index)=>value===-179.875+index*.25)||!latitudeCenters.every((value,index)=>value===89.875-index*.25))throw Error('Unexpected source orientation');
  // CDF2 record variables are interleaved: stepping by gpcc_precip.recordBytes
  // alone would select ancillary variables instead of the next month.
  const recordStride=header.variables.filter(item=>item.dimensions[0]?.name==='time').reduce((sum,item)=>sum+item.recordBytes,0);
  if(recordStride!==20736008||bytes.length<variable.offset+11*recordStride+variable.recordBytes)throw Error('Unexpected GPCC record stride');
  for(let month=0;month<12;month++)if(bytes.readDoubleBE(header.variables.find(item=>item.name==='time').offset+month*recordStride)!==month)throw Error('Unexpected GPCC month order');

  const rightsPath='data-source/atlas/west-asia/precipitation/source.json';
  const registrationPath='data-source/atlas/west-asia/precipitation/datacite-registration.json';
  const [rightsBytes,registrationBytes]=await Promise.all([fs.readFile(path.join(root,rightsPath)),fs.readFile(path.join(root,registrationPath))]);
  const rights=JSON.parse(rightsBytes),registration=JSON.parse(registrationBytes);
  if(rights.inputSha256!==ASIA_SEASONAL_SOURCE_SHA256||rights.license!=='CC BY 4.0'||registration.doi!=='10.5676/dwd_gpcc/climat_v2025_025')throw Error('Pinned source/rights evidence mismatch');
  const source={
    dataset:'GPCC Precipitation Analysis Climatology Version 2025 at 0.25°, monthly normals for 1991–2020',
    publisher:registration.publisher.trim(),sourceUrl:rights.sourceUrl,downloadUrl:rights.downloadUrl,checksumUrl:rights.checksumUrl,
    doi:rights.doi,period:'1991-01-01/2020-12-31',edition:'2025',inputSha256:ASIA_SEASONAL_SOURCE_SHA256,inputBytes:archive.length,
    originalResolution:'0.25° regular geographic latitude/longitude cells',sourceCRS:'EPSG:4326',sourceVariable:'gpcc_precip',sourceUnit:'mm/month',sourceNoData:variable.attributes._FillValue,
    sourceMethod:'Rain-gauge-based interpolated monthly climatology for the 1991–2020 reference period. Publisher station eligibility requires at least 20 complete years; the 12 records are monthly normals, not 30 years of complete observations at every cell.',
    license:'CC BY 4.0',licenseUrl:rights.licenseUrl,
    licenseEvidence:{checkedAt:rights.licenseEvidence.checkedAt,publisherLegalNoticeUrl:rights.licenseUrl,publisherLegalNoticeAllowsCcBy40:rights.licenseEvidence.officialIndexedLegalNoticeStatesCcBy40,
      directLegalNoticeStatus:rights.licenseEvidence.directLegalNoticeStatus,dataCiteDoi:registration.doi,dataCiteRightsList:registration.rightsList,
      note:'Inherited exact-product DWD legal-notice evidence is pinned by hash. DataCite lists no registered rights; the CC BY 4.0 basis is the publisher legal notice, not an inferred DataCite license.'},
    attribution:'Rustemeier, Elke; Finger, Peter; Schirmeister, Zora; Ziese, Markus (2025): GPCC Precipitation Analysis Climatology Version 2025 at 0.25°. DOI: 10.5676/DWD_GPCC/CLIMAT_V2025_025. GPCC/DWD, CC BY 4.0. Modified: cropped original monthly cells, target-country cell-centre masks, nearest-neighbour Mercator display and fixed monthly colour classes.',
  };
  const limitations=[
    'These values are interpolated rain-gauge monthly precipitation normals for an original 0.25° grid cell. A named location is a locator for that cell, not a city average or a local station observation.',
    'The 1991–2020 reference period does not imply complete 30-year observations for every cell or station. Station support and interpolation uncertainty differ spatially; no uncertainty interval is invented.',
    'Monthly precipitation alone does not determine crop calendars, planting or harvesting dates, irrigation demand, river discharge, groundwater recharge or available water supply.',
    'Numeric values retain the original source cell centres and north-to-south rows. Small Mercator display images sample the nearest original cell; display pixels add no spatial detail.',
    'Each region uses its own target-country cell-centre mask with polygon holes preserved. Ocean, source missing cells and land outside that mask are missing; a valid zero remains valid.',
    'Small islands, microstates and coastal slivers can contain no original land cell centre. They remain missing rather than borrowing another country’s or a nearby cell’s precipitation.',
    'These are twelve calendar-month climatological normals, not a time series of individual years, annual rainfall totals or country averages.',
  ];
  const inputs=[{path:rightsPath,sha256:sha256(rightsBytes),role:'Existing exact-product DWD rights and source evidence'},{path:registrationPath,sha256:sha256(registrationBytes),role:'Existing publisher DOI registration snapshot; empty rights retained'}];
  const files={},regions={},validationRegions={};
  await fs.mkdir(output,{recursive:true});await fs.mkdir(provenance,{recursive:true});
  const writeAsset=async(name,data)=>{await fs.writeFile(path.join(output,name),data);files[name]={sha256:sha256(data),bytes:data.length};return files[name].sha256;};
  for(const [id,definition] of Object.entries(regionDefinitions)) {
    const bounds=definition.bounds,[west,south,east,north]=bounds,width=(east-west)*4,height=(north-south)*4,size=width*height;
    const sourceColumnOffset=(west+180)*4,sourceRowOffset=(90-north)*4;
    const geographyPath=`public/assets/atlas/asia-population-v1/${id}.geography.json`,geographyBytes=await fs.readFile(path.join(root,geographyPath));
    const countries=JSON.parse(geographyBytes).features.filter(feature=>feature.properties.target);
    if(JSON.stringify(countries.map(feature=>feature.properties.code).sort())!==JSON.stringify([...definition.codes].sort()))throw Error(`Unexpected target countries: ${id}`);
    inputs.push({path:geographyPath,sha256:sha256(geographyBytes),role:`Independent ${id} detailed target-country mask`});
    const mask=makeCountryMask(countries,bounds,width,height,definition.codes),grid=Buffer.alloc(size*12*4);
    const countryCoverage=definition.codes.map(code=>({code,sourceCellCenters:0,completeSourceCellCenters:0}));
    const monthlyStatistics=ASIA_SEASONAL_MONTHS.map(month=>({...month,validCells:0,zeroCells:0,missingCells:0,minimum:null,maximum:null}));
    for(let row=0;row<height;row++)for(let column=0;column<width;column++) {
      const index=row*width+column,country=mask[index],sourceIndex=(sourceRowOffset+row)*1440+sourceColumnOffset+column;
      let complete=Boolean(country);
      if(country)countryCoverage[country-1].sourceCellCenters++;
      for(let month=1;month<=12;month++) {
        const value=country?monthlySourceValue(bytes,variable,recordStride,month,sourceIndex):-1;
        grid.writeFloatLE(value,((month-1)*size+index)*4);
        const statistics=monthlyStatistics[month-1];
        if(value<0){complete=false;statistics.missingCells++;}
        else {statistics.validCells++;if(value===0)statistics.zeroCells++;statistics.minimum=statistics.minimum===null?value:Math.min(statistics.minimum,value);statistics.maximum=statistics.maximum===null?value:Math.max(statistics.maximum,value);}
      }
      if(complete)countryCoverage[country-1].completeSourceCellCenters++;
    }
    const values=`${id}.values.bin.gz`,compressed=zlib.gzipSync(grid,{level:9}),valuesSha256=await writeAsset(values,compressed);
    const displayWidth=width,displayHeight=Math.ceil(width*(mercator(north)-mercator(south))/((east-west)*Math.PI/180));
    const display={width:displayWidth,height:displayHeight,projection:'EPSG:3857',bounds3857:[west*Math.PI/180*earthRadius,mercator(south)*earthRadius,east*Math.PI/180*earthRadius,mercator(north)*earthRadius],resampling:'nearest'};
    const displayIndices=new Int32Array(displayWidth*displayHeight);
    for(let row=0;row<displayHeight;row++)for(let column=0;column<displayWidth;column++) {
      const sourceCell=sourceCellIndex(...displayCellCoordinate(bounds,displayWidth,displayHeight,column,row));
      const localRow=sourceCell.row-sourceRowOffset,localColumn=sourceCell.column-sourceColumnOffset;
      if(localRow<0||localRow>=height||localColumn<0||localColumn>=width)throw Error('Display centre outside native cube');
      displayIndices[row*displayWidth+column]=localRow*width+localColumn;
    }
    const palette=ASIA_SEASONAL_COLORS.map(color=>Buffer.from(color.slice(1),'hex')),months=[];
    for(const month of ASIA_SEASONAL_MONTHS) {
      const rgba=Buffer.alloc(displayWidth*displayHeight*4);
      for(let index=0;index<displayIndices.length;index++) {
        const value=grid.readFloatLE(((month.month-1)*size+displayIndices[index])*4);
        if(value<0)continue;
        const color=palette[ASIA_SEASONAL_BREAKS.filter(threshold=>value>=threshold).length];color.copy(rgba,index*4);rgba[index*4+3]=255;
      }
      const image=`${id}-${month.id}.png`,sha256=await writeAsset(image,encodePng(rgba,displayWidth,displayHeight));
      months.push({id:month.id,month:month.month,image,sha256});
    }
    regions[id]={width,height,bounds4326:bounds,imageCoordinates:[[west,north],[east,north],[east,south],[west,south]],projection:'EPSG:4326',
      sourceCellDegrees:.25,firstCellCenter:[west+.125,north-.125],lastCellCenter:[east-.125,south+.125],sourceColumnOffset,sourceRowOffset,rowOrder:'north-to-south',layout:'month-major',noData:-1,
      months,values,valuesSha256,uncompressedSha256:sha256(grid),uncompressedBytes:grid.length,display,countryCodes:definition.codes,countryCoverage};
    const samples=validationPlaces[id].map(([name,longitude,latitude])=>{
      const cell=sourceCellIndex(longitude,latitude),localIndex=(cell.row-sourceRowOffset)*width+cell.column-sourceColumnOffset;
      const rawMonthlyNormals=ASIA_SEASONAL_MONTHS.map(month=>monthlySourceValue(bytes,variable,recordStride,month.month,cell.index));
      const deliveredMonthlyNormals=ASIA_SEASONAL_MONTHS.map(month=>grid.readFloatLE(((month.month-1)*size+localIndex)*4));
      const cellCenterIsTargetLand=Boolean(mask[localIndex]);
      if(rawMonthlyNormals.some(value=>value<0)||JSON.stringify(cellCenterIsTargetLand?rawMonthlyNormals:Array(12).fill(-1))!==JSON.stringify(deliveredMonthlyNormals))throw Error(`Sample source/mask mismatch: ${name}`);
      return {name,locator:[longitude,latitude],sourceCell:{row:cell.row,column:cell.column,center:cell.center},cellCenterIsTargetLand,rawMonthlyNormals,deliveredMonthlyNormals,
        flippedLatitudeMonthlyNormals:ASIA_SEASONAL_MONTHS.map(month=>monthlySourceValue(bytes,variable,recordStride,month.month,(719-cell.row)*1440+cell.column)),meaning:'Location labels identify grid-cell locators, not city-average precipitation.'};
    });
    validationRegions[id]={monthlyStatistics,countryCoverage,unresolvedCountries:countryCoverage.filter(entry=>entry.sourceCellCenters===0).map(entry=>entry.code),sourceSamples:samples,maskSha256:sha256(mask)};
  }
  const processing={script:'scripts/prepare-asia-seasonal-precipitation.mjs',scriptSha256:sha256(await fs.readFile(fileURLToPath(import.meta.url))),
    numericEncoding:'gzip little-endian float32',numericLayout:'((month - 1) * width * height) + row * width + column',
    numericGrid:'Unchanged original 0.25° source cells, cropped at original cell boundaries; row zero is north.',
    missing:'-1 for source missing/non-finite/negative or outside target-country cell-centre mask. Real zero is preserved.',
    display:'Small EPSG:3857 PNGs sample the original numeric cube at Mercator display pixel centres by nearest source cell; no bilinear interpolation, smoothing or source upscaling.',
    displayMask:'Independent existing detailed country geometry per region, applied at original source-cell centres. Polygon holes retained. No dilation or nearest-country substitution.',
    latitudeOrientation:'Coordinate arrays are authoritative: 89.875° to -89.875°, north-to-south. The inconsistent source degrees_south attribute is recorded, not used to flip data.',
    recordStrideBytes:recordStride,precipitationRecordBytes:variable.recordBytes,rawSourceIncludedInRepository:false,sourceMutation:false};
  const validation={sourceTitle:header.globals.title,sourcePeriod:[header.globals.time_coverage_start,header.globals.time_coverage_end],sourceRecords:header.records,
    sourceDimensions:[1440,720],sourceRecordStrideBytes:recordStride,sourceVariableOffset:variable.offset,sourceVariableRecordBytes:variable.recordBytes,
    coordinates:{firstLongitude:longitudeCenters[0],lastLongitude:longitudeCenters.at(-1),firstLatitude:latitudeCenters[0],lastLatitude:latitudeCenters.at(-1),declaredLatitudeUnit:lat.attributes.units,usedLatitudeConvention:'North-positive source array; north-to-south row order'},regions:validationRegions};
  const sourceBytes=Buffer.from(JSON.stringify(source,null,2)+'\n'),validationBytes=Buffer.from(JSON.stringify(validation,null,2)+'\n');
  await fs.writeFile(path.join(provenance,'source.json'),sourceBytes);await fs.writeFile(path.join(provenance,'validation.json'),validationBytes);
  inputs.push({path:'data-source/atlas/asia/seasonal-precipitation/source.json',sha256:sha256(sourceBytes),role:'Source identity, exact raw hash, rights evidence and limitations'},
    {path:'data-source/atlas/asia/seasonal-precipitation/validation.json',sha256:sha256(validationBytes),role:'Actual source coordinates, record stride, independent raw location samples and mask coverage'});
  const manifest={schemaVersion:1,retrievedAt:'2026-10-04',period:'1991–2020',unit:'mm/month',months:ASIA_SEASONAL_MONTHS,breaks:[...ASIA_SEASONAL_BREAKS],colors:[...ASIA_SEASONAL_COLORS],source,limitations,regions,processing,inputs,files};
  validateAsiaSeasonalManifest(manifest);
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({files:Object.keys(files).length,totalAssetBytes:Object.values(files).reduce((sum,file)=>sum+file.bytes,0),regions:Object.fromEntries(Object.entries(regions).map(([id,record])=>[id,{native:[record.width,record.height],display:[record.display.width,record.display.height],unresolvedCountries:validationRegions[id].unresolvedCountries}]))}));
  return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const argumentsList=process.argv.slice(2),at=argumentsList.indexOf('--source');
  const sourcePath=path.resolve(at>=0?argumentsList[at+1]:path.join(root,'../europe-water-research/gpcc-1991-2020-v2025-025.nc.gz'));
  await prepareAsiaSeasonalPrecipitation(sourcePath);
}
