import {geometryPath, projectLonLat} from '../lib/atlas-mexico-geometry';
import {readMexicoWaterSelection, writeMexicoWaterSelection, validateMexicoWaterCollection, mexicoWaterFeatureId, mexicoWaterFeatureName, mexicoWaterLayersForCategory, mexicoWaterFeatureFill, mexicoWaterFeatureStroke, mexicoWaterSourceText, mexicoWaterUnit, mexicoWaterLineLabels, mexicoContourGroups, closestMexicoContour, type MexicoWaterCollection, type MexicoWaterManifest, type MexicoHydrologyLayer, type MexicoWaterSelection, type MexicoWaterFeature} from '../lib/atlas-mexico-hydrology';
import type {MexicoNatureState} from '../lib/atlas-mexico-nature';

export function initMexicoHydrology(root: HTMLElement, assetBase: string, current: () => MexicoNatureState, commit: () => void) {
  const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const ns = 'http://www.w3.org/2000/svg';
  let selection: MexicoWaterSelection = readMexicoWaterSelection(new URL(location.href));
  let version = 0, manifest: MexicoWaterManifest | null = null;
  const cache = new Map<string, Promise<unknown>>(), collections = new Map<MexicoHydrologyLayer, MexicoWaterCollection>();
  const layerGroups = new Map<MexicoHydrologyLayer, SVGGElement>();
  const overlay = q<SVGGElement>('[data-mexico-hydrology-overlay]');
  const body = q<HTMLElement>('[data-mexico-hydrology-body]'), bodyHome = document.createComment('water-reading-home'); body?.before(bodyHome);
  const comparisonBody = q<HTMLElement>('[data-mexico-nature-comparison] .mexico-nature-reading-body');
  const comparisonDetails = document.createElement('details'), comparisonSummary = document.createElement('summary'); comparisonSummary.textContent = '水資源・標高の選択と原典'; comparisonDetails.setAttribute('data-mexico-water-comparison-details',''); comparisonDetails.append(comparisonSummary);
  const comparisonName = document.createElement('p'); comparisonName.className = 'mexico-water-comparison-selection'; comparisonName.setAttribute('data-mexico-water-comparison-selection','');
  const plainReturn = q<HTMLElement>('[data-mexico-nature-plain-return]'), returnHome = document.createComment('water-return-home'); plainReturn?.before(returnHome);
  const overview=q<HTMLElement>('[data-mexico-overview-button]'),overviewHome=document.createComment('water-overview-home');overview?.before(overviewHome);const actions=document.createElement('div');actions.className='mexico-water-reading-actions';actions.setAttribute('data-mexico-water-reading-actions','');
  const readingAside=q<HTMLElement>('.mexico-reading');
  const readingSummary=document.createElement('div');readingSummary.className='mexico-water-reading-summary';readingSummary.setAttribute('data-mexico-water-reading-summary','');
  const waterLead=q<HTMLElement>('[data-mexico-hydrology-lead]'),waterLeadHome=document.createComment('water-lead-home');waterLead?.before(waterLeadHome);
  const comparisonLead=q<HTMLElement>('[data-mexico-nature-comparison-lead]'),comparisonLeadHome=document.createComment('water-comparison-lead-home');comparisonLead?.before(comparisonLeadHome);
  const comparisonValue=q<HTMLElement>('[data-mexico-nature-comparison-value]'),valueHome=document.createComment('water-value-home');comparisonValue?.before(valueHome);
  const readingTitle=q<HTMLElement>('[data-mexico-hydrology-title]'),titleHome=document.createComment('water-title-home');readingTitle?.before(titleHome);
  const dock=q<HTMLElement>('.mexico-nature-comparison-dock'),dockHome=document.createComment('water-dock-home');dock?.before(dockHome);
  const alternativeComparisons=document.createElement('details');alternativeComparisons.setAttribute('data-mexico-water-other-comparisons','');const alternativeSummary=document.createElement('summary');alternativeSummary.textContent='別の指標との比較';alternativeComparisons.append(alternativeSummary);
  const status=q<HTMLElement>('[data-mexico-hydrology-status]'),statusHome=document.createComment('water-status-home');status?.before(statusHome);
  const retry=q<HTMLElement>('[data-mexico-hydrology-retry]'),retryHome=document.createComment('water-retry-home');retry?.before(retryHome);
  const legendHomes = new Map<HTMLElement, Comment>();
  for (const legend of root.querySelectorAll<HTMLElement>('[data-mexico-nature-legend]')) {const anchor = document.createComment('native-legend-home'); legend.before(anchor); legendHomes.set(legend, anchor);}
  function json(name: string): Promise<any> {
    if (!cache.has(name)) cache.set(name, fetch(assetBase + name).then(response => {if (!response.ok) throw new Error(`${response.status}`); return name.endsWith('.gz') ? response.body ? new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json() : Promise.reject(new Error('資料の本文がありません')) : response.json();}).catch(error => {cache.delete(name); throw error;}));
    return cache.get(name)!;
  }
  const text = (selector: string, value: string) => {const element = q(selector); if (element) element.textContent = value;};
  const show = (selector: string, shown: boolean) => {const element = q<HTMLElement>(selector); if (element) element.hidden = !shown;};
  const titles: Record<string, string> = {'rivers-groundwater': '河川・地下水', precipitation: '降水量', basins: '河川の流域', elevation: '標高・等高線'};
  const meanings: Record<string,string> = {elevation:'等高線は同じ標高を結ぶ線です。基準はEGM2008ジオイド・単位m。地形地域や州平均の標高ではありません。',precipitation:'等雨量線は原資料の同じ年平均降水量mmを結ぶ線です。隣接する面全体の値や州平均ではありません。',basins:'国内の河川集水域の区分です。州境、地下水の流動区域や給水区域とは異なります。','rivers-groundwater':'原資料の河川ネットワークで、間欠・仮想流も含みます。Strahler次数は小流域内の支流の合流関係で、流量・貯水量・河川幅を表しません。'};
  const limitations: Record<string,string> = {elevation:'2022年はモデルの版です。約60秒角のDEMから500m間隔の線を作成しており、測量級の地点標高や正確な山頂高度は示しません。海底を除き、元DEMの有効な負標高は欠測値と区別して保持しています。',precipitation:'関連2005作成ガイド§3.3・印刷15頁は1921〜1975年の観測を説明しますが、この2006刊行配布版との対応は未確認です。現在の降水量ではありません。1:100万の全国概観で、線の間を補間していません。',basins:'原資料の国内範囲を保持しています。国外の上流域は未収録のため、国際河川の全流域ではありません。全国用の簡略化境界から洪水危険度や水収支を推定しません。','rivers-groundwater':'原資料の小流域内次数7以上に限る流路表示で、細い全河川を網羅しません。小流域間で次数が連続するとは限らず、河川名を推測して付けていません。現在の取水量や水位は示しません。'};
  const methods: Record<MexicoHydrologyLayer,string> = {precipitation:'原492等雨量線・19値を保持し、経緯度へ変換。面の補間、線の結合、線形の簡略化は行っていません。',contours:'原DEMのセル値から500m間隔の線を作成し、メキシコの陸域で切り取り、全国表示用に0.002度で簡略化。表示線は0〜5,000mです。',basins:'原国内範囲と全158流域を保持。全国表示用に0.002度で境界を簡略化し、国外の上流域は追加していません。',rivers:'全61,350原区間のID・parts・端点を保持し、次数7/8/9の3群へまとめています。全国表示用に0.002度で線を簡略化し、区間間の接続線を作っていません。',groundwater:'水文地質の原分類を表示。法定帯水層の境界や現在の地下水量とは区別します。'};
  function readingLayout(active: boolean): void {
    const compared = active && !!current().compare;
    root.dataset.mexicoWaterComparison=String(compared);
    show('[data-mexico-hydrology-reading]',active && !compared);
    if (compared && body && comparisonBody) {comparisonDetails.append(body); comparisonBody.prepend(comparisonDetails);if(retry)comparisonBody.prepend(retry);if(status)comparisonBody.prepend(status);comparisonBody.prepend(comparisonName);}
    else {if (body && bodyHome.parentNode) bodyHome.after(body);if(status && statusHome.parentNode)statusHome.after(status);if(retry && retryHome.parentNode)retryHome.after(retry); comparisonDetails.remove(); comparisonName.remove();}
    if(active){(readingAside ?? root).prepend(readingSummary);}
    if(compared && comparisonLead){readingSummary.append(comparisonLead);if(waterLead && waterLeadHome.parentNode)waterLeadHome.after(waterLead);}
    else {if(comparisonLead && comparisonLeadHome.parentNode)comparisonLeadHome.after(comparisonLead);if(active && waterLead)readingSummary.append(waterLead);else if(waterLead && waterLeadHome.parentNode)waterLeadHome.after(waterLead);}
    if (compared && plainReturn) {actions.append(plainReturn);readingSummary.append(actions);}
    else {actions.remove();if (plainReturn && returnHome.parentNode)returnHome.after(plainReturn);}
    if(active && overview && (compared?comparisonBody:body))(compared?comparisonBody:body)!.append(overview);
    else if(overview && overviewHome.parentNode)overviewHome.after(overview);
    if(active && readingTitle && body)body.prepend(readingTitle);else if(readingTitle && titleHome.parentNode)titleHome.after(readingTitle);
    if(compared && comparisonValue){readingSummary.append(comparisonValue);comparisonValue.setAttribute('data-mexico-water-fixed-value','');}
    else {if(comparisonValue && valueHome.parentNode)valueHome.after(comparisonValue);comparisonValue?.removeAttribute('data-mexico-water-fixed-value');}
    if(compared && dock && comparisonBody){alternativeComparisons.append(dock);comparisonBody.append(alternativeComparisons);}
    else {if(dock){if(active)readingSummary.append(dock);else if(dockHome.parentNode)dockHome.after(dock);}alternativeComparisons.remove();}
    if(!active)readingSummary.remove();
  }
  function choose(layer: MexicoHydrologyLayer, id: string): void {
    selection = {...selection, feature: `${layer}:${id}`}; commit();
    root.dispatchEvent(new CustomEvent('mexico-reading-mode', {bubbles: true, detail: {selected: true}}));
  }
  function baseLayers(): void {
    const active = !!current().category;
    for (const group of root.querySelectorAll<SVGGElement>('[data-mexico-nature-layer]')) group.style.display = active ? selection.base === group.dataset.mexicoNatureLayer ? '' : 'none' : group.dataset.mexicoNatureLayer === current().view && !current().fallback ? '' : 'none';
    q<SVGGElement>('[data-mexico-nature-neutral]')?.setAttribute('style', active && selection.base === 'plain' ? '' : 'display:none');
    if (active) {q<SVGGElement>('[data-mexico-nature-vector]')?.setAttribute('style', ''); q<SVGGElement>('[data-mexico-nature-static]')?.setAttribute('style', 'display:none'); show('[data-mexico-nature-static-note]', false); q('[data-mexico-nature-main-map]')?.setAttribute('data-mexico-nature-map-mode', 'geo-overlay');}
    const base = q<HTMLSelectElement>('[data-mexico-hydrology-base]'); if (base) base.value = selection.base;
    const keyHost = q('[data-mexico-water-background-key-host]') ?? q('[data-mexico-hydrology-base-key-host]');
    for (const [legend, anchor] of legendHomes) {if (active && keyHost) {keyHost.append(legend); legend.hidden = selection.base !== legend.dataset.mexicoNatureLegend;} else {anchor.after(legend); legend.hidden = current().view !== legend.dataset.mexicoNatureLegend;}}
    text('[data-mexico-hydrology-base-key-title]', `背景：${selection.base === 'plain' ? '白地図・州境' : selection.base === 'climate' ? '気候区分' : '地形地域'}の凡例と版`);
    show('[data-mexico-water-background-key]',active && selection.base !== 'plain');
    const basinCover=current().category==='basins'?'（流域面が上に重なる背景）':'';
    text('[data-mexico-water-background-key-title]',selection.base==='climate'?`背景：気候6群・2008刊行版${basinCover}`:selection.base==='relief'?`背景：自然地理地域・2001版${basinCover}`:'');
    text('[data-mexico-hydrology-base-source]', selection.base === 'plain' ? '背景の州境はINEGI・2025年12月版です。水資源や標高の境界とは分けて読みます。' : selection.base === 'climate' ? '背景はINEGI・2008刊行の気候原分類21を6群で表示。統一観測対象期間は未記載です。水資源の期間と異なります。' : '背景はINEGI・2001版の15自然地理地域＋原資料の分類なしです。標高mの区分ではありません。');
    root.dataset.mexicoWaterBase = selection.base;
  }
  function selectedFeature(layers: MexicoHydrologyLayer[]) {
    for (const layer of layers) for (const feature of collections.get(layer)?.features ?? []) if (`${layer}:${mexicoWaterFeatureId(feature)}` === selection.feature) return {layer, feature};
    return null;
  }
  function updateReading(layers: MexicoHydrologyLayer[]): void {
    const category = current().category, selected = selectedFeature(layers), available = layers.filter(layer => collections.has(layer));
    const subject = selected?.layer === 'rivers' || selected?.layer === 'groundwater' ? 'rivers-groundwater' : selected?.layer === 'contours' ? 'elevation' : selected?.layer === 'precipitation' ? 'precipitation' : selected?.layer === 'basins' ? 'basins' : category;
    const metadata = selected ? manifest!.layers[selected.layer]! : manifest!.layers[available[0]]!;
    const name = selected ? mexicoWaterFeatureName(selected.feature) : titles[category];
    const riverOrder=selected?.layer==='rivers' ? /^rivers-order-([789])$/.exec(String(selected.feature.properties.classId ?? ''))?.[1] : null;
    text('[data-mexico-hydrology-title]',riverOrder ? `小流域内次数${riverOrder}の河川` : name);q('[data-mexico-hydrology-title]')?.setAttribute('title',name);
    const lead = category === 'elevation' ? selected ? `原DEMから作成した${selected.feature.properties.elevationM.toLocaleString('ja-JP')} mの等高線を選択しています。` : '同じ標高の線をたどり、山地・高原・沿岸低地の高さを比べる。' : category === 'precipitation' ? '降水の地域差を、河川・地下水の供給と農地の水管理につなげる。' : category === 'basins' ? '水が集まる地域の境と、州境を区別して読む。' : available.includes('groundwater') ? '川の次数と水文地質区分を分け、農業・都市への水供給を読む。' : '地下水は未配信。河川網と水供給を読む。';
    text('[data-mexico-hydrology-lead]', lead);
    text('[data-mexico-hydrology-definition]', meanings[subject]);
    text('[data-mexico-hydrology-limitations]',limitations[subject]+(category==='rivers-groundwater'&&!available.includes('groundwater')?' 地下水の地質分類は、分類別表示の負荷検証が未完のため未配信です。':''));
    text('[data-mexico-hydrology-value]', selected ? `${name}（${selected.layer === 'rivers' || selected.layer === 'groundwater' ? '配信分類ID' : '原ID'}：${mexicoWaterFeatureId(selected.feature)}）${selected.feature.properties.value !== undefined ? ` · ${selected.feature.properties.value} ${mexicoWaterUnit(metadata)}` : selected.feature.properties.elevationM !== undefined ? ` · ${selected.feature.properties.elevationM} m（EGM2008）` : ''}` : '線・面または地図下の項目から対象を選べます。');
    comparisonName.textContent = selected ? `自然図の対象：${name}` : `自然図：${titles[category]}の全国分布`;
    comparisonSummary.textContent = `${selected ? name : titles[category]}の定義・背景・原典`;
    const source = q('[data-mexico-hydrology-source]');
    if (source) source.replaceChildren(...available.map(layer => {const record = manifest!.layers[layer]!, p = document.createElement('p'), link = document.createElement('a'); const url = record.url ?? record.sourceUrl ?? record.source?.url; if (url && /^https?:\/\//.test(url)) {link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = mexicoWaterSourceText(record); p.append(link);} else p.textContent = mexicoWaterSourceText(record); p.append(document.createTextNode(`。${methods[layer]}。${layer === 'contours' ? 'NOAA・CC0。原DEMの鉛直基準はEGM2008。' : 'INEGI自由使用条件に基づき、出典・加工・原metadataを保存しています。'}`)); const details = document.createElement('a'); details.href = assetBase + 'manifest.json'; details.textContent = '原metadata・利用条件・加工方法とSHA'; p.append(document.createTextNode(' '),details); return p;}));
    text('[data-mexico-nature-map-title]', `${category === 'precipitation' ? '年平均降水量' : titles[category]}の分布`);
    text('#mexico-nature-map-title',`メキシコの${titles[category]}の全国分布`); text('#mexico-nature-map-desc',`${meanings[category]}。${category === 'elevation' || category === 'precipitation' ? '数値ラベルは原線上の代表値です。全原線は保持し、地図下の項目から各値・区間を選択できます。' : '原区域・原区間を保持し、地図下の項目から流域や局所次数を選択できます。'}`);
    text('[data-mexico-nature-map-edition]', metadata.edition ? `${metadata.publisher ?? metadata.source?.publisher ?? '原資料'}・${metadata.edition}版` : available.includes('rivers')?'INEGI・版/期未確認':metadata.publisher ?? metadata.source?.publisher ?? '原資料');
    text('[data-mexico-nature-period]', available.includes('rivers') ? '小流域内：同じ次数の合流で+1。流量・川幅ではない。' : available.map(layer => mexicoWaterSourceText(manifest!.layers[layer]!)).join(' / '));
  }
  function keys(layers: MexicoHydrologyLayer[]): void {
    const legend = q<HTMLUListElement>('[data-mexico-hydrology-legend]'); if (!legend) return;
    const keys: {label: string; color: string; line?: boolean; title?:string}[] = [];
    for (const layer of layers) {
      const metadata = manifest!.layers[layer]; if (!metadata || !collections.has(layer)) continue;
      if (layer === 'basins') {keys.push({label:'国内流域の面',color:'#d6e5df'}); keys.push(...(metadata.legend ?? [{label:'国内流域界',color:'#0e7490'}]).map(item=>({label:item.label,color:item.color,line:true})));keys.push({label:'選択地物の線・輪郭',color:'#153f42',line:true});}
      else if (metadata.legend?.length) keys.push(...metadata.legend.map(item => ({label:layer==='rivers'&&/^rivers-order-[789]$/.test(String(item.id))?`次数${String(item.id).slice(-1)}`:item.label, color: item.color,line:item.symbol === 'line' || layer === 'rivers',title:item.fullLabel??item.label})));
      else if (layer === 'rivers') keys.push({label: '原資料の河川流路', color: '#397f9a', line: true});
      else if (layer === 'precipitation' && collections.get(layer)!.features.every(feature => feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')) keys.push({label: '100〜4,500 mm/年・年平均の等雨量線', color: '#397f9a', line: true},{label:`太線は主要7値・数値${layerGroups.get(layer)?.dataset.numberLabelCount ?? '0'}か所／全19値`,color:'#397f9a',line:true});
      else if (layer === 'contours') keys.push({label: '0〜5,000 m・500m間隔の全等高線', color: '#a28b6f', line: true}, {label:`太線は1,000m間隔・数値${layerGroups.get(layer)?.dataset.numberLabelCount ?? '0'}か所`,color:'#a28b6f',line:true},{label: '選択した等高線', color: '#583d25', line: true});
      else keys.push({label: layer === 'groundwater' ? '原資料の地下水区域' : '原資料の降水区分', color: '#d9ddd9'});
    }
    if (!layers.includes('contours') && !layers.includes('basins')) keys.push({label: '選択地物の線・輪郭', color: '#153f42', line: true});
    legend.replaceChildren(...keys.map(key => {const li = document.createElement('li'), swatch = document.createElement('i'); swatch.style.background = key.color; swatch.classList.toggle('is-line', !!key.line); swatch.setAttribute('aria-hidden', 'true');if(key.title)li.title=key.title; li.append(swatch, document.createTextNode(key.label)); return li;}));
  }
  function draw(layer: MexicoHydrologyLayer): void {
    const collection = collections.get(layer)!, metadata = manifest!.layers[layer]!;
    let group = layerGroups.get(layer);
    if (!group) {
      group = document.createElementNS(ns, 'g'); group.setAttribute('data-mexico-hydrology-layer', layer); overlay?.append(group); layerGroups.set(layer, group);
      const features = layer === 'contours' ? [...mexicoContourGroups(collection.features).values()] : collection.features.map(feature => [feature]);
      group.setAttribute('data-source-feature-count', String(collection.features.length));
      for (const members of features) {
        const feature = members[0];
        const path = document.createElementNS(ns, 'path'), id = mexicoWaterFeatureId(feature), title = document.createElementNS(ns, 'title');
        path.setAttribute('d', members.map(member => geometryPath(member.geometry)).join('')); path.setAttribute('fill-rule', 'evenodd'); path.setAttribute('fill', mexicoWaterFeatureFill(feature, layer, metadata));
        path.setAttribute('data-mexico-water-feature', `${layer}:${id}`); path.setAttribute('role', 'button'); path.setAttribute('aria-label', `${mexicoWaterFeatureName(feature)}を読む`);
        path.classList.add('mexico-water-feature', `mexico-water-${layer}`); path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.style.setProperty('--mexico-water-stroke',mexicoWaterFeatureStroke(feature,layer,metadata));
        if (layer === 'precipitation' || layer === 'contours') {const value = feature.properties.elevationM ?? feature.properties.value; path.classList.add((layer === 'contours' ? value % 1000 === 0 : [100,500,1000,2000,3000,4000,4500].includes(value)) ? 'is-major-line' : 'is-secondary-line');}
        if (layer === 'contours') {path.setAttribute('data-elevation-m', String(feature.properties.elevationM)); path.setAttribute('data-source-member-count', String(members.length));}
        title.textContent = layer === 'contours' ? `${feature.properties.elevationM} m` : mexicoWaterFeatureName(feature); path.append(title);
        const picked = (event?: MouseEvent) => {
          let original = feature;
          const svg = q<SVGSVGElement>('[data-mexico-nature-main-map]'), matrix = svg?.getScreenCTM?.();
          if (layer === 'contours' && event && matrix && svg?.createSVGPoint) {const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; const local = point.matrixTransform(matrix.inverse()); original = closestMexicoContour(members, [local.x, local.y], projectLonLat);}
          else if (layer === 'contours') original = members.find(member => `${layer}:${mexicoWaterFeatureId(member)}` === selection.feature) ?? feature;
          choose(layer, mexicoWaterFeatureId(original));
        };
        path.addEventListener('click', picked); path.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); picked();}}); group.append(path);
      }
      if (layer === 'contours') {const selected = document.createElementNS(ns, 'path'); selected.setAttribute('data-mexico-contour-selected', ''); selected.setAttribute('fill', 'none'); selected.setAttribute('vector-effect', 'non-scaling-stroke'); selected.setAttribute('pointer-events', 'none'); selected.classList.add('mexico-water-contours', 'is-selected'); group.append(selected);}
    }
    // Existing nodes must follow the requested layer order after category changes.
    overlay?.append(group);
    const active = selectedFeature([layer]);
    for (const path of group.querySelectorAll<SVGPathElement>('[data-mexico-water-feature]')) {const selected = layer === 'contours' ? !!active && Number(path.dataset.elevationM) === active.feature.properties.elevationM : path.dataset.mexicoWaterFeature === selection.feature; path.classList.toggle('is-selected', selected && layer !== 'contours'); path.setAttribute('aria-pressed', String(selected)); path.setAttribute('tabindex', selected ? '0' : '-1');}
    if (layer === 'contours') group.querySelector('[data-mexico-contour-selected]')?.setAttribute('d', active ? geometryPath(active.feature.geometry) : '');
    if (layer === 'contours' || layer === 'precipitation') {
      group.querySelector('[data-mexico-water-labels]')?.remove(); const labelsGroup = document.createElementNS(ns,'g'); labelsGroup.setAttribute('data-mexico-water-labels',layer); labelsGroup.setAttribute('aria-hidden','true');
      const svg=q<SVGSVGElement>('[data-mexico-nature-main-map]'),frame=(svg?.getAttribute('viewBox') ?? '0 0 900 580').trim().split(/\s+/).map(Number),scale=svg?.clientWidth ? svg.clientWidth/frame[2] : 645/900,fontSize=13/scale;
      const mapRect=svg?.getBoundingClientRect(),controlRect=svg?.closest('.mexico-map-frame')?.querySelector('.mexico-controls')?.getBoundingClientRect(),forbidden=mapRect && controlRect?.width ? [[frame[0]+(controlRect.x-mapRect.x)/scale,frame[1]+(controlRect.y-mapRect.y)/scale,controlRect.width/scale,controlRect.height/scale]] : [];
      const labels=mexicoWaterLineLabels(collection.features,layer === 'contours'?[5000,0,1000,2000,3000,4000]:[4500,100,500,1000,2000,3000,4000],projectLonLat,frame,fontSize,layer === 'contours'?'m':'mm',forbidden);
      for (const label of labels) {const text=document.createElementNS(ns,'text');text.classList.add('mexico-water-value-label');text.setAttribute('x',String(label.x));text.setAttribute('y',String(label.y));text.setAttribute('font-size',String(fontSize));text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('data-source-feature',label.id);text.setAttribute('data-source-value',String(label.value));text.setAttribute('data-source-lonlat',JSON.stringify(label.point));text.setAttribute('data-map-label-box',JSON.stringify(label.box));text.textContent=label.text;labelsGroup.append(text);} group.append(labelsGroup);
      group.setAttribute('data-number-label-count',String(labels.length));
    }
  }
  async function render(): Promise<void> {
    const generation = ++version, state = current(), active = !!state.category, layers = mexicoWaterLayersForCategory(state.category);
    baseLayers(); readingLayout(active); show('[data-mexico-hydrology-controls]', active); show('[data-mexico-hydrology-legend]', active); show('[data-mexico-hydrology-picker-note]', active);
    const nativePicker = q<HTMLSelectElement>('[data-mexico-nature-item-select]'); if (nativePicker) nativePicker.closest<HTMLElement>('label')!.hidden = active;
    if (overlay) overlay.style.display = active ? '' : 'none';
    if (!active) return;
    show('[data-mexico-nature-feature-reading]', false); show('[data-mexico-nature-overview]', false);
    if (!q('[data-mexico-water-background-key-host]') && !q('[data-mexico-hydrology-base-key-host]')) {show('[data-mexico-nature-legend="climate"]', false); show('[data-mexico-nature-legend="relief"]', false);}
    show('[data-mexico-nature-reference]', false);
    text('[data-mexico-hydrology-title]', titles[state.category]); text('[data-mexico-hydrology-lead]', '原資料の線・面を読み込んでいます。');
    for (const selector of ['[data-mexico-hydrology-value]','[data-mexico-hydrology-definition]','[data-mexico-hydrology-limitations]']) text(selector,''); q('[data-mexico-hydrology-source]')?.replaceChildren(); q<HTMLSelectElement>('[data-mexico-hydrology-item]')?.replaceChildren();comparisonName.textContent='地図資料を確認中';
    text('[data-mexico-nature-map-title]', `${titles[state.category]}の分布`); text('[data-mexico-nature-map-edition]', '原資料を確認中'); text('[data-mexico-nature-period]', '');
    q('[data-mexico-hydrology-legend]')?.replaceChildren(); root.dataset.mexicoHydrologyReady = 'loading';
    text('[data-mexico-hydrology-status]', '地図資料を読み込んでいます。'); show('[data-mexico-hydrology-retry]', false);
    for (const [layer, group] of layerGroups) group.style.display = layers.includes(layer) ? '' : 'none';
    try {
      if (!manifest) manifest = await json('manifest.json');
      if (!manifest?.layers) throw new Error('資料台帳がありません');
      const present = layers.filter(layer => !!manifest!.layers[layer]);
      if (!present.length) throw new Error('この主題の実資料がまだ収録されていません');
      await Promise.all(present.map(async layer => {if (!collections.has(layer)) {const file = manifest!.layers[layer]!.file; try {collections.set(layer, validateMexicoWaterCollection(await json(file), layer));} catch (error) {cache.delete(file); throw error;}}}));
      if (generation !== version || current().category !== state.category) return;
      for (const layer of present) draw(layer);
      keys(present); updateReading(present);
      const picker = q<HTMLSelectElement>('[data-mexico-hydrology-item]');
      let representatives = false;
      if (picker) {const first = document.createElement('option'); first.value = ''; first.textContent = '全国の分布'; picker.replaceChildren(first, ...present.flatMap(layer => {
        const all = collections.get(layer)!.features; let listed = all;
        if (layer === 'contours') {listed = [...mexicoContourGroups(all).entries()].sort((a,b) => a[0]-b[0]).map(([,members]) => members[0]); representatives = true;}
        else if (layer === 'precipitation' && all.every(feature => typeof feature.properties.value === 'number')) {const values = new Map<number,MexicoWaterFeature>(); for (const feature of all) if (!values.has(feature.properties.value)) values.set(feature.properties.value, feature); listed = [...values.entries()].sort((a,b) => a[0]-b[0]).map(([,feature]) => feature); representatives = true;}
        const active = selectedFeature([layer]); if (active && !listed.includes(active.feature)) listed = [...listed, active.feature];
        return listed.map(feature => {const option = document.createElement('option'); option.value = `${layer}:${mexicoWaterFeatureId(feature)}`; option.textContent = `${option.value === selection.feature ? '選択中：' : ''}${mexicoWaterFeatureName(feature)}`; return option;});
      })); picker.value = selectedFeature(present) ? selection.feature : '';}
      text('[data-mexico-hydrology-picker-note]', state.category === 'elevation' ? '0〜5,000mの全11値を保持。太線は1,000m間隔、細い補助線は500m中間値。数値ラベルは重なりを避けた代表区間で、省略分も一覧と実線選択で読めます。' : representatives ? '年平均100〜4,500mm/年の全19値・492原線を保持。太線は100/500/1000/2000/3000/4000/4500の7値、残りは薄い補助線。数値ラベルは代表区間で、全値は一覧と実線選択で読めます。' : '一覧と地図は配信された原資料の区域・区分です。');
      const absent = layers.filter(layer => !present.includes(layer));
      text('[data-mexico-hydrology-status]', absent.length && !(state.category==='rivers-groundwater'&&absent.length===1&&absent[0]==='groundwater'&&present.includes('rivers')) ? `${absent.map(layer => layer === 'groundwater' ? '地下水' : layer === 'rivers' ? '河川' : layer).join('・')}は資料未収録。表示している実資料と区別します。` : '');
      root.dataset.mexicoHydrologyReady = 'true'; root.dataset.mexicoWaterFeature = selection.feature;
    } catch {
      if (generation !== version) return;
      text('[data-mexico-hydrology-status]', 'この主題の地図資料を取得できませんでした。再読み込みしてください。');
      text('[data-mexico-hydrology-lead]', '未取得の分布や数値を推定せず、背景地図と選択を保持しています。'); show('[data-mexico-hydrology-retry]', true);
      root.dataset.mexicoHydrologyReady = 'false';
    }
  }
  q<HTMLSelectElement>('[data-mexico-hydrology-base]')?.addEventListener('change', event => {selection.base = (event.currentTarget as HTMLSelectElement).value as MexicoWaterSelection['base']; commit();});
  q<HTMLSelectElement>('[data-mexico-hydrology-item]')?.addEventListener('change', event => {selection.feature = (event.currentTarget as HTMLSelectElement).value; commit(); root.dispatchEvent(new CustomEvent('mexico-reading-mode', {bubbles: true, detail: {selected: true}}));});
  q('[data-mexico-hydrology-retry]')?.addEventListener('click', () => {manifest = null; cache.delete('manifest.json'); void render();});
  const map=q<SVGSVGElement>('[data-mexico-nature-main-map]');let labelWidth=map?.clientWidth ?? 0,labelFrame=0;
  const resizeLabels=()=>{const width=map?.clientWidth ?? 0;if(Math.abs(width-labelWidth)<.5)return;labelWidth=width;if(labelFrame)cancelAnimationFrame(labelFrame);labelFrame=requestAnimationFrame(()=>{labelFrame=0;if(!manifest || root.dataset.mexicoHydrologyReady!=='true' || !current().category)return;const layers=mexicoWaterLayersForCategory(current().category).filter(layer=>collections.has(layer));for(const layer of layers)if(layer==='precipitation'||layer==='contours')draw(layer);keys(layers);});};
  if(map && typeof ResizeObserver!=='undefined')new ResizeObserver(resizeLabels).observe(map);else window.addEventListener('resize',resizeLabels);
  return {render: () => void render(), read: () => {selection = readMexicoWaterSelection(new URL(location.href));}, url: (url: URL) => writeMexicoWaterSelection(url, selection)};
}
