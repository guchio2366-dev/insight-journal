# Atlas QA — 2026-09-13

The responsive North America agriculture implementation was published through
the existing pull-request and GitHub Pages workflows. Hosting permissions,
publication/privacy settings, paid APIs and runtime servers were unchanged.

## Automated and data checks

- `npm run check` passed locally and in GitHub Actions.
- 47 unit tests cover existing publication safety plus data totals, commodity
  bases, 10-year production series, regional selection, URL validation and card
  placement fallback.
- 4 built-site tests cover atlas routes, national charts, five crop panels,
  planned-field behavior and public-content safety.
- The normalization script reproduced `statistics-generated.ts` byte for byte
  from the reviewed inputs. Destination parts equal their matching totals;
  receipt categories plus Other equal All Commodities; U.S. production shares
  recalculate from the corresponding PSD world totals.

## Browser measurements

`/atlas/qa/` rendered the same public page in same-origin iframes. These results
are CSS viewport checks in cloud Chrome, not physical devices or Safari.

| CSS viewport | Map and tabs visible | Horizontal overflow | National overview starts in initial viewport |
| --- | --- | --- | --- |
| iPhone portrait 390×844 | Yes | None | Yes |
| iPhone portrait 375×667 | Yes | None | Yes |
| iPhone landscape 844×390 | Yes | None | Below map after initial viewport |
| iPad portrait 820×1180 | Yes | None | Yes |
| iPad landscape 1180×820 | Yes | None | Yes, beside map |
| iPad landscape 1024×768 | Yes | None | Yes, beside map |
| PC 1280×800 | Yes | None | Yes, beside map |
| PC 1366×768 | Yes | None | Yes, beside map |

At 1180×820 the complete map, legend, cash-receipts chart and trade chart are
visible together. At 390×844 the reading order is map, optional selected-region
card, national overview and crop details. The map and text retain normal font
sizes rather than shrinking the whole interface.

Cloud Chrome reports no usable WebGL2, so the real MapLibre initialization
failure activated the self-hosted fallback. This verifies failure behavior but
does not prove GPU map drawing. The fallback retained the six-part legend and
content links. Selecting rice displayed one card directly below the fallback,
kept the national summary unchanged, selected the rice detail tab and produced
`crop=rice&stats=rice&view=fit` in the URL. The rice panel displayed its reviewed
explanation and export-destination composition.

## Publication evidence

- PR #12 validation run `34737567522`: success.
- Implementation merge `8cb4669c586bd4ef6ab97cf6754e6dbc743f3d1b`, Pages run
  `34737596266`: success.
- Landscape finishing PR #13 validation run `34737820907`: success.
- Final visual-code merge `45256ce6b05b705f648a1320a43e780e37698af8`, Pages run
  `34737858133`: success.
- The public review page showed the revised charts and layout after the final
  Pages run. The attached review screenshots were taken from that public build.

## Remaining verification boundary

Real iPhone/iPad Safari and a browser with WebGL2 remain unverified. Therefore
live polygon picking, GPU labels, pan/zoom camera preservation and map-overlay
card placement are supported by code and targeted unit tests, but are not
reported as real-device evidence. On a capable device, verify that a tapped
Midwest, Sacramento Valley and lower-Mississippi crop region receives the
matching note and that the overlay does not cover its selected area; if no safe
position remains, the same card must move below the map without a camera change.

Climate, soil and industry remain planned peer fields. Region-specific wind and
water explanations are editorial notes tied to reviewed sources; they are not
presented as completed quantitative layers.

## Crop and livestock integration, 2026-09-13

- The national receipts chart now shows the Crop/Livestock parent split and 11
  crop plus 5 livestock child categories, each with its denominator stated.
- Crop and livestock checkboxes independently control the shared agriculture
  map. Both are on initially and their state, livestock selection and camera are
  represented in the URL.
- Fifteen livestock representative points cover five reviewed categories.
  Collision groups open a tappable candidate list instead of hiding an item.
- Two 6 KB SVG fallbacks cover crop-plus-livestock and livestock-only states.
  They carry the same non-quantitative point semantics as the interactive map.
- The completed build and browser measurements for this revision are recorded
  below. Physical iPhone/iPad Safari remains a separate user-device check.

The public CSS-device harness reported no horizontal overflow, a complete map,
visible field tabs and a visible national overview at both 390×844 and
1180×820. At 1180×820 the map and the Crop/Livestock parent and child receipt
charts are visible side by side; the trade chart follows in the same fixed
national column. At 390×844 the order is map, national overview, detailed crop
and livestock reading.

Cloud Chrome again had no usable WebGL2, so it exercised the layered fallback.
The published base retained terrain, rivers, states and crops while the
transparent livestock SVG remained aligned above it. Unchecking Crops changed
the base to land and preserved livestock; unchecking Livestock hid only the
symbol overlay. Both states were reflected in `agriLayers` in the iframe URL.
Saved crop or livestock selections render their explanation below the fallback.

- PR #15 validation run `34743966800`: success; implementation merge
  `d213a465dcfcb5142c2b39ec8370e31ca205aed2`; Pages run `34744014057`: success.
- Public QA caught an external-image limitation in the first SVG fallback.
  PR #17 validation run `34744296145`: success; fallback fix merge
  `ae59fc44d5888f76c6a87bb3d3f0c66c6cc9ca24`; Pages run `34744326539`: success.

## Natural environment lightweight implementation, 2026-09-13

- The four views, 12 NOAA climate diagrams, currents, selection cards and shared
  agriculture camera/state remain in place.
- Public contour delivery is fixed to the national 500 m interval gzip. It is
  requested and assigned to the MapLibre source once per session; pan, zoom and
  field/tab round trips do not request or reassign it.
- The 62 regional 100 m/250 m files retain their bytes, SHA-256 and Git Blob SHA
  under `data/derived/nature-v1/contours-detail/`. They are excluded from `public`
  and `dist`, reducing the published static files by 24,100,067 bytes including
  the former index.
- Local checks cover 58 unit tests and 8 controller/built-site tests. The build
  and release-boundary verification pass, including a clean-output guard so
  removed assets cannot remain in an older `dist` directory.
- Controller checks use the real application code with MapLibre's GPU boundary
  mocked. Physical iPhone/iPad Safari, GPU rendering and measured first-load
  timing remain separate post-publication checks.
