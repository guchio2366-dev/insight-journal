import mines from '../../public/assets/atlas/oceania-industry-v1/mines.json';
import cities from '../../public/assets/atlas/oceania-population-v1/centres.json';
import places from '../../public/assets/atlas/oceania-industry-v2/places.json';
import {oceaniaIndustryCatalog, getOceaniaCatalogItem, type OceaniaCatalogAnchor} from '../data/atlas/oceania-industry-catalog';
import {projectOceania} from './atlas-oceania-geometry';

type Country={code:string;extent:number[]};
type State={industry?:string;industryOnly?:boolean;sector?:string;sectorOnly?:boolean};
export function resolveOceaniaIndustryAnchor(anchor:OceaniaCatalogAnchor,countries:Country[]){
 if(anchor.kind==='country'){
  const c=countries.find(c=>c.code===anchor.key);if(!c)throw new Error('Missing country locator: '+anchor.key);
  return {point:[(c.extent[0]+c.extent[2])/2,(c.extent[1]+c.extent[3])/2],source:'boundaries',meaning:'国計の注記位置（施設ではない）',coordinate:null};
 }
 const record=anchor.kind==='mine'?mines.records.find(m=>m.name===anchor.key):anchor.kind==='city'?cities.centres.find(c=>c.id===anchor.key):places.places.find(p=>p.id===anchor.key);
 if(!record)throw new Error('Missing saved industry locator: '+anchor.key);
 const coordinate=anchor.kind==='mine'?[(record as typeof mines.records[number]).longitude,(record as typeof mines.records[number]).latitude]:(record as typeof cities.centres[number]).coordinates;
 return {point:projectOceania(coordinate),source:anchor.kind==='mine'?'mines':anchor.kind==='city'?'cities':'saved-place',meaning:anchor.kind==='mine'?'2025年鉱山原本の地点':anchor.kind==='city'?'都市中心の案内（工場敷地ではない）':'保存一次資料の代表・案内位置',coordinate};
}
export function oceaniaCatalogMineTags(group:string){return oceaniaIndustryCatalog.filter(item=>item.mineGroups.includes(group)).map(item=>item.id);}
export function oceaniaCatalogMatches(id:string,state:State){const item=getOceaniaCatalogItem(id);return !!item&&(!state.sector||item.sector===state.sector)&&(!state.industry||id===state.industry);}
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Box={x:number;y:number;width:number;height:number};
const overlaps=(a:Box,b:Box)=>a.x<b.x+b.width+3&&a.x+a.width+3>b.x&&a.y<b.y+b.height+3&&a.y+a.height+3>b.y;
const shortLabels:Record<string,string>={'met-coal':'原料炭','thermal-coal':'一般炭',lng:'LNG','rare-earths':'レアアース',aluminium:'アルミ工程',meat:'食肉加工',wood:'木材加工',tuna:'水産加工',education:'留学・教育'};
/** Layout always consumes the complete catalog, independent of selection/only.
 * Callout correspondences are annotation lines, never transport/trade flows. */
