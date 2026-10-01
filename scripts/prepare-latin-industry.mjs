import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const referenceYear=2024;
export const sourceDir='data-source/atlas/latin-america/industry';
export const assetDir='public/assets/atlas/latin-industry-v1';
export const metrics=[
 {id:'ores',indicator:'TX.VAL.MMTL.ZS.UN',name:'鉱石・金属',unit:'%（商品輸出額に占める割合）',definition:'SITC Rev.3 の27（粗肥料・鉱物）、28（金属鉱石・くず）、68（非鉄金属）。精製銅などの非鉄金属も含む。'},
 {id:'manufactures',indicator:'TX.VAL.MANF.ZS.UN',name:'製造品',unit:'%（商品輸出額に占める割合）',definition:'SITC Rev.3 の5（化学製品）、6（基礎的な製造品）、7（機械・輸送機器）、8（その他の製造品）。68（非鉄金属）を除く。'},
];
export function decodeWdiValue(record){
 if(!record)return {value:null,status:'notCovered',sourceValue:null,sourceStatus:'No country/year record in the downloaded API response'};
 if(record.value===null)return {value:null,status:'missing',sourceValue:null,sourceStatus:'API value=null; reason not specified'};
 if(typeof record.value!=='number'||!Number.isFinite(record.value)||record.value<0||record.value>100)throw new Error(`Invalid export share: ${record.value}`);
 return {value:record.value,status:record.value===0?'zero':'value',sourceValue:record.value,sourceStatus:'Published numeric value'};
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
export async function prepareLatinIndustry(root=process.cwd()){
 const read=relative=>readJson(path.join(root,relative));
 const geometry=await read('src/data/atlas/regional-countries.json');
 const features=geometry.features.filter(f=>(f.properties.region==='South America'||['Central America','Caribbean'].includes(f.properties.subregion))&&f.properties.code!=='MEX');
 const raw=Object.fromEntries(await Promise.all(metrics.map(async m=>[m.id,await read(`${sourceDir}/${m.id}-all-2023-2024.json`)])));
 for(const m of metrics){if(raw[m.id][0].pages!==1||raw[m.id][0].total!==raw[m.id][1].length)throw new Error('Incomplete API response');}
 const rows=features.map(f=>({country:f.properties.code,name:f.properties.name,subregion:f.properties.subregion,year:referenceYear,values:Object.fromEntries(metrics.map(m=>[m.id,decodeWdiValue(raw[m.id][1].find(r=>r.countryiso3code===f.properties.code&&Number(r.date)===referenceYear&&r.indicator.id===m.indicator))]))})).sort((a,b)=>a.country.localeCompare(b.country));
 const statusCounts=Object.fromEntries(metrics.map(m=>[m.id,rows.reduce((counts,r)=>{const s=r.values[m.id].status;counts[s]=(counts[s]??0)+1;return counts;},{value:0,zero:0,missing:0,notCovered:0})]));
 const source={name:'World Bank, World Development Indicators (UN Comtrade / WITS / World Bank estimates)',updated:raw.ores[0].lastupdated,downloadedAt:'2026-10-01T08:18:00Z',grain:'country / calendar year',sourceUnit:'percent of merchandise export value',displayUnit:'%',licence:'CC BY 4.0',licenceUrl:'https://creativecommons.org/licenses/by/4.0/',catalogUrl:'https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators',attribution:'Source: World Bank, World Development Indicators, based on UN Comtrade, WITS and World Bank staff estimates. Indicators TX.VAL.MMTL.ZS.UN and TX.VAL.MANF.ZS.UN, 2024. CC BY 4.0. Country subset, Japanese labels and thematic maps prepared by Insight Journal; no endorsement implied.'};
 const data={referenceYear,source,metrics,rows,statusCounts,notes:{scope:'商品輸出額の構成比。国内産業全体の付加価値・雇用・工場数や輸出額の規模は表さない。サービス輸出（運河・観光など）は分母に入らない。',classification:'非鉄金属は鉱石・金属に含み、製造品から除く。分類されていない貿易があるため、各品目の比率の合計は100%と一致しない場合がある。',missing:'原典のnullは欠測（理由記載なし）として保持。秘匿と断定せず、0へ変換しない。国・年のレコードがないFLKは対象統計なしとして区別。',comparison:'両地図は2024年、国単位、商品輸出額を分母とする%で、同じ階級を使う。人口比較は元人口2023年と輸出構成2024年を別指標として並べる。'}};
 const normalized=`${JSON.stringify(data,null,2)}\n`;
 await fs.mkdir(path.join(root,'src/data/atlas/latin-america'),{recursive:true});
 await fs.mkdir(path.join(root,assetDir),{recursive:true});
 await fs.writeFile(path.join(root,'src/data/atlas/latin-america/industry.json'),normalized);
 const csv=['country,year,indicator,value_percent,status',...rows.flatMap(r=>metrics.map(m=>`${r.country},${referenceYear},${m.indicator},${r.values[m.id].value??''},${r.values[m.id].status}`))].join('\n')+'\n';
 await fs.writeFile(path.join(root,assetDir,'industry-selected-2024.csv'),csv);
 await fs.writeFile(path.join(root,sourceDir,'industry-selected-2024.csv'),csv);
 const attribution=source.attribution+'\n\n'+data.notes.scope+'\n'+data.notes.classification+'\n'+data.notes.missing+'\n';
 await fs.writeFile(path.join(root,assetDir,'ATTRIBUTION.txt'),attribution);
 const sourceFiles=[];
 for(const file of (await fs.readdir(path.join(root,sourceDir))).sort()){
  const bytes=await fs.readFile(path.join(root,sourceDir,file));sourceFiles.push({file,bytes:bytes.length,sha256:hash(bytes)});
 }
 const manifest={version:1,year:referenceYear,countries:rows.length,records:rows.length*metrics.length,statusCounts,source,sourceFiles,normalized:{file:'src/data/atlas/latin-america/industry.json',bytes:Buffer.byteLength(normalized),sha256:hash(normalized)},published:[{file:'industry-selected-2024.csv',bytes:Buffer.byteLength(csv),sha256:hash(csv)},{file:'ATTRIBUTION.txt',bytes:Buffer.byteLength(attribution),sha256:hash(attribution)}],processing:['Read complete original API responses; retain source values and nulls.','Select calendar year 2024 and the 34 existing Latin America country/territory geometries; no imputation or latest-year mixing.','Keep unrounded source percentages; Japanese UI rounds only the displayed text.','Separate numeric zero, API null (missing) and absent country/year record (notCovered). No confidential flag is supplied by this API.','Apply identical 0–5, 5–20, 20–40, 40–60, 60–80, 80–100 percent bins to both export classifications.']};
 await fs.writeFile(path.join(root,assetDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return data;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){const data=await prepareLatinIndustry();console.log(JSON.stringify({year:data.referenceYear,countries:data.rows.length,statusCounts:data.statusCounts}));}
