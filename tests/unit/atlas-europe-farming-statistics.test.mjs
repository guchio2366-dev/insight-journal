import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { transform } from 'esbuild';

const root = new URL('../../',import.meta.url);
const read = path=>readFileSync(new URL(path,root));
const json = path=>JSON.parse(read(path).toString('utf8'));
const asset='public/assets/atlas/europe/farming-statistics-v1/';
const data=json(asset+'statistics.json');
const manifest=json(asset+'manifest.json');
const ledger=json('data-source/atlas/europe/farming-statistics/provenance.json');
const countryCatalog=json('src/data/atlas/europe/countries.json');
const source=await transform(read('src/data/atlas/europe/farming-statistics.ts').toString('utf8'),{loader:'ts',format:'esm',tsconfigRaw:{}});
const api=await import('data:text/javascript;base64,'+Buffer.from(source.code).toString('base64'));
const {europeFarmMetrics,europeFarmAvailableMetrics,europeFarmMetric,europeFarmObservation,europeFarmWorldObservation,europeFarmWorldShare,europeFarmCountryRows,europeFarmSeries,europeFarmUnitLabel}=api;
const copy=()=>structuredClone(data);

test('the metadata catalog exposes only 22 direct publisher measures and matches the lazy data',()=>{
  assert.deepEqual(data.measures,europeFarmMetrics);
  assert.equal(europeFarmMetrics.length,22);
  assert.equal(new Set(europeFarmMetrics.map(m=>m.id)).size,22);
  assert.deepEqual(europeFarmAvailableMetrics('cattle').map(m=>m.id),['cattle-stocks','cattle-meat','cattle-milk']);
  assert.deepEqual(europeFarmAvailableMetrics('chicken').map(m=>m.id),['chicken-stocks','chicken-meat','chicken-eggs']);
  assert.deepEqual(europeFarmAvailableMetrics('treecover'),europeFarmAvailableMetrics('forest'));
  for(const topic of ['crops','vegetables','temperatefruit','citrus','VEGE','TEMF','CITR'])assert.deepEqual(europeFarmAvailableMetrics(topic),[]);
  assert.equal(europeFarmMetric('unknown'),undefined);
  assert.equal(europeFarmUnitLabel('1000 An'),'千羽');
  assert.equal(europeFarmMetric('chicken-stocks').unit,'1000 An');
  assert.equal(europeFarmMetric('chicken-eggs').elementCode,'5510');
  assert.equal(europeFarmMetric('roundwood-production').itemCode,'1861');
  assert.equal(europeFarmMetric('sawnwood-production').itemCode,'1872');
});

