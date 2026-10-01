import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const input = 'data-source/atlas/mexico/industry';
const output = 'src/data/atlas/mexico/industry.json';
const assets = 'public/assets/atlas/mexico-industry-v1';
const YEAR = 2025;
const DIVISOR = 1_000_000; // Original thousands of USD -> billions of USD.

export function parseCsv(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote');
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  const header=rows.shift();
  if(!header)throw Error('Empty CSV');
  return rows.map(r=>{if(r.length!==header.length)throw Error('CSV column mismatch');return Object.fromEntries(r.map((v,i)=>[header[i],v]));});
}

export function decodeOfficialValue(raw) {
  const sourceStatus=raw.ESTATUS_CIFRA;
  const publicationStatus=raw.ESTATUS;
  const sourceValue=raw.VAL_USD===''?null:Number(raw.VAL_USD);
  if(sourceValue!==null&&(!Number.isFinite(sourceValue)||sourceValue<0))throw Error('Invalid original export amount');
  const statuses={'Disponible':'available','Confidencial':'confidential','No disponible':'unknown','No Disponible':'unknown','No Significativo':'notSignificant','No significativo':'notSignificant','No Aplica':'notApplicable','No aplica':'notApplicable'};
  let status=statuses[sourceStatus];
  if(!status)throw Error(`Unknown official status: ${sourceStatus}`);
  if(status==='available'&&sourceValue===null)throw Error('Available amount must be numeric');
  if(status==='available'&&sourceValue===0)status='zero';
  if(['confidential','unknown','notApplicable'].includes(status)&&sourceValue!==null)throw Error('Non-public amount cannot be assigned a number');
  return {value:['available','zero'].includes(status)?sourceValue/DIVISOR:null,sourceValue,sourceStatus,publicationStatus,status};
}

const stateNames=[
 ['01','アグアスカリエンテス','Ags'],['02','バハ・カリフォルニア','BC'],['03','バハ・カリフォルニア・スル','BCS'],['04','カンペチェ','Camp'],
 ['05','コアウイラ','Coah'],['06','コリマ','Col'],['07','チアパス','Chis'],['08','チワワ','Chih'],['09','メキシコ市','CDMX'],['10','ドゥランゴ','Dgo'],
 ['11','グアナフアト','Gto'],['12','ゲレロ','Gro'],['13','イダルゴ','Hgo'],['14','ハリスコ','Jal'],['15','メヒコ州','Méx'],['16','ミチョアカン','Mich'],
 ['17','モレロス','Mor'],['18','ナヤリット','Nay'],['19','ヌエボ・レオン','NL'],['20','オアハカ','Oax'],['21','プエブラ','Pue'],['22','ケレタロ','Qro'],
 ['23','キンタナ・ロー','QR'],['24','サン・ルイス・ポトシ','SLP'],['25','シナロア','Sin'],['26','ソノラ','Son'],['27','タバスコ','Tab'],
 ['28','タマウリパス','Tamps'],['29','トラスカラ','Tlax'],['30','ベラクルス','Ver'],['31','ユカタン','Yuc'],['32','サカテカス','Zac']
];

