import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {socialValue,socialColor,socialContains,socialDenominator,normalizeSocialState,socialDefault} from '../../src/data/atlas/asia-social.ts';
const base=new URL('../../public/assets/atlas/asia-social-v1/',import.meta.url),raw=n=>readFileSync(new URL(n,base));
const manifest=JSON.parse(raw('manifest.json')),read=n=>JSON.parse(gunzipSync(raw(n)));

test('社会統計は30か国の収録状況と97区域の形状を保持し、欠測を0にしない',()=>{
 const countries=Object.values(manifest.regions).flatMap(r=>r.countries);assert.equal(countries.length,30);assert.equal(new Set(countries).size,30);
 assert.equal(Object.values(manifest.regions).reduce((n,r)=>n+r.adminCount,0),97);
 for(const [file,f] of Object.entries(manifest.files)){assert.equal(raw(file).length,f.bytes);assert.equal(createHash('sha256').update(raw(file)).digest('hex'),f.sha256);}
 for(const r of Object.values(manifest.regions)){
  const d=read(r.data);assert.equal(d.geometry.features.length,r.adminCount);assert.equal(new Set(d.records.map(x=>x.id)).size,r.adminCount);
  for(const g of r.groups)assert.ok(r.topics.some(t=>t.id===socialDefault(g.id)));
  for(const a of d.records){const f=d.geometry.features.find(f=>f.properties.id===a.id);assert.ok(socialContains(f.geometry,a.point),a.id);assert.ok(r.countries.includes(a.country));}
  const t=r.topics[0],g=r.groups.find(g=>g.id===t.group);assert.notEqual(socialColor(0,t),socialColor(null,t));
  for(const c of r.countries)assert.equal(socialValue(d.national[c],t,g)!==null,c!=='TWN');
 }
});

test('年齢・国籍は不詳を分母から除き、全国推計と国勢調査を別に保つ',()=>{
 const r=manifest.regions['east-asia'],d=read(r.data),a=d.records.find(r=>r.id==='s-JP-05'),tokyo=d.records.find(r=>r.id==='s-JP-13'),aichi=d.records.find(r=>r.id==='s-JP-23');
 assert.equal(a.total['2020'],959502);assert.equal(a.counts.ageUnknown,8574);assert.equal(a.counts['jp-age-old'],357568);
 assert.equal(a.series['jp-age-old']['2020'],357568/(959502-8574)*100);assert.equal(socialDenominator(a,r.groups.find(g=>g.id==='jp-age')),950928);
 assert.equal(tokyo.total['2020'],14047594);assert.equal(aichi.counts['jp-nationality-foreign'],231369);assert.equal(aichi.nationalities.find(n=>n.label==='ブラジル').value,52886);
 assert.equal(d.national.JPN.total['2020-census'],126146099);assert.equal(d.national.JPN.total['2025'],123366734);assert.notEqual(d.national.JPN.total['2020'],d.national.JPN.total['2020-census']);
 for(const a of d.records){assert.equal(a.nationalities.reduce((n,x)=>n+x.value,0),a.counts['jp-nationality-foreign']);assert.equal(['young','working','old'].reduce((n,k)=>n+a.counts['jp-age-'+k],0),a.total['2020']-a.counts.ageUnknown);}
});

test('マレーシアは民族の市民分母と市民権の全人口を区別し、累計増減を計算する',()=>{
 const r=manifest.regions['southeast-asia'],d=read(r.data),sabah=d.records.find(r=>r.id==='s-MY-12');assert.equal(sabah.total['2026'],3767000);assert.equal(sabah.counts['my-citizenship-noncitizen'],1030000);
 assert.equal(sabah.counts.citizen,2737000);assert.equal(sabah.series['my-ethnicity-bumi_other']['2026'],2108.6/2737*100);
 assert.equal(socialDenominator(sabah,r.groups.find(g=>g.id==='my-ethnicity')),2737000);assert.equal(socialDenominator(sabah,r.groups.find(g=>g.id==='my-citizenship')),3767000);
 for(const a of d.records){assert.equal(Object.keys(a.series['my-age-old']).length,17);assert.equal(a.series['my-growth-change']['2020–2026'],(a.total['2026']/a.total['2020']-1)*100);assert.ok(Math.abs(['young','working','old'].reduce((n,k)=>n+a.series['my-age-'+k]['2026'],0)-100)<1);}
});

test('インドの旧州を複写せず、121言語＋その他と8宗教区分は人口総数に一致する',()=>{
 const r=manifest.regions['south-central-asia'],d=read(r.data);assert.equal(r.topics.filter(t=>t.group==='in-language').length,122);assert.equal(d.national.IND.total['2011-census'],1210854977);
 assert.equal(d.records.reduce((n,r)=>n+r.total['2011'],0),1210854977);assert.equal(d.records.find(a=>a.id==='s-IN-28').total['2011'],84580777);assert.equal(d.records.find(a=>a.id==='s-IN-01').total['2011'],12541302);assert.equal(d.records.find(a=>a.id==='s-IN-25').total['2011'],586956);assert.equal(d.records.some(a=>a.id==='s-IN-26'),false);
 for(const a of d.records)for(const group of ['in-language','in-religion']){assert.equal(r.topics.filter(t=>t.group===group).reduce((n,t)=>n+a.counts[t.id],0),a.total['2011']);assert.ok(r.topics.filter(t=>t.group===group).every(t=>Number.isFinite(a.series[t.id]['2011'])));}
});

test('人口のURLは区域と地点を照合し、別国・別主題の詳細を引き継がない',()=>{
 const r=manifest.regions['east-asia'],d=read(r.data),base={field:'population',place:null,city:null,camera:null,back:null,topic:'jp-age-old'},tokyo=d.records.find(r=>r.id==='s-JP-13');
 const fixed=normalizeSocialState(r,{...base,detail:tokyo.id,point:[100,35]},d);assert.equal(fixed.place,'JPN');assert.deepEqual(fixed.point,tokyo.point);
 assert.equal(normalizeSocialState(r,{...base,detail:'s-IN-03'},d).detail,null);
 assert.equal(normalizeSocialState(r,{...base,place:'CHN',detail:tokyo.id},d).detail,null);
 assert.equal(normalizeSocialState(r,{...base,point:tokyo.point},d).detail,tokyo.id);
 assert.equal(normalizeSocialState(r,{...base,topic:'density',detail:tokyo.id},d).detail,null);
 assert.equal(normalizeSocialState(r,{...base,topic:'national-age-old',detail:tokyo.id},d).detail,null);
});
