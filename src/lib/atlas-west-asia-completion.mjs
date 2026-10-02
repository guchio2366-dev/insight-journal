export const rainfallBreaks=[100,250,500,1000,2000];
export const rainfallColors=['#f1f6fa','#d4e6ef','#a7cddd','#70acc9','#397f9e','#19566f'];
export function stationAnnualRainfall(city){
 const values=city?.precipitationMm;
 return Array.isArray(values)&&values.length===12&&values.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)
  ?Math.round(values.reduce((a,b)=>a+b,0)*10)/10:null;
}
export function rainfallColor(value){return value===null?'#e4e5df':rainfallColors[rainfallBreaks.filter(b=>value>=b).length];}
export const isSettlementTopic=id=>id==='ethnicity'||id==='religion';
export function settlementSubject(manifest,id){return manifest?.topics?.[id]??manifest?.regions?.['west-asia']?.[id]??null;}
export function validateSettlementCollection(collection,subject){
 if(collection?.type!=='FeatureCollection'||!Array.isArray(collection.features)||!Array.isArray(subject?.categories))throw Error('居住域資料の形式を確認できませんでした。');
 const categories=new Map(subject.categories.map(c=>[c.id,c]));
 for(const f of collection.features){
  const category=categories.get(f.properties?.id);
  if(!category||f.properties.color!==category.color||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('居住域と凡例の対応を確認できませんでした。');
 }
 return collection;
}
