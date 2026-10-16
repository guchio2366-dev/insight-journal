import {syncAgroStatistics} from './atlas-agro-statistics';
import {renderLatinSoyColumns,renderLatinDestinations,renderLatinForestColumns,type LatinQuantityData} from '../lib/atlas-latin-agro-quantity';
import {withBase} from '../lib/urls';

type Selection={country:string;topic:string;active?:boolean;year?:number};
let pending:Promise<LatinQuantityData>|undefined;
export function loadLatinQuantity(){
 if(!pending)pending=fetch(withBase('/assets/atlas/latin-agro-quantity-v1/data.json')).then(async r=>{
  if(!r.ok)throw Error('中南米の数量資料を取得できません');
  const data=await r.json() as LatinQuantityData;
  if(data.schemaVersion!==1||!Array.isArray(data.records)||!data.forest)throw Error('中南米の数量資料の形式が不正です');
  return data;
 }).catch(error=>{pending=undefined;throw error;});
 return pending;
}

/** Enhance only explicit Latin country/product selections after the shared
 * renderer is ready. Unselected rendering and every other region stay intact. */
const instances=new WeakMap<HTMLElement,{selection:Selection;generation:number;running:boolean;queue:()=>void}>();
export function syncLatinAgroStatistics(root:ParentNode,selection:Selection){
 const host=root.querySelector<HTMLElement>('[data-agro-statistics]');
 if(!host)return;
 let state=instances.get(host);
 if(!state){
  const content=host.querySelector<HTMLElement>('[data-agro-content]')!;
  state={selection,generation:0,running:false,queue:()=>{}};
  const instance=state;
  instance.queue=()=>{
   const chosen=instance.selection,key=`${chosen.country}:${chosen.topic}`;
   if(instance.running||host.hidden||host.dataset.agroReady!=='true'||chosen.topic!=='soyb'||(chosen.year??2024)!==2024||chosen.active===false||content.querySelector('[data-latin-quantity-key]')?.getAttribute('data-latin-quantity-key')===key)return;
   const selected=content.querySelector<HTMLElement>('[data-agro-country]');
   if(selected?.dataset.agroCountry!==chosen.country||selected.dataset.agroSeries!=='soybean-production')return;
   instance.running=true;const generation=instance.generation;
   void loadLatinQuantity().then(data=>{
    if(generation!==instance.generation||host.hidden)return;
    const row=data.records.find(r=>r.countryCode===chosen.country);if(!row)return;
    const marker=document.createElement('div');marker.setAttribute('data-latin-quantity-key',key);
    if(row.countryCode==='BRA'){
     // Its calendar World totals are blank. Keep the existing complete WASDE
     // balance and show only labelled calendar partner quantities beside it.
     const destinations=selected.querySelector<HTMLElement>('[data-agro-stage="destinations"]');
     if(!destinations)return;
     marker.innerHTML=renderLatinDestinations(row,true);destinations.replaceChildren(marker);
    }else{
     const retained=document.createElement('details');retained.className='agro-other-reference';retained.setAttribute('data-latin-retained-statistics','');
     const summary=document.createElement('summary');summary.textContent='保存済みの販売年度・生産推移参考（別定義）';retained.append(summary,...content.childNodes);
     marker.innerHTML=renderLatinSoyColumns(row,data.method);content.replaceChildren(marker,retained);
    }
    const notice=host.querySelector('[data-latin-quantity-error]');notice?.remove();
   }).catch(()=>{
    if(generation!==instance.generation||host.hidden||host.querySelector('[data-latin-quantity-error]'))return;
    const notice=document.createElement('p');notice.setAttribute('data-latin-quantity-error','');notice.setAttribute('role','status');
    notice.textContent='追加の2024暦年数量を取得できませんでした。保存済みの統計を表示しています。';
    const retry=document.createElement('button');retry.type='button';retry.textContent='中南米の数量を再読み込み';retry.addEventListener('click',()=>{notice.remove();instance.queue();});notice.append(retry);content.before(notice);
   }).finally(()=>{instance.running=false;if(generation!==instance.generation)instance.queue();});
  };
  new MutationObserver(instance.queue).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['data-agro-ready','hidden']});
  instances.set(host,instance);
 }
 state.selection={...selection};state.generation++;host.querySelector('[data-latin-quantity-error]')?.remove();
 syncAgroStatistics(root,selection);state.queue();
}

export function initLatinForestryQuantity(root=document.querySelector<HTMLElement>('[data-latin-agriculture-section="forestry"]')){
 const host=root?.querySelector<HTMLElement>('[data-latin-forestry-statistics]');
 if(!root||!host||host.dataset.initialized)return;
 host.dataset.initialized='true';
 const native=root.querySelector<HTMLElement>('[data-agro-statistics]'),controls=host.querySelector<HTMLElement>('[data-latin-forest-controls]')!,content=host.querySelector<HTMLElement>('[data-latin-forest-content]')!,status=host.querySelector<HTMLElement>('[data-latin-forest-status]')!,retry=host.querySelector<HTMLButtonElement>('[data-latin-forest-retry]')!;
 const initialNativeHidden=native?.hidden??false;
 let select:HTMLSelectElement|null=null;
 let example=new URLSearchParams(location.search).get('example')??'',generation=0;
 async function render(){
  const token=++generation,active=example==='chile';
  host!.hidden=!active;if(native)native.hidden=active||initialNativeHidden;
  if(!active){content.replaceChildren();controls.replaceChildren();select=null;return;}
  if(!select){
   controls.innerHTML='<label>林産物<select aria-label="チリの統計品目"><option value="roundwood">丸太：工業投入と直接輸出</option><option value="sawnwood">製材：全樹種</option><option value="pulp">パルプ：全製法</option></select></label>';
   select=controls.querySelector('select')!;select.addEventListener('change',()=>void render());
  }
  const product=select.value;
  content.replaceChildren();host!.dataset.ready='false';retry.hidden=true;status.textContent='チリ全国の数量原表を読み込んでいます…';
  try{
   const data=await loadLatinQuantity();if(token!==generation||host!.hidden)return;
   content.innerHTML=renderLatinForestColumns(data.forest,product);
   status.textContent='2024暦年・チリ全国。地図のチリ中南部の代表位置に限定した量ではありません。';host!.dataset.ready='true';
  }catch{if(token!==generation)return;status.textContent='チリの数量資料を取得できませんでした。地図の選択は保持しています。';retry.hidden=false;}
 }
 retry.addEventListener('click',()=>void render());
 root.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLElement>('[data-forest-example],[data-forest-overview],[data-forest-clear],[data-forest-reset]');if(!button)return;
  example=button.dataset.forestExample??'';void render();
 });
 window.addEventListener('popstate',()=>{example=new URLSearchParams(location.search).get('example')??'';void render();});
 void render();
}
