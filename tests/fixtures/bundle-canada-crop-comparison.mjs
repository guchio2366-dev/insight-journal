import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';

/** Bundle actual crop comparison imports; defer the map engine for the SVG DOM fixture. */
export async function bundleCanadaCropComparison(file,options={}){
 const filename=path.resolve(file);
 const result=await build({stdin:{contents:await readFile(filename,'utf8'),resolveDir:path.dirname(filename),sourcefile:filename,loader:'ts'},tsconfigRaw:{compilerOptions:{}},bundle:true,write:false,minify:true,platform:'browser',format:'iife',...options,
  plugins:[{name:'canada-crop-comparison-source',setup(builder){
   builder.onResolve({filter:/.*/},async args=>{
    if(args.path==='maplibre-gl')return{path:args.path,external:true};
    if(!args.path.startsWith('.'))throw new Error(`Unexpected comparison import: ${args.path}`);
    const absolute=path.resolve(args.resolveDir,args.path);
    for(const candidate of [absolute,absolute+'.ts',absolute+'.json',absolute+'.mjs',absolute+'.js']){try{await access(candidate);return{path:candidate,namespace:'crop-source'};}catch{}}
    throw new Error(`Missing comparison source import: ${args.path}`);
   });
   builder.onLoad({filter:/.*/,namespace:'crop-source'},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)}));
  }}],
 });
 return result.outputFiles[0].text;
}
