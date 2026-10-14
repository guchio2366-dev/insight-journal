import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/scripts/atlas-west-asia-industry.ts'],bundle:true,write:false,format:'iife'});
export async function setupWestIndustry(query=''){
 const w=new Window({url:'https://example.com/insight-journal/atlas/west-asia/industry/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 w.document.body.innerHTML=(await readFile('dist/atlas/west-asia/industry/index.html','utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'');
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.eval(bundle.outputFiles[0].text);
 const q=s=>w.document.querySelector(s),all=s=>[...w.document.querySelectorAll(s)];
 if(q('[data-west-industry]')?.dataset.ready!=='true')throw Error('West industry did not render');
 return {w,q,all,selectCountry:code=>{q('[data-wi-country]').value=code;q('[data-wi-country]').dispatchEvent(new w.Event('change',{bubbles:true}));},restore:query=>{w.history.replaceState({},'',query);w.dispatchEvent(new w.PopStateEvent('popstate'));}};
}
