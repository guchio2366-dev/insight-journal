import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { withBase } from "../lib/urls";
import { agricultureField } from "../data/atlas/north-america-agriculture";
import { regionalMaps } from "../data/atlas/regional-atlas";

export const prerender = true;

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[character] ?? character);
}

export const GET: APIRoute = async ({ site }) => {
  const siteRoot = site ?? new URL("https://guchio2366-dev.github.io");
  const [articles, themes] = await Promise.all([
    getCollection("articles"),
    getCollection("publicThemes")
  ]);
  const absolute = (path: string) => new URL(withBase(path), siteRoot).href;
  const pages = [
    { loc: absolute("/"), lastmod: undefined },
    { loc: absolute("/search/"), lastmod: undefined },
    { loc: absolute("/themes/"), lastmod: undefined },
    { loc: absolute("/about/"), lastmod: undefined },
    { loc: absolute("/atlas/"), lastmod: agricultureField.updatedAt.slice(0, 10) },
    { loc: absolute("/atlas/oceania/"), lastmod: "2026-09-25" },
    { loc: absolute("/atlas/europe/"), lastmod: "2026-09-25" },
    { loc: absolute("/atlas/africa/"), lastmod: "2026-09-25" },
    { loc: absolute("/atlas/europe/nature/"), lastmod: "2026-09-25" },
    { loc: absolute("/atlas/europe/agriculture/"), lastmod: "2026-09-25" },
    ...["agriculture", "nature", "industry", "population"].map(field => ({
      loc: absolute(`/atlas/latin-america/${field}/`), lastmod: "2026-09-25"
    })),
    ...Object.values(regionalMaps).map(map => ({ loc: absolute(map.href), lastmod: "2026-09-25" })),
    { loc: absolute("/atlas/north-america/"), lastmod: agricultureField.updatedAt.slice(0, 10) },
    { loc: absolute("/atlas/north-america/agriculture/"), lastmod: agricultureField.updatedAt.slice(0, 10) },
    { loc: absolute("/atlas/north-america/agriculture/report/"), lastmod: agricultureField.updatedAt.slice(0, 10) },
    ...articles.map((entry) => ({
      loc: absolute(`/articles/${entry.data.slug}/`),
      lastmod: entry.data.updatedAt.slice(0, 10)
    })),
    ...themes.map((entry) => ({
      loc: absolute(`/themes/${entry.data.slug}/`),
      lastmod: entry.data.updatedAt.slice(0, 10)
    }))
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(({ loc, lastmod }) => [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      "  </url>"
    ].join("\n")),
    "</urlset>"
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
