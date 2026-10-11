import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
registerHooks({resolve(s,c,next){if(s.startsWith('.')&&c.parentURL&&!/\.[a-z]+$/i.test(s)){const u=new URL(s+'.ts',c.parentURL);if(existsSync(fileURLToPath(u)))return{url:u.href,shortCircuit:true};}return next(s,c);},load(u,c,next){if(u.startsWith('file:')&&u.endsWith('.json'))return{format:'module',source:'export default '+readFileSync(fileURLToPath(u),'utf8'),shortCircuit:true};if(u.startsWith('file:')&&u.endsWith('.ts'))return{format:'module',source:stripTypeScriptTypes(readFileSync(fileURLToPath(u),'utf8')),shortCircuit:true};return next(u,c);}});
const nature=await import('../../src/lib/atlas-latin-nature.ts'),foundation=await import('../../src/lib/atlas-latin-water-terrain.ts'),reading=await import('../../src/lib/atlas-latin-nature-reading.ts');
const json=p=>JSON.parse(readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),folder='public/assets/atlas/latin-nature-reading-v2/';
const manifest=json(folder+'manifest.json'),geography=json(folder+'geography.json'),old=json('public/assets/atlas/latin-water-terrain-v1/validation.json');
test('Adopted source geometry, exact source grids and readable assets have matching provenance',()=>{
 assert.deepEqual(manifest,json('data-source/atlas/latin-america/nature-reading/source.json'));
 for(const [file,record]of Object.entries(manifest.files)){const b=readFileSync(folder+file);assert.equal(b.length,record.bytes);assert.equal(sha(b),record.sha256);}
 assert.equal(sha(readFileSync(manifest.preparation.script)),manifest.preparation.sha256);assert.equal(sha(readFileSync(manifest.preparation.rasterizeScript)),manifest.preparation.rasterizeScriptSha256);
 for(const name of ['rainfall','elevation']){assert.equal(manifest[name].sourceGridSha256,old[name].nativeGrid.gridSha256);assert.equal(manifest[name].cornerMask,false);assert.deepEqual(manifest.files[name+'.png'].actualContourLevels,manifest[name].levels.slice(1,-1));}
 assert.equal(manifest.regionPolygons.license,'public domain');assert.equal(manifest.riverLines.license,'public domain');
});
test('The primary climate map and its legend show all 21 original classes and exact station-containing cells',async()=>{
 const grid=json('public/assets/atlas/latin-america-climate-v1/latin-america.grid.json'),cells=nature.latinClimateStationCells;
 assert.equal(sha(readFileSync('public/assets/atlas/latin-america-climate-v1/latin-america.grid.json')),cells.sourceGridSha256);
 for(const c of cells.records){assert.equal(c.sourceClassId,grid.values[c.row*grid.width+c.column]);const defined=nature.latinNatureData.originalClasses.find(x=>x.id===c.sourceClassId);assert.equal(c.code,defined?.code??null);assert.ok(nature.renderLatinNatureNormals(c.cityId).includes(c.code??'未分類'));}
 const w=new Window();try{w.document.body.innerHTML=nature.renderLatinNatureLegend();assert.equal(w.document.querySelectorAll('[data-climate-class]').length,21);for(const c of nature.latinNatureData.originalClasses)assert.equal(w.document.querySelector(`[data-climate-class=${c.code}] i`).style.backgroundColor,c.color);w.document.body.innerHTML=nature.renderLatinNatureMap({layer:'climate',place:'all',scope:'all',only:false});assert.ok(w.document.querySelector('image').getAttribute('href').endsWith(nature.latinNatureData.originalImage));}finally{await w.happyDOM.close();}
});
test('Terrain uses eight adopted geographic name areas, separate from the elevation raster',()=>{
 const html=foundation.renderLatinFoundationMap('terrain');assert.equal(geography.regions.length,8);for(const r of geography.regions)assert.ok(html.includes(`data-landform-area="${r.id}"`));assert.equal(/terrain\.png/.test(html),false);assert.match(foundation.renderLatinFoundationReading('terrain'),/アマゾン盆地.*水文学的流域境界/);
});
test('Every old river deep-link ID survives the more detailed source geometry',()=>{
 for(const r of json('public/assets/atlas/latin-water-terrain-v1/rivers.json').rivers){const adopted=foundation.latinFoundationRivers.find(x=>x.name===r.name);assert.equal(adopted?.id,r.id);assert.ok(adopted.path.length>0);}
 assert.ok(foundation.latinFoundationRivers.length>100);assert.match(foundation.renderLatinFoundationMap('rivers','central'),/ウスマシンタ川/);
});
test('Major river names retain priority over competing city context labels',async()=>{
 const w=new Window();try{w.document.body.innerHTML=foundation.renderLatinFoundationMap('rivers');const d=w.document;for(const [id,name]of [['river-7','アマゾン川'],['river-3','パラナ川']])assert.equal(d.querySelector(`[data-foundation-river-label="${id}"]`)?.textContent,name);assert.equal(d.querySelector('[data-foundation-annotation=place]')?.textContent==='マナウス',false);const reserved=[[0,0,900,580]];assert.equal(reading.renderLatinFoundationAnnotations('rivers','all','all',1,reserved).includes('<text'),false);}finally{await w.happyDOM.close();}
});
test('Ordinary rainfall is visibly separated from extremes without clipping values or omitting 250mm intervals',()=>{
 const data=manifest.rainfall;assert.equal(data.levels.at(-1),10500);assert.equal(data.levels.length,43);assert.equal(new Set(data.colors).size,42);assert.equal(data.contourInterval,250);assert.deepEqual(data.extremeRange,[4000,10500]);assert.equal(data.sourceResolutionDegrees,.25);
 const legend=foundation.renderLatinFoundationLegend('rainfall');for(const color of data.colors)assert.ok(legend.includes('background:'+color));assert.match(legend,/別の目盛/);assert.ok(data.contourLabels.every(x=>x.value%250===0));
 for(const p of data.samples){assert.equal(Math.fround(p.months.reduce((a,b)=>a+b,0)),p.annual);assert.ok(p.cellCenter.length===2);}
 const color=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));const distance=(a,b)=>Math.hypot(...color(a).map((v,i)=>v-color(b)[i]));assert.ok(distance(data.colors[0],data.colors[4])>distance(old.rainfall.colors[0],old.rainfall.colors[4])*2);
});
test('500m elevation labels are actual source contour values and every map shares screen-stable place context',()=>{
 assert.equal(manifest.elevation.contourInterval,500);assert.equal(manifest.elevation.datum,'EGM2008');assert.ok(manifest.elevation.contourLabels.every(x=>x.value%500===0));
 for(const section of ['rivers','rainfall','terrain','elevation']){const html=foundation.renderLatinFoundationMap(section);assert.match(html,/data-foundation-screen-annotations/);if(section!=='rivers')assert.match(html,/アンデス山脈/);}
 assert.match(foundation.renderLatinFoundationMap('elevation'),/data-foundation-annotation="contour"/);
});
