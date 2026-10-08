import {canadaLegacyFrame,canadaMapPath} from '../lib/atlas-canada-map-presentation';
import {canadaWaterDatasets, canadaWaterFit, canadaWaterFullFrame, canadaWaterPath, validCanadaWaterFrame, validateCanadaWaterCollection, type CanadaWaterArea, type CanadaWaterCollection, type CanadaWaterConfig, type CanadaWaterDataset, type CanadaWaterFeature, type CanadaWaterFrame, type CanadaWaterState, type WaterDatasetTopic, type WaterTopic} from '../lib/atlas-canada-water-state';

const svgNamespace = 'http://www.w3.org/2000/svg';
export function initCanadaWaterResources(root: HTMLElement) {
 const config = JSON.parse(root.querySelector('[data-canada-water-resource-config]')!.textContent!) as CanadaWaterConfig;
 const datasets = canadaWaterDatasets(config);
 const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
 const map = $<SVGSVGElement>('[data-canada-water-resource-map]');
 const raster = $<SVGGElement>('[data-canada-water-resource-raster]');
 const vectors = $<SVGGElement>('[data-canada-water-resource-vectors]');
 const select = $<HTMLSelectElement>('[data-canada-water-area]');
 const only = $<HTMLInputElement>('[data-canada-water-resource-only]');
 const loading = $('[data-canada-water-load]');
 const retry = $<HTMLButtonElement>('[data-canada-water-retry]');
 const full = [...canadaWaterFullFrame] as CanadaWaterFrame;
 const geometry = new Map<WaterDatasetTopic, CanadaWaterCollection>();
 const pending = new Map<WaterDatasetTopic, Promise<void>>();
 const errors = new Set<WaterDatasetTopic>();
 const readyImages = new Set<string>();
 const failedImages = new Set<string>();
 let state: CanadaWaterState = {topic:'surface',area:null,only:false,frame:null};
 let renderedTopic: WaterTopic = 'surface', rasterKey = '', frame: CanadaWaterFrame = [...full];
 let drag: {x:number; y:number; frame:CanadaWaterFrame; moved:boolean} | null = null;
 let ignoreClick = false;
 const emit = (patch: Partial<CanadaWaterState>) => root.dispatchEvent(new CustomEvent('canada-water-update', {detail:patch,bubbles:true}));
 const featureId = (feature: CanadaWaterFeature) => String(feature.properties.id ?? feature.id ?? '');
 const featureGroup = (feature: CanadaWaterFeature, dataset: CanadaWaterDataset) => String(feature.properties[dataset.groupProperty ?? 'group']);
 const isMatch = (feature: CanadaWaterFeature, dataset: CanadaWaterDataset) => !state.area || featureGroup(feature,dataset) === state.area || state.topic === 'aquifers' && featureId(feature) === state.area;
 const areaOf = (dataset: CanadaWaterDataset): CanadaWaterArea | undefined => [...dataset.groups,...(dataset.areas ?? [])].find(item => item.id === state.area);
 const isVisible = () => state.topic !== 'surface' && !root.hidden;

 function setLoading(message: string | null, failed = false) {
  loading.hidden = !message; loading.textContent = message ?? ''; retry.hidden = !failed;
  root.dataset.canadaWaterReady = message ? failed ? 'error' : 'loading' : 'ready';
 }
 function safeFrame(next: CanadaWaterFrame): CanadaWaterFrame {
  const width = Math.min(900,Math.max(3,next[2])), height = Math.min(580,Math.max(3,next[3]));
  return [Math.max(0,Math.min(900-width,next[0])),Math.max(0,Math.min(580-height,next[1])),width,height];
 }
 function defaultFrame(topic: WaterDatasetTopic): CanadaWaterFrame {
  const dataset = datasets[topic];
  if (validCanadaWaterFrame(dataset.defaultFrame)) return dataset.defaultFrame;
  return topic === 'aquifers' && geometry.has(topic) ? canadaWaterFit(geometry.get(topic)!.features) ?? full : full;
 }
 function drawCamera() {
  const projectedFrame=canadaLegacyFrame(frame);map.setAttribute('viewBox',projectedFrame.join(' '));
  const matrix=map.getScreenCTM?.();
  const referenceScale=matrix?.a?1/matrix.a:frame[2]/900;
  for(const label of map.querySelectorAll<SVGGElement>('[data-canada-rain-map-label]')){
   const x=Number(label.dataset.rainX),y=Number(label.dataset.rainY);
   label.style.display=x<projectedFrame[0]||x>projectedFrame[0]+projectedFrame[2]||y<projectedFrame[1]||y>projectedFrame[1]+projectedFrame[3]?'none':'';
   label.querySelector('[data-canada-rain-label-glyph]')?.setAttribute('transform',`scale(${referenceScale})`);
  }
  for(const reference of map.querySelectorAll<SVGGElement>('[data-canada-water-reference]')) {
   const x=Number(reference.dataset.referenceX),y=Number(reference.dataset.referenceY);
   reference.style.display=state.topic==='drainage'||x<frame[0]||x>frame[0]+frame[2]||y<frame[1]||y>frame[1]+frame[3]?'none':'';
   reference.querySelector('[data-canada-water-reference-glyph]')?.setAttribute('transform',`scale(${referenceScale})`);
  }
  if(matrix?.a){
   const occupied:DOMRect[]=[];
   for(const reference of map.querySelectorAll<SVGGElement>('[data-canada-water-reference]')){
    const label=reference.querySelector<SVGTextElement>('text');if(!label)continue;label.style.display='';
    if(reference.style.display==='none')continue;
    const box=label.getBoundingClientRect();if(occupied.some(b=>box.left<b.right+4&&box.right>b.left-4&&box.top<b.bottom+4&&box.bottom>b.top-4))label.style.display='none';else occupied.push(box);
   }
  }
  const bcDetail=state.topic==='aquifers'&&frame[2]<100;
  map.querySelector<SVGElement>('[data-canada-water-bc-context]')?.toggleAttribute('hidden',!bcDetail);
  for(const coarse of map.querySelectorAll<SVGElement>('[data-canada-water-context-country="CAN"],[data-canada-water-national-outline]'))coarse.toggleAttribute('hidden',bcDetail);
 }
 function camera(next: CanadaWaterFrame | null) {
  emit({frame:next ? safeFrame(next) : null});
 }
 function populateSelect(topic: WaterDatasetTopic) {
  const dataset = datasets[topic]; select.replaceChildren();
  const add = (parent: HTMLOptGroupElement | HTMLSelectElement, id: string, name: string) => {const option=document.createElement('option');option.value=id;option.textContent=name;parent.append(option);};
  add(select,'','すべての区分');
  for (const group of dataset.groups) add(select,group.id,group.name);
  if (dataset.areas?.length) {
   const parent = document.createElement('optgroup'); parent.label = '個別の帯水層（原資料の番号）';
   for (const area of dataset.areas) add(parent,area.id,area.name);
   select.append(parent);
  }
 }
 function makeShape(id: string, group: string, name: string, color: string, features: CanadaWaterFeature[]): SVGGElement {
  const shape=document.createElementNS(svgNamespace,'g');shape.classList.add('canada-water-shape');shape.dataset.canadaWaterResourceShape=id;shape.dataset.canadaWaterResourceGroup=group;
  shape.setAttribute('role','button');shape.setAttribute('tabindex',state.topic==='aquifers'?'-1':'0');shape.setAttribute('aria-label',`${name}を選ぶ`);
  const title=document.createElementNS(svgNamespace,'title');title.textContent=name;shape.append(title);
  for (const excluded of [false,true]) {
   const parts=features.filter(feature => !!feature.properties.fillExcluded === excluded);if (!parts.length) continue;
   const path=document.createElementNS(svgNamespace,'path');path.setAttribute('d',parts.map(feature => canadaMapPath(feature.geometry)).join(''));path.setAttribute('fill',excluded?'none':color);path.setAttribute('fill-rule','evenodd');path.setAttribute('vector-effect','non-scaling-stroke');
   if (excluded) {path.classList.add('canada-water-source-invalid');path.setAttribute('stroke',color);path.setAttribute('stroke-dasharray','3 2');}
   shape.append(path);
  }
  vectors.append(shape);return shape;
 }
 function buildVectors(topic: WaterDatasetTopic) {
  vectors.replaceChildren(); vectors.dataset.canadaWaterVectorTopic=topic;const collection=geometry.get(topic);if (!collection) return;
  const dataset=datasets[topic];
  if (topic==='aquifers') {
   for (const feature of collection.features) {const group=dataset.groups.find(item => item.id===featureGroup(feature,dataset))!;makeShape(featureId(feature),group.id,String(feature.properties.name ?? feature.properties.LOCATION ?? `帯水層 ${featureId(feature)}`),group.color,[feature]);}
  } else {
   for (const group of dataset.groups) makeShape(group.id,group.id,group.name,group.color,collection.features.filter(feature => featureGroup(feature,dataset)===group.id));
  }
 }
 function drawVectors() {
  const collection=geometry.get(state.topic as WaterDatasetTopic);if (!collection) return;
  for (const shape of vectors.querySelectorAll<SVGGElement>('[data-canada-water-resource-shape]')) {
   const selected=shape.dataset.canadaWaterResourceShape===state.area || state.topic==='drainage'&&state.area==='nelson'&&shape.dataset.canadaWaterResourceShape==='saskatchewan' || state.topic==='aquifers' && shape.dataset.canadaWaterResourceGroup===state.area;
   const hidden=state.only && !!state.area && !selected;
   shape.style.display=hidden?'none':'';shape.classList.toggle('is-selected',selected);shape.setAttribute('aria-pressed',String(selected));shape.setAttribute('tabindex',hidden||state.topic==='aquifers'?'-1':'0');
  }
 }
 function drawRaster() {
  const dataset=datasets.precipitation, images=dataset.images ?? dataset.classImages?.map(image=>({id:image.group,url:image.url})) ?? [];
  const selected=images.find(image=>image.id===state.area);
  const layers=(state.only&&selected?[selected]:images).map(image=>({...image,outline:false}));
  if(selected&&!state.only)layers.push({...selected,outline:true});
  const urls=[...new Set(layers.map(image=>image.url))];
  const key=layers.map(image=>image.id+':'+image.outline).join('|');
  if(urls.length) {
   const failed=urls.some(url=>failedImages.has(url));
   setLoading(failed?'分布図を読み込めませんでした。凡例と出典は確認できます。':urls.every(url=>readyImages.has(url))?null:'降水量の分布図を読み込み中…',failed);
  }
  if(rasterKey===key)return;rasterKey=key;raster.replaceChildren();
  if(!urls.length){setLoading('降水量の画像がありません。出典と区分一覧を参照してください。',true);return;}
  for(const layer of layers){
   const image=document.createElementNS(svgNamespace,'image'),url=layer.url,box=url.includes('-full-mercator.png')?canadaLegacyFrame([0,0,900,580]):[0,0,900,580];for(const [i,key]of ['x','y','width','height'].entries())image.setAttribute(key,String(box[i]));image.setAttribute('preserveAspectRatio','none');image.setAttribute('href',url);
   image.dataset.canadaRainClass=layer.id;image.dataset.canadaRainOutline=String(layer.outline);image.setAttribute('filter',`url(#${layer.outline?'canada-rain-selection':'canada-rain-color-'+layer.id})`);
   image.addEventListener('load',()=>{readyImages.add(url);failedImages.delete(url);if(state.topic==='precipitation'&&rasterKey===key&&urls.every(item=>readyImages.has(item)))setLoading(null);});
   image.addEventListener('error',()=>{failedImages.add(url);if(state.topic==='precipitation'&&rasterKey===key)setLoading('分布図を読み込めませんでした。凡例と出典は確認できます。',true);});
   raster.append(image);
  }
 }

 async function loadGeometry(topic: WaterDatasetTopic) {
  if (geometry.has(topic)||pending.has(topic)) return pending.get(topic);
  const dataset=datasets[topic];if (!dataset.geometryUrl) {errors.add(topic);if(state.topic===topic)setLoading('この資料の分布図がありません。出典と区分一覧を参照してください。',true);return;}
  if(state.topic===topic)setLoading('原資料の分布図を読み込み中…');
  const request=(async()=>{
   try {const response=await fetch(dataset.geometryUrl!);if(!response.ok)throw new Error('Geometry request failed.');geometry.set(topic,validateCanadaWaterCollection(await response.json(),dataset));errors.delete(topic);if(state.topic===topic&&isVisible()){buildVectors(topic);frame=state.frame??defaultFrame(topic);drawCamera();drawVectors();setLoading(null);renderReading(topic);}}
   catch {errors.add(topic);if(state.topic===topic&&isVisible())setLoading('分布図を読み込めませんでした。区分一覧と出典は確認できます。',true);}
   finally {pending.delete(topic);}
  })();pending.set(topic,request);return request;
 }
 function renderReading(topic: WaterDatasetTopic) {
  const dataset=datasets[topic], area=areaOf(dataset), reading=$(`[data-canada-water-selected-reading="${topic}"]`);
  reading.hidden=!area;
  if(area) {
   reading.querySelector('[data-canada-water-selected-title]')!.textContent=area.name;
   const feature=geometry.get(topic)?.features.find(item=>featureId(item)===state.area);
   const description=area.description ?? (feature ? [feature.properties.LOCATION,feature.properties.MATERIAL,feature.properties.MAPPING_YEAR&&`地図化：${feature.properties.MAPPING_YEAR}年`].filter(Boolean).join(' · ') : '選んだ区分を地図上で強調しています。');
   reading.querySelector('[data-canada-water-selected-description]')!.textContent=description;
   const link=reading.querySelector<HTMLAnchorElement>('[data-canada-water-selected-link]')!,url=feature?.properties.AQUIFER_DETAILS_URL;
   link.hidden=typeof url!=='string'||!url.startsWith('https://');if(!link.hidden)link.href=String(url);
  }
  $('[data-canada-water-resource-status]').textContent=(area?`${area.name}${state.only?'だけ表示中。':'を選択中。'}${topic==='aquifers'?' 地図は選定範囲に重なる、原資料の帯水層全体を表示します。':''}`:'すべての区分を表示。地図・凡例・選択欄から区分を選べます。')+' 丸は観測点の位置の目印です。';
 }
 function render(next: CanadaWaterState) {
  state={...next};if(state.topic==='surface')return;
  const topic=state.topic,dataset=datasets[topic];if(!dataset)return;
  const topicChanged=renderedTopic!==topic;
  if(topicChanged){renderedTopic=topic;populateSelect(topic);raster.replaceChildren();vectors.replaceChildren();delete vectors.dataset.canadaWaterVectorTopic;rasterKey='';if(geometry.has(topic))buildVectors(topic);}
  frame=validCanadaWaterFrame(state.frame)?state.frame:defaultFrame(topic);drawCamera();
  select.value=state.area??'';only.checked=!!state.area&&state.only;only.disabled=!state.area;$<HTMLButtonElement>('[data-canada-water-focus]').disabled=!state.area||topic==='precipitation';
  $('[data-canada-water-map-title]').textContent=dataset.title;
  map.querySelector('title')!.textContent=dataset.title;
  map.querySelector('desc')!.textContent=`${dataset.reading} ${dataset.scope} ${topic==='precipitation'?'各色帯の年降水量を地図内にmm/年で表示します。':'地図と同じ区分は凡例と選択欄で確認できます。丸は既存のECCC観測点の位置の目印で、帯水層の測定点ではありません。'}`;
  map.querySelector<SVGElement>('[data-canada-rain-map-labels]')?.toggleAttribute('hidden',topic!=='precipitation');
  root.querySelector<HTMLElement>('[data-canada-rain-map-unit]')?.toggleAttribute('hidden',topic!=='precipitation');
  map.querySelector<SVGElement>('.canada-water-references')?.toggleAttribute('hidden',topic==='precipitation');
  $('[data-canada-water-resource-scope]').textContent=dataset.scope;
  for(const layer of root.querySelectorAll<SVGElement>('[data-canada-basin-water],[data-canada-basin-labels]'))layer.toggleAttribute('hidden',topic!=='drainage');
  for(const label of root.querySelectorAll<SVGElement>('[data-canada-basin-label]')){const id=label.getAttribute('data-canada-basin-label');label.toggleAttribute('hidden',!!(state.only&&state.area&&id!==state.area&&!(state.area==='nelson'&&id==='saskatchewan')));}
  for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-topic]'))button.setAttribute('aria-pressed',String(button.dataset.canadaWaterTopic===topic));
  for(const panel of root.querySelectorAll<HTMLElement>('[data-canada-water-resource-reading]'))panel.hidden=panel.dataset.canadaWaterResourceReading!==topic;
  for(const legend of root.querySelectorAll<HTMLElement>('[data-canada-water-resource-legend]'))legend.hidden=legend.dataset.canadaWaterResourceLegend!==topic;
  for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-group]'))button.setAttribute('aria-pressed',String(button.dataset.canadaWaterGroupTopic===topic&&button.dataset.canadaWaterGroup===state.area));
  renderReading(topic);
  if(!isVisible())return;
  root.querySelector<HTMLElement>('[data-canada-water-precipitation-key]')?.toggleAttribute('hidden',topic!=='precipitation');
  if(topic==='precipitation')drawRaster();
  else if(geometry.has(topic)){if(vectors.dataset.canadaWaterVectorTopic!==topic)buildVectors(topic);drawVectors();setLoading(null);}
  else if(errors.has(topic))setLoading('分布図を読み込めませんでした。区分一覧と出典は確認できます。',true);
  else void loadGeometry(topic);
 }
 select.addEventListener('change',()=>emit({area:select.value||null,only:false}));
 only.addEventListener('change',()=>emit({only:only.checked&&!!state.area}));
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-group]'))button.addEventListener('click',()=>emit({area:button.dataset.canadaWaterGroup!,only:false}));
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-topic]'))button.addEventListener('click',()=>emit({topic:button.dataset.canadaWaterTopic as WaterTopic,area:null,only:false,frame:null}));
 vectors.addEventListener('click',event=>{if(ignoreClick){ignoreClick=false;return;}const target=(event.target as Element).closest<SVGGElement>('[data-canada-water-resource-shape]');if(target)emit({area:target.dataset.canadaWaterResourceShape!,only:false});});
 vectors.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=(event.target as Element).closest<SVGGElement>('[data-canada-water-resource-shape]');if(target){event.preventDefault();emit({area:target.dataset.canadaWaterResourceShape!,only:false});}});
 $('[data-canada-water-resource-reset]').addEventListener('click',()=>emit({area:null,only:false,frame:null}));
 for(const label of root.querySelectorAll<SVGElement>('[data-canada-basin-label]')){const choose=()=>emit({area:label.dataset.canadaBasinLabel!,only:false});label.addEventListener('click',choose);label.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});}
 $('[data-canada-water-full]').addEventListener('click',()=>camera(full));
 root.querySelector('[data-canada-water-whole]')?.addEventListener('click',()=>camera([0,0,900,580]));
 $('[data-canada-water-focus]').addEventListener('click',()=>{if(state.topic==='surface'||state.topic==='precipitation')return;const dataset=datasets[state.topic],features=geometry.get(state.topic)?.features.filter(feature=>isMatch(feature,dataset));if(features?.length)camera(canadaWaterFit(features));});
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-zoom]'))button.addEventListener('click',()=>{const factor=button.dataset.canadaWaterZoom==='in'?.7:1/.7;const width=Math.min(900,Math.max(3,frame[2]*factor)),height=Math.min(580,Math.max(3,frame[3]*factor));camera([frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height]);});
 retry.addEventListener('click',()=>{if(state.topic==='surface')return;errors.delete(state.topic);if(state.topic==='precipitation')failedImages.clear();rasterKey='';render(state);});
 map.addEventListener('keydown',event=>{if(event.target!==map)return;const movement:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const direction=movement[event.key];if(direction){event.preventDefault();camera([frame[0]+direction[0]*frame[2]*.15,frame[1]+direction[1]*frame[3]*.15,frame[2],frame[3]]);}});
 map.addEventListener('pointerdown',event=>{if(event.button!==0||event.pointerType==='touch')return;drag={x:event.clientX,y:event.clientY,frame:[...frame],moved:false};});
 map.addEventListener('pointermove',event=>{if(!drag)return;const bounds=map.getBoundingClientRect(),dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)<5&&!drag.moved)return;drag.moved=true;map.setPointerCapture?.(event.pointerId);const scale=Math.min(bounds.width/drag.frame[2],bounds.height/drag.frame[3]);if(scale>0){frame=safeFrame([drag.frame[0]-dx/scale,drag.frame[1]-dy/scale,drag.frame[2],drag.frame[3]]);drawCamera();}});
 map.addEventListener('pointerup',()=>{if(drag?.moved){ignoreClick=true;camera(frame);}drag=null;});
 map.addEventListener('pointercancel',()=>{drag=null;render(state);});
 const resize=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(()=>{if(isVisible())drawCamera();});resize?.observe(map);
 return {render};
}
