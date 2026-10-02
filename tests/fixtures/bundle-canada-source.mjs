import {readFile,access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
// MapLibre's package root is import-only; this exported subpath resolves in Node.
const mapLibreEntry=require.resolve('maplibre-gl/dist/maplibre-gl.mjs');
const mapLibreDirectory=path.dirname(mapLibreEntry);

/** Bundle the actual local entry/import graph without scanning inaccessible ancestor directories. */
export async function bundleCanadaSource(file,options={}){
 const filename=path.resolve(file);
 const result=await build({
  stdin:{contents:await readFile(filename,'utf8'),resolveDir:path.dirname(filename),sourcefile:filename,loader:'ts'},
  tsconfigRaw:{compilerOptions:{}},bundle:true,write:false,platform:'browser',format:'iife',...options,
  plugins:[{name:'canada-local-source',setup(builder){
   builder.onResolve({filter:/.*/},async args=>{
    // Resolve its dist imports without scanning restricted ancestor directories.
    if(args.namespace==='file'&&path.dirname(args.importer)===mapLibreDirectory){
     return {path:createRequire(args.importer).resolve(args.path),namespace:'file'};
    }
    // Keep the local graph isolated, while esbuild bundles the approved package
    // and its own dependency graph through the normal file namespace.
    if(args.namespace!=='canada-source'&&args.importer!==filename)return;
    if(args.path==='maplibre-gl')return {path:mapLibreEntry,namespace:'file'};
    if(!args.path.startsWith('.'))throw new Error(`Expected a local source import: ${args.path}`);
    const absolute=path.resolve(args.resolveDir,args.path);
    for(const candidate of [absolute,absolute+'.ts',absolute+'.json',absolute+'.mjs',absolute+'.js']){
     try{await access(candidate);return {path:candidate,namespace:'canada-source'};}catch{}
    }
    throw new Error(`Missing source import: ${args.path}`);
   });
   builder.onLoad({filter:/.*/,namespace:'canada-source'},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)}));
  }}],
 });
 return result.outputFiles[0].text;
}
