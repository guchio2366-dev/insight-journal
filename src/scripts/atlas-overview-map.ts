export interface OverviewMapConfig {
  width: number;
  height: number;
  countries: { code: string; name: string; bounds?: number[] }[];
  cities: { id: string; name: string; country: string; point: number[]; capital: boolean; rank: number }[];
}
type Frame = [number, number, number, number];

export function initOverviewMap(root: HTMLElement, config: OverviewMapConfig, onSelect: (country: string, city?: string) => void) {
  const svg = root.querySelector<SVGSVGElement>('[data-overview-map]')!;
  const stage = root.querySelector<HTMLElement>('[data-overview-map-stage]')!;
  const labels = [...root.querySelectorAll<HTMLButtonElement>('[data-overview-label-country],[data-overview-map-city]')];
  let frame: Frame = [0, 0, config.width, config.height];
  let selectedCountry = '', selectedCity = '';

  // Project into the SVG's letterboxed viewport, while keeping labels in screen pixels.
  function draw() {
    svg.setAttribute('viewBox', frame.join(' '));
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(width / frame[2], height / frame[3]);
    const offsetX = (width - frame[2] * scale) / 2, offsetY = (height - frame[3] * scale) / 2;
    const occupied: number[][] = [[width - 62, 0, width, 155], [0, height - 34, 185, height]];
    const rankLimit = frame[2] >= config.width * .75 ? 3 : frame[2] >= config.width * .4 ? 5 : Infinity;
    const cityVisible = (city: OverviewMapConfig['cities'][number]) => city.country === selectedCountry || city.rank <= rankLimit;
    const priority = (label: HTMLButtonElement) => {
      if (selectedCity && label.dataset.overviewMapCity === selectedCity) return 1000;
      if (selectedCountry && label.dataset.overviewLabelCountry === selectedCountry) return 950;
      if (selectedCountry && label.dataset.country === selectedCountry) return 900 - Number(label.dataset.priority || 0);
      return label.dataset.overviewLabelCountry ? 40 + Math.log(Math.max(1, Number(label.dataset.priority))) * 2 : 58 - Number(label.dataset.priority || 0);
    };
    [...labels].sort((a, b) => priority(b) - priority(a)).forEach(label => {
      const city = config.cities.find(city => city.id === label.dataset.overviewMapCity);
      if (city && !cityVisible(city)) { label.hidden = true; return; }
      const x = (Number(label.dataset.x) - frame[0]) * scale + offsetX, y = (Number(label.dataset.y) - frame[1]) * scale + offsetY;
      const country = !!label.dataset.overviewLabelCountry;
      label.hidden = false;
      const w = label.offsetWidth || (label.textContent?.length || 1) * (country ? 13 : 11) + (country ? 12 : 4), h = label.offsetHeight || (country ? 25 : 19);
      const candidates = country ? [[x - w / 2, y - h / 2]] : [[x + 7, y - h / 2], [x - w - 7, y - h / 2], [x + 7, y + 5], [x - w - 7, y - h - 5]];
      const position = candidates.find(([left, top]) => left >= 3 && top >= 3 && left + w <= width - 3 && top + h <= height - 3 && !occupied.some(([x1, y1, x2, y2]) => left < x2 + 3 && left + w > x1 - 3 && top < y2 + 2 && top + h > y1 - 2));
      label.hidden = !position;
      if (position) {
        label.style.left = `${position[0]}px`; label.style.top = `${position[1]}px`; label.style.transform = 'none';
        occupied.push([position[0], position[1], position[0] + w, position[1] + h]);
      }
      label.setAttribute('aria-pressed', String(country ? label.dataset.overviewLabelCountry === selectedCountry : label.dataset.overviewMapCity === selectedCity));
    });
    root.querySelectorAll<SVGCircleElement>('[data-overview-city-dot]').forEach(dot => {
      const city = config.cities.find(city => city.id === dot.dataset.overviewCityDot);
      dot.style.display = city && cityVisible(city) ? '' : 'none';
      const selected = dot.dataset.overviewCityDot === selectedCity;
      dot.setAttribute('r', String((selected ? 4 : 2.5) / scale)); dot.classList.toggle('is-selected', selected);
    });
    root.querySelectorAll<SVGTextElement>('.overview-water-name').forEach(text => text.setAttribute('font-size', String(13 / scale)));
  }
  function select(country: string, city: string) {
    if (country !== selectedCountry) {
      const b = config.countries.find(item => item.code === country)?.bounds;
      if (!b) frame = [0, 0, config.width, config.height];
      else {
        const width = Math.max(80, (b[2] - b[0]) * 1.45), height = Math.max(65, (b[3] - b[1]) * 1.45);
        frame = [(b[0] + b[2] - width) / 2, (b[1] + b[3] - height) / 2, width, height];
      }
    }
    selectedCountry = country; selectedCity = city;
    root.querySelectorAll<SVGPathElement>('[data-overview-map-country]').forEach(path => path.setAttribute('aria-pressed', String(path.dataset.overviewMapCountry === country)));
    draw();
  }
  let dragged = false;
  root.addEventListener('click', event => {
    if (dragged) { dragged = false; return; }
    const target = (event.target as Element).closest<HTMLElement>('[data-overview-map-country],[data-overview-label-country],[data-overview-map-city]');
    if (!target) return;
    const city = config.cities.find(city => city.id === target.dataset.overviewMapCity);
    onSelect(city?.country ?? target.dataset.overviewMapCountry ?? target.dataset.overviewLabelCountry ?? '', city?.id);
  });
  root.querySelector('[data-overview-reset]')?.addEventListener('click', () => {
    frame = [0, 0, config.width, config.height]; onSelect(''); draw();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-overview-zoom]').forEach(button => button.addEventListener('click', () => {
    const factor = button.dataset.overviewZoom === 'in' ? .7 : 1 / .7;
    const w = Math.min(config.width * 1.3, Math.max(30, frame[2] * factor)), h = frame[3] * w / frame[2];
    frame = [frame[0] + (frame[2] - w) / 2, frame[1] + (frame[3] - h) / 2, w, h]; draw();
  }));
  let drag: { x: number; y: number; frame: Frame } | null = null;
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest('button,a')) return;
    drag = { x: event.clientX, y: event.clientY, frame: [...frame] }; dragged = false;
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || !event.buttons) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 5) return;
    dragged = true; stage.setPointerCapture?.(event.pointerId);
    const scale = Math.min(stage.clientWidth / frame[2], stage.clientHeight / frame[3]);
    frame = [drag.frame[0] - dx / scale, drag.frame[1] - dy / scale, frame[2], frame[3]]; draw();
  });
  stage.addEventListener('pointerup', () => { drag = null; setTimeout(() => { dragged = false; }, 0); });
  stage.addEventListener('pointercancel', () => { drag = null; dragged = false; });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(draw).observe(stage);
  document.fonts?.ready.then(draw);
  draw();
  return { select };
}
