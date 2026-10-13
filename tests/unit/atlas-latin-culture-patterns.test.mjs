import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {populationBundle} from './atlas-latin-population-helpers.mjs';
const code=await populationBundle("export * from './src/lib/atlas-latin-culture-patterns.ts';export * from './src/data/atlas/latin-america/culture-major-compositions.ts';export * from './src/data/atlas/latin-america/culture-geographic-distributions.ts';");
const lib=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const parse=svg=>{const w=new Window();w.document.body.innerHTML=svg;return w;};
test('Statistics retain actual geographic grain, native classifications, and source-specific denominators',()=>{
 for(const section of ['ethnicity','religion'])for(const r of lib.geographicRegions[section]){assert.ok(r.units.length);assert.ok(lib.geographicSources.some(s=>s.id===r.source));for(const id of r.units)assert.equal(lib.geographicGeometry.find(g=>g.id===id)?.country,r.country);for(const v of r.values)assert.ok(v.percent===null?r.kind==='qualitative':v.percent>=0&&v.percent<=100);}
 assert.equal(lib.geographicRegions.ethnicity.filter(r=>r.country==='BRA').length,5);
 assert.equal(lib.geographicRegions.religion.filter(r=>r.country==='BRA').length,27);
 assert.equal(lib.geographicRegions.religion.filter(r=>r.country==='CHL').length,16);
 assert.equal(lib.geographicRegions.religion.filter(r=>r.country==='NIC').length,17);
 for(const section of ['ethnicity','religion']){
  assert.equal(lib.geographicRegions[section].filter(r=>r.country==='PER').length,26);
  assert.equal(new Set(lib.geographicRegions[section].map(r=>r.id)).size,lib.geographicRegions[section].length);
  for(const country of new Set(lib.geographicRegions[section].map(r=>r.country))){const joined=lib.geographicRegions[section].filter(r=>r.country===country).flatMap(r=>r.units);assert.equal(new Set(joined).size,joined.length,`${section}/${country}: no duplicated aggregate region`);}
 }
 assert.equal(lib.geographicRegions.ethnicity.filter(r=>r.country==='GTM').length,22);
 assert.equal(lib.geographicRegions.ethnicity.filter(r=>r.country==='ECU').length,24);
 const per=lib.geographicRegions.ethnicity.filter(r=>r.country==='PER');
 assert.equal(per.reduce((n,r)=>n+r.population,0),23196391);
 for(const section of ['ethnicity','religion'])for(const r of lib.geographicRegions[section].filter(r=>r.country==='PER'))assert.equal(Object.values(r.rawCounts).reduce((n,v)=>n+v,0),r.population);
 const lima=per.filter(r=>r.name.includes('Lima'));assert.equal(lima.length,2);assert.deepEqual(lima.map(r=>r.units[0]).sort(),['PER-587','PER-591']);
 const ucayali=per.find(r=>r.name==='Ucayali');assert.equal(ucayali.values.find(v=>v.group==='indigenous').percent,15.56);assert.equal(ucayali.rawCounts['Shipibo Konibo'],16526);
 const jalapa=lib.geographicRegions.ethnicity.find(r=>r.country==='GTM'&&r.name==='Jalapa');assert.equal(jalapa.values.find(v=>v.group==='indigenous').percent,39);assert.equal(jalapa.values.find(v=>v.group==='ladino').percent,60.5);assert.equal(jalapa.values.some(v=>v.group==='mestizo'),false);
 const norte=lib.geographicRegion('ethnicity','BRA-Norte');assert.equal(norte.values.find(v=>v.group==='pardo').percent,67.2);assert.equal(norte.values.find(v=>v.group==='mestizo'),undefined);
 const artigas=lib.geographicRegions.ethnicity.find(r=>r.country==='URY'&&r.name==='Artigas');assert.equal(artigas.values.find(v=>v.group==='afro').percent,21.8);assert.ok(artigas.values.reduce((a,v)=>a+v.percent,0)>100);
 const belize=lib.geographicRegions.ethnicity.find(r=>r.country==='BLZ'&&r.name==='Stann Creek');assert.equal(belize.values[0].percent,32.7);assert.match(belize.values[0].native,/Mestizo\/Hispanic\/Latino/);
 const raan=lib.geographicRegions.religion.find(r=>r.name==='Atlántico Norte');assert.equal(raan.values.find(v=>v.group==='moravian').percent,22.69);assert.equal(raan.values.find(v=>v.group==='protestant').percent,22.92);
 assert.ok(lib.geographicLedger.license==='public domain');
});
test('One map uses real region paths and simultaneous overlays, with no national percentage bands or inferred division rectangles',()=>{
 for(const section of ['ethnicity','religion']){const id=section==='ethnicity'?'mestizo':'protestant',ws=[parse(lib.renderLatinCulturePatterns(section)),parse(lib.renderLatinCulturePatterns(section,'all','distribution:'+id)),parse(lib.renderLatinCulturePatterns(section,'all','distribution:'+id,true))];
 try{const layers=w=>[...w.document.querySelectorAll('[data-lc-layer]')].map(el=>[el.dataset.lcLayer,el.dataset.lcShare,el.getAttribute('d'),el.getAttribute('fill'),el.getAttribute('opacity')]);
 for(const w of ws){assert.equal(w.document.querySelectorAll('svg').length,1);assert.equal(w.document.querySelectorAll('[data-lc-area]').length,34);assert.equal(w.document.querySelectorAll('[data-lc-region]').length,lib.geographicRegions[section].length);assert.equal(w.document.querySelector('[data-lc-band],pattern rect,image'),null);assert.ok(w.document.querySelectorAll('[data-lc-layer]').length>80);assert.ok([...w.document.querySelectorAll('[data-lc-region]')].every(el=>el.dataset.lcEvidence==='reference-only'||el.getAttribute('clip-path').includes(el.dataset.lcCountry)));}
 assert.deepEqual(layers(ws[0]),layers(ws[1]));assert.deepEqual(layers(ws[0]),layers(ws[2]));assert.ok(ws[2].document.querySelector('[data-lc-highlight=true]'));
 const a=section==='ethnicity'?'BRA-Norte':'CHL-BI';assert.ok(ws[0].document.querySelectorAll(`[data-lc-region="${a}"] [data-lc-layer]`).length>=2);
 }finally{ws.forEach(w=>w.happyDOM.close());}}
});
test('Regional differences remain readable, qualitative shapes never acquire invented percentages, and original source values remain below-map references',()=>{
 const w=parse(lib.renderLatinCulturePatterns('religion'));try{const stann=w.document.querySelector('[data-lc-region=BLZ-stanncreek] [data-lc-layer=none]'),cayo=w.document.querySelector('[data-lc-region=BLZ-cayo] [data-lc-layer=none]');assert.equal(stann.dataset.lcShare,'46.6');assert.equal(cayo.dataset.lcShare,'34.7');assert.notEqual(stann.getAttribute('d'),cayo.getAttribute('d'));}finally{w.happyDOM.close();}
 assert.equal(lib.geographicSelection('religion','region:BRA-Norte'),undefined);assert.ok(lib.geographicSelection('ethnicity','region:BRA-Norte'));
 const r=lib.culturePatternReading('ethnicity','region:BRA-Norte');assert.match(r.title,/Norte.*2022/);assert.match(r.overview,/parda：67.2%/);assert.match(r.body,/5大地域/);
 assert.match(lib.culturePatternReading('ethnicity','area:PER').body,/Quechua.*Aimara.*No especificado/);
 assert.match(lib.renderCulturePatternLegend('ethnicity'),/行政区.*境界.*局所分布不明.*50%.*35%以上/);
 const b=parse(lib.renderLatinCulturePatterns('religion'));try{const acre=b.document.querySelector('[data-lc-region=BRA-acre] [data-lc-layer=protestant]'),piaui=b.document.querySelector('[data-lc-region=BRA-piaui] [data-lc-layer=protestant]');assert.equal(acre.getAttribute('opacity'),'1');assert.equal(piaui.getAttribute('opacity'),'0.35');assert.notEqual(acre.getAttribute('d'),piaui.getAttribute('d'));}finally{b.happyDOM.close();}
});
test('Central American and Uruguay country contexts preserve coexistence without assigning national percentages to provinces',()=>{
 const ids=['qual-catholic-GTM','qual-catholic-SLV','qual-catholic-HND','qual-URY-affiliations'];
 for(const id of ids){const r=lib.geographicRegion('religion',id);assert.equal(r.kind,'qualitative');assert.equal(r.source,'pew2014-country-context');assert.equal(r.year,2014);assert.deepEqual(r.values.map(v=>v.group).sort(),['catholic','none','protestant']);assert.ok(r.values.every(v=>v.percent===null));assert.match(r.note,/全国割合を県へ配分せず/);assert.match(lib.culturePatternReading('religion','region:'+id).body,/県.*割合|県.*測定値/);}
 const hnd=lib.geographicRegion('religion','qual-catholic-HND');assert.equal(hnd.units.includes('HND-641'),false);assert.match(hnd.note,/98%.*Islas de la Bahía/);
 const ury=lib.geographicRegion('religion','qual-URY-affiliations');assert.equal(ury.units.length,19);assert.match(ury.note,/2013年11月22日–2014年1月8日/);
 for(const choice of ['', 'distribution:protestant','region:qual-URY-affiliations']){const w=parse(lib.renderLatinCulturePatterns('religion','all',choice,true));try{for(const id of ids)for(const group of ['catholic','protestant','none']){const el=w.document.querySelector(`[data-lc-region="${id}"] [data-lc-reference-group="${group}"]`);assert.ok(el);assert.equal(el.hasAttribute('d'),false);assert.equal(el.hasAttribute('data-lc-share'),false);}assert.ok(w.document.querySelector('[data-lc-region="qual-URY-affiliations"] [data-lc-reference-group="none"]').getAttribute('fill').startsWith('#'));}finally{w.happyDOM.close();}}
});
test('Ecuador keeps its verified Indigenous and Afro province values and explicitly reports unacquired Mestizo geography',()=>{
 const regions=lib.geographicRegions.ethnicity.filter(r=>r.country==='ECU');assert.equal(regions.length,24);assert.ok(regions.every(r=>r.kind!=='qualitative'));assert.ok(regions.every(r=>r.values.every(v=>['indigenous','afro'].includes(v.group))));
 for(const selection of ['','distribution:mestizo'])assert.match(lib.culturePatternReading('ethnicity',selection).overview,/エクアドルのメスチソ県別分布は未取得/);
 assert.match(lib.culturePatternReading('ethnicity','area:ECU').overview,/メスチソ/);
});
