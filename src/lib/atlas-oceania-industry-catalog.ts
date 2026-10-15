import mines from '../../public/assets/atlas/oceania-industry-v1/mines.json';
import cities from '../../public/assets/atlas/oceania-population-v1/centres.json';
import places from '../../public/assets/atlas/oceania-industry-v2/places.json';
import {oceaniaIndustryCatalog, getOceaniaCatalogItem, type OceaniaCatalogAnchor, type OceaniaCatalogSector} from '../data/atlas/oceania-industry-catalog';
import {projectOceania} from './atlas-oceania-geometry';

type Country={code:string;extent:number[]};
type State={industry?:string;industryOnly?:boolean;sector?:string;sectorOnly?:boolean};
// Reuse the existing basemap's country-name guides for countries whose remote
// islands distort the extent centre. These are annotation positions, not plants.
const countryNameGuides:Record<string,number[]>={AUS:[134,-25],NZL:[173,-41],PNG:[145,-6]};
export function resolveOceaniaIndustryAnchor(anchor:OceaniaCatalogAnchor,countries:Country[]){
 if(anchor.kind==='country'){
  const c=countries.find(c=>c.code===anchor.key);if(!c)throw new Error('Missing country locator: '+anchor.key);
  return {point:countryNameGuides[c.code]?projectOceania(countryNameGuides[c.code]):[(c.extent[0]+c.extent[2])/2,(c.extent[1]+c.extent[3])/2],source:'boundaries',meaning:'国計の注記位置（施設ではない）',coordinate:null};
 }
 const record=anchor.kind==='mine'?mines.records.find(m=>m.name===anchor.key):anchor.kind==='city'?cities.centres.find(c=>c.id===anchor.key):places.places.find(p=>p.id===anchor.key);
 if(!record)throw new Error('Missing saved industry locator: '+anchor.key);
 const coordinate=anchor.kind==='mine'?[(record as typeof mines.records[number]).longitude,(record as typeof mines.records[number]).latitude]:(record as typeof cities.centres[number]).coordinates;
 return {point:projectOceania(coordinate),source:anchor.kind==='mine'?'mines':anchor.kind==='city'?'cities':'saved-place',meaning:anchor.kind==='mine'?'2025年鉱山原本の地点':anchor.kind==='city'?'都市中心の案内（工場敷地ではない）':'保存一次資料の代表・案内位置',coordinate};
}
export function oceaniaCatalogMineTags(group:string){return oceaniaIndustryCatalog.filter(item=>item.mineGroups.includes(group)).map(item=>item.id);}
export function oceaniaCatalogSector(state:State):OceaniaCatalogSector{return state.sector==='manufacturing'||state.sector==='services'?state.sector:'resources';}
export function oceaniaCatalogMatches(id:string,state:State){const item=getOceaniaCatalogItem(id);return !!item&&item.sector===oceaniaCatalogSector(state)&&(!state.industry||id===state.industry);}
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Box={x:number;y:number;width:number;height:number};
const overlaps=(a:Box,b:Box)=>a.x<b.x+b.width+3&&a.x+a.width+3>b.x&&a.y<b.y+b.height+3&&a.y+a.height+3>b.y;
const shortLabels:Record<string,string>={'met-coal':'石炭','thermal-coal':'石炭',lng:'LNG','rare-earths':'希土類',aluminium:'アルミ工程',meat:'食肉加工',wood:'木材加工',tuna:'水産加工',steel:'鉄鋼',education:'留学・教育'};
const sectorColors={resources:'#78472e',manufacturing:'#25575a',services:'#674484'};
type Caption={ids:string[];group:string;label:string;point:number[];anchors:{item:string;anchor:OceaniaCatalogAnchor}[];national:boolean};
/** One sector per scene. Nearby locations of the same industry share a caption;
 * source points stay at their saved coordinates. Industry selection never enters
 * the grouping/placement calculation. Captions are explanatory text, not menus. */
