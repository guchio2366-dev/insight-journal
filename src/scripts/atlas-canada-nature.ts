import {readCanadaNatureState,writeCanadaNatureState,type CanadaNatureState} from '../lib/atlas-canada-nature';
export function initCanadaNature(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-canada-config]')!.textContent!);
 const ids=config.cities.map((c:any)=>c.id),waters=config.waters;
 const $=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const map=$<SVGSVGElement>('[data-canada-map]');
 let state=readCanadaNatureState(new URL(location.href),ids,waters);
 const full=[0,0,config.width,config.height];
 function render(){
  const forestryBack=root.querySelector<HTMLAnchorElement>('[data-canada-forestry-return]'),savedForestry=new URL(location.href).searchParams.get('forestryReturn');
  if(forestryBack){forestryBack.hidden=!savedForestry;if(savedForestry){const back=new URL(forestryBack.getAttribute('href')!,location.href),params=new URLSearchParams(savedForestry);back.search='';for(const key of ['year','province','compare','metric','cover','region','zoom']){const value=params.get(key);if(value)back.searchParams.set(key,value);}forestryBack.href=back.href;}}
  const forestContext=root.querySelector<HTMLElement>('[data-canada-forest-context]'),forestMap=root.querySelector<SVGElement>('[data-canada-forest-context-map]'),forestLegend=root.querySelector<HTMLElement>('[data-canada-forest-context-legend]');
  if(forestContext&&forestMap&&forestLegend){
   forestContext.hidden=!savedForestry;forestMap.style.display=savedForestry&&state.view!=='landform'?'':'none';forestLegend.hidden=!savedForestry||state.view==='landform';
   const text=forestContext.querySelector<HTMLElement>('[data-canada-forest-context-text]')!;
   text.textContent=state.view==='landform'?'森林の生育条件と、伐採地から海岸へ運ぶ条件を分けて考えます。山地と海岸はこの地形図で、針葉樹林の分布と観測点は「都市の気候」の重ね図で確認できます。':state.view==='water'?'針葉樹林の分布とFraser川の位置を重ね、森林が育つ場所と海岸へつながる地形を照合します。川の位置だけで木材の輸送経路が決まるわけではなく、林業ページでは道路・港の役割を読みます。':state.city==='vancouver'?'Vancouverの冬の気温と秋冬の降水を、沿岸の温帯針葉樹林と比べます。温和で湿潤な条件が樹木の生育を支え、木材産業には森林管理・加工・輸送が加わります。':'観測点を切り替えています。沿岸林業の問いは、Vancouverの気温・降水と針葉樹林の分布の関係です。Vancouverを選ぶと沿岸の事例へ戻れます。';
  }
  $<HTMLSelectElement>('[data-canada-city]').value=state.city;
  $<HTMLSelectElement>('[data-canada-compare]').value=state.compare??'';
  for(const option of $<HTMLSelectElement>('[data-canada-compare]').options)option.disabled=option.value===state.city;
  for(const el of root.querySelectorAll<HTMLElement>('[data-canada-city-button],[data-canada-map-city]'))el.setAttribute('aria-pressed',String((el.dataset.canadaCityButton??el.dataset.canadaMapCity)===state.city));
  for(const button of root.querySelectorAll<HTMLElement>('[data-canada-view]'))button.setAttribute('aria-pressed',String(button.dataset.canadaView===state.view));
  for(const panel of root.querySelectorAll<HTMLElement>('[data-canada-reading]'))panel.hidden=panel.dataset.canadaReading!==state.view;
  for(const card of root.querySelectorAll<HTMLElement>('[data-canada-climate-card]'))card.hidden=![state.city,state.compare].includes(card.dataset.canadaClimateCard!);
  $('.canada-climate-cards').classList.toggle('is-comparing',!!state.compare);
  $('[data-canada-locator]').hidden=state.view==='landform';
  $('[data-canada-physical]').hidden=state.view!=='landform';
  $('[data-canada-water-controls]').hidden=state.view!=='water';
  const group=$<SVGGElement>('[data-canada-water-layers]');group.setAttribute('display',state.view==='water'?'':'none');group.removeAttribute('hidden');
  $<HTMLSelectElement>('[data-canada-water]').value=state.water??'';
  $<HTMLInputElement>('[data-canada-only]').checked=state.only;
  $<HTMLInputElement>('[data-canada-only]').disabled=!state.water;
  for(const shape of root.querySelectorAll<SVGPathElement>('[data-canada-water-shape]')){
   const selected=shape.dataset.canadaWaterShape===state.water;
   shape.style.display=state.only&&state.water&&!selected?'none':'';shape.classList.toggle('is-selected',selected);
  }
  map.setAttribute('viewBox',(state.frame??full).join(' '));
  const name=config.cities.find((c:any)=>c.id===state.city).name;
  $('[data-canada-announcement]').textContent=`${name}${state.compare?'と比較':''}。${({climate:'都市の気候',landform:'地形地域',water:'湖と河川'})[state.view]}を表示。`;
 }
 function update(patch:Partial<CanadaNatureState>){state={...state,...patch};if(state.compare===state.city)state.compare=null;history.pushState(null,'',writeCanadaNatureState(new URL(location.href),state));render();}
 const select=(city:string)=>update({city});
 $<HTMLSelectElement>('[data-canada-city]').addEventListener('change',e=>select((e.target as HTMLSelectElement).value));
 $<HTMLSelectElement>('[data-canada-compare]').addEventListener('change',e=>update({compare:(e.target as HTMLSelectElement).value||null}));
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-city-button],[data-canada-map-city]')){
  const action=()=>select((button.dataset.canadaCityButton??button.dataset.canadaMapCity)!);
  button.addEventListener('click',action);
  if(button.dataset.canadaMapCity)button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
 }
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-view]'))button.addEventListener('click',()=>update({view:button.dataset.canadaView as CanadaNatureState['view']}));
 $<HTMLSelectElement>('[data-canada-water]').addEventListener('change',e=>update({water:(e.target as HTMLSelectElement).value||null,only:false}));
 $<HTMLInputElement>('[data-canada-only]').addEventListener('change',e=>update({only:(e.target as HTMLInputElement).checked}));
 $('[data-canada-all-water]').addEventListener('click',()=>update({water:null,only:false}));
 $('[data-canada-reset]').addEventListener('click',()=>update({frame:null}));
 $('[data-canada-focus]').addEventListener('click',()=>{const p=config.cities.find((c:any)=>c.id===state.city).point;update({frame:[p[0]-150,p[1]-100,300,200]});});
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-zoom]'))button.addEventListener('click',()=>{
  const [x,y,w,h]=state.frame??full,factor=button.dataset.canadaZoom==='in'?.75:1/.75;
  const nw=Math.min(config.width,Math.max(30,w*factor)),nh=Math.min(config.height,Math.max(20,h*factor));
  update({frame:nw===config.width?null:[Math.max(0,Math.min(config.width-nw,x+(w-nw)/2)),Math.max(0,Math.min(config.height-nh,y+(h-nh)/2)),nw,nh]});
 });
 window.addEventListener('popstate',()=>{state=readCanadaNatureState(new URL(location.href),ids,waters);render();});
 render();
}
