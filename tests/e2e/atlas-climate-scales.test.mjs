import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
import {climatePlotCities} from '../fixtures/climate-plot-cities.mjs';
const num = (el, key) => Number(el.getAttribute(key));
function verify(svg, city) {
 assert.ok(svg, city.id);
 assert.deepEqual([...svg.querySelectorAll('[data-climate-plot-month]')].map(n => Number(n.textContent)), Array.from({length:12}, (_,i) => i+1));
 assert.match(svg.textContent, /mm/); assert.match(svg.textContent, /℃|°C/);
 const rain = [...svg.querySelectorAll('[data-rain-tick]')], temp = [...svg.querySelectorAll('[data-temperature-tick]')];
 const checkGrid = (lines, key, step) => {
  lines.slice(1).forEach((line,i) => {
   assert.equal(num(line,key)-num(lines[i],key),step);
   if(i) assert.ok(Math.abs((num(line,'y1')-num(lines[i],'y1'))-(num(lines[i],'y1')-num(lines[i-1],'y1'))) < 1e-8);
  });
 };
 checkGrid(rain, 'data-rain-tick', 100); checkGrid(temp, 'data-temperature-tick', 10);
 const rainY = v => num(rain.find(l => num(l,'data-rain-tick')===v), 'y1');
 const tempY = v => num(temp.find(l => num(l,'data-temperature-tick')===v), 'y1');
 const baseline=rainY(0), top=Number(svg.dataset.plotTop), bottom=Number(svg.dataset.plotBottom);
 assert.equal(baseline,bottom);
 const bars=[...svg.querySelectorAll('rect')], dots=[...svg.querySelectorAll('circle')];
 const values=city.precipitationMm.filter(v=>v!==null), temperatures=city.temperatureC.filter(v=>v!==null);
 assert.equal(bars.length,values.length); assert.equal(dots.length,temperatures.length);
 bars.forEach((bar,i)=>{
  const y=num(bar,'y'), h=num(bar,'height');
  assert.ok(y >= top-1e-8 && y <= bottom && h>=0, `${city.id}: rain stays inside`);
  assert.ok(Math.abs(y+h-baseline)<1e-8);
  assert.ok(Math.abs(h*100/(rainY(0)-rainY(100))-values[i])<1e-7, `${city.id}: original rain value`);
 });
 dots.forEach((dot,i)=>{
  const y=num(dot,'cy');assert.ok(y>=top-1e-8 && y<=bottom+1e-8);
  assert.ok(Math.abs((tempY(0)-y)*10/(tempY(0)-tempY(10))-temperatures[i])<1e-7, `${city.id}: original temperature value`);
 });
 const rainMax=Number(svg.dataset.rainMax);
 assert.ok([...svg.querySelectorAll('text')].some(n=>Number(n.textContent)===rainMax), `${city.id}: visible upper bound`);
 if(values.some(v=>v>350)) assert.ok(svg.textContent.includes('最多雨：'));
 const x=[...svg.querySelectorAll('[data-climate-plot-month]')].map(n=>num(n,'x'));
 x.slice(1).forEach((v,i)=>assert.ok(Math.abs(v-x[i]-(x[1]-x[0]))<1e-8));
}
const regions = [
 ['us','atlas/north-america/nature','[data-city-panel]','data-city-panel'],
 ['canada','atlas/north-america/canada/nature','[data-canada-climate-card]','data-canada-climate-card'],
 ['mexico','atlas/north-america/mexico/nature','[data-mexico-climate-plot]','data-mexico-climate-plot'],
 ['europe','atlas/europe/nature','[data-eu-city-chart]','data-eu-city-chart'],
 ['africa','atlas/africa','[data-africa-city-reading]','data-africa-city-reading'],
 ['latinLegacy','atlas/latin-america/base-map/nature','[data-city-panel]','data-city-panel'],
 ...['east-asia','southeast-asia','south-central-asia'].map(region=>['asia',`atlas/asia/${region}/nature`,'[data-city-panel]','data-city-panel',region]),
 ['westAsia','atlas/west-asia/nature','template[data-west-chart]','data-west-chart'],
];
for(const [group,path,selector,key,region]of regions) test(`delivered SVG axes and values: ${path}`, async()=>{
 const window=new Window();
 try{
  window.document.body.innerHTML=(await readFile(`dist/${path}/index.html`,'utf8')).replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
  const charts=[...window.document.querySelectorAll(selector)];
  // Europe keeps chart figures inside templates.
  if(group==='europe') for(const t of window.document.querySelectorAll('template')) charts.push(...t.content.querySelectorAll(selector));
  const cities=region?climatePlotCities[group].filter(c=>c.regionId===region):climatePlotCities[group];
  for(const city of cities){const node=charts.find(n=>n.getAttribute(key)===city.id);verify(node?.tagName==='TEMPLATE'?node.content.querySelector('svg'):node?.querySelector('svg[data-climate-plot]'),city);}
 }finally{await window.happyDOM.close();}
});

test('dynamic Latin renderer keeps all sixteen station values and missing line segments',async()=>{
 const result=await build({entryPoints:['src/lib/atlas-latin-nature.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {renderLatinNatureNormals}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
 const window=new Window();try{for(const city of climatePlotCities.latinNature){window.document.body.innerHTML=renderLatinNatureNormals(city.id);verify(window.document.querySelector('svg'),city);}}finally{await window.happyDOM.close();}
});
