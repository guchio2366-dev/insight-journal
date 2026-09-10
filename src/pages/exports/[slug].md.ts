import { getCollection, type CollectionEntry } from "astro:content";
import type { APIRoute } from "astro";
import { sortTimelineEvents } from "../../components/timeline";
import { countryLabels, regions, topics } from "../../data/taxonomy";
import { withBase } from "../../lib/urls";

export const prerender = true;

export async function getStaticPaths() {
  const articles = await getCollection("articles");
  return articles.map((entry) => ({ params: { slug: entry.data.slug }, props: { entry } }));
}

interface Props {
  entry: CollectionEntry<"articles">;
}

function markdownText(value: string): string {
  return value.replace(/([\\`*_[\]<>])/g, "\\$1");
}

function markdownInline(value: string): string {
  return markdownText(value.replace(/\s+/g, " ").trim());
}

export const GET: APIRoute = ({ props, site }) => {
  const { entry } = props as Props;
  const siteRoot = site ?? new URL("https://guchio2366-dev.github.io");
  const articleUrl = new URL(withBase(`/articles/${entry.data.slug}/`), siteRoot).href;
  const sourceUrls = new Map(entry.data.sources.map((source) => [source.id, source.url]));
  const exportedBody = (entry.body ?? "").replace(
    /\[([^\]]+)\]\(#source-(s[1-9]\d*)\)/g,
    (original, label: string, sourceId: string) => {
      const sourceUrl = sourceUrls.get(sourceId);
      return sourceUrl ? `[${markdownInline(label)}](<${sourceUrl}>)` : original;
    }
  );
  const lines = [
    `# ${markdownInline(entry.data.title)}`,
    "",
    markdownInline(entry.data.summary),
    "",
    `公開日: ${entry.data.publishedAt.slice(0, 10)}`,
    `更新日: ${entry.data.updatedAt.slice(0, 10)}`,
    `公開版: Revision ${entry.data.revision}`,
    `掲載ページ: ${articleUrl}`,
    `分野: ${entry.data.topics.map((slug) => topics[slug]).join("、")}`,
    ...(entry.data.regions.length ? [`地域: ${entry.data.regions.map((slug) => regions[slug]).join("、")}`] : []),
    ...(entry.data.countries.length ? [`国: ${entry.data.countries.map((code) => countryLabels[code] ?? code).join("、")}`] : []),
    "",
    exportedBody.trim(),
    ""
  ];

  if (entry.data.geography.mode === "map") {
    const imageUrl = new URL(withBase(`/${entry.data.geography.image.path}`), siteRoot).href;
    lines.push(
      "## 地図",
      "",
      `![${markdownInline(entry.data.geography.image.alt)}](<${imageUrl}>)`,
      "",
      markdownInline(entry.data.geography.caption),
      `基図: [${markdownInline(entry.data.geography.baseMap.name)}](<${entry.data.geography.baseMap.sourceUrl}>)`,
      ""
    );
  }

  if (entry.data.timeline.length > 0) {
    lines.push("## 短い年表", "");
    for (const event of sortTimelineEvents(entry.data.timeline)) {
      const citations = event.sourceIds
        .map((sourceId) => {
          const sourceUrl = sourceUrls.get(sourceId);
          return sourceUrl ? `[${sourceId.toUpperCase()}](<${sourceUrl}>)` : sourceId.toUpperCase();
        })
        .join("、");
      lines.push(`- **${markdownInline(event.dateLabel)} — ${markdownInline(event.title)}**: ${markdownInline(event.description)}${citations ? `（出典: ${citations}）` : ""}`);
    }
    lines.push("");
  } else if (entry.data.timelineOmissionReason) {
    lines.push("## 短い年表", "", markdownInline(entry.data.timelineOmissionReason), "");
  }

  if (entry.data.sources.length > 0) {
    lines.push("## 出典", "");
    for (const source of entry.data.sources) {
      const published = source.publishedOn ? `、公開 ${source.publishedOn.slice(0, 10)}` : "";
      const locator = source.locator ? `、${markdownInline(source.locator)}` : "";
      const verification = source.verification === "unconfirmed" ? "、原典未照合" : "";
      lines.push(`- **${source.id.toUpperCase()}** [${markdownInline(source.title)}](<${source.url}>) — ${markdownInline(source.publisher)}${published}、確認 ${source.accessedOn.slice(0, 10)}${locator}${verification}`);
    }
    lines.push("");
  }

  lines.push("---", "", "Insight Journal掲載内容から生成した公開用Markdownです。", "");
  return new Response(`${lines.join("\n").replace(/\n{3,}/g, "\n\n")}`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entry.data.slug}.md"`
    }
  });
};
