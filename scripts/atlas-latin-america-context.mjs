import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../',import.meta.url),out=new URL('public/assets/atlas/latin-america-context-v1/',root);
await mkdir(out,{recursive:true});
const geo=JSON.parse(await readFile(new URL('src/data/atlas/regional-countries.json',root),'utf8'));
const targets=geo.features.filter(f=>f.properties.code!=='MEX'&&(f.properties.region==='South America'||['Central America','Caribbean'].includes(f.properties.subregion)));
const codes=targets.map(f=>f.properties.code);
const sources=[];
async function get(url){const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);const text=await r.text();sources.push({url,sha256:createHash('sha256').update(text).digest('hex'),retrieved:'2026-09-25'});return JSON.parse(text);}
const defs=[['SP.POP.TOTL','人口','人'],['SP.URB.TOTL.IN.ZS','都市人口比率','%'],['NV.IND.MANF.ZS','製造業のGDP比率','%'],['NV.AGR.TOTL.ZS','農林水産業のGDP比率','%'],['AG.LND.FRST.ZS','森林面積比率','%']];
const indicators=[];
for(const [id,label,unit] of defs){
 const url=`https://api.worldbank.org/v2/country/${codes.filter(c=>c!=='FLK').join(';')}/indicator/${id}?date=2023&format=json&per_page=1000`;
 const result=await get(url);if(!Array.isArray(result[1]))throw new Error('Invalid World Bank response');
 indicators.push({id,label,unit,year:'2023',sourceUrl:`https://data.worldbank.org/indicator/${id}`,values:Object.fromEntries(result[1].map(r=>[r.countryiso3code,r.value]))});
 console.log(id,'received');
}
const rivers=await get('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_rivers_lake_centerlines.geojson');
const clipped=rivers.features.filter(f=>JSON.stringify(f.geometry).includes('coordinates')&&(f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat()).some(p=>p[0]>=-93&&p[0]<=-33&&p[1]>=-56&&p[1]<=28));
const names={'Amazonas':'アマゾン川','Amazon':'アマゾン川','Paraná':'パラナ川','Parana':'パラナ川','Orinoco':'オリノコ川','São Francisco':'サンフランシスコ川','Sao Francisco':'サンフランシスコ川','Paraguay':'パラグアイ川','Uruguay':'ウルグアイ川'};
for(const f of clipped) f.properties={name:names[f.properties.name]??f.properties.name};
await writeFile(new URL('statistics.json',out),JSON.stringify({year:2023,indicators,notes:'全指標は2023年。国全体の統計であり、地図上の点や国内分布の値ではない。都市の定義は各国により異なる。欠測はゼロに置き換えない。森林面積は商業林面積ではない。'}));
await writeFile(new URL('rivers.json',out),JSON.stringify({type:'FeatureCollection',features:clipped}));
await writeFile(new URL('countries.json',out),JSON.stringify({type:'FeatureCollection',features:geo.features.filter(f=>targets.includes(f)||['MEX','USA','CAN'].includes(f.properties.code))}));
await writeFile(new URL('provenance.json',out),JSON.stringify({sources,worldBankLicense:'CC-BY-4.0; indicator source metadata applies',riversLicense:'Natural Earth public domain',boundaries:'Natural Earth; regional-countries.json maintained in this repository'}));
