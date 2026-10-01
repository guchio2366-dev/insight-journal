/** Build Russia-centred population display grids from bounded GHSL source windows.
 * No native GIS, workers, global source array, nearest-land fill or country totals.
 * node --expose-gc --max-old-space-size=72 scripts/prepare-russia-population.mjs
 *   --source PATH --geotiff-module PATH [--views overview]
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { deflateSync, inflateSync, gzipSync, gunzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/assets/atlas/russia-population-v1');
const SOURCE_SHA = 'db25d12ab0851446af467a56eb1651d383867dc3fbf4aa6348ec8e3372225196';
const R = 6378137;
const BREAKS = [1,10,100,500,2000,10000];
const COLORS = ['f0f1e8','dce8df','b0d2cc','7ab5bb','438b9f','28627f','173b60'];
const PALETTE = COLORS.map(hex => [...Buffer.from(hex,'hex'),255]);
const VIEW_DEFS = {
  overview: {bounds:[18,40,191,83],width:1200,aggregate:5,title:'ロシア全体'},
};

function argsOf(argv) {
  const args={};
  for(let i=0;i<argv.length;i+=2) {if(!argv[i].startsWith('--')||argv[i+1]===undefined) throw new Error('Expected --name value');args[argv[i].slice(2)]=argv[i+1];}
  if(!args.source||!args['geotiff-module']) throw new Error('--source and --geotiff-module required');
  return args;
}
function sha(bytes){return createHash('sha256').update(bytes).digest('hex');}
async function fileSha(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function json(path,obj){await writeFile(path,JSON.stringify(obj,null,2)+'\n');}
function mollweide(lon,lat) {
  const phi=lat*Math.PI/180;let theta=phi;
  for(let i=0;i<20;i++){const step=(2*theta+Math.sin(2*theta)-Math.PI*Math.sin(phi))/(2+2*Math.cos(2*theta));theta-=step;if(Math.abs(step)<1e-14)break;}
  return [2*Math.SQRT2*R*(lon*Math.PI/180)*Math.cos(theta)/Math.PI,Math.SQRT2*R*Math.sin(theta)];
}
function standardLon(lon){return lon>180?lon-360:lon;}
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function pngChunk(type,data){const tag=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([tag,data])));return Buffer.concat([length,tag,data,crc]);}
function png(width,height,rgba){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const rows=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)rgba.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);const compressed=deflateSync(rows,{level:9});const decoded=inflateSync(compressed);if(!decoded.equals(rows))throw new Error('PNG lossless roundtrip failed');return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',compressed),pngChunk('IEND',Buffer.alloc(0))]);}
function rgbaFromGrid(grid){const rgba=Buffer.alloc(grid.length*4);for(let i=0;i<grid.length;i++){const v=grid[i];if(v<0)continue;if(v===0){rgba.fill(255,i*4,i*4+4);continue;}let level=0;while(level<BREAKS.length&&v>=BREAKS[level])level++;const color=PALETTE[level];for(let b=0;b<4;b++)rgba[i*4+b]=color[b];}return rgba;}

// TIFF LZW with fixed typed output/dictionary buffers. This avoids the published
// decoder's dynamic number[] output, which transiently exhausts a small heap
// when one bounded source window intersects four tiles. Registering a decoder
// uses GeoTIFF.js's public addDecoder API; no installed package is modified.
function boundedLzw(input,maximumBytes){
  const bytes=new Uint8Array(input),output=new Uint8Array(maximumBytes);
  const prefix=new Uint16Array(4096),suffix=new Uint8Array(4096),stack=new Uint8Array(4096);
  let bits=9,nextCode=258,previous=-1,first=0,bitOffset=0,written=0;
  const append=value=>{if(written>=output.length)throw new Error('LZW exceeds declared tile size');output[written++]=value;};
  while(bitOffset+bits<=bytes.length*8){
    const index=bitOffset>>>3,shift=bitOffset&7;
    const packed=((bytes[index]||0)<<16)|((bytes[index+1]||0)<<8)|(bytes[index+2]||0);
    const incoming=(packed>>>(24-shift-bits))&((1<<bits)-1);bitOffset+=bits;
    if(incoming===257)return output.buffer.slice(0,written);
    if(incoming===256){bits=9;nextCode=258;previous=-1;continue;}
    if(previous<0){if(incoming>255)throw new Error('Invalid first LZW code');append(incoming);previous=incoming;first=incoming;continue;}
    let code=incoming,length=0;
    if(code===nextCode){stack[length++]=first;code=previous;}
    else if(code>nextCode)throw new Error('Invalid LZW dictionary reference');
    while(code>=256){if(code>=nextCode||length>=4095)throw new Error('Invalid LZW prefix chain');stack[length++]=suffix[code];code=prefix[code];}
    first=code;stack[length++]=first;
    while(length)append(stack[--length]);
    if(nextCode<4096){prefix[nextCode]=previous;suffix[nextCode]=first;nextCode++;if(nextCode+1>=(1<<bits)&&bits<12)bits++;}
    previous=incoming;
  }
  throw new Error('LZW stream missing end code');
}

async function buildView(image,id,definition){
  const {bounds,width,aggregate,title}=definition;
  const height=Math.round(width*(bounds[3]-bounds[1])/((bounds[2]-bounds[0])*Math.cos(60*Math.PI/180)));
  const pixels=width*height;
  const grid=new Float32Array(pixels);grid.fill(-1);
  const sourceValid=new Uint8Array(pixels);
  const next=new Int32Array(pixels);next.fill(-1);
  const blockCol=new Uint16Array(pixels),blockRow=new Uint16Array(pixels);
  // Source windows are aligned to 250 original cells, divisible by both 1 and 5.
  const windowSide=250,columns=Math.ceil(image.getWidth()/windowSide),rows=Math.ceil(image.getHeight()/windowSide);
  const heads=new Int32Array(columns*rows);heads.fill(-1);
  const origin=image.getOrigin(),resolution=image.getResolution();
  let outOfBounds=0;
  for(let y=0;y<height;y++){
    const lat=bounds[3]-(y+.5)*(bounds[3]-bounds[1])/height;
    for(let x=0;x<width;x++){
      const lon=standardLon(bounds[0]+(x+.5)*(bounds[2]-bounds[0])/width);
      const [mx,my]=mollweide(lon,lat);
      const col=Math.floor((mx-origin[0])/resolution[0]),row=Math.floor((my-origin[1])/resolution[1]);
      const i=y*width+x;
      if(col<0||row<0||col>=image.getWidth()||row>=image.getHeight()){outOfBounds++;continue;}
      const bc=Math.floor(col/aggregate)*aggregate,br=Math.floor(row/aggregate)*aggregate;
      blockCol[i]=bc;blockRow[i]=br;
      const group=Math.floor(br/windowSide)*columns+Math.floor(bc/windowSide);
      next[i]=heads[group];heads[group]=i;
    }
  }
  let processedWindows=0,sourceValidCells=0,sourceMissingCells=0,sourceZeroCells=0,sourcePopulationSum=0,aggregatedReconstitutedSum=0,maximumWindowRelativeSumError=0,peakRss=process.memoryUsage().rss;
  const started=performance.now();
  for(let group=0;group<heads.length;group++){
    if(heads[group]<0)continue;
    const left=(group%columns)*windowSide,top=Math.floor(group/columns)*windowSide;
    const right=Math.min(left+windowSide,image.getWidth()),bottom=Math.min(top+windowSide,image.getHeight());
    const w=right-left,h=bottom-top,aw=Math.ceil(w/aggregate),ah=Math.ceil(h/aggregate);
    const source=await image.readRasters({window:[left,top,right,bottom],samples:[0],interleave:true});
    const sums=new Float64Array(aw*ah),counts=new Uint8Array(aw*ah);
    let rawSum=0;
    for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){
      const value=source[sy*w+sx];
      if(!Number.isFinite(value)||value<0){sourceMissingCells++;continue;}
      if(value===0)sourceZeroCells++;
      sourceValidCells++;rawSum+=value;
      const a=Math.floor(sy/aggregate)*aw+Math.floor(sx/aggregate);sums[a]+=value;counts[a]++;
    }
    let reconstructed=0;for(let a=0;a<sums.length;a++)if(counts[a])reconstructed+=(sums[a]/counts[a])*counts[a];
    const relative=Math.abs(rawSum-reconstructed)/Math.max(1,Math.abs(rawSum));
    maximumWindowRelativeSumError=Math.max(maximumWindowRelativeSumError,relative);
    if(relative>1e-10)throw new Error('Source-to-block population sum not conserved');
    sourcePopulationSum+=rawSum;aggregatedReconstitutedSum+=reconstructed;
    for(let i=heads[group];i>=0;i=next[i]){
      const a=Math.floor((blockRow[i]-top)/aggregate)*aw+Math.floor((blockCol[i]-left)/aggregate);
      if(counts[a]){grid[i]=sums[a]/counts[a];sourceValid[i]=counts[a];}
    }
    processedWindows++;
    if(global.gc)global.gc();
    peakRss=Math.max(peakRss,process.memoryUsage().rss);
    if(processedWindows%100===0)console.log(JSON.stringify({view:id,processedWindows,elapsedSeconds:(performance.now()-started)/1000,rssMB:process.memoryUsage().rss/1048576}));
  }
  const rawGrid=Buffer.alloc(grid.length*4);for(let i=0;i<grid.length;i++)rawGrid.writeFloatLE(grid[i],i*4);
  const compressedGrid=gzipSync(rawGrid,{level:9});
  if(!gunzipSync(compressedGrid).equals(rawGrid))throw new Error('Grid gzip roundtrip failed');
  const rgba=rgbaFromGrid(grid);
  const imageBytes=png(width,height,rgba);
  const imageName=id+'.png',gridName=id+'.density.gz',countName=id+'.valid-count.gz';
  await writeFile(resolve(OUT,imageName),imageBytes);
  await writeFile(resolve(OUT,gridName),compressedGrid);
  await writeFile(resolve(OUT,countName),gzipSync(sourceValid,{level:9}));
  let positivePixels=0,zeroPixels=0,missingPixels=0,minPositive=null,maxValue=null;
  for(const v of grid){if(v<0)missingPixels++;else if(v===0)zeroPixels++;else{positivePixels++;minPositive=minPositive===null?v:Math.min(minPositive,v);maxValue=maxValue===null?v:Math.max(maxValue,v);}}
  const sampleNames=['Moscow','Saint Petersburg','Novosibirsk','Vladivostok','Yakutsk'];
  const centres=JSON.parse(await readFile(resolve(ROOT,'public/assets/atlas/russia-population-v1/centres.json'),'utf8')).centres;
  const samples={};
  for(const name of sampleNames){const city=centres.find(c=>c.sourceName===name);if(!city)continue;let [lon,lat]=city.coordinates;if(lon<0)lon+=360;const x=Math.floor((lon-bounds[0])/(bounds[2]-bounds[0])*width),y=Math.floor((bounds[3]-lat)/(bounds[3]-bounds[1])*height);if(x>=0&&x<width&&y>=0&&y<height){const i=y*width+x;samples[name]={coordinates4326:city.coordinates,displayPixel:[x,y],densityPeopleKm2:grid[i],validSourceCells:sourceValid[i],populationYear:2020};}}
  const diagnostic={processedWindows,maximumSourceWindowCells:windowSide**2,sourceValidCells,sourceMissingCells,sourceZeroCells,sourcePopulationSum,aggregatedReconstitutedSum,maximumWindowRelativeSumError,populationSumDifference:aggregatedReconstitutedSum-sourcePopulationSum,peakRssBytes:peakRss,elapsedSeconds:(performance.now()-started)/1000,outOfBoundsDisplayPixels:outOfBounds,note:'These source-read sums cover requested rectangular processing windows, including surrounding land/ocean. They verify aggregation only; they are not regional or national population totals.'};
  return {title,bounds4326:bounds,boundsUnwrapped:bounds,width,height,image:imageName,grid:gridName,validCountGrid:countName,sourceCellKm:aggregate,sourceAggregation:[aggregate,aggregate],outputSpacingDegrees:[(bounds[2]-bounds[0])/width,(bounds[3]-bounds[1])/height],imageCoordinates:[[bounds[0],bounds[3]],[bounds[2],bounds[3]],[bounds[2],bounds[1]],[bounds[0],bounds[1]]],positivePixels,zeroPixels,missingPixels,minPositive,maxValue,sourceReadDiagnostics:diagnostic,knownPlaceSamples:samples,pixelValidation:{imageAndGridFromIdenticalFloat32Values:true,pngLosslessRoundtrip:true,gzipFloat32Roundtrip:true,zeroOpaqueWhiteAndMissingTransparent:true}};
}

const args=argsOf(process.argv.slice(2));
if(await fileSha(args.source)!==SOURCE_SHA)throw new Error('Source SHA256 mismatch');
await mkdir(OUT,{recursive:true});
const {fromFile,BaseDecoder,addDecoder}=await import(pathToFileURL(resolve(args['geotiff-module'])).href);
const tiff=await fromFile(args.source);
try{
  const image=await tiff.getImage();
  const dir=image.fileDirectory;
  if(image.getWidth()!==36082||image.getHeight()!==18000||image.getGDALNoData()!==-200||dir.getValue('BitsPerSample')[0]!==64)throw new Error('Unexpected source raster metadata');
  if(image.tiles!==null)throw new Error('Decoded tile cache must remain disabled');
  if(global.gc)global.gc();
  const decoderFixtures=[];
  const fixtureCentres=JSON.parse(await readFile(resolve(ROOT,'public/assets/atlas/russia-population-v1/centres.json'),'utf8')).centres;
  for(const name of ['Moscow','Novosibirsk','Vladivostok']){
    const centre=fixtureCentres.find(c=>c.sourceName===name),origin=image.getOrigin();
    const column=Math.floor((centre.sourceCentroid54009[0]-origin[0])/1000),row=Math.floor((origin[1]-centre.sourceCentroid54009[1])/1000);
    const left=Math.floor(column/256)*256,top=Math.floor(row/256)*256,window=[left,top,left+256,top+256];
    const official=await image.readRasters({window,samples:[0],interleave:true});
    decoderFixtures.push({name,window,sha256:sha(Buffer.from(official.buffer))});
    if(global.gc)global.gc();
  }
  class FixedBufferLzwDecoder extends BaseDecoder{
    decodeBlock(buffer){const {tileWidth,tileHeight,bitsPerSample}=this.parameters;const bits=Array.from(bitsPerSample).reduce((a,b)=>a+b,0);return boundedLzw(buffer,tileWidth*tileHeight*bits/8);}
  }
  addDecoder(5,async()=>FixedBufferLzwDecoder,undefined,false);
  for(const fixture of decoderFixtures){
    const actual=await image.readRasters({window:fixture.window,samples:[0],interleave:true});
    if(sha(Buffer.from(actual.buffer))!==fixture.sha256)throw new Error('Fixed-buffer LZW differs from official decoder: '+fixture.name);
    if(global.gc)global.gc();
  }
  console.log(JSON.stringify({decoderValidation:decoderFixtures,rssMB:process.memoryUsage().rss/1048576}));
  const selected=args.views?args.views.split(','):Object.keys(VIEW_DEFS);
  const previous=await readFile(resolve(OUT,'manifest.json'),'utf8').then(JSON.parse).catch(()=>({views:{}}));
  const views={...previous.views};
  for(const id of selected){if(!VIEW_DEFS[id])throw new Error('Unknown view '+id);views[id]=await buildView(image,id,VIEW_DEFS[id]);console.log(JSON.stringify({completed:id,...views[id].sourceReadDiagnostics,positivePixels:views[id].positivePixels,zeroPixels:views[id].zeroPixels,missingPixels:views[id].missingPixels}));}
  const files={};for(const rec of Object.values(views))for(const name of [rec.image,rec.grid,rec.validCountGrid])files[name]={bytes:(await stat(resolve(OUT,name))).size,sha256:await fileSha(resolve(OUT,name))};
  const manifest={schemaVersion:2,populationYear:2020,sourceEdition:'GHS-POP R2023A V1.0; 2020 1 km Mollweide',license:'CC BY 4.0',licenseUrl:'https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php',populationCitation:'Schiavina, M., Freire, S., Carioli, A., MacManus, K. (2023). GHS-POP R2023A - GHS population grid multitemporal (1975-2030). European Commission, Joint Research Centre.',populationDoi:'https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE',referencePublication:'Pesaresi, M. et al. (2024). Advances on the Global Human Settlement Layer by joint assessment of Earth Observation and population survey data. International Journal of Digital Earth 17(1).',referencePublicationDoi:'https://doi.org/10.1080/17538947.2024.2390454',decoderValidation:{implementation:'Fixed typed-buffer TIFF LZW through the public GeoTIFF.js addDecoder API; package files unchanged',full256x256Float64TilesExactlyEqualToOfficialDecoder:decoderFixtures},input:{file:args.source.split(/[\\/]/).at(-1),sha256:SOURCE_SHA,url:'https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0.zip',coordinateCrs:'ESRI:54009',sourceCellMetres:[1000,1000],noData:-200,unit:'people per 1 km equal-area source cell',dataNature:'census/administrative estimates disaggregated using built-up information; not a direct household count'},displayProjection:'Russia-centred equirectangular with standard latitude 60; longitude 18 to 191 unwrapped',lookup:{encoding:'float32-le-gzip',unit:'people/km2 of valid source cells including water',noData:-1,zero:0,validCountEncoding:'uint8-gzip',validCountMeaning:'number of valid original 1 km cells in the selected aligned 5x5 block (1 to 25); 0 means source missing'},breaks:BREAKS,colors:COLORS,method:'Original equal-area 1 km people/cell are read only in bounded 250x250 source windows with disabled tile cache and no workers. Aligned 5x5 blocks use sum of nonnegative finite population divided by valid original 1 km2 cell count, including zero/water cells. Display pixel centres are projected to source Mollweide and use the containing aligned source block (nearest-neighbour at the aggregated block scale). No bilinear smoothing, generalized land masks, nearest-land imputation or raster-derived urban-centre totals. PNG colors and Float32 lookup values are generated from one array.',limitations:['5 km overview cells can include water and cannot measure land-only population density. Zero cells include ocean; missing is separately stored as -1.','Equirectangular pixels have unequal areas; the displayed density comes from equal-area source cells. Never sum display pixels as population.','The overview display spacing can omit small or sparse source concentrations. Regional views change the viewport only; they do not increase source or display-grid resolution. No source-defined urban centre does not mean zero population.','Surrounding non-target countries can occur in rectangular source extents; keep them neutral in the map framework. Source-read sums are diagnostics only.','The 2020 distribution is modelled from census/administrative estimates and built-up information. Do not infer individual homes, exact contemporary population or municipal boundaries.'],urbanCentres:{file:'centres.json',manifest:'urban-manifest.json',populationYears:[2000,2010,2020],urbanBoundaryYear:2025,scope:'All 253 source-defined centres assigned GC_CNT_GAD_2025=Russia. Ukraine-assigned Crimea centres are excluded; no-centre status never means zero population.'},views,files};
  // Current JRC catalogue citation year differs from the source release name.
  manifest.populationCitation='Schiavina, M.; Freire, S.; Carioli, A.; MacManus, K. (2026). GHS-POP R2023A - GHS population grid multitemporal (1975-2030). European Commission, Joint Research Centre [Dataset].';
  manifest.populationCitationCatalog='https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe';
  manifest.populationCitationPersistentDoi='https://doi.org/10.2905/JRC.CXKEDRR';
  manifest.sourceReleaseIssued='2023-05-08';
  manifest.citationVerifiedAt='2026-10-01';
  manifest.zeroColor='#ffffff';manifest.displayZeroColor='#ffffff';manifest.rasterZeroAlpha=255;manifest.rasterMissingAlpha=0;
  manifest.boundsUnwrapped=VIEW_DEFS.overview.bounds;
  manifest.coordinateCrs='EPSG:4326 with eastern longitudes unwrapped beyond 180';
  manifest.geographicScope={display:'18 to 191 degrees east, 40 to 83 degrees north; whole source window includes neighbouring-country cells',raster:'Global source clipped by source display boundaries only in the UI; no national total is calculated',urban:'GC_CNT_GAD_2025=Russia, 253 records; source-defined centres rather than all settlements',boundaryCaveat:'Adopted Natural Earth source display boundary includes Crimea within RUS, while the pinned UCDB assigns Sevastopol, Simferopol, Yalta, Kerch and Yevpatoriya to Ukraine. The city subset preserves that source assignment. Map outline, urban attribution and census-statistical territory must not be treated as identical.',politicalInterpretation:'Source conventions are recorded without adding a sovereignty claim.'};
  manifest.limitations.push('The source epoch is 2020, before current displacement and migration changes. It is not a current population estimate. No inferred contemporary values fill missing cells.');
  const urbanFiles=['centres.json','urban-manifest.json'];
  for(const name of urbanFiles)manifest.files[name]={bytes:(await stat(resolve(OUT,name))).size,sha256:await fileSha(resolve(OUT,name))};
  await json(resolve(OUT,'manifest.json'),manifest);
  const sourceOut=resolve(ROOT,'data-source/atlas/russia/population');
  await mkdir(sourceOut,{recursive:true});
  const urbanManifest=JSON.parse(await readFile(resolve(OUT,'urban-manifest.json'),'utf8'));
  await json(resolve(sourceOut,'source-record.json'),{
    schemaVersion:1,verifiedAt:'2026-10-01',rawDataInPublicGit:false,
    populationInput:manifest.input,urbanInputs:urbanManifest.inputs,
    license:manifest.license,licenseUrl:manifest.licenseUrl,
    populationCitation:manifest.populationCitation,populationDoi:manifest.populationDoi,
    populationCitationCatalog:manifest.populationCitationCatalog,
    referencePublication:manifest.referencePublication,referencePublicationDoi:manifest.referencePublicationDoi,
    urbanCitations:urbanManifest.citations,geographicScope:manifest.geographicScope,
    urbanSourceAttribution:urbanManifest.geographicScope,
    extractedFacts:{urbanCentreCount:253,urbanPopulationYear:2020,urbanBoundaryYear:2025,
      countryAssignmentColumn:'GC_CNT_GAD_2025',countryAssignmentValue:'Russia',
      crimeaCitySourceAssignment:'Ukraine; five pinned source records excluded from Russia subset',
      nationalPopulationTotalCalculated:false,densityUnit:manifest.lookup.unit}
  });


}finally{await tiff.close();}
