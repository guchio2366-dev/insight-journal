import {canadaLegacyPoint} from '../lib/atlas-canada-map-presentation';
import {canadaDemographicShare} from '../lib/atlas-canada-demographics';
import {demographicComposition,ethnicColors} from '../lib/atlas-canada-concentration';
import {canadaReligionComposition,canadaReligionColor} from '../lib/atlas-canada-religion-view';
import {placePilotLabel} from '../lib/atlas-canada-industry-labels';

/** Source CD/CMA totals are labelled as aggregates. No local distribution is inferred. */
export function renderCanadaDemographicReferences(root:HTMLElement,config:any,demographic:any,state:any,choosePlace?:(id:string,level:'cma'|'cd')=>void){
 const map=root.querySelector<SVGSVGElement>('[data-population-map]');if(!map)return;const frame=map.closest<HTMLElement>('.atlas-map-frame');if(!frame)return;
 let shapes=map.querySelector<SVGGElement>('[data-demographic-reference-outlines]');
 let labels=frame.querySelector<HTMLElement>('[data-demographic-reference-labels]');
 if(!shapes){shapes=document.createElementNS('http://www.w3.org/2000/svg','g');shapes.dataset.demographicReferenceOutlines='';shapes.setAttribute('aria-hidden','true');map.querySelector('[data-population-regions]')!.before(shapes);}
 if(!labels){labels=document.createElement('div');labels.className='demographic-reference-labels';labels.dataset.demographicReferenceLabels='';frame.append(labels);}
 const topic=demographic.topic;shapes.style.display=topic==='distribution'?'none':'';labels.hidden=topic==='distribution';
 if(topic==='distribution')return;
 shapes.replaceChildren();
 const filtered=new URL(location.href).searchParams.get('mapGroup')==='1',colors=topic==='ethnicity'?ethnicColors:canadaReligionColor,data=config.demographics[topic];
 const examples:({level:'cma'|'cd';id:string;groups?:string[];name?:string})[]=topic==='ethnicity'
  ?['933','932','825','835','602','705','725','535','505','462'].map(id=>({level:'cma' as const,id}))
  :[{level:'cma',id:'933',groups:['25']},{level:'cd',id:'6001',groups:['25'],name:'ユーコン'},{level:'cd',id:'2492',groups:['8'],name:'ケベック内陸'},{level:'cd',id:'1005',groups:['6'],name:'ニューファンドランド'},{level:'cd',id:'6204',groups:['6'],name:'バフィン島周辺'},{level:'cd',id:'3521',groups:['21','19','22'],name:'Peel（トロント西側）'},{level:'cma',id:'505',groups:['21']},{level:'cma',id:'462',groups:['21']}];
 if(topic==='ethnicity')examples.push({level:'cd',id:'6205',groups:['87'],name:'ハドソン湾西岸'},{level:'cd',id:'6204',groups:['87'],name:'バフィン島周辺'});
 if(filtered){const top=data.cmas.map((r:any)=>({r,share:canadaDemographicShare(r.values[demographic.group]?.value??null,r.denominator.value)})).filter((v:any)=>v.share!==null&&v.share>0).sort((a:any,b:any)=>b.share-a.share).slice(0,3);for(const {r}of top.reverse()){const existing=examples.find(e=>e.level==='cma'&&e.id===r.id);if(existing)existing.groups=[demographic.group];else examples.unshift({level:'cma',id:r.id,groups:[demographic.group]});}}
 const selectedCd=new URL(location.href).searchParams.get('cd'),selected=selectedCd?{level:'cd' as const,id:selectedCd}:state.cma?{level:'cma' as const,id:state.cma}:null;
 if(selected&&!examples.some(e=>e.level===selected.level&&e.id===selected.id))examples.unshift(selected);
 const matrix=map.getScreenCTM();if(!matrix)return;const rectangle=frame.getBoundingClientRect(),occupied:number[][]=[],placements=[];
 labels.replaceChildren();
 const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.classList.add('demographic-reference-leaders');leaders.setAttribute('aria-hidden','true');labels.append(leaders);
 for(const text of root.querySelectorAll<SVGElement>('[data-population-label]'))text.style.display='none';
 for(const example of examples){
  const record=(example.level==='cd'?data.regions:data.cmas).find((r:any)=>r.id===example.id);if(!record)continue;
  const composition=topic==='ethnicity'?demographicComposition(record,data,topic):canadaReligionComposition(record,data),groups=example.groups?composition.rows.filter((g:any)=>example.groups!.includes(g.id)):composition.qualified.filter((g:any)=>topic!=='ethnicity'||['4','5','6','7','8','87'].includes(g.id));
  if(!groups.length)continue;
  const region=example.level==='cd'?map.querySelector<SVGPathElement>(`[data-population-region="${example.id}"]`):null,legacy=example.level==='cma'?config.geometry.find((g:any)=>g.id===example.id)?.point:null;if(!region&&!legacy)continue;
  const regionBox=region?.getBBox(),point=regionBox?[regionBox.x+regionBox.width/2,regionBox.y+regionBox.height/2]:canadaLegacyPoint(legacy),x=point[0]*matrix.a+matrix.e-rectangle.left,y=point[1]*matrix.d+matrix.f-rectangle.top;if(x<5||y<5||x>rectangle.width-5||y>rectangle.height-5)continue;
  const card=document.createElement('button');card.type='button';card.className='demographic-reference-label';card.dataset.referenceLevel=example.level;card.dataset.referenceId=example.id;
  const name=document.createElement('small');name.textContent=(example.name??record.name.match(/（(.+)）/)?.[1]??record.name)+(example.level==='cd'?'・CD全体':'・都市圏全体');card.append(name);
  for(const group of groups.slice(0,3)){const line=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=colors[group.id];const value=canadaDemographicShare(record.values[group.id]?.value??null,record.denominator.value);line.append(swatch,group.name.replace('アイデンティティ（別集計）','（別集計）')+' '+(value===null?'未公表':value.toFixed(1)+'%'));card.append(line);}
  card.title=(example.level==='cd'?'統計地域':'都市圏')+'全体の2021年構成。地域内の居住分布は未取得です。';if(choosePlace)card.addEventListener('click',()=>choosePlace(example.id,example.level));labels.append(card);
  const box=placePilotLabel([[x,y]],[card.offsetWidth,card.offsetHeight],[rectangle.width,rectangle.height],occupied,120);if(!box){card.remove();continue;}occupied.push(box);card.style.left=box[0]+'px';card.style.top=box[1]+'px';
  const leader=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value]of Object.entries({x1:x,y1:y,x2:Math.max(box[0],Math.min(box[2],x)),y2:Math.max(box[1],Math.min(box[3],y))}))leader.setAttribute(key,String(value));leaders.append(leader);
  card.classList.toggle('is-context',filtered&&!groups.some((g:any)=>g.id===demographic.group));placements.push({id:example.id,level:example.level,groups:groups.map((g:any)=>g.id),box,sourceAnchor:[x,y]});
 }
 (root as any).canadaDemographicReferences={topic,filtered,group:demographic.group,placements,encoding:'source-regional-composition-labels',localDistributionAvailable:false,groupDensityEstimated:false};
}
