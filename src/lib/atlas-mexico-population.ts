export type MexicoPopulationView = 'density' | 'population';
export type MexicoPopulationCategory = 'distribution' | 'ethnicity' | 'religion';
export type MexicoPopulationValueStatus = 'value' | 'zero' | 'missing' | 'confidential' | 'unavailable';
export interface MexicoPopulationState {
  category: MexicoPopulationCategory;
  view: MexicoPopulationView;
  state: string;
  only: boolean;
  compare: 'scale' | null;
  sourceView: MexicoPopulationView;
  fallback: boolean;
  sourceQuery?: string;
}
export interface MexicoPopulationRow {
  stateCode: string;
  name: string;
  nameJa: string;
  short: string;
  population: number;
  populationStatus: MexicoPopulationValueStatus;
  density: number;
  densityStatus: MexicoPopulationValueStatus;
  densityUnit: string;
  publishedAreaKm2: number;
}
export const mexicoPopulationKeys = ['category', 'view', 'state', 'only', 'compare', 'sourceView', 'fallback', 'populationFrom'] as const;
export const mexicoDensityBins = [
  { min: 0, max: 25, color: '#f1f0d6', label: '25未満' },
  { min: 25, max: 50, color: '#c6debe', label: '25–50未満' },
  { min: 50, max: 100, color: '#8ec2b0', label: '50–100未満' },
  { min: 100, max: 250, color: '#529f95', label: '100–250未満' },
  { min: 250, max: 1000, color: '#26786e', label: '250–1,000未満' },
  { min: 1000, max: Infinity, color: '#174c49', label: '1,000以上' },
] as const;
export const mexicoPopulationLegendValues = [1_000_000, 5_000_000, 10_000_000] as const;
export const mexicoPopulationMaximumRadius = 33;
export const mexicoPopulationRadiusReference = 10_000_000;
export const mexicoPopulationSymbolColor = '#d68b38';
export const mexicoPopulationSymbolOpacity = 0.58;
export const mexicoPopulationSymbolStroke = '#81511c';
export const mexicoPopulationSelectedSymbolStroke = '#862f21';
export const mexicoPopulationSelectedSymbolOpacity = 0.76;

export function mexicoPopulationRadius(population: number): number {
  return Number.isFinite(population) && population >= 0
    ? mexicoPopulationMaximumRadius * Math.sqrt(population / mexicoPopulationRadiusReference)
    : 0;
}

export function mexicoDensityColor(value: number | null, status: MexicoPopulationValueStatus = 'value'): string {
  if (value === null || !Number.isFinite(value) || value < 0 || !['value', 'zero'].includes(status)) return 'url(#mexico-population-missing)';
  return mexicoDensityBins.find(bin => value >= bin.min && value < bin.max)?.color ?? 'url(#mexico-population-missing)';
}

export function formatMexicoPopulation(value: number | null, status: MexicoPopulationValueStatus = 'value'): string {
  if (status === 'confidential') return '秘匿';
  if (status === 'missing') return '欠測';
  if (status === 'unavailable') return '未取得';
  return value !== null && Number.isFinite(value) ? value.toLocaleString('ja-JP', { maximumFractionDigits: 0 }) : '未取得';
}

