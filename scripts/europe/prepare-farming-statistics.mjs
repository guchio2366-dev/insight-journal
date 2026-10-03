/** Extract published FAOSTAT national rows; spatial model values are never read. */
import { createReadStream, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createInflateRaw, inflateRawSync, gzipSync } from 'node:zlib';
import { StringDecoder } from 'node:string_decoder';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'public/assets/atlas/europe/farming-statistics-v1');
const ledgerDir = resolve(root, 'data-source/atlas/europe/farming-statistics');
const args = process.argv.slice(2);
const cacheIndex = args.indexOf('--fao-cache');
if (cacheIndex < 0 || !args[cacheIndex + 1]) throw new Error('Usage: node scripts/europe/prepare-farming-statistics.mjs --fao-cache PATH');
const cache = resolve(args[cacheIndex + 1]);
const accessedAt = new Date().toISOString();
const years = Array.from({ length: 10 }, (_, i) => 2015 + i);
const countryList = JSON.parse(readFileSync(resolve(root, 'src/data/atlas/europe/countries.json'), 'utf8'));
const m49 = { RUS:643,NOR:578,FRA:250,SWE:752,BLR:112,UKR:804,POL:616,AUT:40,HUN:348,MDA:498,ROU:642,LTU:440,LVA:428,EST:233,DEU:276,BGR:100,GRC:300,ALB:8,HRV:191,CHE:756,LUX:442,BEL:56,NLD:528,PRT:620,ESP:724,IRL:372,ITA:380,DNK:208,GBR:826,ISL:352,SVN:705,FIN:246,SVK:703,CZE:203,BIH:70,MKD:807,SRB:688,MNE:499,KOS:null,VAT:336,SMR:674,MCO:492,MLT:470,LIE:438,AND:20 };
if (countryList.length !== 45 || countryList.some(c => !(c.code in m49))) throw new Error('Europe country catalog changed; review explicit M49 mapping.');
const measures = [];
const measure = (id, topic, label, domain, itemCode, elementCode, unit, definition) => measures.push({ id, topics:topic==='forest'?['forest','treecover']:[topic], label, domain, itemCode, elementCode, unit, definition, share:true, shareLabel:elementCode==='5111'||elementCode==='5112'?'世界飼養数比':elementCode==='5110'?'世界森林面積比':'世界生産量比' });
for (const [topic,label,item] of [['wheat','小麦','15'],['barley','大麦','44'],['maize','トウモロコシ','56'],['rapeseed','菜種','270'],['sunflower','ヒマワリ','267'],['sugarbeet','テンサイ','157'],['potato','ジャガイモ','116'],['rice','米','27'],['soybean','大豆','236']]) {
  measure(topic+'-production',topic,label+'生産量','QCL',item,'5510','t',topic==='rice'?'FAOSTAT Rice の生産量（籾米）。精米量ではありません。':'FAOSTAT の当該作物の生産量。穀物は乾燥子実の収穫で、青刈り・飼料用サイレージを含みません。');
}
for (const [topic,label,item,element,unit] of [['cattle','牛','866','5111','An'],['pig','豚','1034','5111','An'],['chicken','鶏','1057','5112','1000 An'],['sheep','羊','976','5111','An']]) {
  measure(topic+'-stocks',topic,label+'飼養数','QCL',item,element,unit,'全国の生体家畜数。肉用・乳用・採卵用などの用途別頭数を示しません。鶏は原資料の千羽単位です。');
}
for (const [id,topic,label,item] of [['cattle-meat','cattle','牛肉生産量','867'],['cattle-milk','cattle','牛の生乳生産量','882'],['pig-meat','pig','豚肉生産量','1035'],['chicken-meat','chicken','鶏肉生産量','1058'],['chicken-eggs','chicken','鶏卵生産量','1062'],['sheep-meat','sheep','羊肉生産量','977']]) {
  measure(id,topic,label,'QCL',item,'5510','t','FAOSTAT の直接分類による全国生産量。生体家畜数とは別の指標です。');
}
measure('roundwood-production','forest','丸太生産量','FO','1861','5516','m3','FAOSTAT Roundwood。林地・樹木から搬出された丸太で、薪材と産業用丸太を含みます。製材と足し合わせません。');
measure('sawnwood-production','forest','製材生産量','FO','1872','5516','m3','FAOSTAT Sawnwood。丸太を加工した製材品の生産量。丸太との二重合算を行いません。');
measure('forest-area','forest','森林面積','RL','6646','5110','1000 ha','FAOSTAT Forest land の土地利用面積（千ha）。樹木被覆地図の画素合計や林産物の生産量とは別の統計です。');
const domains = [
  { id:'QCL', file:'Production_Crops_Livestock', expectedSha256:'c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853' },
  { id:'FO', file:'Forestry', expectedSha256:'c2f7fc99651f620b6c0a16ff07f6c1d80c153fa01d5a3422413d9c89e0d61444' },
  { id:'RL', file:'Inputs_LandUse', expectedSha256:'f6ccf002c3e83a32613d84f032e002b77ac80c8f871c454b12104815f36a9ad5' },
];
const catalog = JSON.parse(readFileSync(resolve(root,'data-source/atlas/latin-agriculture/raw/datasets_E.json'),'utf8')).Datasets.Dataset;
const countries = Object.fromEntries(countryList.map(c => [c.code, { m49:m49[c.code], sourceNames:{}, observations:[] }]));
const reverse = new Map(Object.entries(m49).filter(([,v]) => v !== null).map(([k,v]) => [String(v),k]));
const world = { m49:1, sourceNames:{}, observations:[] };
const sources = [], flags = {}, sourceItems = {}, counts = {}, seen = new Set();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Read the ZIP central directory without extracting multi-hundred-MB CSV files.
function zipEntries(bytes) {
  let end = bytes.length - 22;
  while (end >= Math.max(0,bytes.length-65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < Math.max(0,bytes.length-65557)) throw new Error('ZIP end record not found');
  const total = bytes.readUInt16LE(end+10), entries = new Map();
  let pos = bytes.readUInt32LE(end+16);
  for (let n=0;n<total;n++) {
    if (bytes.readUInt32LE(pos) !== 0x02014b50) throw new Error('Invalid ZIP directory');
    const method=bytes.readUInt16LE(pos+10),size=bytes.readUInt32LE(pos+20),rawSize=bytes.readUInt32LE(pos+24),nameLength=bytes.readUInt16LE(pos+28),extra=bytes.readUInt16LE(pos+30),comment=bytes.readUInt16LE(pos+32),local=bytes.readUInt32LE(pos+42);
    const name=bytes.subarray(pos+46,pos+46+nameLength).toString('utf8');
    if (bytes.readUInt32LE(local)!==0x04034b50 || ![0,8].includes(method)) throw new Error('Unsupported ZIP entry');
    const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    entries.set(name,{method,start,size,rawSize}); pos += 46+nameLength+extra+comment;
  }
  return entries;
}
function smallMember(bytes, entries, name) {
  const e=entries.get(name); if(!e) throw new Error('Missing ZIP member '+name);
  const compressed=bytes.subarray(e.start,e.start+e.size);
  const raw=e.method===8?inflateRawSync(compressed):compressed;
  if(raw.length!==e.rawSize)throw new Error('ZIP size mismatch '+name);
  return raw;
}
// A quoted CSV field may contain commas, escaped quotes or newlines. The state
// survives stream boundaries, and raw decimal strings are retained untouched.
async function* csvRows(chunks) {
  const decoder=new StringDecoder('utf8'); let field='',row=[],quoted=false,pendingQuote=false;
  const parse=function*(text) {
    for(const char of text) {
      if(pendingQuote) {
        pendingQuote=false;
        if(char==='"'){field+='"';continue;}
        quoted=false;
      }
      if(quoted){if(char==='"')pendingQuote=true;else field+=char;continue;}
      if(char==='"'&&field===''){quoted=true;continue;}
      if(char===','){row.push(field);field='';continue;}
      if(char==='\n'){row.push(field);field='';yield row;row=[];continue;}
      if(char!=='\r')field+=char;
    }
  };
  for await(const chunk of chunks)yield*parse(decoder.write(chunk));
  yield*parse(decoder.end());
  if(quoted&&!pendingQuote)throw new Error('Unclosed CSV quote');
  if(field!==''||row.length){row.push(field);yield row;}
}
async function smallRows(bytes) {
  const rows=[];for await(const row of csvRows([bytes]))rows.push(row);return rows;
}

for (const domain of domains) {
  const filename=domain.file+'_E_All_Data_(Normalized).zip', archivePath=resolve(cache,filename);
  const zip=readFileSync(archivePath),archiveSha256=sha(zip);
  if(archiveSha256!==domain.expectedSha256)throw new Error('Cached source hash changed; review release metadata before adoption: '+filename);
  const entries=zipEntries(zip), selected=measures.filter(m=>m.domain===domain.id), pair=new Map(selected.map(m=>[m.itemCode+':'+m.elementCode,m]));
  const itemRows=await smallRows(smallMember(zip,entries,domain.file+'_E_ItemCodes.csv'));
  const itemHeader=itemRows.shift().map(s=>s.replace(/^\uFEFF/,'').trim()),itemAt=itemHeader.indexOf('Item Code'),itemNameAt=itemHeader.indexOf('Item');
  sourceItems[domain.id]=Object.fromEntries(itemRows.filter(r=>selected.some(m=>m.itemCode===r[itemAt])).map(r=>[r[itemAt],r[itemNameAt]]));
  if(selected.some(m=>!sourceItems[domain.id][m.itemCode]))throw new Error('Selected item absent from publisher catalog');
  const areaRows=await smallRows(smallMember(zip,entries,domain.file+'_E_AreaCodes.csv'));
  const areaHeader=areaRows.shift().map(s=>s.replace(/^\uFEFF/,'').trim()),m49At=areaHeader.indexOf('M49 Code'),areaAt=areaHeader.indexOf('Area Code'),areaNameAt=areaHeader.indexOf('Area');
  if(m49At<0||areaAt<0||areaNameAt<0)throw new Error('Publisher area-code columns changed');
  for(const r of areaRows){const code=reverse.get(String(Number(r[m49At].replace(/^'/,''))));const target=code?countries[code]:r[areaAt]==='5000'?world:null;if(target)target.sourceNames[domain.id]={name:r[areaNameAt],areaCode:r[areaAt],m49Raw:r[m49At]};}
  const flagRows=await smallRows(smallMember(zip,entries,domain.file+'_E_Flags.csv'));
  flagRows.shift();flags[domain.id]=Object.fromEntries(flagRows.filter(r=>r.length>=2).map(r=>[r[0],r[1]]));
  const metadata=catalog.find(r=>r.DatasetCode===domain.id);
  sources.push({id:domain.id,publisher:'FAO',dataset:metadata.DatasetName,releaseDate:metadata.DateUpdate.slice(0,10),url:'https://bulks-faostat.fao.org/production/'+filename,landingUrl:'https://www.fao.org/faostat/en/#data/'+domain.id,archive:{file:filename,bytes:zip.length,sha256:archiveSha256},sourceMember:domain.file+'_E_All_Data_(Normalized).csv',license:'CC BY 4.0',licenseUrl:'https://www.fao.org/contact-us/terms/db-terms-of-use/',cacheReusedAt:accessedAt,licenseVerifiedAt:accessedAt,originalRetrievedAt:null});
  const entry=entries.get(domain.file+'_E_All_Data_(Normalized).csv');
  let chunks=createReadStream(archivePath,{start:entry.start,end:entry.start+entry.size-1});
  if(entry.method===8)chunks=chunks.pipe(createInflateRaw());
  let header=null,index=null,selectedCount=0;
  for await(const row of csvRows(chunks)) {
    if(!header){header=row.map(s=>s.replace(/^\uFEFF/,'').trim());index=Object.fromEntries(header.map((key,i)=>[key,i]));continue;}
    const year=Number(row[index.Year]);if(year<2015||year>2024)continue;
    const metric=pair.get(row[index['Item Code']]+':'+row[index['Element Code']]);if(!metric)continue;
    const areaCode=row[index['Area Code']],code=reverse.get(String(Number(row[index['Area Code (M49)']].replace(/^'/,''))));
    const target=areaCode==='5000'?world:code?countries[code]:null;if(!target)continue;
    if(areaCode==='5000'&&row[index.Area]!=='World')throw new Error('World area identifier changed');
    const unit=row[index.Unit];if(unit!==metric.unit)throw new Error('Unexpected source unit '+metric.id+': '+unit);
    const rawValue=row[index.Value],flag=row[index.Flag],note=row[index.Note]||null;
    if(rawValue!==''&&!/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(rawValue))throw new Error('Invalid raw decimal '+rawValue);
    const key=(areaCode==='5000'?'World':code)+':'+metric.id+':'+year;if(seen.has(key))throw new Error('Duplicate publisher observation '+key);seen.add(key);
    const observation=[metric.id,year,rawValue,unit,flag];if(note)observation.push(note);
    target.observations.push(observation);selectedCount++;
  }
  counts[domain.id]={selectedRows:selectedCount,sourceUncompressedBytes:entry.rawSize};
  console.log(domain.id,selectedCount,'publisher observations');
}
for(const country of [...Object.values(countries),world])country.observations.sort((a,b)=>a[0].localeCompare(b[0])||a[1]-b[1]);
const data={schemaVersion:1,comparisonYear:2024,years,measures,countries,world,sources,sourceItems,flags,observationTuple:['measureId','year','rawDecimal','unit','flag','note?'],method:'Explicit publisher M49 and item/element matching. Only 2015–2024 published rows are included. No missing rows, countries or years are filled. Blank/M/L values are missing; published zero remains zero. RUS is the entire Russian Federation. KOS has no independent M49 mapping in these releases. Spatial model cells are not read, summed, calibrated or used to infer national totals. World rows are preserved from source Area Code 5000; shares require the same item, element, year and unit. No custom vegetable/fruit grouping, species aggregation, head-unit conversion or forest-product addition.'};
mkdirSync(output,{recursive:true});mkdirSync(ledgerDir,{recursive:true});
const dataBytes=Buffer.from(JSON.stringify(data)+'\n');
writeFileSync(resolve(output,'statistics.json'),dataBytes);writeFileSync(resolve(output,'statistics.json.gz'),gzipSync(dataBytes,{level:9,mtime:0}));
const coverage=Object.fromEntries(countryList.map(c=>[c.code,{m49:m49[c.code],rowCount:countries[c.code].observations.length,comparisonYearMeasures:countries[c.code].observations.filter(o=>o[1]===2024&&o[2]!==''&&!['M','L'].includes(o[4])).map(o=>o[0]),missingMapping:c.code==='KOS'}]));
const files=Object.fromEntries(['statistics.json','statistics.json.gz'].map(name=>{const p=resolve(output,name);return[name,{bytes:statSync(p).size,sha256:sha(readFileSync(p))}];}));
const ledger={schemaVersion:1,preparedAt:accessedAt,preparationScript:'scripts/europe/prepare-farming-statistics.mjs',sources,counts,coverage,worldRowCount:world.observations.length,sourceItems,flags,files,sourceAccess:'Previously downloaded source archives reused read-only. Original archive download timestamp is unknown; cache reuse and online license verification times are separately recorded.',licenseVerification:{url:'https://www.fao.org/contact-us/terms/db-terms-of-use/',verifiedAt:accessedAt,license:'CC BY 4.0 unless identified third-party exceptions apply',exceptions:'No third-party reuse exception is identified in the retained FAOSTAT domain metadata or archive code tables.',attribution:sources.map(s=>`FAO. ${s.releaseDate.slice(0,4)}. FAOSTAT: ${s.dataset}. [Cache reused on ${accessedAt.slice(0,10)}; licence verified on ${accessedAt.slice(0,10)}]. ${s.landingUrl} Licence: CC-BY-4.0.`)},countryMapping:countryList.map(c=>({code:c.code,name:c.name,m49:m49[c.code],sourceNames:countries[c.code].sourceNames})),method:data.method,publicationLimitations:['Publisher estimates/imputation/external figures retain their flags.','2024 is a fixed comparison year; absent observations remain missing.','Source decimals and notes remain exactly as read by the CSV parser.','Country selection uses the published national territory, including all of Russia.','Geographic display limits do not clip or redefine the national statistical territory.','Roundwood, sawnwood and forest area are separate measures and are not added.','VEGE, TEMF and CITR map model groups do not receive independently assembled statistical totals.']};
writeFileSync(resolve(ledgerDir,'provenance.json'),JSON.stringify(ledger,null,2)+'\n');
writeFileSync(resolve(output,'manifest.json'),JSON.stringify({schemaVersion:1,comparisonYear:2024,years,countryCount:45,measureCount:measures.length,files,sources: sources.map(({archive,...source})=>({...source,archiveSha256:archive.sha256})),method:data.method},null,2)+'\n');
console.log('Data bytes',dataBytes.length,'gzip bytes',files['statistics.json.gz'].bytes,'world rows',world.observations.length);
