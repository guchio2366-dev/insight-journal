const root = document.querySelector<HTMLElement>('[data-world-industry]');
if (root) {
  const panels = [...root.querySelectorAll<HTMLElement>('[data-wi-panel]')];
  const sectorButtons = [...root.querySelectorAll<HTMLElement>('[data-wi-sector]')];
  const state = { sector: panels[0].dataset.wiPanel!, stage: 'all', site: '', link: 'none' };
  const panel = () => panels.find(p => p.dataset.wiPanel === state.sector)!;
  const matching = (selector: string, key: string, value: string) => [...panel().querySelectorAll<HTMLElement>(selector)].some(node => node.dataset[key] === value);
  const writeUrl = () => {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(state)) {
      if (value && value !== 'all' && value !== 'none') url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  };
  function render(announce = true) {
    panels.forEach(p => { p.hidden = p !== panel(); });
    sectorButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wiSector === state.sector)));
    const active = panel();
    const connection = [...active.querySelectorAll<HTMLElement>('[data-wi-link]')].find(b => b.dataset.wiLink === state.link);
    const endpoints = state.link === 'none' ? [] : [connection?.dataset.from, connection?.dataset.to];
    active.querySelectorAll<HTMLElement>('[data-wi-stage]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wiStage === state.stage)));
    active.querySelectorAll<HTMLElement>('[data-wi-site], [data-wi-place]').forEach(node => {
      const selected = (node.dataset.wiSite ?? node.dataset.wiPlace) === state.site;
      const relevant = state.stage === 'all' || node.dataset.stage === state.stage;
      node.setAttribute('aria-pressed', String(selected));
      node.classList.toggle('is-selected', selected);
      node.classList.toggle('is-connected', endpoints.includes(node.dataset.wiSite ?? node.dataset.wiPlace));
      node.classList.toggle('is-muted', !relevant || (endpoints.length > 0 && !endpoints.includes(node.dataset.wiSite ?? node.dataset.wiPlace)));
      if (node.dataset.wiPlace) node.hidden = !relevant;
    });
    active.querySelectorAll<HTMLElement>('[data-wi-card]').forEach(card => { card.hidden = card.dataset.wiCard !== state.site; });
    active.querySelectorAll<HTMLElement>('[data-wi-map-summary]').forEach(summary => { summary.hidden = summary.dataset.wiMapSummary !== state.site; });
    active.querySelectorAll<HTMLElement>('[data-wi-link]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wiLink === state.link)));
    active.querySelectorAll<HTMLElement>('[data-wi-line], [data-wi-evidence]').forEach(node => { node.toggleAttribute('hidden', (node.dataset.wiLine ?? node.dataset.wiEvidence) !== state.link); });
    const count = [...active.querySelectorAll<HTMLElement>('[data-wi-place]')].filter(node => !node.hidden).length;
    active.querySelector<HTMLElement>('[data-wi-count]')!.textContent = `${state.stage === 'all' ? '' : '選択工程 '}${count}地点`;
    const note = active.querySelector<HTMLElement>('[data-wi-stage-note]')!;
    if (!note.dataset.overview) note.dataset.overview = note.textContent ?? '';
    const currentButton = [...active.querySelectorAll<HTMLElement>('[data-wi-stage]')].find(b => b.dataset.wiStage === state.stage)!;
    note.textContent = state.stage === 'all' ? note.dataset.overview! : currentButton.dataset.note ?? currentButton.textContent!;
    if (announce) {
      const selectedName = active.querySelector<HTMLElement>(`[data-wi-card="${state.site}"] h3`)?.textContent ?? '';
      root!.querySelector<HTMLElement>('[data-wi-live]')!.textContent = `${active.getAttribute('aria-label')}、${count}地点。${selectedName}を選択。`;
    }
  }
  function readUrl() {
    const params = new URL(location.href).searchParams;
    const requestedSector = params.get('sector');
    state.sector = panels.find(p => p.dataset.wiPanel === requestedSector)?.dataset.wiPanel ?? panels[0].dataset.wiPanel!;
    const stage = params.get('stage') ?? 'all';
    state.stage = matching('[data-wi-stage]', 'wiStage', stage) ? stage : 'all';
    const place = [...panel().querySelectorAll<HTMLElement>('[data-wi-place]')];
    const requestedPlace = place.find(p => p.dataset.wiPlace === params.get('site') && (state.stage === 'all' || p.dataset.stage === state.stage));
    const defaultPlace = state.stage === 'all' ? place.find(p => p.dataset.wiPlace === panel().dataset.defaultSite) : undefined;
    state.site = (requestedPlace ?? defaultPlace ?? place.find(p => state.stage === 'all' || p.dataset.stage === state.stage))!.dataset.wiPlace!;
    const link = params.get('link') ?? 'none';
    state.link = matching('[data-wi-link]', 'wiLink', link) ? link : 'none';
    render(false);
  }
  root.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-wi-sector], [data-wi-stage], [data-wi-site], [data-wi-place], [data-wi-link]');
    if (!target) return;
    if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    if (target.dataset.wiSector) {
      state.sector = target.dataset.wiSector;
      state.stage = 'all'; state.link = 'none';
      state.site = panel().dataset.defaultSite!;
    } else if (target.dataset.wiStage) {
      state.stage = target.dataset.wiStage; state.link = 'none';
      const sites = [...panel().querySelectorAll<HTMLElement>('[data-wi-place]')].filter(p => state.stage === 'all' || p.dataset.stage === state.stage);
      if (!sites.some(p => p.dataset.wiPlace === state.site)) state.site = sites[0].dataset.wiPlace!;
    } else if (target.dataset.wiSite || target.dataset.wiPlace) {
      state.site = (target.dataset.wiSite ?? target.dataset.wiPlace)!;
      const connection = [...panel().querySelectorAll<HTMLElement>('[data-wi-link]')].find(b => b.dataset.wiLink === state.link);
      if (connection && ![connection.dataset.from, connection.dataset.to].includes(state.site)) state.link = 'none';
      if (state.stage !== 'all' && state.stage !== target.dataset.stage) { state.stage = target.dataset.stage!; state.link = 'none'; }
    } else if (target.dataset.wiLink) {
      state.link = target.dataset.wiLink;
      if (state.link !== 'none') { state.stage = 'all'; state.site = target.dataset.from!; }
    }
    render(); writeUrl();
  });
  root.addEventListener('keydown', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-wi-site], a[data-wi-sector]');
    if (target && (event.key === ' ' || (event.key === 'Enter' && target.hasAttribute('data-wi-site')))) {
      event.preventDefault(); target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  addEventListener('popstate', readUrl);
  readUrl(); root.dataset.ready = 'true';
}
