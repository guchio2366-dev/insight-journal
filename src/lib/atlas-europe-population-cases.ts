import censusData from '../../public/assets/atlas/europe/population-cases-v1/cases.json' with { type: 'json' };
import { normalisePopulationCaseChoice, populationCaseShare, type PopulationCensusCasePackage, type PopulationCensusCase, type PopulationCaseTopic, type PopulationCaseChoiceKind, type PopulationCaseChoiceState } from '../data/atlas/europe/population-cases.ts';
import { project as europeProject } from './atlas-europe-view.ts';
import type { Geometry } from './atlas-europe-geometry.ts';

export const europeCultureData = censusData as PopulationCensusCasePackage;
export type CultureTopicKind = PopulationCaseChoiceKind;
export type CultureState = PopulationCaseChoiceState;
export type CultureBounds = [[number, number], [number, number]];
export type CultureGeometry = { type: 'FeatureCollection'; features: { type: 'Feature'; id?: string; properties: { code: string; name?: string; [key: string]: unknown }; geometry: Geometry }[] };
export type CultureMapData = { type: 'FeatureCollection'; features: { type: 'Feature'; id: string; properties: { code: string; name: string; value: number | null; fill: string; count: number | null; denominator: number | null; grain: 'LAD' | 'national'; year: number; categoryId: string; selected: boolean }; geometry: Geometry }[] };
export const cultureParams = ['cultureCase', 'cultureCategory', 'cultureArea'] as const;
export const cultureLegend = [
  { label: '0〜5%未満', color: '#deedf2' },
  { label: '5〜20%未満', color: '#a9cbd9' },
  { label: '20〜50%未満', color: '#6d9eb8' },
  { label: '50〜80%未満', color: '#3d718f' },
  { label: '80〜100%', color: '#184a65' },
  { label: '未掲載・数値なし', color: '#b8bec7' },
] as const;

