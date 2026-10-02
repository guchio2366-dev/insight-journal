import type {CanadaWaterState, WaterDatasetTopic} from '../lib/atlas-canada-water-state';

type OriginKind = 'forestry' | 'industry' | 'population' | 'crop';
interface Origin {
 kind: OriginKind;
 back: HTMLAnchorElement;
 layer: SVGElement | null;
 legends: Element[];
 brief: string;
 summary: string;
 question: string;
}

const targets: Record<WaterDatasetTopic, string> = {
 precipitation: '年降水量の地域差',
 drainage: '統計排水地域と海への流出先',
 groundwater: '全国の水文地質区分',
 aquifers: 'BC州南西部の調査済み帯水層',
};
const scopes: Record<WaterDatasetTopic, string> = {
 precipitation: '降水図はCanGridPの約10 km格子・1991〜2020年の年平均。都市の雨温図は同期間の一点の平年値で、利用可能水量・土壌水分は示しません。',
 drainage: '色はカナダ国内の統計排水地域（海岸部・島を含む）です。流量・利用可能水量・灌漑量は示しません。',
 groundwater: '全国の水文地質地域は岩盤・堆積層・永久凍土の概略区分です。個々の帯水層の境界や地下水量は示しません。',
 aquifers: 'BC州南西部の調査済み帯水層の地域例です。全国の水文地質区分とは対象・縮尺が異なり、空白は地下水がない場所を意味しません。色は水量・取水量を示しません。',
};

function firstSentence(element: Element | null): string {
 return (element?.textContent ?? '').trim().split('。')[0];
}

/** Use only comparisons accepted and rendered by the existing source controllers. */
function origins(root: HTMLElement, topic: WaterDatasetTopic): Origin[] {
 const result: Origin[] = [];
 const target = targets[topic];
 const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
 for (const kind of ['forestry', 'industry', 'population', 'crop'] as const) {
  const back = $<HTMLAnchorElement>(`[data-canada-${kind}-return]`);
  if (!back || back.hidden || !back.getAttribute('href')) continue;
  const saved = new URL(back.href, root.ownerDocument.defaultView!.location.href).searchParams;
  const savedYear = saved.get('year'), year = savedYear ? savedYear + '年' : '';
  if (kind === 'forestry') {
   result.push({kind, back, layer: $('[data-canada-forest-context-map]'), legends: [...root.querySelectorAll('[data-canada-forest-context-legend]')], brief: `元の比較：2020年の針葉樹林（NRCan）。Fraser川・BC沿岸と、${target}を比べます。`, summary: '元の比較：2020年の針葉樹林とFraser川・BC沿岸', question: `針葉樹林とFraser川・BC沿岸を、${target}と照合します。森林から港への木材の搬出・輸送には、どんな水と土地の条件が関わるでしょうか。`});
  } else if (kind === 'industry') {
   const metric = saved.get('metric');
   const subject = metric === 'manufacturing' ? '五大湖・St. Lawrence沿いのON・QCと製造業割合' : metric === 'services' ? 'BC沿岸・Vancouverとサービス業割合' : 'Albertaの内陸・西部山地と採取業割合';
   result.push({kind, back, layer: $('[data-canada-industry-context-map]'), legends: [...root.querySelectorAll('[data-canada-industry-context-legend], [data-canada-industry-context] details')], brief: `元の比較：${year ? year + 'の' : ''}州内GDP割合（%）。${subject}を、${target}と比べます。`, summary: firstSentence($('[data-canada-industry-context-text]')), question: `${subject}を、${target}と照合します。生産・交通・市場を結ぶ条件をどう読みますか。色は州内GDP割合で、工場・鉱床の位置ではありません。`});
  } else if (kind === 'population') {
   const metric = saved.get('metric') === 'density' ? '人口密度（人/km²）' : '人口（人）';
   result.push({kind, back, layer: $('[data-canada-population-context-map]'), legends: [...root.querySelectorAll('[data-canada-population-context-legend], [data-canada-population-context] details')], brief: `元の比較：${year}${metric}・2021年CMA境界。都市圏の集積と、${target}を比べます。`, summary: firstSentence($('[data-canada-population-context-text]')), question: `都市圏の集積と南部の位置を、${target}と照合します。水と交通・居住の条件はどう関わるでしょうか。境界は2021年のCMAで、都市圏全体の気候平均は示しません。`});
  } else {
   const livestock = new URL(root.ownerDocument.defaultView!.location.href).searchParams.get('crop') === 'beef';
   const product = $('[data-canada-crop-gis] [data-canada-census-product-title]')?.textContent?.trim() || '農畜産';
   result.push({kind, back, layer: $('[data-canada-crop-gis] [data-canada-census-fallback]'), legends: [...root.querySelectorAll('[data-canada-crop-map-key], [data-canada-crop-gis] [data-canada-census-legend], [data-canada-crop-gis] .canada-census-sources')], brief: `元の比較：${year ? year + 'の' : ''}州比較／2021年の${product}（CCS申告値）。申告値の分布と、${target}を比べます。`, summary: firstSentence($('[data-canada-crop-origin]')), question: `2021年の${product}の地域別申告値を、${target}と照合します。${livestock ? '草の生育・家畜の飲水・冬の飼料を、放牧と貯蔵の管理でどうつなぐでしょうか。' : '根が使う水と排水を、播種・生育・収穫の管理でどうつなぐでしょうか。'}CCSへの集計で、実際の畑・放牧地・牛の所在地を示しません。`});
  }
 }
 return result;
}

