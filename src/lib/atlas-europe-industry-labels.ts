import { boxesOverlap, leaderEnd, type Box, type LabelInput, type LabelPlacement } from './atlas-nature-labels.ts';
import { europeIndustrySiteLabels, type EuropeIndustrySector } from './atlas-europe-industry.ts';

/** Shared names, not merged coordinates: every source point remains selectable. */
export const europeIndustryLabelClusters:Partial<Record<EuropeIndustrySector,Record<string,readonly string[]>>>={
 resources:{nyhamna:['ormen','nyhamna'],glogow:['lubin','glogow']},
 manufacturing:{mlada:['mlada','kvasiny']},
};
const names:Record<string,{title:string;place?:string}>={
 johan:{title:'石油',place:'北海'},nyhamna:{title:'天然ガス',place:'採取・処理'},kiruna:{title:'鉄鉱石'},glogow:{title:'銅',place:'採鉱・精錬'},kvilldal:{title:'水力'},gravelines:{title:'原子力'},pernis:{title:'石油精製'},
 oulu:{title:'通信機器'},kaukas:{title:'紙・パルプ'},kalundborg:{title:'医薬品'},cuxhaven_wind:{title:'風力設備'},veldhoven:{title:'半導体装置'},ludwigshafen:{title:'化学'},munich:{title:'自動車'},mlada:{title:'自動車',place:'チェコ'},lombardy_tools:{title:'工作機械'},prato_textile:{title:'繊維'},portugal_textile:{title:'繊維'},toulouse:{title:'航空機'},
 ireland_it:{title:'IT',place:'アイルランド'},london_finance:{title:'金融',place:'ロンドン'},frankfurt:{title:'金融'},rotterdam:{title:'化学'},hamburg:{title:'航空機'},kista:{title:'通信研究'},adriatic_tourism:{title:'海岸観光'},tyrol_tourism:{title:'山地観光'},
};
export function europeIndustryMapLabel(id:string,sector:EuropeIndustrySector):{title:string;place?:string}{
 if(sector==='services'){
  if(id==='rotterdam'||id==='hamburg')return {title:'港湾'};
  if(id==='oulu'||id==='kista')return {title:'IT研究'};
 }
 if(sector==='manufacturing'&&id==='glogow')return {title:'銅精錬'};
 return names[id]??{title:europeIndustrySiteLabels[id]??''};
}

/** Nearby slots only. Crowded names become dots, never distant sticky notes.
 * No selection enters the input: emphasis and solo display reserve identical slots. */
export function layoutEuropeIndustryLabels(labels:readonly LabelInput[],points:readonly LabelInput[],bounds:Box,obstacles:readonly Box[]=[]):LabelPlacement[]{
 const placed:LabelPlacement[]=[];
 for(const label of labels){
  const {anchor,width:w,height:h}=label;
  const offsets=[[9,-h/2],[-w-9,-h/2],[-w/2,9],[-w/2,-h-9],[9,-h-4],[9,4],[-w-9,-h-4],[-w-9,4],...[14,20].flatMap(gap=>[[9,-h-gap],[9,gap],[-w-9,-h-gap],[-w-9,gap]])];
  for(const [dx,dy]of offsets){
   const box={...label,left:anchor.x+dx,top:anchor.y+dy,right:anchor.x+dx+w,bottom:anchor.y+dy+h};
   if(box.left<bounds.left||box.right>bounds.right||box.top<bounds.top||box.bottom>bounds.bottom)continue;
   const end=leaderEnd(anchor,box);
   if(Math.hypot(end.x-anchor.x,end.y-anchor.y)>24)continue;
   if([...obstacles,...placed].some(other=>boxesOverlap(box,other,3)))continue;
   if(points.some(point=>point.id!==label.id&&boxesOverlap(box,{left:point.anchor.x-5,top:point.anchor.y-5,right:point.anchor.x+5,bottom:point.anchor.y+5},2)))continue;
   placed.push(box);break;
  }
 }
 return placed;
}
