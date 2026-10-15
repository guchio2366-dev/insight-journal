import {adoptedIndustries, type AdoptedIndustry, type AdoptedSector, type LabelBox} from './atlas-mexico-industry-adopted.ts';

// Display groupings only, not an official statistical geography. Anchors are
// existing source-backed state guide points, never invented facility positions.
const areas=[
 {id:'northwest',name:'北西部',states:['02','03','25','26'],anchors:['26','02','25','03']},
 {id:'north',name:'北部内陸',states:['08','10','32'],anchors:['08','10','32']},
 {id:'northeast',name:'北東部',states:['05','19','28'],anchors:['19','05','28']},
 {id:'west',name:'西部・バヒオ',states:['01','06','11','14','18','22','24'],anchors:['11','14','24','22','01','18','06']},
 {id:'central',name:'中央部',states:['09','13','15','17','21','29'],anchors:['15','09','21','13','17','29']},
 {id:'pacific',name:'南部太平洋側',states:['12','16','20'],anchors:['20','16','12']},
 {id:'gulf',name:'湾岸・南東部',states:['04','07','27','30'],anchors:['27','30','04','07']},
 {id:'peninsula',name:'ユカタン半島',states:['23','31'],anchors:['23','31']},
];
export const mexicoIndustryShortNames:Record<string,string>={
 'oil-gas':'石油・ガス',refining:'精製',silver:'銀',copper:'銅',gold:'金',zinc:'亜鉛',steel:'鉄鋼',automotive:'完成車','auto-parts':'自動車部品',computers:'コンピューター','electronic-components':'電子部品',communications:'通信機器',displays:'映像機器',refrigeration:'冷凍・空調','home-appliances':'家電',machinery:'機械',chemicals:'化学',pharmaceuticals:'医薬品',food:'食品',feed:'飼料',meat:'肉加工',beer:'ビール',tequila:'テキーラ',medical:'医療機器',aerospace:'航空部品',apparel:'衣服',tourism:'観光',logistics:'物流',professional:'専門業務',finance:'金融',digital:'IT',bpm:'BPM',construction:'建設','real-estate':'不動産',
};
const familyNames:Record<string,string>={automotive:'自動車',electronics:'電子',equipment:'機械・家電',precision:'精密製品',food:'食品・飲料',materials:'素材',energy:'精製',minerals:'銅',textiles:'衣服',tourism:'観光',logistics:'物流',business:'企業サービス',built:'建設・不動産'};
// Choose readable examples from existing source-backed members. These are
// editorial examples of supply chains, not rankings or new production claims.
const manufacturingExamples:Record<string,string[]>={northwest:['electronics','precision'],north:['automotive','electronics'],northeast:['automotive','equipment','materials'],west:['automotive','food'],central:['food','precision','materials'],pacific:['materials','food'],gulf:['energy','materials','food'],peninsula:['food','textiles']};
const resourceExamples:Record<string,string[]>={northwest:['copper','gold','oil-gas'],north:['silver','zinc','gold','copper','oil-gas'],northeast:['refining','oil-gas'],gulf:['oil-gas','refining']};
const serviceExamples:Record<string,string[]>={central:['finance','digital','logistics'],northeast:['logistics','finance','digital'],west:['digital','tourism','finance'],northwest:['bpm','digital','logistics'],peninsula:['tourism']};
const annotationOrder:Record<AdoptedSector,string[]>={resources:['gulf','northwest','north','central','northeast','pacific','peninsula','west'],manufacturing:['northeast','west','northwest','central','north','gulf','pacific','peninsula'],services:['central','northeast','peninsula','west','northwest','north','gulf','pacific']};
export type MexicoSectorCluster={id:string;name:string;anchor:string;states:string[];industries:AdoptedIndustry[];examples:string};
export function mexicoClusterIndustryName(cluster:MexicoSectorCluster,industry:AdoptedIndustry){
 const regions=industry.map.regions.filter(r=>cluster.states.includes(r.state));
 return industry.id==='oil-gas'&&regions.length&&regions.every(r=>r.stage==='ガス輸入')?'輸入ガス':mexicoIndustryShortNames[industry.id];
}
export function mexicoSectorClusters(sector:AdoptedSector):MexicoSectorCluster[]{
 const industries=adoptedIndustries.filter(i=>i.sectors.includes(sector));
 return areas.flatMap(area=>{
  const states=area.states.filter(state=>industries.some(i=>i.map.regions.some(r=>r.state===state)));
  if(!states.length)return [];
  const members=industries.filter(i=>i.map.regions.some(r=>states.includes(r.state)));
  const order=(sector==='manufacturing'?manufacturingExamples:sector==='resources'?resourceExamples:serviceExamples)[area.id]??[];
  const key=(i:AdoptedIndustry)=>sector==='manufacturing'?i.family:i.id;
  const ordered=[...members].sort((a,b)=>(order.indexOf(key(a))<0?99:order.indexOf(key(a)))-(order.indexOf(key(b))<0?99:order.indexOf(key(b))));
  const names=[...new Set(ordered.map(i=>{
   if(sector==='resources'&&i.id==='oil-gas'&&i.map.regions.filter(r=>states.includes(r.state)).every(r=>r.stage==='ガス輸入'))return '輸入ガス';
   if(sector==='services')return i.id==='bpm'?'業務支援':mexicoIndustryShortNames[i.id];
   return sector==='resources'?mexicoIndustryShortNames[i.id]:familyNames[i.family]??mexicoIndustryShortNames[i.id];
  }))];
  const examples=names.slice(0,2).join('・')+(names.length>2?'等':'');
  return [{id:area.id,name:area.name,anchor:area.anchors.find(s=>states.includes(s))!,states,industries:members,examples:[...examples].length<=9?examples:names[0]+'等'}];
 }).sort((a,b)=>annotationOrder[sector].indexOf(a.id)-annotationOrder[sector].indexOf(b.id));
}
export function mexicoSectorPoints(sector:AdoptedSector){
 const industries=adoptedIndustries.filter(i=>i.sectors.includes(sector));
 return [...new Set(industries.flatMap(i=>i.map.regions.map(r=>r.state)))].sort().map(state=>({state,industries:industries.filter(i=>i.map.regions.some(r=>r.state===state))}));
}
export const mexicoSectorLabelSize={width:116,height:30};
/** Short local annotations: bounded, disjoint, clear of guide points. No leaders.
 * Allocate from the entire sector so selection never moves the remaining labels.
 * If a very small/zoomed view has no room, omit its annotation, keeping its point
 * and the accessible external region list. Never hide source data to fit text.
 */
