import {validateMexicoSurfaceManifest, mexicoSurfaceGradient, mexicoSurfaceTickPosition, type MexicoSurfaceManifest} from '../lib/atlas-mexico-quantitative';
import {mexicoBasinLabelPoint,validateMexicoWaterCollection, type MexicoWaterFeature} from '../lib/atlas-mexico-hydrology';
import {projectLonLat,geometryPath} from '../lib/atlas-mexico-geometry';
import {preparedMexicoBasinPlan} from '../lib/atlas-mexico-basin-evidence.mjs';

export interface MexicoNaturePreparedAssets {surfaceAssetBase: string; basinAssetBase: string}

/** Shares selection, URL and generation ownership with the hydrology controller. */
export function initMexicoNatureSurfaces(
  root: HTMLElement,
  assets: MexicoNaturePreparedAssets,
  json: (file: string, base: string) => Promise<any>,
  chooseBasin: (id: string) => void,
) {
  const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const ns = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('data-mexico-prepared-surface', '');
  group.setAttribute('pointer-events', 'none');
  q('[data-mexico-hydrology-overlay]')?.append(group);
  const legend = document.createElement('div');
  legend.className = 'mexico-quantitative-legend';
  legend.setAttribute('data-mexico-quantitative-legend', '');
  const precipitationReason = document.createElement('p');
  precipitationReason.className = 'mexico-precipitation-reading-reason';
  precipitationReason.setAttribute('data-mexico-precipitation-reason', '');
  precipitationReason.textContent = '北部の乾いた空気と、南部へ届く海からの湿った空気が地域差を生む。山地では、湿った風が上昇する側で雨が増え、風下で少なくなる。';
  const foreground = document.createElementNS(ns,'g');
  foreground.setAttribute('data-mexico-basin-foreground','');
  q('[data-mexico-nature-main-map]')?.append(foreground);
  const overviewButton=document.createElement('button');
  overviewButton.type='button';overviewButton.textContent='3水系の概要へ戻る';
  overviewButton.setAttribute('data-mexico-basin-overview','');
  overviewButton.addEventListener('click',()=>chooseBasin(''));
  q('[data-mexico-hydrology-title]')?.after(overviewButton);
  const overview=document.createElement('div');overview.className='mexico-basin-overview';
  overview.setAttribute('data-mexico-basin-overview-reading','');
  q('[data-mexico-hydrology-definition]')?.after(overview);
  q('[data-mexico-hydrology-legend]')?.after(legend);
  const legendHome = document.createComment('quantitative-legend-home'); legend.before(legendHome);
  const images = new Map<string, SVGImageElement>();
  let surfaces: MexicoSurfaceManifest | null = null, basins: any = null,basinControlsLoaded=false;
  const text = (selector: string, value: string) => {const node = q(selector); if (node) node.textContent = value;};
  function sourceLink(label: string, href: string): HTMLAnchorElement {
    const link = document.createElement('a'); link.href = href; link.textContent = label; return link;
  }
  function readyImage(files: string | string[], current: () => boolean): void {
    const names = typeof files === 'string' ? [files] : files;
    const nodes = names.map(file => {
      let image = images.get(file);
      if (!image) {
        image = document.createElementNS(ns, 'image');
        for (const [key, value] of Object.entries({x:'0', y:'0', width:'900', height:'580', preserveAspectRatio:'none'})) image.setAttribute(key,value);
        image.setAttribute('data-mexico-numeric-image',''); images.set(file,image);
      }
      return image;
    });
    group.replaceChildren(...nodes);
    const success = () => {if(current())root.dataset.mexicoHydrologyReady=nodes.every(image=>image.dataset.loaded==='true')?'true':'loading';};
    let failed = false;
    nodes.forEach((image,index) => {
      if(image.dataset.loaded==='true')return;
      image.onload=()=>{image.dataset.loaded='true';image.onload=null;image.onerror=null;if(!failed)success();};
      image.onerror=()=>{
        image.onload=null;image.onerror=null;images.delete(names[index]);failed=true;
        if(!current())return;
        group.replaceChildren();root.dataset.mexicoHydrologyReady='false';
        text('[data-mexico-hydrology-status]','数値面の画像を取得できませんでした。再読み込みしてください。');
        const retry=q<HTMLElement>('[data-mexico-hydrology-retry]');if(retry)retry.hidden=false;
      };
      if(image.getAttribute('href')!==names[index])image.setAttribute('href',names[index]);
    });
    success();
  }
  const basinLabelPoints = new Map<string,number[] | null>();
  const basinFeatures = new Map<string,MexicoWaterFeature>();
  function basinControl(node:SVGElement,id:string,name:string,selected:boolean):void {
    node.setAttribute('data-mexico-basin-system',id);node.setAttribute('role','button');
    node.setAttribute('tabindex','0');node.setAttribute('aria-label',`${name}の国内流域を読む`);
    node.setAttribute('aria-pressed',String(selected));node.style.pointerEvents='auto';
    node.addEventListener('click',()=>chooseBasin(id));
    node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseBasin(id);}});
  }
  async function basinLabels(plans: any[], current: () => boolean): Promise<SVGTextElement[]> {
    const labels:SVGTextElement[]=[];
    const map=q<SVGSVGElement>('[data-mexico-nature-main-map]');
    const frame=(map?.getAttribute('viewBox')??'0 0 900 580').split(/\s+/).map(Number);
    const scale=Math.min((map?.clientWidth||900)/frame[2],(map?.clientHeight||580)/frame[3]);
    const fontSize=13/scale;
    for(const plan of plans){
      if(!basinLabelPoints.has(plan.id)){
        let feature=basinFeatures.get(plan.id);
        if(!feature){const collection=await json(plan.basinGeojson,assets.basinAssetBase);
          feature={type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:collection.features.flatMap((item:MexicoWaterFeature)=>item.geometry.type==='Polygon'?[item.geometry.coordinates]:item.geometry.coordinates)}};}
        basinFeatures.set(plan.id,feature);
        basinLabelPoints.set(plan.id,mexicoBasinLabelPoint(feature));
      }
      if(!current())return [];
      const point=basinLabelPoints.get(plan.id);if(!point)continue;
      const [x,y]=projectLonLat(point),label=document.createElementNS(ns,'text');
      label.classList.add('mexico-basin-system-label');label.dataset.mexicoBasinLabel=plan.id;
      label.dataset.sourceLonlat=JSON.stringify(point);label.setAttribute('x',String(x));label.setAttribute('y',String(y));
      label.setAttribute('font-size',String(fontSize));label.setAttribute('text-anchor','middle');
      const words=plan.label.split('―');
      const rows=words.length===3?[words[0]+'―',words.slice(1).join('―')]:words.length===2?[words[0]+'―',words[1]]:[plan.label];
      rows.forEach((row:string,index:number)=>{const span=document.createElementNS(ns,'tspan');span.setAttribute('x',String(x));span.setAttribute('dy',index?'1.2em':'0');span.textContent=row;label.append(span);});
      labels.push(label);
    }
    return labels;
  }
  function reset(): void {
    group.style.display = 'none'; foreground.style.display='none';legend.hidden = true;
    precipitationReason.hidden = true;
    overview.hidden=true;overviewButton.hidden=true;
    root.dataset.mexicoPreparedCategory = '';
  }
  reset();
  async function render(category: 'precipitation' | 'elevation' | 'basins', feature: string, current: () => boolean): Promise<string | null> {
    if (category === 'basins') {
      if (!basins) basins = await json('catalog.json', assets.basinAssetBase);
      if (!current()) return null;
      legendHome.after(legend);
      // Each plan rejects unverified flow arrows and mouth markers, even if supplied accidentally.
      const plans = basins.systems.map((system: any) => preparedMexicoBasinPlan(basins, system.id));
      if(basins.controlGeometry&&!basinControlsLoaded){
        const controls=validateMexicoWaterCollection(await json(basins.controlGeometry.file,assets.basinAssetBase),'basins');
        if(!current())return null;
        if(controls.features.length!==3||!plans.every((plan:any)=>controls.features.some(item=>item.properties.id===plan.id)))throw new Error('The three domestic control areas are missing');
        for(const item of controls.features)basinFeatures.set(item.properties.id,item);basinControlsLoaded=true;
      }
      const requested = feature.startsWith('basins:') ? feature.slice(7) : '';
      const plan = requested ? plans.find((item: any) => item.id === requested || item.basinSourceIds.includes(requested)) : undefined;
      const focusId = foreground.contains(document.activeElement) ? (document.activeElement as SVGElement).getAttribute('data-mexico-basin-system') : null;
      const focusLabel=document.activeElement?.hasAttribute('data-mexico-basin-label');
      overviewButton.hidden=!requested;overview.hidden=!!plan;
      q('[data-mexico-hydrology-title]')?.after(overviewButton,overview);
      const scopeBrief:Record<string,string>={bravo:'米国側の上流域を除いて表示。','lerma-chapala-santiago':'海へ直接流れない閉鎖流域を含めない。','grijalva-usumacinta':'国外の上流域を除いて表示。河口の範囲は確認中。'};
      overview.replaceChildren(...plans.map((item:any)=>{
        const section=document.createElement('section'),heading=document.createElement('h3'),copy=document.createElement('p');
        heading.textContent=item.label;copy.textContent=`国内${item.basinSourceIds.length}区分。${scopeBrief[item.id]}`;
        section.append(heading,copy);return section;
      }));
      const scopeDetails=document.createElement('details'),scopeSummary=document.createElement('summary');
      scopeSummary.textContent='国内範囲と流域のまとめ方';scopeDetails.append(scopeSummary);
      for(const item of plans){const copy=document.createElement('p');copy.textContent=`${item.label}：${item.scopeNote}`;scopeDetails.append(copy);}
      overview.append(scopeDetails);
      legend.replaceChildren(); legend.hidden = false;
      const swatch = document.createElement('span'); swatch.className = 'mexico-basin-fill-key'; swatch.setAttribute('aria-hidden', 'true');
      legend.append(swatch, document.createTextNode('3代表水系に関連する国内の流域区分。選択すると他の水系を薄く表示'));
      text('[data-mexico-nature-map-title]', '3代表水系の国内流域');
      text('[data-mexico-nature-map-edition]', 'INEGI 国内流域区分');
      text('[data-mexico-nature-period]', basins.nationalScopeLabelJa);
      text('#mexico-nature-map-title', 'メキシコの3代表水系に関連する国内流域');
      text('#mexico-nature-map-desc', `${basins.nationalScopeLabelJa}本流・流向・河口は未確認です。`);
      text('[data-mexico-hydrology-title]', plan?.label ?? '3代表水系の流域を読む');
      text('[data-mexico-hydrology-lead]', '流域は、雨が河川へ集まる土地の範囲です。3つの代表水系から、州境とは異なる水のまとまりを読みます。');
      text('[data-mexico-hydrology-value]', plan ? `${plan.label}：原資料の国内${plan.basinSourceIds.length}区分。原地域名に基づく仮のまとめで、本流の連続性は確認中です。` : requested?'指定された流域はこの3代表水系の入口には収録されていません。地図内の流域や名前から選べます。':'地図内の流域や名前を選ぶと、その水系の国内範囲を強調します。');
      text('[data-mexico-hydrology-definition]', plan?.scopeNote ?? basins.nationalScopeLabelJa);
      text('[data-mexico-hydrology-limitations]', '本流・流向・河口の表示は原典確認待ちで未完成です。地図の重なりだけから、農地の取水源・用水路・洪水危険度は判断できません。');
      text('[data-mexico-hydrology-status]', !requested||plan ? '本流・流向・河口は原典確認待ちです。' : '指定流域は未収録です。代表水系を選んでください。');
      const source = q('[data-mexico-hydrology-source]');
      if (source) {
        const p = document.createElement('p'); p.textContent = 'INEGIの国内158流域の原ID・名称を保持し、関連区分をまとめています。国外の上流域は追加せず、表示面はINEGI国土境界内に切り取っています。取得日を刊行年や観測年に置き換えません。原線には河川名や確定した流下方向がなく、線の端点を河口に置き換えたり、湖内や途切れた区間を直線でつないだりしていません。';
        const ids = document.createElement('p'); ids.textContent = plan ? `原ID：${plan.basinSourceIds.join('、')}` : '';
        source.replaceChildren(p, ids, sourceLink('原典・利用条件・国内範囲と未確認事項', assets.basinAssetBase + 'catalog.json'), document.createTextNode(' ／ '), sourceLink('INEGI SIATL', basins.source.sourceUrl));
      }
      root.dataset.mexicoPreparedCategory = category;
      group.style.display = ''; group.dataset.mexicoBasinSystem = plan?.id ?? '';
      const labels=await basinLabels(plans,current);if(!current())return null;
      readyImage(plans.map((item:any)=>assets.basinAssetBase+item.domesticFill.file),current);
      for(const item of plans){const image=images.get(assets.basinAssetBase+item.domesticFill.file)!;image.classList.add('mexico-basin-system-image');image.classList.toggle('is-muted',!!plan&&plan.id!==item.id);image.dataset.mexicoBasinSystemImage=item.id;}
      const hitAreas=plans.map((item:any)=>{const path=document.createElementNS(ns,'path');
        path.setAttribute('d',geometryPath(basinFeatures.get(item.id)!.geometry));path.setAttribute('fill','transparent');
        path.setAttribute('fill-rule','evenodd');path.classList.add('mexico-basin-hit-area');
        basinControl(path,item.id,item.label,item.id===plan?.id);return path;
      });
      for(const label of labels){const item=plans.find((item:any)=>item.id===label.dataset.mexicoBasinLabel);basinControl(label,item.id,item.label,item.id===plan?.id);}
      foreground.replaceChildren(...hitAreas,...labels);foreground.style.display='';
      if(focusId)foreground.querySelector<SVGElement>(`${focusLabel?'text':'path'}[data-mexico-basin-system="${focusId}"]`)?.focus({preventScroll:true});
      return plan?.label ?? '3代表水系の国内流域';
    }
    if (!surfaces) surfaces = validateMexicoSurfaceManifest(await json('manifest.json', assets.surfaceAssetBase));
    if (!current()) return null;
    const layer = surfaces.layers[category], {domain, ticks, unit} = layer.legend;
    const readingSummary = q('[data-mexico-water-reading-summary]');
    if (readingSummary) {
      const lead = readingSummary.querySelector(':scope > .mexico-takeaway');
      if (category === 'precipitation') {
        precipitationReason.hidden = false;
        if (lead) lead.after(precipitationReason); else readingSummary.prepend(precipitationReason);
        readingSummary.append(legend);
      }
      else if (lead) lead.after(legend); else readingSummary.prepend(legend);
    }
    legend.replaceChildren(); legend.hidden = false;
    const label = document.createElement('p'); label.className = 'mexico-quantitative-legend-label'; label.textContent = `${layer.titleJa}（${unit}）｜${category === 'precipitation' ? '多いほど濃い青' : '高いほど濃い色'}`;
    const ramp = document.createElement('div'); ramp.className = 'mexico-quantitative-ramp'; ramp.style.background = mexicoSurfaceGradient(layer.legend); ramp.setAttribute('aria-hidden', 'true');
    const values = document.createElement('div'); values.className = 'mexico-quantitative-ticks';
    values.setAttribute('role', 'list'); values.setAttribute('aria-label', `${layer.titleJa}の数値目盛り（${unit}）`);
    let previousPosition = -Infinity, previousLower = false;
    for (const value of ticks) {
      const tick = document.createElement('span'), position = mexicoSurfaceTickPosition(layer.legend, value);
      const lower = position - previousPosition < 12 && !previousLower;
      tick.textContent = value.toLocaleString('ja-JP'); tick.style.left = `${position}%`;
      tick.dataset.edge = value === domain[0] ? 'start' : value === domain[1] ? 'end' : '';
      tick.dataset.row = lower ? 'lower' : 'upper';
      tick.setAttribute('role', 'listitem'); tick.setAttribute('aria-label', `${tick.textContent} ${unit}`);
      if (lower) values.dataset.staggered = 'true';
      values.append(tick); previousPosition = position; previousLower = lower;
    }
    legend.append(label, ramp, values);
    if (layer.legend.interval) {
      const interval = document.createElement('p'); interval.className = 'mexico-quantitative-interval';
      interval.textContent = '等雨量線・色の帯は250mm間隔。線の数字はmm/年。海域・国外・欠測と補間できない区画は透明。';
      legend.append(interval);
    }
    text('[data-mexico-nature-map-title]', layer.titleJa);
    text('[data-mexico-nature-map-edition]', layer.sourceLabelJa);
    text('[data-mexico-nature-period]', layer.periodLabelJa);
    text('#mexico-nature-map-title', `メキシコの${layer.titleJa}`);
    text('#mexico-nature-map-desc', `${layer.descriptionJa} ${layer.periodLabelJa}`);
    text('[data-mexico-hydrology-title]', layer.titleJa);
    text('[data-mexico-hydrology-lead]', category === 'precipitation' ? '北部・北西部は雨が少なく、南部・南東部は雨が多い。250mmごとの等雨量線と、雨の多いほど濃い青の帯で地域差を読む。' : '高い地域ほど濃い色。山地・中央高原・沿岸低地の高さを、m単位の凡例で読み比べます。');
    text('[data-mexico-hydrology-value]', layer.periodLabelJa);
    text('[data-mexico-hydrology-definition]', category === 'precipitation' ? '等雨量線は、年降水量が同じ場所を結ぶ線です。線と線の間を250mmごとの帯として塗り分け、その分布を河川・地下水や農地の水利用と読み比べます。地図はGPCCの1991–2020年平年値から作成しています。' : layer.descriptionJa);
    text('[data-mexico-hydrology-limitations]', layer.limitationsJa.join(' '));
    text('[data-mexico-hydrology-status]', '');
    const source = q('[data-mexico-hydrology-source]');
    if (source) {
      const period = document.createElement('p'); period.textContent = category === 'precipitation' ? 'GPCCと都市のSMN雨温図は1991–2020年に期間を合わせています。地図は0.25°格子の解析値、雨温図は個別観測所の平年値なので、数値は一致しません。' : 'NOAA ETOPO 2022の60秒角原格子を使用。2022はモデルの版年で、全国共通の観測年ではありません。';
      const processing = document.createElement('p'); processing.textContent = category === 'precipitation' ? layer.descriptionJa + ' 隣接する格子中心間の辺上を線形補間し、各区画内を直線で結ぶ等値線と段階帯です。細かい格子への再標本化や平滑化は行いません。4点の原値がすべて有効な区画だけを描画し、欠測・補間できない沿岸区画は透明。元のINEGI2006年等雨量線は混ぜていません。既存のLambert投影と国土マスクを使用し、原格子・利用条件・加工とSHA256を保持しています。' : '数値格子から生成し、既存のINEGI Lambert投影に合わせています。海域・国外と原データ欠損は透明。出典、利用条件、原値と画像のSHA256、加工・検証記録を保存しています。';
      source.replaceChildren(period, processing, sourceLink(layer.sourceLabelJa + ' 原典', layer.sourceUrl), document.createTextNode(' ／ '), sourceLink('期間・原値・利用条件・加工と検証', assets.surfaceAssetBase + layer.provenanceFile));
    }
    group.style.display = ''; group.removeAttribute('data-mexico-basin-system'); root.dataset.mexicoPreparedCategory = category;
    readyImage(assets.surfaceAssetBase + layer.image.file, current);
    return layer.titleJa;
  }
  return {render, reset, invalidate: () => {surfaces = null; basins = null;basinControlsLoaded=false;basinFeatures.clear();basinLabelPoints.clear();}};
}
