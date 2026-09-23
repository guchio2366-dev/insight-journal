import {populationViews,ethnicities,densityColors,voteColors,missingColor} from '../data/atlas/population';
import {readPopulationState,writePopulationState} from '../lib/atlas-population-state';
import {populationColor,density} from '../lib/atlas-population-data';
import {ethnicityColors} from '../lib/atlas-population-dominant';
import {ethnicityComposition,ethnicityFill,ethnicityMissingColor,ethnicityMethod,ethnicityUncertainty,ethnicityCityCounties,cityEthnicityCounts} from '../lib/atlas-population-concentration';
import {createPopulationLoader} from '../lib/atlas-population-loader';
import {populationCityProfiles,populationCityTakeaways,populationOverviews,settlementStories} from '../data/atlas/population-reading';
import {populationCityReligionProfiles,religionStories,religionDominantCategories,religionDominantReading,religionTakeaways} from '../data/atlas/population-religion-reading';
import {ethnicityReading,ethnicityTakeaways,populationVoteStates} from '../data/atlas/population-focus';
import {createNatureLabels} from './atlas-nature-labels';
import {populationFallbackExtent,populationFallbackBox,projectPopulationFallback} from '../lib/atlas-population-projection';
import {religionDominantColors} from '../lib/atlas-population-religion';

