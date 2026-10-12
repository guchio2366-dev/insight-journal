import geography from '../../public/assets/atlas/latin-nature-reading-v2/geography.json';
import central from '../../public/assets/atlas/latin-review-v3/central-terrain-display.json';
import {latinPath,type LatinGeometry} from './atlas-latin-america-geometry';
import manifest from '../../public/assets/atlas/latin-nature-reading-v2/manifest.json';
import {latinMapLayout,projectLatin} from './atlas-latin-america-geometry';

export const latinReadingGeography=geography;
export const latinRainfallReading=manifest.rainfall;
export const latinElevationReading=manifest.elevation;
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderLatinLandformAreas(clipId:string){
 return `<g data-landform-areas clip-path="url(#${clipId})">${[...geography.regions,...central.regions.map(r=>({...r,path:latinPath(r.geometry as LatinGeometry)}))].map(r=>`<path data-landform-area="${r.id}" d="${r.path}" fill="${r.color}" fill-rule="evenodd" stroke="#746b54" stroke-width=".55" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
}
/** All text stays in the screen frame; geography alone follows the map camera. */
export function renderLatinFoundationAnnotations(section:string,scope:string,place:string,scale:number,reservedBoxes:number[][]=[],height=580){
 const layout=latinMapLayout(scope,place,height),boxes:number[][]=reservedBoxes.map(box=>[...box]),maximumLabels=scope==='country'?24:18;
 const add=(coordinate:number[],label:string,kind:string,color='#243d43',priority=false)=>{
  if(boxes.length>=maximumLabels)return '';
  const [px,py]=projectLatin(coordinate),x=px*layout.k+layout.tx,y=py*layout.k+layout.ty;
  if(x<16||x>884||y<16||y>height-16)return '';
  const width=([...label].reduce((sum,c)=>sum+(c.charCodeAt(0)>255?13:7.2),4))*scale,labelHeight=15*scale,lx=Math.min(892-width,Math.max(8,x+6*scale)),ly=y-5*scale;
  if(!priority&&boxes.some(b=>lx<b[0]+b[2]+4&&lx+width>b[0]-4&&ly-labelHeight<b[1]+b[3]+3&&ly>b[1]-3))return '';
  boxes.push([lx,ly-labelHeight,width,labelHeight]);
  return `<g data-foundation-annotation="${kind}" pointer-events="none"><text x="${lx}" y="${ly}" font-size="${13*scale}" fill="${color}" stroke="#fffefa" stroke-width="${3*scale}" paint-order="stroke" stroke-linejoin="round">${esc(label)}</text></g>`;
 };
 let labels='';
 if(section==='terrain')for(const r of [...geography.regions,...central.regions])labels+=add(r.labelCoordinate,r.name,'landform','#4e4934');
 else for(const id of section==='rainfall'?['andes','brazil-highlands','amazon-basin','pampas']:['andes','brazil-highlands']){const r=geography.regions.find(r=>r.id===id);if(!r)continue;labels+=add(r.labelCoordinate,r.name,'landform-context','#5a5544');}
 const japanese:Record<string,string>={'San Jose':'サンホセ','Manaus':'マナウス','Lima':'リマ','Santiago':'サンティアゴ','Bogota':'ボゴタ','Buenos Aires':'ブエノスアイレス'};
 if(section!=='rainfall')for(const p of manifest.rainfall.samples){
  const name=japanese[p.name]??p.name;
  labels+=add(section==='rainfall'?p.cellCenter:p.coordinate,section==='rainfall'?`${name} ${Math.round(p.annual).toLocaleString('ja-JP')}mm`:name,section==='rainfall'?'gpcc-cell':'place');
 }
 if(section==='rainfall')for(const p of manifest.rainfall.contourLabels)labels+=add(p.coordinate,`${p.value.toLocaleString('ja-JP')}`,'isohyet','#124e7b');
 if(section==='elevation')for(const p of [...manifest.elevation.contourLabels].sort((a,b)=>Number(b.value%1000===0)-Number(a.value%1000===0)||b.value-a.value))labels+=add(p.coordinate,`${p.value.toLocaleString('ja-JP')}m`,'contour','#543e32');
 return `<g data-foundation-screen-annotations aria-label="${section==='rainfall'?'地形地域名と等雨量線の数値':'地形地域名と位置参照の都市名'}" font-family="sans-serif" font-weight="600">${labels}</g>`;
}
export function renderLatinRainfallReadingLegend(){
 const data=manifest.rainfall;
 const bar=(start:number,end:number,ticks:number[])=>`<div class="latin-foundation-scale"><div class="latin-foundation-colorbar" aria-hidden="true">${data.colors.slice(start/250,end/250).map(c=>`<span style="flex:1;background:${c}"></span>`).join('')}</div><div class="latin-foundation-ticks">${ticks.map(t=>`<span style="left:${100*(t-start)/(end-start)}%;transform:translateX(${t===start?'0':t===end?'-100':'-50'}%)">${t.toLocaleString('ja-JP')}</span>`).join('')}</div></div>`;
 return `<div data-rainfall-piecewise-legend aria-label="年降水量の凡例。通常域と極端な多雨域は別の目盛"><strong>通常域：少雨 → 中雨 → 多雨</strong>${bar(0,4000,[0,1000,2000,3000,4000])}<strong>極端な多雨域</strong>${bar(4000,10500,[4000,7000,10500])}<p>mm/年 · 1991–2020年。青帯・線は全域250mm間隔。2本の帯は別の目盛です。線上の数値：等雨量線。灰地：欠測・未解像。</p></div>`;
}
export function renderLatinLandformLegend(){
 return `<div class="latin-foundation-extra-key">${[...geography.regions,...central.regions].map(r=>`<span><i style="background:${r.color}"></i>${r.name}</span>`).join('')}</div><p>色面：Natural Earthの地形地域名の概略範囲。標高・地質の階級ではありません。ラプラタ平原はグランチャコ・パンパ等の地域として読みます。青線：河川。</p>`;
}

/** Schematic sea arrows from published directional explanations; no observed wind/current field. */
export function renderLatinSeaContext(clipId:string){
 const path=(coords:number[][])=>coords.map((p,i)=>{const [x,y]=projectLatin(p);return `${i?'L':'M'}${x},${y}`;}).join('');
 const arrows=[{id:'humboldt',label:'フンボルト海流（模式）',coordinates:[[-82,-34],[-84,-23],[-86,-13]],anchor:[-86,-24]},{id:'trades',label:'貿易風（模式）',coordinates:[[-42,18],[-48,15],[-55,12]],anchor:[-51,19]}];
 return `<defs><marker id="${clipId}-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#6792a2"/></marker></defs><g data-sea-schematic pointer-events="none">${arrows.map(a=>{const [x,y]=projectLatin(a.anchor);return `<path data-sea-schematic-arrow="${a.id}" d="${path(a.coordinates)}" fill="none" stroke="#6792a2" stroke-width="1.2" marker-end="url(#${clipId}-arrow)"/><text x="${x}" y="${y}" text-anchor="middle" font-size="9" fill="#4d7b8c">${a.label}</text>`;}).join('')}</g>`;
}
