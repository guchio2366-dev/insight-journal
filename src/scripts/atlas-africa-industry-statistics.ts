import {africaIndustryMetricsFor,type ResearchMetric} from '../data/atlas/africa-industry-research.ts';
import {africaSectorIndustries,type AfricaIndustrySector} from '../data/atlas/africa-industry-sectors.ts';
const titles={scale:'地域経済での規模',world:'世界での位置',chain:'加工・供給網'} as const;
function el<K extends keyof HTMLElementTagNameMap>(tag:K,value=''){const node=document.createElement(tag);node.textContent=value;return node;}
function metric(row:ResearchMetric){
 const card=el('article');card.className='africa-industry-stat-card';card.dataset.industryMetric=row.industry;card.dataset.metricGroup=row.group;
 card.append(el('h3',row.label));const number=el('p',row.value===null?'未確認':`${row.value.toLocaleString('ja-JP',{maximumFractionDigits:4})} ${row.unit}`);number.className='africa-industry-stat-value';card.append(number);
 card.append(el('p',`${row.period} · ${row.geography}`));card.append(el('p',row.definition));
 const source=el('a','一次資料を見る');source.href=row.source;source.rel='noopener noreferrer';source.target='_blank';card.append(source);
 if(row.quality==='estimated'||row.quality==='derived'||row.quality==='unverified')card.append(el('small',row.quality==='estimated'?'推計':row.quality==='derived'?'公表値から算出':'数値未確認'));
 return card;
}
export function renderAfricaIndustryStatistics(root:HTMLElement,sector:AfricaIndustrySector,selectedId:string){
 const host=root.querySelector<HTMLElement>('[data-africa-industry-statistics]')!;host.hidden=false;host.replaceChildren();
 const heading=el('div');heading.className='africa-industry-stat-heading';heading.append(el('p','Research · 出典と集計範囲'),el('h2',selectedId?`${africaSectorIndustries.find(row=>row.id===selectedId)?.label??''}の統計`:`${sector==='resources'?'資源・エネルギー':sector==='manufacturing'?'製造業':'サービス業'}の統計`));
 heading.append(el('p','数値は国・地域の公表範囲です。地点の数量ではありません。年、分母、製品段階が異なる値を合算せず、未確認を0と区別します。'));host.append(heading);
 const definitions=africaSectorIndustries.filter(row=>row.sector===sector&&(selectedId?row.id===selectedId:true));
 if(selectedId){const groups=el('div');groups.className='africa-industry-stat-grid';for(const group of ['scale','world','chain'] as const){const column=el('section');column.className='africa-industry-stat-column';column.append(el('h3',titles[group]));const rows=africaIndustryMetricsFor(selectedId).filter(row=>row.group===group);if(rows.length)for(const row of rows)column.append(metric(row));else column.append(el('p','品目と分母を合わせた統計は未確認です。'));groups.append(column);}host.append(groups);return;}
 const list=el('div');list.className='africa-industry-stat-overview';for(const definition of definitions){const item=el('article');item.dataset.industryOverview=definition.id;item.append(el('h3',definition.label));const first=africaIndustryMetricsFor(definition.id).find(row=>row.value!==null)??africaIndustryMetricsFor(definition.id)[0];if(first)item.append(metric(first));list.append(item);}host.append(list);
}
