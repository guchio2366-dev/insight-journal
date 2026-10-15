// Static map-component exports for visual inspection. These are not browser
// screenshots and do not validate page layout, hit targets or native gestures.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import sharp from 'sharp';

const output=resolve(process.env.US_MAP_PREVIEW_OUT??'/workspace/us-industry-readability-review');
await mkdir(output,{recursive:true});
const bundle=await build({entryPoints:['src/scripts/atlas-us-industry.ts'],bundle:true,write:false,format:'iife',globalName:'USIndustry'});
const html=await readFile('dist/atlas/north-america/industry/index.html','utf8');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const report={mode:'static SVG map component; not a browser screenshot',baseCommit:'6f3d4a27c17bf205220d0eb44563975af2bcbdad',records:[]};
for(const [width,height] of [[1114,668],[556,334],[358,215]])for(const sector of ['resources','manufacturing','services']){
 const window=new Window({url:`https://example.test/insight-journal/atlas/north-america/industry/?sector=${sector}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 try{
  window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
  window.ResizeObserver=class{observe(){}};
  Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{get(){return this.hasAttribute('data-us-map-frame')?width:0;}});
  Object.defineProperty(window.HTMLElement.prototype,'clientHeight',{get(){return this.hasAttribute('data-us-map-frame')?height:0;}});
  window.eval(bundle.outputFiles[0].text+'\nUSIndustry.initUsIndustry(document.querySelector("[data-us-industry]"));');
  const q=s=>window.document.querySelector(s),overlay=q('[data-us-overlay]'),labels=[...overlay.querySelectorAll('[data-us-map-label]')];
  const text=labels.map(n=>`<text x="${parseFloat(n.style.left)}" y="${parseFloat(n.style.top)+13}" font-size="11" font-weight="600" fill="#233f47" stroke="#fffef5" stroke-width="2.5" paint-order="stroke">${escape(n.textContent)}</text>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:'Noto Sans CJK JP',sans-serif}.us-map-context{font-size:12px;fill:#425853}.us-industry-point-count{font-size:8px;font-weight:700;fill:#fff;stroke:#324d44;stroke-width:.8px;paint-order:stroke}</style><svg width="${width}" height="${height}" viewBox="0 0 1000 600">${q('[data-us-map]').innerHTML}</svg><svg width="${width}" height="${height}">${overlay.querySelector('svg').innerHTML}</svg>${text}</svg>`;
  const name=`${sector}-${width}`;await writeFile(resolve(output,name+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(output,name+'.png'));
  report.records.push({sector,width,height,sourceExamples:Number(overlay.dataset.sourceCount),groupedPoints:Number(overlay.dataset.groupCount),labels:labels.length,labelTexts:labels.map(n=>n.textContent),labelBudget:Number(overlay.dataset.labelBudget),mapControls:overlay.querySelectorAll('button').length});
 }finally{await window.happyDOM.close();}
}
await writeFile(resolve(output,'static-map-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
