/** Census case contract. Category IDs have meaning only within their source topic/case. */
export type PopulationCaseTopicId = 'ts021' | 'ts030' | 'hr-ethnicity' | 'hr-religion';
export interface PopulationCaseCategory {
  id: string;
  sourceColumn: string;
  sourceLabel?: string;
  label: string;
  level: 'aggregate' | 'detail';
  parentId: string | null;
  responseKind: 'declared' | 'no-religion' | 'not-answered' | 'not-declared' | 'unknown';
}
export interface PopulationCaseArea {
  code: string;
  name: string;
  denominator: number;
  /** Original counts in exactly the categories array order. */
  counts: number[];
  /** Published leaf sum minus the published total; never corrected to zero. */
  detailSumDifference: number;
}
export interface PopulationCaseTopic {
  id: PopulationCaseTopicId;
  kind: 'ethnicity' | 'religion';
  title: string;
  titleJa: string;
  censusDate: string;
  year: number;
  unit: 'person';
  sourceVersion: string;
  issuedAt?: string;
  lastModifiedAt?: string;
  sourceURL: string;
  documentationURL: string;
  denominatorColumn: string;
  denominatorDefinition: string;
  categories: PopulationCaseCategory[];
  /** Mutually exclusive detailed responses, excluding overlapping published aggregates. */
  partitionCategoryIds: string[];
  areas: PopulationCaseArea[];
  /** Original country rows; not reconstructed by adding perturbed local counts. */
  countries: PopulationCaseArea[];
  definition: string;
  disclosureControl: string;
  sourceSheet?: string;
  sourceRow?: number;
  notes?: string[];
}
export interface PopulationCensusCase {
  id: string;
  title: string;
  titleJa: string;
  coverage: string;
  coverageJa: string;
  countryCodes: string[];
  /** Mixed grains must never be described as a uniform regional comparison. */
  grain: 'LAD' | 'national';
  geography: string;
  geographyCount: number;
  boundaryEdition: string;
  boundaryGeneralisation: string;
  sourceCRS: string;
  assetCRS: 'EPSG:4326';
  boundaryURL: string;
  geometryURL: string;
  licence: { name: string; url: string; boundaryPolicyURL: string };
  attribution: string[];
  adaptations: string;
  topics: PopulationCaseTopic[];
}
export interface PopulationCensusCasePackage {
  schemaVersion: 1;
  scope: string;
  cases: PopulationCensusCase[];
}
export type PopulationCaseChoiceKind = 'ethnicity' | 'religion';
export type PopulationCaseChoiceState = { cultureCase: string; cultureCategory: string; cultureArea: string };

/** Pure URL/UI choice normalisation. No map, DOM, project, history or data-fetch dependency. */
export function normalisePopulationCaseChoice(input: Partial<PopulationCaseChoiceState> | URLSearchParams, kind: PopulationCaseChoiceKind, data: PopulationCensusCasePackage): PopulationCaseChoiceState {
  const get = (key: keyof PopulationCaseChoiceState) => input instanceof URLSearchParams ? input.get(key) ?? '' : input[key] ?? '';
  const censusCase = data.cases.find(item => item.id === get('cultureCase'));
  if (!censusCase) return { cultureCase: '', cultureCategory: '', cultureArea: '' };
  const topic = censusCase.topics.find(item => item.kind === kind);
  if (!topic) throw new Error('Selected census case has no requested topic');
  return {
    cultureCase: censusCase.id,
    cultureCategory: topic.categories.some(item => item.id === get('cultureCategory')) ? get('cultureCategory') : '',
    cultureArea: topic.areas.some(item => item.code === get('cultureArea')) ? get('cultureArea') : '',
  };
}

export const europePopulationCases = {
  dataURL: '/assets/atlas/europe/population-cases-v1/cases.json',
  scopeLabel: '国勢調査の地域事例',
  coverageLabel: 'イングランド・ウェールズの行政区／クロアチアの全国値（2021年）',
  scopeNote: 'ヨーロッパ全域の民族・宗教分布ではありません。行政区と全国値を区別し、各国の自己申告分類と総人口の分母に沿って読みます。',
  caseIds: ['england-wales-2021', 'croatia-national-2021'],
  topics: [
    { id: 'ts021', label: '民族的帰属', definition: '国勢調査で回答者が自己申告した民族的帰属。大分類と細分類を重ねて合計しません。' },
    { id: 'ts030', label: '宗教的帰属', definition: '信仰や実践の有無とは別に、回答者が結びつきを感じる宗教。無宗教と未回答を区別します。' },
  ],
} as const;

/** Compute against this topic's all-resident denominator, with no renormalisation. */
export function populationCaseShare(area: PopulationCaseArea, topic: PopulationCaseTopic, categoryId: string): number | null {
  const index = topic.categories.findIndex(category => category.id === categoryId);
  if (index < 0 || !Number.isFinite(area.denominator) || area.denominator <= 0) return null;
  const count = area.counts[index];
  if (!Number.isFinite(count) || count < 0) return null;
  return count / area.denominator * 100;
}
