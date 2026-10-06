import population from '../data/atlas/mexico/population.json';
import {mexicoPopulationReading, mexicoPopulationRegionReading} from '../data/atlas/mexico/population-reading';
import {
  readMexicoPopulationState, writeMexicoPopulationState, mexicoDensityColor,
  mexicoPopulationScaleUrl, mexicoPopulationReturnUrl, mexicoPopulationIndustryUrl, mexicoPopulationNatureUrl,
  formatMexicoPopulation, formatMexicoDensity, type MexicoPopulationState,
  readMexicoPopulationFrame,zoomMexicoPopulationFrame,
} from '../lib/atlas-mexico-population';
import {readMexicoCompositionSelection,writeMexicoCompositionSelection,mexicoCompositionMetric,type MexicoCompositionData} from '../lib/atlas-mexico-population-composition';
import {captureMexicoPopulationComposition,restoreMexicoPopulationComposition,renderMexicoPopulationComposition,copyMexicoPopulationDefinitions} from './atlas-mexico-population-composition';

interface PopulationRoutes {
  population: string; nature: string; industry: string; agriculture: string; assets: string;
  labelPoints: Record<string, [number, number]>;
}

export function initMexicoPopulation(root: HTMLElement) {
  if (root.dataset.populationReady === '1') return;
  const configuration = root.querySelector('[data-population-config]');
  if (!configuration?.textContent) return;
  const routes = JSON.parse(configuration.textContent) as PopulationRoutes;
  const codes = population.states.map(row => row.stateCode);
  const query = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  let state = readMexicoPopulationState(new URL(location.href), codes);
  let requestedOverview=new URL(location.href).searchParams.get('reading')==='overview';
  let frame=readMexicoPopulationFrame(new URL(location.href));
  const compositionJSON=root.querySelector('[data-population-composition-config]')?.textContent;
  const compositionData:MexicoCompositionData=compositionJSON?JSON.parse(compositionJSON):{referenceYear:2020,metrics:[]};
  let composition=readMexicoCompositionSelection(new URL(location.href),compositionData,state.category);
  captureMexicoPopulationComposition(root);

  function readingSelected() {return !requestedOverview&&(!!state.state || state.compare==='scale' || state.category!=='distribution'&&!composition.overview);}
  function synchronizeReading() {
    const selected=readingSelected();
    root.dataset.mexicoInitialReadingSelected=String(selected);
    root.dataset.mexicoReadingSelected=String(selected);
    root.dispatchEvent(new CustomEvent('mexico-reading-mode',{detail:{selected}}));
  }
  function normalizedURL() {
    const next=writeMexicoCompositionSelection(writeMexicoPopulationState(new URL(location.href),state),composition,state.category);
    next.searchParams.set('reading',readingSelected()?'item':'overview');
    return next;
  }

  function render() {
    query<SVGSVGElement>('[data-population-map]').setAttribute('viewBox',frame.join(' '));
    query<HTMLButtonElement>('[data-population-map-action="out"]').disabled=frame[2]>=900;
    query<HTMLButtonElement>('[data-population-map-action="in"]').disabled=frame[2]<=180;
    const compositionMetric=mexicoCompositionMetric(compositionData,state.category,composition.metric);
    if(!compositionMetric||composition.overview)restoreMexicoPopulationComposition(root);
    const selectedState = requestedOverview?undefined:population.states.find(row => row.stateCode === state.state);
    const selected = selectedState??{nameJa:'メキシコ全国',short:'全国',population:population.nationalPopulation,density:population.nationalDensity};
    const region = selectedState?mexicoPopulationRegionReading(state.state):null;
    const comparison = state.compare === 'scale';
    const original=comparison&&state.sourceQuery?readMexicoPopulationState(new URL(state.sourceQuery,location.href),codes):state;
    const densityState=comparison&&original.view==='density'?original:state;
    const countState=comparison&&original.view==='population'?original:state;
    const unavailable = state.category !== 'distribution';
    const categoryLabel = state.category === 'religion' ? '宗教' : '人種・民族';
    const referencePrefix = unavailable ? '参考：人口分布 · ' : '';
    root.dataset.populationActiveCategory = state.category;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-population-category]')) {
      button.setAttribute('aria-pressed', String(button.dataset.populationCategory === state.category));
    }
    query<HTMLElement>('[data-population-unavailable]').hidden = !unavailable;
    query<HTMLElement>('[data-population-distribution-reading]').hidden = unavailable;
    query<HTMLElement>('[data-population-reference]').hidden = !unavailable;
    query<HTMLElement>('[data-population-reference-values]').hidden = !unavailable;
    query<HTMLElement>('[data-population-unavailable-heading]').textContent = `${categoryLabel}の分布は未整備です。`;
    query<HTMLElement>('[data-population-unavailable-text]').textContent = `現在の地図は、2020年の州別人口を示す参考図です。${categoryLabel}の構成や分布を示していません。`;
    const showPopulation = state.view === 'population' || comparison;
    const showDensity = state.view === 'density' || comparison;
    root.classList.toggle('is-comparison', comparison);
    query<HTMLSelectElement>('[data-population-view]').value = state.view;
    query<HTMLSelectElement>('[data-population-state]').value = requestedOverview?'':state.state;
    query<HTMLInputElement>('[data-population-only]').checked = !requestedOverview&&state.only;
    query<HTMLInputElement>('[data-population-only]').disabled = !selectedState;
    query<HTMLButtonElement>('[data-population-reset]').disabled = !selectedState;
    query<HTMLElement>('[data-population-normal]').hidden = state.fallback;
    query<HTMLElement>('[data-population-fallback]').hidden = !state.fallback;
    query<SVGElement>('[data-population-symbols]').toggleAttribute('hidden', !showPopulation);
    query<SVGElement>('[data-population-map-symbol-key]').toggleAttribute('hidden', !showPopulation);
    query<HTMLElement>('[data-population-density-key]').hidden = !showDensity;
    query<HTMLElement>('[data-population-symbol-key]').hidden = !showPopulation;
    query<HTMLElement>('[data-population-scale-reading]').hidden = !comparison;
    query<HTMLElement>('[data-population-scale-heading]').textContent = referencePrefix + '人口規模 × 人口密度';
    query<HTMLElement>('[data-population-reading-heading]').textContent = unavailable ? `${categoryLabel}（未整備）` : comparison
      ? '人口の多さと密度は、どこで違う？' : mexicoPopulationReading.title;
    query<HTMLElement>('[data-population-map-heading]').textContent = referencePrefix + (comparison
      ? '人口規模 × 人口密度（2020年）' : state.view === 'density' ? '2020年、人口はどこに集まる？' : '2020年、州人口の規模を比べる');
    query('[data-population-map] title').textContent = referencePrefix + (comparison
      ? '2020年の州別人口密度と面積比例の州人口' : state.view === 'density' ? '2020年の州別人口密度' : '2020年の州人口。円の面積で規模を表示。');

    for (const shape of root.querySelectorAll<SVGPathElement>('[data-population-state-shape]')) {
      const code = shape.dataset.populationStateShape!;
      const row = population.states.find(row => row.stateCode === code)!;
      shape.setAttribute('fill', showDensity ? mexicoDensityColor(row.density) : '#e0e7d8');
      shape.style.display = !requestedOverview&&densityState.only && code !== densityState.state ? 'none' : '';
      shape.classList.toggle('is-selected-population', !!selectedState&&code === state.state);
      shape.setAttribute('aria-pressed', String(!!selectedState&&code === state.state));
      shape.setAttribute('tabindex', showPopulation || (densityState.only && code !== densityState.state) ? '-1' : '0');
    }
    for (const symbol of root.querySelectorAll<SVGGElement>('[data-population-state-symbol]')) {
      const code = symbol.dataset.populationStateSymbol!;
      symbol.style.display = !requestedOverview&&countState.only && code !== countState.state ? 'none' : '';
      symbol.classList.toggle('is-selected-population', !!selectedState&&code === state.state);
      symbol.setAttribute('aria-pressed', String(!!selectedState&&code === state.state));
      symbol.setAttribute('tabindex', !showPopulation || (countState.only && code !== countState.state) ? '-1' : '0');
    }
    for (const label of root.querySelectorAll<SVGElement>('[data-population-state-label]')) {
      label.style.display = (state.only && label.dataset.populationStateLabel !== state.state) || label.dataset.populationStateLabel === state.state ? 'none' : '';
    }
    const point = routes.labelPoints[state.state];
    const label = query<SVGGElement>('[data-population-selected-label]');
    label.toggleAttribute('hidden',!selectedState);
    const dx = point?.[0] > 650 ? -25 : 25;
    if(point){
    label.querySelector('path')!.setAttribute('d', `M${point[0]},${point[1]}l${dx},-24`);
    const text = query<SVGTextElement>('[data-population-selected-label-text]');
    text.setAttribute('x', String(point[0] + dx));
    text.setAttribute('y', String(point[1] - 25));
    text.setAttribute('text-anchor', dx < 0 ? 'end' : 'start');
    text.textContent = selected.nameJa;
    }
    query<HTMLElement>('[data-population-selected-name]').textContent = `${selected.nameJa} · ${selected.short}`;
    query<HTMLElement>('[data-population-selected-population]').textContent = formatMexicoPopulation(selected.population);
    query<HTMLElement>('[data-population-selected-density]').textContent = formatMexicoDensity(selected.density);
    query<HTMLElement>('[data-population-region-heading]').textContent = region?.heading??mexicoPopulationReading.takeaway;
    query<HTMLElement>('[data-population-region-text]').textContent = region?.text??Object.values(mexicoPopulationReading.regions).map(item=>item.text).join(' ');
    query<HTMLElement>('[data-population-region-cause]').textContent = region?.cause??Object.values(mexicoPopulationReading.regions).map(item=>item.cause).join(' ');
    const shortText = !region ? '州を選ぶと人口・密度と地域の説明を読めます。全国表示では全32州を同じ凡例で比べます。' : region === mexicoPopulationReading.regions.central
      ? 'メキシコ州は人口が最多、メキシコ市は密度が最高。人口規模と密度を重ねて読みます。'
      : region === mexicoPopulationReading.regions.northern
        ? '北部の広い州の平均密度と、都市・輸出産業の集積をつなげて読みます。'
        : region === mexicoPopulationReading.regions.bajio
          ? '内陸の製造業と都市人口を、国内外への輸送とつなげて読みます。'
          : '沿岸と山地を含む州の人口を、地域の広さと生活を支える生産から読みます。';
    query<HTMLElement>('[data-population-short-reading]').textContent = shortText;

    for (const row of root.querySelectorAll<HTMLElement>('[data-population-row]')) {
      row.classList.toggle('is-selected-population-row', !!selectedState&&row.dataset.populationRow === state.state);
    }
    const source = new URL(location.href);
    query<HTMLAnchorElement>('[data-population-scale-link]').href = mexicoPopulationScaleUrl(source, state).href;
    query<HTMLAnchorElement>('[data-population-return]').href = mexicoPopulationReturnUrl(source, state).href;
    query<HTMLAnchorElement>('[data-population-return]').textContent = `${population.states.find(row=>row.stateCode===original.state)?.nameJa??'メキシコ全国'}の${state.sourceView === 'density' ? '人口密度' : '人口規模'}に戻る`;
    query<HTMLAnchorElement>('[data-population-industry-link]').href = mexicoPopulationIndustryUrl(new URL(routes.industry, source), state).href;
    query<HTMLAnchorElement>('[data-population-nature-link]').href = mexicoPopulationNatureUrl(new URL(routes.nature, source), state).href;
    for(const field of ['industry','nature']){const link=query<HTMLAnchorElement>(`[data-population-${field}-link]`),target=new URL(link.href);target.searchParams.set('sourcePopulationQuery',source.search);link.href=target.href;}
    query<HTMLElement>('[data-population-nature-link-label]').textContent = state.view === 'population' ? '地形区分 × 人口規模' : '地形区分 × 人口密度';
    query<HTMLElement>('[data-population-nature-link-hint]').textContent = state.view === 'population'
      ? '自然地理地域の区分と、人口規模の大きい州の位置を比べる'
      : '中央部の高地・盆地と、人口が集まる州の位置を比べる';
    query<HTMLElement>('[data-population-industry-link-label]').textContent = state.view === 'population' ? '州人口規模2020 × 州輸出額2025' : '州人口密度2020 × 州輸出額2025';
    const fallbackImage = query<HTMLImageElement>('[data-population-fallback-image]');
    const imageName = comparison ? 'density-population' : state.view;
    fallbackImage.src = `${routes.assets}/${imageName}.svg`;
    if (state.fallback) {
      const staticMap = query<SVGSVGElement>('[data-population-map]').cloneNode(true) as SVGSVGElement;
      staticMap.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      staticMap.setAttribute('width', '900');
      staticMap.setAttribute('height', '580');
      copyMexicoPopulationDefinitions(root,staticMap);
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = '[hidden]{display:none}svg{background:#eaf1ee}path{vector-effect:non-scaling-stroke}.population-context{fill:#e1e6dc;stroke:#a9b7ab;stroke-width:.6;fill-rule:evenodd}.population-state{stroke:#fffefa;stroke-width:.8;fill-rule:evenodd}.population-state.is-selected-population{stroke:#9c3b24;stroke-width:2.6}.population-symbol circle,.population-map-symbol-key circle{fill:#d68b38;fill-opacity:.58;stroke:#81511c;stroke-width:1.4}.population-symbol.is-selected-population circle{stroke:#862f21;stroke-width:3.2;fill-opacity:.76}.population-labels text,.population-selected-label text{font-family:system-ui,sans-serif;font-size:22px;font-weight:650;fill:#203d36;paint-order:stroke;stroke:#fffefa;stroke-width:3px;stroke-linejoin:round}.population-labels path{fill:none;stroke:#59766c;stroke-width:1;vector-effect:non-scaling-stroke}.population-selected-label text{font-size:24px}.population-selected-label path{fill:none;stroke:#9c3b24;stroke-width:2}.population-selected-label text{fill:#772f21}.population-map-context text{font-family:system-ui,sans-serif;font-size:22px;fill:#57726c}.population-map-symbol-key text{font-family:system-ui,sans-serif;font-size:28px;fill:#384d42;paint-order:stroke;stroke:#eaf1ee;stroke-width:3px}';
      staticMap.prepend(style);
      fallbackImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(staticMap))}`;
    }
    query<HTMLElement>('[data-population-fallback-caption]').textContent = referencePrefix + `地図の代替表示：${state.only ? `${selected.nameJa}のデータのみ（州境は位置の参考）` : '全32州の分布'}。選んだ州の値は右側で確認できます。`;
    fallbackImage.alt = referencePrefix + (comparison
      ? '2020年の全32州の人口密度と州人口。色は密度、円の面積は人口。両凡例と全州の表で値を確認できます。'
      : state.view === 'density'
        ? '2020年の全32州の人口密度。色の凡例と全州の表で値を確認できます。'
        : '2020年の全32州の人口。円の面積の凡例と全州の表で値を確認できます。');
    query<HTMLElement>('[data-population-map-status]').textContent = referencePrefix + `2020年・${comparison ? '人口密度と人口規模' : state.view === 'density' ? '州全域の平均密度' : '州人口の規模'}。${state.only ? '選択州のデータのみ（州境は位置の参考）' : '全32州'}。${selectedState?selected.nameJa+'を選択':'全国表示'}。`;
    query<HTMLElement>('[data-population-national-intro]').hidden=state.category!=='distribution'||!!selectedState;
    renderMexicoPopulationComposition(root,compositionData,state,composition,population.states);
    synchronizeReading();
  }

  function update(patch: Partial<MexicoPopulationState>,historyMode:'push'|'replace'='push') {
    requestedOverview=false;
    state = { ...state, ...patch };if(!state.state)state.only=false;
    composition={...composition,metric:mexicoCompositionMetric(compositionData,state.category,composition.metric)?.id??''};
    const next=normalizedURL();
    composition=readMexicoCompositionSelection(next,compositionData,state.category);if(historyMode==='replace')history.replaceState(history.state,'',next);else history.pushState(null,'',next);
    render();
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-population-category]')) {
    button.addEventListener('click', () => {composition={...composition,metric:'',overview:true,compare:false,sourceQuery:null};update({category: button.dataset.populationCategory as MexicoPopulationState['category'],state:'',only:false,compare:null});});
  }
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-population-map-action]'))button.addEventListener('click',()=>{
    frame=zoomMexicoPopulationFrame(frame,button.dataset.populationMapAction as 'in'|'out'|'fit');
    const next=normalizedURL();if(frame[2]===900&&frame[3]===580)next.searchParams.delete('frame');else next.searchParams.set('frame',frame.join(','));
    history.pushState(null,'',next);render();
  });

  query<HTMLSelectElement>('[data-population-view]').addEventListener('change', event => {const value=(event.target as HTMLSelectElement).value;if(mexicoCompositionMetric(compositionData,state.category,composition.metric)){composition={...composition,measure:value==='count'?'count':'share'};update({});}else update({view:value as MexicoPopulationState['view']});});
  root.querySelector<HTMLSelectElement>('[data-population-composition-metric]')?.addEventListener('change',event=>{const metric=(event.target as HTMLSelectElement).value;composition={...composition,metric,overview:!metric,compare:false,sourceQuery:null};update({});});
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-population-overview-metric]'))button.addEventListener('click',()=>{composition={...composition,metric:button.dataset.populationOverviewMetric!,overview:false,measure:'share',compare:false,sourceQuery:null};update({state:'',only:false,compare:null});});
  query<HTMLButtonElement>('[data-population-national]').addEventListener('click',()=>{composition={...composition,overview:true,compare:false,sourceQuery:null};update({state:'',only:false,compare:null});});
  root.querySelector<HTMLButtonElement>('[data-mexico-overview-button]')?.addEventListener('click',()=>{const alreadyUpdated=new URL(location.href).searchParams.get('reading')==='overview';composition={...composition,overview:true,compare:false,sourceQuery:null};update({state:'',only:false,compare:null},alreadyUpdated?'replace':'push');});
  root.querySelector<HTMLAnchorElement>('[data-population-composition-compare]')?.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();composition=readMexicoCompositionSelection(new URL((event.currentTarget as HTMLAnchorElement).href),compositionData,state.category);update({});});
  root.querySelector<HTMLAnchorElement>('[data-population-composition-return]')?.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const next=new URL((event.currentTarget as HTMLAnchorElement).href);requestedOverview=next.searchParams.get('reading')==='overview';state=readMexicoPopulationState(next,codes);frame=readMexicoPopulationFrame(next);composition=readMexicoCompositionSelection(next,compositionData,state.category);history.pushState(null,'',next);render();});
  query<HTMLSelectElement>('[data-population-state]').addEventListener('change', event => update({state:(event.target as HTMLSelectElement).value}));
  query<HTMLInputElement>('[data-population-only]').addEventListener('change', event => update({only:(event.target as HTMLInputElement).checked}));
  query<HTMLButtonElement>('[data-population-reset]').addEventListener('click', () => update({state:'',only:false}));
  for (const shape of root.querySelectorAll<SVGElement>('[data-population-state-shape],[data-population-state-symbol]')) {
    const choose = () => update({state:shape.dataset.populationStateShape ?? shape.dataset.populationStateSymbol!});
    shape.addEventListener('click', choose);
    shape.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
    });
  }
  query<HTMLAnchorElement>('[data-population-scale-link]').addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    state=readMexicoPopulationState(mexicoPopulationScaleUrl(new URL(location.href),state),codes);update({});
  });
  query<HTMLAnchorElement>('[data-population-return]').addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next=mexicoPopulationReturnUrl(new URL(location.href),state);requestedOverview=next.searchParams.get('reading')==='overview';state=readMexicoPopulationState(next,codes);frame=readMexicoPopulationFrame(next);composition=readMexicoCompositionSelection(next,compositionData,state.category);history.pushState(null,'',next);render();
  });
  window.addEventListener('popstate', () => {requestedOverview=new URL(location.href).searchParams.get('reading')==='overview';state = readMexicoPopulationState(new URL(location.href), codes);frame=readMexicoPopulationFrame(new URL(location.href));composition=readMexicoCompositionSelection(new URL(location.href),compositionData,state.category);const normalized=normalizedURL();if(normalized.href!==location.href)history.replaceState(history.state,'',normalized);render();});
  history.replaceState(null,'',normalizedURL());
  render();
  for (const control of root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('[data-population-view],[data-population-state],[data-population-only],[data-population-reset]')) control.disabled = false;
  query<HTMLInputElement>('[data-population-only]').disabled=requestedOverview||!state.state;query<HTMLButtonElement>('[data-population-reset]').disabled=requestedOverview||!state.state;
  if(mexicoCompositionMetric(compositionData,state.category,composition.metric))query<HTMLSelectElement>('[data-population-view]').disabled=composition.compare;
  query<HTMLDetailsElement>('[data-population-table]').open = false;
  root.dataset.populationReady = '1';
}
