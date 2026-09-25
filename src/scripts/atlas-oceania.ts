import { oceaniaRegions } from '../data/atlas/oceania.ts';

export function initOceaniaAtlas(root: HTMLElement) {
  const win = root.ownerDocument.defaultView!;
  const regionButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-region-button]')];
  const countryButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-country-button]')];
  const paths = [...root.querySelectorAll<SVGPathElement>('[data-map-country]')];
  const markers = [...root.querySelectorAll<SVGCircleElement>('[data-locator]')];
  const map = root.querySelector<SVGSVGElement>('.oceania-map')!;
  const name = root.querySelector<HTMLElement>('[data-selection-name]')!;
  const description = root.querySelector<HTMLElement>('[data-selection-region]')!;
  const frame = map.dataset.defaultFrame!.split(' ').map(Number);
  const regionNames: Record<string, string> = oceaniaRegions;
  let region = 'all';
  let country = '';

  function fitSelection() {
    const selected = paths.filter(path => country ? path.dataset.mapCountry === country : path.dataset.mapRegion === region);
    let view = frame;
    if (selected.length) {
      const boxes = selected.map(path => path.dataset.extent!.split(' ').map(Number));
      const left = Math.min(...boxes.map(b => b[0])), top = Math.min(...boxes.map(b => b[1]));
      const right = Math.max(...boxes.map(b => b[2])), bottom = Math.max(...boxes.map(b => b[3]));
      const aspect = frame[2] / frame[3];
      // Small islands receive a close-up, with enough margin to read the outline.
      const width = Math.max((right - left) * 1.25, (bottom - top) * 1.25 * aspect, .8);
      const height = width / aspect;
      view = [(left + right - width) / 2, (top + bottom - height) / 2, width, height];
    }
    map.setAttribute('viewBox', view.join(' '));
    map.dataset.detail = String(region !== 'all' || !!country);
    for (const marker of markers) {
      marker.setAttribute('r', String(view[2] / 240));
      marker.style.display = country || (region !== 'all' && marker.dataset.locatorRegion !== region) ? 'none' : '';
    }
  }

  function render(writeUrl = false) {
    for (const button of regionButtons) button.setAttribute('aria-pressed', String(button.dataset.regionButton === region));
    for (const button of countryButtons) {
      button.hidden = region !== 'all' && button.dataset.countryRegion !== region;
      button.setAttribute('aria-pressed', String(button.dataset.countryButton === country));
    }
    for (const path of paths) {
      path.classList.toggle('is-muted', region !== 'all' && path.dataset.mapRegion !== region);
      path.classList.toggle('is-selected', path.dataset.mapCountry === country);
    }
    const chosen = countryButtons.find(button => button.dataset.countryButton === country);
    name.textContent = chosen?.textContent ?? (region === 'all' ? '太平洋を中心に読む' : regionNames[region]);
    description.textContent = chosen
      ? `${regionNames[chosen.dataset.countryRegion!]}の区分で表示しています。選択した国・地域の陸地に合わせて拡大しました。`
      : '地図または一覧から国・地域を選択してください。小さな島は一覧から選ぶと拡大できます。';
    fitSelection();
    if (writeUrl) {
      const url = new URL(win.location.href);
      region === 'all' ? url.searchParams.delete('region') : url.searchParams.set('region', region);
      country ? url.searchParams.set('place', country) : url.searchParams.delete('place');
      win.history.pushState(null, '', url);
    }
  }
  function readUrl() {
    const params = new URLSearchParams(win.location.search);
    const requestedRegion = params.get('region');
    region = requestedRegion && Object.hasOwn(regionNames, requestedRegion) ? requestedRegion : 'all';
    const requestedCountry = params.get('place');
    const chosen = countryButtons.find(button => button.dataset.countryButton === requestedCountry);
    country = chosen?.dataset.countryButton ?? '';
    if (chosen && region !== 'all') region = chosen.dataset.countryRegion!;
    render();
  }
  const listeners: (() => void)[] = [];
  function listen(element: Element, action: () => void) {
    element.addEventListener('click', action);
    listeners.push(() => element.removeEventListener('click', action));
  }
  for (const button of regionButtons) listen(button, () => {
    if (region === button.dataset.regionButton && !country) return;
    region = button.dataset.regionButton!;
    country = '';
    render(true);
  });
  function select(code: string) {
    const chosen = countryButtons.find(button => button.dataset.countryButton === code);
    if (!chosen || country === code) return;
    country = code;
    if (region !== 'all') region = chosen.dataset.countryRegion!;
    render(true);
  }
  for (const button of countryButtons) listen(button, () => select(button.dataset.countryButton!));
  for (const path of paths) listen(path, () => select(path.dataset.mapCountry!));
  const showMap = root.querySelector<HTMLButtonElement>('[data-show-map]');
  if (showMap) listen(showMap, () => {
    // SVG scrollIntoView may use the selected geometry's bounds, not the viewport.
    win.scrollTo({ top: win.scrollY + map.getBoundingClientRect().top - 110, behavior: 'instant' });
  });
  win.addEventListener('popstate', readUrl);
  readUrl();
  return () => { listeners.forEach(remove => remove()); win.removeEventListener('popstate', readUrl); };
}
