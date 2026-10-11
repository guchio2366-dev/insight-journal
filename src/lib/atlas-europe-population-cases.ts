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
/** The initial regional reading uses only ONS 2021 LAD rows. The four
 * non-White TS021 aggregates are disjoint; they are summed from their
 * published counts, never inferred as 100% minus White. This is a measure
 * of these responses in England and Wales, not a European ethnic typology. */
export function cultureOverviewMapData(geometry: CultureGeometry, kind: CultureTopicKind, data = europeCultureData): CultureMapData {
  const censusCase = data.cases.find(item => item.id === 'england-wales-2021');
  const topic = censusCase?.topics.find(item => item.kind === kind);
  if (!censusCase || !topic) return { type: 'FeatureCollection', features: [] };
  const categoryIds = kind === 'ethnicity'
    ? ['ts021-01', 'ts021-07', 'ts021-11', 'ts021-22']
    : ['ts030-01'];
  const indexes = categoryIds.map(id => topic.categories.findIndex(category => category.id === id));
  const areas = new Map(topic.areas.map(area => [area.code, area]));
  return { type: 'FeatureCollection', features: geometry.features.map(feature => {
    const area = areas.get(feature.properties.code);
    const counts = area && indexes.every(index => index >= 0) ? indexes.map(index => area.counts[index]) : [];
    const valid = !!area && area.denominator > 0 && counts.length === indexes.length && counts.every(count => Number.isSafeInteger(count) && count >= 0);
    const count = valid ? counts.reduce((sum, value) => sum + value, 0) : null;
    const value = count !== null ? count / area!.denominator * 100 : null;
    return { type: 'Feature', id: feature.properties.code, geometry: feature.geometry, properties: {
      code: feature.properties.code, name: area?.name ?? feature.properties.name ?? feature.properties.code,
      value, fill: cultureColor(value), count, denominator: area?.denominator ?? null,
      grain: 'LAD' as const, year: topic.year,
      categoryId: kind === 'ethnicity' ? 'ons-ts021-four-aggregates' : 'ts030-01', selected: false,
    } };
  }) };
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
    setText('[data-culture-kicker]',kind==='religion'&&!hasCase?'国別推計とイングランド・ウェールズの地域分布':'国勢調査の地域分布');
    setText('[data-culture-title]', hasCase ? selected.topic.titleJa : kind === 'religion' ? '欧州の宗教の分布' : '民族的帰属の地域事例');
    setText('[data-culture-takeaway]', !hasCase ? kind==='religion'
      ? '概説：国別の2020年推計ではキリスト教・イスラム教・宗教的無所属などの構成が国ごとに異なります。イングランド・ウェールズの色面だけは別資料の2021年国勢調査で「無宗教」と答えた割合です。'
      : '概説：イングランド・ウェールズの色面は、2021年国勢調査で「白人」以外の4つの大分類を選んだ人の割合です。行政区ごとの広がりを示し、欧州の他地域は未収録です。'
      : `${selected.censusCase.coverageJa}の${selected.topic.year}年国勢調査です。元の自己申告分類と地域ごとの分母を使い、未回答を0%にしません。`);
    setText('[data-culture-overview]', !hasCase ? kind==='religion'
      ? '解説：国別の宗教構成には歴史的な教会圏、宗教改革、南東欧の歴史、近年の社会変化と移住が関わります。ただしPewの7分類は宗派を区別せず、国勢調査の無宗教・未回答とも定義が異なります。'
      : '解説：都市部とその周辺の多様性には国内外からの移動と雇用・交通の集積が関わります。色面は居住者が申告した分類の割合であり、各人の位置や欧州全体の民族分布ではありません。クロアチア全国値は別の分類・粒度で示します。'
      : !hasCategory ? '元の回答分類を選ぶと、その事例の各地域の割合を表示します。' : '選択した分類の分布全体を表示しています。地域を選ぶと、同じ表の総人口に対する割合と人数を確認できます。');
    setText('[data-culture-note]', hasCase ? cultureCaseNote(selected.censusCase, kind) : '色面はONS 2021年国勢調査のイングランド・ウェールズ331行政区のみ。クロアチアは全国値の別資料。残る欧州域は未収録で、0%や無居住ではありません。');
    setText('[data-culture-grain]', !hasCase ? 'ONS 2021年 · 行政区（LAD）331地域' : selected.censusCase.grain === 'national' ? '全国値 · 1地域' : '行政区（LAD2021）· 331地域');
    setText('[data-culture-year]', hasCase ? `${selected.topic.year}年国勢調査 · ${selected.topic.censusDate}` : kind==='religion'?'ONS 2021年地域面／Pew 2020年国別推計':'ONS 2021年国勢調査');
    query<HTMLElement>('[data-culture-value]')!.hidden = !selected.area || !hasCategory;
    setText('[data-culture-area-name]', selected.area?.name ?? '地域未選択');
    setText('[data-culture-category-name]', selected.category?.label ?? '回答分類未選択');
    setText('[data-culture-share]', formatCultureShare(selected.share));
    setText('[data-culture-count]', formatCultureCount(selected.count));
    setText('[data-culture-denominator]', selected.area ? `分母：この表の総人口 ${formatCultureCount(selected.area.denominator)}` : '分母は選択した地域の同じ公表表の総人口です。');
    setText('[data-culture-classification-note]', selected.category?.level === 'aggregate' ? '元表の大分類です。細分類と足し合わせません。' : selected.censusCase.grain === 'national' ? 'クロアチアの元分類です。他国の分類と同一化しません。' : '元表の回答分類です。大分類に含まれる人数を重ねて合計しません。');
    const scaleTitle = legendRoot.querySelector<HTMLElement>('[data-culture-scale-title]');
    if (scaleTitle) scaleTitle.textContent = !hasCase ? kind === 'ethnicity' ? 'ONS 2021：白人以外の4大分類の合計／行政区総人口' : 'ONS 2021：無宗教の回答／行政区総人口' : selected.category ? `${selected.category.label}／同じ表の地域総人口` : '分類未選択';
    for (const key of legendRoot.querySelectorAll<HTMLElement>('[data-culture-scale-key]')) key.hidden = hasCase && !hasCategory;
    const unselectedKey = legendRoot.querySelector<HTMLElement>('[data-culture-unselected-key]'); if (unselectedKey) {
      unselectedKey.hidden = !hasCase || hasCategory;
      const text=hasCase?'回答分類未選択・未掲載（0%ではありません）':kind==='religion'?'未掲載・資料未取得（0%ではありません）':'未掲載・3対象以外（0%ではありません）';
      unselectedKey.replaceChildren(unselectedKey.querySelector('i')!,document.createTextNode(text));
    }
    query<HTMLButtonElement>('[data-culture-fit]')!.disabled = false;
    setText('[data-culture-fit]', hasCase ? '事例の範囲を表示' : '色面の対象地域を拡大');
    setText('[data-culture-disclosure]', selected.censusCase.grain === 'LAD' ? '秘匿処理により、民族表と宗教表の総人口がわずかに異なる場合があります。4大分類は元表人数を合計し、100%から白人割合を差し引いていません。' : '全国の公表行を使います。無宗教・不可知論・未申告・不明を区別し、宗教団体への所属で回答を組み替えません。');
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
    const overview = !state.cultureCase;
    const data = overview ? cultureOverviewMapData(geometry, kind) : cultureMapData(geometry, state, kind);
    attachment.onMapData?.(data);
    const layer = attachment.mapLayer;
    if (layer) {
      layer.setAttribute('data-eu-culture-layer', '');
      layer.setAttribute('role', 'group');
      layer.setAttribute('aria-label', overview ? `${kind === 'ethnicity' ? '民族的帰属' : '宗教的帰属'}：ONS 2021年イングランド・ウェールズ行政区` : `${cultureSelection(state, kind).topic.titleJa}：選択した地域事例`);
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
        node.setAttribute('aria-label', `${feature.properties.name}：${overview ? kind === 'ethnicity' ? '白人以外の4大分類の合計' : '無宗教' : cultureSelection(state, kind).category?.label ?? '回答分類未選択'} ${formatCultureShare(feature.properties.value)}、${feature.properties.count === null ? '人数なし' : formatCultureCount(feature.properties.count)}、分母 ${formatCultureCount(feature.properties.denominator)}${overview ? '。選ぶとこの地域の回答分類別詳細へ' : ''}`);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = node.getAttribute('aria-label'); node.append(title);
        return node;
      }));
    }
    setText('[data-culture-map-status]', overview ? 'ONS 2021年の331行政区のみ色面表示。残る欧州は未収録で、0%ではありません。' : state.cultureCategory ? '選択した分類の割合を地図に表示しています。未掲載地域は0%ではありません。' : '回答分類は未選択です。灰色を0%や特定の集団と読まないでください。');
    if (fitNext) { fitNext = false; attachment.onFitBounds?.(cultureBounds(geometry)); }
  }
  function updateMap() {
    const request = ++generation;
    if (!active || destroyed || (!attachment.mapLayer && !attachment.onMapData && !attachment.onFitBounds)) return;
    const censusCase = !state.cultureCase ? europeCultureData.cases.find(item => item.id === 'england-wales-2021')! : cultureSelection(state, kind).censusCase;
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
    if (!state.cultureCase) {
      const topic = europeCultureData.cases.find(item => item.id === 'england-wales-2021')?.topics.find(item => item.kind === kind);
      if (!topic?.areas.some(area => area.code === code)) return false;
      apply(normaliseCultureState({ cultureCase: 'england-wales-2021', cultureCategory: kind === 'ethnicity' ? 'ts021-16' : 'ts030-01', cultureArea: code }, kind), true);
      return true;
    }
    if (!cultureSelection(state, kind).topic.areas.some(area => area.code === code)) return false;
    if (state.cultureArea === code) return true;
    apply({ ...state, cultureArea: code }, true); return true;
  }
  listen(caseSelect, 'change', () => {
    const category = caseSelect.value === 'england-wales-2021'
      ? kind === 'ethnicity' ? 'ts021-16' : 'ts030-01'
      : caseSelect.value === 'croatia-national-2021'
        ? kind === 'ethnicity' ? 'hr-ethnicity-H' : 'hr-religion-H'
        : '';
    apply(normaliseCultureState({ cultureCase: caseSelect.value, cultureCategory: category }, kind), true);
  });
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
    setTopic(topic: CultureTopicKind) {
      kind = topic;
      const next = normaliseCultureState(state, kind);
      if (next.cultureCase && !next.cultureCategory) {
        next.cultureCategory = next.cultureCase === 'england-wales-2021'
          ? kind === 'ethnicity' ? 'ts021-16' : 'ts030-01'
          : kind === 'ethnicity' ? 'hr-ethnicity-H' : 'hr-religion-H';
      }
      apply(next, false);
    },
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
