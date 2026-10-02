import {agricultureMetrics, agricultureSymbolKeys, quantityRadius} from './atlas-mexico-agriculture';
import type {MexicoNatureState} from './atlas-mexico-nature';
interface RecordValue {code: string; name: string; point: number[]; maizeWhiteProductionT: number | null; cattleHeads?: number | null}
export function prepareMexicoNatureLivestock(root: HTMLElement): void {
  for (const circle of root.querySelectorAll<SVGCircleElement>('[data-mexico-nature-compare-symbol]')) {circle.dataset.mexicoNatureQuantityKind = 'maize'; const cattle = circle.cloneNode(true) as SVGCircleElement; cattle.dataset.mexicoNatureQuantityKind = 'cattle'; cattle.style.display = 'none'; circle.parentElement?.append(cattle);}
}
export function renderMexicoNatureLivestock(root: HTMLElement, state: MexicoNatureState, records: RecordValue[]): void {
  const mode = state.sourceMetric, active = state.compare === 'irrigation' && state.from === 'agriculture' && (mode === 'maize' || mode === 'cattle');
  const cattleNodes = root.querySelectorAll<SVGCircleElement>('[data-mexico-nature-quantity-kind="cattle"]');
  const originalKeys = root.querySelectorAll<HTMLElement | SVGSVGElement>('[data-mexico-nature-quantity-definition],[data-mexico-nature-quantity-key],[data-mexico-nature-quantity-key-values]');
  for (const key of originalKeys) key.style.display = active ? 'none' : '';
  let key = root.querySelector<HTMLElement>('[data-mexico-nature-agriculture-key]');
  if (!active) {for (const circle of cattleNodes) {circle.style.display = 'none'; circle.setAttribute('tabindex', '-1');} if (key) key.hidden = true; return;}
  if (!key) {key = document.createElement('div'); key.dataset.mexicoNatureAgricultureKey = ''; root.querySelector('[data-mexico-nature-quantity-legend]')?.append(key);} key.hidden = false; key.replaceChildren();
  const visible = {maize: state.sourceOnlyItem ? mode === 'maize' : state.sourceCrops, cattle: state.sourceOnlyItem ? mode === 'cattle' : state.sourceLivestock};
  const both = visible.maize && visible.cattle, zoom = (state.frame?.[2] ?? 900) / 900;
  const byCode = new Map(records.map(record => [record.code, record]));
  for (const metric of ['maize', 'cattle'] as const) {
    const value = (record: RecordValue) => metric === 'maize' ? record.maizeWhiteProductionT : record.cattleHeads ?? null;
    const maximum = Math.max(...records.map(record => value(record) ?? 0));
    const definition = agricultureMetrics.find(item => item.id === metric)!;
    const radius = (number: number | null) => number === null ? 0 : quantityRadius(number, maximum, 32) * zoom;
    for (const circle of root.querySelectorAll<SVGCircleElement>(`[data-mexico-nature-quantity-kind="${metric}"]`)) {
      const record = byCode.get(circle.dataset.mexicoNatureCompareSymbol!)!, selected = record.code === state.state;
      circle.style.display = visible[metric] ? '' : 'none'; circle.setAttribute('r', String(radius(value(record))));
      circle.setAttribute('cx', String(record.point[0] + (both ? metric === 'maize' ? -12 : 12 : 0))); circle.setAttribute('cy', String(record.point[1] + (both ? metric === 'maize' ? -10 : 10 : 0)));
      circle.style.fill = definition.color; circle.style.fillOpacity = String(selected ? .85 : .67); circle.style.stroke = selected ? '#243e31' : '#785219'; circle.style.strokeWidth = String(selected ? 2 : .8); circle.style.opacity = state.only && !selected ? '.24' : '1';
      circle.setAttribute('tabindex', visible[metric] ? '0' : '-1'); const label = `${record.name}：${definition.name} ${value(record)?.toLocaleString('ja-JP') ?? '未取得'}${definition.unit}`; circle.setAttribute('aria-label', label); const title = circle.querySelector('title'); if (title) title.textContent = label;
    }
    if (visible[metric]) {const section = document.createElement('section'), label = document.createElement('p'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); label.className = 'mexico-caption'; label.textContent = `${definition.name}・${metric === 'cattle' ? '2022年9月' : '2021年10月～2022年9月'} / 円の面積・${definition.unit}`; svg.setAttribute('viewBox', `0 0 ${900 * zoom} ${90 * zoom}`); svg.setAttribute('role', 'img'); const keys = agricultureSymbolKeys[metric]; svg.setAttribute('aria-label', keys.map(number => `${number.toLocaleString('ja-JP')}${definition.unit}`).join('、')); for (const [index, number] of keys.entries()) {const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); for (const [attribute, attributeValue] of Object.entries({cx: (150 + index * 300) * zoom, cy: 45 * zoom, r: radius(number), fill: definition.color, 'fill-opacity': .67})) circle.setAttribute(attribute, String(attributeValue)); svg.append(circle);} const labels = document.createElement('p'); labels.className = 'mexico-caption'; labels.textContent = keys.map(number => `${number.toLocaleString('ja-JP')}${definition.unit}`).join(' / '); section.append(label, svg, labels); key.append(section);}
  }
  const note = document.createElement('p'); note.className = 'mexico-caption'; note.textContent = '元の農畜産の表示ON/OFFと選択品目を保持。tと頭は別の尺度で、円の大きさを品目間では比べません。'; key.append(note);
}
