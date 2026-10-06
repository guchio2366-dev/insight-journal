import {validateMexicoSurfaceManifest, mexicoSurfaceGradient, mexicoSurfaceTickPosition, type MexicoSurfaceManifest} from '../lib/atlas-mexico-quantitative';
import {mexicoBasinLabelPoint, type MexicoWaterFeature} from '../lib/atlas-mexico-hydrology';
import {projectLonLat} from '../lib/atlas-mexico-geometry';
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
  const entries = document.createElement('div');
  entries.className = 'mexico-basin-system-picker';
  entries.setAttribute('data-mexico-basin-systems', '');
  entries.setAttribute('role', 'group');
  entries.setAttribute('aria-label', '代表水系の国内範囲を選ぶ');
  q('[data-mexico-hydrology-legend]')?.after(legend, entries);
  const legendHome = document.createComment('quantitative-legend-home'); legend.before(legendHome);
  const images = new Map<string, SVGImageElement>();
  let surfaces: MexicoSurfaceManifest | null = null, basins: any = null;
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
  async function basinLabels(plans: any[], current: () => boolean): Promise<SVGTextElement[]> {
    const labels:SVGTextElement[]=[];
    const map=q<SVGSVGElement>('[data-mexico-nature-main-map]');
    const frame=(map?.getAttribute('viewBox')??'0 0 900 580').split(/\s+/).map(Number);
    const scale=Math.min((map?.clientWidth||900)/frame[2],(map?.clientHeight||580)/frame[3]);
    const fontSize=13/scale;
    for(const plan of plans){
      if(!basinLabelPoints.has(plan.id)){
        const collection=await json(plan.basinGeojson,assets.basinAssetBase);
        const feature:MexicoWaterFeature={type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:collection.features.flatMap((item:MexicoWaterFeature)=>item.geometry.type==='Polygon'?[item.geometry.coordinates]:item.geometry.coordinates)}};
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
    group.style.display = 'none'; legend.hidden = true; entries.hidden = true;
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
      const requested = feature.startsWith('basins:') ? feature.slice(7) : '';
      const plan = requested ? plans.find((item: any) => item.id === requested || item.basinSourceIds.includes(requested)) : undefined;
      const focusId = entries.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.mexicoBasinSystem : null;
      const allButton=document.createElement('button');allButton.type='button';allButton.textContent='3水系を表示';allButton.dataset.mexicoBasinSystem='all';allButton.setAttribute('aria-pressed',String(!requested));allButton.addEventListener('click',()=>chooseBasin(''));
      entries.replaceChildren(allButton,...plans.map((item: any) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label;
        button.dataset.mexicoBasinSystem = item.id; button.setAttribute('aria-pressed', String(item.id === plan?.id));
        button.addEventListener('click', () => chooseBasin(item.id)); return button;
      }));
      entries.hidden = false;
      if (focusId) entries.querySelector<HTMLButtonElement>(`[data-mexico-basin-system="${focusId}"]`)?.focus({preventScroll: true});
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
      text('[data-mexico-hydrology-value]', plan ? `${plan.label}：原資料の国内${plan.basinSourceIds.length}区分。原地域名に基づく仮のまとめで、本流の連続性は確認中です。` : requested?'指定された流域はこの3代表水系の入口には収録されていません。上の入口から選べます。':'ブラボー、レルマ―チャパラ―サンティアゴ、グリハルバ―ウスマシンタの国内範囲を同時に示します。');
      text('[data-mexico-hydrology-definition]', plan?.scopeNote ?? plans.map((item:any)=>`${item.label}：${item.scopeNote}`).join(' '));
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
      group.append(...labels);
      return plan?.label ?? '3代表水系の国内流域';
    }
    if (!surfaces) surfaces = validateMexicoSurfaceManifest(await json('manifest.json', assets.surfaceAssetBase));
    if (!current()) return null;
    const layer = surfaces.layers[category], {domain, ticks, unit} = layer.legend;
    const readingSummary = q('[data-mexico-water-reading-summary]');
    if (readingSummary) {
      const lead = readingSummary.querySelector(':scope > .mexico-takeaway');
      if (lead) lead.after(legend); else readingSummary.prepend(legend);
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
    text('[data-mexico-nature-map-title]', layer.titleJa);
    text('[data-mexico-nature-map-edition]', layer.sourceLabelJa);
    text('[data-mexico-nature-period]', layer.periodLabelJa);
    text('#mexico-nature-map-title', `メキシコの${layer.titleJa}`);
    text('#mexico-nature-map-desc', `${layer.descriptionJa} ${layer.periodLabelJa}`);
    text('[data-mexico-hydrology-title]', layer.titleJa);
    text('[data-mexico-hydrology-lead]', category === 'precipitation' ? '雨の多い地域ほど濃い青。1991–2020年の平均的な年降水量を、河川・地下水や農地の水利用と読み比べます。' : '高い地域ほど濃い色。山地・中央高原・沿岸低地の高さを、m単位の凡例で読み比べます。');
    text('[data-mexico-hydrology-value]', layer.periodLabelJa);
    text('[data-mexico-hydrology-definition]', layer.descriptionJa);
    text('[data-mexico-hydrology-limitations]', layer.limitationsJa.join(' '));
    text('[data-mexico-hydrology-status]', '');
    const source = q('[data-mexico-hydrology-source]');
    if (source) {
      const period = document.createElement('p'); period.textContent = category === 'precipitation' ? 'GPCCと都市のSMN雨温図は1991–2020年に期間を合わせています。地図は0.25°格子の解析値、雨温図は個別観測所の平年値なので、数値は一致しません。' : 'NOAA ETOPO 2022の60秒角原格子を使用。2022はモデルの版年で、全国共通の観測年ではありません。';
      const processing = document.createElement('p'); processing.textContent = '数値格子から生成し、既存のINEGI Lambert投影に合わせています。海域・国外と原データ欠損は透明。出典、利用条件、原値と画像のSHA256、加工・検証記録を保存しています。';
      source.replaceChildren(period, processing, sourceLink(layer.sourceLabelJa + ' 原典', layer.sourceUrl), document.createTextNode(' ／ '), sourceLink('期間・原値・利用条件・加工と検証', assets.surfaceAssetBase + layer.provenanceFile));
    }
    group.style.display = ''; group.removeAttribute('data-mexico-basin-system'); root.dataset.mexicoPreparedCategory = category;
    readyImage(assets.surfaceAssetBase + layer.image.file, current);
    return layer.titleJa;
  }
  return {render, reset, invalidate: () => {surfaces = null; basins = null;}};
}
