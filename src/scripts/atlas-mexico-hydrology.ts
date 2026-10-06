import {geometryPath, projectLonLat} from '../lib/atlas-mexico-geometry';
import {readMexicoWaterSelection, writeMexicoWaterSelection, validateMexicoWaterCollection, mexicoWaterFeatureId, mexicoWaterFeatureName, mexicoWaterLayersForCategory, mexicoWaterFeatureFill, mexicoWaterFeatureStroke, mexicoWaterSourceText, mexicoWaterUnit, mexicoWaterLineLabels, mexicoContourGroups, closestMexicoContour, mexicoGroundwaterClassIds, mexicoGroundwaterDefinition, mexicoPrecipitationKeys, mexicoBasinKeys, mexicoBasinTypeText, mexicoBasinLabels, type MexicoWaterCollection, type MexicoWaterManifest, type MexicoHydrologyLayer, type MexicoWaterSelection, type MexicoWaterFeature, type MexicoGroundwaterClass} from '../lib/atlas-mexico-hydrology';
import type {MexicoNatureState} from '../lib/atlas-mexico-nature';

export function initMexicoHydrology(root: HTMLElement, assetBase: string, current: () => MexicoNatureState, commit: () => void, groundwaterAssetBase?: string) {
  const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const ns = 'http://www.w3.org/2000/svg';
  let selection: MexicoWaterSelection = readMexicoWaterSelection(new URL(location.href));
  let version = 0, manifest: MexicoWaterManifest | null = null;
  let groundwaterManifest: MexicoWaterManifest | null = null, loadedGroundwaterClass: MexicoGroundwaterClass | null = null;
  let loadedGroundwaterFile = '';
  let overviewPending: Promise<void> | null = null;
  let countryMaskPending: Promise<void> | null = null, countryMaskKey = '';
  let countryMaskNode: SVGMaskElement | null = null;
  const cache = new Map<string, Promise<unknown>>(), collections = new Map<MexicoHydrologyLayer, MexicoWaterCollection>();
  const layerGroups = new Map<MexicoHydrologyLayer, SVGGElement>();
  const basinAnchors = new Map<string, number[] | null>();
  const overlay = q<SVGGElement>('[data-mexico-hydrology-overlay]');
  const groundwaterNotice = document.createElement('p'); groundwaterNotice.className = 'mexico-groundwater-notice'; groundwaterNotice.setAttribute('data-mexico-groundwater-notice',''); q('[data-mexico-hydrology-legend]')?.after(groundwaterNotice); groundwaterNotice.hidden = true;
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
  const cacheKey = (name: string, base = assetBase) => base + name;
  function json(name: string, base = assetBase): Promise<any> {
    const key = cacheKey(name,base);
    if (!cache.has(key)) cache.set(key, fetch(base + name).then(response => {if (!response.ok) throw new Error(`${response.status}`); return name.endsWith('.gz') ? response.body ? new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json() : Promise.reject(new Error('資料の本文がありません')) : response.json();}).catch(error => {cache.delete(key); throw error;}));
    return cache.get(key)!;
  }
  const text = (selector: string, value: string) => {const element = q(selector); if (element) element.textContent = value;};
  const show = (selector: string, shown: boolean) => {const element = q<HTMLElement>(selector); if (element) element.hidden = !shown;};
  const titles: Record<string, string> = {'rivers-groundwater': '河川・地下水', precipitation: '降水量', basins: '河川の流域', elevation: '標高・等高線'};
  const meanings: Record<string,string> = {elevation:'等高線は同じ標高を結ぶ線です。基準はEGM2008ジオイド・単位m。地形地域や州平均の標高ではありません。',precipitation:'等雨量線は原資料の同じ年平均降水量mmを結ぶ線です。隣接する面全体の値や州平均ではありません。',basins:'国内の河川集水域の区分です。州境、地下水の流動区域や給水区域とは異なります。','rivers-groundwater':'原資料の河川ネットワークで、間欠・仮想流も含みます。Strahler次数は小流域内の支流の合流関係で、流量・貯水量・河川幅を表しません。'};
  const limitations: Record<string,string> = {elevation:'2022年はモデルの版です。約60秒角のDEMから500m間隔の線を作成しており、測量級の地点標高や正確な山頂高度は示しません。海底を除き、元DEMの有効な負標高は欠測値と区別して保持しています。',precipitation:'関連2005作成ガイド§3.3・印刷15頁は1921〜1975年の観測を説明しますが、この2006刊行配布版との対応は未確認です。現在の降水量ではありません。1:100万の全国概観で、線の間を補間していません。',basins:'原資料の国内範囲を保持しています。国外の上流域は未収録のため、国際河川の全流域ではありません。全国用の簡略化境界から洪水危険度や水収支を推定しません。','rivers-groundwater':'原資料の小流域内次数7以上に限る流路表示で、細い全河川を網羅しません。小流域間で次数が連続するとは限らず、河川名を推測して付けていません。現在の取水量や水位は示しません。'};
  const methods: Record<MexicoHydrologyLayer,string> = {precipitation:'原492等雨量線・19値を保持し、経緯度へ変換。面の補間、線の結合、線形の簡略化は行っていません。',contours:'原DEMのセル値から500m間隔の線を作成し、メキシコの陸域で切り取り、全国表示用に0.002度で簡略化。表示線は0〜5,000mです。',basins:'原国内範囲と全158流域を保持。全国表示用に0.002度で境界を簡略化し、国外の上流域は追加していません。',rivers:'全61,350原区間のID・parts・端点を保持し、次数7/8/9の3群へまとめています。全国表示用に0.002度で線を簡略化し、区間間の接続線を作っていません。',groundwater:'水文地質の原分類を表示。法定帯水層の境界や現在の地下水量とは区別します。'};
  meanings.groundwater = '水理地質区分は、岩石や粒状材料が地下水を蓄え・通す性質と、原典の井戸産出量・賦存可能性を表します。';
  limitations.groundwater = '1996年は原典作成、2008年は改訂です。全国共通の観測期は未確認。現在の地下水量・取水量・貯水量や法定帯水層の境界ではありません。未着色を地下水なしと読みません。';
  methods.groundwater = '原29,479単位・48,769リングと分類を保持し、表示用に0.002度で簡略化。元の不正形状と簡略化による変化を監査に記録し、分析用境界として修復していません。全10分類の全国概観は同じ図形・投影から作成した画像、選択分類は元の分割ベクトルです。';
  const groundwaterClass = () => selection.groundwaterClass ?? 'all';
  const selectedGroundwaterRecord = () => manifest?.layers.groundwater?.classFiles?.[groundwaterClass()];
  const isSelectedGroundwater = (metadata?: {deliveryMode?: string}) => metadata?.deliveryMode === 'national-overview-and-selected-class' || metadata?.deliveryMode === 'selected-class';
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
    selection = {...selection, feature: `${layer}:${id}`, ...(layer === 'groundwater' ? {groundwaterClass: id as MexicoGroundwaterClass} : {})}; commit();
    root.dispatchEvent(new CustomEvent('mexico-reading-mode', {bubbles: true, detail: {selected: true}}));
  }
  function baseLayers(): void {
    const active = !!current().category, displayedBase = active ? selection.base : current().view;
    for (const group of root.querySelectorAll<SVGGElement>('[data-mexico-nature-layer]')) group.style.display = displayedBase === group.dataset.mexicoNatureLayer ? '' : 'none';
    q<SVGGElement>('[data-mexico-nature-neutral]')?.setAttribute('style', displayedBase === 'plain' || displayedBase === 'relief' ? '' : 'display:none');
    q<SVGGElement>('[data-mexico-nature-relief-background]')?.setAttribute('style', displayedBase === 'relief' ? '' : 'display:none');
    // Legacy fallback flags remain in source-return state; all nature views use the reviewed SVG layers.
    q<SVGGElement>('[data-mexico-nature-vector]')?.setAttribute('style', ''); q<SVGGElement>('[data-mexico-nature-static]')?.setAttribute('style', 'display:none'); show('[data-mexico-nature-static-note]', false); q('[data-mexico-nature-main-map]')?.setAttribute('data-mexico-nature-map-mode', active ? 'geo-overlay' : 'interactive');
    const base = q<HTMLSelectElement>('[data-mexico-hydrology-base]'); if (base) base.value = selection.base;
    const keyHost = q('[data-mexico-water-background-key-host]') ?? q('[data-mexico-hydrology-base-key-host]');
    for (const [legend, anchor] of legendHomes) {if (active && keyHost) {keyHost.append(legend); legend.hidden = selection.base !== legend.dataset.mexicoNatureLegend;} else {anchor.after(legend); legend.hidden = current().view !== legend.dataset.mexicoNatureLegend;}}
    text('[data-mexico-hydrology-base-key-title]', `背景：${selection.base === 'plain' ? '白地図・州境' : selection.base === 'climate' ? '気候区分' : '地形地域'}の凡例と版`);
    show('[data-mexico-water-background-key]',active && selection.base !== 'plain');
    const basinCover=current().category==='basins'?'（流域面が上に重なる背景）':current().category==='rivers-groundwater' && manifest?.layers.groundwater ? '（地下水の分類面が上に重なる背景）' : '';
    text('[data-mexico-water-background-key-title]',selection.base==='climate'?`背景：気候6群・2008刊行版${basinCover}`:selection.base==='relief'?`背景：地形の陰影＋自然地理地域・2001版${basinCover}`:'');
    text('[data-mexico-hydrology-base-source]', selection.base === 'plain' ? '背景の州境はINEGI・2025年12月版です。水資源や標高の境界とは分けて読みます。' : selection.base === 'climate' ? '背景はINEGI・2008刊行の気候原分類21を6群で表示。統一観測対象期間は未記載です。水資源の期間と異なります。' : '背景の陰影はNOAA ETOPO 2022（60秒角・EGM2008）から作成。地域境界はINEGI・2001版の15自然地理地域＋原資料の分類なしです。陰影は地形の凹凸を示し、地域の区分や地点の実測標高を表す色ではありません。');
    root.dataset.mexicoWaterBase = selection.base;
  }
  function selectedFeature(layers: MexicoHydrologyLayer[]) {
    for (const layer of layers) for (const feature of collections.get(layer)?.features ?? []) if (`${layer}:${mexicoWaterFeatureId(feature)}` === selection.feature) return {layer, feature};
    return null;
  }
  function updateReading(layers: MexicoHydrologyLayer[]): void {
    const category = current().category, selected = selectedFeature(layers), available = layers.filter(layer => collections.has(layer) || (layer === 'groundwater' && isSelectedGroundwater(manifest?.layers.groundwater) && loadedGroundwaterClass === 'all'));
    const subject = selected?.layer === 'rivers' ? 'rivers-groundwater' : selected?.layer === 'groundwater' || (category === 'rivers-groundwater' && !selected && available.includes('groundwater')) ? 'groundwater' : selected?.layer === 'contours' ? 'elevation' : selected?.layer === 'precipitation' ? 'precipitation' : selected?.layer === 'basins' ? 'basins' : category;
    const metadata = selected ? manifest!.layers[selected.layer]! : manifest!.layers[available[0]]!;
    const name = selected ? mexicoWaterFeatureName(selected.feature) : subject === 'groundwater' ? groundwaterClass() === 'all' ? '地下水の全10水理地質区分' : selectedGroundwaterRecord()?.fullLabel ?? '選択した地下水区分' : titles[category];
    const riverOrder=selected?.layer==='rivers' ? /^rivers-order-([789])$/.exec(String(selected.feature.properties.classId ?? ''))?.[1] : null;
    text('[data-mexico-hydrology-title]',riverOrder ? `小流域内次数${riverOrder}の河川` : name);q('[data-mexico-hydrology-title]')?.setAttribute('title',name);
    const lead = category === 'elevation' ? selected ? `原DEMから作成した${selected.feature.properties.elevationM.toLocaleString('ja-JP')} mの等高線を選択しています。` : '同じ標高の線をたどり、山地・高原・沿岸低地の高さを比べる。' : category === 'precipitation' ? '農地の水はどこから届くか。雨量の線を、河川・地下水と選択した作物の比較につなげる。' : category === 'basins' ? '農地の水はどこから届くか。流域に集まる水と河川をたどり、地形の背景や選択した作物と比べる。' : available.includes('groundwater') ? '農地の水はどこから届くか。河川の流路と地下水の性質を、選択した作物の比較につなげる。' : '農地の水はどこから届くか。原河川網から水の集まる方向を読む。';
    text('[data-mexico-hydrology-lead]', subject === 'groundwater' ? '材料の性質と井戸産出量・賦存可能性を分けて読む。現在の地下水量や法定帯水層ではありません。' : lead);
    text('[data-mexico-hydrology-definition]', subject === 'groundwater' ? meanings.groundwater + mexicoGroundwaterDefinition(selectedGroundwaterRecord()) : meanings[subject] + (selected?.layer === 'basins' ? mexicoBasinTypeText(selected.feature) : ''));
    text('[data-mexico-hydrology-limitations]',limitations[subject]+(category==='rivers-groundwater'&&!available.includes('groundwater')?' 地下水の地質分類は、分類別表示の負荷検証が未完のため未配信です。':'')+(category==='basins'||category==='rivers-groundwater'||category==='precipitation'?' 地図の位置や重なりだけでは、農地の取水源・灌漑量・用水路の接続は特定できません。':''));
    const sourceId=selected?.feature.properties.sourceId ?? (selected ? mexicoWaterFeatureId(selected.feature) : '');
    text('[data-mexico-hydrology-value]', selected ? `${name}（${selected.layer === 'rivers' || selected.layer === 'groundwater' ? '配信分類ID' : selected.layer === 'contours' ? '配信地物ID' : '原ID'}：${sourceId}）${selected.feature.properties.value !== undefined ? ` · ${selected.feature.properties.value} ${mexicoWaterUnit(metadata)}` : selected.feature.properties.elevationM !== undefined ? ` · ${selected.feature.properties.elevationM} m（EGM2008）` : ''}${selected.layer === 'groundwater' ? '。この分類に属する全国の原資料単位をまとめた分布で、クリック地点の井戸測定値ではありません。' : ''}` : subject === 'groundwater' ? groundwaterClass() === 'all' ? '全10分類の全国概観です。地図下で分類を選ぶと、その分類のベクトル分布を読めます。' : '選択した分類の全国分布です。面または項目を選ぶと、この分類の定義を読めます。' : category==='basins' ? '国内158流域：外流域143・閉鎖流域15。面や流域名をタップ、または地図下の項目から選べます。' : '線・面または地図下の項目から対象を選べます。');
    comparisonName.textContent = selected ? `自然図の対象：${name}` : `自然図：${titles[category]}の全国分布`;
    comparisonSummary.textContent = `${selected ? name : titles[category]}の定義・背景・原典`;
    const source = q('[data-mexico-hydrology-source]');
    if (source) source.replaceChildren(...available.map(layer => {const record = manifest!.layers[layer]!, p = document.createElement('p'), link = document.createElement('a'); const url = record.url ?? record.sourceUrl ?? record.source?.url; if (url && /^https?:\/\//.test(url)) {link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = mexicoWaterSourceText(record); p.append(link);} else p.textContent = mexicoWaterSourceText(record); p.append(document.createTextNode(`。${methods[layer]}。${layer === 'contours' ? 'NOAA・CC0。原DEMの鉛直基準はEGM2008。' : 'INEGI自由使用条件に基づき、出典・加工・原metadataを保存しています。'}`)); const details = document.createElement('a'); details.href = (layer === 'groundwater' ? groundwaterAssetBase ?? assetBase : assetBase) + 'manifest.json'; details.textContent = '原metadata・利用条件・加工方法とSHA'; p.append(document.createTextNode(' '),details); return p;}));
    if (available.includes('groundwater')) {
      groundwaterNotice.textContent = groundwaterClass() === 'all' ? '全10分類の全国概観。井戸産出量（L/s）と賦存可能性は別尺度で、現在の地下水量ではありません。未着色は原資料の区分外などで、水がないという意味ではありません。' : `${selectedGroundwaterRecord()?.fullLabel ?? '選択分類'}の分布。未着色は選択区分以外などで、欠測・地下水なしを意味しません。現在の地下水量ではありません。`;
      groundwaterNotice.hidden = false;
      const selectedName = q('[data-mexico-nature-selected-name]')?.textContent ?? current().state;
      if (plainReturn && current().compare) plainReturn.textContent = `${selectedName}の${name}分布に戻る`;
    } else groundwaterNotice.hidden = true;
    text('[data-mexico-nature-map-title]', `${category === 'precipitation' ? '年平均降水量' : category === 'rivers-groundwater' && available.includes('groundwater') ? '水理地質区分と河川' : titles[category]}の分布`);
    text('#mexico-nature-map-title',`メキシコの${titles[category]}の全国分布`); text('#mexico-nature-map-desc',`${category === 'rivers-groundwater' && available.includes('groundwater') ? meanings.groundwater + '井戸産出量と賦存可能性は別尺度で、現在水量や法定帯水層ではありません。' + meanings[category] : meanings[category]}。${category === 'elevation' || category === 'precipitation' ? '数値ラベルは原線上の代表値です。全原線は保持し、地図下の項目から各値・区間を選択できます。' : '原区域・原区間を保持し、地図下の項目から流域や局所次数を選択できます。'}`);
    text('[data-mexico-nature-map-edition]', metadata.edition ? `${metadata.publisher ?? metadata.source?.publisher ?? '原資料'}・${metadata.edition}版` : available.includes('rivers')?'INEGI・版/期未確認':metadata.publisher ?? metadata.source?.publisher ?? '原資料');
    text('[data-mexico-nature-period]', `${category==='precipitation'?'INEGI・2006刊行版／観測期間との対応未確認・mm/年。色は実線の値だけに適用。':available.includes('groundwater') ? '地下水原典：1996作成・2008改訂／統一観測期未確認。' : category==='basins'?'INEGI・国内158流域／国外上流域は未収録。':''}${available.includes('rivers') ? '小流域内：同じ次数の合流で+1。流量・川幅ではない。' : category==='precipitation'?'':available.map(layer => mexicoWaterSourceText(manifest!.layers[layer]!)).join(' / ')}`);
  }
  function keys(layers: MexicoHydrologyLayer[]): void {
    const legend = q<HTMLUListElement>('[data-mexico-hydrology-legend]'); if (!legend) return;
    const keys: {label: string; color: string; line?: boolean; title?:string}[] = [];
    for (const layer of layers) {
      const metadata = manifest!.layers[layer]; if (!metadata || (!collections.has(layer) && !(layer === 'groundwater' && isSelectedGroundwater(metadata) && groundwaterClass() === 'all'))) continue;
      if (layer === 'basins') {keys.push(...mexicoBasinKeys.map(item=>({label:item.label,color:item.color,line:item.symbol==='line'})));keys.push({label:'選択地物の線・輪郭',color:'#153f42',line:true});}
      else if (layer === 'precipitation') keys.push(...mexicoPrecipitationKeys.map(item=>({label:item.label,color:item.color,line:true,title:'原等雨量線の値を分類。線の間の面を表す色ではありません。'})),{label:'太線：1,000・1,500mm/年',color:'#397f9a',line:true});
      else if (metadata.legend?.length) keys.push(...metadata.legend.map(item => ({label:layer==='rivers'&&/^rivers-order-[789]$/.test(String(item.id))?`次数${String(item.id).slice(-1)}`:item.label, color: item.color,line:item.symbol === 'line' || layer === 'rivers',title:item.fullLabel??item.label})));
      else if (layer === 'rivers') keys.push({label: '原資料の河川流路', color: '#397f9a', line: true});
      else if (layer === 'contours') keys.push({label: '0〜5,000 m・500m間隔の全等高線', color: '#a28b6f', line: true}, {label:`太線は1,000m間隔・数値${layerGroups.get(layer)?.dataset.numberLabelCount ?? '0'}か所`,color:'#a28b6f',line:true},{label: '選択した等高線', color: '#583d25', line: true});
      else keys.push({label: layer === 'groundwater' ? '原資料の地下水区域' : '原資料の降水区分', color: '#d9ddd9'});
    }
    if (!layers.includes('contours') && !layers.includes('basins')) keys.push({label: '選択地物の線・輪郭', color: '#153f42', line: true});
    legend.replaceChildren(...keys.map(key => {const li = document.createElement('li'), swatch = document.createElement('i'); swatch.style.background = key.color; swatch.classList.toggle('is-line', !!key.line); swatch.setAttribute('aria-hidden', 'true');if(key.title)li.title=key.title; li.append(swatch, document.createTextNode(key.label)); return li;}));
  }
  async function drawGroundwaterOverview(): Promise<void> {
    const asset = manifest?.layers.groundwater?.overviewAsset;
    if (!asset?.file || !groundwaterAssetBase) throw new Error('全国の全10分類図がありません');
    let group = layerGroups.get('groundwater');
    if (group?.dataset.groundwaterView === 'all') {overlay?.append(group); if(overviewPending)await overviewPending;return;}
    // The delivered overview is already masked to these same 32-state paths by its generator.
    group?.remove(); group = document.createElementNS(ns,'g'); group.setAttribute('data-mexico-hydrology-layer','groundwater'); group.setAttribute('data-groundwater-view','all');
    const image = document.createElementNS(ns,'image'); image.setAttribute('data-mexico-groundwater-overview',''); image.setAttribute('x','0'); image.setAttribute('y','0'); image.setAttribute('width','900'); image.setAttribute('height','580'); image.setAttribute('preserveAspectRatio','none'); image.setAttribute('role','img'); image.setAttribute('aria-label','原資料の全10水理地質区分の全国概観。地図下で分類を選ぶと元のベクトル分布を表示します。'); image.classList.add('mexico-groundwater-overview'); group.append(image); overlay?.append(group); layerGroups.set('groundwater',group);
    overviewPending = new Promise<void>((resolve,reject) => {image.addEventListener('load',() => {group?.setAttribute('data-groundwater-image-ready','true');resolve();},{once:true}); image.addEventListener('error',() => {group?.remove();if(layerGroups.get('groundwater')===group)layerGroups.delete('groundwater');reject(new Error('全国概観図を取得できません'));},{once:true});image.setAttribute('href',groundwaterAssetBase + asset.file);});
    await overviewPending;
  }
  async function ensureGroundwaterCountryMask(): Promise<void> {
    const metadata = manifest?.layers.groundwater, asset = metadata?.countryMaskAsset, overview = metadata?.overviewAsset;
    if (!asset || !groundwaterAssetBase || !/^[a-zA-Z0-9._-]+\.png$/.test(asset.file) || asset.width !== 1800 || asset.height !== 1160 || asset.viewBox !== '0 0 900 580' || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || !/^[a-f0-9]{64}$/i.test(asset.sha256) || !overview || ['nationalBoundarySha256','projectionSourceSha256','geometryIndexSha256'].some(key => !/^[a-f0-9]{64}$/i.test(asset[key]) || asset[key] !== overview[key])) throw new Error('同じ国土・投影の表示マスクがありません');
    const key = groundwaterAssetBase + asset.file + '#' + asset.sha256;
    if (countryMaskKey === key && countryMaskPending) {await countryMaskPending;return;}
    countryMaskNode?.remove();
    const svg = q<SVGSVGElement>('[data-mexico-nature-main-map]'); if (!svg) throw new Error('国土マスクの地図がありません');
    let defs = svg.querySelector('defs'); if (!defs) {defs = document.createElementNS(ns,'defs');svg.prepend(defs);}
    const mask = document.createElementNS(ns,'mask');mask.id='mexico-groundwater-country-mask';mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('maskContentUnits','userSpaceOnUse');mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width','900');mask.setAttribute('height','580');mask.style.setProperty('mask-type','alpha');
    const image = document.createElementNS(ns,'image');image.setAttribute('data-mexico-groundwater-country-mask','');image.setAttribute('x','0');image.setAttribute('y','0');image.setAttribute('width','900');image.setAttribute('height','580');image.setAttribute('preserveAspectRatio','none');mask.append(image);defs.append(mask);countryMaskNode=mask;countryMaskKey=key;
    countryMaskPending = new Promise<void>((resolve,reject) => {image.addEventListener('load',() => {mask.setAttribute('data-country-mask-ready','true');resolve();},{once:true});image.addEventListener('error',() => {mask.remove();if(countryMaskNode===mask){countryMaskNode=null;countryMaskPending=null;countryMaskKey='';}reject(new Error('国土の表示マスクを取得できません'));},{once:true});image.setAttribute('href',groundwaterAssetBase + asset.file);});
    await countryMaskPending;
  }
  function draw(layer: MexicoHydrologyLayer): void {
    const collection = collections.get(layer)!, metadata = manifest!.layers[layer]!;
    let group = layerGroups.get(layer);
    if (!group) {
      group = document.createElementNS(ns, 'g'); group.setAttribute('data-mexico-hydrology-layer', layer); overlay?.append(group); layerGroups.set(layer, group);
      if (layer === 'groundwater') {group.setAttribute('mask','url(#mexico-groundwater-country-mask)');group.setAttribute('data-groundwater-view',groundwaterClass());}
      const features = layer === 'contours' ? [...mexicoContourGroups(collection.features).values()] : collection.features.map(feature => [feature]);
      group.setAttribute('data-source-feature-count', String(collection.features.length));
      for (const members of features) {
        const feature = members[0];
        const path = document.createElementNS(ns, 'path'), id = mexicoWaterFeatureId(feature), title = document.createElementNS(ns, 'title');
        path.setAttribute('d', members.map(member => geometryPath(member.geometry)).join('')); path.setAttribute('fill-rule', 'evenodd'); path.setAttribute('fill', mexicoWaterFeatureFill(feature, layer, metadata));
        path.setAttribute('data-mexico-water-feature', `${layer}:${id}`); path.setAttribute('role', 'button'); path.setAttribute('aria-label', `${mexicoWaterFeatureName(feature)}を読む`);
        path.classList.add('mexico-water-feature', `mexico-water-${layer}`); path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.style.setProperty('--mexico-water-stroke',mexicoWaterFeatureStroke(feature,layer,metadata));
        if (layer === 'precipitation' || layer === 'contours') {const value = feature.properties.elevationM ?? feature.properties.value; path.classList.add((layer === 'contours' ? value % 1000 === 0 : [1000,1500].includes(value)) ? 'is-major-line' : 'is-secondary-line');}
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
    if (layer === 'contours' || layer === 'precipitation' || layer === 'basins') {
      const focusedBasin=layer==='basins' && group.contains(document.activeElement) ? document.activeElement?.getAttribute('data-mexico-basin-label') : null;
      group.querySelector('[data-mexico-water-labels]')?.remove(); const labelsGroup = document.createElementNS(ns,'g'); labelsGroup.setAttribute('data-mexico-water-labels',layer); labelsGroup.setAttribute('aria-hidden','true');
      const svg=q<SVGSVGElement>('[data-mexico-nature-main-map]'),frame=(svg?.getAttribute('viewBox') ?? '0 0 900 580').trim().split(/\s+/).map(Number),scale=svg?.clientWidth ? svg.clientWidth/frame[2] : 645/900,fontSize=13/scale;
      const mapRect=svg?.getBoundingClientRect(),controlRect=svg?.closest('.mexico-map-frame')?.querySelector('.mexico-controls')?.getBoundingClientRect(),forbidden=mapRect && controlRect?.width ? [[frame[0]+(controlRect.x-mapRect.x)/scale,frame[1]+(controlRect.y-mapRect.y)/scale,controlRect.width/scale,controlRect.height/scale]] : [];
      const labels=layer==='basins' ? mexicoBasinLabels(collection.features,basinAnchors,projectLonLat,frame,fontSize,active ? mexicoWaterFeatureId(active.feature) : '',forbidden) : mexicoWaterLineLabels(collection.features,layer === 'contours'?[5000,0,1000,2000,3000,4000]:[1000,1500,500,2000,100,3000,4500],projectLonLat,frame,fontSize,layer === 'contours'?'m':'mm',forbidden);
      for (const label of labels) {const text=document.createElementNS(ns,'text');text.classList.add('mexico-water-value-label');text.setAttribute('x',String(label.x));text.setAttribute('y',String(label.y));text.setAttribute('font-size',String(fontSize));text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('data-source-feature',label.id);if('value' in label)text.setAttribute('data-source-value',String(label.value));text.setAttribute('data-source-lonlat',JSON.stringify(label.point));text.setAttribute('data-map-label-box',JSON.stringify(label.box));text.textContent=label.text;
        if(layer==='basins'){text.classList.add('mexico-water-basin-label');text.setAttribute('data-mexico-basin-label',label.id);text.setAttribute('role','button');text.setAttribute('tabindex','0');text.setAttribute('aria-label',`${label.text}の国内流域を読む`);text.setAttribute('aria-pressed',String(selection.feature===`basins:${label.id}`));text.style.pointerEvents='auto';text.style.cursor='pointer';text.addEventListener('click',()=>choose('basins',label.id));text.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose('basins',label.id);}});}
        labelsGroup.append(text);} if(layer==='basins')labelsGroup.removeAttribute('aria-hidden');group.append(labelsGroup);
      if(focusedBasin) [...labelsGroup.querySelectorAll<SVGTextElement>('[data-mexico-basin-label]')].find(label=>label.dataset.mexicoBasinLabel===focusedBasin)?.focus({preventScroll:true});
      group.setAttribute('data-number-label-count',String(labels.length));
    }
  }
  async function render(): Promise<void> {
    const generation = ++version, state = current(), active = !!state.category, layers = mexicoWaterLayersForCategory(state.category);
    const requestedGroundwaterClass = groundwaterClass();
    root.dataset.mexicoGroundwaterClass = requestedGroundwaterClass;
    groundwaterNotice.hidden = true;
    baseLayers(); readingLayout(active); show('[data-mexico-hydrology-controls]', active); show('[data-mexico-hydrology-legend]', active); show('[data-mexico-hydrology-picker-note]', active);
    show('[data-mexico-groundwater-controls]', active && state.category === 'rivers-groundwater' && !!groundwaterAssetBase);
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
    for (const [layer, group] of layerGroups) group.style.display = layers.includes(layer) && !(layer === 'groundwater' && (loadedGroundwaterClass !== requestedGroundwaterClass || requestedGroundwaterClass !== 'all')) ? '' : 'none';
    try {
      if (!manifest) manifest = await json('manifest.json');
      if (!manifest?.layers) throw new Error('資料台帳がありません');
      if (state.category === 'rivers-groundwater' && groundwaterAssetBase) {
        if (!groundwaterManifest) groundwaterManifest = await json('manifest.json',groundwaterAssetBase);
        const metadata = groundwaterManifest?.layers?.groundwater;
        if (!metadata || !isSelectedGroundwater(metadata) || !metadata.classFiles || !metadata.legend || !mexicoGroundwaterClassIds.every(id => metadata.classFiles![id] && metadata.legend!.some(key => key.id === id))) throw new Error('地下水の全10分類台帳がありません');
        manifest = {...manifest,layers:{...manifest.layers,groundwater:metadata}};
      }
      const present = layers.filter(layer => !!manifest!.layers[layer]);
      if (!present.length) throw new Error('この主題の実資料がまだ収録されていません');
      if (present.includes('groundwater') && isSelectedGroundwater(manifest.layers.groundwater) && requestedGroundwaterClass !== 'all') await ensureGroundwaterCountryMask();
      if (generation !== version || current().category !== state.category) return;
      const fetched = await Promise.all(present.map(async layer => {
        const metadata = manifest!.layers[layer]!, split = layer === 'groundwater' && isSelectedGroundwater(metadata);
        if (split && requestedGroundwaterClass === 'all') return {layer,collection:null,file:''};
        if (collections.has(layer) && (!split || loadedGroundwaterClass === requestedGroundwaterClass)) return {layer,collection:collections.get(layer)!,file:split ? loadedGroundwaterFile : ''};
        const file = split ? metadata.classFiles?.[requestedGroundwaterClass]?.file : metadata.file, base = split ? groundwaterAssetBase! : assetBase;
        if (!file) throw new Error('選択分類の配信ファイルがありません');
        try {
          const collection = validateMexicoWaterCollection(await json(file,base),layer);
          if (split && (collection.features.length !== 1 || mexicoWaterFeatureId(collection.features[0]) !== requestedGroundwaterClass || collection.features[0].properties.classId !== requestedGroundwaterClass)) throw new Error('選択分類と資料のIDが一致しません');
          if (generation !== version && split) cache.delete(cacheKey(file,base));
          return {layer,collection,file:split?file:''};
        } catch (error) {cache.delete(cacheKey(file,base));throw error;}
      }));
      if (generation !== version || current().category !== state.category) return;
      for (const result of fetched) {
        if (result.layer === 'groundwater' && isSelectedGroundwater(manifest.layers.groundwater)) {
          if (loadedGroundwaterClass !== requestedGroundwaterClass) {layerGroups.get('groundwater')?.remove();layerGroups.delete('groundwater');}
          loadedGroundwaterClass = requestedGroundwaterClass; loadedGroundwaterFile = result.file;
          // Keep only the active classification's parsed payload; no eager download or retained ten-class bundle.
          for (const key of cache.keys()) if (groundwaterAssetBase && key.startsWith(groundwaterAssetBase) && key.endsWith('.gz') && key !== cacheKey(result.file,groundwaterAssetBase)) cache.delete(key);
        }
        if (result.collection) collections.set(result.layer,result.collection); else collections.delete(result.layer);
      }
      for (const layer of present) {if(layer==='groundwater' && isSelectedGroundwater(manifest.layers.groundwater) && requestedGroundwaterClass==='all') await drawGroundwaterOverview();else draw(layer);}
      if (generation !== version || current().category !== state.category) return;
      for (const layer of present) layerGroups.get(layer)?.style.removeProperty('display');
      keys(present); updateReading(present);
      const classPicker = q<HTMLSelectElement>('[data-mexico-groundwater-class]'), groundwater = manifest.layers.groundwater;
      if (classPicker && state.category === 'rivers-groundwater' && groundwater?.classFiles) {const all = document.createElement('option');all.value='all';all.textContent='全10分類（全国の概観）';classPicker.replaceChildren(all,...mexicoGroundwaterClassIds.map(id=>{const option=document.createElement('option');option.value=id;option.textContent=groundwater.classFiles![id].fullLabel ?? groundwater.legend?.find(key=>key.id===id)?.label ?? id;return option;}));classPicker.value=requestedGroundwaterClass;classPicker.disabled=false;}
      const picker = q<HTMLSelectElement>('[data-mexico-hydrology-item]');
      let representatives = false;
      if (picker) {const first = document.createElement('option'); first.value = ''; first.textContent = '全国の分布'; picker.replaceChildren(first, ...present.flatMap(layer => {
        const all = collections.get(layer)?.features ?? []; let listed = all;
        if (layer === 'contours') {listed = [...mexicoContourGroups(all).entries()].sort((a,b) => a[0]-b[0]).map(([,members]) => members[0]); representatives = true;}
        else if (layer === 'precipitation' && all.every(feature => typeof feature.properties.value === 'number')) {const values = new Map<number,MexicoWaterFeature>(); for (const feature of all) if (!values.has(feature.properties.value)) values.set(feature.properties.value, feature); listed = [...values.entries()].sort((a,b) => a[0]-b[0]).map(([,feature]) => feature); representatives = true;}
        const active = selectedFeature([layer]); if (active && !listed.includes(active.feature)) listed = [...listed, active.feature];
        return listed.map(feature => {const option = document.createElement('option'); option.value = `${layer}:${mexicoWaterFeatureId(feature)}`; option.textContent = `${option.value === selection.feature ? '選択中：' : ''}${mexicoWaterFeatureName(feature)}`; return option;});
      })); picker.value = selectedFeature(present) ? selection.feature : '';}
      text('[data-mexico-hydrology-picker-note]', state.category === 'rivers-groundwater' && isSelectedGroundwater(groundwater) ? requestedGroundwaterClass === 'all' ? '全10分類は原図形から作成した全国概観です。地下水の分類を選ぶと、その分類だけのベクトルを表示します。読む州と拡大で地域を選べます。' : '選択分類の全国分布です。未着色は選択区分以外などです。読む州を変え、拡大で位置を確かめます。面のクリックは地点の井戸値ではなく分類の解説です。' : state.category === 'elevation' ? '0〜5,000mの全11値を保持。太線は1,000m間隔、細い補助線は500m中間値。数値ラベルは重なりを避けた代表区間で、省略分も一覧と実線選択で読めます。' : representatives ? '原典100〜4,500mm/年の全19値・492原線を保持。色は実線の値をUSと共通の7段階で分類し、線の間の面を補間しません。太線は1,000・1,500mm/年の原線です。全値は一覧と実線選択で読めます。2006年は刊行年で、統一観測期間との対応は未確認です。' : state.category==='basins'?'INEGIの国内158流域と原河川を重ねています。外流域143と閉鎖流域15を色で区別し、流域名は元の面内に配置。国外上流域や用水路の接続は追加していません。':'一覧と地図は配信された原資料の区域・区分です。');
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
  q<HTMLSelectElement>('[data-mexico-groundwater-class]')?.addEventListener('change', event => {const next = (event.currentTarget as HTMLSelectElement).value as MexicoGroundwaterClass;if(next!=='all'&&!mexicoGroundwaterClassIds.includes(next as typeof mexicoGroundwaterClassIds[number]))return;selection={...selection,groundwaterClass:next,feature:next==='all'?selection.feature.startsWith('groundwater:')?'':selection.feature:`groundwater:${next}`};commit();root.dispatchEvent(new CustomEvent('mexico-reading-mode',{bubbles:true,detail:{selected:true}}));});
  q('[data-mexico-hydrology-retry]')?.addEventListener('click', () => {manifest = null; groundwaterManifest = null; cache.delete(cacheKey('manifest.json'));if(groundwaterAssetBase)cache.delete(cacheKey('manifest.json',groundwaterAssetBase));void render();});
  const map=q<SVGSVGElement>('[data-mexico-nature-main-map]');let labelWidth=map?.clientWidth ?? 0,labelFrame=0;
  const resizeLabels=()=>{const width=map?.clientWidth ?? 0;if(Math.abs(width-labelWidth)<.5)return;labelWidth=width;if(labelFrame)cancelAnimationFrame(labelFrame);labelFrame=requestAnimationFrame(()=>{labelFrame=0;if(!manifest || root.dataset.mexicoHydrologyReady!=='true' || !current().category)return;const layers=mexicoWaterLayersForCategory(current().category).filter(layer=>collections.has(layer)||(layer==='groundwater' && isSelectedGroundwater(manifest.layers.groundwater) && loadedGroundwaterClass==='all'));for(const layer of layers)if(layer==='precipitation'||layer==='contours'||layer==='basins')draw(layer);keys(layers);});};
  if(map && typeof ResizeObserver!=='undefined')new ResizeObserver(resizeLabels).observe(map);else window.addEventListener('resize',resizeLabels);
  return {render: () => void render(), read: () => {selection = readMexicoWaterSelection(new URL(location.href));}, url: (url: URL) => writeMexicoWaterSelection(url, selection)};
}
