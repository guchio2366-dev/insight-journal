import anchors from '../data/atlas/europe/pew-religion-anchors.json' with {type:'json'};
import { pew2020EuropeGroups, pew2020EuropeRow } from '../data/atlas/europe/pew-religion-2020';
import { europeReligionNationalProfiles } from '../data/atlas/europe/religion-national-overview';

type Point={x:number;y:number};
type Project=(coordinates:[number,number])=>Point;

/** Small country-total compositions. Positions derive from the mapped country polygons. */
export function createEuropePewMarkers(stage:HTMLElement,onSelect:(code:string)=>void){
  const layer=document.createElement('div');layer.className='eu-pew-markers';layer.dataset.euPewMarkers='';layer.hidden=true;
  const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');guides.classList.add('eu-pew-marker-guides');guides.setAttribute('aria-hidden','true');layer.append(guides);
  const detailedCountries=new Set(europeReligionNationalProfiles.map(profile=>profile.country));
  const nodes=anchors.map(anchor=>{
    const row=pew2020EuropeRow(anchor.code)!;
    const button=document.createElement('button');button.type='button';button.className='eu-pew-marker';button.dataset.euPewMarker=anchor.code;
    button.title=`${anchor.code} · ${pew2020EuropeGroups.map((group,index)=>`${group.label} ${row.shares[index]}%`).join('、')}`;
    button.setAttribute('aria-label',button.title+'。国の詳細を読む');
    const bar=document.createElement('span');bar.className='eu-pew-marker-bar';bar.setAttribute('aria-hidden','true');
    for(const [index,group] of pew2020EuropeGroups.entries()){
      const share=row.shares[index];
      const segment=document.createElement('i');segment.style.width=`${share==='<0.1'?.05:Number(share)}%`;segment.style.background=group.color;bar.append(segment);
    }
    button.append(bar);button.addEventListener('click',event=>{event.stopPropagation();onSelect(anchor.code);});layer.append(button);
    const guide=document.createElementNS('http://www.w3.org/2000/svg','line');guides.append(guide);
    return {anchor,button,guide};
  });
  const note=document.createElement('p');note.className='eu-pew-region-note';note.dataset.euPewNote='';
  note.textContent='中欧：チェコ 無所属72.8%／南東欧：コソボ イスラム教94.3%／東欧：ルーマニア キリスト教98.5%';
  layer.append(note);
  stage.append(layer);
  const candidates=([-40,-32,-24,-16,-8,0,8,16,24,32,40].flatMap(x=>[-32,-24,-16,-8,0,8,16,24,32].map(y=>[x,y] as [number,number])))
    .sort((a,b)=>Math.hypot(...a)-Math.hypot(...b)||Math.abs(a[1])-Math.abs(b[1]));
  function update(active:boolean,project:Project){
    layer.hidden=!active;if(!active)return;
    const width=stage.clientWidth,height=stage.clientHeight;
    const stageRect=stage.getBoundingClientRect(),caption=stage.querySelector<HTMLElement>('.eu-map-heading')?.getBoundingClientRect();
    const safeBottom=caption?caption.top-stageRect.top-4:height-43;
    const barWidth=width<620?28:33,barHeight=11;
    const occupied:{left:number;top:number;right:number;bottom:number}[]=[];
    // Place large countries first. Nearby small-country bars may move at most
    // 24 px; none are sent to a distant legend or disconnected from the map.
    const priority=['FRA','DEU','GBR','ITA','ESP','POL','ROU','UKR','SWE','NOR','FIN','RUS','CZE','NLD','ALB','BIH','KOS'];
    const rank=(code:string)=>{const index=priority.indexOf(code);return index<0?100:index;};
    const ordered=[...nodes].sort((a,b)=>rank(a.anchor.code)-rank(b.anchor.code)||a.anchor.code.localeCompare(b.anchor.code));
    for(const {anchor,button,guide} of ordered){
      const point=project(anchor.coordinates as [number,number]);
      // A separately sourced national denominator and denomination bar takes
      // this country's visible position; Pew remains in its selected reading.
      const offscreen=detailedCountries.has(anchor.code)||point.x<7||point.x>width-7||point.y<12||point.y>safeBottom+24;
      button.hidden=offscreen;guide.style.display=offscreen?'none':'';if(offscreen)continue;
      let chosen=candidates[0],best=Infinity;
      for(const candidate of candidates){
        const x=point.x+candidate[0],y=point.y+candidate[1];
        const rect={left:x-barWidth/2,top:y-barHeight/2,right:x+barWidth/2,bottom:y+barHeight/2};
        if(rect.left<2||rect.right>width-2||rect.top<2||rect.bottom>safeBottom)continue;
        const intersections=occupied.reduce((sum,box)=>sum+Math.max(0,Math.min(rect.right,box.right)-Math.max(rect.left,box.left))*Math.max(0,Math.min(rect.bottom,box.bottom)-Math.max(rect.top,box.top)),0);
        const score=intersections*10+Math.hypot(...candidate);
        if(score<best){best=score;chosen=candidate;}
        if(!intersections)break;
      }
      if(best===Infinity){button.hidden=true;guide.style.display='none';continue;}
      const x=point.x+chosen[0],y=point.y+chosen[1];
      button.style.left=`${x}px`;button.style.top=`${y}px`;
      button.classList.toggle('is-shifted',chosen[0]!==0||chosen[1]!==0);
      guide.style.display=chosen[0]||chosen[1]?'':'none';
      guide.setAttribute('x1',String(point.x));guide.setAttribute('y1',String(point.y));
      guide.setAttribute('x2',String(x));guide.setAttribute('y2',String(y));
      occupied.push({left:x-barWidth/2-1,top:y-barHeight/2-1,right:x+barWidth/2+1,bottom:y+barHeight/2+1});
    }
  }
  return {update};
}
