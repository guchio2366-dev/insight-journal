import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {climateClasses,latinClimateCities} from '../src/data/atlas/latin-america-climate.ts';

const baseline='public/assets/atlas/latin-america-climate-v1/';
const evidence='data-source/atlas/latin-nature/';
const output='public/assets/atlas/latin-nature-v1/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sourceManifest=read(baseline+'manifest.json');
for(const file of ['latin-america.grid.json','latin-america.png','cities-provenance.json']){
 const bytes=readFileSync(baseline+file), expected=sourceManifest.files[file];
 if(bytes.length!==expected.bytes||hash(bytes)!==expected.sha256)throw new Error(`Baseline source changed: ${file}`);
}
const metadata=read(evidence+'koppen-figshare-v1-metadata.json');
if(metadata.version!==1||metadata.license.name!=='CC BY 4.0')throw new Error('Pinned publisher license/version mismatch');
const archive=metadata.files.find(f=>f.id===45057352);
if(archive?.computed_md5!=='b19c60b2c83380bd1010911f377139e5'||archive.size!==130339513)throw new Error('Archive metadata mismatch');
const groups=[
 {id:1,key:'熱帯',name:'熱帯',color:'#6ba87b',codes:['Af','Am','Aw'],description:'一年を通して暖かい。Af・Am・Awでは雨季・乾季の違いがあります。'},
 {id:2,key:'乾燥帯',name:'乾燥帯',color:'#d7ae62',codes:['BWh','BWk','BSh','BSk'],description:'砂漠・ステップの区分。降水量が少ない地域。'},
 {id:3,key:'温帯',name:'温帯',color:'#d3db89',codes:['Csa','Csb','Csc','Cwa','Cwb','Cwc','Cfa','Cfb','Cfc'],description:'季節的な気温や雨の変化がある区分。'},
 {id:4,key:'冷帯',name:'冷帯',color:'#91b6c5',codes:['Dsa','Dsb','Dsc','Dsd','Dwa','Dwb','Dwc','Dwd','Dfa','Dfb','Dfc','Dfd'],description:'冬の寒さが厳しい区分。'},
 {id:5,key:'寒帯',name:'寒帯',color:'#c5b8d9',codes:['ET','EF'],description:'高山や南端など、最暖月も低温の地域。'},
];
const classToGroup=Object.fromEntries(climateClasses.map(c=>[c.id,groups.find(g=>g.key===c.group).id]));
const grid=read(baseline+'latin-america.grid.json');
if(grid.crs!=='EPSG:3857'||grid.noData!==0||grid.values.length!==grid.width*grid.height)throw new Error('Unexpected source grid');
const colors=groups.map(g=>g.color.match(/\w\w/g).map(n=>parseInt(n,16)));
const scan=Buffer.alloc((grid.width*4+1)*grid.height);
const counts=Object.fromEntries(groups.map(g=>[g.id,0]));
for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){
 const value=grid.values[y*grid.width+x],target=(y*(grid.width*4+1))+1+x*4;
 if(value===0)continue;
 const id=classToGroup[value];if(!id)throw new Error(`Unknown class ${value}`);
 colors[id-1].forEach((c,i)=>scan[target+i]=c);scan[target+3]=255;counts[id]++;
}
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function chunk(kind,data){const tag=Buffer.from(kind),body=Buffer.concat([tag,data]);let crc=0xffffffff;for(const b of body)crc=table[(crc^b)&255]^(crc>>>8);const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,body,tail]);}
const header=Buffer.alloc(13);header.writeUInt32BE(grid.width,0);header.writeUInt32BE(grid.height,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]);
const audits=[];
const clean=s=>s.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim();
for(const stationId of ['78762','83377','78325']){
 const file=`climatview-${stationId}.html`,raw=readFileSync(evidence+file),page=raw.toString('utf8');
 if(!/colspan="4">Observation<\/th>\s*<th[^>]*colspan="2">Normal<\/th>\s*<th[^>]*colspan="3">SPI<\/th>/.test(page))throw new Error('Normal headers changed');
 const months=new Map();
 for(const match of page.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>clean(m[1]));
  if(!/^\d{4}-\d{2}$/.test(cells[0]??''))continue;
  if(cells.length!==10)throw new Error('Unexpected normal table width');
  const values=cells.slice(5,7).map(s=>s==='///'||s==='-'?null:Number(s));
  if(values.some(v=>v!==null&&!Number.isFinite(v)))throw new Error('Invalid normal');
  const month=Number(cells[0].slice(-2));
  if(months.has(month)&&JSON.stringify(months.get(month))!==JSON.stringify(values))throw new Error('Normal values differ across years');
  months.set(month,values);
 }
 const city=latinClimateCities.find(c=>c.stationId===stationId);
 const info=page.match(/<div id="info">([\s\S]*?)<\/div>/)?.[1];
 const location=info?.match(/Lat\.:\s*([\d.]+)\s*&deg;([NS])\s*\/\s*Lon\.:\s*([\d.]+)\s*&deg;([EW])[\s\S]*?Height:\s*([\d.]+)\(m\)/);
 if(!location)throw new Error(`Station location missing ${stationId}`);
 const latitude=Number(location[1])*(location[2]==='S'?-1:1),longitude=Number(location[3])*(location[4]==='W'?-1:1),elevationM=Number(location[5]);
 if(latitude!==city.latitude||longitude!==city.longitude||elevationM!==city.elevationM)throw new Error(`Station coordinates/elevation changed ${stationId}`);
 if(months.size!==12)throw new Error('Incomplete months');
 for(let m=1;m<=12;m++)if(JSON.stringify(months.get(m))!==JSON.stringify([city.temperatureC[m-1],city.precipitationMm[m-1]]))throw new Error(`Source values changed ${stationId}/${m}`);
 audits.push({stationId,sourceUrl:city.sourceUrl,file,bytes:raw.length,sha256:hash(raw),longitude,latitude,elevationM,comparedValues:24,match:true});
}
mkdirSync(output,{recursive:true});mkdirSync('src/data/atlas/latin-america',{recursive:true});
writeFileSync(output+'climate-groups.png',png);
const originalClassIds=[...new Set(grid.values)].filter(v=>v!==0).sort((a,b)=>a-b);
const data={schemaVersion:1,period:'1991–2020',sourceResolutionDegrees:.1,groups,originalClasses:climateClasses.filter(c=>originalClassIds.includes(c.id)),cities:latinClimateCities,bounds4326:grid.bounds4326,crs:grid.crs,image:'/assets/atlas/latin-nature-v1/climate-groups.png',originalImage:'/assets/atlas/latin-america-climate-v1/latin-america.png',noData:{value:0,meaning:'原典の海・未分類または対象国マスク外。気候の観測値0ではありません。'},license:'CC BY 4.0',attribution:'Beck et al. (2023) の気候区分をInsight Journalが5大群へ加工。'};
writeFileSync('src/data/atlas/latin-america/nature.json',JSON.stringify(data,null,2)+'\n');
const manifest={schemaVersion:1,generatedAt:'2026-10-01',source:{period:data.period,license:data.license,metadataUrl:'https://api.figshare.com/v2/articles/21789074/versions/1',metadataSha256:hash(readFileSync(evidence+'koppen-figshare-v1-metadata.json')),archiveId:archive.id,archiveBytes:archive.size,archiveChecksum:{algorithm:'MD5',encoding:'base64',value:Buffer.from(archive.computed_md5,'hex').toString('base64')},baselineManifest:'/assets/atlas/latin-america-climate-v1/manifest.json',baselineManifestSha256:hash(readFileSync(baseline+'manifest.json')),baselineGridSha256:sourceManifest.files['latin-america.grid.json'].sha256,archiveVerification:'再取得したFigshare metadataのID・MD5・bytesを既存取得台帳と照合。今回130MB元archiveの再ダウンロードはしていない。'},processing:{script:'scripts/prepare-latin-nature.mjs',scriptSha256:hash(readFileSync('scripts/prepare-latin-nature.mjs')),method:'既存EPSG:3857分類gridの各セルに原class→5group色を適用。寸法・範囲・透明マスク・セル配置を変更しない。補間なし。',groupMapping:classToGroup,counts,countsMeaning:'画像セル数の整合検証。面積・国の割合ではない。',png:{width:grid.width,height:grid.height,bytes:png.length,sha256:hash(png)},boundaries:sourceManifest.processing.boundarySource,boundarySha256:sourceManifest.processing.boundarySha256},stationNormals:{period:data.period,unit:['°C','mm/月'],grain:'観測所1点・月別平年値',inheritedStations:16,freshlyAuditedStations:audits,missing:'nullは未取得/欠測。正常な0mmは0のまま。',terms:'https://www.jma.go.jp/jma/kishou/info/coment.html'},limitations:sourceManifest.limitations};
writeFileSync(output+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`nature groups PNG ${png.length} bytes; ${originalClassIds.length} original classes, 16 stations, ${audits.length*24} fresh monthly values matched`);
