import {renderEuropeSelectedQuantityFlow} from '../lib/atlas-europe-selected-quantity-flow.ts';
import type {EuropeSelectedQuantityFlow} from '../data/atlas/europe/selected-quantity-flow.ts';

type Selection={active:boolean;country:string;topic:string;year?:number};
const calendarCountries=['UKR','FRA','ITA','DEU'];
/** Pure selector: an explicit incompatible year keeps the existing FAO view. */
export function supportsEuropeSelectedQuantityFlow(selection:Selection){
  if(!selection.active)return false;
  if(selection.topic==='soybean'&&calendarCountries.includes(selection.country))return selection.year===undefined||selection.year===2023;
  if((selection.topic==='wheat'&&['UKR','GBR'].includes(selection.country))||(selection.topic==='maize'&&selection.country==='UKR'))return selection.year===undefined;
  return false;
}

/** Keep existing charts, listeners and late responses reachable as references.
 * Restoring an overview puts the very same nodes back at their original place. */
export function createEuropeQuantityReferences(root:HTMLElement){
  const details=root.querySelector<HTMLDetailsElement>('[data-eu-previous-quantity]');
  const content=root.querySelector<HTMLElement>('[data-eu-previous-quantity-content]');
  const saved=new Map<HTMLElement,Comment>();
  return (selected:boolean)=>{
    if(!details||!content)return;
    details.hidden=!selected;
    if(selected){
      for(const node of root.querySelectorAll<HTMLElement>('[data-eu-farm-numbers],[data-agro-statistics],[data-eu-farm-quick-summary]')){
        if(saved.has(node))continue;
        const anchor=root.ownerDocument.createComment('European national statistics reference');
        node.before(anchor);saved.set(node,anchor);content.append(node);
      }
    }else{
      for(const [node,anchor] of saved){anchor.before(node);anchor.remove();}
      saved.clear();details.open=false;
    }
  };
}

export function createEuropeSelectedQuantityStatistics(root:HTMLElement){
  const host=root.querySelector<HTMLElement>('[data-eu-selected-quantity]');
  type Packet={schemaVersion:number;records:EuropeSelectedQuantityFlow[]};
  let generation=0,last='',loading:Promise<Packet>|undefined;
  const load=()=>loading??=fetch(host!.dataset.statisticsUrl!).then(async response=>{
    if(!response.ok)throw Error('Europe quantity data unavailable');
    const packet=await response.json() as Packet;
    if(packet.schemaVersion!==1||!Array.isArray(packet.records)||packet.records.some(row=>!row.countryCode||!row.topic||!['calendar-quantity-comparison','marketing-year-balance'].includes(row.kind)||['production','worldProduction','imports','exports'].some(key=>{const value=(row as unknown as Record<string,unknown>)[key];return typeof value!=='number'||!Number.isFinite(value)||value<0;})))throw Error('Invalid Europe quantity data');
    return packet;
  }).catch(error=>{loading=undefined;throw error;});
  let current:Selection|undefined;
  const retry=host?.querySelector<HTMLButtonElement>('[data-eu-quantity-retry]');
  retry?.addEventListener('click',()=>{last='';if(current)void update(current);});
  async function update(selection:Selection){
    current={...selection};if(!host)return;
    const active=supportsEuropeSelectedQuantityFlow(selection),key=JSON.stringify(selection);
    if(key===last)return;last=key;const token=++generation;
    host.hidden=!active;
    const content=host.querySelector<HTMLElement>('[data-eu-quantity-content]')!,status=host.querySelector<HTMLElement>('[data-eu-quantity-status]')!;
    content.replaceChildren();host.dataset.ready='false';retry!.hidden=true;
    if(!active)return;
    status.textContent='同じ期間・品目の全国数量を読み込んでいます…';
    try{
      const data=await load();
      if(token!==generation||host.hidden)return;
      const flow=data.records.find(row=>row.countryCode===selection.country&&row.topic===selection.topic);
      if(!flow)throw Error('Europe quantity reference missing');
      content.innerHTML=renderEuropeSelectedQuantityFlow(flow);
      status.textContent=flow.kind==='calendar-quantity-comparison'?'2023暦年の数量比較。在庫・実用途は未収録です。':'2024/25販売年度の需給。全輸出相手の数量は未収録です。';
      host.dataset.ready='true';
    }catch{
      if(token!==generation)return;
      status.textContent='全国数量を取得できませんでした。地図の選択は保持しています。';retry!.hidden=false;
    }
  }
  return {update};
}
