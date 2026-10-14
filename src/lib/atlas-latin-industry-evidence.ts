import raw from '../data/atlas/latin-america/industry-sectors.json';

export type LatinIndustryMetric = {
 id:string; industry:string; role:'regional'|'world'|'supply'; label:string;
 value:number|null; unit:string; period:string; geography:string; geographicLevel:string;
 productStage:string; denominator:string|null; sources:string[]; display:string;
 status:'reported'|'calculated'|'estimate'|'forecast'|'missing'|'qualified'; note:string;
 mapText?:string; mapCountries?:string[]; mapRegionIds?:string[];
 mapSectors?:string[];
 calculation?:{operation?:'multiply';numerator?:number;denominator?:number;a?:number;b?:number;unit:string};
};

/** Preserve product, stage, geography and denominator before a number reaches the map. */
export function parseLatinIndustryMetrics(input:unknown):LatinIndustryMetric[]{
 if(!Array.isArray(input))throw new Error('Expected Latin industry evidence');
 const seen=new Set<string>(),sources=new Set(raw.sources.map(s=>s.id)),industries=new Set(raw.industries.map(i=>i.id));
 const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
 for(const candidate of input){
  const m=candidate as LatinIndustryMetric;
  if(!m||!['id','industry','label','unit','period','geography','geographicLevel','productStage','display'].every(k=>nonempty(m[k as keyof LatinIndustryMetric]))
   ||seen.has(m.id)||!industries.has(m.industry)||!['regional','world','supply'].includes(m.role)
   ||!['reported','calculated','estimate','forecast','missing','qualified'].includes(m.status)
   ||!Array.isArray(m.sources)||!m.sources.length||m.sources.some(s=>!sources.has(s))
   ||(m.status==='missing'?m.value!==null:typeof m.value!=='number'||!Number.isFinite(m.value)||m.value<0)
   ||(m.value!==null&&m.unit.includes('％')&&(m.value>100||!nonempty(m.denominator)))
   ||(m.mapText&&m.geographicLevel==='admin1'&&!m.mapRegionIds?.length)){
   throw new Error('Invalid Latin industry metric: '+m?.id);
  }
  if(m.calculation){
   const c=m.calculation,computed=c.operation==='multiply'?c.a!*c.b!:c.numerator!/c.denominator!*100;
   if(!nonempty(c.unit)||!Number.isFinite(computed)||m.value===null||Math.abs(computed-m.value)>.051)
    throw new Error('Mismatched Latin industry calculation: '+m.id);
  }
  seen.add(m.id);
 }
 return input as LatinIndustryMetric[];
}

export const latinIndustryMetrics=parseLatinIndustryMetrics(raw.statistics);
export const escapeLatinIndustryText=(input:unknown)=>String(input??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function latinIndustryMapAnnotation(industry:string,sites:{country:string;regionIds?:string[]}[],sector:string):string|null{
 const regions=new Set(sites.flatMap(s=>s.regionIds??[])),countries=new Set(sites.map(s=>s.country));
 const eligible=(m:LatinIndustryMetric)=>m.industry===industry&&m.mapText&&(!m.mapSectors||m.mapSectors.includes(sector));
 const regional=latinIndustryMetrics.find(m=>eligible(m)&&m.geographicLevel==='admin1'&&m.mapRegionIds?.some(r=>regions.has(r)));
 if(regional)return regional.mapText!;
 if(sector==='manufacturing')return null;
 return latinIndustryMetrics.find(m=>eligible(m)&&m.mapCountries?.length&&m.mapCountries.every(c=>countries.has(c)))?.mapText??null;
}

export function statisticsForIndustrySelection(sector:string,industry:string|null){
 const ids=new Set(raw.industries.filter(i=>i.sectors.includes(sector)&&(!industry||i.id===industry)).map(i=>i.id));
 return latinIndustryMetrics.filter(m=>ids.has(m.industry));
}

export function renderLatinIndustryStatistics(sector:string,industry:string|null){
 const esc=escapeLatinIndustryText,metrics=statisticsForIndustrySelection(sector,industry);
 const roles=[['regional','地域の規模・集積','国・州・港の集合、企業の対象範囲を各行に明記。'],
  ['world','世界での位置・供給集中','世界生産、輸出金額、人口当たり等は別の比較。'],
  ['supply','取引・工程・定義','販売先、加工段階、能力・実績と指標の違い。']] as const;
 const status={reported:'公表値',calculated:'公表値から計算',estimate:'推計',forecast:'予測',missing:'未取得・未照合',qualified:'範囲・条件付き'};
 return roles.map(([role,title,reading])=>{
  let selected=metrics.filter(m=>m.role===role);
  if(!industry){const seen=new Set<string>();selected=selected.filter(m=>{if(seen.has(m.industry))return false;seen.add(m.industry);return true;});}
  const items=selected.map(m=>{
   const item=raw.industries.find(i=>i.id===m.industry)!;
   const references=m.sources.map(id=>raw.sources.find(s=>s.id===id)!).map(s=>`<a href="${esc(s.url)}">${esc(s.title)}（${esc(s.period)}）</a>`).join('');
   return `<div data-lis-metric="${esc(m.id)}" data-status="${m.status}" data-unit="${esc(m.unit)}" data-geography="${esc(m.geography)}"><dt>${industry?'':`<span class="latin-sector-metric-industry">${esc(item.label)}</span>`}${esc(m.label)}<small>${esc(m.geography)} · ${esc(m.period)}</small></dt><dd><strong>${esc(m.display)}</strong><p>${esc(m.productStage)}${m.denominator?`。分母：${esc(m.denominator)}`:''}。</p>${m.note?`<p>${esc(m.note)}</p>`:''}<details><summary>${esc(status[m.status])}・出典と定義</summary><p>原単位：${esc(m.unit)}。${m.status==='missing'?'未取得はゼロではありません。':''}</p>${references}</details></dd></div>`;
  }).join('');
  const missing=!selected.length?`<p class="latin-sector-evidence-gap">${role==='supply'?'この対象には同じ定義で比較できる取引指標を追加していません。':'同じ品目・工程・範囲で比較できる数量は未取得です。ゼロではありません。'}</p>`:'';
  return `<article class="latin-sector-stat-card" data-lis-stat-card="${role}"><h3>${title}</h3><p>${reading}</p><dl>${items}</dl>${missing}</article>`;
 }).join('');
}