export function renderOceaniaIndustryCatalogMap(state:State,countries:Country[],frame:number[],screen:{width:number;height:number},forceCompact=false){
 const factor=Math.min(screen.width/frame[2],screen.height/frame[3]);
 const w=frame[2]*factor,h=frame[3]*factor,compact=w<560||forceCompact;
 const width=Math.min(compact?(w<480?(w-33)/4:132):190,w/2-12),height=compact?(w<480?20:24):66;
 // Large source country extents discourage cards covering the main land masses.
 // This changes annotation placement only, never geographic source geometry.
 const land=countries.filter(c=>['AUS','NZL','PNG'].includes(c.code)).map(c=>({x:(c.extent[0]-frame[0])*factor,y:(c.extent[1]-frame[1])*factor,width:(c.extent[2]-c.extent[0])*factor,height:(c.extent[3]-c.extent[1])*factor}));
 const cover=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))/(a.width*a.height);
 const nameEntries: [string,string,number[]|null][]=[['AUS','豪州',[134,-25]],['NZL','NZ',[173,-41]],['PNG','PNG',[145,-6]],['NCL','ニューカレドニア',null],['FJI','フィジー',[178,-18]],['WSM','サモア',[188.2,-13.8]]];
 const names=nameEntries.map(([code,name,coordinate])=>{const c=countries.find(c=>c.code===code)!;const p=coordinate?projectOceania(coordinate):[(c.extent[0]+c.extent[2])/2,(c.extent[1]+c.extent[3])/2];const textWidth=name.length*(compact?9:12)+8;return {name,p,box:{x:(p[0]-frame[0])*factor-textWidth/2,y:(p[1]-frame[1])*factor-22,width:textWidth,height:19}};});
 // Saved guide/port markers stay at their source coordinates and must remain
 // directly clickable underneath the catalog. Reserve their screen hit area.
 const markerBoxes=places.places.map(place=>{const p=projectOceania(place.coordinates);return {x:(p[0]-frame[0])*factor-10,y:(p[1]-frame[1])*factor-10,width:20,height:20};});
 const occupied:Box[]=[...markerBoxes,...(compact?[]:names.map(n=>n.box))],layout:Box[]=[];
 for(const item of oceaniaIndustryCatalog){
  const resolved=resolveOceaniaIndustryAnchor(item.anchors[0],countries),[x,y]=resolved.point;
  const px=(x-frame[0])*factor,py=(y-frame[1])*factor;
  const candidates:Box[]=[];
  // Narrow layouts need to use the space between reserved geographic points,
  // rather than losing whole fixed-grid cells around each point.
  for(let cy=5;cy+height<h-4;cy+=compact?4:height+7)for(let cx=5;cx+width<w-4;cx+=compact?5:width+7)candidates.push({x:cx,y:cy,width,height});
  const score=(b:Box)=>Math.hypot(b.x+width/2-px,b.y+height/2-py)+(compact?100:450)*land.reduce((n,c)=>n+cover(b,c),0);
  candidates.sort((a,b)=>score(a)-score(b));
  const box=candidates.find(b=>!occupied.some(a=>overlaps(a,b)));
  if(!box){
   // Country-name reservations can exhaust the detailed-card grid at
   // intermediate PC widths. Rebuild the complete, fixed layout with the
   // compact names; selection never participates in this decision.
   if(!compact)return renderOceaniaIndustryCatalogMap(state,countries,frame,screen,true);
   throw new Error('Industry labels cannot fit viewport '+w+'x'+h);
  }
  occupied.push(box);layout.push(box);
 }
 return `<g data-oceania-catalog-map="true">${oceaniaIndustryCatalog.map((item,i)=>{
  const b=layout[i],source=resolveOceaniaIndustryAnchor(item.anchors[0],countries),color=item.sector==='resources'?'#78472e':item.sector==='manufacturing'?'#25575a':'#674484';
  const x=frame[0]+b.x/factor,y=frame[1]+b.y/factor,match=oceaniaCatalogMatches(item.id,state),selected=state.industry===item.id;
  const show=!(state.industryOnly&&state.industry&&item.id!==state.industry)&&!(state.sectorOnly&&state.sector&&state.sector!==item.sector);
  const label=shortLabels[item.id]??item.label;
  const lines=[item.mapMeasure.slice(0,16),item.mapMeasure.slice(16)].filter(Boolean);
  const anchors=item.anchors.map(a=>{const r=resolveOceaniaIndustryAnchor(a,countries),[ax,ay]=r.point;return `<rect pointer-events="none" data-oceania-catalog-anchor="${escape(item.id)}" data-anchor-kind="${a.kind}" data-anchor-key="${escape(a.key)}" data-coordinate="${r.coordinate?.join(',')??''}" x="${ax-3/factor}" y="${ay-3/factor}" width="${6/factor}" height="${6/factor}" fill="${a.kind==='city'||a.kind==='country'?'#fff':color}" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"><title>${escape(item.label+'：'+a.label+'。'+r.meaning)}</title></rect>`;}).join('');
  return `<g data-oceania-product-mark="${item.id}" data-catalog-sector="${item.sector}" data-catalog-match="${match}" style="${show?'':'display:none'}">${anchors}<path d="M${source.point[0]} ${source.point[1]}L${x+b.width/(2*factor)} ${y+b.height/(2*factor)}" fill="none" pointer-events="none" stroke="${color}" stroke-opacity=".5" stroke-width=".7" vector-effect="non-scaling-stroke"/><g role="button" tabindex="0" aria-pressed="${selected}" aria-label="${escape(item.label+'の分布と統計を読む')}" data-oceania-product-label="${item.id}" data-label-box="${[x,y,b.width/factor,b.height/factor].join(',')}"><title>${escape(item.geography+' '+item.scale.text+' '+item.world.text+' '+item.concentration.text+' '+item.anchors[0].label+'：'+source.meaning+'。'+item.mapMeasure+'。注記線は輸送経路ではない。')}</title><rect x="${x}" y="${y}" width="${b.width/factor}" height="${b.height/factor}" rx="${3/factor}" fill="#fffdf4" stroke="${color}" stroke-width="${selected?2.5:1}" vector-effect="non-scaling-stroke"/><text x="${x+7/factor}" y="${y+(compact?(w<480?14:17):20)/factor}" font-size="${(compact?11:14)/factor}" font-weight="700" fill="${color}">${escape(label)}</text>${compact?'':lines.map((line,j)=>`<text x="${x+8/factor}" y="${y+(37+j*14)/factor}" font-size="${10/factor}" fill="#32434a">${escape(line)}</text>`).join('')}</g></g>`;
 }).join('')}<g pointer-events="none" data-catalog-country-names="true">${names.filter(n=>!compact||!layout.some(b=>overlaps(b,n.box))).map(({p,name})=>`<text x="${p[0]}" y="${p[1]-7/factor}" font-size="${(compact?9:12)/factor}" text-anchor="middle" fill="#203c48" stroke="#fffdf4" stroke-width="3" paint-order="stroke" vector-effect="non-scaling-stroke">${name}</text>`).join('')}</g></g>`;
}
