import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
export async function loadLatinCommonModule(entry){
 const sources={geometry:await readFile('src/lib/atlas-latin-america-geometry.ts','utf8'),state:await readFile('src/lib/atlas-latin-learning-state.ts','utf8'),countries:await readFile('src/data/atlas/latin-america/countries.json','utf8'),index:await readFile('src/data/atlas/latin-america/country-index.json','utf8')};
 const bundle=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',tsconfigRaw:{},plugins:[{name:'latin-common-fixtures',setup(b){
  b.onResolve({filter:/.*/},({path})=>({path:path.endsWith('country-index.json')?'index':path.endsWith('countries.json')?'countries':path,namespace:'latin-common'}));
  b.onLoad({filter:/.*/,namespace:'latin-common'},({path})=>{if(!(path in sources))throw Error(`Unexpected Latin fixture dependency: ${path}`);return {contents:sources[path],loader:['countries','index'].includes(path)?'json':'ts'};});
 }}]});
 return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
}
