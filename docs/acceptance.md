# Acceptance checks

The pre-deployment gate requires all checks that can run without making the site
public.

- A one-instruction save can be read back by page ID.
- Reusing an operation ID does not create a second note or revision.
- Important utterances keep speaker and verbatim/summary status.
- Theme relations are reciprocal and revision snapshots remain immutable.
- Unknown fields, raw HTML, unsafe URLs, broken source references, and invalid
  map metadata fail validation.
- Synthetic fixtures include at least 12 articles and 3 themes, conflict plus
  religion, agriculture, BCE, ranges, unknown dates, and duplicate display titles.
- Search implements within-filter OR, cross-filter AND, topic all/any mode, URL
  state restoration, paging, and clear loading/empty/error states.
- Generated output has no private sentinel, Notion identifier or URL, ChatGPT share
  URL, credential-like value, or unpublished title.
- Top, article, theme, search, map, 404, Pagefind, and release-manifest paths work
  under `/insight-journal/`.
- At 390, 820, and 1,280 pixels, the page has no global horizontal overflow; wide
  tables scroll within their own container.

Deployment checks, the final public URL, and physical iPhone/iPad/PC checks remain
pending until the owner approves launch.

