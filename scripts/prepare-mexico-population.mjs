// Generate static SVG substitutes from the same statistics, boundaries and
// projection used by the interactive population page. Run after the Python
// source-data preparation script; no remote request is made here.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {build} from 'esbuild';

const directory = 'public/assets/atlas/mexico-population-v1';
const population = JSON.parse(await readFile('src/data/atlas/mexico/population.json','utf8'));
const geometry = JSON.parse(await readFile('src/data/atlas/mexico/geometry.json','utf8'));
async function loadModule(path) {
 const result = await build({entryPoints:[resolve(path)],absWorkingDir:process.cwd(),tsconfigRaw:{},bundle:true,write:false,format:'esm',platform:'node'});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const projection = await loadModule('src/lib/atlas-mexico-geometry.ts');
const encoding = await loadModule('src/lib/atlas-mexico-population.ts');
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const features = geometry.features.map(feature => {
 const row = population.states.find(row => row.stateCode === feature.properties.code);
 if(!row) throw new Error(`Missing population state ${feature.properties.code}`);
 return {row,path:projection.geometryPath(feature.geometry),point:projection.stateLabelPoint(row.stateCode)};
});
const labels = ['02','03','05','08','14','19','25','26','31'];
const assets = [];
for (const mode of ['density','population','density-population']) {
 const density = mode !== 'population', circles = mode !== 'density';
 const title = mode === 'density' ? '2020年のメキシコ32州人口密度' : mode === 'population' ? '2020年のメキシコ32州人口規模' : '2020年のメキシコ32州人口密度と人口規模';
 const paths = features.map(({row,path})=>`<path d="${path}" fill="${density?encoding.mexicoDensityColor(row.density):'#e0e7d8'}"><title>${escape(row.nameJa)}：${row.population}人、${row.density.toFixed(1)}人/km²（2020年）</title></path>`).join('');
 const symbols = circles ? [...features].sort((a,b)=>b.row.population-a.row.population).map(({row,point})=>`<circle cx="${point[0]}" cy="${point[1]}" r="${encoding.mexicoPopulationRadius(row.population)}"><title>${escape(row.nameJa)}：${row.population}人（2020年、面積比例）</title></circle>`).join('') : '';
 const text = features.filter(feature=>labels.includes(feature.row.stateCode)).map(({row,point})=>`<text x="${point[0]}" y="${point[1]-6}" text-anchor="middle">${row.short}</text>`).join('');
 const specialLabels = ['09','15'].map(code=> {
  const {row,point}=features.find(feature=>feature.row.stateCode===code);
  const dx=code==='09'?48:-68,dy=code==='09'?42:-44;
  return `<path class="label-line" d="M${point[0]},${point[1]}l${dx},${dy}"/><text x="${point[0]+dx}" y="${point[1]+dy+(dy>0?23:-5)}" text-anchor="middle">${row.short}</text>`;
 }).join('');
 const symbolLegend = circles ? `<g class="symbol-key"><text x="45" y="476">円の面積＝州人口</text>${encoding.mexicoPopulationLegendValues.map((value,index)=>`<circle cx="${70+index*135}" cy="524" r="${encoding.mexicoPopulationRadius(value)}"/><text x="${70+index*135}" y="572" text-anchor="middle">${value===1_000_000?'100万':value===5_000_000?'500万':'1,000万'}人</text>`).join('')}</g>` : '';
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 580" width="900" height="580" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">人口は2020年3月15日の州全域の値。密度はINEGI公表の人/km²。円の面積は州人口に比例。表示州境は2025年。州人口、密度、双方の凡例と全州表を同じページで確認できます。</desc><style>svg{background:#eaf1ee}path{stroke:#fffefa;stroke-width:.8;fill-rule:evenodd;vector-effect:non-scaling-stroke}circle{fill:#d68b38;fill-opacity:.58;stroke:#81511c;stroke-width:1.4}text{font-family:system-ui,sans-serif;font-size:28px;font-weight:650;fill:#203d36;paint-order:stroke;stroke:#fffefa;stroke-width:5px;stroke-linejoin:round}.context text{fill:#57726c;stroke:none;font-size:27px;font-weight:400}.label-line{fill:none;stroke:#4f6456;stroke-width:1.5}.symbol-key text{font-size:24px;stroke:#eaf1ee;stroke-width:3px}</style><g>${paths}</g><g>${symbols}</g><g>${text}${specialLabels}</g><g class="context"><text x="450" y="45">米国</text><text x="95" y="415">太平洋</text><text x="720" y="250">メキシコ湾</text><text x="800" y="540">グアテマラ</text></g>${symbolLegend}</svg>\n`;
 const filename = `${mode}.svg`, bytes = Buffer.from(svg);
 await writeFile(`${directory}/${filename}`,bytes);
 assets.push({file:filename,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),states:32,referenceYear:2020});
}
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`,'utf8'));
manifest.staticMaps = {renderer:'SVG',projection:'same INEGI Lambert Conformal Conic as the primary map',encoding:'same density thresholds and population-area formula as primary map and legend',artifacts:assets};
await writeFile(`${directory}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(`Mexico population: generated ${assets.length} SVG substitutes from the same 32 states and statistical encodings.`);
