import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
export function industryLocalModules(stripSvgStyles=false){return {name:'latin-industry-local-modules',setup(b){
 b.onResolve({filter:/^\./},args=>{const p=path.resolve(args.resolveDir,args.path);return {path:p+(path.extname(p)?'':'.ts')};});
 b.onLoad({filter:/\.(ts|json)$/},async args=>{let contents=await readFile(args.path,'utf8');
  // HappyDOM 20 drops every SVG sibling after an embedded <style>. Keep the
  // production drawing/state code and all geometry, values and attributes;
  // exclude that one style block only for DOM structure tests. Real Chrome QA
  // separately checks the unmodified SVG styles, pixels and text size.
  if(stripSvgStyles&&args.path.endsWith('atlas-latin-america-population.ts'))contents=contents.replace(/<style>[\s\S]*?<\/style>/g,'');
  return {contents,loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)};
 });
}};}
export async function industryBundle(contents,format='iife',platform='browser',stripSvgStyles=false){
 const result=await build({stdin:{contents,resolveDir:process.cwd(),loader:'ts',sourcefile:'latin-industry-test-entry.ts'},absWorkingDir:process.cwd(),plugins:[industryLocalModules(stripSvgStyles)],tsconfigRaw:{},define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal/')},bundle:true,write:false,format,platform});
 return result.outputFiles[0].text;
}
export async function industryLibrary(){const code=await industryBundle("export * from './src/lib/atlas-latin-industry.ts';export * from './src/lib/atlas-latin-learning-state.ts';export {latinMapLayout} from './src/lib/atlas-latin-america-geometry.ts';",'esm','node');return await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);}
if(process.argv.includes('--compile')){const code=await industryBundle("import {initLatinIndustry} from './src/scripts/atlas-latin-industry.ts';initLatinIndustry(document.querySelector('[data-latin-industry]'));");console.log(`Industry client compiled: ${Buffer.byteLength(code)} bytes`);}
