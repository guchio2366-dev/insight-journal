import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {transform} from 'esbuild';
const code=(await transform(await readFile('src/lib/atlas-canada-forestry-palette.ts','utf8'),{loader:'ts',format:'esm'})).code;
const lib=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('Canada forest classes have distinct display lightness while preserving original source class colors',async()=>{
 const source=JSON.parse(await readFile('src/data/atlas/canada/forestry.json','utf8'));
 const luminance=rgb=>rgb.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const lights=source.classes.map(c=>{const rgb=lib.canadaForestryDisplayRgb(c.id);assert.equal(rgb.length,3);assert.ok(rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255));assert.notDeepEqual(rgb,c.color);assert.equal(lib.canadaForestryColorFilter(c.id).split(' ').length,20);return luminance(rgb);}).sort((a,b)=>a-b);
 for(let i=1;i<lights.length;i++)assert.ok(lights[i]-lights[i-1]>.15,'4 classes remain different in grayscale');
 assert.deepEqual(source.classes.map(c=>c.color),[[0,60,0],[147,155,111],[19,139,4],[91,116,42]]);
 assert.throws(()=>lib.canadaForestryDisplayRgb('bogus'),/Unknown Canada forest class/);
});
