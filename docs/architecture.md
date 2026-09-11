# Architecture

## Purpose

The system separates private thinking from public reading.

1. A conversation produces a private note and selected important utterances.
2. Notion keeps notes, themes, immutable revision snapshots, and publication
   records.
3. A publication request creates a new public payload from an allowlist. A private
   page is never copied wholesale.
4. This repository builds the approved payload into static HTML, map images, a
   short timeline, and a Japanese Pagefind index.
5. GitHub Pages can serve the built files after a separate, explicit launch step.

No server, runtime database, paid search service, or client-side Notion connection
is required. Published pages remain readable if Notion is unavailable.

## Runtime boundary

| Area | Contains | Must not contain |
| --- | --- | --- |
| Private workspace | notes, quotations, hypotheses, revision snapshots, tool IDs | public deployment credentials |
| Publication transform | approved draft, public metadata, validation result | implicit access to a whole private page |
| Public repository | Astro code, approved Markdown, static images, synthetic tests | Notion IDs/URLs, raw conversations, unpublished notes |
| Browser | generated HTML/CSS/JS and Pagefind data | tokens, Notion requests, build-only state |

## Static routes

The production base path is `/insight-journal/`. Every internal link, asset URL,
search bundle URL, and 404 link must use the shared base-path helper.

| Route | Purpose |
| --- | --- |
| `/` | Site explanation, search entry, primary topics, newest articles |
| `/search/` | Japanese full-text search and filters |
| `/articles/{slug}/` | Article, map, timeline, sources, related articles |
| `/atlas/` | World-region entry point for map-led reading |
| `/atlas/north-america/` | North America field selector |
| `/atlas/north-america/agriculture/` | Approved crop-region map with interactive insight targets |
| `/atlas/north-america/agriculture/report/` | Agriculture background, method, limits, and sources |
| `/themes/` | Public themes with public article counts |
| `/themes/{slug}/` | Current public synthesis and related public articles |
| `/about/` | Editorial, source, independence, and update policy |
| `/404.html` | Recovery links that work under the base path |

## Cost model

The design needs no added recurring service: Notion Free is the private store,
the public repository contains only publishable material, GitHub Actions builds
the static files, and GitHub Pages is the intended host. A custom domain is
optional and is the only planned external recurring cost.
