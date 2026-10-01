import data from '../data/atlas/latin-america/industry.json';
import {latinCountries,latinMapLayout,latinWidth,latinHeight} from './atlas-latin-america-geometry';

export type LatinIndustryLayer='ores'|'manufactures'|'canal';
export type LatinIndustryStatus='value'|'zero'|'missing'|'notCovered';
export interface LatinIndustryMapState {layer:string;place:string;scope:string;only:boolean}
export const latinIndustryData=data;
export const latinIndustryLayers=[
 {id:'ores',name:'鉱石・金属の輸出比率',year:2024,unit:'商品輸出額に占める割合（%）'},
 {id:'manufactures',name:'製造品の輸出比率',year:2024,unit:'商品輸出額に占める割合（%）'},
 {id:'canal',name:'パナマ運河と淡水・物流',year:2024,unit:'2024会計年度・大型外航船の通航回数'},
];
export const latinIndustryBins=[
 {min:0,max:5,label:'0–5%未満',color:'#f4eed4'},
 {min:5,max:20,label:'5–20%未満',color:'#e9d391'},
 {min:20,max:40,label:'20–40%未満',color:'#d9aa56'},
 {min:40,max:60,label:'40–60%未満',color:'#b97a35'},
 {min:60,max:80,label:'60–80%未満',color:'#865326'},
 {min:80,max:101,label:'80–100%',color:'#543719'},
];
export const industryMissingColor='#cbd4d6';
export const industryNotCoveredColor='#eceff0';
export function latinIndustryColor(value:number|null,status:string='value'){
 if(status==='notCovered')return industryNotCoveredColor;
 if(value===null||status==='missing')return industryMissingColor;
 return latinIndustryBins.find(b=>value>=b.min&&value<b.max)?.color??industryMissingColor;
}
export function formatLatinIndustryValue(value:number|null,status:string='value'){
 if(status==='notCovered')return '対象統計なし';
 if(value===null||status==='missing')return '欠測（理由記載なし）';
 if(value===0)return '0%';
 if(value<0.05)return '0.05%未満';
 return `${value.toLocaleString('ja-JP',{maximumFractionDigits:1,minimumFractionDigits:1})}%`;
}
export function industryCountryRow(code:string){return data.rows.find(r=>r.country===code);}
export function industryCountryName(code:string){return latinCountries.find(c=>c.code===code)?.name??(code==='all'?'中南米全体':code);}
export const escapeIndustryHtml=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const esc=escapeIndustryHtml;
const metricId=(id:string):'ores'|'manufactures'=>id==='manufactures'?'manufactures':'ores';
export function renderLatinIndustryMap(state:LatinIndustryMapState,idPrefix='latin-industry'){
 if(state.layer==='canal')return renderLatinCanalDiagram(idPrefix);
 const layer=metricId(state.layer),metric=data.metrics.find(m=>m.id===layer)!;
 const {k,tx,ty,transform}=latinMapLayout(state.scope,state.place);
 const point=(c:typeof latinCountries[number])=>{const p=c.label;return [p[0]*k+tx,p[1]*k+ty];};
 const context=latinCountries.map(c=>`<path d="${c.path}" fill="#f4f4ed" stroke="#819594" stroke-width=".9" vector-effect="non-scaling-stroke"/>`).join('');
 const foreground=latinCountries.filter(c=>!state.only||state.place==='all'||c.code===state.place).map(c=>{
  const record=industryCountryRow(c.code)?.values[layer];
  const status=record?.status??'notCovered',value=record?.value??null;
  const selected=c.code===state.place,p=point(c),visible=p[0]>=0&&p[0]<=latinWidth&&p[1]>=0&&p[1]<=latinHeight;
  return `<path d="${c.path}" fill="${latinIndustryColor(value,status)}" stroke="${selected?'#193c3f':'#718886'}" stroke-width="${selected?'2.4':'.7'}" vector-effect="non-scaling-stroke" data-industry-country="${esc(c.code)}" data-value="${value??''}" data-status="${status}" tabindex="${visible?'0':'-1'}" role="button" aria-label="${esc(c.name)}：${esc(metric.name)} ${esc(formatLatinIndustryValue(value,status))}" aria-pressed="${selected}"><title>${esc(c.name)} · ${esc(metric.name)} ${esc(formatLatinIndustryValue(value,status))}（2024年）</title></path>`;
 }).join('');
 const labels=(state.place==='all'?['BRA','ARG','CHL','PER','GTM','CUB','DOM']:[state.place]).map(code=>{const c=latinCountries.find(c=>c.code===code);if(!c)return '';const p=point(c);if(p[0]<0||p[0]>900||p[1]<0||p[1]>580)return '';return `<text x="${p[0]}" y="${p[1]-18}" text-anchor="middle" font-size="36" font-family="sans-serif" font-weight="700" fill="#203e40" stroke="#fff" stroke-width="5" paint-order="stroke" pointer-events="none">${esc(code)}</text>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${latinWidth} ${latinHeight}" width="${latinWidth}" height="${latinHeight}" class="latin-industry-map" data-latin-industry-map role="group" aria-labelledby="${esc(idPrefix)}-title"><title id="${esc(idPrefix)}-title">${esc(metric.name)}の輸出比率 · 2024年 · 商品輸出額に占める割合（%）</title><g data-industry-context transform="${transform}" aria-hidden="true">${context}</g><g data-industry-values transform="${transform}">${foreground}</g><g aria-hidden="true">${labels}</g></svg>`;
}
export function renderLatinIndustryLegend(layer:string){
 if(layer==='canal')return '<p class="latin-industry-canal-key">矢印：淡水と物流のつながり。位置・流量・数量の比例図ではありません。</p>';
 return `<div class="latin-industry-key" data-latin-industry-legend aria-label="2024年 商品輸出額に占める割合の凡例">${latinIndustryBins.map(b=>`<span><i style="background:${b.color}"></i>${b.label}</span>`).join('')}<span><i style="background:${industryMissingColor}"></i>欠測</span><span><i class="not-covered" style="background:${industryNotCoveredColor}"></i>対象統計なし</span></div>`;
}
export function renderLatinCanalDiagram(idPrefix='latin-canal'){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" class="latin-industry-canal" role="img" aria-labelledby="${esc(idPrefix)}-title"><title id="${esc(idPrefix)}-title">パナマ運河：流域の雨・貯水と閘門を使う物流、2024会計年度</title><defs><marker id="${esc(idPrefix)}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#39787d"/></marker></defs><g font-family="sans-serif" fill="#213f42" text-anchor="middle"><rect x="30" y="34" width="200" height="75" rx="10" fill="#e6f1ed" stroke="#39787d"/><text x="130" y="65" font-size="28">流域に降る雨</text><text x="130" y="92" font-size="25">淡水が集まる</text><rect x="265" y="34" width="200" height="75" rx="10" fill="#d4e7e6" stroke="#39787d"/><text x="365" y="65" font-size="28">ガトゥン湖など</text><text x="365" y="92" font-size="25">閘門・生活用水へ</text><rect x="500" y="34" width="170" height="75" rx="10" fill="#e6f1ed" stroke="#39787d"/><text x="585" y="65" font-size="28">船の通航</text><text x="585" y="92" font-size="25">大洋を結ぶ</text><path d="M232 72H258 M467 72H493" stroke="#39787d" stroke-width="3" fill="none" marker-end="url(#${esc(idPrefix)}-arrow)"/><rect x="78" y="165" width="542" height="185" rx="12" fill="#fbf2da" stroke="#b58b43"/><text x="349" y="196" font-size="28">2023–2024年：干ばつ</text><text x="349" y="230" font-size="28">節水・通航調整</text><text x="349" y="279" font-size="42" font-weight="700">9,944回</text><text x="349" y="310" font-size="25">大型外航船の通航 · 前年比21%減</text><text x="349" y="340" font-size="25">2024会計年度（2023年10月–2024年9月）</text><path d="M365 114V154" stroke="#b58b43" stroke-width="3" fill="none" marker-end="url(#${esc(idPrefix)}-arrow)"/></g></svg>`;
}
export const latinIndustryReadings=[
 {id:'andes',name:'アンデスの鉱業',place:'CHL',scope:'south',layer:'ores',title:'鉱床から世界の金属需要へ',takeaway:'アンデスの銅鉱床がチリ・ペルーの鉱業を支え、鉱山・加工・輸送の施設が輸出をつなぎます。チリの2024年の銅輸出は中国向けが約52%。海外の需要と価格が収入を左右します。',comparison:'チリ・ペルーでは鉱石・金属の比率が高く、製造品の比率との差を読めます。精製銅も鉱石・金属側に含む分類なので、加工が行われていないという意味にはなりません。',sources:[{name:'USGS：アンデスの銅鉱床',url:'https://www.usgs.gov/data/porphyry-copper-deposits-and-prospects-andes-mountains-south-america'},{name:'USGS：チリ鉱業2024（鉱業と銅の輸出先）',url:'https://www.usgs.gov/centers/national-minerals-information-center/chile'}]},
 {id:'central',name:'中米の製造業',place:'CRI',scope:'central',layer:'manufactures',title:'人材・制度・市場が製造業を支える',takeaway:'コスタリカでは医療機器などの工場が自由貿易区に集まります。人材育成と投資を支える制度が輸出製造業につながり、米国が主要な取引相手となっています。熱帯の作物輸出と製造品輸出が同じ国に並びます。',comparison:'コスタリカの製造品と鉱石・金属を同じ分母で比較すると、鉱物資源の輸出より加工品の輸出に重心があることを読めます。',sources:[{name:'INEC：コスタリカ2024年貿易・確報',url:'https://admin.inec.cr/en/node/56908'},{name:'PROCOMER：自由貿易区の人材育成',url:'https://procomer.com/procomer-abrio-la-convocatoria-para-la-ii-edicion-del-incentivo-para-el-desarrollo-de-talento-en-empresas/'}]},
 {id:'caribbean',name:'カリブの製造業',place:'DOM',scope:'central',layer:'manufactures',title:'島の製造業も供給網につながる',takeaway:'ドミニカ共和国の自由貿易区では医療機器・電子部品などを製造します。海を越えて部材を調達し、加工品を市場へ送るため、港・航空・供給網との接続が産業を支えます。観光に加えて製造業の役割も読めます。',comparison:'ドミニカ共和国の製造品比率を鉱石・金属と比べ、カリブの産業を観光だけで捉えず、商品輸出の構成から製造業の役割を確かめます。',sources:[{name:'ドミニカ共和国政府：医療機器・電子部品の供給網（2024）',url:'https://presidencia.gob.do/noticias/consejo-nacional-de-zonas-francas-de-exportacion-realiza-exitosa-ronda-de-negocios-con'}]},
 {id:'brazil',name:'ブラジルの加工業',place:'BRA',scope:'south',layer:'manufactures',title:'原料の産地と工業・市場をつなぐ',takeaway:'ブラジルでは鉱山・農林業の産地と、人口・市場が集まる南東部の工業が交通網でつながります。IBGEの2023年工業調査では、全国の工業変換価値の60.9%が南東部に集中します。',comparison:'国の製造品輸出比率と南東部の国内工業集積は粒度も分母も異なります。輸出の構成と国内の立地を分けて読むことで、資源産地・加工地・消費市場の関係を考えられます。',sources:[{name:'IBGE：年次工業調査2023（2025公表）',url:'https://agenciadenoticias.ibge.gov.br/en/agencia-news/2184-news-agency/news/43813-employment-in-industry-grows-for-the-fourth-consecutive-year-in-2023-but-drops-3-1-in-ten-years'}]},
 {id:'panama',name:'パナマの物流',place:'PAN',scope:'central',layer:'canal',title:'地峡の物流を淡水が支える',takeaway:'太平洋と大西洋を結ぶパナマ運河は、湖の淡水を使う閘門で船を通します。2023–2024年の干ばつは貯水を減らし、節水のため通航を調整しました。流域の雨は世界の物流と生活用水につながります。',comparison:'元の気候分布と、雨→貯水→閘門→通航の仕組みを並べます。気候区分は長期の環境条件、通航回数は2024会計年度の活動で、地図の一点から水収支を計算していません。',sources:[{name:'パナマ運河庁：2024会計年度運営結果',url:'https://pancanal.com/en/the-canals-fy-2024-financial-results-reaffirm-its-focus-on-sustainability-and-vision-for-the-future/'}]},
];
export function industryReadingForPlace(place:string,layer:string){
 if(layer==='canal'||place==='PAN')return latinIndustryReadings.find(r=>r.id==='panama')!;
 if(place==='DOM'||['BHS','BRB','CUB','JAM','HTI','TTO','ATG','DMA','GRD','KNA','LCA','VCT','PRI'].includes(place))return latinIndustryReadings.find(r=>r.id==='caribbean')!;
 if(['CRI','BLZ','GTM','HND','SLV','NIC'].includes(place))return latinIndustryReadings.find(r=>r.id==='central')!;
 if(place==='BRA')return latinIndustryReadings.find(r=>r.id==='brazil')!;
 return latinIndustryReadings[0];
}
