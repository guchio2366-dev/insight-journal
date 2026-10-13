import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const bytes=readFileSync(new URL('../../public/assets/atlas/asia-industry-v1/national.json.gz',import.meta.url));
const original=JSON.parse(gunzipSync(bytes));
const countries=[['CHN','中国'],['JPN','日本'],['KOR','韓国'],['TWN','台湾'],['MNG','モンゴル'],['PRK','北朝鮮']].map(([code,name])=>({code,name}));
const data={sourceFile:'asia-industry-v1/national.json.gz',sourceSha256:createHash('sha256').update(bytes).digest('hex'),source:original.source,license:original.license,retrievedAt:original.retrievedAt,year:2024,countries,
 series:original.indicators.filter(i=>['manufacturing','services'].includes(i.id)).map(i=>({id:i.id,label:i.label,unit:i.unit,metadataUrl:i.metadataUrl,sourceUrl:i.sourceUrl,sourceUpdated:i.sourceUpdated,values:Object.fromEntries(countries.map(c=>[c.code,i.observations.find(o=>o.countryCode===c.code&&o.year===2024)?.value??null]))})),
 method:'Copy the same-year national observations only. No replacement year, neighbouring country, point-based allocation or imputation. These are GDP composition references, not the quantities of the mapped industrial sites.'};
writeFileSync(new URL('../../public/assets/atlas/east-asia-v2/economic-statistics.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
