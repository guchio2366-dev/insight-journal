import {densityColors,missingColor} from '../data/atlas/population';
import {canadaDemographicShare} from '../lib/atlas-canada-demographics';
const ethnicColors:Record<string,string>={'3':'#d3d6d4','4':'#8870b5','5':'#4f91ba','6':'#218b83','7':'#c17caa','8':'#a78345','9':'#e28b40','10':'#5d8dba','11':'#a16c52','12':'#9a83bc','13':'#bb6477','14':'#927563','15':'#bd788e','87':'#bd983b'};
const religiousColors:Record<string,string>={'2':'#b69a46','3':'#9b4f67','19':'#d47a3e','20':'#626aa3','21':'#4f8067','22':'#d5ad42','23':'#345b78','24':'#8b6d9d','25':'#d3d6d4'};
const japanese=(name:string)=>name.match(/（(.+)）/)?.[1]??name;
export const densityColor=(n:number|null)=>n===null?missingColor:densityColors[n===0?0:n<=1?1:n<10?2:n<100?3:n<1000?4:n<10000?5:6];
function composition(record:any,data:any,topic:string){
 const rows=data.groups.map((g:any)=>({...g,count:record.values[g.id]?.value??null,share:canadaDemographicShare(record.values[g.id]?.value??null,record.denominator.value),national:canadaDemographicShare(data.national.values[g.id]?.value??null,data.national.denominator.value)}));
 const complete=rows.every((g:any)=>g.share!==null);
 if(!complete)return {rows,qualified:[],winner:null,missing:true};
 const qualified=rows.filter((g:any)=>topic==='religion'||g.id!=='3'&&(g.share>=20||g.share>=5&&g.national!==null&&g.share>=g.national*1.5)).sort((a:any,b:any)=>b.share-a.share);
 const winner=qualified.length&&!(qualified.length>1&&qualified[0].share===qualified[1].share)?qualified[0]:null;
 return {rows,qualified,winner,missing:false};
}
export function renderCanadaPopulationOverview(root:HTMLElement,config:any,state:any,demographic:any,choose:(id:string)=>void){
 const $=(s:string)=>root.querySelector<HTMLElement>(s)!;
 const topic=demographic.topic,data=topic==='distribution'?null:config.demographics[topic],colors=topic==='ethnicity'?ethnicColors:religiousColors;
 const key=$('[data-population-category-key]');key.replaceChildren();
 for(const selector of ['[data-population-population-legend]','[data-population-density-legend]','[data-demographic-share-legend]','[data-demographic-count-legend]'])$(selector).hidden=true;
 const addKey=(name:string,color:string,id?:string)=>{const el=document.createElement(id?'button':'span'),swatch=document.createElement('i');swatch.style.background=color;el.append(swatch,document.createTextNode(name));if(id){el.setAttribute('type','button');el.dataset.populationCategory=id;el.setAttribute('aria-pressed',String(demographic.group===id));el.addEventListener('click',()=>{root.dataset.populationReadingFocus='group';choose(id);});}key.append(el);};
 if(!data){['0','>0–1','>1–<10','10–<100','100–<1,000','1,000–<10,000','10,000以上'].forEach((name,i)=>addKey(name,densityColors[i]));addKey('未収録・未公表',missingColor);}
 else{for(const g of data.groups)addKey(g.name.replace('（単一回答）',''),colors[g.id],g.id);addKey(topic==='ethnicity'?'集積基準に達しない都市圏':'同率最多','#d3d6d4');addKey('未収録・未公表',missingColor);}
 const note=!data?'人口密度（人/km²）。41都市圏の2021年平均。都市圏外の細かな地域データは本サイトでは未収録です。空白は人口ゼロではありません。':topic==='ethnicity'?'米国と同じ集積基準（20%以上、または5%以上かつ全国割合の1.5倍以上）で色分け。地色は該当集団のうち割合最大、都市の色点は該当する全集団。41都市圏外の地域別データは本サイトでは未収録です。':'色は各都市圏で割合最大の宗教・無宗教（過半数とは限りません）。41都市圏外とキリスト教の教派別データは本サイトでは未収録のため、米国の教派別地図とは分類が異なります。';
 $('[data-population-coverage]').textContent=note;
 $('[data-population-coverage-brief]').textContent=topic==='religion'?'収録：41都市圏・宗教の上位分類。都市圏外と教派別は本サイトでは未収録です。':'収録：41都市圏。米国の郡別地図に相当する都市圏外の詳細分布は、本サイトでは未収録です。';
 $('#canada-population-title').textContent=!data?'2021年カナダ都市圏の人口密度':topic==='ethnicity'?'人口集団の特徴的な集積':'都市圏ごとの最大宗教・無宗教';
 $('#canada-population-desc').textContent=note;
 $('[data-population-map-status]').textContent='2021年国勢調査 · 気候区分と共通の地図 · 都市を選ぶと右の解説が変わります。';
 const legendDescription=topic==='ethnicity'?'地色は集積基準に該当する集団のうち最大のもの。都市の小さな色点は該当する全集団です。':topic==='religion'?'本人が回答した所属の分類です。米国の宗教団体が把握した所属者数とは調査方法が異なります。':'都市圏全体の平均密度であり、市内の地区別の密度ではありません。';
 for(const marker of root.querySelectorAll<SVGElement>('[data-population-map-cma]')){
  const id=marker.dataset.populationMapCma!,r=(data??config).cmas.find((r:any)=>r.id===id),c=data?composition(r,data,topic):null;
  if(!marker.dataset.focusReady){marker.dataset.focusReady='true';marker.addEventListener('click',()=>{root.dataset.populationReadingFocus='city';},true);marker.addEventListener('keydown',()=>{root.dataset.populationReadingFocus='city';},true);}
  marker.style.display='';marker.querySelector<SVGElement>('[data-population-symbol]')!.style.display='none';
  marker.querySelector<SVGElement>('[data-population-boundary]')!.style.fill=data?c!.missing?missingColor:c!.winner?colors[c!.winner.id]:'#d3d6d4':densityColor(r.density2021.value);
  marker.querySelector('[data-population-category-dots]')?.remove();
  const label=marker.querySelector<SVGTextElement>('[data-population-label]')!,point=marker.querySelector<SVGCircleElement>('.population-anchor')!;
  label.textContent=japanese(r.name);label.style.fontSize='13px';label.style.display=id===state.cma||['535','462','933','825','835','602','505','705'].includes(id)?'':'none';
  if(c&&topic==='ethnicity'&&c.qualified.length){const dots=document.createElementNS('http://www.w3.org/2000/svg','g');dots.dataset.populationCategoryDots='';c.qualified.forEach((g:any,i:number)=>{const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',String(Number(point.getAttribute('cx'))+i*7));dot.setAttribute('cy',String(Number(point.getAttribute('cy'))+7));dot.setAttribute('r','3');dot.setAttribute('fill',colors[g.id]);dot.setAttribute('stroke','#fff');dots.append(dot);});marker.append(dots);}
  marker.setAttribute('aria-label',japanese(r.name)+'：'+(!data?`${r.density2021.value??'未公表'}人/km²`:c!.missing?'未公表値あり':c!.winner?c!.winner.name+' '+c!.winner.share.toFixed(1)+'%':topic==='religion'?'同率最多':'集積基準に達する集団なし')+'。解説を開く');
 }
 // Move labels only; boundaries and anchor dots keep their geographic coordinates.
 const labels=[...root.querySelectorAll<SVGTextElement>('[data-population-label]')].filter(n=>n.style.display!=='none').sort((a,b)=>Number(b.closest('[data-population-map-cma]')?.getAttribute('data-population-map-cma')===state.cma)-Number(a.closest('[data-population-map-cma]')?.getAttribute('data-population-map-cma')===state.cma));
 const boxes:number[][]=[];
 for(const label of labels){const anchor=label.parentElement!.querySelector('.population-anchor')!,x=Number(anchor.getAttribute('cx')),y=Number(anchor.getAttribute('cy')),width=(label.textContent?.length??0)*13;let placed=false;for(const [dx,dy]of [[8,-8],[8,19],[-width-8,-8],[-width-8,19],[8,-28]]){const box=[x+dx,y+dy-13,x+dx+width,y+dy+3];if(box[0]<2||box[2]>898||boxes.some(b=>box[0]<b[2]+3&&box[2]>b[0]-3&&box[1]<b[3]+3&&box[3]>b[1]-3))continue;label.setAttribute('x',String(x+dx));label.setAttribute('y',String(y+dy));boxes.push(box);placed=true;break;}if(!placed)label.style.display='none';}
 $('[data-population-composition]').hidden=!data;
 if(!data){const selected=config.cmas.find((r:any)=>r.id===state.cma);$('[data-population-comparison]').textContent=`${japanese(selected.name)}都市圏：${selected.population[2021].value?.toLocaleString('ja-JP')??'未公表'}人 ／ 密度 ${selected.density2021.value?.toLocaleString('ja-JP')??'未公表'}人/km²`;return;}
 const selected=data.cmas.find((r:any)=>r.id===state.cma),c=composition(selected,data,topic);
 $('[data-demographic-heading]').textContent=japanese(selected.name)+(topic==='ethnicity'?'の人口集団':'の宗教・無宗教');
 $('[data-demographic-lead]').textContent=topic==='ethnicity'?'都市の周囲の色と構成比を見比べ、どの人口集団が集まるかを読む。':'都市の色と構成比を見比べ、宗教文化の地域差を読む。';
 $('[data-demographic-comparison]').textContent=c.missing?'一部の構成比は未公表です。':c.winner?(topic==='ethnicity'?'集積基準に該当する中で最大：':'最大の区分：')+c.winner.name+' '+c.winner.share.toFixed(1)+'%':topic==='religion'?'最多の区分が同率です。':'集積基準に達する集団はありません。';
 if(root.dataset.populationReadingFocus==='group'){
 const selectedGroup=data.groups.find((g:any)=>g.id===demographic.group);
 const top=data.cmas.map((r:any)=>({name:japanese(r.name),share:canadaDemographicShare(r.values[selectedGroup.id]?.value??null,r.denominator.value)})).filter((r:any)=>r.share!==null).sort((a:any,b:any)=>b.share-a.share).slice(0,3);
 $('[data-demographic-heading]').textContent=selectedGroup.name+'の分布';
 $('[data-demographic-comparison]').textContent='収録した41都市圏で割合が高い地域：'+top.map((r:any)=>r.name+' '+r.share.toFixed(1)+'%').join('、')+'。';
 }
 $('[data-demographic-national]').hidden=true;
 $('[data-demographic-definition]').textContent=legendDescription;
 $('[data-population-composition-title]').textContent='選択した都市圏の構成（2021年）';
 $('[data-population-composition-note]').textContent='分母は同じ表の私的世帯人口。未公表・秘匿は0に置き換えません。';
 const tbody=$('[data-population-composition-rows]');tbody.replaceChildren();for(const g of c.rows){const tr=document.createElement('tr'),name=document.createElement('th'),share=document.createElement('td'),count=document.createElement('td'),dot=document.createElement('i');dot.style.background=colors[g.id];name.append(dot,g.name);share.textContent=g.share===null?'未公表':g.share.toFixed(1)+'%';count.textContent=g.count===null?'未公表':g.count.toLocaleString('ja-JP')+'人';tr.append(name,share,count);tr.classList.toggle('is-active-category',g.id===demographic.group);tbody.append(tr);}
}