/** Copies must not become extra targets for the original controllers or duplicate SVG IDs. */
function readonlyCopy(source: Element, prefix: string): Element {
 const copy = source.cloneNode(true) as Element;
 const elements = [copy, ...copy.querySelectorAll('*')];
 const ids = new Map<string, string>();
 for (const element of elements) {
  if (element.id) { ids.set(element.id, prefix + element.id); element.id = prefix + element.id; }
  for (const attribute of [...element.attributes]) if (attribute.name.startsWith('data-canada-')) element.removeAttribute(attribute.name);
  element.removeAttribute('tabindex');
  element.removeAttribute('aria-pressed');
  if (element.getAttribute('role') === 'button') element.removeAttribute('role');
 }
 for (const element of elements) for (const attribute of [...element.attributes]) {
  let value = attribute.value.replace(/url\(#([^)]*)\)/g, (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
  if ((attribute.name === 'href' || attribute.name === 'xlink:href') && value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
  if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby') value = value.split(/\s+/).map(id => ids.get(id) ?? id).join(' ');
  if (value !== attribute.value) element.setAttribute(attribute.name, value);
 }
 copy.removeAttribute('hidden');
 copy.removeAttribute('aria-hidden');
 if ('style' in copy) {
  const style = (copy as HTMLElement | SVGElement).style;
  style.display = '';
  style.visibility = 'visible';
 }
 return copy;
}

/** Called after the original source renderers; this helper never loads geometry or writes history. */
export function renderCanadaWaterOrigin(root: HTMLElement, state: CanadaWaterState): boolean {
 const host = root.querySelector<HTMLElement>('[data-water-origin]');
 if (!host) return false;
 const text = host.querySelector<HTMLElement>('[data-water-origin-text]');
 const detail = host.querySelector<HTMLElement>('[data-water-origin-detail]');
 const map = host.querySelector<SVGSVGElement>('[data-water-origin-map]');
 const legend = host.querySelector<HTMLElement>('[data-water-origin-legend]');
 const back = host.querySelector<HTMLAnchorElement>('[data-water-origin-return]');
 map?.replaceChildren();
 legend?.replaceChildren();
 if (text) text.textContent = '';
 if (detail) detail.textContent = '';
 if (back) { back.hidden = true; back.removeAttribute('href'); }
 delete host.dataset.waterOriginKind;
 const active = state.topic !== 'surface' && root.classList.contains('is-water-resource') ? origins(root, state.topic) : [];
 host.hidden = active.length === 0;
 host.classList.toggle('canada-census-map', active.some(origin => origin.kind === 'crop'));
 if (!active.length) return false;
 const doc = root.ownerDocument;
 host.dataset.waterOriginKind = active.map(origin => origin.kind).join(' ');
 if (text) text.textContent = active.map(origin => origin.brief).join(' ');
 if (detail) detail.textContent = active.map(origin => `${origin.summary ? origin.summary + '。' : ''}${origin.question}`).join(' ') + ' ' + scopes[state.topic as WaterDatasetTopic];
 if (back) { back.href = active[0].back.href; back.textContent = active[0].back.textContent; back.hidden = false; }
 if (map) {
  map.toggleAttribute('hidden', !active.some(origin => origin.layer?.querySelector('path,circle,image')));
  map.setAttribute('viewBox', '0 0 900 580');
  map.setAttribute('aria-label', '元の比較の分布：' + active.map(origin => origin.kind === 'forestry' ? '2020年針葉樹林' : origin.summary || origin.back.textContent).join(' / '));
  map.style.pointerEvents = 'none';
  // All parent layers use this same locator. Census already owns its saved camera.
  if (active.every(origin => origin.kind !== 'crop')) for (const land of root.querySelectorAll('[data-canada-map] .canada-land')) map.append(readonlyCopy(land, 'canada-water-origin-land-'));
  for (const origin of active) {
   if (!origin.layer) continue;
   const copy = readonlyCopy(origin.layer, `canada-water-origin-${origin.kind}-`);
   copy.setAttribute('data-water-origin-source', origin.kind);
   if (origin.kind === 'crop') {
    const savedFrame = origin.layer.getAttribute('viewBox');
    if (active.length === 1 && savedFrame) map.setAttribute('viewBox', savedFrame);
    // Keep the existing fallback's geometry, patterns and complete source legend.
    const group = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-water-origin-source', origin.kind);
    group.append(...copy.childNodes);
    map.append(group);
   } else map.append(copy);
  }
 }
 if (legend) for (const origin of active) {
  for (const source of origin.legends) {
   const copy = readonlyCopy(source, `canada-water-origin-${origin.kind}-legend-`);
   if (origin.kind === 'industry' && source.hasAttribute('data-canada-industry-context-legend')) {
    // The mini retains the GDP layer, so its legend describes only that layer.
    const label = copy.firstChild;
    if (label?.nodeType === 3) {
     const boundary = '境界2021年。', value = label.textContent ?? '', end = value.indexOf(boundary);
     if (end !== -1) label.textContent = value.slice(0, end + boundary.length);
    }
   }
   legend.append(copy);
  }
  const note = doc.createElement('p');
  note.textContent = origin.kind === 'forestry' ? '緑は2020年の針葉樹林です。森林図と降水・排水・地下水の各図は別々に照合します。' : origin.kind === 'industry' ? '色の階級は元の州内GDP割合です。水資源の新しい図とは別図で照合します。' : origin.kind === 'population' ? '円の面積・塗りの階級は元の人口または人口密度の指標です。縮小図内の凡例で単位・年を確認できます。' : '2021年の申告総量の階級です。公表ゼロ・非公表F・対象外／未収録を元の凡例どおり区別しています。';
  legend.append(note);
  if (origin !== active[0]) { const link = doc.createElement('a'); link.href = origin.back.href; link.textContent = origin.back.textContent; legend.append(link); }
 }
 return true;
}