export function renderOceaniaIndustryCatalogMap(state:State,countries:Country[],frame:number[],screen:{width:number;height:number}){
 const sector=oceaniaCatalogSector(state),items=oceaniaIndustryCatalog.filter(i=>i.sector===sector);
 const factor=Math.min(screen.width/frame[2],screen.height/frame[3]),w=frame[2]*factor,h=frame[3]*factor,compact=w<560;
 const font=compact?11:12,groups:Caption[]=[],mergeDistance=compact?28:36;
 for(const item of items)for(const anchor of item.anchors){
  // Manufacturing shows processing/urban guides, not the upstream mine inventory.
  if(sector==='manufacturing'&&anchor.kind==='mine')continue;
  // These country notes describe upstream logs or fishing waters, not factories.
  if(sector==='manufacturing'&&anchor.kind==='country'&&['wood','tuna'].includes(item.id))continue;
  const point=resolveOceaniaIndustryAnchor(anchor,countries).point;
  if(point[0]<frame[0]||point[0]>frame[0]+frame[2]||point[1]<frame[1]||point[1]>frame[1]+frame[3])continue;
  const group=['met-coal','thermal-coal'].includes(item.id)?'coal':item.id,national=anchor.kind==='country';
  const existing=groups.find(g=>g.group===group&&g.national===national&&Math.hypot(g.point[0]-point[0],g.point[1]-point[1])*factor<=(group==='education'&&!compact?55:mergeDistance));
  if(existing){if(!existing.ids.includes(item.id))existing.ids.push(item.id);existing.anchors.push({item:item.id,anchor});}
  else groups.push({ids:[item.id],group,label:(shortLabels[item.id]??item.label)+(national?'（全国）':''),point,anchors:[{item:item.id,anchor}],national});
 }
 const nameEntries:[string,string,number[]|null][]=[['AUS','豪州',[134,-25]],['NZL','NZ',[173,-41]],['PNG','PNG',[145,-6]],['NCL',compact?'NC':'ニューカレドニア',null],['FJI','フィジー',[178,-18]],['WSM','サモア',[188.2,-13.8]]];
 const names=nameEntries.map(([code,name,coordinate])=>{const c=countries.find(c=>c.code===code)!;const p=coordinate?projectOceania(coordinate):[(c.extent[0]+c.extent[2])/2,(c.extent[1]+c.extent[3])/2];return {name,p,box:{x:(p[0]-frame[0])*factor-name.length*font/2-3,y:(p[1]-frame[1])*factor-21,width:name.length*font+6,height:18}};});
 const markerBoxes=groups.filter(g=>!g.national).flatMap(g=>g.anchors.map(({anchor})=>{const p=resolveOceaniaIndustryAnchor(anchor,countries).point;return {x:(p[0]-frame[0])*factor-4,y:(p[1]-frame[1])*factor-4,width:8,height:8};}));
 const occupied:Box[]=[...names.map(n=>n.box),...markerBoxes];
 const color=sectorColors[sector],maxLeader=compact?28:42;
 const captions=groups.map(g=>{
  const px=(g.point[0]-frame[0])*factor,py=(g.point[1]-frame[1])*factor;
  const width=g.label.length*font+4,height=18,candidates:Box[]=[];
  for(const d of [7,15,25])for(const [x,y]of [[px+d,py-height/2],[px-d-width,py-height/2],[px-width/2,py-d-height],[px-width/2,py+d],[px+d,py-d-height],[px+d,py+d],[px-d-width,py-d-height],[px-d-width,py+d]]){
   const b={x,y,width,height},edgeX=Math.max(x,Math.min(px,x+width)),edgeY=Math.max(y,Math.min(py,y+height));
   if(x>=3&&y>=3&&x+width<=w-3&&y+height<=h-3&&Math.hypot(px-edgeX,py-edgeY)<=maxLeader)candidates.push(b);
  }
  const box=candidates.find(b=>!occupied.some(a=>overlaps(a,b)));if(box)occupied.push(box);
  return {g,box};
 });
 const dropped=captions.filter(c=>!c.box).length;
 return `<g data-oceania-catalog-map="true" data-active-sector="${sector}" data-caption-omissions="${dropped}">${captions.map(({g,box})=>{
  const match=!state.industry||g.ids.includes(state.industry);if(state.industryOnly&&!match)return '';
  const coordinateTitle=g.anchors.map(({anchor})=>{const p=resolveOceaniaIndustryAnchor(anchor,countries);return anchor.label+'：'+p.meaning;}).join('／');
  const details=g.ids.map(id=>{const i=getOceaniaCatalogItem(id)!;return i.geography+' '+i.stages;}).join(' ');
  const points=g.anchors.filter(({anchor})=>anchor.kind==='city').map(({anchor,item})=>{const r=resolveOceaniaIndustryAnchor(anchor,countries),[x,y]=r.point;return `<rect pointer-events="none" data-oceania-catalog-anchor="${item}" data-anchor-kind="${anchor.kind}" data-anchor-key="${escape(anchor.key)}" data-coordinate="${r.coordinate?.join(',')??''}" x="${x-2.5/factor}" y="${y-2.5/factor}" width="${5/factor}" height="${5/factor}" fill="${anchor.kind==='mine'?color:'#fffdf4'}" stroke="${sector==='resources'?'#526f77':color}" stroke-width="1.1" vector-effect="non-scaling-stroke"><title>${escape(coordinateTitle)}</title></rect>`;}).join('');
  if(!box)return `<g data-oceania-product-mark="${g.ids[0]}" data-caption-products="${g.ids.join(' ')}" data-catalog-sector="${sector}" data-catalog-match="${match}">${points}</g>`;
  const x=frame[0]+box.x/factor,y=frame[1]+box.y/factor,px=(g.point[0]-frame[0])*factor,py=(g.point[1]-frame[1])*factor;
  const ex=Math.max(box.x,Math.min(px,box.x+box.width)),ey=Math.max(box.y,Math.min(py,box.y+box.height)),length=Math.hypot(px-ex,py-ey);
  const leader=!g.national&&length>10?`<path data-oceania-caption-leader="true" data-length-px="${length}" d="M${g.point[0]} ${g.point[1]}L${frame[0]+ex/factor} ${frame[1]+ey/factor}" fill="none" stroke="${color}" stroke-opacity=".55" stroke-width=".7" vector-effect="non-scaling-stroke"/>`:'';
  return `<g pointer-events="none" data-oceania-product-mark="${g.ids[0]}" data-caption-products="${g.ids.join(' ')}" data-catalog-sector="${sector}" data-catalog-match="${match}">${points}${leader}<g data-oceania-product-label="${g.ids[0]}" data-caption-national="${g.national}" data-caption-key="${escape(g.group+'-'+g.anchors[0].anchor.kind+'-'+g.anchors[0].anchor.key)}" data-label-box="${[x,y,box.width/factor,box.height/factor].join(',')}"><title>${escape(details+' '+coordinateTitle+'。規模・年・定義は地図下。全国注記は施設の位置ではない。')}</title><text x="${x+2/factor}" y="${y+13/factor}" font-size="${font/factor}" font-weight="${match?650:500}" fill="${color}" stroke="#fffdf4" stroke-width="3" paint-order="stroke" vector-effect="non-scaling-stroke">${escape(g.label)}</text></g></g>`;
 }).join('')}<g pointer-events="none" data-catalog-country-names="true">${names.map(({p,name})=>`<text x="${p[0]}" y="${p[1]-7/factor}" font-size="${font/factor}" text-anchor="middle" fill="#203c48" stroke="#fffdf4" stroke-width="3" paint-order="stroke" vector-effect="non-scaling-stroke">${name}</text>`).join('')}</g></g>`;
}
