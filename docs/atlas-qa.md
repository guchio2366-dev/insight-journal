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