export function formatMexicoDensity(value: number | null, status: MexicoPopulationValueStatus = 'value'): string {
  if (!['value', 'zero'].includes(status) || value === null || !Number.isFinite(value)) return formatMexicoPopulation(null, status);
  return value.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export type MexicoPopulationFrame=[number,number,number,number];
export function readMexicoPopulationFrame(url:URL):MexicoPopulationFrame {
  const values=url.searchParams.get('frame')?.split(',').map(Number);
  return values?.length===4&&values.every(Number.isFinite)&&values[0]>=0&&values[1]>=0&&values[2]>=180&&values[2]<=900&&values[3]>=116&&values[3]<=580&&values[0]+values[2]<=900.01&&values[1]+values[3]<=580.01?values as MexicoPopulationFrame:[0,0,900,580];
}
export function zoomMexicoPopulationFrame(frame:MexicoPopulationFrame,action:'in'|'out'|'fit'):MexicoPopulationFrame {
  if(action==='fit')return [0,0,900,580];
  const [x,y,w,h]=frame,factor=action==='in'?.74:1/.74;
  const width=Math.max(180,Math.min(900,w*factor)),height=Math.max(116,Math.min(580,h*factor));
  return [Math.max(0,Math.min(900-width,x+(w-width)/2)),Math.max(0,Math.min(580-height,y+(h-height)/2)),width,height].map(value=>Math.round(value*1000)/1000) as MexicoPopulationFrame;
}

function validView(raw: string | null): MexicoPopulationView {
  return raw === 'population' ? 'population' : 'density';
}

export function readMexicoPopulationState(url: URL, stateCodes: readonly string[]): MexicoPopulationState {
  const p = url.searchParams;
  const view = validView(p.get('view'));
  const selected = p.get('state') ?? '';
  const state = stateCodes.includes(selected) ? selected : '';
  const category = p.get('category');
  const sourceQuery=p.get('populationFrom');
  const source=sourceQuery?.startsWith('?')?new URL(sourceQuery,url):null;
  const sourceState=source?.searchParams.get('state')??'';
  const validSource=!!source&&!source.searchParams.has('compare')&&!source.searchParams.has('populationFrom')&&(!sourceState||stateCodes.includes(sourceState))&&(source.searchParams.get('only')!=='1'||!!sourceState)&&['density','population'].includes(source.searchParams.get('view')??'');
  return {
    category: category === 'ethnicity' || category === 'religion' ? category : 'distribution',
    view, state, only: !!state && p.get('only') === '1',
    compare: p.get('compare') === 'scale' ? 'scale' : null,
    sourceView: p.has('sourceView') ? validView(p.get('sourceView')) : view,
    fallback: p.get('fallback') === '1',
    ...(p.get('compare')==='scale'&&validSource?{sourceQuery:sourceQuery!}:{}),
  };
}

export function writeMexicoPopulationState(url: URL, state: MexicoPopulationState): URL {
  const next = new URL(url);
  for (const key of mexicoPopulationKeys) next.searchParams.delete(key);
  if (state.category !== 'distribution') next.searchParams.set('category', state.category);
  next.searchParams.set('view', state.view);
  if (state.state) next.searchParams.set('state', state.state);
  if (state.state && state.only) next.searchParams.set('only', '1');
  if (state.compare) {
    next.searchParams.set('compare', state.compare);
    next.searchParams.set('sourceView', state.sourceView);
    if(state.sourceQuery?.startsWith('?'))next.searchParams.set('populationFrom',state.sourceQuery);
  }
  if (state.fallback) next.searchParams.set('fallback', '1');
  return next;
}

export function mexicoPopulationScaleUrl(source: URL, state: MexicoPopulationState): URL {
  const original=writeMexicoPopulationState(source,{...state,compare:null,sourceQuery:undefined});
  return writeMexicoPopulationState(original, { ...state, compare: 'scale', sourceView: state.view,sourceQuery:original.search });
}

export function mexicoPopulationReturnUrl(source: URL, state: MexicoPopulationState): URL {
  if(state.sourceQuery?.startsWith('?'))return new URL(state.sourceQuery,source);
  return writeMexicoPopulationState(source, { ...state, view: state.sourceView, compare: null });
}

export function mexicoPopulationIndustryUrl(target: URL, state: MexicoPopulationState): URL {
  const next = new URL(target);
  next.searchParams.set('compare', 'population');
  if (state.state) next.searchParams.set('state', state.state);
  else next.searchParams.delete('state');
  next.searchParams.set('sourceState', state.state);
  next.searchParams.set('sourceOnly', state.state && state.only ? '1' : '0');
  next.searchParams.set('from', 'population');
  next.searchParams.set('sourceView', state.view);
  if (state.state && state.only) next.searchParams.set('only', '1');
  else next.searchParams.delete('only');
  if (state.fallback) next.searchParams.set('fallback', '1');
  else next.searchParams.delete('fallback');
  return next;
}

export function mexicoPopulationNatureUrl(target: URL, state: MexicoPopulationState): URL {
  const next = new URL(target);
  next.searchParams.set('view', 'relief');
  next.searchParams.set('compare', 'population');
  if (state.state) next.searchParams.set('state', state.state);
  else next.searchParams.delete('state');
  next.searchParams.set('sourceState', state.state);
  next.searchParams.set('sourceOnly', state.state && state.only ? '1' : '0');
  next.searchParams.set('from', 'population');
  next.searchParams.set('sourceView', state.view);
  if (state.state && state.only) next.searchParams.set('only', '1');
  else next.searchParams.delete('only');
  if (state.fallback) next.searchParams.set('fallback', '1');
  else next.searchParams.delete('fallback');
  return next;
}
