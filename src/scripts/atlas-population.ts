import {populationViews,ethnicities,metros,populationClasses,densityColors,shareColors,voteColors,missingColor} from '../data/atlas/population';
import {readPopulationState,writePopulationState} from '../lib/atlas-population-state';
import {populationColor,density,type County} from '../lib/atlas-population-data';
import {createPopulationLoader} from '../lib/atlas-population-loader';
import {populationCityProfiles,populationOverviews,settlementStories} from '../data/atlas/population-reading';
import {populationCityReligionProfiles,religionStories,religionStoryIds} from '../data/atlas/population-religion-reading';
import {renderPopulationComposition,type PopulationSlice} from '../lib/atlas-population-chart';
import {createNatureLabels} from './atlas-nature-labels';
import {populationFallbackExtent,populationFallbackBox,projectPopulationFallback} from '../lib/atlas-population-projection';
export function createPopulationController(root:HTMLElement,base:string,options:{cities:{id:string;nameJa:string;longitude:number;latitude:number}[];active:()=>boolean;map:()=>any;changed:(push?:boolean)=>void;fit:(bounds:any)=>void}){
 const el=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const loader=createPopulationLoader(base);let state=readPopulationState(new URL(location.href)),generation=0,appliedMap:any,countyData:any,data:any,rows:County[]=[],values=new Map<string,any>(),datasetKey='',loadedGeometry:any,dataFailed=false;
 const fmt=(n:number|null|undefined,digits=0)=>n==null?'未取得・非公表':n.toLocaleString('ja-JP',{maximumFractionDigits:digits});
 function release(){if(appliedMap&&appliedMap===options.map()){for(const id of ['population-selected','population-city-outlines','population-outlines','population-lines','population-fill'])if(appliedMap.getLayer(id))appliedMap.removeLayer(id);for(const id of ['population-outlines','population'])if(appliedMap.getSource(id))appliedMap.removeSource(id);}appliedMap=undefined;loadedGeometry=undefined;}
 function value(row:County):number|null{
  if(state.view==='distribution')return density(row);
  if(state.view==='ethnicity'){const n=values.get(row.id)?.counts?.[ethnicities.findIndex(x=>x[0]===state.ethnicity)]?.[0];return n!=null&&row.population[0]?n/row.population[0]*100:null;}
  if(state.view==='vote'){const v=values.get(row.id);return v?.total>0?(v.r-v.d)/v.total*100:null;}
  return null;
 }
 const cities=new Map(options.cities.map(city=>[city.id,city]));
 const fallbackExtent=()=>populationFallbackExtent(state.view==='distribution'&&state.metro!=='national'?data?.bounds:undefined,state.view==='religion' ? .1 : 0);
 const cityLabels=createNatureLabels(root,options.cities.map(city=>({id:city.id,name:city.nameJa,coordinate:[city.longitude,city.latitude],mode:'population'})),{
  holder:el('[data-pop-city-markers]'),attribute:'data-pop-city',controls:'population-city-reading',active:options.active,mode:()=>'population',
  project:()=>options.map()&&!dataFailed&&el('[data-fallback]').hidden?coordinate=>options.map().project(coordinate):null,
  fallbackBox:box=>populationFallbackBox(box,fallbackExtent()),fallbackProject:(coordinate,box)=>projectPopulationFallback(coordinate,box,fallbackExtent()),
  select:entry=>chooseCity(entry.id),placed:()=>{},
 });
 const storyLabels=createNatureLabels(root,religionStories.map(story=>({id:story.id,name:story.number,coordinate:story.coordinate,mode:'population'})),{
  holder:el('[data-pop-religion-markers]'),attribute:'data-pop-religion-marker',controls:'population-religion-stories',active:()=>options.active()&&state.view==='religion',mode:()=>'population',
  project:()=>options.map()&&!dataFailed&&el('[data-fallback]').hidden?coordinate=>options.map().project(coordinate):null,
  fallbackBox:box=>populationFallbackBox(box,fallbackExtent()),fallbackProject:(coordinate,box)=>projectPopulationFallback(coordinate,box,fallbackExtent()),
  obstacleSelector:'.population-city-markers .atlas-nature-label:not([hidden])',select:entry=>chooseReligionStory(entry.id,true,true),placed:()=>{},
 });
 for(const story of religionStories)root.querySelector(`[data-pop-religion-marker="${story.id}"]`)?.setAttribute('aria-label',`${story.number} ${story.title}の解説を開く`);
 function cityReading(){
  const city=cities.get(state.city),profile=city&&populationCityProfiles[city.id],religionProfile=city&&populationCityReligionProfiles[city.id],showReligion=state.view==='religion'&&!!religionProfile;
  el('[data-pop-city-title]').textContent=city?city.nameJa:'都市を選んで、仕事と暮らしを読む';
  el('[data-pop-city-location]').textContent=profile?profile.location:state.view==='religion'?'地図の都市名を選ぶと、宗教文化と産業・仕事を表示します。':'地図の都市名を選ぶと、主な産業と働く人の職種を表示します。';
  el('[data-pop-city-reading]').hidden=state.view==='religion'&&!profile;
  el('[data-pop-city-content]').hidden=!profile;el('[data-pop-city-clear]').hidden=!profile;el('[data-pop-city-jump]').hidden=!profile;
  el('[data-pop-city-religion-label]').hidden=!showReligion;el('[data-pop-city-religion]').hidden=!showReligion;el('[data-pop-city-religion-source]').hidden=!showReligion;
  if(profile){el('[data-pop-city-industries]').textContent=profile.industries;el('[data-pop-city-jobs]').textContent=profile.jobs;el<HTMLAnchorElement>('[data-pop-city-source]').href=profile.source;el('[data-pop-city-jump]').textContent=city!.nameJa+'の解説へ';}
  if(showReligion){el('[data-pop-city-religion]').textContent=religionProfile!.text;const source=el<HTMLAnchorElement>('[data-pop-city-religion-source]');source.href=religionProfile!.source;source.textContent=religionProfile!.sourceLabel;}
  const related=el('[data-pop-city-religion-related]');related.replaceChildren();related.hidden=!showReligion||!religionProfile!.stories.length;
  if(!related.hidden){const label=document.createElement('strong');label.textContent='関連する地域解説';related.append(label);for(const id of religionProfile!.stories){const story=religionStories.find(item=>item.id===id)!;const button=document.createElement('button');button.type='button';button.dataset.popCityReligionStory=id;button.textContent=`${story.number} ${story.title}`;related.append(button);}}
  root.querySelectorAll<HTMLElement>('[data-pop-city]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.popCity===state.city)));cityLabels.sync(state.city);cityLabels.schedule();
 }
 function chooseCity(id:string){
  if(id&&!cities.has(id))return;state.city=id;cityReading();options.changed(true);
  el('[data-atlas-live]').textContent=id?cities.get(id)!.nameJa+'の産業と職種の解説を表示しました。':'都市の選択を解除しました。';
  if(id&&matchMedia('(max-width: 899px), (max-height: 599px)').matches){el('#population-city-reading').focus({preventScroll:true});el('#population-city-reading').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 }
 function syncReligionStory(){
  const selected=state.view==='religion'?state.story:'';
  root.querySelectorAll<HTMLDetailsElement>('[data-pop-religion-story]').forEach(details=>{const active=details.dataset.popReligionStory===selected;details.open=active;details.classList.toggle('is-selected',active);});
  root.querySelectorAll<HTMLButtonElement>('[data-pop-religion-guide]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.popReligionGuide===selected)));storyLabels.sync(selected);storyLabels.schedule();
 }
 function chooseReligionStory(id:string,push=true,move=false){
  if(id&&!religionStoryIds.includes(id as typeof religionStoryIds[number]))return;state.story=id;syncReligionStory();if(push)options.changed(true);
  const story=religionStories.find(item=>item.id===id);el('[data-atlas-live]').textContent=story?`${story.number} ${story.title}の解説を表示しました。`:'地域解説の選択を解除しました。';
  if(story&&move&&matchMedia('(max-width: 899px), (max-height: 599px)').matches){const summary=root.querySelector<HTMLElement>(`[data-pop-religion-story="${id}"] summary`)!;summary.focus({preventScroll:true});summary.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 }
 function overview(){
  const copy=populationOverviews[state.view];el('[data-pop-overview-title]').textContent=copy.title;el('[data-pop-overview]').textContent=copy.text;el('[data-pop-spatial-reading]').textContent=copy.reading;
  el('[data-pop-settlement]').hidden=state.view!=='ethnicity';el('[data-pop-religion-stories]').hidden=state.view!=='religion';cityReading();syncReligionStory();
 }
 function fallback(){cityLabels.schedule();storyLabels.schedule();if(!options.active())return;el<HTMLImageElement>('[data-fallback-livestock]').hidden=true;el('.atlas-fallback-map').setAttribute('aria-label',populationViews.find(x=>x[0]===state.view)![1]+'の代替図。主要都市の名前から解説を選べます。');if(options.map()&&!dataFailed)return;
  const name=state.view==='distribution'&&state.metro!=='national'?`metro-${state.metro}`:state.view==='ethnicity'?`ethnicity-${state.ethnicity}`:state.view==='religion'?'religion':state.view==='vote'?'vote':'density';
  const image=el<HTMLImageElement>('[data-fallback-image]');image.src=base+name+'.webp';image.alt=state.view==='religion'?'米国本土の州境と、宗教文化を読む6つの参照地点。番号は人数や宗教圏の境界を表しません。':`${populationViews.find(x=>x[0]===state.view)?.[1]}の代替図。凡例と都市の解説を見比べられます。`;el<HTMLAnchorElement>('[data-fallback-full]').href=image.src;
 }
 function selected(){
  const row=rows.find(r=>r.id===state.geo);el('[data-pop-selected]').hidden=!row;el('[data-pop-selected-title]').textContent=row?`${row.name} — ${countyData?.states[row.state]??''}`:'地域を選んで比較';
  if(!row){el('[data-pop-selected-value]').textContent='';el('[data-pop-selected-note]').textContent='';if(appliedMap?.getLayer('population-selected'))appliedMap.setFilter('population-selected',['==',['get','id'],'']);return;}
  let text='',note='';const v=value(row);
  if(state.view==='distribution'){text=`人口 ${fmt(row.population[0])} 人 ／ 陸地 ${fmt(row.area,1)} km² ／ 密度 ${fmt(v,1)} 人/km²`;note=row.population[0]===null?'この地域の人口は非公表です。0人ではありません。NYの対象トラクトはCensus ACS errata 148による非公表。':`人口の誤差幅（90%）: ${row.population[1]===null?'数値なし':`±${fmt(row.population[1])} 人`}${row.class?`。NCHS分類：${populationClasses[row.class===1?0:row.class===2?1:row.class<=4?2:3]}`:''}`;}
  if(state.view==='ethnicity'){const index=ethnicities.findIndex(x=>x[0]===state.ethnicity),n=values.get(row.id)?.counts?.[index];text=`${ethnicities[index][1]}：${fmt(v,1)}% ／ ${fmt(n?.[0])} 人`;note=`分母：全住民 ${fmt(row.population[0])} 人。人数の誤差幅（90%）：${n?.[1]==null?'数値なし':`±${fmt(n[1])} 人`}。割合の誤差幅ではありません。`;}
  if(state.view==='vote'){const vrow=values.get(row.id);text=v===null?'この郡の比較可能な選挙結果は未収録です。':`共和党 − 民主党：${v>=0?'+':''}${fmt(v,1)} ポイント`;note=vrow?.total?`共和党 ${fmt(vrow.r)} 票 ／ 民主党 ${fmt(vrow.d)} 票 ／ その他 ${fmt(vrow.other)} 票。分母 ${fmt(vrow.total)} 票（2024年）。`:vrow?.reason??'地理単位が一致しない、または必要な票数が未取得のため色を付けていません。';}
  el('[data-pop-selected-value]').textContent=text;el('[data-pop-selected-note]').textContent=note;
  if(appliedMap===options.map()&&appliedMap?.getLayer('population-selected'))appliedMap.setFilter('population-selected',['==',['get','id'],state.geo]);
 }
 function pick(id:string){state.geo=id;selected();options.changed(true);}
 function composition(items:PopulationSlice[],totalLabel:string,note:string,remainderLabel?:string){
  el('[data-pop-total]').textContent=totalLabel;el('[data-pop-national-note]').textContent=note;
  return renderPopulationComposition(el('[data-pop-chart]'),items,el('[data-pop-national-title]').textContent!,{remainderLabel});
 }
 function national(){
  el('[data-pop-national-title]').textContent=state.view==='distribution'?'全国の人口構成':state.view==='ethnicity'?'全国の人種・民族':state.view==='religion'?'全国の宗教構成':'全国の得票構成';
  const categorical=['#376a85','#ad6657','#ccac53','#579792','#897bac','#96977d','#bb87a1','#767e83'];
  const country=countyData?.national;
  if(state.view==='distribution')composition(populationClasses.map((label,i)=>({label,value:countyData.classification[i]/country*100,color:['#24556b','#609c9f','#adc8b4','#d6c8a2'][i]})),fmt(country)+' 人','50州＋DC ／ ACS 2020–2024');
  if(state.view==='ethnicity')composition(ethnicities.map((x,i)=>({label:['白人','黒人','ヒスパニック','アジア系','先住民','太平洋諸島系','複数人種','その他'][i],value:data.national[i][0]/country*100,color:categorical[i]})),fmt(country)+' 人','全住民 ／ ACS 2020–2024');
  if(state.view==='religion')composition(data.categories.map((item:any,i:number)=>({label:item.label,value:item.value,color:categorical[i]})),'米国成人','Pew 2023–24年調査 ／ 全国（アラスカ・ハワイを含む）',data.remainderLabel);
  if(state.view==='vote'){const n=data.national;composition([{label:'共和党',value:n.r/n.total*100,color:'#a6373e'},{label:'民主党',value:n.d/n.total*100,color:'#275d9f'},{label:'その他',value:n.other/n.total*100,color:'#8f928e'}],fmt(n.total)+' 票','FEC ／ 2024年大統領選・全国確定結果');}
  el('[data-pop-national-footnote]').textContent=state.view==='distribution'?'郡の都市化区分別人口。周辺郡の人口＝郊外の人口ではありません。':state.view==='religion'?'公表5分類の合計は98%。灰色2%は無回答率ではなく、無回答・丸め等を含みうる計算上の差分です。':state.view==='ethnicity'?'ヒスパニック以外の7区分は非ヒスパニック。重複のない8区分です。':'全国得票の構成。地図の面積比や現在の支持率とは異なります。';
 }
 function legend(){const host=el('[data-pop-legend]');host.replaceChildren();host.classList.toggle('is-religion-guide',state.view==='religion');if(state.view==='religion'){const label=document.createElement('strong');label.textContent='番号と地域解説';host.append(label);for(const story of religionStories){const button=document.createElement('button');button.type='button';button.dataset.popReligionGuide=story.id;button.setAttribute('aria-pressed',String(story.id===state.story));button.textContent=`${story.number} ${story.region}`;host.append(button);}return;}const labels=state.view==='distribution'?['0','>0–1','>1–<10','10–<100','100–<1,000','1,000–<10,000','10,000以上']:state.view==='vote'?['民主党 +15以上','民主党 +5〜<15','差5未満','共和党 +5〜<15','共和党 +15以上']:['0','>0–<1','1–<5','5–<10','10–<25','25–<50','50–<75','75–100'];const colors=state.view==='distribution'?densityColors:state.view==='vote'?voteColors:shareColors;for(const [i,label] of [...labels,'未取得・非公表'].entries()){const span=document.createElement('span'),icon=document.createElement('i');icon.style.background=colors[i]??missingColor;span.append(icon,document.createTextNode(label));host.append(span);}}
 async function render(){
  const ticket=++generation;const active=options.active();el('[data-population-controls]')?.toggleAttribute('hidden',!active);el('[data-population-reading]')?.toggleAttribute('hidden',!active);el('[data-pop-city-markers]').hidden=!active;el('[data-pop-religion-markers]').hidden=!active||state.view!=='religion';if(!active){release();cityLabels.schedule();storyLabels.schedule();return;}
  if(!el('[data-population-controls]'))return;
  root.querySelectorAll<HTMLButtonElement>('[data-pop-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.popView===state.view)));
  root.querySelectorAll<HTMLElement>('[data-pop-filter]').forEach(n=>n.hidden=n.dataset.popFilter!==state.view);
  el<HTMLSelectElement>('[data-pop-metro]').value=state.metro;el<HTMLSelectElement>('[data-pop-ethnicity]').value=state.ethnicity;
  dataFailed=false;release();rows=[];values.clear();overview();el('[data-pop-selected]').hidden=true;el('[data-pop-total]').textContent='読み込み中';legend();fallback();el('[data-pop-chart]').replaceChildren();el('[data-pop-status]').textContent='データを読み込んでいます…';el('[data-pop-retry]').hidden=true;
  const current=()=>ticket===generation&&options.active()&&root.isConnected;
  try{
   if(state.view==='religion'){
    data=await loader.get('religion-overview');if(!current())return;national();selected();cityLabels.schedule();storyLabels.schedule();
    el('[data-layer-caption]').textContent='宗教文化を読む参照地点';el('[data-pop-map-note]').textContent='①〜⑥は地域解説と対応する参照地点です。信徒の人数や宗教圏の境界を表しません。';el('[data-pop-status]').textContent='6つの地域解説と、気候タブと共通の12都市を表示しています。';
    const map=options.map();if(!map){fallback();return true;}el('[data-fallback]').hidden=true;el('[data-map-surface]').hidden=false;el('.atlas-map-tools').hidden=false;root.dataset.renderState='ready';cityLabels.schedule();storyLabels.schedule();return true;
   }
   countyData=await loader.get('counties');if(!current())return;
   const metro=state.view==='distribution'&&state.metro!=='national';datasetKey=metro?`metro-${state.metro}`:'counties';
   const nextData=state.view==='ethnicity'?await loader.get('ethnicity'):state.view==='vote'?await loader.get('votes'):metro?await loader.get(datasetKey):countyData;if(!current())return;data=nextData;
   rows=data===countyData||['ethnicity','vote'].includes(state.view)?countyData.rows:data.rows;
   values=new Map((data.rows??[]).map((r:any)=>[r.id,r]));if(state.geo&&!rows.some(r=>r.id===state.geo))state.geo='';national();selected();cityLabels.schedule();
   const unit=state.view==='distribution'?'人口密度（人／km²）':state.view==='vote'?'共和党−民主党（ポイント）':ethnicities.find(x=>x[0]===state.ethnicity)![1]+'：全住民に占める割合（%）';
   el('[data-layer-caption]').textContent=unit;el('[data-pop-map-note]').textContent=unit+(metro?'。実線：主要都市境界。破線：2020年市街地境界。市街地の外側全域を郊外とは扱いません。':'。灰色は未取得・非公表。面積の大きさは人数・票数の大きさを意味しません。');
   el('[data-pop-status]').textContent=`${rows.length.toLocaleString()} 地域の数値を表示できます。${metro&&state.metro==='35620'?'NYの一部非公表トラクトは灰色です。':''}`;
   const map=options.map();if(!map){fallback();return true;}
   const geometry=await loader.get(datasetKey+'.geo');if(!current()||options.map()!==map)return;
   release();loadedGeometry=geometry;const byId=new Map(rows.map(r=>[r.id,r]));
   const features=geometry.features.map((f:any)=>({...f,properties:{...f.properties,color:byId.has(f.properties.id)?populationColor(value(byId.get(f.properties.id)!),state.view):missingColor}}));
   map.addSource('population',{type:'geojson',data:{type:'FeatureCollection',features}});map.addLayer({id:'population-fill',type:'fill',source:'population',paint:{'fill-color':['get','color'],'fill-opacity':.95}},'state-lines');map.addLayer({id:'population-lines',type:'line',source:'population',paint:{'line-color':'#637c7c','line-width':.3,'line-opacity':.4}},'state-lines');map.addLayer({id:'population-selected',type:'line',source:'population',filter:['==',['get','id'],state.geo],paint:{'line-color':'#162e40','line-width':2}});appliedMap=map;
   if(metro){const outlines=await loader.get(datasetKey+'.outlines.geo');if(!current()||options.map()!==map)return;map.addSource('population-outlines',{type:'geojson',data:outlines});map.addLayer({id:'population-outlines',type:'line',source:'population-outlines',filter:['==',['get','kind'],'urban'],paint:{'line-color':'#344955','line-width':.8,'line-dasharray':[3,2]}});map.addLayer({id:'population-city-outlines',type:'line',source:'population-outlines',filter:['==',['get','kind'],'city'],paint:{'line-color':'#7d3f70','line-width':1.6}});}
   if(current()&&options.map()===map){el('[data-fallback]').hidden=true;el('[data-map-surface]').hidden=false;el('.atlas-map-tools').hidden=false;root.dataset.renderState='ready';cityLabels.schedule();storyLabels.schedule();}return true;
  }catch(error){if(!current())return;release();dataFailed=true;el('[data-fallback]').hidden=false;el('[data-map-surface]').hidden=true;el('.atlas-map-tools').hidden=true;root.dataset.renderState='fallback';fallback();el('[data-pop-status]').textContent='データを読み込めませんでした。再試行できます。';el('[data-pop-retry]').hidden=false;console.error('Population data',error);}
 }
 root.querySelectorAll<HTMLButtonElement>('[data-pop-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.popView!;state.geo='';if(state.view!=='religion')state.story='';void render();options.changed(true);}));
 for(const [selector,key] of [['[data-pop-metro]','metro'],['[data-pop-ethnicity]','ethnicity']] as const)el<HTMLSelectElement>(selector)?.addEventListener('change',async e=>{state[key]=(e.target as HTMLSelectElement).value;if(key==='metro')state.geo='';const chosen=state[key],viewAtSelection=state.view;options.changed(true);const complete=await render();if(!complete||state[key]!==chosen||state.view!==viewAtSelection||!options.active())return;if(key==='metro'&&state.view==='distribution'){options.fit(state.metro==='national'?[[-125,24],[-66,50]]:data?.bounds);options.changed();}});
 el('[data-pop-retry]')?.addEventListener('click',()=>void render());
 root.querySelectorAll<HTMLButtonElement>('.population-city-list [data-pop-city]').forEach(button=>button.addEventListener('click',()=>chooseCity(button.dataset.popCity!)));
 el('[data-pop-city-clear]').addEventListener('click',()=>chooseCity(''));
 el('[data-pop-legend]').addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-pop-religion-guide]');if(button)chooseReligionStory(button.dataset.popReligionGuide!,true,true);});
 el('[data-pop-city-religion-related]').addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-pop-city-religion-story]');if(button)chooseReligionStory(button.dataset.popCityReligionStory!,true,true);});
 root.querySelectorAll<HTMLDetailsElement>('[data-pop-religion-story]').forEach(details=>details.querySelector('summary')!.addEventListener('click',event=>{event.preventDefault();chooseReligionStory(state.story===details.dataset.popReligionStory?'':details.dataset.popReligionStory!,true,false);}));
 root.querySelectorAll<HTMLButtonElement>('[data-pop-story]').forEach(button=>button.addEventListener('click',()=>{const story=settlementStories.find(s=>s.id===button.dataset.popStory)!;state.ethnicity=story.group;state.geo='';void render();options.changed(true);}));
 root.querySelectorAll<HTMLButtonElement>('[data-pop-insight]').forEach(b=>b.addEventListener('click',()=>{state.insight=b.dataset.popInsight!;state.view=state.insight==='vote'?'vote':state.insight==='settlement'?'ethnicity':'distribution';state.geo='';void render();options.changed(true);el('[data-population-controls]').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
 return {render,fallback,renderMarkers(){cityLabels.schedule();storyLabels.schedule();},unavailable(){appliedMap=undefined;loadedGeometry=undefined;fallback();},write:(url:URL)=>writePopulationState(url,state),restore(){state=readPopulationState(new URL(location.href));},click(point:any){const map=options.map();if(appliedMap===map&&map?.getLayer('population-fill')){const feature=map.queryRenderedFeatures(point,{layers:['population-fill']})[0];if(feature)pick(feature.properties.id);}},national(){state.metro='national';state.geo='';void render();options.changed(true);}};
}
