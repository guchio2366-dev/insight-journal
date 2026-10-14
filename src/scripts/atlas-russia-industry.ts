import {ruIndustries,ruSectors,ruSources,ruSites,type RuSector,type RuSite} from '../data/atlas/russia-industry-catalog';
import {readRuIndustryState,writeRuIndustryState,sectorIndustries,visibleRuSites,groupRuPoints,layoutRuIndustryLabels,type RuIndustryState} from '../lib/atlas-russia-industry';
import {russiaWidth,russiaHeight} from '../lib/atlas-russia-geometry';
const ns='http://www.w3.org/2000/svg';
export function initRussiaIndustry(root:HTMLElement){
 if(root.dataset.ruReady)return;
 const q=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 let state=readRuIndustryState(new URL(location.href)),sceneSector:RuSector|null=null,sceneWidth=0;
 const canvas=q('[data-ru-canvas]'),overlay=q('[data-ru-overlay]');
 function sourceLinks(target:HTMLElement,ids:string[]){target.replaceChildren();for(const id of [...new Set(ids)]){const s=ruSources[id],a=document.createElement('a');a.href=s.url;a.textContent=s.title;target.append(a);}}
 function save(next:RuIndustryState){state=next;history.pushState(null,'',writeRuIndustryState(new URL(location.href),state));render();}
 function chooseIndustry(id:string){save({...state,industry:id,site:null,only:false});}
 function chooseSite(site:RuSite,id?:string){const industry=id??(site.industries.includes(state.industry??'')?state.industry:site.industries.find(id=>sectorIndustries(state.sector).some(i=>i.id===id)));save({...state,industry:industry??null,site:site.id});}
 function svgElement(name:string,attrs:Record<string,string|number>){const el=document.createElementNS(ns,name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));return el;}
 function draw(){
  const width=canvas.clientWidth||960,height=canvas.clientHeight||width*russiaHeight/russiaWidth;
  if(sceneSector===state.sector&&sceneWidth===width){emphasis();return;}
  sceneSector=state.sector;sceneWidth=width;overlay.replaceChildren();
  const svg=svgElement('svg',{viewBox:`0 0 ${width} ${height}`,'aria-label':'産業の案内点とラベルの対応',role:'group'});svg.classList.add('ru-point-layer');overlay.append(svg);
  const groups=groupRuPoints(state.sector,width,height),labels=layoutRuIndustryLabels(state.sector,width,height);
  for(const label of labels){const i=ruIndustries.find(i=>i.id===label.industry)!,[x,y,x2,y2]=label.box,[a,b]=label.anchor;
   svg.append(svgElement('line',{x1:a,y1:b,x2:Math.max(x,Math.min(x2,a)),y2:Math.max(y,Math.min(y2,b)),stroke:i.color,'stroke-width':1,'data-ru-guide':i.id,'pointer-events':'none'}));
   const button=document.createElement('button');button.type='button';button.className='ru-map-label';button.dataset.ruLabel=i.id;button.style.left=x+'px';button.style.top=y+'px';button.style.setProperty('--ru-color',i.color);
   const title=document.createElement('strong'),sub=document.createElement('small');title.textContent=i.short;sub.textContent=label.place.replace(/（.*$/, '')+(visibleRuSites(state.sector).filter(s=>s.industries.includes(i.id)).length>1?' ほか':'');button.append(title,sub);button.addEventListener('click',()=>chooseIndustry(i.id));overlay.append(button);
  }
  for(const group of groups){const [x,y]=group.point,ids=[...new Set(group.sites.flatMap(s=>s.industries))].filter(id=>sectorIndustries(state.sector).some(i=>i.id===id));
   const item=ruIndustries.find(i=>i.id===ids[0])!,g=svgElement('g',{'data-ru-marker':group.id,'data-ru-sites':group.sites.map(s=>s.id).join(' '),'data-ru-industries':ids.join(' '),role:'button',tabindex:'0','aria-label':group.sites.map(s=>s.place+'：'+s.stage).join('／')});
   const hit=svgElement('circle',{cx:x,cy:y,r:12,fill:'transparent','data-ru-hit':''});g.append(hit);
   const processing=state.sector==='manufacturing'||group.sites.every(s=>/製|精錬|液化|回収|濃縮/.test(s.stage));
   const shape=processing?svgElement('rect',{x:x-7,y:y-7,width:14,height:14,rx:1}):svgElement('circle',{cx:x,cy:y,r:7});shape.setAttribute('fill',item.color);shape.setAttribute('stroke','#fff');shape.setAttribute('stroke-width','1.5');shape.setAttribute('data-ru-dot','');g.append(shape);
   if(group.sites.length>1){const count=svgElement('text',{x,y:y+3,'text-anchor':'middle',fill:'#fff','font-size':9,'font-weight':700,'pointer-events':'none'});count.textContent=String(group.sites.length);g.append(count);}
   const choose=()=>{const site=group.sites.find(s=>s.id===state.site)??group.sites.find(s=>s.industries.includes(state.industry??''))??group.sites[0];chooseSite(site);};
   g.addEventListener('click',choose);g.addEventListener('keydown',e=>{const key=(e as KeyboardEvent).key;if(key==='Enter'||key===' '){e.preventDefault();choose();}});svg.append(g);
  }
  emphasis();
 }
 function emphasis(){
  for(const node of overlay.querySelectorAll<HTMLElement>('[data-ru-label]')){const active=node.dataset.ruLabel===state.industry;node.setAttribute('aria-pressed',String(active));node.classList.toggle('is-selected',active);node.classList.toggle('is-muted',!!state.industry&&!active);node.hidden=state.only&&!active;}
  for(const node of overlay.querySelectorAll<SVGElement>('[data-ru-marker]')){const ids=node.dataset.ruIndustries!.split(' '),matches=!state.industry||ids.includes(state.industry),selected=node.dataset.ruSites!.split(' ').includes(state.site??'');node.setAttribute('aria-pressed',String(selected));node.classList.toggle('is-muted',!matches);node.style.display=state.only&&!matches?'none':'';node.setAttribute('tabindex',state.only&&!matches?'-1':'0');const shape=node.querySelector('[data-ru-dot]')!;shape.setAttribute('stroke',selected?'#111':'#fff');shape.setAttribute('stroke-width',selected?'3':'1.5');const color=ruIndustries.find(i=>i.id===(state.industry&&ids.includes(state.industry)?state.industry:ids[0]))!.color;shape.setAttribute('fill',color);}
  for(const node of overlay.querySelectorAll<SVGElement>('[data-ru-guide]')){const active=node.dataset.ruGuide===state.industry;node.style.display=state.only&&!active?'none':'';node.style.opacity=state.industry&&!active?'.2':'.6';}
 }
 function render(){
  const focused=document.activeElement as HTMLElement|null,focusedSite=focused?.dataset.ruSiteChoice,focusedProduct=focused?.dataset.ruSiteProduct;
  const sector=ruSectors.find(s=>s.id===state.sector)!,item=ruIndustries.find(i=>i.id===state.industry),site=ruSites.find(s=>s.id===state.site);
  root.dataset.ruSector=state.sector;root.dataset.ruProduct=state.industry??'all';q('#ru-industry-panel').setAttribute('aria-labelledby','ru-sector-'+state.sector);
  for(const tab of root.querySelectorAll<HTMLButtonElement>('[data-ru-sector]')){const active=tab.dataset.ruSector===state.sector;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  for(const row of root.querySelectorAll<HTMLElement>('[data-ru-products]'))row.hidden=row.dataset.ruProducts!==state.sector;
  for(const button of root.querySelectorAll<HTMLElement>('[data-ru-product]'))button.setAttribute('aria-pressed',String(button.dataset.ruProduct===state.industry));
  q('[data-ru-title]').textContent=item?.name??sector.name;q('[data-ru-reading]').textContent=item?.reading??sector.reading;q('[data-ru-why]').textContent=item?.why??sector.why;
  q('[data-ru-chain]').textContent=item?.chain??'資源・製造・役務は学習のための分類です。採掘と加工の重複表示を含み、統計を足し合わせません。';
  q('[data-ru-selected]').hidden=!site;if(site){q('[data-ru-site-title]').textContent=site.place;q('[data-ru-site-stage]').textContent=site.stage;q('[data-ru-site-note]').textContent=site.note+' 位置：'+ruSources[site.positionSource].title+'（'+site.positionName+'）。';sourceLinks(q('[data-ru-site-sources]'),[...site.sourceIds,site.positionSource]);}
  const group=site?groupRuPoints(state.sector,canvas.clientWidth||960,canvas.clientHeight||477).find(g=>g.sites.some(s=>s.id===site.id)):null;
  q('[data-ru-nearby]').hidden=!group||group.sites.length<2;const nearby=q('[data-ru-nearby-list]');nearby.replaceChildren();if(group&&group.sites.length>1)for(const s of group.sites){const button=document.createElement('button');button.type='button';button.textContent=s.place;button.setAttribute('aria-pressed',String(s.id===site?.id));button.addEventListener('click',()=>chooseSite(s));nearby.append(button);}
  q('[data-ru-clear]').hidden=!item;q('[data-ru-only-wrap]').hidden=!item;q<HTMLInputElement>('[data-ru-only]').checked=state.only;
  const list=q('[data-ru-site-list]');list.replaceChildren();for(const s of visibleRuSites(state.sector)){for(const i of sectorIndustries(state.sector).filter(i=>s.industries.includes(i.id))){const button=document.createElement('button');button.type='button';button.dataset.ruSiteChoice=s.id;button.dataset.ruSiteProduct=i.id;button.textContent=i.short+'｜'+s.place;button.setAttribute('aria-pressed',String(s.id===state.site&&i.id===state.industry));button.addEventListener('click',()=>chooseSite(s,i.id));list.append(button);}}
  sourceLinks(q('[data-ru-reading-sources]'),item?.sourceIds??['usgs','eia','ports']);
  q('[data-ru-stat-scope]').textContent=item?item.name+'：年・製品段階・報告主体は各数値に付記。全国量を地図の地点に配分しません。':sector.name+'：各産業の統計を開くと、生産・世界シェア・貿易の分母と一次資料を確認できます。';
  for(const card of root.querySelectorAll<HTMLDetailsElement>('[data-ru-stat]')){card.hidden=state.industry?card.dataset.ruStat!==state.industry:!card.dataset.sectors!.split(' ').includes(state.sector);card.open=!!state.industry&&card.dataset.ruStat===state.industry;}
  draw();root.dataset.ruReady='true';
  if(focusedSite&&focusedProduct)root.querySelector<HTMLElement>(`[data-ru-site-choice="${focusedSite}"][data-ru-site-product="${focusedProduct}"]`)?.focus({preventScroll:true});
 }
 for(const button of root.querySelectorAll<HTMLElement>('[data-ru-sector]')){const choose=()=>save({sector:button.dataset.ruSector as RuSector,industry:null,site:null,only:false});button.addEventListener('click',choose);button.addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-ru-sector]')],index=tabs.indexOf(button as HTMLButtonElement),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});}
 for(const button of root.querySelectorAll<HTMLElement>('[data-ru-product]'))button.addEventListener('click',()=>chooseIndustry(button.dataset.ruProduct!));
 q('[data-ru-clear]').addEventListener('click',()=>save({...state,industry:null,site:null,only:false}));
 q<HTMLInputElement>('[data-ru-only]').addEventListener('change',event=>save({...state,only:(event.target as HTMLInputElement).checked}));
 window.addEventListener('popstate',()=>{state=readRuIndustryState(new URL(location.href));render();});
 const observer=new ResizeObserver(()=>draw());observer.observe(canvas);render();
}
