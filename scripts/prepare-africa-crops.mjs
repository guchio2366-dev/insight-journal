/** Offline preparation of Africa crop maps from immutable official SPAM 2020 V2r2 originals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync,deflateSync,inflateSync} from 'node:zlib';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BOUNDS=[-27,-36,64,39],WIDTH=1092,HEIGHT=900,STEP=1/12,WINDOW=[1836,612,2928,1512];
const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:undefined;
const archives={
 H:{name:'spam2020V2r2_global_harvested_area.geotiff.zip',id:13827040,bytes:68007241,md5:'dd9ac5def086fcae26d28423b2b31f8b',sha256:'34895a332ba7ff9d9732a81fe9da7063458d197f3c72ce3a405329c41f94ade2'},
 P:{name:'spam2020V2r2_global_production.geotiff.zip',id:13827043,bytes:75175570,md5:'8ce3956c25860ae9960155b8382518de',sha256:'7bdce0d9f48d50c2596fbc35bfeb1a4d37afa59f421a6b0c2c10fd221277e42d'}
};
const crops=[
 {key:'maize',code:'MAIZ',name:'トウモロコシ',takeaway:'同じ温暖な地域でも、水の季節性と生産技術・流通条件によってトウモロコシの分布は変わる。'},
 {key:'rice',code:'RICE',name:'米',takeaway:'米の分布は湿潤な自然条件だけでは説明できない。灌漑・水管理と市場へのつながりを合わせて読む。'},
 {key:'wheat',code:'WHEA',name:'小麦',takeaway:'小麦は北部・高地などの環境を手掛かりに読めるが、灌漑・栽培技術・需要も分布を左右する。'},
 {key:'cassava',code:'CASS',name:'キャッサバ',takeaway:'キャッサバの分布を主食・加工・市場の条件と結び付け、湿潤な地域が同じ生産を持つとは考えない。'}
];
const sourceHashes={
 H_MAIZ:'f59ae1d95086f72e05ea753ecc06a2d5dce4488503b669d82981bf37ba713d71',
 H_RICE:'5c20f380b2f7501e8ed025583cc020ebce25f858ff20e07d71c2df59d2e8cfd2',
 H_WHEA:'288f583e50e8237b0eaad880e5ef188383c97701c5015744cf6a62f2bf7dba9e',
 H_CASS:'71e7cb861757ab0a50867bb0500e829f6e0b2c48527f1ebdcb60b4301ce1eae6',
 P_MAIZ:'1db1778160f6259e53f1c05eeab899f09297a62147cbd85a735b6e2c41184785',
 P_RICE:'db16e1358399a32fd72ff34c5a3aa32b2262003a978593b7c260afc6957ee4ac',
 P_WHEA:'718c230babcd872bfeba1d5cec72b8e5944ec2fe90103b890fff2d33d095fac7',
 P_CASS:'640fdd4dcc54a16d890b6a4bfc371af2ec7c5a9d524be5aa8d86b1fadb6406c8'
};
function ringMask(ring){
 const mask=new Uint8Array(WIDTH*HEIGHT);
 const south=Math.min(...ring.map(p=>p[1])),north=Math.max(...ring.map(p=>p[1]));
 const first=Math.max(0,Math.floor((BOUNDS[3]-north)/STEP)),last=Math.min(HEIGHT-1,Math.ceil((BOUNDS[3]-south)/STEP));
 for(let row=first;row<=last;row++){
  const y=BOUNDS[3]-(row+.5)*STEP,xs=[];
  for(let i=0;i<ring.length;i++){
   const [x0,y0]=ring[i],[x1,y1]=ring[(i+1)%ring.length];
   if((y0<=y&&y<y1)||(y1<=y&&y<y0))xs.push(x0+(y-y0)*(x1-x0)/(y1-y0));
  }
  xs.sort((a,b)=>a-b);if(xs.length%2)throw Error('Odd polygon intersection count');
  for(let i=0;i<xs.length;i+=2){
   const firstCol=Math.max(0,Math.ceil((xs[i]-BOUNDS[0])/STEP-.5)),lastCol=Math.min(WIDTH,Math.ceil((xs[i+1]-BOUNDS[0])/STEP-.5));
   for(let col=firstCol;col<lastCol;col++)mask[row*WIDTH+col]=1;
  }
 }
 return mask;
}
function landMasks(collection){
 const land=new Uint8Array(WIDTH*HEIGHT),countries={};
 for(const f of collection.features){
  if(!['Polygon','MultiPolygon'].includes(f.geometry.type))throw Error('Country boundary must be polygon');
  const country=new Uint8Array(land.length),polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const rings of polygons){const part=new Uint8Array(land.length);for(const ring of rings){const r=ringMask(ring);for(let i=0;i<r.length;i++)part[i]^=r[i];}for(let i=0;i<part.length;i++)country[i]|=part[i];}
  countries[f.properties.code]=country;for(let i=0;i<land.length;i++)land[i]|=country[i];
 }
 return {land,countries};
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(buffer){let crc=0xffffffff;for(const b of buffer)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function chunk(type,bytes){const t=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([t,bytes])));return Buffer.concat([length,t,bytes,crc]);}
function png(pixels){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(WIDTH);ihdr.writeUInt32BE(HEIGHT,4);ihdr[8]=8;ihdr[9]=6;
 const scan=Buffer.alloc(HEIGHT*(1+WIDTH*4));for(let r=0;r<HEIGHT;r++)pixels.copy(scan,r*(1+WIDTH*4)+1,r*WIDTH*4,(r+1)*WIDTH*4);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function decodedPng(pngBytes){let pos=8,parts=[];while(pos<pngBytes.length){const n=pngBytes.readUInt32BE(pos),type=pngBytes.toString('ascii',pos+4,pos+8);if(type==='IDAT')parts.push(pngBytes.subarray(pos+8,pos+8+n));pos+=n+12;}const scan=inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(WIDTH*HEIGHT*4);for(let row=0;row<HEIGHT;row++){if(scan[row*(1+WIDTH*4)]!==0)throw Error('Unexpected PNG filter');scan.copy(pixels,row*WIDTH*4,row*(1+WIDTH*4)+1,(row+1)*(1+WIDTH*4));}return pixels;}
function classIndex(value,breaks){if(value===0)return 0;const i=breaks.findIndex(edge=>value<edge);return 1+(i<0?breaks.length:i);}
function counts(values){let zero=0,positive=0,missing=0,max=0,maxIndex=-1,zeroIndex=-1,missingIndex=-1;for(let i=0;i<values.length;i++){const v=values[i];if(v===-1){missing++;if(missingIndex<0)missingIndex=i;}else if(v===0){zero++;if(zeroIndex<0)zeroIndex=i;}else if(v>0){positive++;if(v>max){max=v;maxIndex=i;}}else throw Error('Unexpected crop value');}return {valid:zero+positive,zero,positive,missing,max,maxIndex,zeroIndex,missingIndex};}
const writeJson=(p,value)=>fs.writeFile(p,JSON.stringify(value,null,2)+'\n');

async function main(){
 const sourceRoot=arg('--source-root'),geotiffPackage=arg('--geotiff-package');if(!sourceRoot||!geotiffPackage)throw Error('--source-root and --geotiff-package required');
 const out=path.resolve(arg('--out')??path.join(ROOT,'public/assets/atlas/africa-crops-v1'));await fs.mkdir(out,{recursive:true});
 const originalMetadata=await fs.readFile(path.join(sourceRoot,'spam2020-dataverse-v6-metadata.json'));
 if(hash(originalMetadata)!=='6e71c847cdf3b383cf71a94432fe2a09620d23aeba67859564213effaaf03559')throw Error('Fixed Dataverse version6 metadata hash mismatch');
 const dataset=JSON.parse(originalMetadata).data;
 if(dataset.versionNumber!==6||dataset.versionMinorNumber!==0||!dataset.termsOfUse.includes('Creative Commons Attribution 4.0 International'))throw Error('Fixed dataset grant mismatch');
 for(const a of Object.values(archives)){
  const raw=await fs.readFile(path.join(sourceRoot,a.name));if(raw.length!==a.bytes||hash(raw)!==a.sha256||hash(raw,'md5')!==a.md5)throw Error('Immutable official archive mismatch');
  const listed=dataset.files.find(f=>f.dataFile.id===a.id)?.dataFile;if(!listed||listed.checksum.value!==a.md5||listed.filesize!==a.bytes)throw Error('Mirror archive differs from licensed Dataverse file');
 }
 const boundaryFile=path.join(ROOT,'src/data/atlas/africa-geography.json'),boundaryBytes=await fs.readFile(boundaryFile);
 const {land,countries}=landMasks(JSON.parse(boundaryBytes)),{fromFile}=await import(pathToFileURL(path.join(geotiffPackage,'dist-module/geotiff.js')).href);
 const layers={},validation=[],sourceRecords={};
 for(const crop of crops)for(const measure of ['H','P']){
  const key=`${crop.key}-${measure==='H'?'harvested':'production'}`,name=`spam2020_V2r2_global_${measure}_${crop.code}_A.tif`,sourcePath=path.join(sourceRoot,'selected',name),sourceBytes=await fs.readFile(sourcePath);
  if(hash(sourceBytes)!==sourceHashes[`${measure}_${crop.code}`])throw Error('Immutable extracted TIFF mismatch '+name);
  const tif=await fromFile(sourcePath),im=await tif.getImage(),origin=im.getOrigin(),resolution=im.getResolution(),noData=im.getGDALNoData();
  if(im.getWidth()!==4320||im.getHeight()!==2160||im.getGeoKeys().GeographicTypeGeoKey!==4326||Math.abs(resolution[0]-STEP)>1e-9||Math.abs(resolution[1]+STEP)>1e-9)throw Error('Unexpected native crop geometry');
  const native=await im.readRasters({window:WINDOW,samples:[0],interleave:true});if(!(native instanceof Float32Array)||native.length!==WIDTH*HEIGHT)throw Error('Unexpected crop raster type');
  const values=new Float32Array(native.length);let retainedValuesExact=true,sourceNoDataPreserved=true,outsideMaskUnavailable=true;
  for(let i=0;i<native.length;i++){
   const v=native[i];if(!Number.isFinite(v)||v===noData||!land[i])values[i]=-1;else {if(v<0)throw Error('Unexpected negative original crop value');values[i]=v;}
   if(land[i]&&v!==noData&&Number.isFinite(v)&&values[i]!==v)retainedValuesExact=false;
   if(v===noData&&values[i]!==-1)sourceNoDataPreserved=false;if(!land[i]&&values[i]!==-1)outsideMaskUnavailable=false;
  }
  const breaks=measure==='H'?[1,10,100,1000]:[1,10,100,1000,10000],colors=measure==='H'?['#d9ead5','#b7d8b6','#80b397','#458976','#1e5f57']:['#dde8d4','#bfd6ac','#96b77f','#6e965b','#44763f','#22582e'];
  const zeroColor='#f3f2e8',unit=measure==='H'?'ha / 5分角セル':'t / 5分角セル',unitShort=measure==='H'?'ha':'t',prefix=measure==='H'?'h':'p';
  const positiveLegend=colors.map((color,i)=>({id:`${prefix}-${i}`,label:i===0?`0超–1未満 ${unitShort}/セル`:i===colors.length-1?`${breaks.at(-1).toLocaleString('en-US')} ${unitShort}/セル以上`:`${breaks[i-1].toLocaleString('en-US')}–${breaks[i].toLocaleString('en-US')}未満 ${unitShort}/セル`,color}));
  const legend=[{id:'crop-zero',label:`0 ${unitShort}/セル`,color:zeroColor},...positiveLegend],palette=legend.map(r=>[...Buffer.from(r.color.slice(1),'hex'),255]),pixels=Buffer.alloc(values.length*4);
  for(let i=0;i<values.length;i++)if(values[i]>=0)pixels.set(palette[classIndex(values[i],breaks)],i*4);
  const gridBytes=Buffer.from(values.buffer),compressed=gzipSync(gridBytes,{level:9,mtime:0}),imageBytes=png(pixels);
  await fs.writeFile(path.join(out,key+'.values.gz'),compressed);await fs.writeFile(path.join(out,key+'.png'),imageBytes);
  const c=counts(values),checks={retainedValuesExact,sourceNoDataPreserved,outsideMaskUnavailable,float32GridExactRoundTrip:gunzipSync(compressed).equals(gridBytes),imageEqualsQueryClasses:decodedPng(imageBytes).equals(pixels),zeroOpaque:values[c.zeroIndex]===0&&pixels[c.zeroIndex*4+3]===255,missingTransparent:values[c.missingIndex]===-1&&pixels[c.missingIndex*4+3]===0};
  if(!Object.values(checks).every(Boolean))throw Error('Crop packaging consistency failure '+key);
  const missingLandIndex=values.findIndex((v,i)=>v===-1&&land[i]&&native[i]===noData);
  if(missingLandIndex<0)throw Error('Expected original noData on Africa land for '+key);
  const samples=[['zero',c.zeroIndex],['positiveMaximum',c.maxIndex],['missing',c.missingIndex],['sourceMissingOnLand',missingLandIndex]].map(([kind,index])=>({kind,index,row:Math.floor(index/WIDTH),col:index%WIDTH,sourceRow:WINDOW[1]+Math.floor(index/WIDTH),sourceCol:WINDOW[0]+index%WIDTH,lon:BOUNDS[0]+(index%WIDTH+.5)*STEP,lat:BOUNDS[3]-(Math.floor(index/WIDTH)+.5)*STEP,originalValue:native[index]===noData?null:native[index],value:values[index],maskAtCellCentre:!!land[index],sourceNoData:native[index]===noData,pngClass:values[index]<0?null:legend[classIndex(values[index],breaks)].id}));
  const coverage={};for(const [code,mask] of Object.entries(countries)){let valid=0,zero=0,positive=0,maskPixels=0;for(let i=0;i<mask.length;i++)if(mask[i]){maskPixels++;if(values[i]===0)zero++;else if(values[i]>0)positive++;if(values[i]>=0)valid++;}coverage[code]={maskPixels,validPixels:valid,zeroPixels:zero,positivePixels:positive,missingPixels:maskPixels-valid};}
  const archive=archives[measure],mirror=JSON.parse(await fs.readFile(path.join(sourceRoot,archive.name+'.provenance.json')));
  const title=crop.name+'｜'+(measure==='H'?'収穫面積':'生産量');
  layers[key]={title,image:key+'.png',grid:key+'.values.gz',encoding:'float32-le-gzip',noData:-1,bounds:BOUNDS,crs:'EPSG:4326',width:WIDTH,height:HEIGHT,resolutionDegrees:STEP,gridOrder:'row-major north-to-south, west-to-east',unit,period:'2020基準のモデル推計｜SPAM 2020 V2r2（2026-05-05配布）',scope:'アフリカ｜全生産方式の5分角セル値',sourceName:'SPAM 2020 V2r2',sourceLabel:'SPAM 2020 V2r2 / IFPRI',publisher:'International Food Policy Research Institute (IFPRI)',sourceUrl:'https://doi.org/10.7910/DVN/SWPENT',datasetVersion:'6.0',sourceEdition:'V2r2',referenceYear:2020,releaseDate:'2026-05-05',cropCode:crop.code,measure:measure==='H'?'harvested':'production',productionSystem:'A (all technologies)',sourceUnit:measure==='H'?'hectares per native 5-arcminute source cell':'metric tonnes per native 5-arcminute source cell',sourceNoData:noData,sourceResolutionDegrees:STEP,sourceCrs:'EPSG:4326',sourceFile:name,sourceSha256:hash(sourceBytes),sourceBytes:sourceBytes.length,sourceArchive:archive.name,sourceArchiveSha256:archive.sha256,sourceArchiveBytes:archive.bytes,sourceArchiveMd5:archive.md5,sourceDataFileId:archive.id,sourceDownloadUrl:mirror.url,sourceRetrievedAt:mirror.retrievedAt,sourceNativeWindow:WINDOW,sourceNativeOrigin:origin,sourceNativeResolution:resolution,sourceNativeWindowBounds:[origin[0]+WINDOW[0]*resolution[0],origin[1]+WINDOW[3]*resolution[1],origin[0]+WINDOW[2]*resolution[0],origin[1]+WINDOW[1]*resolution[1]],license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',licenseEvidenceUrl:'https://dataverse.harvard.edu/api/datasets/10094351/versions/6.0',licenseEvidence:'Fixed dataset Terms of Use section 4 explicitly permits CC BY 4.0 reuse, distribution and reproduction even commercially. Official public-mirror archive matches that dataset file MD5 and byte count.',sourceNotice:'source-notice.txt',citation:'International Food Policy Research Institute (IFPRI), 2026, "Global Spatially-Disaggregated Crop Production Statistics Data for 2020 Version 2.0 Release 2", https://doi.org/10.7910/DVN/SWPENT, Harvard Dataverse, V6',breaks,colors,zeroValue:0,zeroId:'crop-zero',zeroColor,positiveLegend,legend,validPixels:c.valid,positivePixels:c.positive,zeroPixels:c.zero,missingPixels:c.missing,maximum:c.max,takeaway:crop.takeaway,description:measure==='H'?'収穫面積は同じ土地での複数回の収穫を含む。土地被覆率・物理的な耕地面積とは異なる。':'作物別の生産量を比較する。異なる作物の重さは収量効率・食料価値・所得を直接比較する指標ではない。',method:'Exact native 5-arcminute source window with no resampling, interpolation or smoothing. Original float32 values retained where the unchanged Africa country polygon contains the cell centre. Original noData remains unavailable; supplied zero remains zero. Border cells retain their whole original source-cell value and are not proportionally apportioned by polygon overlap. PNG and query grid use the identical masked array.',queryMethod:'floor((lon-west)/(east-west)*width), floor((north-lat)/(north-south)*height); outside bounds or -1 is unavailable',countryCoverage:coverage,samples,checks};
  sourceRecords[key]={file:name,sha256:hash(sourceBytes),bytes:sourceBytes.length};validation.push({key,...checks,counts:{valid:c.valid,positive:c.positive,zero:c.zero,missing:c.missing,max:c.max},samples});await tif.close();
 }
 const notice='SPAM 2020 V2r2 — International Food Policy Research Institute (IFPRI).\nReference year: 2020. Distribution: 2026-05-05. Harvard Dataverse dataset version6.0.\nGlobal Spatially-Disaggregated Crop Production Statistics Data for 2020 Version 2.0 Release 2. DOI:10.7910/DVN/SWPENT.\nLicense: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/\nDataset-specific grant: fixed dataset Terms of Use, section4, https://dataverse.harvard.edu/api/datasets/10094351/versions/6.0\nChanges: native Africa window, country-polygon cell-centre mask, noData encoded as -1, thematic PNG coloring. Original retained numeric cells are unchanged.\nThis data was provided by the International Food Policy Research Institute (IFPRI). IFPRI bears no responsibility for the analyses or interpretations of the data presented here.\nThe data provider does not endorse this website.\n';
 await fs.writeFile(path.join(out,'source-notice.txt'),notice);
 const mirrorReadme=await fs.readFile(path.join(sourceRoot,'Readme_SPAM2020V2r2.txt'));
 const files={};for(const name of (await fs.readdir(out)).filter(n=>n!=='manifest.json')){const bytes=await fs.readFile(path.join(out,name));files[name]={bytes:bytes.length,sha256:hash(bytes)};}
 const manifest={schemaVersion:1,version:'1.0.0',bounds:BOUNDS,crs:'EPSG:4326',width:WIDTH,height:HEIGHT,resolutionDegrees:STEP,gridOrder:'row-major north-to-south, west-to-east',layers,boundary:{file:'src/data/atlas/africa-geography.json',sha256:hash(boundaryBytes),license:'Natural Earth public domain',method:'Even-odd polygon scanlines at native source-cell centres, original 55 supplied country/disputed-area polygons unchanged'},limitations:['These are official statistical-model estimates referenced to2020, not direct observations of individual farms or current harvests. Inputs include national/subnational statistics, cropland, suitability, irrigation and other information from varied dates.','A native5-arcminute geographic cell is approximately9km north/south but its east/west width varies by latitude. Units are hectares or tonnes per original source cell, not per square kilometre.','Harvested area includes repeated harvests on the same land and can exceed physical cropland area. It is not a land-cover fraction.','Original noData is not treated as zero production or as proof that cultivation is impossible. Different crops have different coverage; only source-provided zeros are labelled zero.','Country centre clipping keeps whole original source-cell values at retained border cells. It does not divide a cell among countries; summed displayed cells are not official national totals. Coarse/generalized boundaries can omit small islands and coastal cells.','Production mass across different crops is not comparable as calories, nutrition, value, household income or yield efficiency. Crop output alone does not prove household food security.','Natural conditions help explain possibilities, while irrigation, varieties, infrastructure, markets, land access and policy affect outcomes. Climate is not a deterministic explanation.'],processing:{generator:'scripts/prepare-africa-crops.mjs',generatorSha256:hash(await fs.readFile(fileURLToPath(import.meta.url))),node:process.version,geotiff:'Existing private GeoTIFF.js preparation dependency; not a runtime site dependency',sourceWindow:WINDOW,method:'No raster resampling; unchanged original source float32 cells plus Africa country cell-centre mask.',sourceRecords,reproduction:{extract:'Python standard-library zipfile: extract files ending _MAIZ_A.tif, _RICE_A.tif, _WHEA_A.tif, _CASS_A.tif from the verified H/P archives into <source-root>/selected; zipfile validates member CRC.',command:'node scripts/prepare-africa-crops.mjs --source-root <immutable-private-cache> --geotiff-package <existing-geotiff-package>',cachePolicy:'Global original archives, TIFFs and full metadata remain private. Africa PNG/query grids and provenance/source notice are shipped.'}},licenseEvidence:{datasetUrl:'https://doi.org/10.7910/DVN/SWPENT',fixedMetadataUrl:'https://dataverse.harvard.edu/api/datasets/10094351/versions/6.0',fixedMetadataSha256:hash(originalMetadata),datasetVersion:'6.0',license:'CC BY 4.0',grantSection:4,officialMirrorLinksPage:'https://www.mapspam.info/data/',sourceArchiveIdentity:'Both public-mirror ZIP bytes match the official fixed Dataverse file MD5 and filesize. Neither a guestbook response nor an account was submitted.',mirrorReadme:{name:'Readme_SPAM2020V2r2.txt',bytes:mirrorReadme.length,sha256:hash(mirrorReadme),md5:hash(mirrorReadme,'md5'),dataverseMd5:'34b66fe5f86456617638bfe452e79145',matchesDataverseReadme:false,note:'Official-mirror README has the same byte count but a different checksum. Retained as a distinct ancillary document, not claimed byte-identical and not used as the license evidence. The actual H/P source archives are byte-identical by official MD5 and size.'}},checks:{allLayersExactSourceCells:validation.every(r=>r.retainedValuesExact),allLayersNoDataPreserved:validation.every(r=>r.sourceNoDataPreserved),allLayersOutsideMaskUnavailable:validation.every(r=>r.outsideMaskUnavailable),allGridsExactRoundTrip:validation.every(r=>r.float32GridExactRoundTrip),allImagesMatchQuery:validation.every(r=>r.imageEqualsQueryClasses),allZerosOpaque:validation.every(r=>r.zeroOpaque),allMissingTransparent:validation.every(r=>r.missingTransparent),sourceArchivesMatchFixedLicensedDataset:true},files};
 await writeJson(path.join(out,'manifest.json'),manifest);
 console.log(JSON.stringify({output:out,layers:Object.keys(layers),checks:manifest.checks,totalAssetBytes:Object.values(files).reduce((s,f)=>s+f.bytes,0),validation}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
