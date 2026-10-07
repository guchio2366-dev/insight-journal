import population from '../data/atlas/latin-america/population.json';
import {latinCountries,latinWidth,latinHeight,latinMapLayout,latinRasterFrame} from './atlas-latin-america-geometry';
import ghsl from '../../public/assets/atlas/latin-america-population-v1/manifest.json';
import {withBase} from './urls';

export type LatinPopulationLayer='spatial'|'density'|'population'|'scale';
export type LatinPopulationStatus='value'|'zero'|'missing'|'confidential'|'unavailable';
export type LatinPopulationScope='all'|'central'|'south'|'country';
export interface LatinPopulationMapState {layer:string;place:string;scope:LatinPopulationScope;only:boolean}
export const latinPopulationDensityBins=[
 {min:0,max:10,color:'#f1f5f0',label:'10未満'},
 {min:10,max:25,color:'#d0e4d8',label:'10–25未満'},
 {min:25,max:50,color:'#a2cec5',label:'25–50未満'},
 {min:50,max:100,color:'#70afa9',label:'50–100未満'},
 {min:100,max:250,color:'#3d858b',label:'100–250未満'},
 {min:250,max:Infinity,color:'#205762',label:'250以上'},
] as const;
export const latinPopulationLegendValues=[10_000_000,50_000_000,200_000_000] as const;
export const latinPopulationSymbolStyle={color:'#d68b38',opacity:.58,stroke:'#81511c',selectedStroke:'#862f21',selectedOpacity:.76} as const;
export const latinPopulationRows=population.countries;
export function latinPopulationRadius(value:number|null){return value!==null&&Number.isFinite(value)&&value>=0?32*Math.sqrt(value/100_000_000):0;}
export function latinPopulationDensityColor(value:number|null,status:string='value',idPrefix='lp'){
 if(!['value','zero'].includes(status)||value===null||!Number.isFinite(value)||value<0)return `url(#${idPrefix}-${['missing','confidential','unavailable'].includes(status)?status:'unavailable'})`;
 return latinPopulationDensityBins.find(bin=>value>=bin.min&&value<bin.max)?.color??`url(#${idPrefix}-unavailable)`;
}
export function latinPopulationValue(value:number|null,status:string='value',decimals=0){
 if(status==='confidential')return '秘匿';if(status==='missing')return '欠測';if(status==='unavailable'||value===null||!Number.isFinite(value))return '対象統計なし';
 return value.toLocaleString('ja-JP',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}
export function latinPopulationScopeIncludes(code:string,scope:string){
 if(scope==='all'||scope==='country')return true;
 const country=population.countries.find(row=>row.countryCode===code);return scope==='south'?country?.subregion==='South America':!!country&&country.subregion!=='South America';
}
const escape=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export const latinPopulationSpatialBins=ghsl.classes;
export interface LatinPopulationSpatialGrid {width:number;height:number;noData:number;values:number[]}
/** Read the retained display cell without interpolation or another rounding step. */
export function latinPopulationSpatialCell(grid:LatinPopulationSpatialGrid,x:number,y:number){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>=1||y<0||y>=1)return null;
 const value=grid.values[Math.floor(y*grid.height)*grid.width+Math.floor(x*grid.width)];
 return value===grid.noData||value===undefined?null:value;
}
function renderLatinPopulationSpatialMap(state:LatinPopulationMapState,id:string){
 const {frame,transform}=latinMapLayout(state.scope,state.place),raster=latinRasterFrame();
 const selected=latinCountries.find(country=>country.code===state.place);
 const clip=state.only&&selected?`<defs><clipPath id="${id}-only"><path d="${selected.path}"/></clipPath></defs>`:'';
 const image=(opacity:number,mask='')=>`<image data-lp-spatial-image="" href="${withBase('/assets/atlas/latin-america-population-v1/latin-america.png')}" x="${raster.x}" y="${raster.y}" width="${raster.width}" height="${raster.height}" preserveAspectRatio="none" style="image-rendering:pixelated" opacity="${opacity}" ${mask}/>`;
 const context=latinCountries.map(country=>`<path class="lp-context" d="${country.path}" fill="#dce3e1" stroke="#9baaa4" stroke-width=".55" vector-effect="non-scaling-stroke"/>`).join('');
 const outlines=latinCountries.map(country=>`<path data-lp-country="${country.code}" d="${country.path}" fill="transparent" stroke="${country.code===state.place?'#983c26':'#657f71'}" stroke-width="${country.code===state.place?'2.5':'.55'}" vector-effect="non-scaling-stroke" role="button" tabindex="0" aria-pressed="${country.code===state.place}" aria-label="${escape(country.name)}の人口分布と2023年国統計を読む"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="latin-map lp-map lp-spatial-map" data-latin-map="" data-lp-map="${id}" data-lp-layer="spatial" data-lp-scope="${escape(state.scope)}" data-lp-frame="${frame.join(' ')}" viewBox="0 0 ${latinWidth} ${latinHeight}" role="group" aria-labelledby="${id}-title ${id}-desc" style="display:block;width:100%;height:auto;background:#edf3ef;border:1px solid #cbd8cd;border-radius:8px"><title id="${id}-title">中南米の居住人口密度推計・GHSL2020</title><desc id="${id}-desc">1km等積人口格子を10km格子へ集計した2020年の推計。8階級の色は人/km²。国平均ではありません。0は有効な0、透明部分は欠測・対象外。国を選んでも他地域の分布を残します。</desc>${clip}<g data-lp-spatial-native="" transform="${transform}"><g aria-hidden="true">${context}</g>${clip?image(.16)+image(1,`clip-path="url(#${id}-only)"`):image(1)}<g>${outlines}</g></g></svg>`;
}

// The outer canvas stays 900x580 even when the geographic frame changes. Paths
// are transformed into it; population circles and their legend share this fixed
// canvas. Thus zoom never changes population size or creates mismatched legends.
export function renderLatinPopulationMap(state:LatinPopulationMapState,idPrefix='lp'){
 const id=idPrefix.replace(/[^A-Za-z0-9_-]/g,'');
 if(state.layer==='spatial')return renderLatinPopulationSpatialMap(state,id);
 const {k,tx,ty,transform:geometryTransform}=latinMapLayout(state.scope,state.place);
 const density=state.layer!=='population',quantity=state.layer!=='density';
 const labelPoint=(country:typeof latinCountries[number])=>{const p=country.label;return [p[0]*k+tx,p[1]*k+ty];};
 const context=latinCountries.map(country=>`<path class="lp-context" d="${country.path}"/>`).join('');
 const paths=latinCountries.map(country=>{
  const row=population.countries.find(row=>row.countryCode===country.code)!;
  const hidden=state.only&&state.place!=='all'&&state.place!==country.code;
  const point=labelPoint(country),visible=latinPopulationScopeIncludes(country.code,state.scope)&&point[0]>=0&&point[0]<=latinWidth&&point[1]>=0&&point[1]<=latinHeight;
  const fill=density?latinPopulationDensityColor(row.density,row.densityStatus,id):row.population===null?`url(#${id}-unavailable)`:'#e1e7d9';
  const title=`${row.nameJa}：2023年人口 ${latinPopulationValue(row.population,row.populationStatus)}${row.population===null?'':'人'}、密度 ${latinPopulationValue(row.density,row.densityStatus,1)}${row.density===null?'':'人/陸地km²'}`;
  return `<path class="lp-country${state.place===country.code?' lp-selected':''}" data-lp-country="${country.code}" data-lp-status="${density?row.densityStatus:row.populationStatus}" d="${country.path}" fill="${fill}"${hidden?' style="display:none"':''} role="button" tabindex="${hidden||!visible||quantity?'-1':'0'}" aria-pressed="${state.place===country.code}" aria-label="${escape(title)}"><title>${escape(title)}</title></path>`;
 }).join('');
 const symbols=quantity?[...population.countries].sort((a,b)=>(b.population??0)-(a.population??0)).map(row=>{
  const country=latinCountries.find(country=>country.code===row.countryCode)!,p=labelPoint(country),hidden=state.only&&state.place!=='all'&&state.place!==row.countryCode;
  const visible=latinPopulationScopeIncludes(row.countryCode,state.scope)&&p[0]>=0&&p[0]<=latinWidth&&p[1]>=0&&p[1]<=latinHeight;
  const title=`${row.nameJa}：2023年人口 ${latinPopulationValue(row.population,row.populationStatus)}${row.population===null?'':'人、円の面積で規模を表示'}`;
  const mark=row.population===null?`<path class="lp-unknown-symbol" d="M${p[0]-5},${p[1]-5}h10v10h-10z"/>`:`<circle cx="${p[0]}" cy="${p[1]}" r="${latinPopulationRadius(row.population)}" data-lp-population="${row.population}"/>`;
  return `<g class="lp-population-symbol${state.place===row.countryCode?' lp-selected':''}" data-lp-symbol="${row.countryCode}"${hidden?' style="display:none"':''} role="button" tabindex="${hidden||!visible?'-1':'0'}" aria-pressed="${state.place===row.countryCode}" aria-label="${escape(title)}">${mark}<title>${escape(title)}</title></g>`;
 }).join(''):'';
 const labelCodes=state.place==='all'?['BRA','ARG','PER','GTM','CUB']: [state.place];
 const labels=labelCodes.filter(code=>latinPopulationScopeIncludes(code,state.scope)).map(code=>{
  const country=latinCountries.find(country=>country.code===code);if(!country)return '';const p=labelPoint(country);if(p[0]<0||p[0]>900||p[1]<0||p[1]>580)return '';
  const selected=state.place===code,dx=p[0]>600?-25:25,text=selected?country.name:code;
  return selected?`<g class="lp-map-label lp-map-selected-label" aria-hidden="true"><path d="M${p[0]},${p[1]}l${dx},-24"/><text x="${p[0]+dx}" y="${p[1]-27}" text-anchor="${dx<0?'end':'start'}">${escape(text)}</text></g>`:`<text class="lp-map-label" aria-hidden="true" x="${p[0]}" y="${p[1]-12}" text-anchor="middle">${escape(text)}</text>`;
 }).join('');
 const legend=quantity?`<g class="lp-map-size-key" data-lp-map-size-key="" aria-label="円の面積の凡例。1,000万人、5,000万人、2億人。地図と同じ座標尺度。"><rect x="12" y="448" width="354" height="132" rx="8"/><text x="28" y="471" class="lp-key-title">円の面積＝2023年の人口</text>${latinPopulationLegendValues.map((value,i)=>`<g><circle cx="${60+i*129}" cy="527" r="${latinPopulationRadius(value)}" data-lp-legend-population="${value}"/><text x="${60+i*129}" y="577" text-anchor="middle">${i===0?'1,000万':i===1?'5,000万':'2億'}人</text></g>`).join('')}</g>`:'';
 const title=`2023年の${state.layer==='density'?'国・地域の人口密度':state.layer==='population'?'国・地域の人口規模':'人口密度と人口規模'}`;
 return `<svg class="latin-map lp-map" data-latin-map="" data-lp-map="${id}" data-lp-layer="${escape(state.layer)}" data-lp-scope="${escape(state.scope)}" viewBox="0 0 900 580" role="group" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${title}</title><desc id="${id}-desc">中米・カリブ・南米の34国・地域。2023年の世界銀行公表値。33対象に値があり、フォークランド諸島は対象統計なし。密度は国・地域全域の陸地面積あたりの人、円の面積は人口。地図と同じ凡例、国・地域メニュー、全対象の表で値を確認できます。</desc><defs><pattern id="${id}-unavailable" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#eee9df"/><path d="M0,8L8,0" stroke="#837968" stroke-width="2"/></pattern><pattern id="${id}-missing" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#eff0eb"/><path d="M0,0L8,8" stroke="#84928b" stroke-width="2"/></pattern><pattern id="${id}-confidential" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#ebe6f1"/><path d="M0,4H8M4,0V8" stroke="#796886" stroke-width="1"/></pattern></defs><style>.lp-map{display:block;width:100%;height:auto;background:#edf3ef;border:1px solid #cbd8cd;border-radius:8px}.lp-map path{fill-rule:evenodd;vector-effect:non-scaling-stroke}.lp-map .lp-context{fill:#e1e7db;stroke:#a9b5aa;stroke-width:.65}.lp-map .lp-country{stroke:#fffefa;stroke-width:.8;cursor:pointer}.lp-map .lp-country.lp-selected{stroke:#9c3b24;stroke-width:2.5}.lp-map .lp-population-symbol circle,.lp-map .lp-map-size-key circle{fill:${latinPopulationSymbolStyle.color};fill-opacity:${latinPopulationSymbolStyle.opacity};stroke:${latinPopulationSymbolStyle.stroke};stroke-width:1.4}.lp-map .lp-population-symbol{cursor:pointer}.lp-map .lp-population-symbol.lp-selected circle{stroke:${latinPopulationSymbolStyle.selectedStroke};stroke-width:3;fill-opacity:${latinPopulationSymbolStyle.selectedOpacity}}.lp-map .lp-unknown-symbol{fill:#eee9df;stroke:#837968;stroke-width:1.5}.lp-map .lp-map-label{font-family:system-ui,sans-serif;font-size:30px;font-weight:650;fill:#203e35;paint-order:stroke;stroke:#fffefa;stroke-width:5px;stroke-linejoin:round;pointer-events:none}.lp-map .lp-map-selected-label path{fill:none;stroke:#9c3b24;stroke-width:1.7}.lp-map .lp-map-selected-label text{fill:#772f21}.lp-map .lp-map-size-key{pointer-events:none}.lp-map .lp-map-size-key rect{fill:#edf3ef;fill-opacity:.94}.lp-map .lp-map-size-key text{font-family:system-ui,sans-serif;font-size:27px;fill:#334d3d}.lp-map .lp-map-size-key .lp-key-title{font-size:27px;font-weight:650}.lp-map [role=button]:focus-visible{outline:none;stroke:#b15b27;stroke-width:3.5}</style><g transform="${geometryTransform}" aria-hidden="true">${context}</g><g transform="${geometryTransform}">${paths}</g><g>${symbols}</g><g>${labels}</g>${legend}</svg>`;
}

export function renderLatinPopulationLegend(layer:string){
 if(layer==='spatial')return `<div class="lp-legend" data-lp-legend="spatial"><p class="lp-legend-title">色＝2020年の居住人口密度推計（人/km²）</p><ul class="lp-density-legend lp-spatial-legend">${latinPopulationSpatialBins.map(bin=>`<li><i style="background:${bin.color}" aria-hidden="true"></i>${bin.label}</li>`).join('')}</ul><p class="lp-legend-status">0は有効な0。透明・灰背景：欠測／対象外。10km等積格子へ集計し、表示は約14km。GHSL GHS-POP R2023A、CC BY 4.0。</p></div>`;
 const density=layer!=='population',quantity=layer!=='density';
 return `<div class="lp-legend" data-lp-legend="${escape(layer)}">${density?`<p class="lp-legend-title">色＝2023年の人口密度（人/陸地km²）</p><ul class="lp-density-legend" style="list-style:none;display:flex;flex-wrap:wrap;gap:5px 11px;margin:4px 0;padding:0;font-size:13px;line-height:1.6">${latinPopulationDensityBins.map(bin=>`<li style="display:inline-flex;align-items:center;gap:5px"><i style="display:inline-block;width:18px;height:13px;background:${bin.color};border:1px solid #879c90" aria-hidden="true"></i>${bin.label}</li>`).join('')}</ul>`:''}${quantity?'<p class="lp-legend-title" style="font-size:13px">円の面積＝2023年人口。地図内の円は左から1,000万・5,000万・2億人。</p>':''}<p class="lp-legend-status" style="font-size:13px;margin:3px 0">斜線・四角：対象統計なし（FLK）。0人とは区別。</p></div>`;
}
