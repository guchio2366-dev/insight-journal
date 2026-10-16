/** Region-owned adapter. The shared controller remains untouched. It observes
 * its existing settled topic attribute; it never changes map state or nodes. */
export function initSoutheastAgroStatistics(root:HTMLElement){
 if(root.dataset.region!=='southeast-asia'||root.querySelector('[data-southeast-agro-statistics]'))return;
 const layout=root.querySelector<HTMLElement>('.asia-layout');if(!layout)return;
 const host=document.createElement('section');host.className='agro-statistics southeast-agro-statistics';host.dataset.southeastAgroStatistics='';host.hidden=true;host.setAttribute('aria-label','東南アジアの選択品目別生産・利用・輸出先');layout.append(host);
 let generation=0,lastTopic='',lastMapCountry='',country='',series='',ready=false;
 let modulePromise:ReturnType<typeof importModule>|undefined;
 const importModule=()=>import('../lib/atlas-southeast-agro-statistics.ts');
 async function render(){
  const topic=root.dataset.southeastFarmTopic??'',active=Boolean(topic&&topic!=='overview');
  host.hidden=!active;root.toggleAttribute('data-southeast-selected-statistics',active);
  const token=++generation;if(!active){lastTopic='';ready=false;return;}
  const mapCountry=root.querySelector<HTMLSelectElement>('[data-country-select]')?.value??'';
  if(mapCountry!==lastMapCountry){country=mapCountry;lastMapCountry=mapCountry;ready=false;}
  if(topic!==lastTopic){series='';lastTopic=topic;ready=false;}
  if(ready)return;
  const focused=host.contains(document.activeElement)?document.activeElement:null;
  const focusSelector=focused?.matches('[data-southeast-agro-country]')?'[data-southeast-agro-country]':focused?.matches('[data-southeast-agro-series]')?'[data-southeast-agro-series]':null;
  host.dataset.ready='false';
  host.setAttribute('aria-busy','true');
  try{
   modulePromise??=importModule();const api=await modulePromise;
   if(token!==generation||host.hidden)return;
   const ids=api.southeastAgroSeries(topic);if(!ids.includes(series))series=ids[0]??'';
   const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
   host.innerHTML=`<h2>選択品目の生産・利用・輸出先</h2><div class="agro-stat-controls"><label>統計対象<select data-southeast-agro-country><option value="">地理的な東南アジア11か国</option>${api.southeastAgroData.countryCodes.map(c=>`<option value="${c}"${c===country?' selected':''}>${escape(api.southeastAgroData.countries[c as keyof typeof api.southeastAgroData.countries].name)}（国別）</option>`).join('')}</select></label>${ids.length>1?`<label>生産品目<select data-southeast-agro-series>${ids.map(id=>`<option value="${escape(id)}"${id===series?' selected':''}>${escape(api.southeastAgroLabel(id))}</option>`).join('')}</select></label>`:''}</div><p class="agro-meta">統計の対象だけを切り替えます。地図は選択した品目の分布です。年・単位・加工段階を各列に表示します。</p><div data-southeast-agro-content>${api.renderSoutheastAgroColumns(series,country)}</div>`;
   for(const details of host.querySelectorAll<HTMLDetailsElement>('.agro-other-reference'))details.hidden=![...details.children].some(child=>child.tagName!=='SUMMARY'&&Boolean(child.textContent?.trim()));
   if(focusSelector)host.querySelector<HTMLElement>(focusSelector)?.focus({preventScroll:true});
   host.dataset.ready='true';ready=true;
  }catch{if(token===generation){modulePromise=undefined;host.innerHTML='<p>統計を読み込めませんでした。</p><button type="button" data-southeast-agro-retry>統計を再読み込み</button>';}}
  finally{if(token===generation)host.removeAttribute('aria-busy');}
 }
 host.addEventListener('change',event=>{const select=event.target as HTMLSelectElement;if(select.matches('[data-southeast-agro-country]'))country=select.value;else if(select.matches('[data-southeast-agro-series]'))series=select.value;else return;ready=false;void render();});
 host.addEventListener('click',event=>{if((event.target as Element).closest('[data-southeast-agro-retry]')){ready=false;void render();}});
 new MutationObserver(()=>void render()).observe(root,{attributes:true,attributeFilter:['data-southeast-farm-topic']});
 void render();
}