export function placeMexicoSectorLabels(clusters:{id:string;point:number[]}[],points:number[][],width:number,height:number):Map<string,LabelBox>{
 const {width:lw,height:lh}=mexicoSectorLabelSize,occupied:LabelBox[]=[],result=new Map<string,LabelBox>();
 for(const cluster of clusters){
  const [x,y]=cluster.point,candidates:LabelBox[]=[];
  // Near the anchor only. A failed local placement never grows a long leader.
  for(let top=Math.max(4,Math.floor(y-76));top<=Math.min(height-lh-4,y+46);top+=4)
   for(let left=Math.max(4,Math.floor(x-lw-70));left<=Math.min(width-lw-4,x+70);left+=4){
    const b:LabelBox=[left,top,left+lw,top+lh];
    if(points.some(p=>p[0]>b[0]-8&&p[0]<b[2]+8&&p[1]>b[1]-8&&p[1]<b[3]+8))continue;
    if(occupied.some(o=>b[0]<o[2]+5&&b[2]>o[0]-5&&b[1]<o[3]+5&&b[3]>o[1]-5))continue;
    candidates.push(b);
   }
  candidates.sort((a,b)=>(a[0]+lw/2-x)**2+(a[1]+lh/2-y)**2-((b[0]+lw/2-x)**2+(b[1]+lh/2-y)**2)||a[1]-b[1]||a[0]-b[0]);
  const box=candidates[0];if(box){occupied.push(box);result.set(cluster.id,box);}
 }
 return result;
}
