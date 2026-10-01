export const industryFeatureSectors = ['automotive', 'solar', 'battery', 'semiconductor'] as const;
export const industryFeatureRegions = ['north-america', 'europe', 'asia'] as const;
export const industryFeatureViews = ['market', 'manufacturing', 'mechanism'] as const;
export const industryFeaturePowertrains = ['all', 'bev', 'phev', 'hev', 'ice', 'fcev'] as const;
export const industryFeatureBodies = ['all', 'suv', 'sedan', 'pickup', 'minivan'] as const;

export type IndustryFeatureSector = typeof industryFeatureSectors[number];
export type IndustryFeatureRegion = typeof industryFeatureRegions[number];
export type IndustryFeatureView = typeof industryFeatureViews[number];
export type IndustryFeaturePowertrain = typeof industryFeaturePowertrains[number];
export type IndustryFeatureBody = typeof industryFeatureBodies[number];
export type IndustryFeatureState = {
  sector: IndustryFeatureSector;
  region: IndustryFeatureRegion;
  country: string;
  view: IndustryFeatureView;
  powertrain: IndustryFeaturePowertrain;
  body: IndustryFeatureBody;
  compare: boolean;
};

/** Supply a resolver when the available countries differ by sector. */
export type IndustryFeatureCountries =
  | Partial<Record<IndustryFeatureRegion, readonly string[]>>
  | ((sector: IndustryFeatureSector, region: IndustryFeatureRegion) => readonly string[]);

type StateInput = { [Key in keyof IndustryFeatureState]?: unknown };

export const defaultIndustryFeatureState: Readonly<IndustryFeatureState> = Object.freeze({
  sector: 'automotive', region: 'north-america', country: 'USA',
  view: 'market', powertrain: 'all', body: 'all', compare: false,
});

const defaultCountries: Record<IndustryFeatureRegion, readonly string[]> = {
  'north-america': ['USA', 'CAN', 'MEX'],
  europe: ['DEU', 'FRA', 'NOR'],
  asia: ['CHN', 'JPN', 'THA'],
};

function enumValue<Value extends string>(value: unknown, allowed: readonly Value[], fallback: Value): Value {
  return typeof value === 'string' && allowed.includes(value as Value) ? value as Value : fallback;
}

const isGeographyCode = (value: unknown): value is string =>
  typeof value === 'string' && (value === 'EU' || /^[A-Z]{3}$/.test(value));

function countriesFor(sector: IndustryFeatureSector, region: IndustryFeatureRegion, context?: IndustryFeatureCountries): readonly string[] {
  const countries = !context ? defaultCountries[region]
    : typeof context === 'function' ? context(sector, region)
    : Object.prototype.hasOwnProperty.call(context, region) ? context[region] ?? [] : [];
  // EU is an explicit aggregate scope in the solar/battery sources; do not
  // silently replace it with a representative European country's observation.
  return countries.filter(isGeographyCode);
}

/** Reuse after control changes, as well as when reading browser history. */
export function normalizeIndustryFeatureState(input: StateInput = {}, countriesByRegion?: IndustryFeatureCountries): IndustryFeatureState {
  const sector = enumValue(input.sector, industryFeatureSectors, defaultIndustryFeatureState.sector);
  const region = enumValue(input.region, industryFeatureRegions, defaultIndustryFeatureState.region);
  const countries = countriesFor(sector, region, countriesByRegion);
  const country = input.country === '' ? ''
    : typeof input.country === 'string' && countries.includes(input.country) ? input.country
    : countries[0] ?? '';
  return {
    sector, region, country,
    view: enumValue(input.view, industryFeatureViews, defaultIndustryFeatureState.view),
    powertrain: enumValue(input.powertrain, industryFeaturePowertrains, defaultIndustryFeatureState.powertrain),
    body: enumValue(input.body, industryFeatureBodies, defaultIndustryFeatureState.body),
    compare: input.compare === true || input.compare === '1' || input.compare === 'true',
  };
}

/** Pass location.search on initial load and on popstate; no browser globals are needed. */
export function readIndustryFeatureState(search: string, countriesByRegion?: IndustryFeatureCountries): IndustryFeatureState {
  const query = new URLSearchParams(search);
  return normalizeIndustryFeatureState({
    sector: query.get('sector'), region: query.get('region'), country: query.get('country'),
    view: query.get('view'), powertrain: query.get('powertrain'), body: query.get('body'),
    compare: query.get('compare'),
  }, countriesByRegion);
}

/** Return a copy, preserving the route, fragment and parameters owned by other features. */
export function writeIndustryFeatureState(url: URL, state: IndustryFeatureState): URL {
  const next = new URL(url);
  // The reader/controller validates country membership against its sector catalog.
  // Do not apply the automotive fallback catalog here to another sector's scope.
  const fields = normalizeIndustryFeatureState(state, () => isGeographyCode(state.country) ? [state.country] : []);
  next.searchParams.set('sector', fields.sector);
  next.searchParams.set('region', fields.region);
  next.searchParams.set('country', fields.country);
  next.searchParams.set('view', fields.view);
  next.searchParams.set('powertrain', fields.powertrain);
  next.searchParams.set('body', fields.body);
  next.searchParams.set('compare', fields.compare ? '1' : '0');
  return next;
}
