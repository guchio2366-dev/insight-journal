import {
  agricultureMetrics, agricultureNatureComparisonUrl, agricultureValue,
  formatAgricultureValue, irrigationColor, readMexicoAgricultureState,
  writeMexicoAgricultureState, type MexicoAgricultureRecord, type MexicoAgricultureState,
} from '../lib/atlas-mexico-agriculture';

interface AgricultureConfig {
  states: MexicoAgricultureRecord[];
  national: MexicoAgricultureRecord;
  naturePath: string;
  agriculturePath: string;
  positions: Record<string, [number, number]>;
  takeaway: Record<string, string>;
  definitions: Record<string, string>;
}

export function initMexicoAgriculture(root: HTMLElement): void {
  if (root.dataset.agricultureReady) return;
  const configElement = root.querySelector('[data-agriculture-config]');
  if (!configElement?.textContent) return;
  const config = JSON.parse(configElement.textContent) as AgricultureConfig;
  const codes = config.states.map(record => record.code);
  let state = readMexicoAgricultureState(new URL(location.href), codes);
  const $ = <T extends Element = HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Mexico agriculture element missing: ${selector}`);
    return element;
  };
  const setText = (selector: string, value: string) => { $(selector).textContent = value; };

  function render(): void {
    const record = config.states.find(item => item.code === state.state)!;
    const metric = agricultureMetrics.find(item => item.id === state.metric)!;
    const value = agricultureValue(record, state.metric);
    const nationalValue = agricultureValue(config.national, state.metric);
    const formatted = formatAgricultureValue(value, state.metric);
    $<HTMLSelectElement>('[data-agriculture-state]').value = state.state;
    $<HTMLInputElement>('[data-agriculture-only]').checked = state.only;
    const fallbackButton = $<HTMLButtonElement>('[data-agriculture-fallback]');
    fallbackButton.setAttribute('aria-pressed', String(state.fallback));
    fallbackButton.textContent = state.fallback ? '地図で読む' : '数値一覧で読む';
    setText('[data-agriculture-map-title]', metric.title);
    setText('[data-agriculture-map-caption]', metric.caption);
    setText('[data-agriculture-svg-title]', `メキシコの州別${metric.name}（${metric.unit}）`);
    setText('#mexico-agriculture-svg-desc', `${record.nameJa}を選択。${metric.name}は${formatted}。${metric.caption}州選択欄と32州表でも同じ公表値を確認できます。`);
    setText('[data-agriculture-selection-name]', record.nameJa);
    setText('[data-agriculture-selection-value]', formatted);
    setText('[data-agriculture-selection-metric]', `${metric.name}${state.metric === 'maize' ? '生産量' : ''}`);
    setText('[data-agriculture-takeaway]', config.takeaway[state.metric]);
    const definitionKey = {maize: 'maizeWhiteProductionT', irrigation: 'irrigationSharePct', pine: 'pineObtainedM3'}[state.metric];
    setText('[data-agriculture-definition]', config.definitions[definitionKey]);
    setText('[data-agriculture-national-value]', formatAgricultureValue(nationalValue, state.metric));
    setText('[data-agriculture-summary-state]', record.nameJa);
    setText('[data-agriculture-summary-value]', formatted);
    setText('[data-agriculture-share]', state.metric === 'irrigation'
      ? `灌漑 ${record.irrigatedAreaHa.toLocaleString('ja-JP', {maximumFractionDigits: 0})} ha ／ 農業用地 ${record.agriculturalAreaHa.toLocaleString('ja-JP', {maximumFractionDigits: 0})} ha`
      : `全国${state.metric === 'pine' ? '松材取得' : '白粒生産'}の${(value / nationalValue * 100).toFixed(1)}%`);
    for (const element of root.querySelectorAll<HTMLElement>('[data-agriculture-reading]')) {
      element.hidden = element.dataset.agricultureReading !== state.metric;
    }
    for (const element of root.querySelectorAll<HTMLElement>('[data-agriculture-legend]')) {
      element.hidden = element.dataset.agricultureLegend !== state.metric;
    }
    for (const link of root.querySelectorAll<HTMLAnchorElement>('[data-agriculture-metric]')) {
      if (link.dataset.agricultureMetric === state.metric) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      const nextMetric = agricultureMetrics.find(item => item.id === link.dataset.agricultureMetric)!;
      const nextState = {...state, metric: nextMetric.id, state: nextMetric.id === 'pine' && state.metric !== 'pine' ? '10' : state.state};
      link.href = writeMexicoAgricultureState(new URL(location.href), nextState).href;
    }
    const comparison = $<HTMLAnchorElement>('[data-agriculture-nature-comparison]');
    comparison.href = agricultureNatureComparisonUrl(config.naturePath, state, location.origin).href;
    setText('[data-agriculture-comparison-label]', `${record.nameJa}の${metric.comparisonTitle}`);
    setText('[data-agriculture-comparison-description]', metric.comparisonDescription);
    const svg = $<SVGSVGElement>('[data-agriculture-map]');
    if (state.fallback) svg.setAttribute('hidden', '');
    else svg.removeAttribute('hidden');
    svg.classList.toggle('is-only', state.only);
    const fallback = $<HTMLElement>('[data-agriculture-map-fallback]');
    fallback.hidden = !state.fallback;
    for (const path of root.querySelectorAll<SVGPathElement>('path[data-agriculture-state-code]')) {
      const item = config.states.find(record => record.code === path.dataset.agricultureStateCode)!;
      const selected = item.code === state.state;
      path.classList.toggle('is-selected', selected);
      path.setAttribute('aria-pressed', String(selected));
      path.setAttribute('aria-label', `${item.nameJa}を選ぶ。${metric.name} ${formatAgricultureValue(agricultureValue(item, state.metric), state.metric)}`);
      path.style.fill = state.metric === 'irrigation' ? irrigationColor(item.irrigationSharePct) : '#dce2d3';
    }
    for (const circle of root.querySelectorAll<SVGCircleElement>('[data-agriculture-symbol]')) {
      const item = config.states.find(record => record.code === circle.dataset.agricultureSymbol)!;
      const selected = item.code === state.state;
      circle.classList.toggle('is-selected', selected);
      circle.style.display = state.metric === 'irrigation' ? 'none' : '';
      circle.setAttribute('r', state.metric === 'pine' ? circle.dataset.rPine! : circle.dataset.rMaize!);
      circle.setAttribute('fill', metric.color);
      circle.style.stroke = state.metric === 'pine' ? '#244e44' : '#785219';
      const title = circle.querySelector('title');
      if (title) title.textContent = `${item.nameJa}：${formatAgricultureValue(agricultureValue(item, state.metric), state.metric)}`;
    }
    const [x, y] = config.positions[state.state];
    $<SVGElement>('[data-agriculture-selected-label]').setAttribute('transform', `translate(${x},${y})`);
    for (const label of root.querySelectorAll<SVGTextElement>('[data-agriculture-label-name],[data-agriculture-label-value]')) {
      label.setAttribute('x', x > 650 ? '-40' : '40');
      label.setAttribute('text-anchor', x > 650 ? 'end' : 'start');
    }
    setText('[data-agriculture-label-name]', record.nameJa);
    setText('[data-agriculture-label-value]', formatted);
    for (const button of root.querySelectorAll<HTMLElement>('[data-agriculture-pick]')) {
      button.setAttribute('aria-pressed', String(button.dataset.agriculturePick === state.state));
    }
    for (const row of root.querySelectorAll<HTMLElement>('[data-agriculture-stat-row]')) {
      row.classList.toggle('is-selected', row.dataset.agricultureStatRow === state.state);
    }
    for (const cell of root.querySelectorAll<HTMLElement>('[data-agriculture-stat-column]')) {
      cell.classList.toggle('is-current-metric', cell.dataset.agricultureStatColumn === state.metric);
    }
    setText('[data-agriculture-fallback-caption]', `${metric.name}（${metric.unit}）`);
    setText('[data-agriculture-fallback-unit]', metric.unit);
    const fallbackBody = $('[data-agriculture-fallback-body]');
    for (const item of [...config.states].sort((a, b) => agricultureValue(b, state.metric) - agricultureValue(a, state.metric))) {
      const row = $<HTMLTableRowElement>(`[data-agriculture-fallback-row="${item.code}"]`);
      row.classList.toggle('is-selected', item.code === state.state);
      setText(`[data-agriculture-fallback-value="${item.code}"]`, formatAgricultureValue(agricultureValue(item, state.metric), state.metric));
      fallbackBody.append(row);
    }
    root.dataset.agricultureMetric = state.metric;
    root.dataset.agricultureState = state.state;
    root.dataset.agricultureFallback = String(state.fallback);
    root.dataset.agricultureReady = 'true';
  }

  function update(patch: Partial<MexicoAgricultureState>): void {
    const next = {...state, ...patch};
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    history.pushState(null, '', writeMexicoAgricultureState(new URL(location.href), state));
    render();
  }
  $<HTMLSelectElement>('[data-agriculture-state]').addEventListener('change', event => {
    update({state: (event.target as HTMLSelectElement).value});
  });
  $<HTMLInputElement>('[data-agriculture-only]').addEventListener('change', event => {
    update({only: (event.target as HTMLInputElement).checked});
  });
  $('[data-agriculture-fallback]').addEventListener('click', () => update({fallback: !state.fallback}));
  for (const link of root.querySelectorAll<HTMLAnchorElement>('[data-agriculture-metric]')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const next = readMexicoAgricultureState(new URL(link.href), codes);
      update(next);
    });
  }
  root.addEventListener('click', event => {
    const target = event.target as Element;
    const pick = target.closest<HTMLElement | SVGElement>('[data-agriculture-pick],[data-agriculture-state-code]');
    const code = pick?.getAttribute('data-agriculture-pick') ?? pick?.getAttribute('data-agriculture-state-code');
    if (code && codes.includes(code)) update({state: code});
  });
  for (const path of root.querySelectorAll<SVGPathElement>('path[data-agriculture-state-code]')) {
    path.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        update({state: path.dataset.agricultureStateCode!});
      }
    });
  }
  window.addEventListener('popstate', () => {
    state = readMexicoAgricultureState(new URL(location.href), codes);
    render();
  });
  history.replaceState(null, '', writeMexicoAgricultureState(new URL(location.href), state));
  render();
}
