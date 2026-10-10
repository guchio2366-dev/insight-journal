import data from '../data/atlas/latin-america/agriculture.json';
import {latinCountries34, latinWidth, latinHeight, projectLatin, latinMapLayout} from './atlas-latin-america-geometry';
import {withBase} from './urls';
import {latinAgricultureReading, type LatinAgricultureLayer} from '../data/atlas/latin-america/agriculture-reading';
import products from '../data/atlas/latin-america-products.json';
import overview from '../../public/assets/atlas/latin-america-overview-v1/manifest.json';
import cropManifest from '../../public/assets/atlas/latin-america-agriculture-v1/manifest.json';
import readingOverview from '../../public/assets/atlas/latin-reading-products-v1/manifest.json';
import {latinReadingProducts} from '../data/atlas/latin-america/reading-products';
import worldProduction from '../data/atlas/latin-america/world-production-2024.json';

export {latinAgricultureReading};
export type {LatinAgricultureLayer};
export const latinAgricultureLayers = data.layers;
/** Comparable 2020 harvested-area estimates for the 12 crops already drawn on the overview map. */
export const latinCropAreaRanking = products.filter(product=>product.kind==='crop').map(product=>{
 const layer=cropManifest.layers.find(candidate=>candidate.id===product.id);
 if(!layer||layer.year!==2020||layer.countries.length!==34)throw Error(`Missing comparable MapSPAM crop: ${product.id}`);
 const areaHa=layer.countries.reduce((sum,country)=>sum+(country.value===null?0:Math.round(country.value*100)),0)/100;
 return {id:product.id,name:product.name,color:product.color,areaHa,reportingCountries:layer.countries.filter(country=>country.value!==null).length};
}).sort((a,b)=>b.areaHa-a.areaHa||a.id.localeCompare(b.id));
export const latinCropAreaTotalHa=latinCropAreaRanking.reduce((sum,crop)=>sum+crop.areaHa,0);
/** FAOSTAT 2024 production shares; the 2020 MapSPAM map uses a different measure. */
export const latinWorldProductionShares=worldProduction.items.map(item=>{
 const layer=data.layers.find(candidate=>candidate.id===item.layerId);
 if(!layer)throw Error(`Missing FAOSTAT national production layer: ${item.layerId}`);
 const values=layer.countries.filter(country=>country.national2024.value!==null);
 const regionalT=values.reduce((sum,country)=>sum+country.national2024.value!,0);
 if(regionalT>item.worldT)throw Error(`Reported regional production exceeds World: ${item.layerId}`);
 return {id:item.layerId,name:item.layerId==='coff'?'コーヒー（生豆・全品種）':layer.label,worldT:item.worldT,regionalT,
  reportingCountries:values.length,regionalPercent:regionalT/item.worldT*100,
  brazilT:layer.countries.find(country=>country.code==='BRA')?.national2024.value??null,
  argentinaT:layer.countries.find(country=>country.code==='ARG')?.national2024.value??null};
});
export type LatinAgricultureMapState = {layer:string;place:string;scope:string;only:boolean};
const escape = (v:unknown) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const agricultureLayer = (id:string) => data.layers.find(l=>l.id===id)??data.layers[0];
export const agricultureLayerTitle = (id:string) => id==='all'?'作物と家畜の分布':id==='cattle'?'牛の飼育密度':`${latinReadingProducts.find(p=>p.id===id)?.name??agricultureLayer(id).label}の収穫面積`;
export const latinAgricultureOverviewReading={title:'中南米全体の農畜産',takeaway:'ブラジル内陸の大豆・とうもろこし、南米南部の穀物と牛、中米の熱帯低地のバナナと高地のコーヒー、アンデスのジャガイモが異なる産地をつくります。雨季・標高・土壌に加え、栽培技術と加工・港への輸送が分布を支えます。',compare:'気候と農畜産の広がりを比べる',steps:[['概説：低地・高地・平原','熱帯の低地、高地、ブラジル内陸、パンパでは代表的な作物と牛の飼育が異なります。南米南部にも小麦・牛・果樹の重要な産地があるため、南端を切り落としません。'],['生産から用途・流通へ','収穫面積、家畜密度、国別生産量は異なる量です。品目ごとの解説で加工・用途・市場を読みます。'],['土地・水の管理へ','地域事例から、土壌改良や草地・水の管理と生産のつながりを確かめます。']],examples:Object.values(latinAgricultureReading).flatMap(r=>r.examples),sources:Object.values(latinAgricultureReading).flatMap(r=>r.sources).filter((s,i,a)=>a.findIndex(v=>v.url===s.url)===i)};
export function renderLatinAgricultureOverviewLegend(selected='all'):string {
 const key=latinReadingProducts.map(p=>`<button type="button" data-latin-agriculture-layer="${p.id}" aria-pressed="${selected===p.id}"><i style="background:${p.color}" aria-hidden="true"></i>${escape(p.name)}</button>`).join('');
 return `<div class="latin-agriculture-legend latin-agriculture-overview-legend" data-latin-agriculture-overview-legend><strong>色＝品目 · 2020年の分布推計</strong><div>${key}</div><p>1セルにつき表示スコア最大の1品目。色は数量・面積比率ではありません。選択した品目の全分布を黒白の輪郭で重ね、ほかの品目も残します。無着色は0・表示下限未満・欠測・対象外を含みます。</p></div>`;
}
/** Shared geographic frame, actual product hit image, and complete selected outline. */
export function renderLatinAgricultureWorkspaceMap(state:LatinAgricultureMapState,idPrefix='latin-agriculture-overview'):string {
 const height=740,{frame,transform}=latinMapLayout(state.scope,state.place,height);
 const [left,top]=projectLatin([overview.bounds[0],overview.bounds[3]]),[right,bottom]=projectLatin([overview.bounds[2],overview.bounds[1]]);
 const prefix=idPrefix.replace(/[^a-zA-Z0-9_-]/g,'');
 const image=(directory:string,file:string,extra='')=>`<image href="${withBase('/assets/atlas/'+directory+'/'+file)}" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" preserveAspectRatio="none" style="image-rendering:pixelated" ${extra}/>`;
 const paths=latinCountries34.map(c=>`<path d="${c.path}" fill="#f0ede3" stroke="#7c8b87" stroke-width=".65" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
 // Label anchors come from an actual positive source cell; leaders separate nearby names.
 const labels=readingOverview.labels.map((p,i)=>{const [x,y]=projectLatin(p.coordinate),dx=i%2===0?-44:35,dy=(i%3-1)*27;return `<g data-latin-agriculture-layer="${p.id}" role="button" tabindex="0" aria-label="${escape(p.name)}の概説と解説" aria-pressed="${state.layer===p.id}" class="latin-product-label"><path d="M${x},${y}l${dx},${dy}" fill="none" stroke="#425c55" vector-effect="non-scaling-stroke"/><text x="${x+dx}" y="${y+dy}" text-anchor="${dx<0?'end':'start'}">${escape(p.name)}</text></g>`;}).join('');
 return `<svg class="latin-map latin-agriculture-map" data-latin-map data-latin-agriculture-map data-map-layer="${escape(state.layer)}" data-agriculture-frame="${frame.join(' ')}" viewBox="0 0 900 ${height}" role="group" aria-labelledby="${prefix}-title" width="900" height="${height}"><title id="${prefix}-title">中南米の採用10作物と牛の分布（2020年）</title><rect width="900" height="${height}" fill="#e8f0f3"/><g transform="${transform}" data-agriculture-geography>${paths}<g data-agriculture-original-distribution>${image('latin-reading-products-v1','distribution.png',`data-latin-product-distribution data-hit-image="${withBase('/assets/atlas/latin-reading-products-v1/hit-index.png')}"`)}${state.layer!=='all'?`<g data-agriculture-selected-outline pointer-events="none">${image('latin-america-overview-v1',state.layer+'-outline.png')}</g>`:''}</g>${labels}</g></svg>`;
}
export function formatLatinAgricultureValue(value:number|null|undefined, unit:string, status?:string):string {
 if(value===null||value===undefined)return status==='unavailable'?'原表行なし':status==='unfetched'?'未取得':status==='confidential'?'秘匿':'欠測';
 if(value===0)return `0 ${unit}`;
 if(value<0.01)return `<0.01 ${unit}`;
 return `${new Intl.NumberFormat('ja-JP',{maximumFractionDigits:value<1?2:unit==='頭/km²'?1:0}).format(value)} ${unit}`;
}
export function renderLatinAgricultureLegend(id:string):string {
 if(id==='all')return renderLatinAgricultureOverviewLegend();
 const layer=agricultureLayer(id);const unit=id==='cattle'?'頭/km²':'ha/格子';
 const swatches=layer.breaks.map((v,i)=>`<span><i style="background:${layer.colors[i]}" aria-hidden="true"></i>${v.toLocaleString('ja-JP')}${layer.breaks[i+1]?`–${layer.breaks[i+1].toLocaleString('ja-JP')}未満`:'以上'}</span>`).join('');
 return `<div class="latin-agriculture-legend" data-latin-agriculture-legend="${escape(id)}" aria-label="${escape(layer.label)}の凡例"><strong>${escape(layer.label)}・2020年 ${unit}</strong><div>${swatches}<span><i style="background:#d8dee0" aria-hidden="true"></i>0–1未満（有効値）</span><span><i style="background:#f0ede3" aria-hidden="true"></i>欠測・対象外</span></div></div>`;
}
export function renderLatinAgricultureMap(state:LatinAgricultureMapState, idPrefix='latin-agriculture'):string {
 if(state.layer==='all')return renderLatinAgricultureWorkspaceMap(state,idPrefix);
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
