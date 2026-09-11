import { compareDatedPublicIds } from "../dates.ts";

export const searchArrayKeys = ["topic", "country", "region", "theme", "kind"] as const;
export type SearchArrayKey = (typeof searchArrayKeys)[number];
export type TopicMode = "any" | "all";
export type SearchSort = "relevance" | "latest" | "updated";

export interface SearchState {
  q: string;
  topic: string[];
  country: string[];
  region: string[];
  theme: string[];
  kind: string[];
  topicMode: TopicMode;
  sort: SearchSort;
  page: number;
}

export type SearchAllowedValues = Record<SearchArrayKey, ReadonlySet<string>>;

export interface SearchStateResult {
  state: SearchState;
  notices: string[];
}

export interface SearchableEntry {
  publicId: string;
  url: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  topics: string[];
  countries: string[];
  regions: string[];
  themeIds: string[];
  kind: "article" | "theme" | "atlas";
}

export const emptySearchState = (): SearchState => ({
  q: "",
  topic: [],
  country: [],
  region: [],
  theme: [],
  kind: [],
  topicMode: "any",
  sort: "relevance",
  page: 1
});

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function parseSearchState(
  input: string | URLSearchParams,
  allowed: SearchAllowedValues,
  maxSelections = 10
): SearchStateResult {
  const params = typeof input === "string"
    ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
    : input;
  const state = emptySearchState();
  const notices: string[] = [];

  const rawQuery = params.get("q") ?? "";
  state.q = rawQuery.slice(0, 200);
  if (rawQuery.length > 200) notices.push("キーワードは先頭200文字までを使用しました。");

  for (const key of searchArrayKeys) {
    const raw = unique(params.getAll(key).filter(Boolean));
    const recognized = raw.filter((value) => allowed[key].has(value));
    const unknownCount = raw.length - recognized.length;
    if (unknownCount > 0) notices.push(`${key}の未登録値${unknownCount}件を無視しました。`);
    if (recognized.length > maxSelections) notices.push(`${key}は先頭${maxSelections}件までを使用しました。`);
    state[key] = recognized.slice(0, maxSelections);
  }

  const topicMode = params.get("topicMode");
  if (topicMode === "all" || topicMode === "any") state.topicMode = topicMode;
  else if (topicMode) notices.push("分野の一致方法を初期値に戻しました。");

  const sort = params.get("sort");
  if (sort === "latest" || sort === "updated" || sort === "relevance") state.sort = sort;
  else if (sort) notices.push("並び順を初期値に戻しました。");

  const rawPage = params.get("page");
  const page = rawPage === null ? 1 : Number(rawPage);
  if (Number.isSafeInteger(page) && page > 0) state.page = page;
  else if (rawPage !== null) notices.push("ページ番号を1に戻しました。");

  return { state, notices };
}

export function serializeSearchState(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q.slice(0, 200));
  for (const key of searchArrayKeys) {
    for (const value of [...new Set(state[key])].sort()) params.append(key, value);
  }
  if (state.topicMode === "all") params.set("topicMode", "all");
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

function overlaps(selected: readonly string[], actual: readonly string[]): boolean {
  return selected.length === 0 || selected.some((value) => actual.includes(value));
}

export function matchesSearchFilters(entry: SearchableEntry, state: SearchState): boolean {
  const topicMatches = state.topic.length === 0
    || (state.topicMode === "all"
      ? state.topic.every((value) => entry.topics.includes(value))
      : overlaps(state.topic, entry.topics));

  return topicMatches
    && overlaps(state.country, entry.countries)
    && overlaps(state.region, entry.regions)
    && overlaps(state.theme, entry.themeIds)
    && overlaps(state.kind, [entry.kind]);
}

export function normalizeSearchUrl(value: string, origin = "https://example.invalid"): string {
  try {
    const url = new URL(value, origin);
    return url.pathname.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  } catch {
    return value.split(/[?#]/)[0].replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  }
}

export function sortSearchEntries(
  entries: readonly SearchableEntry[],
  sort: SearchSort,
  relevanceOrder?: ReadonlyMap<string, number>
): SearchableEntry[] {
  return [...entries].sort((left, right) => {
    if (sort === "relevance" && relevanceOrder) {
      const rank = (relevanceOrder.get(normalizeSearchUrl(left.url)) ?? Number.MAX_SAFE_INTEGER)
        - (relevanceOrder.get(normalizeSearchUrl(right.url)) ?? Number.MAX_SAFE_INTEGER);
      if (rank !== 0) return rank;
    }
    return sort === "updated"
      ? compareDatedPublicIds(left.updatedAt, left.publicId, right.updatedAt, right.publicId)
      : compareDatedPublicIds(left.publishedAt, left.publicId, right.publishedAt, right.publicId);
  });
}
