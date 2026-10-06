import {readMexicoNatureState, writeMexicoNatureState, mexicoNatureReturnUrl, mexicoNatureIndicator, mexicoNatureSelectView, mexicoNatureZoomFrame, indicatorColor, irrigationBins, densityBins, natureComparisonReading, type MexicoNatureState, type MexicoNatureCategory} from '../lib/atlas-mexico-nature';
import {stateViewBox} from '../lib/atlas-mexico-geometry';
import {prepareMexicoNatureLivestock, renderMexicoNatureLivestock} from '../lib/atlas-mexico-nature-livestock';
import {initMexicoHydrology} from './atlas-mexico-hydrology';
import {agricultureMetrics, agricultureSymbolKeys, quantityRadius} from '../lib/atlas-mexico-agriculture';
import {mexicoPopulationRadius, mexicoPopulationLegendValues, mexicoPopulationSymbolColor, mexicoPopulationSymbolOpacity, mexicoPopulationSymbolStroke, mexicoPopulationSelectedSymbolStroke, mexicoPopulationSelectedSymbolOpacity} from '../lib/atlas-mexico-population';

interface NatureStateValue {code: string; name: string; point: number[]; irrigationSharePct: number | null; irrigatedAreaHa: number | null; agriculturalAreaHa: number | null; maizeWhiteProductionT: number | null; cattleHeads?: number | null; pineObtainedM3: number | null; density: number | null; population: number | null}
interface NatureItem {id: string; labelJa: string; title: string; lead: string; body: string}
interface NatureConfig {routes: {nature: string; agriculture: string; population: string}; defaultViewBox: string; states: NatureStateValue[]; sinaloaWinter: {productionT: number; irrigatedProductionSharePct: number}; items?: {climate: NatureItem[]; relief: NatureItem[]}; waterAssetBase?: string; groundwaterAssetBase?: string; surfaceAssetBase?: string; basinAssetBase?: string}
export function initMexicoNature(root: HTMLElement): void {
  const configNode = root.querySelector('[data-mexico-nature-config]');
  if (!configNode?.textContent || root.dataset.mexicoNatureReady === 'true') return;
  const config = JSON.parse(configNode.textContent) as NatureConfig;
  prepareMexicoNatureLivestock(root);
  const codes = config.states.map(item => item.code), values = new Map(config.states.map(item => [item.code, item]));
  const query = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const all = <T extends Element = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  let state = readMexicoNatureState(new URL(window.location.href), codes);
  const hydrology = config.waterAssetBase ? initMexicoHydrology(root, config.waterAssetBase, () => state, () => update({}), config.groundwaterAssetBase, config.surfaceAssetBase && config.basinAssetBase ? {surfaceAssetBase:config.surfaceAssetBase,basinAssetBase:config.basinAssetBase} : undefined) : null;
  const number = (value: number | null, places = 1) => value === null ? '未取得' : value.toLocaleString('ja-JP', {minimumFractionDigits: places, maximumFractionDigits: places});
  const text = (selector: string, value: string) => {const element = query(selector); if (element) element.textContent = value;};
  const visible = (selector: string, value: boolean) => {for (const element of all(selector)) element.hidden = !value;};
  const naturalLabel = () => state.category && hydrology ? ({'rivers-groundwater': '河川・地下水', precipitation: '降水量', basins: '河川の流域', elevation: '標高'}[state.category]) : state.view === 'climate' ? '気候分布' : '地形地域分布';
  const makeComparisonURL = (comparison: 'irrigation' | 'population') => {const next = writeMexicoNatureState(new URL(config.routes.nature, window.location.origin), {...state, compare: comparison, view: comparison === 'population' || (state.from === 'agriculture' && state.sourceMetric === 'pine') ? 'relief' : 'climate', only: false}); return (hydrology?.url(next) ?? next).href;};
  function render(): void {
    const selected = values.get(state.state);
    root.classList.toggle('is-comparison', state.compare !== null);
    root.dataset.mexicoNatureView = state.view; root.dataset.mexicoNatureCompare = state.compare ?? ''; root.dataset.mexicoNatureState = state.state; root.dataset.mexicoNatureFallback = String(state.fallback);
    root.dataset.mexicoNatureCategory = state.category; root.dataset.mexicoNatureItem = state.item; root.dataset.mexicoNatureFeature = state.feature;
    visible('[data-mexico-climate-class-reading]', state.view === 'climate' && !state.category);
    visible('[data-mexico-climate-diagrams]', state.view === 'climate' && !state.category && !state.compare);
    for (const button of all<HTMLButtonElement>('[data-mexico-nature-view]')) button.setAttribute('aria-pressed', String(!state.category && button.dataset.mexicoNatureView === state.view));
    const water = state.category !== '' && state.category !== 'elevation';
    visible('[data-mexico-nature-water-tabs]', water);
    for (const button of all<HTMLButtonElement>('[data-mexico-nature-category]')) button.setAttribute('aria-pressed', String(button.dataset.mexicoNatureCategory === state.category || (water && button.dataset.mexicoNatureCategory === 'rivers-groundwater' && !button.closest('[data-mexico-nature-water-tabs]'))));
    const feature = state.feature ? query<SVGPathElement>(`[data-mexico-nature-feature="${state.feature}"]`) : null;
    if (feature && feature.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') === state.view) state.item = feature.dataset.natureClass ?? state.item;
    else if (state.feature && !feature) state.feature = '';
    root.dataset.mexicoNatureItem = state.item; root.dataset.mexicoNatureFeature = state.feature;
    const item = config.items?.[state.view].find(item => item.id === state.item);
    const featureCode = state.view === 'climate' && feature?.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') === 'climate' ? feature.dataset.natureSourceCode ?? query<SVGElement>(`[data-mexico-nature-label-feature="${state.feature}"]`)?.dataset.mexicoNatureLabelCode ?? '' : '';
    const picker = query<HTMLSelectElement>('[data-mexico-nature-item-select]');
    if (picker) {const options = config.items?.[state.view] ?? []; const option = (label: string, value: string) => {const node = document.createElement('option'); node.textContent = label; node.value = value; return node;}; picker.replaceChildren(option('全国の概論', ''), ...options.map(item => option(item.labelJa, item.id))); picker.value = item ? state.item : '';}
    for (const path of all<SVGPathElement>('[data-mexico-nature-feature]')) {
      const active = !state.category && path.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') === state.view;
      const selectedFeature = active && path.dataset.mexicoNatureFeature === state.feature;
      const selectedClass = active && path.dataset.natureClass === state.item;
      const isSelected = state.view === 'relief' && selectedClass;
      path.classList.toggle('is-selected-feature', isSelected);const reliefPath=path.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer')==='relief';path.setAttribute('role',reliefPath?'button':'img');if(reliefPath)path.setAttribute('aria-pressed',String(isSelected));else path.removeAttribute('aria-pressed');path.setAttribute('tabindex', state.view === 'relief' && selectedFeature ? '0' : '-1');
    }
    for (const label of all<HTMLElement | SVGElement>('[data-mexico-nature-class-label]')) {
      const id = label.dataset.mexicoNatureClassLabel;
      const active = !state.category && !!config.items?.[state.view].some(item => item.id === id);
      const pressed = active && id === state.item && (state.view === 'relief' || !state.feature || !label.dataset.mexicoNatureLabelFeature || label.dataset.mexicoNatureLabelFeature === state.feature);
      label.setAttribute('aria-pressed', String(pressed)); label.setAttribute('aria-disabled', String(!active)); label.setAttribute('tabindex', active ? '0' : '-1');
      if (label instanceof HTMLButtonElement) label.disabled = !active;
    }
    const categoryNames: Record<string, string> = {'rivers-groundwater': '河川・地下水', precipitation: '降水量', basins: '河川の流域', elevation: '標高'};
    visible('[data-mexico-nature-reference]', !!state.category);
    text('[data-mexico-nature-reference]', state.category ? `${categoryNames[state.category]}は未整備です。参考として${naturalLabel()}を表示しています。` : '');
    visible('[data-mexico-nature-feature-reading]', !!item || !!state.category);
    text('[data-mexico-nature-feature-title]', state.category ? `${categoryNames[state.category]}（未整備）` : item ? `${item.title}${featureCode ? `（${featureCode}）` : ''}` : '');
    text('[data-mexico-nature-feature-lead]', state.category ? `現在の${naturalLabel()}と比較元の分布・選択を保持しています。` : item?.lead ?? '');
    text('[data-mexico-nature-feature-body]', state.category ? 'この入口の河川・地下水・降水量・流域または標高の資料は未整備です。参考図から水量・流域界・標高の数値を推定しません。' : item?.body ?? '');
    if (!state.category && state.view === 'climate' && state.feature === 'climate-551') query('[data-mexico-nature-feature-body]')?.append(document.createTextNode(' 原資料のコードBS0hw（Seco semicálido）と分類32（Templado subhúmedo）は不整合です。両属性を保持し、分類の付け替えはしていません。'));
    const select = query<HTMLSelectElement>('[data-mexico-nature-state-select]'); if (select) select.value = state.state;
    const only = query<HTMLInputElement>('[data-mexico-nature-only]'); if (only) only.checked = state.only;
    for (const layer of all<SVGGElement>('[data-mexico-nature-layer]')) {layer.removeAttribute('hidden'); layer.setAttribute('style', layer.dataset.mexicoNatureLayer === state.view ? '' : 'display:none');}
    visible('[data-mexico-nature-legend="climate"]', state.view === 'climate'); visible('[data-mexico-nature-legend="relief"]', state.view === 'relief');
    // Legacy fallback flags remain in source-return state, while the map uses the current native artwork.
    for (const layer of all<SVGGElement>('[data-mexico-nature-vector]')) layer.setAttribute('style', '');
    for (const layer of all<SVGGElement>('[data-mexico-nature-static]')) {layer.setAttribute('hidden', ''); layer.setAttribute('style', 'display:none');}
    for (const image of all<SVGImageElement>('[data-mexico-nature-static-image]')) {image.removeAttribute('href'); image.removeAttribute('xlink:href');}
    query<SVGSVGElement>('[data-mexico-nature-main-map]')?.setAttribute('data-mexico-nature-map-mode', 'interactive');
    visible('[data-mexico-nature-static-note]', false);
    text('[data-mexico-nature-map-title]', state.view === 'climate' ? '気候の分布' : '自然地理地域の分布');
    text('#mexico-nature-map-title', state.view === 'climate' ? 'メキシコの気候区分の全国分布' : 'メキシコの自然地理地域の全国分布');
    text('#mexico-nature-map-desc', state.view === 'climate' ? 'INEGI改訂ケッペン・原分類21を保持。気候コードから解説を、都市の観測点から雨温図を選べます。地域をクリックして輪郭を強調しません。州境と気候の境界は異なります。' : '地形名を選ぶと、その自然地理地域だけを灰色の輪郭で表示します。15地域の原区分を保持。標高mの区分ではありません。');
    text('[data-mexico-nature-map-edition]', state.view === 'climate' ? 'INEGI・2008版' : 'INEGI・2001版');
    text('[data-mexico-nature-period]', state.view === 'climate' ? 'BS1＝半乾燥、BS0＝乾燥、BW＝非常に乾燥。完全な原コードは選択時に表示。原分類21とUS共通配色を保持。2008＝刊行年・統一観測期未記載。' : '15自然地理地域＋分類なし。標高の数値ではありません。');
    text('[data-mexico-nature-selected-name]', selected?.name ?? '全国');
    const nativeRelief = state.view === 'relief' && !state.category, elevation = state.category === 'elevation';
    if (!state.category) for (const background of all<SVGGElement>('[data-mexico-nature-neutral],[data-mexico-nature-relief-background]')) {background.removeAttribute('hidden'); background.style.display = nativeRelief ? '' : 'none';}
    const climate = state.view === 'climate' && !state.category;
    for (const path of all<SVGPathElement>('[data-mexico-nature-state]')) {const isSelected = path.dataset.mexicoNatureState === state.state; path.classList.toggle('is-selected', isSelected && !elevation && !climate); path.setAttribute('aria-pressed', String(!nativeRelief && !elevation && !climate && isSelected)); path.setAttribute('tabindex', nativeRelief || elevation || climate ? '-1' : '0'); path.setAttribute('aria-disabled', String(elevation || climate)); path.style.pointerEvents = elevation || climate ? 'none' : ''; path.style.display = nativeRelief ? 'none' : '';}
    for (const target of all<SVGGElement>('[data-mexico-nature-target]')) {if(selected)target.setAttribute('transform', `translate(${selected.point.join(' ')})`); target.style.display = !selected || nativeRelief || elevation || climate ? 'none' : '';}
    visible('[data-mexico-nature-focus]', !!selected && !nativeRelief && !elevation && !climate);
    visible('.mexico-nature-state-control,[data-mexico-nature-selected-name],[data-mexico-nature-state-note]', !elevation && (!climate || !!state.compare));
    if (select) select.disabled = elevation;
    for (const svg of all<SVGSVGElement>('[data-mexico-nature-main-map],[data-mexico-nature-comparison-map]')) svg.setAttribute('viewBox', state.frame?.join(' ') ?? config.defaultViewBox);
    for (const row of all('[data-mexico-nature-value-row]')) row.classList.toggle('is-selected', row.dataset.mexicoNatureValueRow === state.state);
    visible('[data-mexico-nature-overview]', state.compare === null && !item && !state.category); visible('[data-mexico-nature-comparison]', state.compare !== null); visible('[data-mexico-nature-only-control]', state.compare !== null);
    text('[data-mexico-nature-reading-title]', state.view === 'climate' ? '気候の違いが水管理を変える' : '山系・高原・沿岸の位置を読む');
    text('[data-mexico-nature-reading-lead]', state.view === 'climate' ? '北部・北西部に乾燥系、中央部に温帯系、南東部に高温・湿潤系が広がる。' : '西・東シエラマドレ、中央高原、火山帯、沿岸平原を全国で位置付ける。');
    text('[data-mexico-nature-reading-body]', state.view === 'climate' ? '乾燥する地域では、農地へ水を配る灌漑が作期を支える。山地と高原の気温条件、沿岸平原の位置を合わせると、農業や都市が成立する場所を読める。' : '地質と地形の成り立ちによる15の自然地理地域。中央部の都市集積と、沿岸・北部の交通や市場をつなぐ場所を人口分布と見比べる。');
    for (const link of all<HTMLAnchorElement>('[data-mexico-nature-compare-link]')) {const comparison = link.dataset.mexicoNatureCompareLink as 'irrigation' | 'population'; link.href = makeComparisonURL(comparison); const mode=mexicoNatureIndicator(readMexicoNatureState(new URL(link.href),codes)),metric={density:'人口密度',population:'人口規模',irrigation:'灌漑農地率',maize:'白粒トウモロコシ生産量',cattle:'牛頭数',pine:'松材取得量'}[mode];link.textContent = state.category && hydrology ? `${metric}と比較` : `${naturalLabel()}と${metric}を比べる`;link.setAttribute('aria-label',`${naturalLabel()}と${metric}を比べる`);}
    const sourceReturn = query<HTMLAnchorElement>('[data-mexico-nature-source-return]');
    if (sourceReturn) {
      sourceReturn.hidden = state.from === null;
      const originalName = state.from === 'population' && state.sourceState === '' ? '全国' : values.get(state.sourceState)?.name ?? selected?.name ?? '全国';
      const sourceLabel = state.from === 'agriculture' ? ({maize: '白粒トウモロコシ', cattle: '牛頭数', irrigation: '灌漑農地率', pine: '松材取得量'}[state.sourceMetric]) : state.sourceView === 'population' ? '人口規模' : '人口密度';
      sourceReturn.href = mexicoNatureReturnUrl(state.from === 'population' ? config.routes.population : config.routes.agriculture, state);
      sourceReturn.textContent = state.from==='agriculture'&&state.sourceAgricultureAtlas?.state===null?`${sourceLabel}の元の解説に戻る`:`${originalName}の${sourceLabel}分布に戻る`;
    }
    const plainReturn = query<HTMLAnchorElement>('[data-mexico-nature-plain-return]');
    if (plainReturn) {const native = writeMexicoNatureState(new URL(config.routes.nature, window.location.origin), {...state, compare: null, only: false}); plainReturn.href = (hydrology?.url(native) ?? native).href; plainReturn.textContent = `${selected?.name ?? '全国'}の${naturalLabel()}に戻る`;}
    if (state.compare && selected) renderComparison(selected);
    hydrology?.render();
  }
  function renderComparison(selected: NatureStateValue): void {
    const mode = mexicoNatureIndicator(state), populationMode = state.compare === 'population', bins = populationMode ? densityBins : irrigationBins;
    const quantity = mode === 'maize' || mode === 'cattle' || mode === 'pine' || mode === 'population';
    const context = query<SVGGElement>('[data-mexico-nature-population-context]'); if (context) context.style.display = populationMode ? '' : 'none';
    root.dataset.mexicoNatureIndicator = mode;
    const labels = {density: '人口密度', irrigation: '灌漑農地率', maize: '白粒トウモロコシ生産量', cattle: '牛頭数', pine: '松材取得量', population: '人口規模'};
    const unit = mode === 'density' ? ' 人/km²' : mode === 'irrigation' ? '%' : mode === 'pine' ? ' m³' : mode === 'maize' ? ' t' : mode === 'cattle' ? ' 頭' : ' 人';
    const valueOf = (item: NatureStateValue) => mode === 'density' ? item.density : mode === 'irrigation' ? item.irrigationSharePct : mode === 'maize' ? item.maizeWhiteProductionT : mode === 'cattle' ? item.cattleHeads ?? null : mode === 'pine' ? item.pineObtainedM3 : item.population;
    const value = valueOf(selected);
    const reading = natureComparisonReading(state.compare, state.state);
    const naturalName = naturalLabel();
    text('[data-mexico-nature-comparison-granularity]', state.category ? '両地図は同じ投影・表示範囲です。水資源・標高の原線や原区域と、比較先の州平均・州数量は異なる単位の分布です。線や面の値を州平均へ置き換えません。' : '両地図は同じ投影・表示範囲です。自然分布は地域区分、比較先は州平均または州の公表数量として読みます。');
    text('[data-mexico-nature-comparison-title]', `${naturalName}と${labels[mode]}`);
    text('[data-mexico-nature-comparison-lead]', mode === 'pine' ? '西シエラマドレなどの山地と、松材取得の集中を比べる。' : mode === 'maize' ? '北西部の白粒生産を、気候と灌漑の条件につなげる。' : mode === 'population' ? '中央部の高地・盆地と、人口が多い州の位置を比べる。' : reading.lead);
    text('[data-mexico-nature-comparison-value]', `${selected.name}：${labels[mode]} ${number(value, quantity ? 0 : 1)}${unit}`);
    text('[data-mexico-nature-comparison-definition]', mode === 'density' ? '人口密度は2020年の州平均。左の地形地域の位置と合わせて読む。' : mode === 'irrigation' ? '農業用地総面積に占める灌漑面積。播種・非播種・休耕を含む。' : mode === 'pine' ? '円の面積＝林業生産単位が取得した松材の体積。森林の面積とは別の量。' : mode === 'maize' ? '円の面積＝露地の一年生作物の白粒穀粒生産量。元の州別分布を保持。' : '円の面積＝2020年の州人口。元の人口規模分布を保持。');
    text('[data-mexico-nature-comparison-map-title]', `${labels[mode]}・${populationMode ? '2020年' : '2022年農業センサス'}`);
    text('#mexico-nature-comparison-map-title', `${naturalName}と同じ範囲の州別${labels[mode]}`);
    text('[data-mexico-nature-comparison-period]', `${state.category && hydrology ? `${naturalName}は原典・対象期間を別記` : state.view === 'relief' ? '自然地理地域2001版' : '気候区分2008版'} / ${populationMode ? '人口2020年' : '2021年10月～2022年9月'}、32州すべて公表値。`);
    text('[data-mexico-nature-only-label]', populationMode ? '比較先は選んだ州のデータだけ' : '比較先は選んだ州を強調');
    const winter = selected.code === '25' ? `シナロアの秋冬作の白粒生産${number(config.sinaloaWinter.productionT / 10000)}万tの${number(config.sinaloaWinter.irrigatedProductionSharePct)}%が灌漑による生産。` : '';
    text('[data-mexico-nature-comparison-body]', mode === 'pine' ? 'ドゥランゴ・チワワ側の西シエラマドレには松・オークの温帯林があり、松材取得が集中する。山地の位置と州別の取得量を合わせ、森林資源から加工・市場への供給を読む。' : mode === 'maize' ? `${selected.name}の灌漑農地率は${number(selected.irrigationSharePct)}%。${winter}気候分布と白粒の生産量を見比べ、用水から耕作、貯蔵・集荷・輸送を経て主食へ届く流れを読む。` : reading.body);
    text('[data-mexico-nature-comparison-consequence]', mode === 'pine' ? '木材の供給と、水の浸透・侵食の抑制・生息地を支える森林管理を結び付ける。取得量は森林の面積や伐採率を示す値ではない。' : reading.consequence);
    if (state.category || mode === 'cattle' || state.view !== (populationMode || mode === 'pine' ? 'relief' : 'climate')) {
      text('[data-mexico-nature-comparison-lead]', state.category && hydrology ? '主図に指標分布なし。州値で照合／別図は詳細。' : `${naturalName}と、州別の${labels[mode]}を同じ範囲で読み比べる。`);
      const definition = state.category === 'elevation' ? '標高の等高線はETOPO原格子から500m間隔で生成した線（EGM2008）で、州平均ではありません' : state.category === 'precipitation' ? '降水面はGPCCの1991–2020年平年値を年合計したmm/年の格子値で、州平均や観測所の値とは異なります' : state.category === 'basins' ? '薄塗りは3代表水系に関連する国内流域区分で、国際河川の全流域や地下水の流動区域とは異なります' : state.category === 'rivers-groundwater' ? '原河川ネットワーク（間欠・仮想流を含む）の次数は小流域内の階層で、水量・幅を表しません。地下水10分類は材料と井戸産出量・賦存可能性です' : `${naturalName}は自然地域の分類です`;
      text('[data-mexico-nature-comparison-body]', `${definition}。${labels[mode]}は州単位の公表値です。${state.category && hydrology?`主図には${labels[mode]}の分布を重ねていません。主図は自然資料の線・面と選択した背景です。全州の${labels[mode]}は、この詳細内の同じ範囲の別図で確認できます。`:''}自然条件の線・面と州境を区別し、水管理・仕事・交通・市場と合わせて分布を読みます。自然条件だけで数量や人口は決まりません。`);
    }
    if (mode === 'density') text('[data-mexico-nature-comparison-definition]', `人口密度は2020年の州平均。${naturalName}の原資料の線・面とは異なる粒度です。`);
    if (mode === 'cattle') {text('[data-mexico-nature-comparison-definition]', '円の面積＝2022年9月の牛頭数。生産単位と住宅の合計。肉や乳の生産量とは別の数値。'); text('[data-mexico-nature-comparison-period]', `${state.category && hydrology ? `${naturalName}は原典・対象期間を別記` : state.view === 'relief' ? '自然地理地域2001版' : '気候区分2008版'} / 牛頭数2022年9月`);}
    visible('[data-mexico-nature-comparison-legend]', !quantity); visible('[data-mexico-nature-quantity-legend]', quantity);
    const symbols = query<SVGGElement>('[data-mexico-nature-quantity-symbols]'); if (symbols) symbols.style.display = quantity ? '' : 'none';
    const legend = query<HTMLUListElement>('[data-mexico-nature-comparison-legend]');
    if (legend) {legend.replaceChildren(...bins.map(bin => {const li = document.createElement('li'), swatch = document.createElement('i'); swatch.style.background = bin.color; swatch.setAttribute('aria-hidden', 'true'); li.append(swatch, document.createTextNode(bin.label)); return li;})); legend.setAttribute('aria-label', populationMode ? '州平均人口密度の凡例' : '灌漑農地率の凡例');}
    for (const path of all<SVGPathElement>('[data-mexico-nature-compare-state]')) {
      const item = values.get(path.dataset.mexicoNatureCompareState!)!, isSelected = item.code === state.state;
      const numberValue = valueOf(item);
      const color = quantity ? (populationMode ? '#e0e7d8' : '#dce2d3') : indicatorColor(numberValue, bins);
      path.style.fill = color; path.setAttribute('fill', color); path.classList.toggle('is-selected', isSelected); path.setAttribute('aria-pressed', String(isSelected));
      path.style.opacity = state.only && !isSelected ? (populationMode ? '0' : '.42') : '1';
      path.setAttribute('tabindex', quantity || (populationMode && state.only && !isSelected) ? '-1' : '0');
      const label = `${item.name}：${labels[mode]} ${number(numberValue, quantity ? 0 : 1)}${unit}`;
      path.setAttribute('aria-label', label); const title = path.querySelector('title'); if (title) title.textContent = label;
    }
    if (quantity) {
      const maximum = Math.max(...config.states.map(item => valueOf(item) ?? 0));
      const zoomFactor = (state.frame?.[2] ?? 900) / 900;
      const radius = (value: number | null) => value === null ? 0 : (mode === 'population' ? mexicoPopulationRadius(value) : quantityRadius(value, maximum)) * zoomFactor;
      const color = mode === 'population' ? mexicoPopulationSymbolColor : agricultureMetrics.find(metric => metric.id === mode)!.color;
      for (const circle of all<SVGCircleElement>('[data-mexico-nature-compare-symbol]')) {
        const item = values.get(circle.dataset.mexicoNatureCompareSymbol!)!, isSelected = item.code === state.state;
        circle.setAttribute('r', String(radius(valueOf(item)))); circle.style.fill = color;
        circle.style.fillOpacity = String(mode === 'population' ? isSelected ? mexicoPopulationSelectedSymbolOpacity : mexicoPopulationSymbolOpacity : isSelected ? .85 : .67);
        circle.style.stroke = mode === 'population' ? isSelected ? mexicoPopulationSelectedSymbolStroke : mexicoPopulationSymbolStroke : isSelected ? '#243e31' : '#785219';
        circle.style.strokeWidth = String(mode === 'population' ? isSelected ? 3.2 : 1.4 : isSelected ? 2 : .8);
        circle.style.display = populationMode && state.only && !isSelected ? 'none' : '';
        circle.style.opacity = !populationMode && state.only && !isSelected ? '.24' : '1';
        circle.setAttribute('aria-pressed', String(isSelected)); circle.setAttribute('tabindex', populationMode && state.only && !isSelected ? '-1' : '0');
        const label = `${item.name}：${labels[mode]} ${number(valueOf(item), 0)}${unit}`;
        circle.setAttribute('aria-label', label); const title = circle.querySelector('title'); if (title) title.textContent = label;
      }
      // Large symbols are painted first, matching the population source map.
      if (mode === 'population' && symbols) for (const item of [...config.states].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))) {const circle = query(`[data-mexico-nature-compare-symbol="${item.code}"]`); if (circle) symbols.append(circle);}
      const key = query<SVGSVGElement>('[data-mexico-nature-quantity-key]');
      if (key) {
        const ns = 'http://www.w3.org/2000/svg', element = (name: string, attributes: Record<string, string | number>) => {const node = document.createElementNS(ns, name); for (const [attribute, value] of Object.entries(attributes)) node.setAttribute(attribute, String(value)); return node;};
        const keys = mode === 'population' ? mexicoPopulationLegendValues : agricultureSymbolKeys[mode as 'maize' | 'cattle' | 'pine'];
        key.setAttribute('viewBox', `0 0 ${900 * zoomFactor} ${90 * zoomFactor}`);
        key.replaceChildren(...keys.map((value, index) => element('circle', {cx: (150 + index * 300) * zoomFactor, cy: 45 * zoomFactor, r: radius(value), fill: color, 'fill-opacity': mode === 'population' ? mexicoPopulationSymbolOpacity : .67, stroke: mode === 'population' ? mexicoPopulationSymbolStroke : '#54634c', 'stroke-width': zoomFactor})));
        key.setAttribute('aria-label', `${labels[mode]}の円の面積の凡例。${keys.map(value => `${number(value, 0)}${unit}`).join('、')}。地図と同じ座標縮尺。`);
        const keyValues = query('[data-mexico-nature-quantity-key-values]'); if (keyValues) keyValues.replaceChildren(...keys.map(value => {const item = document.createElement('li'); item.textContent = `${number(value, 0)}${unit}`; return item;}));
      }
      text('[data-mexico-nature-quantity-definition]', `円の面積＝${labels[mode]}。0＝円なし。元ページと同じ全32州固定の尺度。`);
    }
    renderMexicoNatureLivestock(root, state, config.states);
  }
  function update(patch: Partial<MexicoNatureState>): void {
    if (patch.state && patch.state !== state.state && state.frame && patch.frame === undefined) patch.frame = stateViewBox(patch.state).split(' ').map(Number);
    state = {...state, ...patch}; render(); const native = writeMexicoNatureState(new URL(window.location.href), state), next = hydrology?.url(native) ?? native; next.searchParams.set('reading', 'item'); window.history.pushState(null, '', next);
    text('[data-mexico-nature-announcement]', `${values.get(state.state)?.name ?? '全国'}の${naturalLabel()}${state.compare ? 'と専用比較' : ''}を表示しました。`);
  }
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-view]')) button.addEventListener('click', () => update(mexicoNatureSelectView(state, button.dataset.mexicoNatureView as 'climate' | 'relief')));
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-category]')) button.addEventListener('click', () => update({category: button.dataset.mexicoNatureCategory as MexicoNatureCategory}));
  for (const path of all<SVGPathElement>('[data-mexico-nature-feature]')) {const choose = () => {if (state.category || state.view === 'climate' || path.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') !== state.view) return; update({item: path.dataset.natureClass ?? '', feature: path.dataset.mexicoNatureFeature ?? '', category: ''});}; path.addEventListener('click', choose); path.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); choose();}});}
  for (const label of all<HTMLElement | SVGElement>('[data-mexico-nature-class-label]')) {
    const choose = () => {const item = label.dataset.mexicoNatureClassLabel ?? ''; if (state.category || !config.items?.[state.view].some(option => option.id === item)) return; update({item, feature: state.view === 'climate' ? label.dataset.mexicoNatureLabelFeature ?? '' : '', category: ''}); root.dispatchEvent(new CustomEvent('mexico-reading-mode', {bubbles: true, detail: {selected: true}}));};
    label.addEventListener('click', choose); if (!(label instanceof HTMLButtonElement)) label.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); choose();}});
  }
  query<HTMLSelectElement>('[data-mexico-nature-item-select]')?.addEventListener('change', event => update({item: (event.currentTarget as HTMLSelectElement).value, feature: '', category: ''}));
  query<HTMLButtonElement>('[data-mexico-nature-clear-item]')?.addEventListener('click', () => update({item: '', feature: '', category: ''}));
  query<HTMLButtonElement>('[data-mexico-overview-button]')?.addEventListener('click', () => setTimeout(() => {state = {...state, item: '', feature: '', category: ''}; render(); const next = writeMexicoNatureState(new URL(window.location.href), state); next.searchParams.set('reading', 'overview'); window.history.replaceState(window.history.state, '', next);}, 0));
  query<HTMLSelectElement>('[data-mexico-nature-state-select]')?.addEventListener('change', event => {if (state.category !== 'elevation') update({state: (event.currentTarget as HTMLSelectElement).value});});
  query<HTMLInputElement>('[data-mexico-nature-only]')?.addEventListener('change', event => update({only: (event.currentTarget as HTMLInputElement).checked}));
  for (const path of all<SVGElement>('[data-mexico-nature-state],[data-mexico-nature-compare-state],[data-mexico-nature-compare-symbol]')) {
    const choose = () => {if (path.hasAttribute('data-mexico-nature-state') && (state.category === 'elevation' || (!state.category && state.view === 'climate'))) return; const code = path.dataset.mexicoNatureState ?? path.dataset.mexicoNatureCompareState ?? path.dataset.mexicoNatureCompareSymbol!; if (code !== state.state) update({state: code});};
    path.addEventListener('click', choose); path.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); choose();}});
  }
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-focus]')) button.addEventListener('click', () => update({frame: stateViewBox(state.state).split(' ').map(Number)}));
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-reset]')) button.addEventListener('click', () => update({frame: null}));
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-zoom]')) button.addEventListener('click', () => update({frame: mexicoNatureZoomFrame(state.frame, config.defaultViewBox.split(' ').map(Number), button.dataset.mexicoNatureZoom === 'in' ? 'in' : 'out')}));
  root.addEventListener('mexico-climate-city-change', () => {state = {...state, city: new URL(window.location.href).searchParams.get('city')}; render();});
  window.addEventListener('popstate', () => {state = readMexicoNatureState(new URL(window.location.href), codes); hydrology?.read(); render();});
  root.dataset.mexicoNatureReady = 'true'; render(); const initialURL = writeMexicoNatureState(new URL(window.location.href), state); window.history.replaceState(null, '', hydrology?.url(initialURL) ?? initialURL);
}