export async function prepareMexicoIndustry() {
 const original=await readFile(`${input}/etef-official-annual-2007-2025.csv`);
 const records=parseCsv(original.toString('utf8'));
 const catalog=parseCsv(await readFile(`${input}/official-state-catalog.csv`,'utf8'));
 const metadata=await readFile(`${input}/official-metadata.txt`,'utf8');
 const dictionary=await readFile(`${input}/official-data-dictionary.csv`,'utf8');
 if(!/license:\s*https:\/\/www\.inegi\.org\.mx\/inegi\/terminos\.html/.test(metadata))throw Error('Individual metadata must declare the INEGI licence');
 if(!/modified:\s*2026-03-31T06:00/.test(metadata))throw Error('Unexpected source update; inspect revisions before regenerating');
 if(!/miles de d[oó]lares estadounidenses/.test(dictionary))throw Error('Original unit must be thousands of USD');
 const selected=records.filter(r=>Number(r.ANIO)===YEAR&&['334','336'].includes(r.CODIGO_SCIAN));
 if(selected.length!==64||new Set(selected.map(r=>`${r.CVE_ENT}/${r.CODIGO_SCIAN}`)).size!==64)throw Error('Expected 64 unique state/subsector rows');
 const states=stateNames.map(([id,name,short])=>{
  const raw=catalog.find(r=>r.CVE_ENT===id);if(!raw)throw Error(`Missing state catalog ${id}`);
  return {id,name,short,sourceName:raw.NOM_ENTIDAD};
 });
 const metrics=[
  {id:'transport',code:'336',name:'輸送機器',longName:'輸送機器（自動車・部品・航空機など）',sourceName:'Fabricación de equipo de transporte'},
  {id:'electronics',code:'334',name:'電子機器',longName:'電子機器（コンピューター・通信・計測機器など）',sourceName:'Fabricación de equipo de computación, comunicación, medición y de otros equipos, componentes y accesorios electrónicos'}
 ];
 const rows=states.map(s=>({id:s.id,year:YEAR,values:Object.fromEntries(metrics.map(m=>{
  const raw=selected.find(r=>r.CVE_ENT===s.id&&r.CODIGO_SCIAN===m.code);if(!raw||raw.COBERTURA!=='Estatal')throw Error(`Invalid geographical scope ${s.id}/${m.code}`);
  if(raw.ESTATUS!=='Cifras Preliminares.')throw Error('2025 source must retain its preliminary flag');
  return [m.id,decodeOfficialValue(raw)];
 }))}));
 const statusCounts=Object.fromEntries(metrics.map(m=>[m.id,Object.fromEntries(['available','zero','confidential','unknown','notSignificant','notApplicable'].map(status=>[status,rows.filter(r=>r.values[m.id].status===status).length]))]));
 if(statusCounts.transport.available!==24||statusCounts.transport.confidential!==1||statusCounts.transport.unknown!==7||statusCounts.electronics.available!==15||statusCounts.electronics.confidential!==5||statusCounts.electronics.unknown!==12)throw Error('Unexpected data coverage; inspect changes');
 const source={publisher:'INEGI',product:'Exportaciones por Entidad Federativa (ETEF)',url:'https://www.inegi.org.mx/programas/exporta_ef/',downloadUrl:'https://www.inegi.org.mx/contenidos/programas/exporta_ef/datosabiertos/conjunto_de_datos_eef_csv.zip',metadataUrl:'https://www.inegi.org.mx/rnm/index.php/catalog/1108',updated:'2026-03-31',accessed:'2026-10-01',licenseUrl:'https://www.inegi.org.mx/inegi/terminos.html',sourceUnit:'thousands of US dollars, FOB',displayUnit:'billions of US dollars, FOB',classification:'SCIAN México 2018; subsectors 334 and 336',publicationStatus:'Cifras Preliminares.',geographicAssignment:'Origin of production, allocated using linked establishments; not border crossing or exporter headquarters.'};
 const notes={scope:'製造業等の生産地に配分した財の輸出統計。商業・サービスと RENEM に結合できない通関取引は対象外。',confidential:'秘匿された小業種の金額はコード000に合算される。000を特定業種へ配分しない。',unknown:'No disponible は輸出の有無を特定する情報がない状態。',zero:'Disponible の数値0は、その期間の該当州・業種で輸出がなかったことを示す。',notSignificant:'No Significativo は500米ドル未満。ゼロとして扱わない。',method:'原典の千米ドルを1,000,000で割って10億米ドルへ変換。各州を面積や人口で割らず、公開値の合計から全国シェアを計算しない。',classificationMetadata:'同梱旧カタログのVERSION欄は2007。現行2025年RNMのSCIAN México2018の定義で範囲を確認し、コードと正式業種名を保持する。'};
 const data={schemaVersion:1,year:YEAR,referencePeriod:['2025-01-01','2025-12-31'],source,conversionDivisor:DIVISOR,metrics,states,rows,statusCounts,notes};
 await mkdir('src/data/atlas/mexico',{recursive:true});await mkdir(assets,{recursive:true});
 const normalized=JSON.stringify(data,null,2)+'\n';await writeFile(output,normalized);
 const headers=['PROD_EST','COBERTURA','ANIO','CVE_ENT','CODIGO_SCIAN','VAL_USD','ESTATUS_CIFRA','ESTATUS'];
 const quote=v=>/[",\r\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v;
 const extract=headers.join(',')+'\n'+selected.map(r=>headers.map(k=>quote(r[k])).join(',')).join('\n')+'\n';
 await writeFile(`${input}/industry-selected-2025.csv`,extract);await writeFile(`${assets}/industry-selected-2025.csv`,extract);
 for(const file of ['official-metadata.txt','official-data-dictionary.csv','official-state-catalog.csv','official-subsector-catalog.csv'])await copyFile(`${input}/${file}`,`${assets}/${file}`);
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const sourceFiles=await Promise.all(['etef-official-annual-2007-2025.zip','etef-official-annual-2007-2025.csv','official-metadata.txt','official-data-dictionary.csv','official-state-catalog.csv','official-subsector-catalog.csv','industry-selected-2025.csv'].map(async file=>{const bytes=await readFile(`${input}/${file}`);return {file,bytes:bytes.length,sha256:sha(bytes)};}));
 const manifest={schemaVersion:1,source,sourceFiles,normalized:{file:output,bytes:Buffer.byteLength(normalized),sha256:sha(normalized)},records:64,states:32,year:YEAR,statusCounts,conversionDivisor:DIVISOR,notes};
 await writeFile(`${input}/provenance.json`,JSON.stringify(manifest,null,2)+'\n');await writeFile(`${assets}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 console.log(`Mexico industry: 64 source rows; transport 24 public / 1 confidential / 7 unknown; electronics 15 public / 5 confidential / 12 unknown; 2025 preliminary; thousand USD -> billion USD.`);
 return data;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await prepareMexicoIndustry();