export function cultureTopic(censusCase: PopulationCensusCase, kind: CultureTopicKind): PopulationCaseTopic {
  const topic = censusCase.topics.find(item => item.kind === kind);
  if (!topic) throw new Error('Selected census case has no requested topic');
  return topic;
}
export function normaliseCultureState(input: Partial<CultureState> | URLSearchParams, kind: CultureTopicKind, data = europeCultureData): CultureState {
  return normalisePopulationCaseChoice(input, kind, data);
}
export function readCultureSearch(search: string, kind: CultureTopicKind): CultureState {
  return normaliseCultureState(new URLSearchParams(search), kind);
}
/** Preserve the main atlas state; the caller owns history and the topic/layer URL. */
export function writeCultureState(url: URL, state: CultureState): URL {
  const next = new URL(url);
  for (const key of cultureParams) { next.searchParams.delete(key); if (state[key]) next.searchParams.set(key, state[key]); }
  return next;
}
export function cultureSelection(state: CultureState, kind: CultureTopicKind, data = europeCultureData) {
  const canonical = normaliseCultureState(state, kind, data);
  // The fallback supplies definitions only; it never selects a case, category or area.
  const censusCase = data.cases.find(item => item.id === canonical.cultureCase) ?? data.cases[0];
  const topic = cultureTopic(censusCase, kind);
  const categoryIndex = topic.categories.findIndex(item => item.id === canonical.cultureCategory);
  const category = topic.categories[categoryIndex] ?? null;
  const area = topic.areas.find(item => item.code === canonical.cultureArea) ?? null;
  return { state: canonical, censusCase, topic, category, area, count: area && category ? area.counts[categoryIndex] : null, share: area && category ? populationCaseShare(area, topic, category.id) : null };
}
export function cultureColor(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0 || value > 100) return cultureLegend[5].color;
  return cultureLegend[value < 5 ? 0 : value < 20 ? 1 : value < 50 ? 2 : value < 80 ? 3 : 4].color;
}
export function formatCultureShare(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '数値なし';
  if (value > 0 && value < .01) return '0.01%未満';
  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }).format(value)}%`;
}
export const formatCultureCount = (value: number | null) => value === null ? '数値なし' : `${new Intl.NumberFormat('ja-JP').format(value)}人`;
const rings = (geometry: Geometry): number[][][] => geometry.type === 'Polygon' ? geometry.coordinates as number[][][] : (geometry.coordinates as number[][][][]).flat();
export function cultureGeometryPath(geometry: Geometry, project = europeProject): string {
  return rings(geometry).map(ring => ring.map((point, index) => `${index ? 'L' : 'M'}${project(point).map(value => value.toFixed(2)).join(',')}`).join('') + 'Z').join('');
}
export function cultureBounds(geometry: CultureGeometry): CultureBounds {
  const points = geometry.features.flatMap(feature => rings(feature.geometry).flat());
  if (!points.length) throw new Error('Census case has no boundary points');
  return [[Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[1]))], [Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[1]))]];
}
export function cultureMapData(geometry: CultureGeometry, state: CultureState, kind: CultureTopicKind, data = europeCultureData): CultureMapData {
  const selection = cultureSelection(state, kind, data);
  if (!selection.state.cultureCase) return { type: 'FeatureCollection', features: [] };
  const areas = new Map(selection.topic.areas.map(area => [area.code, area]));
  const index = selection.topic.categories.findIndex(category => category.id === selection.category?.id);
  return {
    type: 'FeatureCollection',
    features: geometry.features.map(feature => {
      const area = areas.get(feature.properties.code);
      const value = area && selection.category ? populationCaseShare(area, selection.topic, selection.category.id) : null;
      return { type: 'Feature', id: feature.properties.code, geometry: feature.geometry, properties: {
        code: feature.properties.code, name: area?.name ?? feature.properties.name ?? feature.properties.code,
        value, fill: cultureColor(value), count: index >= 0 ? area?.counts[index] ?? null : null, denominator: area?.denominator ?? null,
        grain: selection.censusCase.grain, year: selection.topic.year, categoryId: selection.category?.id ?? '', selected: feature.properties.code === selection.area?.code,
      } };
    }),
  };
}
/** Shared by the main culture layer and the retained source-map comparison. */
export const caseMapData = (data: PopulationCensusCasePackage, geometry: CultureGeometry, kind: CultureTopicKind, state: CultureState) => cultureMapData(geometry, state, kind, data);
export function cultureCaseNote(censusCase: PopulationCensusCase, kind: CultureTopicKind): string {
  const meaning = kind === 'religion' ? '宗教は自己申告の帰属です。信仰・実践の有無とは別で、無宗教と未回答を同じ分類にしません。' : '民族的帰属は自己申告です。出身地や言語から推定せず、各国の元分類を使います。';
  return `${meaning} ${censusCase.grain === 'national' ? 'クロアチアは全国値です。県別分布は示さず、行政区と同じ単位で比較しません。掲載は2つの事例で、欧州全域の分布ではありません。' : 'イングランド・ウェールズの行政区の事例です。英国全土や欧州全域の分布ではありません。'}`;
}
export const cultureAssetURL = (asset: string, base = '/') => `${base.replace(/\/$/, '')}/${asset.replace(/^\//, '')}`;

type FetchGeometry = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
const sharedGeometry = new Map<string, Promise<CultureGeometry>>();
/** Selected case only. The same official geometry promise serves primary/return maps. */
export function fetchCaseGeometry(caseId: string, options: { base?: string; fetch?: FetchGeometry; data?: PopulationCensusCasePackage } = {}): Promise<CultureGeometry> {
  const censusCase = (options.data ?? europeCultureData).cases.find(item => item.id === caseId);
  if (!censusCase) return Promise.reject(new Error('Unknown census case'));
  const url = cultureAssetURL(censusCase.geometryURL, options.base);
  if (!sharedGeometry.has(url)) {
    const request = (async () => {
      const fetcher = options.fetch ?? (input => globalThis.fetch(input));
      const response = await fetcher(url);
      if (!response.ok) throw new Error('Census case geometry request failed');
      const geometry = await response.json() as CultureGeometry;
      const codes = geometry?.features?.map(feature => feature.properties?.code).sort();
      const expected = censusCase.topics[0].areas.map(area => area.code).sort();
      if (geometry?.type !== 'FeatureCollection' || JSON.stringify(codes) !== JSON.stringify(expected) || !geometry.features.every(feature => ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type))) throw new Error('Census case boundary/code contract failed');
      return geometry;
    })();
    sharedGeometry.set(url, request);
    request.catch(() => sharedGeometry.delete(url));
  }
  return sharedGeometry.get(url)!;
}
type MapAttachment = { mapLayer?: SVGGElement; project?: (point: number[]) => [number, number]; onFitBounds?: (bounds: CultureBounds) => void; onMapData?: (data: CultureMapData) => void };
export type CultureOptions = MapAttachment & {
  legend?: HTMLElement;
  base?: string;
  topic?: CultureTopicKind;
  initialState?: Partial<CultureState>;
  active?: boolean;
  onChange?: (state: CultureState) => void;
  fetch?: FetchGeometry;
};

/** Insert into the existing atlas reader/map. This controller never touches history. */
export function createEuropePopulationCases(root: HTMLElement, options: CultureOptions = {}) {
  const document = root.ownerDocument;
  const legendRoot = options.legend ?? root;
  const query = <T extends Element>(selector: string) => root.querySelector<T>(selector);
  const caseSelect = query<HTMLSelectElement>('[data-culture-case]');
  const categorySelect = query<HTMLSelectElement>('[data-culture-category]');
  const areaSelect = query<HTMLSelectElement>('[data-culture-area]');
  if (!caseSelect || !categorySelect || !areaSelect) throw new Error('Census reader controls unavailable');
  let kind = options.topic ?? (root.dataset.cultureTopic === 'religion' ? 'religion' : 'ethnicity');
  let state = normaliseCultureState(options.initialState ?? {
    cultureCase: root.dataset.cultureInitialCase ?? caseSelect.value,
    cultureCategory: root.dataset.cultureInitialCategory ?? categorySelect.value,
    cultureArea: root.dataset.cultureInitialArea ?? areaSelect.value,
  }, kind);
  let active = options.active ?? true;
  let attachment: MapAttachment = options;
  let destroyed = false, generation = 0, fitNext = false;
  let currentReady: Promise<void> = Promise.resolve();
  const loaded = new Map<string, CultureGeometry>();
  const attachedLayers = new WeakSet<SVGGElement>();
  const listeners: (() => void)[] = [];
  const emptyMap: CultureMapData = { type: 'FeatureCollection', features: [] };
  const setText = (selector: string, value: string) => { const node = query<HTMLElement>(selector); if (node) node.textContent = value; };
  const setLink = (selector: string, value: string) => { const node = query<HTMLAnchorElement>(selector); if (node) node.href = value; };
  const listen = (node: Element, event: string, handler: EventListener) => { node.addEventListener(event, handler); listeners.push(() => node.removeEventListener(event, handler)); };
  function option(value: string, label: string) { const node = document.createElement('option'); node.value = value; node.textContent = label; return node; }
  function renderReader() {
    const selected = cultureSelection(state, kind);
    root.dataset.cultureTopic = kind;
    const hasCase = !!state.cultureCase, hasCategory = !!selected.category;
    caseSelect!.replaceChildren(option('', '欧州全体・事例未選択'), ...europeCultureData.cases.map(item => option(item.id, item.grain === 'national' ? 'クロアチア・全国値' : 'イングランド・ウェールズ・行政区')));
    caseSelect!.value = state.cultureCase;
    categorySelect!.replaceChildren(option('', '回答分類を選ぶ'));
    for (const level of ['aggregate', 'detail'] as const) {
      const categories = selected.topic.categories.filter(category => category.level === level);
      if (!hasCase || !categories.length) continue;
      const group = document.createElement('optgroup');
      group.label = level === 'aggregate' ? '元表の大分類' : selected.topic.kind === 'ethnicity' && selected.censusCase.grain === 'LAD' ? '元表の細分類' : '元表の回答分類';
      group.append(...categories.map(category => option(category.id, category.label)));
      categorySelect!.append(group);
    }
    categorySelect!.value = state.cultureCategory;
    areaSelect!.replaceChildren(option('', '地域未選択・全体概要'), ...(hasCase ? selected.topic.areas.slice().sort((left, right) => left.name.localeCompare(right.name, 'en')).map(area => option(area.code, area.name)) : []));
    areaSelect!.value = state.cultureArea;
    caseSelect!.disabled = false; categorySelect!.disabled = !hasCase; areaSelect!.disabled = !hasCase;
    setText('[data-culture-title]', hasCase ? selected.topic.titleJa : kind === 'religion' ? '宗教的帰属の地域事例' : '民族的帰属の地域事例');
    setText('[data-culture-takeaway]', 'イングランド・ウェールズの行政区とクロアチアの全国値の事例です。欧州全域の分布ではありません。自己申告の元分類と表ごとの分母を使い、無宗教・未回答・不明を区別します。');
    setText('[data-culture-overview]', !hasCase ? 'イングランド・ウェールズ・クロアチアの2021年公表総計から、回答構成を同時に示します。民族は自己認識、宗教は申告した帰属です。言語分布・信仰の実践・欧州全域の細分布を示すものではありません。円の名前から事例を開くと、元の回答分類の分布を選べます。' : !hasCategory ? '元の回答分類を選ぶと、その事例の各地域の割合を表示します。' : '選択した分類の分布全体を表示しています。地域を選ぶと、同じ表の総人口に対する割合と人数を確認できます。');
    setText('[data-culture-note]', hasCase ? cultureCaseNote(selected.censusCase, kind) : '民族・宗教は各国の自己申告分類を使います。イングランド・ウェールズの行政区とクロアチアの全国値は粒度が異なり、欧州全域の分布ではありません。');
    setText('[data-culture-grain]', !hasCase ? '3対象の公表総計 · 詳細は2事例' : selected.censusCase.grain === 'national' ? '全国値 · 1地域' : '行政区（LAD2021）· 331地域');
    setText('[data-culture-year]', hasCase ? `${selected.topic.year}年国勢調査 · ${selected.topic.censusDate}` : '2021年国勢調査');
    query<HTMLElement>('[data-culture-value]')!.hidden = !selected.area || !hasCategory;
    setText('[data-culture-area-name]', selected.area?.name ?? '地域未選択');
    setText('[data-culture-category-name]', selected.category?.label ?? '回答分類未選択');
    setText('[data-culture-share]', formatCultureShare(selected.share));
    setText('[data-culture-count]', formatCultureCount(selected.count));
    setText('[data-culture-denominator]', selected.area ? `分母：この表の総人口 ${formatCultureCount(selected.area.denominator)}` : '分母は選択した地域の同じ公表表の総人口です。');
    setText('[data-culture-classification-note]', selected.category?.level === 'aggregate' ? '元表の大分類です。細分類と足し合わせません。' : selected.censusCase.grain === 'national' ? 'クロアチアの元分類です。他国の分類と同一化しません。' : '元表の回答分類です。大分類に含まれる人数を重ねて合計しません。');
    for (const key of legendRoot.querySelectorAll<HTMLElement>('[data-culture-scale-key]')) key.hidden = !hasCategory;
    const unselectedKey = legendRoot.querySelector<HTMLElement>('[data-culture-unselected-key]'); if (unselectedKey) {
      unselectedKey.hidden = hasCategory;
      const text=hasCase?'回答分類未選択・未掲載（0%ではありません）':'未掲載・3対象以外（0%ではありません）';
      unselectedKey.replaceChildren(unselectedKey.querySelector('i')!,document.createTextNode(text));
    }
    query<HTMLButtonElement>('[data-culture-fit]')!.disabled = !hasCase;
    setText('[data-culture-disclosure]', selected.censusCase.grain === 'LAD' ? '秘匿処理により、民族表と宗教表の総人口がわずかに異なる場合があります。各表の公表値をそのまま使います。' : '全国の公表行を使います。無宗教・不可知論・未申告・不明を区別し、宗教団体への所属で回答を組み替えません。');
    setText('[data-culture-attribution]', selected.censusCase.attribution.join('\n'));
    setText('[data-culture-licence-name]', selected.censusCase.licence.name);
    setLink('[data-culture-source]', selected.topic.documentationURL);
    setLink('[data-culture-original]', selected.topic.sourceURL);
    setLink('[data-culture-licence]', selected.censusCase.licence.url);
    setText('[data-culture-outline-note]', selected.censusCase.grain === 'national' ? '国の輪郭は位置を示すための概略です。2021年の県境ではありません。' : 'ONSの2021年行政区境界です。海岸線を500mで概略化しています。');
  }
  async function geometryFor(censusCase: PopulationCensusCase): Promise<CultureGeometry> {
    if (loaded.has(censusCase.id)) return loaded.get(censusCase.id)!;
    const geometry = await fetchCaseGeometry(censusCase.id, { base: options.base, fetch: options.fetch });
    loaded.set(censusCase.id, geometry);
    return geometry;
  }
  function publishMap(geometry: CultureGeometry) {
    const data = cultureMapData(geometry, state, kind);
    attachment.onMapData?.(data);
    const layer = attachment.mapLayer;
    if (layer) {
      layer.setAttribute('data-eu-culture-layer', '');
      layer.setAttribute('role', 'group');
      layer.setAttribute('aria-label', `${cultureSelection(state, kind).topic.titleJa}：選択した地域事例`);
      layer.replaceChildren(...data.features.map((feature, index) => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        node.setAttribute('d', cultureGeometryPath(feature.geometry, attachment.project ?? europeProject));
        node.setAttribute('fill', feature.properties.fill);
        node.setAttribute('fill-rule', 'evenodd');
        node.setAttribute('stroke', feature.properties.selected ? '#841e37' : '#f7f5eb');
        node.setAttribute('stroke-width', feature.properties.selected ? '2.5' : '.6');
        node.setAttribute('vector-effect', 'non-scaling-stroke');
        node.setAttribute('class', 'eu-culture-area');
        node.setAttribute('data-culture-code', feature.properties.code);
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', feature.properties.selected || !state.cultureArea && index === 0 ? '0' : '-1');
        node.setAttribute('aria-pressed', String(feature.properties.selected));
        node.setAttribute('aria-label', `${feature.properties.name}：${formatCultureShare(feature.properties.value)}、${feature.properties.count === null ? '人数なし' : formatCultureCount(feature.properties.count)}`);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = node.getAttribute('aria-label'); node.append(title);
        return node;
      }));
    }
    setText('[data-culture-map-status]', state.cultureCategory ? '選択した分類の割合を地図に表示しています。未掲載地域は0%ではありません。' : '回答分類は未選択です。灰色を0%や特定の集団と読まないでください。');
    if (fitNext) { fitNext = false; attachment.onFitBounds?.(cultureBounds(geometry)); }
  }
  function updateMap() {
    const request = ++generation;
    if (!active || destroyed || (!attachment.mapLayer && !attachment.onMapData && !attachment.onFitBounds)) return;
    if (!state.cultureCase) { fitNext = false; attachment.mapLayer?.replaceChildren(); attachment.onMapData?.(emptyMap); setText('[data-culture-map-status]', '事例・回答分類は未選択です。未掲載地域は数値なしで、0%ではありません。'); currentReady = Promise.resolve(); return; }
    const censusCase = cultureSelection(state, kind).censusCase;
    const existing = loaded.get(censusCase.id);
    if (existing) { publishMap(existing); currentReady = Promise.resolve(); return; }
    attachment.mapLayer?.replaceChildren(); attachment.onMapData?.(emptyMap);
    setText('[data-culture-map-status]', '地図を読み込んでいます。数値は公表表から表示しています。');
    currentReady = geometryFor(censusCase).then(geometry => { if (!destroyed && active && request === generation) publishMap(geometry); }).catch(() => {
      if (!destroyed && active && request === generation) setText('[data-culture-map-status]', '地図を表示できません。地域一覧の数値は利用できます。「事例の範囲を表示」で再試行できます。');
    });
  }
  function apply(next: CultureState, emit: boolean) {
    fitNext = false;
    state = next; renderReader(); updateMap();
    if (emit) options.onChange?.({ ...state });
  }
  function selectArea(code: string) {
    if (!code) { apply({ ...state, cultureArea: '' }, true); return true; }
    if (!state.cultureCase) return false;
    if (!cultureSelection(state, kind).topic.areas.some(area => area.code === code)) return false;
    if (state.cultureArea === code) return true;
    apply({ ...state, cultureArea: code }, true); return true;
  }
  listen(caseSelect, 'change', () => apply(normaliseCultureState({ cultureCase: caseSelect.value }, kind), true));
  listen(categorySelect, 'change', () => apply(normaliseCultureState({ ...state, cultureCategory: categorySelect.value }, kind), true));
  listen(areaSelect, 'change', () => selectArea(areaSelect.value));
  const fitButton = query<HTMLButtonElement>('[data-culture-fit]');
  if (fitButton) listen(fitButton, 'click', () => { fitNext = true; updateMap(); });
  function attachMap(map: MapAttachment) {
    attachment = { ...attachment, ...map };
    if (map.mapLayer && !attachedLayers.has(map.mapLayer)) {
      const layer = map.mapLayer;
      attachedLayers.add(layer);
      const codeFor = (event: Event) => (event.target as Element).closest<SVGPathElement>('[data-culture-code]')?.dataset.cultureCode;
      listen(layer, 'click', event => { const code = codeFor(event); if (code) selectArea(code); });
      listen(layer, 'keydown', event => {
        const key = (event as KeyboardEvent).key, code = codeFor(event);
        if (!code) return;
        if (key === 'Enter' || key === ' ') { event.preventDefault(); selectArea(code); }
        else if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(key)) {
          event.preventDefault();
          const areas = cultureSelection(state, kind).topic.areas;
          const index = areas.findIndex(area => area.code === code);
          const next = areas[(index + (['ArrowLeft', 'ArrowUp'].includes(key) ? -1 : 1) + areas.length) % areas.length];
          selectArea(next.code);
          layer.querySelector<SVGPathElement>(`[data-culture-code="${next.code}"]`)?.focus();
        }
      });
    }
    updateMap();
  }
  renderReader();
  attachMap(attachment);
  return {
    setTopic(topic: CultureTopicKind) { kind = topic; apply(normaliseCultureState(state, kind), false); },
    readState: () => ({ ...state }),
    readSearch: (search: string) => readCultureSearch(search, kind),
    applyState(input: Partial<CultureState> | string, settings: { emit?: boolean } = {}) { apply(typeof input === 'string' ? readCultureSearch(input, kind) : normaliseCultureState({ ...state, ...input }, kind), settings.emit ?? false); },
    selectArea,
    attachMap,
    fitCase() { fitNext = true; updateMap(); return currentReady; },
    setActive(value: boolean) { active = value; if (active) updateMap(); else { generation++; attachment.mapLayer?.replaceChildren(); attachment.onMapData?.(emptyMap); } },
    ready: () => currentReady,
    destroy() { destroyed = true; generation++; listeners.forEach(remove => remove()); attachment.mapLayer?.replaceChildren(); attachment.onMapData?.(emptyMap); },
  };
}
