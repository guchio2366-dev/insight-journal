import source from './industry-international.json';

type ExportVolume = {
  id: 'exports'; label: string; value: number; sourceDisplay: string;
  unit: 'million-barrels-per-day'; denominator: null; definition: string;
};
type ExportShare = {
  id: 'us-share' | 'alberta-share'; label: string; value: number; sourceDisplay: string;
  unit: 'percent'; denominator: string; definition: string;
};
export type CanadaIndustryInternationalIndicator = ExportVolume | ExportShare;
export type CanadaIndustryInternationalEvidence = {
  schemaVersion: 1; id: string; title: string; geography: string;
  source: {
    publisher: string; title: string; url: string; referenceYear: number;
    publishedAt: string; accessedAt: string; edition: string; method: string; underlyingSource: string;
  };
  indicators: [ExportVolume, ExportShare, ExportShare];
  reading: string;
  readingSource: {publisher: string; title: string; url: string; accessedAt: string; scope: string};
  focus: {sector: 'resources'; subsector: 'oil-gas'; province: 'Alberta'; label: string};
  scopeNote: string; roundingNote: string;
};

/** Reject a mismatched unit, denominator or product before the source enters the UI. */
export function parseCanadaIndustryInternationalEvidence(value: unknown): CanadaIndustryInternationalEvidence {
  const data = value as CanadaIndustryInternationalEvidence;
  const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
  const date = (v: unknown) => nonempty(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const cerUrl = (v: unknown) => nonempty(v) && v.startsWith('https://www.cer-rec.gc.ca/');
  if (!data || data.schemaVersion !== 1 || data.id !== 'canada-crude-oil-exports-2024'
    || !nonempty(data.title) || !nonempty(data.geography) || !data.source
    || data.source.referenceYear !== 2024 || !cerUrl(data.source.url)
    || !date(data.source.publishedAt) || !date(data.source.accessedAt)
    || !['publisher', 'title', 'edition', 'method', 'underlyingSource'].every(k => nonempty(data.source[k as keyof typeof data.source]))
    || !Array.isArray(data.indicators) || data.indicators.length !== 3) {
    throw new Error('Invalid Canada crude-oil source metadata');
  }
  for (const [index, metric] of data.indicators.entries()) {
    if (!metric || metric.id !== ['exports', 'us-share', 'alberta-share'][index]
      || !Number.isFinite(metric.value) || metric.value < 0
      || !nonempty(metric.label) || !nonempty(metric.sourceDisplay) || !nonempty(metric.definition)
      || (index === 0
        ? metric.unit !== 'million-barrels-per-day' || metric.denominator !== null
        : metric.unit !== 'percent' || metric.value > 100 || !nonempty(metric.denominator))) {
      throw new Error('Invalid Canada crude-oil indicator unit or denominator');
    }
  }
  if (!data.focus || data.focus.sector !== 'resources' || data.focus.subsector !== 'oil-gas'
    || data.focus.province !== 'Alberta' || !nonempty(data.focus.label)
    || !data.readingSource || !cerUrl(data.readingSource.url) || !date(data.readingSource.accessedAt)
    || !['publisher', 'title', 'scope'].every(k => nonempty(data.readingSource[k as keyof typeof data.readingSource]))
    || ![data.reading, data.scopeNote, data.roundingNote].every(nonempty)) {
    throw new Error('Invalid Canada crude-oil reading or geographic scope');
  }
  return data;
}

export const canadaIndustryInternational = parseCanadaIndustryInternationalEvidence(source);

export function formatCanadaIndustryInternationalIndicator(metric: CanadaIndustryInternationalIndicator) {
  return metric.unit === 'million-barrels-per-day'
    ? {value: (metric.value * 100).toLocaleString('ja-JP', {maximumFractionDigits: 1}), unit: '万バレル／日'}
    : {value: metric.value.toLocaleString('ja-JP'), unit: '%'};
}

export function showCanadaIndustryInternational(sector: string, subsector: string, province: string | null) {
  return (!province || province === 'Alberta')
    && (sector === 'all' || (sector === 'resources' && ['all', 'oil-gas'].includes(subsector)));
}
