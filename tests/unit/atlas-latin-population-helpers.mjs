import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';

export async function populationBundle(contents,format='esm',platform='node',stripSvgStyles=false){
 const result=await build({stdin:{contents,resolveDir:process.cwd(),loader:'ts',sourcefile:'latin-population-test-entry.ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},bundle:true,write:false,format,platform,define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal/')},plugins:[{name:'population-local-modules',setup(b){
  b.onResolve({filter:/^\./},args=>{const file=path.resolve(args.resolveDir,args.path);return {path:file+(path.extname(file)?'':'.ts')};});
  b.onLoad({filter:/\.(ts|json)$/},async args=>{let contents=await readFile(args.path,'utf8');
   // HappyDOM drops the SVG siblings following an embedded <style>. Structure
   // tests omit that block; independent Chrome QA renders production styling.
   if(stripSvgStyles&&args.path.endsWith('atlas-latin-america-population.ts'))contents=contents.replace(/<style>[\s\S]*?<\/style>/g,'');
   return {contents,loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)};
  });
 }}]});return result.outputFiles[0].text;
}
export async function populationLibrary(){const bundle=await populationBundle("export * from './src/lib/atlas-latin-america-population.ts';export * from './src/lib/atlas-latin-america-geometry.ts';export * from './src/lib/atlas-latin-learning-state.ts';");return import(`data:text/javascript;base64,${Buffer.from(bundle).toString('base64')}`);}
