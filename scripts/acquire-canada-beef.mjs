import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const research=process.argv[2];if(!research)throw Error('Pass directory with official cattle CSV and map-043/013/037.jpg');
const dest='data-source/atlas/canada/agriculture/beef';await fs.mkdir(dest,{recursive:true});
const parse=l=>[...l.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));
const raw=await fs.readFile(`${research}/cattle/32100130.csv`,'utf8'),lines=raw.trim().split(/\r?\n/),header=lines.shift(),headers=parse(header);
const provinces=['Canada','Newfoundland and Labrador','Prince Edward Island','Nova Scotia','New Brunswick','Quebec','Ontario','Manitoba','Saskatchewan','Alberta','British Columbia'];
const selected=lines.filter(l=>{const a=parse(l),r=Object.fromEntries(headers.map((k,i)=>[k,a[i]]));return ['2021','2025','2026'].includes(r.REF_DATE)&&provinces.includes(r.GEO)&&['Beef cows','Dairy cows','Total cattle'].includes(r.Livestock)&&r['Survey date']==='At July 1'&&r['Farm type']==='On all cattle operations';});
if(selected.length!==99)throw Error(`Unexpected cattle coverage ${selected.length}`);
await fs.writeFile(`${dest}/beef-selected.csv`,[header,...selected].join('\n')+'\n');
await fs.copyFile(`${research}/cattle/32100130_MetaData.csv`,`${dest}/32100130_MetaData.csv`);
const maps=[];for(const [id,code,title,dot,unit,total] of [['beef','043','Total beef cows',2500,'animals',3776389],['pasture','013','Total pasture area',16188,'hectares',18559652],['hay','037','Total hay area',3238,'hectares',5394265]]){
 const original=await fs.readFile(`${research}/map-${code}.jpg`),crop={left:0,top:0,width:1133,height:814};
 await sharp(original).extract(crop).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(`${dest}/${id}-map-2021.jpg`);
 maps.push({id,title,year:2021,source:`https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-${code}-eng.htm`,imageSource:`https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/m-c/m-c-${code}-eng.jpg`,originalSha256:createHash('sha256').update(original).digest('hex'),crop,dot,unit,total,method:'Remove footer official symbols only; preserve complete map, legend, source and Ontario/Quebec insets. Source dots are random quantity placements, not farm or feedlot locations. Do not derive census-division totals from rounded dots.'});
}
const provenance={retrievedAt:'2026-09-30',releasedAt:'2026-08-24',table:'32-10-0130-01',years:[2021,2025,2026],surveyDate:'At July 1',farmType:'On all cattle operations',unit:'thousand head',selectedRows:99,rawCsvSha256:createHash('sha256').update(raw).digest('hex'),csvDownload:'https://www150.statcan.gc.ca/n1/tbl/csv/32100130-eng.zip',licence:'Statistics Canada Open Licence',licenceUrl:'https://www.statcan.gc.ca/en/terms-conditions/open-licence',maps};
await fs.writeFile(`${dest}/provenance.json`,JSON.stringify(provenance,null,2)+'\n');console.log('Retained 99 cattle cells and 3 dated official maps');
