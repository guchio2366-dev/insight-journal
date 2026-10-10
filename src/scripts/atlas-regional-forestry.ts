type Example={id:string;title:string;label:string;point:number[];fact:string;explanation:string;use:string;sources:{title:string;url:string;period:string}[]};
type Config={region:string;frame:{width:number;height:number};reading:{name:string;overview:string;distribution:string;reason:string;examples:Example[]}};
export function initRegionalForestry(root=document.querySelector<HTMLElement>('[data-regional-forestry]')) {
 if(!root||root.dataset.forestInitialized)return;
 root.dataset.forestInitialized='true';
 const config=JSON.parse(root.querySelector('[data-forest-config]')!.textContent!) as Config;
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const svg=q<SVGSVGElement>('[data-forest-map]'),whole=[0,0,config.frame.width,config.frame.height];
 let camera=[...whole],selected='';
 const setText=(selector:string,text:string)=>{q(selector).textContent=text;};
 const reading=config.reading;
 function save() {
  const url=new URL(location.href);
  if(selected)url.searchParams.set('example',selected);else url.searchParams.delete('example');
  if(camera.some((value,index)=>Math.abs(value-whole[index])>.01))url.searchParams.set('camera',camera.map(value=>value.toFixed(3)).join(','));else url.searchParams.delete('camera');
  history.replaceState(null,'',url);
 }
 function sourceList(sources:Example['sources']) {
  const list=q('[data-forest-reading-sources]');list.replaceChildren();
  const seen=new Set<string>();
  for(const source of sources){if(seen.has(source.url))continue;seen.add(source.url);const item=document.createElement('li'),link=document.createElement('a'),note=document.createElement('small');link.href=source.url;link.textContent=source.title;note.textContent=source.period;item.append(link,note);list.append(item);}
 }
 function choose(id:string,persist=true) {
  const example=reading.examples.find(example=>example.id===id);selected=example?.id??'';
  setText('[data-forest-kicker]',example?'重要な林業の事例 · 代表位置':'地域全体');
  setText('[data-forest-reading-title]',example?.title??`${reading.name}の森林と木材利用`);
  setText('[data-forest-takeaway]',example?.fact??reading.overview);
  setText('[data-forest-fact]',root!.dataset.forestRasterStatus==='failed'?'2021年の樹木被覆画像を表示できません。2020年の参考表示とは別の資料です。番号は解説の代表位置、斜線は欠測・分類未判定です。':example?`${example.fact} 番号は説明の代表位置です。選んでも他地域の位置と取得済みの被覆面を残します。`:reading.distribution);
  if(root!.dataset.forestReferenceStatus==='failed')q('[data-forest-fact]').textContent+=' 一部の2020年参考画像を表示できません。表示に失敗した範囲の森林分布は読めません。';
  setText('[data-forest-reason]',example?.explanation??reading.reason);
  setText('[data-forest-use]',example?.use??'');
  q('[data-forest-use-section]').hidden=!example;q('[data-forest-clear]').hidden=!example;
  root!.querySelectorAll('[data-forest-example]').forEach(element=>{const active=element.getAttribute('data-forest-example')===selected;element.classList.toggle('is-selected',active);if(element.tagName==='BUTTON')element.setAttribute('aria-pressed',String(active));else if(active)element.setAttribute('aria-current','true');else element.removeAttribute('aria-current');});
  q('[data-forest-overview]').setAttribute('aria-pressed',String(!example));
  sourceList(example?.sources??reading.examples.flatMap(example=>example.sources));
  if(persist)save();
 }
 function draw(persist=true) {
  svg.setAttribute('viewBox',camera.join(' '));
  const box=svg.getBoundingClientRect(),scale=Math.max(camera[2]/Math.max(box.width,1),camera[3]/Math.max(box.height,1));
  svg.querySelectorAll('[data-forest-symbol]').forEach(symbol=>symbol.setAttribute('transform',`scale(${scale})`));
  if(persist)save();
 }
 function zoom(factor:number) {
  const width=Math.min(whole[2]*2,Math.max(whole[2]/8,camera[2]*factor)),height=width*whole[3]/whole[2];
  camera=[camera[0]+(camera[2]-width)/2,camera[1]+(camera[3]-height)/2,width,height];draw();
 }
 function restore() {
  const params=new URLSearchParams(location.search),value=params.get('camera')?.split(',').map(Number);
  camera=[...whole];
  if(value?.length===4&&value.every(Number.isFinite)&&value[2]>=whole[2]/8&&value[2]<=whole[2]*2&&Math.abs(value[3]/value[2]-whole[3]/whole[2])<.001&&Math.abs(value[0])<=whole[2]*2&&Math.abs(value[1])<=whole[3]*2)camera=value;
  choose(params.get('example')??'',false);draw(false);
 }
 root.addEventListener('click',event=>{
  const target=(event.target as Element).closest('[data-forest-example],[data-forest-overview],[data-forest-clear],[data-forest-zoom],[data-forest-reset]');if(!target)return;
  if(target.hasAttribute('data-forest-example')){event.preventDefault();choose(target.getAttribute('data-forest-example')!);return;}
  if(target.hasAttribute('data-forest-overview')||target.hasAttribute('data-forest-clear'))choose('');
  if(target.hasAttribute('data-forest-reset')){camera=[...whole];choose('');draw();}
  if(target.hasAttribute('data-forest-zoom'))zoom(target.getAttribute('data-forest-zoom')==='in'?.8:1.25);
 });
 svg.addEventListener('keydown',event=>{
  if(event.target!==svg)return;
  const moves:Record<string,number[]>={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};
  if(moves[event.key]){event.preventDefault();camera[0]+=moves[event.key][0]*camera[2];camera[1]+=moves[event.key][1]*camera[3];draw();}
  else if(event.key==='+'||event.key==='='||event.key==='-'){event.preventDefault();zoom(event.key==='-'?1.25:.8);}
  else if(event.key==='Home'){event.preventDefault();camera=[...whole];draw();}
 });
 let drag:{x:number;y:number;camera:number[]}|null=null;
 svg.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0||(event.target as Element).closest('a'))return;drag={x:event.clientX,y:event.clientY,camera:[...camera]};svg.setPointerCapture(event.pointerId);});
 svg.addEventListener('pointermove',event=>{if(!drag)return;const box=svg.getBoundingClientRect(),scale=Math.max(drag.camera[2]/box.width,drag.camera[3]/box.height);camera=[drag.camera[0]-(event.clientX-drag.x)*scale,drag.camera[1]-(event.clientY-drag.y)*scale,drag.camera[2],drag.camera[3]];draw(false);});
 svg.addEventListener('pointerup',()=>{if(drag){drag=null;save();}});svg.addEventListener('pointercancel',()=>{drag=null;});
 const image=q<SVGImageElement>('[data-forest-raster]');
 if(image){
  root.dataset.forestRasterStatus='loading';
  const failed=()=>{image.remove();root!.dataset.forestRasterStatus='failed';setText('[data-forest-map-note]','保存済みの被覆画像を読み込めませんでした。斜線と代表位置だけを表示しています。再読込できます。');choose(selected,false);};
  image.addEventListener('error',failed);
  // A separate cached-image probe also catches failures that happened before
  // this controller attached to the server-rendered SVG image.
  const probe=new Image();probe.onload=()=>{if(root!.dataset.forestRasterStatus!=='failed')root!.dataset.forestRasterStatus='ready';};probe.onerror=failed;probe.src=image.getAttribute('href')!;
 }else root.dataset.forestRasterStatus='not-acquired';
 const references=[...root.querySelectorAll<SVGImageElement>('[data-forest-reference]')];
 root.dataset.forestReferenceStatus=references.length?'loading':'not-used';
 let remaining=references.length;
 for(const reference of references){
  let finished=false;
  const fail=()=>{if(finished)return;finished=true;reference.remove();root!.dataset.forestReferenceStatus='failed';setText('[data-forest-map-note]','一部の2020年森林参考画像を読み込めませんでした。その範囲は斜線と代表位置で表示します。再読込できます。');choose(selected,false);};
  reference.addEventListener('error',fail);
  const probe=new Image();probe.onerror=fail;probe.onload=()=>{if(finished)return;finished=true;if(--remaining===0&&root!.dataset.forestReferenceStatus!=='failed')root!.dataset.forestReferenceStatus='ready';};probe.src=reference.getAttribute('href')!;
 }
 new ResizeObserver(()=>draw(false)).observe(svg);
 window.addEventListener('popstate',restore);
 restore();
}
