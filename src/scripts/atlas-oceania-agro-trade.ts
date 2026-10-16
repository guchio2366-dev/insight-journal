import {oceaniaTradeReferences,renderOceaniaTradeReference} from '../lib/atlas-oceania-agro-trade';
import {renderAgroColumns,type AgroData} from '../lib/atlas-agro-statistics';

/** Append scope-labelled references after shared async rendering. Never replace
 * production/use with customs products or alter any unselected overview. */
export function syncOceaniaAgroTrade(root:HTMLElement){
 const host=root.querySelector<HTMLElement>('[data-agro-statistics]');
 if(!host||host.hidden)return;
 const topic=root.querySelector<HTMLSelectElement>('[data-layer]')?.value;
 if(!topic||topic==='farming-all')return;
 const columns=host.querySelector<HTMLElement>('[data-agro-country][data-agro-series]');
 if(!columns)return;
 const tables=oceaniaTradeReferences(columns.dataset.agroCountry!,columns.dataset.agroSeries!);
 const target=columns.querySelector<HTMLElement>('[data-agro-stage="destinations"]');
 if(!target)return;
 for(const table of tables){
  if(target.querySelector(`[data-oceania-trade-id="${table.id}"]`))continue;
  target.insertAdjacentHTML('beforeend',renderOceaniaTradeReference(table));
 }
}
const initialized=new WeakSet<HTMLElement>();
export function initOceaniaAgroTrade(root:HTMLElement){
 if(initialized.has(root)||root.dataset.field!=='agriculture')return;
 initialized.add(root);
 const content=root.querySelector<HTMLElement>('[data-agro-content]');if(!content)return;
 // The observer also catches a shared retry or a supplemental beef/milk switch;
 // a marker check makes our own append idempotent and retains disclosure state.
 new MutationObserver(()=>syncOceaniaAgroTrade(root)).observe(content,{childList:true,subtree:true});
 syncOceaniaAgroTrade(root);
}

/** The Oceania-only route composes the existing forestry page unchanged. Its
 * existing country examples activate quantities below the map; clearing the
 * example restores the original unselected nodes and labels. */
export function initOceaniaForestryTrade(root=document.querySelector<HTMLElement>('[data-regional-forestry][data-region="oceania"]')){
 if(!root||initialized.has(root))return;
 initialized.add(root);
 const host=root.querySelector<HTMLElement>('[data-agro-statistics]');if(!host)return;
 const content=host.querySelector<HTMLElement>('[data-agro-content]')!,heading=host.querySelector<HTMLElement>('[data-agro-heading]')!,status=host.querySelector<HTMLElement>('[data-agro-status]')!,controls=host.querySelector<HTMLElement>('.agro-stat-controls')!,shared=host.querySelector<HTMLElement>('[data-agro-series-control]')!;
 const original={nodes:[...content.childNodes],heading:heading.textContent,status:status.textContent,hidden:shared.hidden};
 const label=document.createElement('label');label.dataset.oceaniaForestProduct='';label.hidden=true;label.textContent='林産物（国別数量参考）';
 const select=document.createElement('select');select.innerHTML='<option value="roundwood-production">丸太</option><option value="sawnwood-production">製材</option><option value="wood-pulp-production">木材パルプ</option>';label.append(select);controls.append(label);
 const countries:Record<string,{code:string;name:string}>={australia:{code:'AUS',name:'オーストラリア'},'new-zealand':{code:'NZL',name:'ニュージーランド'},png:{code:'PNG',name:'パプアニューギニア'}};
 let previous='';
 const render=()=>{
  const selected=root!.querySelector<HTMLElement>('button[data-forest-example][aria-pressed="true"]')?.dataset.forestExample??'';
  const country=countries[selected];
  if(!country){
   if(previous){content.replaceChildren(...original.nodes);heading.textContent=original.heading;status.textContent=original.status;shared.hidden=original.hidden;label.hidden=true;select.value='roundwood-production';}
   previous='';return;
  }
  previous=selected;label.hidden=false;shared.hidden=true;
  heading.textContent='オセアニア · '+country.name+'全国';
  status.textContent='生産・国内利用の同年原表は未収録です。③のHS限定数量参考は、①②と接合しません。';
  const data:AgroData={countries:{[country.code]:{name:country.name,series:[]}},sources:[],method:''};
  content.innerHTML=renderAgroColumns(data,country.code,select.value);
  const target=content.querySelector('[data-agro-stage="destinations"]')!;
  for(const table of oceaniaTradeReferences(country.code,select.value))target.insertAdjacentHTML('beforeend',renderOceaniaTradeReference(table));
 };
 select.addEventListener('change',render);
 // Native controller owns map/URL/reading and updates aria-pressed on restore.
 new MutationObserver(render).observe(root.querySelector('.forest-example-choices')!,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 render();
}
