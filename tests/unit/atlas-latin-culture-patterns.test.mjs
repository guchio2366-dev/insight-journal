import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {populationBundle} from './atlas-latin-population-helpers.mjs';
const code=await populationBundle("export * from './src/lib/atlas-latin-culture-patterns.ts';export * from './src/data/atlas/latin-america/culture-major-compositions.ts';export {religionSurvey,pewTranslationNotice} from './src/data/atlas/latin-america/culture-distributions.ts';");
const lib=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const parse=svg=>{const w=new Window();w.document.body.innerHTML=svg;return w;};
test('Major composition coverage includes Central America, Colombia and Andes, preserving Mestizo/pardo/Ladino as independent native classifications',()=>{
 assert.equal(lib.majorAreas.ethnicity.length,19);assert.equal(lib.majorAreas.religion.length,20);
 for(const c of ['SLV','NIC','HND','PAN','CRI','COL','ECU','PER'])assert.ok(lib.majorShare(lib.majorArea('ethnicity',c),'mestizo')>=10,c);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','ECU'),'mestizo'),81);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','PER'),'mestizo'),60.2);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','BRA'),'pardo'),45.3);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','BRA'),'mestizo'),0);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','GTM'),'ladino'),56);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','GTM'),'mestizo'),0);
 assert.equal(lib.majorShare(lib.majorArea('ethnicity','GTM'),'indigenous'),43.5);
 for(const s of lib.majorSources)assert.ok(s.url.startsWith('https:')&&s.termsUrl&&s.rights);
});
test('One actual geographic map carries multiple colors simultaneously; selection and emphasis retain all country geometry and peer bands',()=>{
 for(const section of ['ethnicity','religion']){const selection=section==='ethnicity'?'mestizo':'protestant',windows=[parse(lib.renderLatinCulturePatterns(section)),parse(lib.renderLatinCulturePatterns(section,'all','distribution:'+selection)),parse(lib.renderLatinCulturePatterns(section,'all','distribution:'+selection,true))];
 try{const paths=w=>[...w.document.querySelectorAll('[data-lc-area]>path')].map(p=>p.getAttribute('d'));const bands=w=>[...w.document.querySelectorAll('[data-lc-band]')].map(p=>[p.dataset.lcBand,p.dataset.lcShare,p.getAttribute('fill')]);
 for(const w of windows){assert.equal(w.document.querySelectorAll('svg').length,1);assert.equal(w.document.querySelectorAll('[data-lc-area]').length,34);assert.ok(w.document.querySelectorAll('[data-lc-band]').length>30);assert.equal(w.document.querySelector('[data-lc-primary-note],image,[data-lc-pattern]'),null);assert.ok([...w.document.querySelectorAll('[data-lc-area]')].every(el=>el.style.display!=='none'));}
 assert.deepEqual(paths(windows[0]),paths(windows[1]));assert.deepEqual(paths(windows[0]),paths(windows[2]));assert.deepEqual(bands(windows[0]),bands(windows[1]));assert.deepEqual(bands(windows[0]),bands(windows[2]));
 assert.ok(windows[0].document.querySelectorAll(`#lc-${section}-BRA [data-lc-band]`).length>=3);
 assert.ok(windows[0].document.querySelector('[data-lc-source=missing] path').getAttribute('fill').endsWith('missing)'));
 }finally{windows.forEach(w=>w.happyDOM.close());}}
});
test('Published percentages stay unnormalised; Hindu/Muslim coexist in Guianas and unknown is never unaffiliated',()=>{
 assert.deepEqual(lib.religionSurvey.find(r=>r.code==='URY').values,[42,15,37,6]);
 assert.deepEqual(lib.majorArea('religion','GTM').values.map(v=>v.percent),[50,41,6,3]);
 assert.ok(lib.majorAreas.religion.some(a=>a.values.reduce((n,v)=>n+v.percent,0)!==100));
 const sur=lib.majorArea('religion','SUR'),guy=lib.majorArea('religion','GUY');
 assert.ok(lib.majorShare(sur,'hindu')>22&&lib.majorShare(sur,'muslim')>13);
 assert.ok(lib.majorShare(guy,'hindu')>24&&lib.majorShare(guy,'muslim')>6);
 assert.equal(sur.values.find(v=>v.group==='unknown').count,17082);
 assert.equal(sur.values.find(v=>v.group==='none').count,40718);
 assert.equal(guy.values.find(v=>v.group==='otherChristian').count,155050);
 assert.match(lib.majorGroup('religion','protestant').definition,/その他キリスト教は加えません/);
 assert.match(lib.pewTranslationNotice,/has not reviewed or approved/);
});
test('Scope fits the same map, invalid selection cannot invent source values, and country reading exposes original classifications',()=>{
 for(const scope of ['all','central','south']){const w=parse(lib.renderLatinCulturePatterns('ethnicity',scope,'distribution:fake',true));try{assert.equal(w.document.querySelectorAll('[data-lc-area]').length,34);assert.equal(w.document.querySelector('[aria-pressed=true]'),null);}finally{w.happyDOM.close();}}
 assert.equal(lib.majorSelection('religion','distribution:mestizo'),undefined);assert.equal(lib.majorSelection('religion','area:HTI'),undefined);
 const reading=lib.culturePatternReading('ethnicity','area:PER');assert.match(reading.title,/ペルー.*2017/);assert.match(reading.body,/Quechua.*Aimara.*No especificado/);
 assert.match(lib.renderCulturePatternLegend('ethnicity'),/位置・面積は居住域や人数を示しません/);
});
