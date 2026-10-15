/** Static map-only exports. These are deliberately not browser screenshots. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import sharp from 'sharp';
const base=process.env.LATIN_READABILITY_BASE??'6f3d4a27c17bf205220d0eb44563975af2bcbdad';
const output=process.env.LATIN_READABILITY_OUTPUT??'/tmp/latin-readability-preview';
const root=process.cwd(),catalog='src/data/atlas/latin-america/industry-sectors.json';
const original=execFileSync('git',['show',base+':'+catalog]);assert.deepEqual(await readFile(catalog),original,'The source catalog, quantities and coordinates must stay unchanged');
await mkdir(output,{recursive:true});
async function library(ref){
 const plugin=ref?{name:'review-baseline-source',setup(b){b.onLoad({filter:/\.(ts|json)$/},async args=>({contents:execFileSync('git',['show',ref+':'+path.relative(root,args.path)],{encoding:'utf8'}),loader:args.path.endsWith('.json')?'json':'ts'}));}}:null;
 const result=await build({stdin:{contents:"export * from './src/lib/atlas-latin-industry-sectors.ts';",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',plugins:plugin?[plugin]:[]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const report={kind:'static-svg-map-only',browserScreenshot:false,base,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),worktreeModified:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),catalogSha256:crypto.createHash('sha256').update(original).digest('hex'),scenes:[]};
report.sourceHashes={};
for(const file of ['src/lib/atlas-latin-industry-layers.ts','src/lib/atlas-latin-industry-sectors.ts','src/lib/atlas-latin-industry-evidence.ts','src/components/atlas/LatinIndustrySectors.astro','src/scripts/atlas-latin-industry-sectors.ts','src/styles/atlas-latin-industry-sectors.css'])report.sourceHashes[file]=crypto.createHash('sha256').update(await readFile(file)).digest('hex');
async function render(lib,variant,state,width,height){
 let svg=lib.renderIndustrySectorMap(state,width,height).replace(/(\sdata-[\w-]+)(?=[\s>])/g,'$1=""');
 svg=svg.replace(/(<svg\b[^>]*>)/,'$1<rect width="100%" height="100%" fill="#eaf1ee"/>');
 const name=variant+'-'+state.sector+(state.industry?'-'+state.industry:'')+'-'+width,file=path.join(output,name),scene=lib.industrySectorScene(state,width,height);
 await writeFile(file+'.svg',svg);const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(file+'.png',png);
 report.scenes.push({name,width,height,sector:state.sector,industry:state.industry,sourceSites:scene.visible.length,displayMarks:scene.clusters?.length??scene.visible.length,labels:state.industry?scene.labels.filter(l=>l.industry===state.industry).length:scene.overviewLabels?.length??scene.labels.length,png:name+'.png',sha256:crypto.createHash('sha256').update(png).digest('hex')});
}
const before=await library(base),after=await library();
for(const [width,height] of [[960,770],[360,600]]){
 for(const sector of ['resources','manufacturing','services']){const state={sector,industry:null,site:null,single:false,scope:'all',place:'all'};await render(before,'before',state,width,height);await render(after,'after',state,width,height);}
 for(const [sector,industry] of [['resources','niobium'],['manufacturing','beef'],['manufacturing','medical'],['services','corporate']])await render(after,'selected',{sector,industry,site:null,single:false,scope:'all',place:'all'},width,height);
}
await writeFile(path.join(output,'static-map-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,kind:report.kind,scenes:report.scenes.length,counts:report.scenes.filter(s=>s.name.startsWith('after')).map(s=>({name:s.name,sourceSites:s.sourceSites,displayMarks:s.displayMarks,labels:s.labels}))},null,2));