type City={id:string;nameJa:string;longitude:number;latitude:number};
export function createPopulationController(root:HTMLElement,base:string,options:{cities:City[];active:()=>boolean;map:()=>any;changed:(push?:boolean)=>void;fit:(bounds:any)=>void}){
 const el=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const loader=createPopulationLoader(base),cities=new Map(options.cities.map(c=>[c.id,c]));
 let state=readPopulationState(new URL(location.href)),generation=0,appliedMap:any,dataFailed=false,countyData:any,rows:any[]=[],values=new Map<string,any>();
 let readingTrail:Array<{city:string;ethnicity:string;religion:string;story:string}>=[];
 let ethnicityNational:unknown;
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
 function cityDots(){
  root.querySelectorAll<HTMLElement>('[data-pop-city]').forEach(button=>{
   button.querySelector('.population-ethnicity-dots')?.remove();button.removeAttribute('aria-label');
   if(state.view!=='ethnicity')return;
   const composition=ethnicityComposition(cityEthnicityCounts(button.dataset.popCity!,values),ethnicityNational);
   if(!composition)return;
   const dots=document.createElement('span');dots.className='population-ethnicity-dots';dots.setAttribute('aria-hidden','true');
   for(const i of composition.qualified){const dot=document.createElement('i');dot.style.background=ethnicityColors[i];dots.append(dot);}
   if(dots.childElementCount)button.append(dots);
   button.setAttribute('aria-label',cities.get(button.dataset.popCity!)!.nameJa+'の郡別集計：'+(composition.qualified.map(i=>ethnicities[i][1]).join('、')||'着色基準に達する区分なし')+'。構成比と解説を開く');
  });schedule();
 }
 function compositionTable(host:HTMLElement,counts:unknown,caption:string){
  const composition=ethnicityComposition(counts,ethnicityNational);
  if(!composition){note(host,'比較可能な人口構成は未取得です。');return;}
  const table=document.createElement('table');table.className='population-composition';
  const label=document.createElement('caption');label.textContent=caption;table.append(label);
  const head=document.createElement('thead'),header=document.createElement('tr');
  for(const text of ['区分','構成比','全米']){const th=document.createElement('th');th.scope='col';th.textContent=text;header.append(th);}head.append(header);table.append(head);
  const body=document.createElement('tbody');
  ethnicities.forEach(([id,name],i)=>{
   const row=document.createElement('tr'),title=document.createElement('th'),local=document.createElement('td'),nation=document.createElement('td'),dot=document.createElement('i');
   row.dataset.ethnicity=id;title.scope='row';dot.style.background=ethnicityColors[i];dot.setAttribute('aria-hidden','true');title.append(dot,document.createTextNode(name));
   if(composition.qualified.includes(i)){const mark=document.createElement('small');mark.textContent='集積基準に該当';title.append(mark);}
   local.textContent=number(composition.shares[i]*100)+'%';nation.textContent=number(composition.nationalShares[i]*100)+'%';row.append(title,local,nation);body.append(row);
  });table.append(body);host.append(table);
  note(host,'全住民を分母とする重複のない8区分。ヒスパニック以外は非ヒスパニック。割合は丸めています。');
 }
 function paragraph(host:HTMLElement,title:string,text:string){
  const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');
  section.className='population-reading-section';h.textContent=title;p.textContent=text;section.append(h,p);host.append(section);
 }
 function source(host:HTMLElement,label:string,url:string){const a=document.createElement('a');a.href=url;a.textContent=label;a.className='population-source';host.append(a);}
 function note(host:HTMLElement,text:string){const p=document.createElement('p');p.className='population-footnote';p.textContent=text;host.append(p);}
 function detail(host:HTMLElement,text:string){const d=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p');d.className='population-reading-detail';summary.textContent='分類と読み方を確認';p.textContent=text;d.append(summary,p);host.append(d);}
 function action(host:HTMLElement,label:string,kind:'city'|'group'|'religion'|'story',id:string){
  const button=document.createElement('button');button.type='button';button.className='population-reading-action';button.textContent=label;button.setAttribute('aria-controls','population-city-reading');
  button.addEventListener('click',()=>{readingTrail.push({city:state.city,ethnicity:state.ethnicity,religion:state.religion,story:state.story});choose(kind,id,true);});host.append(button);
 }
 function reading(){
  const group=state.view==='ethnicity'?state.ethnicity:'';
  const religionGroup=state.view==='religion'?state.religion:'';
  const story=state.view==='religion'?religionStories.find(s=>s.id===state.story):undefined;
  const city=cities.get(state.city),profile=city&&populationCityProfiles[city.id];
  const vote=state.view==='vote'?focusState():undefined,copy=populationOverviews[state.view];
  const body=el('[data-pop-reading-body]');body.replaceChildren();
  let title=copy.title,text=copy.text,key=copy.text;
  // Every selected view supplies one takeaway before supporting detail.
  if(group){
   title=ethnicities.find(x=>x[0]===group)![1];text=ethnicityReading[group];key=ethnicityTakeaways[group];
   for(const item of settlementStories.filter(s=>s.group===group)){paragraph(body,item.label+'｜'+item.region,item.text);source(body,item.sourceLabel,item.source);}
   if(group==='black'){
    paragraph(body,'仕事への移動と、住まいの制約','大移動とは、20世紀に南部の黒人が差別を逃れ、仕事や教育の機会を求めて北部・中西部・西部へ移った動きです。移住先でも住宅差別が居住地を制約しました。職場があることと、そこへ通える場所に住めることは別の問題です。');
    action(body,'五大湖のデトロイトで仕事と移住を読む','city','detroit');
   }else if(group==='hispanic'){action(body,'南西部のロサンゼルスで移住を読む','city','los-angeles');}
   else if(group==='white'){action(body,'五大湖のシカゴで産業を読む','city','chicago');}
   detail(body,ethnicityMethod+' '+ethnicityUncertainty+' 地域の構成だけから個人の職業や投票先は分かりません。');
  }else if(religionGroup){
   const item=religionDominantReading[religionGroup],label=religionDominantCategories.find(x=>x[0]===religionGroup)![1];
   title=label;text=item.region;key=religionTakeaways[religionGroup];
   paragraph(body,'移住・定住が共同体の土台に',item.history);
   const related:Record<string,string>={catholic:'northeast-immigration',southern_baptist:'south-protestant',latter_day_saints:'utah-lds',black_protestant:'black-churches'};
   const target=religionStories.find(s=>s.id===related[religionGroup]);if(target)action(body,target.number+' '+target.title+'を読む','story',target.id);
   paragraph(body,'雇用と政治を、地域の歴史に重ねる',item.connections);source(body,item.sourceLabel,item.source);
   detail(body,item.definition+' adherentsは宗教団体が報告・推計した所属者・子どもなどです。住民全体の構成とは異なり、未報告の人を無宗教とは扱いません。');
  }else if(story){
   title=story.title;text=story.region;key=religionTakeaways[story.id];paragraph(body,'地図の位置と、共同体ができた背景',story.text);
   for(const item of story.sources)source(body,item.label,item.url);
   const cityTargets:Record<string,string>={'south-protestant':'dallas','northeast-immigration':'new-york','southwest-catholic':'los-angeles','northwest-unaffiliated':'seattle','black-churches':'detroit'};
   const target=cityTargets[story.id];if(target)action(body,cities.get(target)!.nameJa+'の宗教文化と仕事を読む','city',target);
   if(story.id==='utah-lds')action(body,'末日聖徒の分布と入植を読む','religion','latter_day_saints');
   note(body,story.id==='northwest-unaffiliated'?'無宗教・無所属の分布は、このUSRC郡地図では示していません。ここでの説明はPewの回答調査に基づきます。':'番号は代表地点です。宗教文化の正確な境界を示すものではありません。');
  }else if(profile){
   title=city!.nameJa;text=profile.location;key=populationCityTakeaways[city!.id];
   if(state.view==='religion'){
    const religion=populationCityReligionProfiles[city!.id];key=religion.text.split('。')[0]+'。';
    paragraph(body,'移住と宗教文化｜共同体が根付く背景',religion.text.slice(religion.text.indexOf('。')+1)||religion.text);source(body,religion.sourceLabel,religion.source);
    for(const id of religion.stories){const related=religionStories.find(s=>s.id===id)!;action(body,related.number+' '+related.title+'を読む','story',id);}
   }else if(state.view==='ethnicity'){
    const ids=ethnicityCityCounties[city!.id]??[];
    compositionTable(body,cityEthnicityCounts(city!.id,values),'都市を含む郡の人口構成｜ACS 2020–2024');
    note(body,'集計範囲：'+ids.map(id=>rows.find(row=>row.id==='county:'+id)?.name??id).join('、')+'。'+(ids.length>1?ids.length+'郡を人口で合算。':'')+'市域・都市圏の範囲とは異なる場合があります。');
    const industrial=['chicago','detroit'].includes(city!.id),southwest=city!.id==='los-angeles';
    key=industrial?'工業都市への移住と住宅差別の歴史を合わせると、仕事と住まいの分布を結び付けて考えられます。':southwest?ethnicityTakeaways.hispanic:'都市の周辺を郡単位で見比べ、居住の分布と雇用の特徴を分けて読みます。';
    paragraph(body,'人の移動と住まい｜郡の色から歴史へ',industrial?'南部からの大移動では、工場の求人が移住先を形づくりました。一方、移住先の住宅差別は住める地域を制約しました。人々の居住地は仕事の場所だけでなく、住まいを得られる条件にも左右されます。':southwest?ethnicityReading.hispanic:'都市名の周りにある郡の色を見比べます。地色は着色基準に該当する区分のうち割合が最大のもの、都市の色点は該当する全区分を示します。市内の地区別分布はこの地図には収録していません。');
    if(industrial){source(body,'米国国立公文書館：大移動と住宅差別','https://www.archives.gov/research/african-americans/migrations/great-migration');action(body,'黒人の分布を南部からたどる','group','black');}
    if(southwest)action(body,'ヒスパニックの定住史を読む','group','hispanic');
   }else if(state.view==='vote'){
    key='都市を含む郡と周辺の郡を比べ、得票率差と実際の票数を分けて読むことが大切です。';
    paragraph(body,'都市周辺｜色の広さより票数','都市名の周りで赤青と濃淡を見比べ、郡を押して得票率差と票数を確認します。郡の結果は都市そのものの結果とは異なります。下の職種構成は地域の雇用背景で、職種別の投票先を示すものではありません。');
   }
   paragraph(body,'産業の集積｜'+profile.industries,profile.jobs);
   source(body,'BLS：都市圏の職種構成（2025年5月）',profile.source);
   if(state.view==='distribution'){
    paragraph(body,'都市圏｜働く場所と暮らす場所を合わせて読む','都市圏は、中心となる都市と、通勤などで結び付く周辺を合わせた地域です。左の都市名の周りで、人口密度が高い郡のまとまりを確認します。郊外は一般に中心都市の外に広がる住宅地などを指しますが、郡境がその境界になるわけではありません。');
    const other=city!.id==='detroit'?'seattle':'detroit';action(body,cities.get(other)!.nameJa+'と仕事の違いを比べる','city',other);
   }
   detail(body,'職種割合は市域の住民構成ではなく、周辺を含む都市圏の雇用です。郡の平均密度や人口構成から、市内の地区別分布・通勤経路・個人の職業や投票先は分かりません。'+(state.view==='ethnicity'?ethnicityUncertainty:''));
  }else if(vote){
   title=vote.name+'の投票分布';key=vote.id==='02'?'アラスカは郡と選挙結果の地理単位を合わせられず、この地図では比較できません。':'都市を含む郡の票数と周辺の得票率差を比べると、州の中の違いが見えてきます。';text='2024年大統領選。現在の支持率や2026年選挙の接戦評価とは別です。';
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
   paragraph(body,state.view==='distribution'?'沿岸・五大湖・内陸の都市を見比べる':state.view==='ethnicity'?'南部・五大湖・国境を見比べる':state.view==='religion'?'南部・北東部・ユタ周辺を見比べる':'都市周辺の色と、郡の票数を見比べる',copy.reading);
   if(state.view==='distribution')action(body,'デトロイトで製造業と雇用を見る','city','detroit');
   if(state.view==='religion'){action(body,'② ユタへの移住と共同体を読む','story','utah-lds');detail(body,'最多は過半数を意味しません。住民全体の宗教構成ではなく、未報告も無宗教を意味しません。分類・出典はページ下部で確認できます。');}
   if(state.view==='ethnicity'){
    action(body,'黒人の大移動と工業都市のつながりを読む','group','black');
    action(body,'ヒスパニックの分布と国境の歴史を読む','group','hispanic');
    detail(body,ethnicityMethod+' 英系・独系など祖先の出身地は別の分類です。人種区分は身体的特徴や能力を説明するものではありません。');
   }
  }
  if(readingTrail.length){
   const back=document.createElement('button');back.type='button';back.className='population-reading-action';back.textContent='← 前の解説へ戻る';
   back.addEventListener('click',()=>{Object.assign(state,readingTrail.pop());state.geo='';selected();reading();options.changed(true);el('[data-pop-reading]').focus({preventScroll:true});});body.append(back);
  }
  el('[data-pop-overview-title]').textContent=title;el('[data-pop-overview]').textContent=text;el('[data-pop-overview]').hidden=text===key;el('[data-pop-key]').textContent=key;
  const isSelected=!!(group||religionGroup||story||profile||vote);
  el('[data-pop-reading-reset]').hidden=!isSelected;el('[data-pop-city-jump]').hidden=!isSelected;el('[data-pop-city-jump]').textContent=title+'の解説へ';
  root.querySelectorAll<HTMLElement>('[data-pop-city]').forEach(n=>n.setAttribute('aria-pressed',String(!group&&!religionGroup&&!story&&n.dataset.popCity===state.city)));
  root.querySelectorAll<HTMLElement>('[data-pop-place-story]').forEach(n=>{n.hidden=state.view!=='religion';n.setAttribute('aria-pressed',String(n.dataset.popPlaceStory===story?.id));});
  root.querySelectorAll<HTMLElement>('[data-pop-group]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.popGroup===group)));
  root.querySelectorAll<HTMLElement>('[data-pop-religion-group]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.popReligionGroup===religionGroup)));
  cityLabels.sync(!group&&!religionGroup&&!story?state.city:'');storyLabels.sync(religionGroup?'':story?.id??'');schedule();
 }
 function choose(kind:'city'|'group'|'religion'|'story',id:string,fromReading=false){
  if(kind==='city'&&!cities.has(id)||kind==='group'&&id&&!ethnicities.some(x=>x[0]===id)||kind==='religion'&&id&&!religionDominantCategories.some(x=>x[0]===id)||kind==='story'&&!religionStories.some(s=>s.id===id))return;
  if(!fromReading)readingTrail=[];
  state.city=kind==='city'?id:'';state.ethnicity=kind==='group'?id:'';state.religion=kind==='religion'?id:'';state.story=kind==='story'?id:'';state.geo='';
  selected();reading();options.changed(true);
  el('[data-atlas-live]').textContent=el('[data-pop-overview-title]').textContent+'の解説を表示しました。';
  if(matchMedia('(max-width: 899px), (max-height: 599px)').matches){el('[data-pop-reading]').focus({preventScroll:true});el('[data-pop-reading]').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 }
 function reset(){
  readingTrail=[];
  const zoomed=state.view==='vote'&&!!state.voteState;
  state.city='';state.ethnicity='';state.religion='';state.story='';state.geo='';state.voteState='';
  el<HTMLSelectElement>('[data-pop-vote-state]').value='';selected();reading();fallback();
  if(zoomed)options.fit([[-125,24],[-66,50]]);options.changed(true);
 }
 function legend(){
  const host=el('[data-pop-legend]');host.replaceChildren();
  if(state.view==='ethnicity'){
   for(const [i,[id,label]] of [['','全国の解説'],...ethnicities].entries()){
    const b=document.createElement('button');b.type='button';b.dataset.popGroup=id;b.setAttribute('aria-controls','population-city-reading');b.setAttribute('aria-pressed',String(state.ethnicity===id));
    if(i>1){const icon=document.createElement('i');icon.style.background=ethnicityColors[i-1];b.append(icon);}b.append(document.createTextNode(label));host.append(b);
   }
   for(const [color,label] of [[ethnicityColors[0],'灰色：着色基準に達しない郡（主に白人が最多）'],[ethnicityMissingColor,'濃灰色：欠測・人口0']]){const note=document.createElement('span'),icon=document.createElement('i');icon.style.background=color;note.append(icon,document.createTextNode(label));host.append(note);}return;
  }
  if(state.view==='religion'){
   for(const [i,[id,label]] of [['','全国の解説'],...religionDominantCategories].entries()){
    const b=document.createElement('button');b.type='button';b.dataset.popReligionGroup=id;b.setAttribute('aria-controls','population-city-reading');b.setAttribute('aria-pressed',String(state.religion===id));
    if(i){const icon=document.createElement('i');icon.style.background=religionDominantColors[id];b.append(icon);}b.append(document.createTextNode(label));host.append(b);
   }
   const note=document.createElement('span');const icon=document.createElement('i');icon.style.background=religionDominantColors.unreported;note.append(icon,document.createTextNode('報告なし（無宗教を意味しません）'));host.append(note);return;
  }
  const labels=state.view==='distribution'?['0','>0–1','>1–<10','10–<100','100–<1,000','1,000–<10,000','10,000以上']:['民主党 +15以上','民主党 +5〜<15','差5未満','共和党 +5〜<15','共和党 +15以上'];
  const colors=state.view==='distribution'?densityColors:voteColors;
  for(const [i,label] of [...labels,'未取得・非公表'].entries()){const span=document.createElement('span'),icon=document.createElement('i');icon.style.background=colors[i]??missingColor;span.append(icon,document.createTextNode(label));host.append(span);}
 }
 function fallback(){
  schedule();if(!options.active())return;
  el<HTMLImageElement>('[data-fallback-livestock]').hidden=true;
  if(options.map()&&!dataFailed)return;
  const vote=state.view==='vote'&&focusState()?.bounds?'-state-'+state.voteState:'';
  const name=state.view==='ethnicity'?'ethnicity-concentration':state.view==='religion'?'religion-dominant':state.view==='vote'?'vote'+vote:'density';
  const image=el<HTMLImageElement>('[data-fallback-image]');image.src=base+name+'.webp';image.alt=state.view==='ethnicity'?'灰色を背景に、人種・民族の特徴的な集積を郡別に示す分布図。着色基準と各色は凡例に記載しています。':state.view==='religion'?'宗教団体が把握したadherentsについて、郡ごとの最大グループを示す分布図。色は凡例と対応します。':populationViews.find(v=>v[0]===state.view)![1]+'の代替図。';
  el<HTMLAnchorElement>('[data-fallback-full]').href=image.src;el('.atlas-fallback-map').setAttribute('aria-label',image.alt);
 }
 function selected(){
  const row=['vote','ethnicity'].includes(state.view)?rows.find(r=>r.id===state.geo):undefined,v=row&&values.get(row.id);
  const composition=el('[data-pop-selected-composition]');composition.replaceChildren();
  el('[data-pop-selected]').hidden=!row;
  if(row){
   el('[data-pop-selected-title]').textContent=row.name+' — '+(countyData?.states[row.state]??'');
   if(state.view==='ethnicity'){
    const result=ethnicityComposition(v?.counts,ethnicityNational);
    el('[data-pop-selected-value]').textContent=result?'集積基準に該当：'+(result.qualified.map(i=>ethnicities[i][1]).join('、')||'なし（灰色）'):'比較可能な人口構成は未取得です。';
    el('[data-pop-selected-note]').textContent='地色は該当する区分のうち割合が最大のものです。'+ethnicityUncertainty;
    if(result)compositionTable(composition,v.counts,'郡の人口構成｜ACS 2020–2024');
   }else{
   el('[data-pop-selected-value]').textContent=v?.total>0?'共和党 − 民主党：'+number((v.r-v.d)/v.total*100)+' ポイント':'比較可能な結果は未収録です。';
   el('[data-pop-selected-note]').textContent=v?.total>0?'共和党 '+number(v.r)+' 票 ／ 民主党 '+number(v.d)+' 票 ／ その他 '+number(v.other)+' 票。分母 '+number(v.total)+' 票（2024年）。':v?.reason??'地理単位と得票の対応を確認できていません。';
   }
  }
  if(appliedMap===options.map()&&appliedMap?.getLayer('population-selected'))appliedMap.setFilter('population-selected',['==',['get','id'],row?state.geo:'']);
 }
 async function render(){
  readingTrail=[];
  const ticket=++generation,active=options.active();
  el('[data-population-controls]').hidden=!active;el('[data-population-reading]').hidden=!active;el('[data-pop-city-markers]').hidden=!active;el('[data-pop-religion-markers]').hidden=!active||state.view!=='religion';
  if(!active){release();schedule();return;}
  root.querySelectorAll<HTMLElement>('[data-pop-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.popView===state.view)));
  root.querySelectorAll<HTMLElement>('[data-pop-filter]').forEach(n=>n.hidden=n.dataset.popFilter!==state.view);
  el<HTMLSelectElement>('[data-pop-vote-state]').value=state.voteState;
  el('[data-pop-ethnicity-method]').hidden=state.view!=='ethnicity';
  release();dataFailed=false;rows=[];values.clear();ethnicityNational=undefined;cityDots();selected();legend();reading();fallback();
  el('[data-pop-status]').textContent='データを読み込んでいます…';el('[data-pop-retry]').hidden=true;
  const current=()=>ticket===generation&&options.active()&&root.isConnected;
  try{
   const religion=state.view==='religion';
   const [counties,data]=religion?await Promise.all([loader.get('religion-counties-2020.geo'),loader.get('religion-dominant')]):await Promise.all([loader.get('counties'),state.view==='ethnicity'?loader.get('ethnicity'):state.view==='vote'?loader.get('votes'):loader.get('counties')]);
   if(!current())return;countyData=religion?undefined:counties;rows=religion?data.rows:counties.rows;values=new Map(data.rows.map((r:any)=>[r.id,r]));
   if(state.view==='ethnicity')ethnicityNational=data.national;cityDots();
   const unit=state.view==='distribution'?'人口密度（人／km²）':state.view==='ethnicity'?'人種・民族の特徴的な集積（郡別）':religion?'郡内で最大の宗教グループ（adherents、過半数とは限りません）':'共和党 − 民主党（ポイント）';
   el('[data-layer-caption]').textContent=unit;
   el('[data-pop-map-note]').textContent=religion?'宗教団体が把握したadherentsの最大グループ。過半数や住民全体の構成ではありません。番号は地域解説の参照点です。':state.view==='ethnicity'?'白人以外の区分が20%以上、または5%以上かつ全米割合の1.5倍以上の郡を着色。都市の色点は該当する全区分です。都市名を押すと構成比を確認できます。面積や点の大きさは人数を表しません。':unit+'。面積の大きさは人数・票数の大きさを意味しません。';
   el('[data-pop-status]').textContent=rows.length.toLocaleString()+' 郡のデータ。'+(state.view==='ethnicity'?'ACS 2020–2024。地図は米国本土。':religion?'2020 U.S. Religion Census。報告なし3郡。':'');
   selected();reading();
   const map=options.map();if(!map){fallback();return true;}
   const geometry=religion?counties:await loader.get('counties.geo');if(!current()||map!==options.map())return;
   const byId=new Map(rows.map(r=>[r.id,r]));
   const features=geometry.features.map((f:any)=>{
    const row=byId.get(f.properties.id),v=values.get(f.properties.id);
    const color=state.view==='ethnicity'?ethnicityFill(v?.counts,ethnicityNational):religion?(religionDominantColors[v?.category]??missingColor):populationColor(state.view==='distribution'?(row?density(row):null):v?.total>0?(v.r-v.d)/v.total*100:null,state.view);
    return {...f,properties:{...f.properties,color}};
   });
   map.addSource('population',{type:'geojson',data:{type:'FeatureCollection',features}});appliedMap=map;
   map.addLayer({id:'population-fill',type:'fill',source:'population',paint:{'fill-color':['get','color'],'fill-opacity':.95}},'state-lines');
   map.addLayer({id:'population-lines',type:'line',source:'population',paint:{'line-color':'#637c7c','line-width':.3,'line-opacity':.4}},'state-lines');
   map.addLayer({id:'population-selected',type:'line',source:'population',filter:['==',['get','id'],['vote','ethnicity'].includes(state.view)?state.geo:''],paint:{'line-color':'#162e40','line-width':2}});
   el('[data-fallback]').hidden=true;el('[data-map-surface]').hidden=false;el('.atlas-map-tools').hidden=false;root.dataset.renderState='ready';if(state.view==='vote'&&focusState()?.bounds&&!new URL(location.href).searchParams.has('z'))options.fit(focusState()!.bounds);schedule();return true;
  }catch(error){
   if(!current())return;release();dataFailed=true;el('[data-fallback]').hidden=false;el('[data-map-surface]').hidden=true;el('.atlas-map-tools').hidden=true;root.dataset.renderState='fallback';fallback();
   el('[data-pop-status]').textContent='データを読み込めませんでした。代替図を表示しています。';el('[data-pop-retry]').hidden=false;console.error('Population data',error);
  }
 }
 root.querySelectorAll<HTMLButtonElement>('[data-pop-view]').forEach(b=>b.addEventListener('click',()=>{
  const zoomed=state.view==='vote'&&!!state.voteState;
  state.view=b.dataset.popView!;state.geo='';state.city='';state.ethnicity='';state.religion='';state.story='';state.voteState='';
  if(zoomed)options.fit([[-125,24],[-66,50]]);void render();options.changed(true);
 }));
 el('[data-pop-legend]').addEventListener('click',event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-pop-group]');if(b)choose('group',b.dataset.popGroup!);});
 el('[data-pop-legend]').addEventListener('click',event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-pop-religion-group]');if(b)choose('religion',b.dataset.popReligionGroup!);});
 root.querySelectorAll<HTMLButtonElement>('.population-city-list [data-pop-city]').forEach(b=>b.addEventListener('click',()=>choose('city',b.dataset.popCity!)));
 root.querySelectorAll<HTMLButtonElement>('[data-pop-place-story]').forEach(b=>b.addEventListener('click',()=>choose('story',b.dataset.popPlaceStory!)));
 el('[data-pop-reading-reset]').addEventListener('click',reset);el('[data-pop-retry]').addEventListener('click',()=>void render());
 el<HTMLSelectElement>('[data-pop-vote-state]').addEventListener('change',e=>{
  state.voteState=(e.target as HTMLSelectElement).value;state.city='';state.story='';state.ethnicity='';state.religion='';state.geo='';
  selected();reading();options.fit(focusState()?.bounds??[[-125,24],[-66,50]]);fallback();options.changed(true);
 });
 root.querySelectorAll<HTMLButtonElement>('[data-pop-insight]').forEach(b=>b.addEventListener('click',()=>{
  state.insight=b.dataset.popInsight!;state.view=state.insight==='vote'?'vote':state.insight==='settlement'?'ethnicity':'distribution';state.city='';state.story='';state.ethnicity='';state.religion='';state.geo='';state.voteState='';void render();options.changed(true);
  el('[data-population-controls]').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }));
 return {render,fallback,renderMarkers:schedule,unavailable(){appliedMap=undefined;fallback();},write:(url:URL)=>writePopulationState(url,state),
 restore(){state=readPopulationState(new URL(location.href));},
 click(point:any){const map=options.map();if(appliedMap!==map||!map?.getLayer('population-fill'))return;const feature=map.queryRenderedFeatures(point,{layers:['population-fill']})[0];if(!feature)return;const id=feature.properties.id;
  if(state.view==='ethnicity'){state.geo=id;selected();options.changed(true);el('[data-atlas-live]').textContent=el('[data-pop-selected-title]').textContent+'の人口構成を表示しました。';}
  else if(state.view==='religion'){const category=values.get(id)?.category;if(category&&category!=='unreported')choose('religion',category);}
  else if(state.view==='vote'){state.geo=id;selected();options.changed(true);}
 },national(){state.metro='national';reset();}};
}
