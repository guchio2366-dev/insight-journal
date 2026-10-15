import {centralIndustries,centralIndustrySites,centralIndustryCountries,type CentralIndustryId,type CentralIndustrySector,type CentralCountry,type CentralSite} from '../data/atlas/central-asia-industry.ts';

export type CentralIndustryState={sector:CentralIndustrySector;industry:CentralIndustryId|null;site:string|null;only:boolean;country:CentralCountry|null;frame:number[]|null};
// Local equirectangular projection with a 44°N standard parallel, shared by
// all boundaries, guide coordinates and saved camera frames. Not an area scale.
export function projectCentralIndustry([lng,lat]:readonly number[]):[number,number]{return [(lng-45)*20*Math.cos(44*Math.PI/180),(56-lat)*20];}
export function centralIndustryGeometryPath(geometry:any):string{
 const rings=geometry.type==='MultiPolygon'?geometry.coordinates.flat():geometry.type==='Polygon'?geometry.coordinates:geometry.type==='MultiLineString'?geometry.coordinates:[geometry.coordinates];
 return rings.map((ring:number[][])=>ring.map((point,i)=>{const [x,y]=projectCentralIndustry(point);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('')+(geometry.type.includes('Polygon')?'Z':'')).join('');
}
const legacyIndustries:Record<string,CentralIndustryId>={'sc-oilgas':'oil','sc-minerals':'uranium','sc-cotton':'textiles','sc-hydro':'hydro'};
export function readCentralIndustryState(url:URL):CentralIndustryState{
 const p=url.searchParams,topic=p.get('topic')??'',siteCandidate=p.get('detail')??p.get('site'),rawIndustry=p.get('subsector')??legacyIndustries[topic]??topic.replace(/^central-/,''),item=centralIndustries.find(i=>i.id===rawIndustry),rawSector=p.get('sector');
 const sector:CentralIndustrySector=['resources','manufacturing','services'].includes(rawSector??'')?rawSector as CentralIndustrySector:item?.sectors[0]??'resources';
 const legacySet=topic==='sc-oilgas'?['oil','gas']:topic==='sc-minerals'?['uranium','copper','gold','chromium']:[];
 const legacySite=!p.has('subsector')?centralIndustrySites.find(s=>s.id===siteCandidate&&s.sectors.includes(sector)&&legacySet.includes(s.industry)):undefined;
 const industry=legacySite?.industry??(item?.sectors.includes(sector)?item.id:null);
 const site=centralIndustrySites.find(s=>s.id===siteCandidate&&s.sectors.includes(sector)&&(!industry||s.industry===industry));
 const parts=p.get('industryFrame')?.split(',')??[],values=parts.map(Number);
 const frame=parts.length===4&&parts.every(v=>v.trim()!=='')&&values.every(Number.isFinite)&&Math.abs(values[0])<=4000&&Math.abs(values[1])<=4000&&values[2]>=140&&values[2]<=3000&&values[3]>=100&&values[3]<=3000?values:null;
 const country=centralIndustryCountries.find(c=>c.code===p.get('place'))?.code??null;
 return {sector,industry:industry??site?.industry??null,site:site?.id??null,only:!!(industry??site)&&p.get('only')==='1',country,frame};
}
export function writeCentralIndustryState(url:URL,state:CentralIndustryState):URL{
 const next=new URL(url);
 for(const key of ['metric','year','compare','zoom','topic','detail','site','industryview','lng','lat','z','city'])next.searchParams.delete(key);
 const values={sector:state.sector,subsector:state.industry,detail:state.site,only:state.only&&state.industry?'1':null,place:state.country,industryFrame:state.frame?.map(n=>Number(n.toFixed(3))).join(',')};
 for(const [key,value]of Object.entries(values)){if(value)next.searchParams.set(key,value);else next.searchParams.delete(key);}
 return next;
}
export function centralIndustryVisibleSites(state:CentralIndustryState):CentralSite[]{return centralIndustrySites.filter(site=>site.sectors.includes(state.sector)&&(!state.only||site.industry===state.industry));}
/** Fits the entire five-country geometry, independent of selection or sector. */
export function fitCentralIndustryFrame(bounds:number[],ratio:number):number[]{
 const nw=projectCentralIndustry([bounds[0],bounds[3]]),se=projectCentralIndustry([bounds[2],bounds[1]]),width=Math.max(se[0]-nw[0]+32,(se[1]-nw[1]+40)*ratio),height=width/ratio;
 return [(nw[0]+se[0]-width)/2,(nw[1]+se[1]-height)/2,width,height];
}
export function zoomCentralIndustryFrame(frame:number[],factor:number):number[]{
 const ratio=frame[2]/frame[3],width=Math.max(Math.max(140,100*ratio),Math.min(Math.min(3000,3000*ratio),frame[2]*factor)),height=width/ratio;
 return [frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height];
}
export type CentralLabelPoint={site:CentralSite;point:number[]};
export function centralIndustryStageReading(id:CentralIndustryId,sector:CentralIndustrySector){
 const item=centralIndustries.find(item=>item.id===id)!;
 if(id==='copper')return sector==='resources'
  ?{label:'銅採掘',title:'銅の採掘・選鉱',overview:'カザフスタンのボズシャコルとアクトガイでは、大規模鉱床に沿って銅の採掘・選鉱・鉱石処理が集積しています。'}
  :{label:'銅製錬',title:'銅の製錬・精製',overview:'ジェズカズガン・バルハシ・アルマリクに銅の加工設備が分布し、鉱石・精鉱の供給、電力と輸送の接続を利用して金属銅をつくります。'};
 if(id==='chromium')return sector==='resources'
  ?{label:'クロム鉱',title:'クロム鉱石の採掘・選鉱',overview:'カザフスタン西部のフロムタウでクロム鉱石の採掘・選鉱が集積し、鉱床と自社原料が合金生産の基盤になります。'}
  :{label:'フェロクロム',title:'フェロクロム製錬',overview:'アクトベとアクスの製錬設備が、クロム鉱石と電力を組み合わせてステンレス鋼向けフェロクロムを生産します。'};
 return {label:item.shortLabel,title:item.label,overview:item.overview};
}
export function centralIndustryAnnotationLabel(site:CentralSite,sector:CentralIndustrySector):string{
 if(site.industry==='tourism')return site.stage==='交通・旅行手配'?'旅行手配':'文化観光';
 return centralIndustryStageReading(site.industry,sector).label;
}
export function centralIndustryGroupPlace(points:CentralLabelPoint[]):string{
 const ids=new Set(points.map(point=>point.site.id));
 const valley=['sc-fergana-cotton','central-andijan-textiles','central-namangan-textiles'];
 if(valley.every(id=>ids.has(id)))return ids.has('central-tashkent-clothing')?'フェルガナ盆地・タシケント':points.length===3?'フェルガナ盆地':'フェルガナ盆地ほか';
 if(['central-samarkand-tourism','central-bukhara-tourism','central-khiva-tourism'].every(id=>ids.has(id)))return 'サマルカンド・ブハラ等';
 const shortPlace=(place:string)=>place.replace('アルティンコリ／ホルゴス','ホルゴス');
 if(points.length===1)return shortPlace(points[0].site.place);
 if(points.length===2)return points.map(point=>shortPlace(point.site.place).replace(/地区|港/g,'')).join('・');
 return points[0].site.place.replace(/地区|港/g,'')+'ほか';
}
/** Geographic proximity only groups the same industry, never unrelated city functions. */
export function groupCentralIndustryLabels(points:CentralLabelPoint[],diameter=86):CentralLabelPoint[][]{
 const groups:CentralLabelPoint[][]=[];
 // These annotations contain no quantities: different periods are never summed.
 const key=(site:CentralSite)=>site.industry+'|'+site.country+'|'+site.sectors.join(',')+(site.kind==='service'?'|'+site.stage:'');
 for(const point of [...points].sort((a,b)=>a.site.id.localeCompare(b.site.id))){
  const group=groups.find(g=>key(g[0].site)===key(point.site)&&g.every(p=>Math.hypot(p.point[0]-point.point[0],p.point[1]-point.point[1])<=diameter));
  if(group)group.push(point);else groups.push([point]);
 }
 return groups.sort((a,b)=>b.length-a.length||a[0].site.id.localeCompare(b[0].site.id));
}
/** Deterministic allocation: no selected state, color or current-only filter is an input. */
export function placeCentralIndustryLabel(points:number[][],size:number[],viewport:number[],occupied:number[][],maximumLeader=40):number[]|null{
 const [width,height]=size,[mapWidth,mapHeight]=viewport,x=points.reduce((n,p)=>n+p[0],0)/points.length,y=points.reduce((n,p)=>n+p[1],0)/points.length;
 if(width>mapWidth-12||height>mapHeight-12)return null;
 const offsets:number[][]=[];
 for(let dy=-84;dy<=84;dy+=3)for(let dx=-84;dx<=84;dx+=3)offsets.push([dx,dy]);
 offsets.sort((a,b)=>a[0]**2+a[1]**2-b[0]**2-b[1]**2||a[1]-b[1]||a[0]-b[0]);
 for(const [dx,dy]of offsets){
  const left=Math.max(6,Math.min(mapWidth-width-6,x+dx-width/2)),top=Math.max(6,Math.min(mapHeight-height-6,y+dy-height/2)),box=[left,top,left+width,top+height];
  if(occupied.some(b=>box[0]<b[2]+5&&box[2]>b[0]-5&&box[1]<b[3]+5&&box[3]>b[1]-5))continue;
  if(points.some(p=>Math.hypot(p[0]-Math.max(box[0],Math.min(box[2],p[0])),p[1]-Math.max(box[1],Math.min(box[3],p[1])))>maximumLeader))continue;
  return box;
 }
 return null;
}
