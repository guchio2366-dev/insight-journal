// Crop-only candidates present in the site's licensed FAOSTAT extract.
// The production-weight comparison is a reading aid, not an all-crops census.
export const southeastCropCandidates=[
 {code:'254',label:'油ヤシの果実',maps:['oilpalm']},
 {code:'27',label:'米',maps:['rice']},
 {code:'156',label:'サトウキビ',maps:['sugarcane']},
 {code:'125',label:'生鮮キャッサバ',maps:['cassava']},
 {code:'56',label:'トウモロコシ（穀粒）',maps:['maize']},
 {code:'836',label:'一次形態の天然ゴム',maps:['rubber']},
 {code:'656',label:'コーヒー生豆（種類合計）',maps:['arabica','robusta']},
 {code:'667',label:'茶の生葉',maps:[]},
 {code:'236',label:'大豆',maps:[]},
 {code:'191',label:'乾燥ひよこ豆',maps:[]},
 {code:'328',label:'種を取る前の綿花',maps:[]},
 {code:'79',label:'雑穀（Millet分類）',maps:[]},
 {code:'15',label:'小麦',maps:[]},
 {code:'201',label:'乾燥レンズ豆',maps:[]},
];
export const southeastCropCountries='BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM'.split(' ');

export function southeastCropPriority(statistics){
 const rows=southeastCropCandidates.map(item=>{
  const observations=southeastCropCountries.flatMap(code=>{
   const country=statistics.countries[code];
   if(!country)throw new Error(`FAOSTAT country missing: ${code}`);
   const matching=country.observations.filter(row=>row.domain==='Production_Crops_Livestock'&&row.item===item.code&&row.elementCode==='5510'&&row.year===2020&&row.unit==='t');
   if(matching.length>1)throw new Error(`Duplicate FAOSTAT crop row: ${code}/${item.code}`);
   return matching.filter(row=>row.value!==null&&Number.isFinite(row.value)&&row.value>=0);
  });
  return {...item,tonnes:observations.reduce((sum,row)=>sum+row.value,0),reportedCountries:observations.length,flags:[...new Set(observations.map(row=>row.flag))].sort()};
 }).sort((a,b)=>b.tonnes-a.tonnes||Number(a.code)-Number(b.code));
 if(rows.some(row=>!row.reportedCountries))throw new Error('A crop candidate has no 2020 production report');
 return {selected:rows.slice(0,10),next:rows.slice(10),all:rows,countryCount:southeastCropCountries.length};
}
