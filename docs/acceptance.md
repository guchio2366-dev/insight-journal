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
- North America uses the shared MapLibre renderer. The approved reference remains
  an art-direction reference, not a source of geographic coordinates or boundaries.
  Natural Earth base geography/relief and USDA-derived crop regions share WGS84;
  relief is reprojected to Mercator. Sources, years, processing and hashes are recorded.
- Agriculture regions cross state boundaries. No state production choropleth,
  invented crop figures, or inherited image-pixel picking polygons are used.
- Initial full CONUS extent and short field tabs fit together at 390×844,
  844×390, 820×1180, 1180×820 and 1280×800. Compare document scrollWidth to
  clientWidth (not innerWidth, which can hide scrollbar-sized overflow).
- A field switch only changes layer visibility, preserving the camera and one map.
  Crop selection also works from the accessible legend. Detail links lead below
  the map; the redundant regional index and map/report tabs are not rendered.
- WebGL2/critical-load failure shows a self-hosted alternative figure and readable
  prose. Failure notices must not cover the map's southern edge. The alternative
  image has a full-resolution link. Unavailable fields are visibly in preparation.

Record browser viewport checks separately from physical iPhone/iPad and Safari.
The current cloud browser lacks WebGL2: fallback screenshots are not proof of
successful GPU map rendering, live-camera behavior or polygon picking. Keep that
limitation explicit. Passing automated checks alone is not a visual acceptance decision.