test('the small JSON/gzip asset has verifiable source archives and published file hashes',()=>{
  const bytes=read(asset+'statistics.json');
  assert.ok(bytes.length<1_000_000);
  assert.deepEqual(gunzipSync(read(asset+'statistics.json.gz')),bytes);
  for(const [name,record]of Object.entries(manifest.files)){
    const actual=read(asset+name);
    assert.equal(actual.length,record.bytes);
    assert.equal(createHash('sha256').update(actual).digest('hex'),record.sha256);
    assert.deepEqual(ledger.files[name],record);
  }
  assert.deepEqual(data.sources.map(s=>[s.id,s.archive.sha256]),[
    ['QCL','c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853'],
    ['FO','c2f7fc99651f620b6c0a16ff07f6c1d80c153fa01d5a3422413d9c89e0d61444'],
    ['RL','f6ccf002c3e83a32613d84f032e002b77ac80c8f871c454b12104815f36a9ad5'],
  ]);
  for(const s of data.sources){
    assert.equal(s.license,'CC BY 4.0');
    assert.match(s.url,/^https:\/\/bulks-faostat\.fao\.org\/production\//);
    assert.equal(s.licenseUrl,'https://www.fao.org/contact-us/terms/db-terms-of-use/');
    assert.match(s.cacheReusedAt,/^2026-10-03T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.equal(s.originalRetrievedAt,null,'the old archive download date must not be invented');
  }
});

test('all 45 selected countries retain exact M49 source identities and actual omissions',()=>{
  assert.deepEqual(Object.keys(data.countries),countryCatalog.map(c=>c.code));
  assert.equal(Object.keys(data.countries).length,45);
  assert.equal(data.countries.RUS.m49,643);
  assert.equal(data.countries.RUS.sourceNames.QCL.name,'Russian Federation');
  assert.equal(data.countries.RUS.sourceNames.QCL.areaCode,'185');
  assert.equal(data.countries.FRA.sourceNames.QCL.areaCode,'68');
  assert.equal(data.countries.KOS.m49,null);
  assert.deepEqual(data.countries.KOS.sourceNames,{});
  assert.deepEqual(data.countries.KOS.observations,[]);
  for(const code of ['VAT','MCO'])assert.deepEqual(data.countries[code].observations,[]);
  assert.equal(data.countries.SMR.observations.length,10);
  for(const country of Object.values(data.countries))for(const name of Object.values(country.sourceNames))assert.equal(Number(name.m49Raw.replace(/^'/,'')),country.m49);
  const rows=europeFarmCountryRows(data,'wheat-production',2024);
  assert.equal(rows.length,45);
  assert.equal(rows.find(row=>row.code==='KOS').observation,null);
  assert.equal(rows.find(row=>row.code==='KOS').share,null);
});

test('every retained tuple has one source measure, year, unit, decimal and flag without duplicates',()=>{
  assert.equal(data.comparisonYear,2024);
  assert.deepEqual(data.years,[2015,2016,2017,2018,2019,2020,2021,2022,2023,2024]);
  let count=0;
  for(const country of [...Object.values(data.countries),data.world]){
    const seen=new Set();
    for(const row of country.observations){
      const metric=europeFarmMetric(row[0]);assert.ok(metric);
      const key=row[0]+':'+row[1];assert.ok(!seen.has(key));seen.add(key);
      assert.ok(data.years.includes(row[1]));
      assert.equal(row[3],metric.unit);
      assert.equal(typeof row[2],'string');
      if(row[2]!=='')assert.match(row[2],/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/);
      assert.ok(row[4]in data.flags[metric.domain]);
      if(row.length===6)assert.equal(typeof row[5],'string');
      count++;
    }
  }
  assert.equal(count,8174);
  assert.equal(data.world.observations.length,220);
  assert.equal(data.world.sourceNames.QCL.areaCode,'5000');
});

test('source decimals, estimates, notes, published zero and genuine data gaps survive lookup',()=>{
  // Independently checked against rows in the fixed QCL/FO/RL source archives.
  const russia=europeFarmObservation(data,'RUS','wheat-production',2024);
  assert.equal(russia.rawValue,'82588000.000000');
  assert.equal(russia.value,82588000);
  assert.equal(russia.flag,'X');
  assert.equal(russia.flagDescription,'Figure from external organization');
  assert.equal(russia.note,'Unofficial figure');
  assert.equal(europeFarmObservation(data,'DEU','rice-production',2024).value,0);
  assert.equal(europeFarmObservation(data,'AND','roundwood-production',2024).rawValue,'0.000000');
  assert.equal(europeFarmObservation(data,'FRA','cattle-milk',2024).rawValue,'24204280.000000');
  assert.equal(europeFarmObservation(data,'DEU','roundwood-production',2024).rawValue,'70831895.000000');
  assert.equal(europeFarmObservation(data,'RUS','forest-area',2024).rawValue,'831790.380000');
  assert.equal(europeFarmObservation(data,'FRA','chicken-eggs',2024),null,'France has only a laying population row, not egg-tonnage production');
  assert.equal(europeFarmObservation(data,'DEU','chicken-stocks',2024),null,'Germany has no published Chickens stocks row in this year');
  for(const code of ['KOS','VAT','MCO','ZZZ'])assert.equal(europeFarmObservation(data,code,'wheat-production',2024),null);
});

test('world ratios use same-measure/year/unit publisher denominators and keep zero',()=>{
  const world=europeFarmWorldObservation(data,'wheat-production',2024);
  assert.equal(world.rawValue,'798481711.070000');
  assert.equal(europeFarmWorldShare(data,'RUS','wheat-production',2024).value,82588000/798481711.07*100);
  assert.equal(europeFarmWorldShare(data,'DEU','rice-production',2024).value,0);
  assert.equal(europeFarmWorldShare(data,'KOS','wheat-production',2024),null);
  for(const change of ['missing','unit','zero']){
    const d=copy(),i=d.world.observations.findIndex(r=>r[0]==='wheat-production'&&r[1]===2024);
    if(change==='missing')d.world.observations.splice(i,1);
    if(change==='unit')d.world.observations[i][3]='1000 t';
    if(change==='zero')d.world.observations[i][2]='0.000000';
    assert.equal(europeFarmWorldShare(d,'RUS','wheat-production',2024),null,change);
  }
  assert.equal(europeFarmWorldShare(data,'RUS','wheat-production',2025),null);
});

test('missing values and years remain gaps in a ten-year series instead of borrowing data',()=>{
  const d=copy(),row=d.countries.RUS.observations.find(r=>r[0]==='wheat-production'&&r[1]===2024);
  for(const flag of ['M','L']){row[4]=flag;assert.equal(europeFarmObservation(d,'RUS','wheat-production',2024),null);}
  row[4]='A';row[2]='';assert.equal(europeFarmObservation(d,'RUS','wheat-production',2024),null);
  const series=europeFarmSeries(d,'RUS','wheat-production');
  assert.equal(series.length,10);assert.equal(series[9].year,2024);assert.equal(series[9].observation,null);
  assert.equal(series[9].share,null);assert.ok(series[8].observation);
  for(const year of [2014,2025,2024.5,NaN])assert.equal(europeFarmObservation(data,'RUS','wheat-production',year),null);
  assert.equal(europeFarmObservation(data,'RUS','unsupported',2024),null);
});
