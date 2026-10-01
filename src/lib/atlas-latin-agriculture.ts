import data from '../data/atlas/latin-america/agriculture.json';
import {latinCountries34, latinWidth, latinHeight, projectLatin, latinMapLayout} from './atlas-latin-america-geometry';
import {withBase} from './urls';
import {latinAgricultureReading, type LatinAgricultureLayer} from '../data/atlas/latin-america/agriculture-reading';

export {latinAgricultureReading};
export type {LatinAgricultureLayer};
export const latinAgricultureLayers = data.layers;
export type LatinAgricultureMapState = {layer:string;place:string;scope:string;only:boolean};
const escape = (v:unknown) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const agricultureLayer = (id:string) => data.layers.find(l=>l.id===id)??data.layers[0];
export const agricultureLayerTitle = (id:string) => id==='cattle'?'牛の飼育密度':`${agricultureLayer(id).label}の収穫面積`;
export function formatLatinAgricultureValue(value:number|null|undefined, unit:string, status?:string):string {
 if(value===null||value===undefined)return status==='unavailable'?'原表行なし':status==='unfetched'?'未取得':status==='confidential'?'秘匿':'欠測';
 if(value===0)return `0 ${unit}`;
 if(value<0.01)return `<0.01 ${unit}`;
 return `${new Intl.NumberFormat('ja-JP',{maximumFractionDigits:value<1?2:unit==='頭/km²'?1:0}).format(value)} ${unit}`;
}
export function renderLatinAgricultureLegend(id:string):string {
 const layer=agricultureLayer(id);const unit=id==='cattle'?'頭/km²':'ha/格子';
 const swatches=layer.breaks.map((v,i)=>`<span><i style="background:${layer.colors[i]}" aria-hidden="true"></i>${v.toLocaleString('ja-JP')}${layer.breaks[i+1]?`–${layer.breaks[i+1].toLocaleString('ja-JP')}未満`:'以上'}</span>`).join('');
 return `<div class="latin-agriculture-legend" data-latin-agriculture-legend="${escape(id)}" aria-label="${escape(layer.label)}の凡例"><strong>${escape(layer.label)}・2020年 ${unit}</strong><div>${swatches}<span><i style="background:#d8dee0" aria-hidden="true"></i>0–1未満（有効値）</span><span><i style="background:#f0ede3" aria-hidden="true"></i>欠測・対象外</span></div></div>`;
}
export function renderLatinAgricultureMap(state:LatinAgricultureMapState, idPrefix='latin-agriculture'):string {
 const layer=agricultureLayer(state.layer);
 const place=latinCountries34.find(c=>c.code===state.place);
 const {frame,transform}=latinMapLayout(state.scope,state.place);
 const bounds=layer.bounds;const [left,top]=projectLatin([bounds[0],bounds[3]]);const [right,bottom]=projectLatin([bounds[2],bounds[1]]);
 const safePrefix=idPrefix.replace(/[^a-zA-Z0-9_-]/g,'');
 const clipId=`${safePrefix}-country-clip`;
 const paths=latinCountries34.map(country=>`<path d="${country.path}" fill="#f0ede3" stroke="#7c8b87" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('');
 const outlines=latinCountries34.map(country=>`<path d="${country.path}" fill="transparent" stroke="${country.code===state.place?'#122f40':'#728079'}" stroke-width="${country.code===state.place?'3':'0.65'}" vector-effect="non-scaling-stroke" tabindex="0" role="button" aria-label="${escape(country.name)}を選ぶ" aria-pressed="${country.code===state.place}" data-latin-agriculture-country="${country.code}"><title>${escape(country.name)}</title></path>`).join('');
 const image=(opacity:number,clip='')=>[layer.validityImage,layer.image].map(url=>`<image href="${escape(withBase(url))}" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" preserveAspectRatio="none" style="image-rendering:pixelated" opacity="${opacity}" ${clip}/>`).join('');
 const distribution=state.only&&place?`${image(.16)}${image(1,`clip-path="url(#${clipId})"`)}`:image(1);
 const title=agricultureLayerTitle(layer.id);
 return `<svg class="latin-map latin-agriculture-map" data-latin-map data-latin-agriculture-map data-map-layer="${layer.id}" data-agriculture-frame="${frame.join(' ')}" viewBox="0 0 ${latinWidth} ${latinHeight}" role="group" aria-labelledby="${safePrefix}-title ${safePrefix}-description" width="${latinWidth}" height="${latinHeight}"><title id="${safePrefix}-title">${escape(title)}（2020年）</title><desc id="${safePrefix}-description">約9kmの格子に推計された${layer.id==='cattle'?'牛の密度':'年間収穫面積'}。国を選ぶと値と因果説明を読めます。数値一覧でも確認できます。</desc><defs>${place?`<clipPath id="${clipId}"><path d="${place.path}"/></clipPath>`:''}</defs><rect x="0" y="0" width="${latinWidth}" height="${latinHeight}" fill="#e8f0f3"/><g transform="${transform}" data-agriculture-geography>${paths}<g data-agriculture-original-distribution>${distribution}</g><g>${outlines}</g></g></svg>`;
}
export function nationalAgricultureLabel(id:string):string {
 return id==='cattle'?'飼養頭数（2024年）':id==='coff'?'コーヒー生豆・全品種（2024年）':`${agricultureLayer(id).label}生産量（2024年）`;
}
export function faoFlagLabel(flag:string|null):string {
 return ({A:'公式値',E:'推計値',I:'受領機関による補完値',X:'外部機関の値',M:'原表欠測'} as Record<string,string>)[flag??'']??'注記なし';
}
