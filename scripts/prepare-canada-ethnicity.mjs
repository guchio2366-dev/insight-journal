#!/usr/bin/env node
/** Reproduce the selected 2021 population-group snapshot from bounded StatCan originals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw=path.join(root,'data-source/atlas/canada-demographics-v1/ethnicity');
const out=path.join(root,'public/assets/atlas/canada-demographics-v1');
const load=async name=>JSON.parse(await fs.readFile(path.join(raw,name),'utf8'));
const metadata=(await load('cube-metadata-original.json'))[0].object;
const exportRequest=await load('selected-original.request.json');
const displayRequest=await load('drummondville-display-original.request.json');
const population=JSON.parse(await fs.readFile(path.join(root,'src/data/atlas/canada/population.json'),'utf8'));
const selectedIds=[3,4,5,6,7,8,9,10,11,12,13,14,15,87];
const allIds=[1,...selectedIds];
const names={3:'白人（単一回答）',4:'南アジア系（単一回答）',5:'中国系（単一回答）',6:'黒人（単一回答）',7:'フィリピン系（単一回答）',8:'アラブ系（単一回答）',9:'ラテンアメリカ系（単一回答）',10:'東南アジア系（単一回答）',11:'西アジア系（単一回答）',12:'韓国系（単一回答）',13:'日本系（単一回答）',14:'その他の人口集団（単一回答）',15:'複数の人口集団',87:'先住民族（人口集団表）'};
const footnotes=metadata.footnote.filter(f=>f.link.dimensionPositionId===5 && [0,1,14,87].includes(f.link.memberId)).map(f=>({id:f.footnoteId,groupId:String(f.link.memberId),englishText:f.footnotesEn}));
const groups=selectedIds.map(id=>{const m=metadata.dimension[4].member.find(v=>v.memberId===id);return {id:String(id),englishName:m.memberNameEn,name:names[id],parentId:String(m.parentMemberId),definition:id<15?'この人口集団のみを回答した人。対応する記入回答も含む。':id===15?'2つ以上の人口集団を回答した人。':'質問24でFirst Nations、Métis、Inuk（Inuit）に「はい」と回答した人。人口集団質問25には回答しない。Indigenous identityとは定義が異なる。',footnotes:footnotes.filter(f=>['0','1',String(id)].includes(f.groupId)).map(f=>f.id)};});

function parseCsv(text){
 text=text.replace(/^\uFEFF/,'');
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(value);value='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))rows.push(row);row=[];value='';}
  else value+=ch;
 }
 if(quoted)throw Error('Unterminated CSV quote');
 if(row.length||value){row.push(value);if(row.some(Boolean))rows.push(row);}
 const header=rows.shift();return {header,rows:rows.map(v=>{if(v.length!==header.length)throw Error('CSV column count');return Object.fromEntries(header.map((k,i)=>[k,v[i]]));})};
}
function serializeCsv(header,rows){return header.map(quote).join(',')+'\r\n'+rows.map(row=>header.map(k=>quote(row[k]??'')).join(',')).join('\r\n')+'\r\n';}
function quote(s){return '"'+String(s).replaceAll('"','""')+'"';}
const originalBytes=await fs.readFile(path.join(raw,'selected-original.csv'));
const parsed=parseCsv(originalBytes.toString('utf8'));
if(parsed.rows.length!==629)throw Error('Unexpected original CSV row count');
const displayedHtml=await fs.readFile(path.join(raw,'drummondville-display-original.html'),'utf8');
const display=JSON.parse(displayedHtml.match(/prepareTable\((.*)\);/)[1]);
const japaneseRow=display.rows.find(r=>r.values[0].meta.memberId===13);
const visibleHeaders=display.headers.columnHeaders.find(h=>h.name==='Visible minority (15)').values;
const totalColumn=visibleHeaders.findIndex(v=>v.meta.memberId===1)+1;
const officialZero=japaneseRow.values[totalColumn];
if(display.headers.columnHeaders[0].values[0].meta.memberId!==32||officialZero.value!=='0.0'||officialZero.meta.formattedValue!=='0'||officialZero.meta.reference!=='')throw Error('Official display zero evidence mismatch');
const base=parsed.rows.find(r=>r.DGUID==='2021S0503447'&&r['Population group (87)']==='Total - Population group');
if(!base||parsed.rows.some(r=>r.COORDINATE==='32.1.1.1.13.1'))throw Error('Zero recovery selection mismatch');
const recovered={...base,'Population group (87)':'Japanese',COORDINATE:'32.1.1.1.13.1',VALUE:'0'};
const zeroCellRecovery={dguid:recovered.DGUID,groupId:'13',coordinate:recovered.COORDINATE,value:0,reason:'The WDS API and database-loading CSV omit this cell. The official table display explicitly supplies value 0.0, formatted 0, with no symbol.',sourceUrl:displayRequest.url,accessedAt:displayRequest.accessedAt};
const rows=[...parsed.rows,recovered];
const targetGeographies=[{id:'Canada',dguid:'2021A000011124',name:'カナダ'},...population.cmas.map(c=>({id:c.id,dguid:c.dguid,name:c.name}))];
const geoMetadata=metadata.dimension[0].member.map(m=>({...m,attributes:Object.fromEntries(metadata.geoAttribute.filter(a=>a.memberId===m.memberId).map(a=>[a.title,a.valueEn]))}));
const mapping=targetGeographies.map(g=>{const match=geoMetadata.filter(m=>m.attributes.DGUID===g.dguid);if(match.length!==1)throw Error('Nonunique DGUID '+g.dguid);const m=match[0];if(g.id!=='Canada'&&(m.geoLevel!==503||m.classificationCode!==g.id))throw Error('Not matching full CMA '+g.id);return {...g,memberId:m.memberId,sourceName:m.memberNameEn,classificationCode:m.classificationCode,attributes:m.attributes};});
const allowedDguids=new Set(mapping.map(g=>g.dguid));
const byCoord=new Map();
for(const row of rows){
 if(!allowedDguids.has(row.DGUID)||row.REF_DATE!=='2021'||row['Generation status (4)']!=='Total - Generation status'||row['Age (15C)']!=='Total - Age'||row['Statistics (3)']!=='Count'||row['Visible minority (15)']!=='Total - Visible minority'||row.SCALAR_ID!=='0'||row.SCALAR_FACTOR!=='units'||row.UOM_ID!=='0')throw Error('Unexpected source slice');
 if(byCoord.has(row.COORDINATE))throw Error('Duplicate coordinate');
 byCoord.set(row.COORDINATE,row);
}
function toCell(row){
 const value=row.VALUE===''?null:Number(row.VALUE);
 if(value!==null&&(!Number.isInteger(value)||value<0))throw Error('Invalid original count');
 return {value,symbol:row.SYMBOL,status:row.STATUS,vector:row.VECTOR,decimals:Number(row.DECIMALS),coordinate:row.COORDINATE};
}
function optionalRate(text){if(text==null||text===''||text==='...')return null;const value=Number(text);if(!Number.isFinite(value)||value<0||value>100)throw Error('Invalid non-response rate');return value;}
const roundingDifferences=[];
const records=mapping.map(g=>{
 const cells={};for(const id of allIds){const coordinate=[g.memberId,1,1,1,id,1].join('.');const row=byCoord.get(coordinate);const member=metadata.dimension[4].member.find(m=>m.memberId===id);if(!row||row.DGUID!==g.dguid||row['Population group (87)']!==member.memberNameEn)throw Error('Missing/mismatched selected cell '+coordinate);cells[id]=toCell(row);}
 const sum=selectedIds.reduce((total,id)=>total+cells[id].value,0);roundingDifferences.push({id:g.id,dguid:g.dguid,denominator:cells[1].value,sumOfGroups:sum,difference:sum-cells[1].value});
 return {id:g.id,dguid:g.dguid,name:g.name,englishName:g.sourceName,denominator:cells[1],values:Object.fromEntries(selectedIds.map(id=>[String(id),cells[id]])),quality:{codes:{dataQualityFlag:g.attributes.DQF_CODE},notes:g.attributes.DQF_NOTE==='...'?[]:[g.attributes.DQF_NOTE],tnrLongFormPercent:optionalRate(g.attributes.TNR_LONG_FORM),tnrShortFormPercent:optionalRate(g.attributes.TNR_SHORT_FORM)}};
});
if(records.length!==42||records.slice(1).length!==41||new Set(records.map(r=>r.dguid)).size!==42||rows.length!==630)throw Error('Incomplete geographic coverage');
const title=metadata.cubeTitleEn;
const attribution=`Adapted from Statistics Canada, ${title}, 2021. This does not constitute an endorsement by Statistics Canada of this product.`;
const reproductionNotice=`Source: Statistics Canada, ${title}, 2021. Reproduced and distributed on an "as is" basis with the permission of Statistics Canada.`;
const source={tableId:'98-10-0324-01',pid:'9810032401',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810032401',title,releaseDate:metadata.issueDate,accessedAt:exportRequest.accessedAt,referenceYear:2021,censusDate:'2021-05-11',boundaryDate:'2021-01-01',universe:'Persons in private households in occupied private dwellings',sample:'2021 Census — 25% Sample data',totalAge:'Total - Age',totalGender:'All persons; this table has no gender dimension',generationStatus:'Total - Generation status',statistics:'Count',visibleMinority:'Total - Visible minority (unfiltered population group counts)',denominator:'Total - Population group from the same geography and selected dimensions; population in private households, not the population-and-dwelling-counts total.',licenceUrl:'https://www.statcan.gc.ca/en/terms-conditions/open-licence',attribution,rounding:'Census counts and totals are randomly rounded independently to multiples of 5 or 10. The sum of categories can differ from the published total; percentages calculated from rounded counts need not sum to 100%.',roundingUrl:'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/dt-td/about.cfm#rr-aa',definitions:{populationGroup:'Population-group responses to Question 25; this variable differs from both ethnic or cultural origin and the derived visible minority variable.',singleResponse:'IDs 3–14 are single-response categories. Multiple answers are retained in ID 15 instead of counted again in individual groups.',indigenousPeoples:'ID 87 reflects Yes to Question 24. It is not the Indigenous identity variable.'},footnotes,zeroCellRecovery};
const dataset={topic:'ethnicity',year:2021,source,defaultGroup:'4',groups,national:records[0],cmas:records.slice(1)};
const audit={geographies:42,cmas:41,groupCategories:14,expectedCells:630,originalCsvCells:629,recoveredOfficialDisplayZeroCells:1,adoptedCells:630,nullCells:rows.filter(r=>r.VALUE==='').length,zeroCells:rows.filter(r=>r.VALUE==='0').length,statusValues:[...new Set(rows.map(r=>r.STATUS))],symbolValues:[...new Set(rows.map(r=>r.SYMBOL))],vectorValues:[...new Set(rows.map(r=>r.VECTOR))],decimals:[...new Set(rows.map(r=>r.DECIMALS))],roundingDifferences,maxAbsoluteRoundingDifference:Math.max(...roundingDifferences.map(r=>Math.abs(r.difference)))};
const originals=['selected-original.csv','selected-original.request.json','cube-metadata-original.json','cube-metadata-original.request.json','drummondville-display-original.html','drummondville-display-original.request.json','open-licence-original.html','open-licence-original.request.json','about-data-tables-original.html','about-data-tables-original.request.json','population-group-guide-original.html','population-group-guide-original.request.json','daily-ethnocultural-diversity-original.html','daily-ethnocultural-diversity-original.request.json'];
const originalFiles=await Promise.all(originals.map(async file=>{const bytes=await fs.readFile(path.join(raw,file));return {file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}));
const manifest={topic:'ethnicity',version:'canada-demographics-v1',source,reproductionNotice,attribution,geographyJoin:'Exact DGUIDs from official cube geoAttribute; full CMA geoLevel 503, not provincial parts.',geographyMapping:mapping,categoryHierarchy:metadata.dimension[4].member.map(m=>({id:String(m.memberId),parentId:m.parentMemberId===null?null:String(m.parentMemberId),englishName:m.memberNameEn})),selection:{generationStatus:1,age:1,statistics:1,populationGroups:allIds,visibleMinority:1},unit:{label:'Count of persons (weighted long-form estimate)',uom:'',uomId:0,scalarFactor:'units',scalarId:0},originalFiles,audit,zeroCellRecovery,narrativeSource:{url:'https://www150.statcan.gc.ca/n1/daily-quotidien/221026/dq221026b-eng.htm',title:'The Canadian census: A rich portrait of the country’s religious and ethnocultural diversity',releaseDate:'2022-10-26',note:'The article discusses the derived visible-minority variable and inclusive group counts in places. Do not copy those counts into this single-response population-group snapshot.'}};
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(root,'src/data/atlas/canada/demographics-ethnicity.json'),JSON.stringify(dataset,null,2)+'\n');
await fs.writeFile(path.join(out,'ethnicity-selected.csv'),serializeCsv(parsed.header,mapping.flatMap(g=>allIds.map(id=>byCoord.get([g.memberId,1,1,1,id,1].join('.'))))));
await fs.writeFile(path.join(out,'ethnicity-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(raw,'inspected-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({output:'src/data/atlas/canada/demographics-ethnicity.json',...audit,roundingDifferences:undefined,nationalDenominator:records[0].denominator.value,nationalSouthAsian:records[0].values['4'].value,nationalWhite:records[0].values['3'].value},null,2));
