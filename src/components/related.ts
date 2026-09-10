import { compareDatedPublicIds } from "../lib/dates.ts";

export interface RelatedArticleData {
  publicId: string;
  relatedPublicIds: string[];
  themeIds: string[];
  topics: string[];
  countries: string[];
  publishedAt: string;
}

export interface RelatedArticleCandidate {
  data: RelatedArticleData;
}

function intersectionCount(left: readonly string[], right: readonly string[]): number {
  const rightValues = new Set(right);
  return new Set(left.filter((value) => rightValues.has(value))).size;
}

/** Selects explicit relations first, then fills by shared theme and taxonomy. */
export function selectRelatedArticles<T extends RelatedArticleCandidate>(
  current: T,
  candidates: readonly T[],
  limit = 6
): T[] {
  if (limit <= 0) return [];
  const byId = new Map(candidates.map((candidate) => [candidate.data.publicId, candidate]));
  const selected: T[] = [];
  const seen = new Set([current.data.publicId]);

  for (const publicId of current.data.relatedPublicIds) {
    const candidate = byId.get(publicId);
    if (!candidate || seen.has(publicId)) continue;
    selected.push(candidate);
    seen.add(publicId);
    if (selected.length === limit) return selected;
  }

  const scored = candidates
    .filter((candidate) => !seen.has(candidate.data.publicId))
    .map((candidate) => ({
      candidate,
      sharedThemes: intersectionCount(current.data.themeIds, candidate.data.themeIds),
      sharedTopics: intersectionCount(current.data.topics, candidate.data.topics),
      sharedCountries: intersectionCount(current.data.countries, candidate.data.countries)
    }))
    .filter(({ sharedThemes, sharedTopics, sharedCountries }) => (
      sharedThemes > 0 || (sharedTopics > 0 && sharedCountries > 0)
    ))
    .sort((left, right) => {
      const themePriority = Number(right.sharedThemes > 0) - Number(left.sharedThemes > 0);
      if (themePriority !== 0) return themePriority;
      const combinedAffinity = (right.sharedTopics + right.sharedCountries) - (left.sharedTopics + left.sharedCountries);
      if (combinedAffinity !== 0) return combinedAffinity;
      if (right.sharedTopics !== left.sharedTopics) return right.sharedTopics - left.sharedTopics;
      if (right.sharedCountries !== left.sharedCountries) return right.sharedCountries - left.sharedCountries;
      return compareDatedPublicIds(
        left.candidate.data.publishedAt,
        left.candidate.data.publicId,
        right.candidate.data.publishedAt,
        right.candidate.data.publicId
      );
    });

  for (const { candidate } of scored) {
    selected.push(candidate);
    if (selected.length === limit) break;
  }
  return selected;
}
