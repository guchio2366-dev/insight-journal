import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { withBase } from "../lib/urls";

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
