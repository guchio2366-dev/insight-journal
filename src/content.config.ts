import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { regions, topics } from "./data/taxonomy";
import {
  ARTICLE_ID_PATTERN,
  isPublicDateString,
  PUBLIC_ID_PATTERN,
  SHA256_PATTERN,
  SLUG_PATTERN,
  SOURCE_ID_PATTERN,
  THEME_ID_PATTERN,
  validatePublicFrontmatter
} from "./lib/contracts/public";

const topicSlugs = Object.keys(topics) as [keyof typeof topics, ...(keyof typeof topics)[]];
const regionSlugs = Object.keys(regions) as [keyof typeof regions, ...(keyof typeof regions)[]];
const isUnique = <Value>(items: readonly Value[]) => new Set(items).size === items.length;
const publicDate = z.string().refine(isPublicDateString, "実在するISO日付またはUTC日時が必要です");

const historicalDate = z.object({
  year: z.number().int().min(-9999).max(9999).refine((year) => year !== 0, "0年は使用できません"),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional()
}).strict().refine((date) => date.day === undefined || date.month !== undefined, "日を指定する場合は月が必要です");

const sourceIds = z.array(z.string().regex(SOURCE_ID_PATTERN)).refine(isUnique, "重複値は指定できません");
const source = z.object({
  id: z.string().regex(SOURCE_ID_PATTERN),
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(160),
  url: z.string().url().startsWith("https://"),
  publishedOn: publicDate.nullable(),
  accessedOn: publicDate,
  locator: z.string().trim().min(1).max(300).nullable(),
  verification: z.enum(["confirmed", "unconfirmed"])
}).strict();

const geography = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("none"),
    reason: z.string().trim().min(1).max(300)
  }).strict(),
  z.object({
    mode: z.literal("map"),
    caption: z.string().trim().min(1).max(180),
    alt: z.string().trim().min(1).max(300),
    bounds: z.object({
      west: z.number().finite().min(-180).max(180),
      south: z.number().finite().min(-90).max(90),
      east: z.number().finite().min(-180).max(180),
      north: z.number().finite().min(-90).max(90)
    }).strict(),
    points: z.array(z.object({
      label: z.string().trim().min(1).max(80),
      longitude: z.number().finite().min(-180).max(180),
      latitude: z.number().finite().min(-90).max(90),
      sourceIds
    }).strict()).max(20),
    highlightCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).refine(isUnique, "重複値は指定できません"),
    baseMap: z.object({
      name: z.string().trim().min(1).max(120),
      scale: z.string().trim().min(1).max(40),
      version: z.string().trim().min(1).max(40),
      sourceUrl: z.string().url().startsWith("https://"),
      sha256: z.string().regex(SHA256_PATTERN)
    }).strict(),
    image: z.object({
      path: z.string().regex(/^assets\/[at]-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{12}\.png$/),
      sha256: z.string().regex(SHA256_PATTERN),
      width: z.number().int().min(800).max(10_000),
      height: z.number().int().min(450).max(10_000),
      bytes: z.number().int().min(1).max(4_999_999),
      alt: z.string().trim().min(1).max(300)
    }).strict()
  }).strict()
]);

const timelineEvent = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  dateLabel: z.string().trim().min(1).max(40),
  start: historicalDate.nullable(),
  end: historicalDate.nullable(),
  precision: z.enum(["day", "month", "year", "range", "approximate", "unknown"]),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(180),
  sourceIds
}).strict();

const publicEntrySchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.enum(["article", "theme"]),
  publicId: z.string().regex(PUBLIC_ID_PATTERN),
  slug: z.string().regex(SLUG_PATTERN),
  title: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(300),
  topics: z.array(z.enum(topicSlugs)).min(1).refine(isUnique, "重複値は指定できません"),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).refine(isUnique, "重複値は指定できません"),
  regions: z.array(z.enum(regionSlugs)).refine(isUnique, "重複値は指定できません"),
  themeIds: z.array(z.string().regex(THEME_ID_PATTERN)).refine(isUnique, "重複値は指定できません"),
  publishedAt: publicDate,
  updatedAt: publicDate,
  revision: z.number().int().min(1),
  sources: z.array(source).refine((items) => new Set(items.map(({ id }) => id)).size === items.length, "出典IDは一意にします"),
  geography,
  timeline: z.array(timelineEvent).max(15).refine((items) => new Set(items.map(({ id }) => id)).size === items.length, "年表IDは一意にします"),
  timelineOmissionReason: z.string().trim().min(1).max(300).nullable(),
  relatedPublicIds: z.array(z.string().regex(ARTICLE_ID_PATTERN)).max(6).refine(isUnique, "重複値は指定できません"),
  changeNote: z.string().trim().min(1).max(300).nullable()
}).strict().superRefine((entry, context) => {
  for (const issue of validatePublicFrontmatter(entry)) {
    context.addIssue({ code: "custom", message: `${issue.path}: ${issue.message}` });
  }
});

const articles = defineCollection({
  loader: glob({ base: "./src/content/articles", pattern: "**/*.md" }),
  schema: publicEntrySchema.refine((entry) => entry.kind === "article", "articleコレクションではkind=articleが必要です")
});

const publicThemes = defineCollection({
  loader: glob({ base: "./src/content/themes", pattern: "**/*.md" }),
  schema: publicEntrySchema.refine((entry) => entry.kind === "theme", "themeコレクションではkind=themeが必要です")
});

export const collections = { articles, publicThemes };
