import type {State} from '../data/atlas/africa-atlas.ts';
import {africaIndustrySectors,africaSectorIndustries,africaIndustrySectorSites,africaSectorSiteById,africaSectorIndustryById,africaIndustryNationalReferences,africaIndustryMapScope,type AfricaSectorSite} from '../data/atlas/africa-industry-sectors.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {placePilotLabel} from '../lib/atlas-canada-industry-labels.ts';
import {africaIndustryMapAnnotations} from '../data/atlas/africa-industry-map-annotations.ts';
import {renderAfricaIndustryStatistics} from './atlas-africa-industry-statistics.ts';

const ns='http://www.w3.org/2000/svg';
function svg(tag:string,attrs:Record<string,string|number>,text?:string){const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;}
function html<K extends keyof HTMLElementTagNameMap>(tag:K,text=''){const node=document.createElement(tag);node.textContent=text;return node;}

/** Each sector retains its own source points. Labels describe a few places, not every picker option. */
export function renderAfricaIndustry(root:HTMLElement,state:State){
 const activeFrame=root.querySelector<HTMLElement>('[data-africa-map-active=true]');
 const q=<T extends Element=HTMLElement>(selector:string)=>(activeFrame?.querySelector<T>(selector)??root.querySelector<T>(selector))!;
 let reading=root.querySelector<HTMLElement>('[data-africa-industry-reading]');
 if(!reading){reading=html('section');reading.dataset.africaIndustryReading='';reading.className='africa-industry-reading';q('.africa-detail-scroll').prepend(reading);}
 reading.hidden=state.field!=='industry';q<HTMLElement>('[data-africa-industry-return]').hidden=state.field!=='industry'||!state.industryCommodity&&!state.industryLocation;
 q<HTMLElement>('[data-africa-industry-statistics]').hidden=state.field!=='industry';
 if(state.field!=='industry')return;
 const sector=africaIndustrySectors.find(row=>row.id===state.industrySector)!,industries=africaSectorIndustries.filter(row=>row.sector===sector.id),sites=africaIndustrySectorSites(sector.id);
 const industry=africaSectorIndustryById(state.industryCommodity),selected=africaSectorSiteById(state.industryLocation);
 renderAfricaIndustryStatistics(root,sector.id,industry?.id??'');
 const roleFor=(site:AfricaSectorSite)=>site.roles.find(role=>role.sector===sector.id)!;
 const active=(site:AfricaSectorSite)=>selected?site.id===selected.id:!!industry&&roleFor(site).industry===industry.id;
 const displayed=(site:AfricaSectorSite)=>!state.industryOnly||!industry||roleFor(site).industry===industry.id;
 const text=(selector:string,value:string)=>{q(selector).textContent=value;};
 text('.africa-kicker',`アフリカ · ${sector.label}`);text('[data-theme-title]',industry?.label??sector.label);
 text('[data-theme-takeaway]',industry?.reading??sector.overview);text('[data-theme-takeaway-detail]',sector.why);
 text('[data-africa-industry-return]',`← ${sector.label}の概要へ戻る`);
 text('[data-theme-caveat]',africaIndustryMapScope);text('[data-metric-title]',`${sector.label}の分布`);text('[data-period]','資料別年');text('[data-unit]','代表位置');
 text('[data-africa-svg-title]',`アフリカの${sector.label}の分布`);text('[data-map-caption]',africaIndustryMapScope);
 text('[data-africa-svg-desc]','丸は採掘地域、四角は加工・発電またはサービスの案内点。産業名と代表的な集積を短く表示します。品目選択で札と点の位置は変わりません。');
 const sources=selected?.sources??industry?.sources??[...new Map(sites.flatMap(row=>row.sources).map(row=>[row.url,row])).values()];
 const source=q<HTMLAnchorElement>('[data-theme-source]');source.href=sources[0].url;source.textContent=sources[0].label;source.hidden=false;
 const marks=q<SVGGElement>('[data-theme-marks]');marks.replaceChildren();q('[data-themes]').replaceChildren();q('[data-theme-legend]').replaceChildren();
 const map=q<SVGSVGElement>('.africa-map'),rect=map.getBoundingClientRect(),scale=Math.min((rect.width||640)/africaWidth,(rect.height||528)/africaHeight),frame=[africaWidth*scale,africaHeight*scale];
 const points=sites.map(site=>({site,point:projectAfrica(site.coordinates).map(n=>n*scale)}));
 const occupied=points.map(({point:[x,y]})=>[x-8,y-8,x+8,y+8]);
 const pointGroups=new Map<string,SVGGElement>();
 for(const {site,point:[px,py]}of points){
  const role=roleFor(site),definition=africaSectorIndustryById(role.industry)!,[x,y]=[px/scale,py/scale],isActive=active(site),color=definition.color;
  const peers=points.filter(row=>row.point[0]===px&&row.point[1]===py),index=peers.findIndex(row=>row.site.id===site.id),radius=peers.length>1?5+3*(peers.length-1-index):5;
  const group=svg('g',{'data-africa-industry-location':site.id,'data-industry':role.industry,'data-stage':role.stage,'data-geographic-scope':site.geographicScope??'region',tabindex:displayed(site)?0:-1,role:'button','aria-label':`${definition.label} · ${site.label} · ${role.stage}を読む`,'aria-pressed':String(isActive),class:'africa-industry-hit',opacity:industry&&!isActive?.6:1});
  if(!displayed(site))group.style.display='none';
  const attrs=/採掘/.test(role.stage)?{cx:x,cy:y,r:radius/scale}:{x:x-radius/scale,y:y-radius/scale,width:2*radius/scale,height:2*radius/scale};
  group.append(svg(/採掘/.test(role.stage)?'circle':'rect',{...attrs,'data-africa-industry-point':site.id,fill:peers.length>1&&index<peers.length-1?'none':color,stroke:peers.length>1&&index<peers.length-1?color:'#fffdf8','stroke-width':1.6,'stroke-dasharray':site.status==='production'?'':'3 2','vector-effect':'non-scaling-stroke','pointer-events':'visiblePainted'}));
  if(isActive)group.append(svg('circle',{cx:x,cy:y,r:11/scale,fill:'none',stroke:color,'stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none','data-africa-industry-emphasis':site.id}));
  group.append(svg('title',{},`${site.label} · ${role.stage} · ${site.evidencePeriod} · ${site.status==='development'?'開発':site.status==='paused'?'休止':'操業資料あり'}：${site.note}`));
  marks.append(group);pointGroups.set(site.id,group as SVGGElement);
 }
 const labelGroups:{key:string;name:string;points:typeof points;color:string}[]=[];
 for(const annotation of africaIndustryMapAnnotations.filter(row=>row.sector===sector.id)){
  const guidePoints=[annotation.siteId,...(annotation.relatedSiteIds??[])].map(id=>points.find(row=>row.site.id===id)).filter((row):row is typeof points[number]=>!!row);
  if(guidePoints.length)labelGroups.push({key:annotation.siteId,name:annotation.label,points:guidePoints,color:'#29464c'});
 }
 let omitted=0;
 for(const group of labelGroups){
  const label=svg('text',{'font-size':12/scale,'font-weight':700,fill:group.color,stroke:'#fffdf8','stroke-width':2.5/scale,'paint-order':'stroke','stroke-linejoin':'round'},group.name) as SVGTextElement;
  // Measure the actual loaded font; the fallback only serves non-rendering DOM tests.
  marks.append(label);const measured=typeof label.getBBox==='function'?label.getBBox():null;
  const width=measured?.width?measured.width*scale:group.name.length*12,height=measured?.height?measured.height*scale:17;
  const box=placePilotLabel(group.points.map(row=>row.point),[width+4,height+4],frame,occupied,30);
  if(!box){label.remove();omitted++;continue;}occupied.push(box);
  if(state.industryOnly&&industry&&!group.points.some(row=>roleFor(row.site).industry===industry.id)){label.remove();continue;}
  if(state.industryOnly&&industry)label.textContent=industry.label+' · '+group.name.split(' · ').slice(1).join(' · ');
  const holder=svg('g',{'data-africa-industry-annotation':group.key,'data-sites':group.points.map(row=>row.site.id).join(','),'data-layout-box':box.join(','),role:'note','aria-label':group.name,'pointer-events':'none'});
  const nearest=group.points.map(row=>{const [x,y]=row.point,end=[Math.max(box[0],Math.min(box[2],x)),Math.max(box[1],Math.min(box[3],y))];return {row,end,distance:Math.hypot(x-end[0],y-end[1])};}).sort((a,b)=>a.distance-b.distance)[0];
  if(nearest.distance>7)holder.append(svg('line',{x1:nearest.row.point[0]/scale,y1:nearest.row.point[1]/scale,x2:nearest.end[0]/scale,y2:nearest.end[1]/scale,stroke:group.color,'stroke-width':.7,'vector-effect':'non-scaling-stroke','data-africa-industry-leader':nearest.row.site.id}));
  for(const {site}of group.points)pointGroups.get(site.id)!.setAttribute('data-label-visible','true');
  label.setAttribute('x',String((box[0]+2)/scale));label.setAttribute('y',String((box[1]+2-(measured?.y??-13/scale)*scale)/scale));holder.append(label);marks.append(holder);
 }
 marks.setAttribute('data-omitted-labels',String(omitted));
 const legend=q<HTMLElement>('[data-africa-layer-legend]'),keepLegendOpen=legend.dataset.sector===sector.id&&!!legend.querySelector('details')?.open;legend.replaceChildren();legend.dataset.sector=sector.id;q<HTMLElement>('[data-africa-actual-key]').hidden=false;
 const legendDetails=html('details'),legendChoices=html('div');legendDetails.dataset.africaIndustryLegend='';legendDetails.open=keepLegendOpen;legendDetails.append(html('summary',`産業の色と品目一覧（${industries.length}）`));
 for(const definition of industries){const button=html('button',definition.label),swatch=html('i');button.type='button';button.dataset.africaIndustryLabel=definition.id;button.setAttribute('aria-pressed',String(industry?.id===definition.id));swatch.style.background=definition.color;button.prepend(swatch);legendChoices.append(button);}
 legendDetails.append(legendChoices);legend.append(legendDetails);
 text('[data-africa-layer-caption]',`${sector.label} · ${industries.length}産業 · ${sites.length}代表位置${state.industryOnly?' · 選択産業のみ表示':''}`);
 text('[data-africa-layer-scope]',`色は産業。丸：採掘／四角：加工・発電・サービス／破線：開発・休止。産業名に添えた地名は代表例です。すべての地点は点から読めます。${omitted?'混雑した札は省略しています。':''}`);
 reading.replaceChildren();const why=html('section');why.dataset.africaIndustryWhy='';why.append(html('h3','立地と利用のつながり'),html('p',sector.why));reading.append(why);
 if(industry){reading.append(html('p',industry.reason));const label=html('label'),only=html('input');only.type='checkbox';only.dataset.africaIndustryOnly='';only.checked=state.industryOnly;label.append(only,document.createTextNode(' 選択産業だけを表示'));reading.append(label);}
 if(selected){const article=html('article');article.dataset.africaIndustrySiteReading=selected.id;article.append(html('h3',selected.label),html('p',selected.reading),html('p',`${selected.evidencePeriod} · ${selected.roles.find(role=>role.sector===sector.id)?.stage??'国全体の参考資料'}`),html('p',selected.note));if(!selected.roles.length)article.append(html('p','国全体の資料なので産地の点にはしていません。'));for(const item of selected.sources){const a=html('a',item.label);a.href=item.url;const p=html('p');p.append(a);article.append(p);}reading.append(article);}
 if(industry){const list=html('div');list.dataset.africaIndustrySites='';for(const site of sites.filter(site=>roleFor(site).industry===industry.id)){const button=html('button',site.label);button.type='button';button.dataset.africaIndustryLocation=site.id;button.setAttribute('aria-pressed',String(site.id===selected?.id));list.append(button);}reading.append(list);}
 const details=q('[data-theme-details]');details.replaceChildren();if(selected)details.append(html('h3',selected.label),html('p',selected.reading),html('p',selected.note));
 for(const item of sources){const p=html('p'),a=html('a',item.label);a.href=item.url;p.append(a);details.append(p);}
 details.append(html('p',africaIndustryMapScope),html('p','全産地の網羅や統一年の順位ではありません。資料別の期間・地理範囲と開発・休止を区別します。国全体の数値を地点へ配分しません。'));
 if(sector.id==='resources'){details.append(html('h3','産地の位置が未取得の国別参考資料'));for(const site of africaIndustryNationalReferences){const p=html('p',`${site.label} · ${site.evidencePeriod}。${site.note}`);for(const item of site.sources){const a=html('a',item.label);a.href=item.url;p.append(document.createTextNode(' · '),a);}details.append(p);}}
 q<HTMLElement>('[data-theme-comparison]').hidden=true;q<HTMLElement>('[data-theme-return]').hidden=true;q<HTMLElement>('[data-africa-statistics-key]').hidden=true;q<HTMLElement>('[data-country-statistics]').hidden=true;
 q<HTMLElement>('[data-theme-takeaway-detail]').hidden=true;q<HTMLElement>('[data-theme-caveat]').hidden=true;
}
