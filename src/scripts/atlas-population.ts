import {populationViews,ethnicities,densityColors,voteColors,missingColor} from '../data/atlas/population';
import {readPopulationState,writePopulationState} from '../lib/atlas-population-state';
import {populationColor,density} from '../lib/atlas-population-data';
import {dominantCategory,ethnicityColors} from '../lib/atlas-population-dominant';
import {createPopulationLoader} from '../lib/atlas-population-loader';
import {populationCityProfiles,populationOverviews,settlementStories} from '../data/atlas/population-reading';
import {populationCityReligionProfiles,religionStories} from '../data/atlas/population-religion-reading';
import {ethnicityReading,populationVoteStates} from '../data/atlas/population-focus';
import {createNatureLabels} from './atlas-nature-labels';
import {populationFallbackExtent,populationFallbackBox,projectPopulationFallback} from '../lib/atlas-population-projection';

type City={id:string;nameJa:string;longitude:number;latitude:number};
export function createPopulationController(root:HTMLElement,base:string,options:{cities:City[];active:()=>boolean;map:()=>any;changed:(push?:boolean)=>void;fit:(bounds:any)=>void}){
 const el=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const loader=createPopulationLoader(base),cities=new Map(options.cities.map(c=>[c.id,c]));
 let state=readPopulationState(new URL(location.href)),generation=0,appliedMap:any,dataFailed=false,countyData:any,rows:any[]=[],values=new Map<string,any>();
 const number=(n:number)=>n.toLocaleString('ja-JP',{maximumFractionDigits:1});
 const focusState=()=>populationVoteStates.find(s=>s.id===state.voteState);
 const extent=()=>populationFallbackExtent(state.view==='vote'&&focusState()?.bounds?focusState()!.bounds!.map(b=>[...b]):undefined,state.view==='religion' ? .1 : 0);
 function release(){
  if(appliedMap&&appliedMap===options.map()){
   for(const id of ['population-selected','population-lines','population-fill'])if(appliedMap.getLayer(id))appliedMap.removeLayer(id);
   if(appliedMap.getSource('population'))appliedMap.removeSource('population');
  }
  appliedMap=undefined;
 }
 const project=()=>options.map()&&!dataFailed&&el('[data-fallback]').hidden?(coordinate:readonly number[])=>options.map().project(coordinate):null;
 const cityLabels=createNatureLabels(root,options.cities.map(city=>({id:city.id,name:city.nameJa,coordinate:[city.longitude,city.latitude],mode:'population'})),{
  holder:el('[data-pop-city-markers]'),attribute:'data-pop-city',controls:'population-city-reading',active:options.active,mode:()=>'population',project,
  fallbackBox:box=>populationFallbackBox(box,extent()),fallbackProject:(coordinate,box)=>projectPopulationFallback(coordinate,box,extent()),
  select:entry=>choose('city',entry.id),placed:()=>{},
 });
 const storyLabels=createNatureLabels(root,religionStories.map(story=>({id:story.id,name:story.number,coordinate:story.coordinate,mode:'population'})),{
  holder:el('[data-pop-religion-markers]'),attribute:'data-pop-religion-marker',controls:'population-city-reading',
  active:()=>options.active()&&state.view==='religion',mode:()=>'population',project,
  fallbackBox:box=>populationFallbackBox(box,extent()),fallbackProject:(coordinate,box)=>projectPopulationFallback(coordinate,box,extent()),
  obstacleSelector:'.population-city-markers .atlas-nature-label:not([hidden])',select:entry=>choose('story',entry.id),placed:()=>{},
 });
 for(const story of religionStories)root.querySelector('[data-pop-religion-marker="'+story.id+'"]')?.setAttribute('aria-label',story.number+' '+story.title+'の解説を開く');
 function schedule(){cityLabels.schedule();storyLabels.schedule();}
 function paragraph(host:HTMLElement,title:string,text:string){
  const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=text;host.append(h,p);
 }
 function source(host:HTMLElement,label:string,url:string){const a=document.createElement('a');a.href=url;a.textContent=label;a.className='population-source';host.append(a);}
 function reading(){
  const group=state.view==='ethnicity'?state.ethnicity:'';
  const story=state.view==='religion'?religionStories.find(s=>s.id===state.story):undefined;
  const city=cities.get(state.city),profile=city&&populationCityProfiles[city.id];
  const vote=state.view==='vote'?focusState():undefined,copy=populationOverviews[state.view];
  const body=el('[data-pop-reading-body]');body.replaceChildren();
  let title=copy.title,text=copy.text;
  if(group){
   title=ethnicities.find(x=>x[0]===group)![1];text=ethnicityReading[group];
   for(const item of settlementStories.filter(s=>s.group===group)){paragraph(body,item.label+'｜'+item.region,item.text);source(body,item.sourceLabel,item.source);}
   paragraph(body,'産業・暮らし・投票とのつながり','移住の経緯に加え、職種・所得・年齢・住宅や通勤の条件を確かめます。地域の構成から、個人の職業や支持政党を決めることはできません。');
   paragraph(body,'地図の読み方','色は郡内で最大の区分です。過半数とは限らず、最大にならない集団の居住地は色に現れません。都市圏内の細かな分布は追加データの準備中です。');
  }else if(story){
   title=story.title;text=story.region;paragraph(body,'歴史と地域社会',story.text);
   for(const item of story.sources)source(body,item.label,item.url);
   paragraph(body,'産業・投票とのつながりを読む','移住先での仕事や住まい、学校・教会などの共同体が、地域社会の形成にどう関わったかを考えます。現在の得票分布との重なりだけで因果関係は判断できません。');
  }else if(profile){
   title=city!.nameJa;text=profile.location;
   if(state.view==='religion'){
    const religion=populationCityReligionProfiles[city!.id];paragraph(body,'宗教文化と歴史',religion.text);source(body,religion.sourceLabel,religion.source);
   }
   paragraph(body,'主な産業',profile.industries);paragraph(body,'働く人の職種',profile.jobs);
   paragraph(body,'都市と周辺を見比べる','左の都市とその周りの密度を見比べ、職場と住まいがどの範囲に広がるかを考えます。郡の平均密度だけでは、市内・郊外の境界や通勤経路は分かりません。');
   source(body,'BLS：都市圏の職種構成（2025年5月）',profile.source);
   const foot=document.createElement('p');foot.className='population-footnote';foot.textContent='職種割合は市域の住民構成ではなく、周辺を含む都市圏の雇用です。';body.append(foot);
  }else if(vote){
   title=vote.name+'の投票分布';text='2024年大統領選。現在の支持率や2026年選挙の接戦評価とは別です。';
   if(vote.id==='02'){paragraph(body,'アラスカの扱い','現在の郡別選挙データには、アラスカの地理単位に一致する結果を収録していません。左は参考として全米本土を表示しています。');}
   else{
    const counties=rows.filter(r=>r.state===vote.id);
    const largest=counties.filter(r=>r.population[0]!=null).sort((a,b)=>b.population[0]-a.population[0])[0];
    const v=largest&&values.get(largest.id),margin=v?.total>0?(v.r-v.d)/v.total*100:null;
    if(largest)paragraph(body,'都市と周辺を見る',largest.name+' は州内で人口が最も多い郡です。'+(margin===null?'この郡の比較可能な得票は未収録です。':margin===0?'この郡の二大政党の得票率は同率でした。':(margin>0?'共和党':'民主党')+'が '+number(Math.abs(margin))+' ポイント上回りました。')+' 周囲の郡の色と見比べます。');
    paragraph(body,'地図から説明へ','人口の集積、産業と職種、移住と地域社会の歴史を順に確かめます。地図の面積ではなく、有権者と票数の分布に注目します。郡を選ぶと得票率差を確認できます。');
   }
   source(body,'2024年大統領選：FEC公式結果','https://www.fec.gov/resources/cms-content/documents/federalelections2024.pdf');
  }else{
   paragraph(body,'地図のどこを見る？',copy.reading);
   if(state.view==='ethnicity'){
    paragraph(body,'凡例から歴史を読む','白人・ヒスパニック・アジア系などの凡例を選ぶと、この欄が選んだ区分の解説に替わります。地図の範囲と各区分の色は変わりません。');
   }
  }
  el('[data-pop-overview-title]').textContent=title;el('[data-pop-overview]').textContent=text;
  const selected=!!(group||story||profile||vote);
  el('[data-pop-reading-reset]').hidden=!selected;el('[data-pop-city-jump]').hidden=!selected;el('[data-pop-city-jump]').textContent=title+'の解説へ';
  root.querySelectorAll<HTMLElement>('[data-pop-city]').forEach(n=>n.setAttribute('aria-pressed',String(!group&&!story&&n.dataset.popCity===state.city)));
  root.querySelectorAll<HTMLElement>('[data-pop-place-story]').forEach(n=>{n.hidden=state.view!=='religion';n.setAttribute('aria-pressed',String(n.dataset.popPlaceStory===story?.id));});
  root.querySelectorAll<HTMLElement>('[data-pop-group]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.popGroup===group)));
  cityLabels.sync(!group&&!story?state.city:'');storyLabels.sync(story?.id??'');schedule();
 }
 function choose(kind:'city'|'group'|'story',id:string){
  if(kind==='city'&&!cities.has(id)||kind==='group'&&id&&!ethnicities.some(x=>x[0]===id)||kind==='story'&&!religionStories.some(s=>s.id===id))return;
  state.city=kind==='city'?id:'';state.ethnicity=kind==='group'?id:'';state.story=kind==='story'?id:'';state.geo='';
  selected();reading();options.changed(true);
  el('[data-atlas-live]').textContent=el('[data-pop-overview-title]').textContent+'の解説を表示しました。';
  if(matchMedia('(max-width: 899px), (max-height: 599px)').matches){el('[data-pop-reading]').focus({preventScroll:true});el('[data-pop-reading]').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 }
 function reset(){
  const zoomed=state.view==='vote'&&!!state.voteState;
  state.city='';state.ethnicity='';state.story='';state.geo='';state.voteState='';
  el<HTMLSelectElement>('[data-pop-vote-state]').value='';selected();reading();fallback();
  if(zoomed)options.fit([[-125,24],[-66,50]]);options.changed(true);
 }
 function legend(){
  const host=el('[data-pop-legend]');host.replaceChildren();
  if(state.view==='ethnicity'){
   for(const [i,[id,label]] of [['','全国の解説'],...ethnicities].entries()){
    const b=document.createElement('button');b.type='button';b.dataset.popGroup=id;b.setAttribute('aria-controls','population-city-reading');b.setAttribute('aria-pressed',String(state.ethnicity===id));
    if(i){const icon=document.createElement('i');icon.style.background=ethnicityColors[i-1];b.append(icon);}b.append(document.createTextNode(label));host.append(b);
   }
   const note=document.createElement('span');note.textContent='灰色：未取得・同率最大・人口0';host.append(note);return;
  }
  if(state.view==='religion'){const note=document.createElement('span');note.textContent='番号は地域解説の参照点です。宗教の郡別分布は未収録です。';host.append(note);return;}
  const labels=state.view==='distribution'?['0','>0–1','>1–<10','10–<100','100–<1,000','1,000–<10,000','10,000以上']:['民主党 +15以上','民主党 +5〜<15','差5未満','共和党 +5〜<15','共和党 +15以上'];
  const colors=state.view==='distribution'?densityColors:voteColors;
  for(const [i,label] of [...labels,'未取得・非公表'].entries()){const span=document.createElement('span'),icon=document.createElement('i');icon.style.background=colors[i]??missingColor;span.append(icon,document.createTextNode(label));host.append(span);}
 }
 function fallback(){
  schedule();if(!options.active())return;
  el<HTMLImageElement>('[data-fallback-livestock]').hidden=true;
  if(options.map()&&!dataFailed)return;
  const vote=state.view==='vote'&&focusState()?.bounds?'-state-'+state.voteState:'';
  const name=state.view==='ethnicity'?'ethnicity-dominant':state.view==='religion'?'religion':state.view==='vote'?'vote'+vote:'density';
  const image=el<HTMLImageElement>('[data-fallback-image]');image.src=base+name+'.webp';image.alt=state.view==='ethnicity'?'郡ごとに最大の人種・民族区分を示す分布図。色は凡例と対応します。':state.view==='religion'?'米国本土の州境と宗教文化の参照地点。郡別の宗教分布は未収録です。':populationViews.find(v=>v[0]===state.view)![1]+'の代替図。';
  el<HTMLAnchorElement>('[data-fallback-full]').href=image.src;el('.atlas-fallback-map').setAttribute('aria-label',image.alt);
 }
 function selected(){
  const row=state.view==='vote'?rows.find(r=>r.id===state.geo):undefined,v=row&&values.get(row.id);
  el('[data-pop-selected]').hidden=!row;
  if(row){
   el('[data-pop-selected-title]').textContent=row.name+' — '+(countyData?.states[row.state]??'');
   el('[data-pop-selected-value]').textContent=v?.total>0?'共和党 − 民主党：'+number((v.r-v.d)/v.total*100)+' ポイント':'比較可能な結果は未収録です。';
   el('[data-pop-selected-note]').textContent=v?.total>0?'共和党 '+number(v.r)+' 票 ／ 民主党 '+number(v.d)+' 票 ／ その他 '+number(v.other)+' 票。分母 '+number(v.total)+' 票（2024年）。':v?.reason??'地理単位と得票の対応を確認できていません。';
  }
  if(appliedMap===options.map()&&appliedMap?.getLayer('population-selected'))appliedMap.setFilter('population-selected',['==',['get','id'],row?state.geo:'']);
 }
 async function render(){
  const ticket=++generation,active=options.active();
  el('[data-population-controls]').hidden=!active;el('[data-population-reading]').hidden=!active;el('[data-pop-city-markers]').hidden=!active;el('[data-pop-religion-markers]').hidden=!active||state.view!=='religion';
  if(!active){release();schedule();return;}
  root.querySelectorAll<HTMLElement>('[data-pop-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.popView===state.view)));
  root.querySelectorAll<HTMLElement>('[data-pop-filter]').forEach(n=>n.hidden=n.dataset.popFilter!==state.view);
  el<HTMLSelectElement>('[data-pop-vote-state]').value=state.voteState;
  release();dataFailed=false;rows=[];values.clear();selected();legend();reading();fallback();
  el('[data-pop-status]').textContent='データを読み込んでいます…';el('[data-pop-retry]').hidden=true;
  const current=()=>ticket===generation&&options.active()&&root.isConnected;
  try{
   if(state.view==='religion'){
    el('[data-layer-caption]').textContent='宗教文化の参照図（郡別分布は未収録）';
    el('[data-pop-map-note]').textContent='都市と特徴的な地域を同じ選択枠から選べます。番号は人数や宗教圏の境界を表しません。';
    el('[data-pop-status]').textContent='6つの地域解説と12都市。郡別の最大宗教区分はデータ取得後に追加します。';
    if(options.map()){el('[data-fallback]').hidden=true;el('[data-map-surface]').hidden=false;el('.atlas-map-tools').hidden=false;root.dataset.renderState='ready';}
    schedule();return true;
   }
   const [counties,data]=await Promise.all([loader.get('counties'),state.view==='ethnicity'?loader.get('ethnicity'):state.view==='vote'?loader.get('votes'):loader.get('counties')]);
   if(!current())return;countyData=counties;rows=counties.rows;values=new Map(data.rows.map((r:any)=>[r.id,r]));
   const unit=state.view==='distribution'?'人口密度（人／km²）':state.view==='ethnicity'?'郡内で最大の人種・民族区分（過半数とは限りません）':'共和党 − 民主党（ポイント）';
   el('[data-layer-caption]').textContent=unit;
   el('[data-pop-map-note]').textContent=unit+'。面積の大きさは人数・票数の大きさを意味しません。';
   el('[data-pop-status]').textContent=rows.length.toLocaleString()+' 郡のデータ。'+(state.view==='ethnicity'?'ACS 2020–2024。都市圏内の詳細分布は準備中です。':'');
   selected();reading();
   const map=options.map();if(!map){fallback();return true;}
   const geometry=await loader.get('counties.geo');if(!current()||map!==options.map())return;
   const byId=new Map(rows.map(r=>[r.id,r]));
   const features=geometry.features.map((f:any)=>{
    const row=byId.get(f.properties.id),v=values.get(f.properties.id),winner=dominantCategory(v?.counts);
    const color=state.view==='ethnicity'?(winner===null?missingColor:ethnicityColors[winner]):populationColor(state.view==='distribution'?(row?density(row):null):v?.total>0?(v.r-v.d)/v.total*100:null,state.view);
    return {...f,properties:{...f.properties,color}};
   });
   map.addSource('population',{type:'geojson',data:{type:'FeatureCollection',features}});appliedMap=map;
   map.addLayer({id:'population-fill',type:'fill',source:'population',paint:{'fill-color':['get','color'],'fill-opacity':.95}},'state-lines');
   map.addLayer({id:'population-lines',type:'line',source:'population',paint:{'line-color':'#637c7c','line-width':.3,'line-opacity':.4}},'state-lines');
   map.addLayer({id:'population-selected',type:'line',source:'population',filter:['==',['get','id'],state.view==='vote'?state.geo:''],paint:{'line-color':'#162e40','line-width':2}});
   el('[data-fallback]').hidden=true;el('[data-map-surface]').hidden=false;el('.atlas-map-tools').hidden=false;root.dataset.renderState='ready';if(state.view==='vote'&&focusState()?.bounds&&!new URL(location.href).searchParams.has('z'))options.fit(focusState()!.bounds);schedule();return true;
  }catch(error){
   if(!current())return;release();dataFailed=true;el('[data-fallback]').hidden=false;el('[data-map-surface]').hidden=true;el('.atlas-map-tools').hidden=true;root.dataset.renderState='fallback';fallback();
   el('[data-pop-status]').textContent='データを読み込めませんでした。代替図を表示しています。';el('[data-pop-retry]').hidden=false;console.error('Population data',error);
  }
 }
 root.querySelectorAll<HTMLButtonElement>('[data-pop-view]').forEach(b=>b.addEventListener('click',()=>{
  const zoomed=state.view==='vote'&&!!state.voteState;
  state.view=b.dataset.popView!;state.geo='';state.city='';state.ethnicity='';state.story='';state.voteState='';
  if(zoomed)options.fit([[-125,24],[-66,50]]);void render();options.changed(true);
 }));
 el('[data-pop-legend]').addEventListener('click',event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-pop-group]');if(b)choose('group',b.dataset.popGroup!);});
 root.querySelectorAll<HTMLButtonElement>('.population-city-list [data-pop-city]').forEach(b=>b.addEventListener('click',()=>choose('city',b.dataset.popCity!)));
 root.querySelectorAll<HTMLButtonElement>('[data-pop-place-story]').forEach(b=>b.addEventListener('click',()=>choose('story',b.dataset.popPlaceStory!)));
 el('[data-pop-reading-reset]').addEventListener('click',reset);el('[data-pop-retry]').addEventListener('click',()=>void render());
 el<HTMLSelectElement>('[data-pop-vote-state]').addEventListener('change',e=>{
  state.voteState=(e.target as HTMLSelectElement).value;state.city='';state.story='';state.ethnicity='';state.geo='';
  selected();reading();options.fit(focusState()?.bounds??[[-125,24],[-66,50]]);fallback();options.changed(true);
 });
 root.querySelectorAll<HTMLButtonElement>('[data-pop-insight]').forEach(b=>b.addEventListener('click',()=>{
  state.insight=b.dataset.popInsight!;state.view=state.insight==='vote'?'vote':state.insight==='settlement'?'ethnicity':'distribution';state.city='';state.story='';state.ethnicity='';state.geo='';state.voteState='';void render();options.changed(true);
  el('[data-population-controls]').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }));
 return {render,fallback,renderMarkers:schedule,unavailable(){appliedMap=undefined;fallback();},write:(url:URL)=>writePopulationState(url,state),
 restore(){state=readPopulationState(new URL(location.href));},
 click(point:any){const map=options.map();if(appliedMap!==map||!map?.getLayer('population-fill'))return;const feature=map.queryRenderedFeatures(point,{layers:['population-fill']})[0];if(!feature)return;const id=feature.properties.id;
  if(state.view==='ethnicity'){const winner=dominantCategory(values.get(id)?.counts);if(winner!==null)choose('group',ethnicities[winner][0]);}
  else if(state.view==='vote'){state.geo=id;selected();options.changed(true);}
 },national(){state.metro='national';reset();}};
}
