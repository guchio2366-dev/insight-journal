// Regenerate the common-year country indicators from preserved World Bank API
// responses. The 2020 GHSL within-country distribution remains a separate layer.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const source='data-source/atlas/latin-america/population';
const assets='public/assets/atlas/latin-america-population-v2';
const target='src/data/atlas/latin-america/population.json';
const indicators=[['SP.POP.TOTL','population','persons'],['EN.POP.DNST','density','persons/km2 of land area'],['SP.URB.TOTL.IN.ZS','urbanShare','percent of total population']];
const year=2023;
const sha=b=>createHash('sha256').update(b).digest('hex');
const ghsl=JSON.parse(await readFile('public/assets/atlas/latin-america-population-v1/manifest.json','utf8'));
const geography=JSON.parse(await readFile('src/data/atlas/regional-countries.json','utf8'));
const codes=Object.keys(ghsl.regions['latin-america'].countryCoverage).sort();
assert.equal(codes.length,34);assert.ok(codes.includes('GTM')&&codes.includes('JAM')&&codes.includes('BRA')&&codes.includes('FLK'));assert.ok(!codes.includes('MEX'));
const localModules={name:'latin-population-local-modules',setup(b){b.onResolve({filter:/^\./},args=>{const resolved=path.resolve(args.resolveDir,args.path);return {path:resolved+(path.extname(resolved)?'':'.ts')};});b.onLoad({filter:/\.ts$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}));b.onLoad({filter:/\.json$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'json',resolveDir:path.dirname(args.path)}));}};
const named=await build({stdin:{contents:"export {japaneseNames} from './src/data/atlas/regional-atlas.ts';",sourcefile:'latin-population-names.ts',loader:'ts',resolveDir:process.cwd()},absWorkingDir:process.cwd(),tsconfigRaw:{},plugins:[localModules],bundle:true,write:false,format:'esm',platform:'node'});
const {japaneseNames}=await import(`data:text/javascript;base64,${Buffer.from(named.outputFiles[0].text).toString('base64')}`);
const files=[],sources=[],values={};
for(const [indicator,property,unit] of indicators){
 const rawFile=`wb-${indicator}.json`,bytes=await readFile(`${source}/${rawFile}`),raw=JSON.parse(bytes);
 assert.equal(raw[0].pages,1);assert.equal(raw[0].sourceid,'2');
 const rows=raw[1].filter(row=>row.date===String(year)&&codes.includes(row.countryiso3code));
 assert.equal(rows.length,33);assert.equal(new Set(rows.map(row=>row.countryiso3code)).size,33);assert.ok(rows.every(row=>row.value!==null));
 values[property]=Object.fromEntries(rows.map(row=>[row.countryiso3code,row]));
 const metadataFile=`metadata-${indicator}.html`,metadata=await readFile(`${source}/${metadataFile}`);
 assert.match(metadata.toString('utf8'),/CC BY-4\.0|CC BY 4\.0/);assert.match(metadata.toString('utf8'),/public-licenses/);
 files.push({file:rawFile,bytes:bytes.length,sha256:sha(bytes)},{file:metadataFile,bytes:metadata.length,sha256:sha(metadata)});
 sources.push({indicator,property,unit,year,apiUrl:`https://api.worldbank.org/v2/country/all/indicator/${indicator}?date=2023:2025&format=json&per_page=20000`,apiFile:rawFile,metadataUrl:`https://databank.worldbank.org/metadataglossary/world-development-indicators/series/${indicator}`,metadataFile,apiLastUpdated:raw[0].lastupdated,license:'CC BY 4.0',licenseUrl:'https://datacatalog.worldbank.org/int/public-licenses#cc-by'});
}
const valueStatus=row=>!row?'unavailable':row.value===null?'missing':row.value===0?'zero':'value';
const countries=codes.map(countryCode=>{
 const original=geography.features.find(f=>f.properties.code===countryCode)?.properties;
 assert.ok(original);
 const row={countryCode,name:original.name,nameJa:japaneseNames[countryCode]??original.name,subregion:original.subregion};
 for(const [,property]of indicators){const sourceRow=values[property][countryCode];row[property]=sourceRow?.value??null;row[`${property}Status`]=valueStatus(sourceRow);}
 return row;
});
assert.ok(countries.filter(c=>c.population!==null).every(c=>Number.isInteger(c.population)&&c.population>0));
assert.ok(countries.filter(c=>c.urbanShare!==null).every(c=>c.urbanShare>=0&&c.urbanShare<=100));
const statusCounts=Object.fromEntries(indicators.map(([,property])=>[property,Object.fromEntries(['value','zero','missing','confidential','unavailable'].map(s=>[s,countries.filter(c=>c[`${property}Status`]===s).length]))]));
const data={schemaVersion:1,year,reference:'midyear estimates; national/territory population',scope:'Central America, Caribbean and South America in the site region; Mexico is handled in North America',countries,sources,statusCounts,notes:{density:'Original published World Bank density. Denominator is national land area excluding inland waters, EEZ and continental shelf claims. Never recomputed from display geometry.',population:'Midyear population estimates, not a census held simultaneously in every country. Circle area is proportional to the number of people.',urbanShare:'Urban population share uses national definitions. It is a percentage of population, not population density or a harmonized city boundary.',unavailable:'FLK has no record in the preserved World Bank response. Values remain null, not zero.',spatialLayer:'Existing GHSL 2020 modelled settlement distribution is kept separate from the 2023 national averages and totals.'}};
await mkdir(path.dirname(target),{recursive:true});await mkdir(assets,{recursive:true});
const json=Buffer.from(JSON.stringify(data,null,2)+'\n');await writeFile(target,json);await writeFile(`${assets}/countries-2023.json`,json);
const csvEscape=value=>String(value??'').match(/[",\n\r]/)?`"${String(value).replaceAll('"','""')}"`:String(value??'');
const header=['country_code','country_name','year','population_persons','population_status','density_persons_per_land_km2','density_status','urban_share_percent','urban_share_status'];
const csv=Buffer.from([header.join(','),...countries.map(c=>[c.countryCode,c.name,year,c.population,c.populationStatus,c.density,c.densityStatus,c.urbanShare,c.urbanShareStatus].map(csvEscape).join(','))].join('\n')+'\n');await writeFile(`${assets}/countries-2023.csv`,csv);
const manifest={schemaVersion:1,accessed:'2026-10-01',year,sources,sourceFiles:files,transformations:['Select exact year 2023 and the existing 34 geographic targets; retain all original numeric values','Join by ISO3 country/territory code; use the site Japanese country labels','Distinguish absent records, returned nulls, real zeros and confidential values','Display density/urban share rounded to one decimal in the UI; downloadable values retain original precision','Country population circle area is proportional to the original absolute population; no population-derived economic indicator'],validation:{countries:34,availableCountries:33,unavailableCountries:['FLK'],sameYear:true,populationSumAvailableCountries:countries.reduce((s,c)=>s+(c.population??0),0),latestCommonYear:2023,density2024And2025HaveNoValuesForAdoptedCountries:true,densityFromDisplayGeometry:false},statusCounts,units:{population:'persons',density:'persons/km2 of land area',urbanShare:'percent of total population'},license:{name:'CC BY 4.0',url:'https://datacatalog.worldbank.org/int/public-licenses#cc-by',evidence:'The License Type and License URL in each of the three preserved indicator metadata pages',attribution:'World Bank World Development Indicators; original indicator providers named in metadata. Selection, Japanese labels, rounding and map encodings by Insight Journal.'},withinCountry2020:{manifest:'../latin-america-population-v1/manifest.json',image:'../latin-america-population-v1/latin-america.png',sourceInputs:'../latin-america-population-v1/source-inputs.json',source:ghsl.source,files:ghsl.files,meaning:'Modelled settlement density, aggregated from 1km to 10km equal-area cells. A separate year, source and denominator from the 2023 national data.'},generated:{json:{file:'countries-2023.json',bytes:json.length,sha256:sha(json)},csv:{file:'countries-2023.csv',bytes:csv.length,sha256:sha(csv)}}};
await writeFile(`${assets}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({year,countries:countries.length,statusCounts,sumAvailablePopulation:manifest.validation.populationSumAvailableCountries,artifacts:manifest.generated}));
