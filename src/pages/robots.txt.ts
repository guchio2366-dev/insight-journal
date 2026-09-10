import type { APIRoute } from "astro";
import { withBase } from "../lib/urls";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const siteRoot = site ?? new URL("https://guchio2366-dev.github.io");
  const sitemap = new URL(withBase("/sitemap.xml"), siteRoot).href;
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
