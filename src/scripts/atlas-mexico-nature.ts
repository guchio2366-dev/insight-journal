import {readMexicoNatureState, writeMexicoNatureState, mexicoNatureReturnUrl, mexicoNatureIndicator, mexicoNatureSelectView, indicatorColor, irrigationBins, densityBins, natureComparisonReading, type MexicoNatureState, type MexicoNatureCategory} from '../lib/atlas-mexico-nature';
import {stateViewBox} from '../lib/atlas-mexico-geometry';
import {prepareMexicoNatureLivestock, renderMexicoNatureLivestock} from '../lib/atlas-mexico-nature-livestock';
import {agricultureMetrics, agricultureSymbolKeys, quantityRadius} from '../lib/atlas-mexico-agriculture';
import {mexicoPopulationRadius, mexicoPopulationLegendValues, mexicoPopulationSymbolColor, mexicoPopulationSymbolOpacity, mexicoPopulationSymbolStroke, mexicoPopulationSelectedSymbolStroke, mexicoPopulationSelectedSymbolOpacity} from '../lib/atlas-mexico-population';

interface NatureStateValue {code: string; name: string; point: number[]; irrigationSharePct: number | null; irrigatedAreaHa: number | null; agriculturalAreaHa: number | null; maizeWhiteProductionT: number | null; cattleHeads?: number | null; pineObtainedM3: number | null; density: number | null; population: number | null}
interface NatureItem {id: string; labelJa: string; title: string; lead: string; body: string}
interface NatureConfig {routes: {nature: string; agriculture: string; population: string}; defaultViewBox: string; states: NatureStateValue[]; sinaloaWinter: {productionT: number; irrigatedProductionSharePct: number}; staticMaps: {climate: string; relief: string}; items?: {climate: NatureItem[]; relief: NatureItem[]}}
export function initMexicoNature(root: HTMLElement): void {
  const configNode = root.querySelector('[data-mexico-nature-config]');
  if (!configNode?.textContent || root.dataset.mexicoNatureReady === 'true') return;
  const config = JSON.parse(configNode.textContent) as NatureConfig;
  prepareMexicoNatureLivestock(root);
  const codes = config.states.map(item => item.code), values = new Map(config.states.map(item => [item.code, item]));
  const query = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const all = <T extends Element = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  let state = readMexicoNatureState(new URL(window.location.href), codes);
  const number = (value: number | null, places = 1) => value === null ? '未取得' : value.toLocaleString('ja-JP', {minimumFractionDigits: places, maximumFractionDigits: places});
  const text = (selector: string, value: string) => {const element = query(selector); if (element) element.textContent = value;};
  const visible = (selector: string, value: boolean) => {for (const element of all(selector)) element.hidden = !value;};
  const naturalLabel = () => state.view === 'climate' ? '気候分布' : '地形地域分布';
  const makeComparisonURL = (comparison: 'irrigation' | 'population') => writeMexicoNatureState(new URL(config.routes.nature, window.location.origin), {...state, compare: comparison, view: comparison === 'population' || (state.from === 'agriculture' && state.sourceMetric === 'pine') ? 'relief' : 'climate', only: false, frame: null}).href;
  function render(): void {
    const selected = values.get(state.state)!;
    root.classList.toggle('is-comparison', state.compare !== null);
    root.dataset.mexicoNatureView = state.view; root.dataset.mexicoNatureCompare = state.compare ?? ''; root.dataset.mexicoNatureState = state.state; root.dataset.mexicoNatureFallback = String(state.fallback);
    root.dataset.mexicoNatureCategory = state.category; root.dataset.mexicoNatureItem = state.item; root.dataset.mexicoNatureFeature = state.feature;
    for (const button of all<HTMLButtonElement>('[data-mexico-nature-view]')) button.setAttribute('aria-pressed', String(!state.category && button.dataset.mexicoNatureView === state.view));
    const water = state.category !== '' && state.category !== 'elevation';
    visible('[data-mexico-nature-water-tabs]', water);
    for (const button of all<HTMLButtonElement>('[data-mexico-nature-category]')) button.setAttribute('aria-pressed', String(button.dataset.mexicoNatureCategory === state.category || (water && button.dataset.mexicoNatureCategory === 'rivers-groundwater' && !button.closest('[data-mexico-nature-water-tabs]'))));
    const feature = state.feature ? query<SVGPathElement>(`[data-mexico-nature-feature="${state.feature}"]`) : null;
    if (feature && feature.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') === state.view) state.item = feature.dataset.natureClass ?? state.item;
    else if (state.feature && !feature) state.feature = '';
    root.dataset.mexicoNatureItem = state.item; root.dataset.mexicoNatureFeature = state.feature;
    const item = config.items?.[state.view].find(item => item.id === state.item);
    const picker = query<HTMLSelectElement>('[data-mexico-nature-item-select]');
    if (picker) {const options = config.items?.[state.view] ?? []; const option = (label: string, value: string) => {const node = document.createElement('option'); node.textContent = label; node.value = value; return node;}; picker.replaceChildren(option('全国の概論', ''), ...options.map(item => option(item.labelJa, item.id))); picker.value = item ? state.item : '';}
    for (const path of all<SVGPathElement>('[data-mexico-nature-feature]')) {const selectedFeature = path.dataset.mexicoNatureFeature === state.feature; const selectedClass = !state.feature && path.dataset.natureClass === state.item && path.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') === state.view; path.classList.toggle('is-selected-feature', selectedFeature || selectedClass); path.setAttribute('aria-pressed', String(selectedFeature || selectedClass)); path.setAttribute('tabindex', selectedFeature ? '0' : '-1');}
    const categoryNames: Record<string, string> = {'rivers-groundwater': '河川・地下水', precipitation: '降水量', basins: '河川の流域', elevation: '標高'};
    visible('[data-mexico-nature-reference]', !!state.category);
    text('[data-mexico-nature-reference]', state.category ? `${categoryNames[state.category]}は未整備です。参考として${naturalLabel()}を表示しています。` : '');
    visible('[data-mexico-nature-feature-reading]', !!item || !!state.category);
    text('[data-mexico-nature-feature-title]', state.category ? `${categoryNames[state.category]}（未整備）` : item?.title ?? '');
    text('[data-mexico-nature-feature-lead]', state.category ? `現在の${naturalLabel()}と比較元の分布・選択を保持しています。` : item?.lead ?? '');
    text('[data-mexico-nature-feature-body]', state.category ? 'この入口の河川・地下水・降水量・流域または標高の資料は未整備です。参考図から水量・流域界・標高の数値を推定しません。' : item?.body ?? '');
    const select = query<HTMLSelectElement>('[data-mexico-nature-state-select]'); if (select) select.value = state.state;
    const only = query<HTMLInputElement>('[data-mexico-nature-only]'); if (only) only.checked = state.only;
    for (const layer of all<SVGGElement>('[data-mexico-nature-layer]')) {layer.removeAttribute('hidden'); layer.setAttribute('style', layer.dataset.mexicoNatureLayer === state.view ? '' : 'display:none');}
    visible('[data-mexico-nature-legend="climate"]', state.view === 'climate'); visible('[data-mexico-nature-legend="relief"]', state.view === 'relief');
    for (const layer of all<SVGGElement>('[data-mexico-nature-vector]')) layer.setAttribute('style', state.fallback ? 'display:none' : '');
    for (const layer of all<SVGGElement>('[data-mexico-nature-static]')) {layer.removeAttribute('hidden'); layer.setAttribute('style', state.fallback ? '' : 'display:none');}
    query<SVGImageElement>('[data-mexico-nature-static-image]')?.setAttribute('href', config.staticMaps[state.view]);
    query<SVGSVGElement>('[data-mexico-nature-main-map]')?.setAttribute('data-mexico-nature-map-mode', state.fallback ? 'static-fallback' : 'interactive');
    visible('[data-mexico-nature-static-note]', state.fallback);
    text('[data-mexico-nature-map-title]', state.view === 'climate' ? '気候の分布' : '自然地理地域の分布');
    text('[data-mexico-nature-map-edition]', state.view === 'climate' ? 'INEGI・2008版' : 'INEGI・2001版');
    text('[data-mexico-nature-period]', state.view === 'climate' ? '2008＝刊行年・統一観測期未記載。21原分類→6群。' : '15自然地理地域＋分類なし。標高の数値ではありません。');
    text('[data-mexico-nature-selected-name]', selected.name);
    for (const path of all<SVGPathElement>('[data-mexico-nature-state]')) {const isSelected = path.dataset.mexicoNatureState === state.state; path.classList.toggle('is-selected', isSelected); path.setAttribute('aria-pressed', String(isSelected));}
    for (const target of all<SVGGElement>('[data-mexico-nature-target]')) target.setAttribute('transform', `translate(${selected.point.join(' ')})`);
    for (const svg of all<SVGSVGElement>('[data-mexico-nature-main-map],[data-mexico-nature-comparison-map]')) svg.setAttribute('viewBox', state.frame?.join(' ') ?? config.defaultViewBox);
    for (const row of all('[data-mexico-nature-value-row]')) row.classList.toggle('is-selected', row.dataset.mexicoNatureValueRow === state.state);
    visible('[data-mexico-nature-overview]', state.compare === null && !item && !state.category); visible('[data-mexico-nature-comparison]', state.compare !== null); visible('[data-mexico-nature-only-control]', state.compare !== null);
    text('[data-mexico-nature-reading-title]', state.view === 'climate' ? '気候の違いが水管理を変える' : '山系・高原・沿岸の位置を読む');
    text('[data-mexico-nature-reading-lead]', state.view === 'climate' ? '北部・北西部に乾燥系、中央部に温帯系、南東部に高温・湿潤系が広がる。' : '西・東シエラマドレ、中央高原、火山帯、沿岸平原を全国で位置付ける。');
    text('[data-mexico-nature-reading-body]', state.view === 'climate' ? '乾燥する地域では、農地へ水を配る灌漑が作期を支える。山地と高原の気温条件、沿岸平原の位置を合わせると、農業や都市が成立する場所を読める。' : '地質と地形の成り立ちによる15の自然地理地域。中央部の都市集積と、沿岸・北部の交通や市場をつなぐ場所を人口分布と見比べる。');
    for (const link of all<HTMLAnchorElement>('[data-mexico-nature-compare-link]')) link.href = makeComparisonURL(link.dataset.mexicoNatureCompareLink as 'irrigation' | 'population');
    const sourceReturn = query<HTMLAnchorElement>('[data-mexico-nature-source-return]');
    if (sourceReturn) {
      sourceReturn.hidden = state.from === null;
      const originalName = values.get(state.sourceState)?.name ?? selected.name;
      const sourceLabel = state.from === 'agriculture' ? ({maize: '白粒トウモロコシ', cattle: '牛頭数', irrigation: '灌漑農地率', pine: '松材取得量'}[state.sourceMetric]) : state.sourceView === 'population' ? '人口規模' : '人口密度';
      sourceReturn.href = mexicoNatureReturnUrl(state.from === 'population' ? config.routes.population : config.routes.agriculture, state);
      sourceReturn.textContent = `${originalName}の${sourceLabel}分布に戻る`;
    }
    const plainReturn = query<HTMLAnchorElement>('[data-mexico-nature-plain-return]');
    if (plainReturn) {plainReturn.href = writeMexicoNatureState(new URL(config.routes.nature, window.location.origin), {...state, compare: null, only: false}).href; plainReturn.textContent = `${selected.name}の${naturalLabel()}に戻る`;}
    if (state.compare) renderComparison(selected);
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
    const naturalName = state.view === 'relief' ? '地形地域' : '気候分布';
    text('[data-mexico-nature-comparison-title]', `${naturalName}と${labels[mode]}`);
    text('[data-mexico-nature-comparison-lead]', mode === 'pine' ? '西シエラマドレなどの山地と、松材取得の集中を比べる。' : mode === 'maize' ? '北西部の白粒生産を、気候と灌漑の条件につなげる。' : mode === 'population' ? '中央部の高地・盆地と、人口が多い州の位置を比べる。' : reading.lead);
    text('[data-mexico-nature-comparison-value]', `${selected.name}：${labels[mode]} ${number(value, quantity ? 0 : 1)}${unit}`);
    text('[data-mexico-nature-comparison-definition]', mode === 'density' ? '人口密度は2020年の州平均。左の地形地域の位置と合わせて読む。' : mode === 'irrigation' ? '農業用地総面積に占める灌漑面積。播種・非播種・休耕を含む。' : mode === 'pine' ? '円の面積＝林業生産単位が取得した松材の体積。森林の面積とは別の量。' : mode === 'maize' ? '円の面積＝露地の一年生作物の白粒穀粒生産量。元の州別分布を保持。' : '円の面積＝2020年の州人口。元の人口規模分布を保持。');
    text('[data-mexico-nature-comparison-map-title]', `${labels[mode]}・${populationMode ? '2020年' : '2022年農業センサス'}`);
    text('#mexico-nature-comparison-map-title', `${naturalName}と同じ範囲の州別${labels[mode]}`);
    text('[data-mexico-nature-comparison-period]', `${state.view === 'relief' ? '自然地理地域2001版' : '気候区分2008版'} / ${populationMode ? '人口2020年' : '2021年10月～2022年9月'}、32州すべて公表値。`);
    text('[data-mexico-nature-only-label]', populationMode ? '比較先は選んだ州のデータだけ' : '比較先は選んだ州を強調');
    const winter = selected.code === '25' ? `シナロアの秋冬作の白粒生産${number(config.sinaloaWinter.productionT / 10000)}万tの${number(config.sinaloaWinter.irrigatedProductionSharePct)}%が灌漑による生産。` : '';
    text('[data-mexico-nature-comparison-body]', mode === 'pine' ? 'ドゥランゴ・チワワ側の西シエラマドレには松・オークの温帯林があり、松材取得が集中する。山地の位置と州別の取得量を合わせ、森林資源から加工・市場への供給を読む。' : mode === 'maize' ? `${selected.name}の灌漑農地率は${number(selected.irrigationSharePct)}%。${winter}気候分布と白粒の生産量を見比べ、用水から耕作、貯蔵・集荷・輸送を経て主食へ届く流れを読む。` : reading.body);
    text('[data-mexico-nature-comparison-consequence]', mode === 'pine' ? '木材の供給と、水の浸透・侵食の抑制・生息地を支える森林管理を結び付ける。取得量は森林の面積や伐採率を示す値ではない。' : reading.consequence);
    if (mode === 'cattle' || state.view !== (populationMode || mode === 'pine' ? 'relief' : 'climate')) {
      text('[data-mexico-nature-comparison-lead]', `${naturalName}と、州別の${labels[mode]}を同じ範囲で読み比べる。`);
      text('[data-mexico-nature-comparison-body]', `${naturalName}は地域の分類、${labels[mode]}は州単位の公表値です。選択した自然地域の境と州境を区別し、水管理・仕事・交通・市場と合わせて分布を読みます。自然条件だけで数量や人口は決まりません。`);
    }
    if (mode === 'density') text('[data-mexico-nature-comparison-definition]', `人口密度は2020年の州平均。${naturalName}の地域分類とは異なる粒度です。`);
    if (mode === 'cattle') {text('[data-mexico-nature-comparison-definition]', '円の面積＝2022年9月の牛頭数。生産単位と住宅の合計。肉や乳の生産量とは別の数値。'); text('[data-mexico-nature-comparison-period]', `${state.view === 'relief' ? '自然地理地域2001版' : '気候区分2008版'} / 牛頭数2022年9月`);}
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
    state = {...state, ...patch}; render(); const next = writeMexicoNatureState(new URL(window.location.href), state); next.searchParams.set('reading', 'item'); window.history.pushState(null, '', next);
    text('[data-mexico-nature-announcement]', `${values.get(state.state)!.name}の${naturalLabel()}${state.compare ? 'と専用比較' : ''}を表示しました。`);
  }
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-view]')) button.addEventListener('click', () => update(mexicoNatureSelectView(state, button.dataset.mexicoNatureView as 'climate' | 'relief')));
  for (const button of all<HTMLButtonElement>('[data-mexico-nature-category]')) button.addEventListener('click', () => update({category: button.dataset.mexicoNatureCategory as MexicoNatureCategory}));
  for (const path of all<SVGPathElement>('[data-mexico-nature-feature]')) {const choose = () => {if (state.fallback || path.closest('[data-mexico-nature-layer]')?.getAttribute('data-mexico-nature-layer') !== state.view) return; update({item: path.dataset.natureClass ?? '', feature: path.dataset.mexicoNatureFeature ?? '', category: ''});}; path.addEventListener('click', choose); path.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); choose();}});}
  query<HTMLSelectElement>('[data-mexico-nature-item-select]')?.addEventListener('change', event => update({item: (event.currentTarget as HTMLSelectElement).value, feature: '', category: ''}));
  query<HTMLButtonElement>('[data-mexico-nature-clear-item]')?.addEventListener('click', () => update({item: '', feature: '', category: ''}));
  query<HTMLButtonElement>('[data-mexico-overview-button]')?.addEventListener('click', () => setTimeout(() => {state = {...state, item: '', feature: '', category: ''}; render(); const next = writeMexicoNatureState(new URL(window.location.href), state); next.searchParams.set('reading', 'overview'); window.history.replaceState(window.history.state, '', next);}, 0));
  query<HTMLSelectElement>('[data-mexico-nature-state-select]')?.addEventListener('change', event => update({state: (event.currentTarget as HTMLSelectElement).value}));
  query<HTMLInputElement>('[data-mexico-nature-only]')?.addEventListener('change', event => update({only: (event.currentTarget as HTMLInputElement).checked}));
  for (const path of all<SVGElement>('[data-mexico-nature-state],[data-mexico-nature-compare-state],[data-mexico-nature-compare-symbol]')) {
    const choose = () => {const code = path.dataset.mexicoNatureState ?? path.dataset.mexicoNatureCompareState ?? path.dataset.mexicoNatureCompareSymbol!; if (code !== state.state) update({state: code});};
    path.addEventListener('click', choose); path.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); choose();}});
  }
  query<HTMLButtonElement>('[data-mexico-nature-focus]')?.addEventListener('click', () => update({frame: stateViewBox(state.state).split(' ').map(Number)}));
  query<HTMLButtonElement>('[data-mexico-nature-reset]')?.addEventListener('click', () => update({frame: null}));
  window.addEventListener('popstate', () => {state = readMexicoNatureState(new URL(window.location.href), codes); render();});
  root.dataset.mexicoNatureReady = 'true'; render(); window.history.replaceState(null, '', writeMexicoNatureState(new URL(window.location.href), state));
}
