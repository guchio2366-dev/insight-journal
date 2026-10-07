import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const workspace=await readFile('src/components/atlas/MexicoWorkspace.astro','utf8');
const adapter=workspace.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const compiled=await build({stdin:{contents:"import {initMexicoOverview} from './src/scripts/atlas-mexico-overview.ts';\n"+adapter+"\ninitMexicoOverview(document.querySelector('[data-mexico-field=overview]'));",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',platform:'browser',write:false});
const folder='dist/atlas/north-america/mexico/overview/index.html';
async function page(search=''){
 const w=new Window({url:'https://example.test/insight-journal/atlas/north-america/mexico/overview/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile(folder,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 w.eval(compiled.outputFiles[0].text);return w;
}
test('Mexico overview has official state geometry, a national reading and five same-country field entries',async()=>{
 const w=await page();try{const d=w.document;
 assert.equal(d.querySelectorAll('[data-mexico-overview-shape]').length,32);
 assert.equal(d.querySelector('[data-mexico-overview-state]').value,'');
 assert.ok(d.querySelector('[data-mexico-overview-reading]').hidden);
 assert.match(d.querySelector('.mexico-overview-intro').textContent,/126,014,024/);
 assert.deepEqual([...d.querySelectorAll('.mexico-fields>a')].map(a=>a.textContent.trim()),['概要','農林業','自然環境','主要産業','人口']);
 assert.ok([...d.querySelectorAll('.mexico-fields>a')].every(a=>a.href.includes('/mexico/')));
 assert.ok([...d.querySelectorAll('.mexico-fields>a')].every(a=>new URL(a.href).searchParams.get('reading')==='overview'&&!new URL(a.href).searchParams.has('state')));
 assert.ok(!d.querySelector('.mexico-reading').textContent.includes('準備しています'));
 }finally{await w.happyDOM.close();}
});
test('Mexico state selection, keyboard, focus and history restore the same reading and field targets',async()=>{
 const w=await page();let reload;try{const d=w.document,q=s=>d.querySelector(s);
 q('[data-mexico-overview-shape="08"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 await w.happyDOM.waitUntilComplete();
 assert.equal(q('[data-mexico-workspace]').dataset.mexicoReadingSelected,'true');
 assert.equal(q('[data-mexico-overview-state]').value,'08');assert.match(q('[data-mexico-overview-name]').textContent,/チワワ/);
 assert.match(q('[data-mexico-overview-values]').textContent,/3,741,869/);
 assert.equal(q('[data-mexico-overview-shape="08"]').getAttribute('aria-pressed'),'true');
 for(const a of d.querySelectorAll('[data-mexico-overview-field]')){const u=new URL(a.href),national=['population','industry'].includes(a.dataset.mexicoOverviewField);assert.equal(u.searchParams.get('state'),national?null:'08');if(national)assert.equal(u.searchParams.get('reading'),'overview');}
 for(const a of d.querySelectorAll('.mexico-fields>a')){const u=new URL(a.href),national=/\/(population|industry)\/$/.test(u.pathname);assert.equal(u.searchParams.get('state'),national?null:'08');assert.equal(u.searchParams.get('reading'),national?'overview':'item');}
 q('[data-mexico-overview-focus]').click();const frame=q('[data-mexico-overview-map]').getAttribute('viewBox');assert.notEqual(frame,'0 0 900 580');
 reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-mexico-overview-map]').getAttribute('viewBox'),frame);
 q('[data-mexico-overview-reset]').click();assert.equal(q('[data-mexico-overview-map]').getAttribute('viewBox'),'0 0 900 580');
 w.history.back();await w.happyDOM.waitUntilComplete();assert.equal(q('[data-mexico-overview-map]').getAttribute('viewBox'),frame);
 const select=q('[data-mexico-overview-state]');select.value='';select.dispatchEvent(new w.Event('change',{bubbles:true}));await w.happyDOM.waitUntilComplete();assert.ok(q('[data-mexico-overview-reading]').hidden);assert.equal(new URL(w.location).searchParams.get('state'),null);assert.equal(q('[data-mexico-workspace]').dataset.mexicoReadingSelected,'false');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});
test('An invalid overview state restores the national reading rather than an empty selected panel',async()=>{
 const w=await page('?state=invalid&reading=item');try{assert.equal(w.document.querySelector('[data-mexico-overview-state]').value,'');assert.equal(w.document.querySelector('[data-mexico-workspace]').dataset.mexicoReadingSelected,'false');assert.equal(new URL(w.location).searchParams.get('reading'),'overview');assert.equal(new URL(w.location).searchParams.get('state'),null);}finally{await w.happyDOM.close();}
});
