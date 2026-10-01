import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {deflateSync} from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = p => readFileSync(path.join(root, p));
const json = p => JSON.parse(read(p).toString('utf8').replace(/^\uFEFF/, ''));
const save = (p, value) => {mkdirSync(path.dirname(path.join(root,p)), {recursive:true});writeFileSync(path.join(root,p), JSON.stringify(value,null,2)+'\n');};
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function pngChunk(type,bytes){const t=Buffer.from(type);const b=Buffer.concat([t,bytes]);let crc=0xffffffff;for(const v of b)crc=crcTable[(crc^v)&255]^(crc>>>8);const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(bytes.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,b,tail]);}
function validityMask(grid,width,height){
 const valid=new Uint8Array(grid.width*grid.height);for(const [start,count] of grid.validRuns)valid.fill(1,start,start+count);
 const [west,south,east,north]=grid.bounds;const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));const top=merc(north),bottom=merc(south);
 const pixels=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++){
  const lat=(2*Math.atan(Math.exp(top+(bottom-top)*(y+.5)/height))-Math.PI/2)*180/Math.PI;
  const sourceY=Math.floor((north-lat)/grid.cellSize);
  for(let x=0;x<width;x++){
   const lon=west+(east-west)*(x+.5)/width;const sourceX=Math.floor((lon-west)/grid.cellSize);
   if(!valid[sourceY*grid.width+sourceX])continue;
   const at=y*(width*4+1)+1+x*4;pixels[at]=216;pixels[at+1]=222;pixels[at+2]=224;pixels[at+3]=255;
  }
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',deflateSync(pixels,{level:9})),pngChunk('IEND',Buffer.alloc(0))]);
}
export function parseCsv(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}
  const header=rows.shift().map(s=>s.replace(/^\uFEFF/,''));
  return rows.map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]??''])));
}
const m49={ARG:'032',CHL:'152',HTI:'332',DOM:'214',BHS:'044',FLK:'238',URY:'858',BRA:'076',BOL:'068',PER:'604',COL:'170',PAN:'591',CRI:'188',NIC:'558',HND:'340',SLV:'222',GTM:'320',BLZ:'084',VEN:'862',GUY:'328',SUR:'740',ECU:'218',PRI:'630',JAM:'388',CUB:'192',PRY:'600',TTO:'780',VCT:'670',LCA:'662',KNA:'659',GRD:'308',DMA:'212',BRB:'052',ATG:'028'};
const rawPath='data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv';
const csv=parseCsv(read(rawPath).toString('utf8'));
const cropManifest=json('public/assets/atlas/latin-america-agriculture-v1/manifest.json');
const livestockManifest=json('public/assets/atlas/latin-america-livestock-v1/manifest.json');
const products=[{id:'bana',label:'バナナ',item:'486',unit:'t'},{id:'coff',label:'アラビカコーヒー',item:'656',unit:'t'},{id:'soyb',label:'大豆',item:'236',unit:'t'},{id:'cattle',label:'牛',item:'866',unit:'An'}];
const quantity = (country, item, unit) => {
 const source=csv.find(r=>r['Area Code (M49)'].replace(/^'/,'').padStart(3,'0')===m49[country]&&r['Item Code']===item&&r.Year==='2024'&&r.Unit===unit);
 if(!source)return {value:null,status:'unavailable',flag:null,note:'2024年の該当行なし'};
 if(source.Value.trim()==='')return {value:null,status:'missing',flag:source.Flag,note:source.Note||'原表の空欄'};
 const value=Number(source.Value);
 if(!Number.isFinite(value)||value<0)throw Error(`Invalid QCL quantity ${country}/${item}`);
 return {value,status:value===0?'zero':'value',flag:source.Flag,sourceValue:source.Value,note:source.Note||null};
};
const layers=products.map(p=>{
 const manifest=p.id==='cattle'?livestockManifest:cropManifest;
 const source=manifest.layers.find(l=>l.id===p.id);
 if(!source||source.countries.length!==34)throw Error(`Missing spatial layer ${p.id}`);
 const assetDir=p.id==='cattle'?'latin-america-livestock-v1':'latin-america-agriculture-v1';
 const assets=Object.fromEntries([source.image,source.query].map(name=>{
  const bytes=read(`public/assets/atlas/${assetDir}/${name}`);const sha=hash(bytes);
  if(source.assets[name].sha256!==sha)throw Error(`Original asset hash mismatch ${name}`);
  return [name,{sha256:sha,bytes:bytes.length}];
 }));
 const maskPath=`public/assets/atlas/latin-agriculture-v2/${p.id}-validity.png`;mkdirSync(path.dirname(path.join(root,maskPath)),{recursive:true});const mask=validityMask(json(`public/assets/atlas/${assetDir}/${source.query}`),source.size[0],source.size[1]);writeFileSync(path.join(root,maskPath),mask);assets[`${p.id}-validity.png`]={sha256:hash(mask),bytes:mask.length};
 return {id:p.id,label:p.label,referenceYear:2020,spatialUnit:p.id==='cattle'?'頭/km²':'ha/5分格子',image:`/assets/atlas/${assetDir}/${source.image}`,validityImage:`/assets/atlas/latin-agriculture-v2/${p.id}-validity.png`,query:`/assets/atlas/${assetDir}/${source.query}`,bounds:source.bounds,breaks:source.breaks,colors:source.colors,assets,countries:source.countries.map(c=>({code:c.code,spatial:{value:p.id==='cattle'?c.meanDensity:c.value,status:c.validCells===0?'missing':(p.id==='cattle'?c.meanDensity:c.value)===0?'zero':'value',validCells:c.validCells,...(p.id==='cattle'?{modelEstimatedHead:c.value,validAreaKm2:c.validAreaKm2}:{})},national2024:quantity(c.code,p.item,p.unit),...(p.id==='cattle'?{beef2024:quantity(c.code,'867','t'),milk2024:quantity(c.code,'882','t')}:{})}))};
});
const flags=json('data-source/atlas/livestock/faostat-codes.json').Flags;
for(const l of layers){l.licence=l.id==='cattle'?'CC BY 4.0':'CC BY-SA 4.0';l.attribution=l.id==='cattle'?'FAO (2024), GLW4 Gridded Livestock Density, reference year 2020; via CGIAR Climate Action Data Hub. Regional visualization and country aggregation by Insight Journal.':'IFPRI (2026), MapSPAM 2020 Version 2 Release 2; via CGIAR Climate Action Data Hub. Regional visualization and country aggregation by Insight Journal.';}
const data={schemaVersion:1,scope:{countries:Object.keys(m49),countryCount:34,description:'中米・カリブ・南米の32か国と2地域。メキシコは北米の専用ページに掲載。'},spatialYear:2020,nationalYear:2024,nationalSource:{name:'FAO, FAOSTAT Crops and livestock products',updated:'2025-12-31',accessed:'2026-10-01',url:'https://www.fao.org/faostat/en/#data/QCL',licence:'CC BY 4.0',grain:'country/calendar year',stockUnit:'head',productionUnit:'t'},defaultLayer:'bana',defaultPlace:'CRI',layers,flags,definitions:{crop:'MapSPAM 2020 v2r2による約9km（5分）格子の年間収穫面積。播種地の境界ではなく、複数回収穫を含むため農地の実面積とは一致しない。',coffee:'地図はアラビカ種の収穫面積。FAOSTATの2024年国別値は全品種のコーヒー生豆生産量で、地図と品種範囲が異なる。',cattle:'GLW4による2020年の牛の分布推計（頭/km²）。国別平均は有効格子の面積加重平均。2024年飼養頭数は別のFAOSTAT国統計。牛肉は骨付きの生鮮・冷蔵肉、牛乳は生乳を集計。',zero:'数値0は原表又はモデルに有効な0。小さい正値は0と区別して表示する。',missing:'原表空欄/モデル有効格子なしは欠測。2024年に該当国・品目行がない場合は「原表行なし」。取得が完了していない指標は「未取得」、非公表扱いの値は「秘匿」と区別し、0に変換しない。'}};
save('src/data/atlas/latin-america/agriculture.json',data);
save('public/assets/atlas/latin-agriculture-v2/agriculture.json',data);
const source=json('data-source/atlas/latin-agriculture/raw/qcl-source.json');
const outputs=['src/data/atlas/latin-america/agriculture.json','public/assets/atlas/latin-agriculture-v2/agriculture.json',...products.map(p=>`public/assets/atlas/latin-agriculture-v2/${p.id}-validity.png`)];
const provenance={retrieved:'2026-10-01',preparationScript:'scripts/prepare-latin-agriculture.mjs',originalSources:{qcl:source,crops:json('public/assets/atlas/latin-america-agriculture-v1/provenance.json'),livestock:json('public/assets/atlas/latin-america-livestock-v1/provenance.json')},processing:{scope:Object.keys(m49),qclYear:2024,m49Join:m49,cropCountryValue:'sum of modeled annual harvested-area cells, ha',cattleCountryValue:'density times spherical cell area summed, divided by valid area km2; density retained on original raster',rounding:'No numeric rounding during extraction. Display rounding only.',missing:'Blank Value preserved as null/missing; absent row null/unavailable; valid numeric zero remains zero.',licences:{crops:'CC BY-SA 4.0',livestock:'CC BY 4.0',qcl:'CC BY 4.0'},licenceUrls:['https://cgiar-climate-data-hub.github.io/catalog/spam2020/','https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/','https://www.fao.org/contact-us/terms/db-terms-of-use/en']},inputs:{[rawPath]:{sha256:hash(read(rawPath)),bytes:read(rawPath).length}},outputs:Object.fromEntries(outputs.map(p=>[p,{sha256:hash(read(p)),bytes:read(p).length}])),validation:{layers:layers.length,countriesPerLayer:34,statusCounts:Object.fromEntries(layers.map(l=>[l.id,Object.fromEntries(['value','zero','missing','unavailable'].map(status=>[status,l.countries.filter(c=>c.national2024.status===status).length]))]))}};
save('data-source/atlas/latin-agriculture/provenance.json',provenance);
save('public/assets/atlas/latin-agriculture-v2/provenance.json',provenance);
console.log(JSON.stringify(provenance.validation));
