import censusData from '../../public/assets/atlas/europe/population-cases-v1/cases.json' with { type: 'json' };
import type { PopulationCensusCasePackage, PopulationCaseChoiceKind, PopulationCaseTopic } from '../data/atlas/europe/population-cases';

export type EuropeCultureCompositionSegment = {
  id: string;
  label: string;
  count: number;
  /** Original count / this topic's published all-resident total, without rescaling. */
  share: number;
  color: string;
  sourceCategoryIds: string[];
  /** Original English or bilingual source labels, in sourceCategoryIds order. */
  sourceLabels: string[];
};
export type EuropeCultureComposition = {
  id: string;
  caseId: string;
  code: string;
  name: string;
  /** Display anchors only: not census centroids or locations of individual responses. */
  coordinates: [number, number];
  year: number;
  referenceDate: string;
  denominator: number;
  sourceURL: string;
  segments: EuropeCultureCompositionSegment[];
};

/** Qualitative category colours; neither order nor colour encodes a quantity. */
export const europeCultureCompositionColors = [
  '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462',
  '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f',
] as const;

type Group = { id: string; label: string; sourceCategoryIds: string[] };
const group = (id: string, label: string, sourceCategoryIds = [id]): Group => ({ id, label, sourceCategoryIds });
const targets = [
  { caseId: 'england-wales-2021', code: 'E92000001', name: 'イングランド', coordinates: [-1.5, 52.5] as [number, number] },
  { caseId: 'england-wales-2021', code: 'W92000004', name: 'ウェールズ', coordinates: [-3.8, 52.2] as [number, number] },
  { caseId: 'croatia-national-2021', code: 'HRV', name: 'クロアチア', coordinates: [16, 45.3] as [number, number] },
];

const englishEthnicityGroups = [
  group('ts021-01', 'アジア系'),
  group('ts021-07', '黒人系・カリブ系・アフリカ系'),
  group('ts021-11', '混合・複数の民族的帰属'),
  group('ts021-16', '白人'),
  group('ts021-22', 'その他の民族的帰属'),
];
const croatianEthnicityGroups = [
  group('hr-ethnicity-H', 'クロアチア人'),
  group('hr-ethnicity-AP', 'セルビア人'),
  group('hr-ethnicity-other-responses', 'その他の民族回答（22分類合計）',
    ['J', 'L', 'N', 'P', 'R', 'T', 'V', 'X', 'Z', 'AB', 'AD', 'AF', 'AH', 'AJ', 'AL', 'AN', 'AR', 'AT', 'AV', 'AX', 'AZ', 'BB'].map(suffix => `hr-ethnicity-${suffix}`)),
  group('hr-ethnicity-BD', '地域的帰属での回答'),
  group('hr-ethnicity-BF', '宗教的帰属での回答'),
  group('hr-ethnicity-BH', '分類不能'),
  group('hr-ethnicity-BJ', '未申告'),
  group('hr-ethnicity-BL', '不明'),
];
const religiousLabels: Record<string, string> = {
  'ts030-01': '無宗教',
  'ts030-02': 'キリスト教',
  'ts030-03': '仏教',
  'ts030-04': 'ヒンドゥー教',
  'ts030-05': 'ユダヤ教',
  'ts030-06': 'イスラム教',
  'ts030-07': 'シク教',
  'ts030-08': 'その他の宗教',
  'ts030-09': '未回答',
  'hr-religion-H': 'カトリック',
  'hr-religion-J': '正教会',
  'hr-religion-L': 'プロテスタント',
  'hr-religion-N': 'その他のキリスト教徒（原表注1）',
  'hr-religion-P': 'イスラム教',
  'hr-religion-R': 'ユダヤ教',
  'hr-religion-T': '東洋の宗教（原分類）',
  'hr-religion-V': 'その他の宗教・運動・人生哲学',
  'hr-religion-X': '不可知論者・懐疑論者',
  'hr-religion-Z': '無宗教・無神論者',
  'hr-religion-AB': '未申告',
  'hr-religion-AD': '不明',
};

function groupsFor(caseId: string, topic: PopulationCaseTopic): Group[] {
  if (topic.kind === 'ethnicity') return caseId === 'england-wales-2021' ? englishEthnicityGroups : croatianEthnicityGroups;
  return topic.partitionCategoryIds.map(id => group(id, religiousLabels[id] ?? topic.categories.find(category => category.id === id)?.label ?? id));
}

/** Validate the partition by source IDs, never by selecting the largest responses. */
function validGroups(topic: PopulationCaseTopic, groups: Group[]): boolean {
  if (!groups.length || !topic.partitionCategoryIds.length) return false;
  const leaves: string[] = [];
  for (const item of groups) for (const id of item.sourceCategoryIds) {
    const category = topic.categories.find(value => value.id === id);
    if (!category) return false;
    leaves.push(...(category.level === 'aggregate'
      ? topic.categories.filter(value => value.parentId === id && topic.partitionCategoryIds.includes(value.id)).map(value => value.id)
      : [id]));
  }
  return leaves.length === topic.partitionCategoryIds.length
    && new Set(leaves).size === leaves.length
    && topic.partitionCategoryIds.every(id => leaves.includes(id));
}

/**
 * Three separately published country/territory totals, never sums of LAD rows.
 * Every overview uses the full source partition; no winner or majority is chosen.
 * The model supplies no radius/area encoding: its symbols show composition only.
 * A missing country/count or invalid denominator omits that composition rather
 * than inventing a zero, filling a response or substituting a local-area total.
 */
export function europeCultureCompositions(
  kind: PopulationCaseChoiceKind,
  data: PopulationCensusCasePackage = censusData as PopulationCensusCasePackage,
): EuropeCultureComposition[] {
  const compositions: EuropeCultureComposition[] = [];
  for (const target of targets) {
    const censusCase = data.cases.find(value => value.id === target.caseId);
    const topic = censusCase?.topics.find(value => value.kind === kind);
    const country = topic?.countries.find(value => value.code === target.code);
    if (!topic || !country || !Number.isSafeInteger(country.denominator) || country.denominator <= 0) continue;
    const groups = groupsFor(target.caseId, topic);
    if (!validGroups(topic, groups)) continue;
    const segments: EuropeCultureCompositionSegment[] = [];
    for (const [index, item] of groups.entries()) {
      const categories = item.sourceCategoryIds.map(id => topic.categories.find(value => value.id === id)!);
      const counts = categories.map(category => country.counts[topic.categories.indexOf(category)]);
      if (!counts.every(count => Number.isSafeInteger(count) && count >= 0)) break;
      const count = counts.reduce((total, value) => total + value, 0);
      if (!Number.isSafeInteger(count)) break;
      segments.push({
        id: item.id, label: item.label, count, share: count / country.denominator * 100,
        color: europeCultureCompositionColors[index % europeCultureCompositionColors.length],
        sourceCategoryIds: [...item.sourceCategoryIds],
        sourceLabels: categories.map(category => category.sourceLabel ?? category.label),
      });
    }
    if (segments.length !== groups.length) continue;
    compositions.push({
      id: `${kind}-${target.code}`, caseId: target.caseId, code: target.code, name: target.name,
      coordinates: [...target.coordinates], year: topic.year, referenceDate: topic.censusDate,
      denominator: country.denominator, sourceURL: topic.sourceURL, segments,
    });
  }
  return compositions;
}
