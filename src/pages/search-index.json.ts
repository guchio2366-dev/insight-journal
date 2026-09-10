import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { countryLabels, regions, topics } from "../data/taxonomy";
import { compareDatedPublicIds } from "../lib/dates";
import { withBase } from "../lib/urls";

export const prerender = true;

export const GET: APIRoute = async () => {
  const [articles, themes] = await Promise.all([
    getCollection("articles"),
    getCollection("publicThemes")
  ]);
  const themeTitles = new Map(themes.map((theme) => [theme.data.publicId, theme.data.title]));

  const common = (entry: (typeof articles)[number] | (typeof themes)[number]) => ({
    publicId: entry.data.publicId,
    title: entry.data.title,
    summary: entry.data.summary,
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    topics: entry.data.topics,
    topicLabels: entry.data.topics.map((slug) => topics[slug]),
    countries: entry.data.countries,
    countryLabels: entry.data.countries.map((code) => countryLabels[code] ?? code),
    regions: entry.data.regions,
    regionLabels: entry.data.regions.map((slug) => regions[slug])
  });

  const entries = [
    ...articles.map((article) => ({
      ...common(article),
      kind: "article" as const,
      kindLabel: "記事",
      url: withBase(`/articles/${article.data.slug}/`),
      themeIds: article.data.themeIds,
      themeLabels: article.data.themeIds.map((id) => themeTitles.get(id)).filter(Boolean)
    })),
    ...themes.map((theme) => ({
      ...common(theme),
      kind: "theme" as const,
      kindLabel: "テーマ",
      url: withBase(`/themes/${theme.data.slug}/`),
      themeIds: [theme.data.publicId],
      themeLabels: [theme.data.title]
    }))
  ].sort((left, right) => compareDatedPublicIds(left.publishedAt, left.publicId, right.publishedAt, right.publicId));

  return new Response(JSON.stringify({ schemaVersion: 1, entries }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
};
