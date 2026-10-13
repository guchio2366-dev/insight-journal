import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

test('selected regional climate readers fit below the retained tabs on resize, reload and clear without moving the map',async()=>{
 const bundle=await build({stdin:{contents:"import {createRegionalClimateSelection} from './src/scripts/atlas-regional-climate-selection.ts';window.createClimateSelection=createRegionalClimateSelection;",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
 try{
  for(const [region,city,shell]of [['oceania','darwin','atlas-desktop-shell'],['russia','moscow','russia-workspace']]){
   const window=new Window({width:1440,height:900,url:`https://example.test/atlas/${region}/nature/?city=${city}`});
   try{
    window.document.body.innerHTML=`<style>${readFileSync('src/styles/atlas-regional-climate-cities.css','utf8')}</style><div class="${shell}"><div data-root data-field="nature" class="${region}-learning"><div data-primary-map><svg viewBox="0 0 640 350"><g data-regional-climate-city="${city}"></g></svg></div><aside class="${region}-learning-reading"><section data-regional-climate-reading hidden></section></aside><template data-regional-climate-template="${city}"><header><h2>${city}</h2><button data-clear-climate-city>clear</button></header><div class="regional-climate-details">source</div></template></div></div>`;
    const root=window.document.querySelector('[data-root]'),parent=root.querySelector('aside'),panel=root.querySelector('[data-regional-climate-reading]'),map=root.querySelector('svg');
    let top=299;parent.getBoundingClientRect=()=>({top});
    window.eval(bundle.outputFiles[0].text);
    let selection;selection=window.createClimateSelection(root,region,()=>true,mutate=>{mutate();selection.render();});selection.render();
    // Happy DOM does not lay out dvh/media queries; verify the budget supplied to
    // the real CSS. The existing sandboxed Chrome test checks rendered rectangles.
    const height=()=>parseFloat(parent.style.getPropertyValue('--regional-climate-pane-height'));
    assert.equal(panel.hidden,false);assert.ok(top+height()<=window.innerHeight-14,'selected reader budget remains inside the viewport below the existing tab rows');
    const first=height();window.happyDOM.setWindowSize({width:1440,height:1000});window.dispatchEvent(new window.Event('resize'));
    assert.equal(height()-first,100,'viewport resize updates the reader budget');
    top=349;selection.read();selection.render();assert.ok(top+height()<=window.innerHeight-14,'restored selection measures its actual top');
    assert.equal(map.getAttribute('viewBox'),'0 0 640 350');
    panel.querySelector('[data-clear-climate-city]').click();assert.equal(panel.hidden,true);assert.equal(parent.style.getPropertyValue('--regional-climate-pane-height'),'');
    assert.equal(map.getAttribute('viewBox'),'0 0 640 350');
   }finally{await window.happyDOM.close();}
  }
 }finally{stop();}
});
