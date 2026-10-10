import {culturePercentage,type CultureRegion,type CultureTopic} from '../lib/atlas-culture';
export function initPopulationCulture(root:HTMLElement):void{
 if(root.dataset.cultureReady==='true')return;
 const config=root.querySelector('[data-culture-config]');if(!config?.textContent)return;
 const data=JSON.parse(config.textContent) as CultureRegion;
 const workspace=root.closest<HTMLElement>('[data-oceania-learning],[data-russia-learning],[data-africa-atlas]')!;
 let topic:CultureTopic='religion',selected='';
 const restore=()=>{
  const params=new URLSearchParams(location.search),requested=workspace.hasAttribute('data-africa-atlas')?workspace.dataset.topic:params.get('topic');
  const active=workspace.dataset.field==='population'&&(requested==='ethnicity'||requested==='religion');
  topic=requested==='ethnicity'?'ethnicity':'religion';selected=params.get('culturePlace')??'';
  root.hidden=!active;workspace.dataset.cultureActive=String(active);
  workspace.querySelectorAll<HTMLButtonElement>('[data-population-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.populationTopic===(active?topic:'distribution'))));
  for(const panel of root.querySelectorAll<HTMLElement>('[data-culture-panel]'))panel.hidden=panel.dataset.culturePanel!==topic;
  renderSelection();
 };
 const update=(key:string,value:string)=>{const url=new URL(location.href);value?url.searchParams.set(key,value):url.searchParams.delete(key);history.pushState(null,'',url);restore();};
 function renderSelection(){
  const panel=root.querySelector<HTMLElement>(`[data-culture-panel="${topic}"]`)!;
  for(const button of panel.querySelectorAll<HTMLElement>('[data-culture-record]'))button.setAttribute('aria-pressed',String(button.dataset.cultureRecord===selected));
  const host=panel.querySelector<HTMLElement>('[data-culture-selected]')!,record=data.records.find(r=>r.id===selected),table=record?.topics[topic];host.replaceChildren();
  const el=(tag:string,text:string)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  if(!record||!table){host.append(el('p','国・地域を選ぶと、全収録区分と調査定義をここに表示します。他の構成記号は地図に残ります。'));return;}
  host.append(el('h3',record.name+' · '+record.year+'年'),el('p',table.definition));
  const values=document.createElement('table');const caption=el('caption','全収録区分・公表割合（%）');values.append(caption);const body=document.createElement('tbody');
  for(const [name,value] of table.rows){const row=document.createElement('tr'),heading=el('th',name);heading.setAttribute('scope','row');row.append(heading,el('td',culturePercentage(value)));body.append(row);}values.append(body);host.append(values,el('p',table.note));
  if(table.supplement){const extra=table.supplement;host.append(el('h4','別の質問：'+extra.label+' '+culturePercentage(extra.value)),el('p',extra.definition));const link=document.createElement('a');link.href=extra.source;link.textContent=extra.sourceTitle;host.append(link);}
  const label=el('label','この欄で1区分を読む '),choice=document.createElement('select');choice.setAttribute('aria-label','右欄内の単一区分');const all=document.createElement('option');all.value='';all.textContent='全区分';choice.append(all);
  table.rows.forEach(([name],index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=name;choice.append(option);});
  const single=el('p','');single.className='culture-single-value';single.hidden=true;choice.addEventListener('change',()=>{const row=choice.value===''?undefined:table.rows[Number(choice.value)];values.hidden=!!row;single.hidden=!row;single.textContent=row?row[0]+'：'+culturePercentage(row[1]):'';});label.append(choice);host.append(label,single);
  const source=document.createElement('a');source.href=table.source;source.textContent=table.sourceTitle;host.append(source);
 }
 workspace.querySelectorAll<HTMLButtonElement>('[data-population-topic]').forEach(button=>button.addEventListener('click',()=>{const url=new URL(location.href);const value=button.dataset.populationTopic!;value==='distribution'?url.searchParams.delete('topic'):url.searchParams.set('topic',value);url.searchParams.delete('culturePlace');history.pushState(null,'',url);restore();}));
 root.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-culture-record],[data-culture-reset]');if(!button)return;event.stopPropagation();update('culturePlace',button.dataset.cultureRecord??'');});
 root.addEventListener('population-culture-state',restore);window.addEventListener('popstate',restore);restore();root.dataset.cultureReady='true';
}
