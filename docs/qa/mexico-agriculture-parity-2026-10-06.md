# Mexico agriculture parity review

Updated: 2026-10-06 04:43 UTC. Status: draft, browser correction in progress.

## Scope and candidate

- Review PR: https://github.com/guchio2366-dev/insight-journal/pull/193
- Code candidate: `6299fa4d9d704287ca9828a6cbfa1a136cd16c09`
- Baseline: `c69b3c9ff3491f0ee2d921876812fbceb2297d81`
- Validation run: https://github.com/guchio2366-dev/insight-journal/actions/runs/37412003942
- Main implementation: `MexicoAgriculturePage.astro`, `atlas-mexico-agriculture-atlas.ts`, and `atlas-mexico-agriculture-atlas-state.ts`.
- This change covers Mexico agriculture and forestry. It preserves the existing Canada implementation and other Mexico fields. The nature helper changes only the bounded context for existing agriculture comparison returns.

The reference is the actual US `AtlasExplorer.astro` agriculture workspace, not the older `AtlasMap.astro` illustration.

## Acceptance criteria

1. Terrain and rivers form the geographic base. Crop colors show sourced areas; livestock badges show sourced representative locations. State quantity circles are not the primary map.
2. Crop/livestock checkboxes sit at upper left, All/zoom controls at upper right, and selectable crop/livestock/forestry keys below the map.
3. Reading order is national overview, agriculture overview, monetary composition, then selected-product reading and related statistics.
4. All crop and livestock entries, forestry, region selection, state statistics, layer visibility, zoom/pan, repeat selection, Escape, overview return, reload, and browser Back/Forward remain usable.
5. The existing corn/irrigation/pine/cattle nature comparisons retain the source item, explicit absence or presence of a selected state, camera and layers on named return. They accept no arbitrary destination URL.
6. At 1280×665 CSS / DPR 1.5, compare US and Mexico from the same build. Also check the 1024×665 small-laptop side rail and 390×844 mobile layout/touch behavior. Record viewport and actual screenshot dimensions separately.
7. Visual acceptance requires inspection of actual rendered pixels. Unit tests, DOM assertions and data maps alone are insufficient.

## Shared implementation boundary

`AgricultureMapControls`, `AgricultureCommodityKey`, `AgricultureValueComposition` and `atlas-agriculture-markers.ts` are shared by the US and Mexico. The small-laptop stylesheet explicitly matches Mexico agriculture without activating the US controller. Mexico keeps its established 900×580 Lambert geographic frame. The US remains MapLibre/WebGL; Mexico uses SVG and georeferenced images. Browser metadata reports that difference.

## Data and interpretation

- **Crop map:** IFPRI MapSPAM 2020 v2r2 physical-area estimates, all 46 source crop arrays grouped into 11 display classes. Only cells with total modeled crop area at least 10% of cell area are drawn; the largest group supplies the color. Adjacent cells are merged and clipped to Mexico. This is a modeled major-crop map, not field boundaries, current land cover or measured hectares from polygon footprint.
- **Livestock:** DGSIAP 2025 municipal product output. Five distinct products are used: beef, bovine milk, pork, chicken meat and eggs. Badges represent selected municipalities at official INEGI seats, not individual farms or inventories. Their size is not quantitative.
- **Composition:** 2025 current-peso production value, not US-style cash receipts. Crop total is MXN 812,156,843,406.75; animal-product total is MXN 848,921,916,861.00. Animal live-value rows are excluded to avoid double counting. Crop and animal shares are approximately 49% and 51%. Forestry and fishing are outside this denominator.
- **Units:** Crop source monetary values are MXN; livestock source values are thousand MXN and are multiplied by 1,000. Milk quantities are thousand litres; meat/eggs are tonnes. Coffee is harvested cherry, rice is paddy, cotton includes seeds, and beans are dry common beans. Mixed-unit categories are not summed as physical quantities.
- **Forestry:** Green is 2021 ESA WorldCover class 10 tree cover sampled from the coarse categorical overview (about 0.00534 degrees), not the original 10 m map. It is not pine extent, legal forest or harvest area. Durango/Chihuahua outlines locate the separate 2022 census pine-harvest statistics. Seven offshore display pixels remain unknown because one source tile is unavailable.
- **Older census indicators:** Pine volume, irrigation rate and cattle stock retain their original 2022 definitions. The corn reading identifies the 2022 white-maize case separately from the 2020 crop map and 2025 grain statistics.

Sources, source hashes, exact transformations, years, missingness and licenses are retained under `data-source/atlas/mexico/agriculture-v2`, `data-source/atlas/mexico/tree-cover-2021`, and the matching public manifests. MapSPAM-derived data have an explicit CC BY-SA 4.0 notice; ESA tree cover is CC BY 4.0; DGSIAP and INEGI retain their own terms. This does not relicense application code or unrelated assets.

## Verification evidence so far

- Local unit suite: 831 passed and 3 existing skips, before the final tree-cover/return additions.
- Local final production build: passed on candidate `6299fa4`.
- Local 47-test Mexico/US focused interaction/navigation run: passed before the final small additions.
- Local final 14 focused agriculture/source/named-return checks: all passed.
- Exact-candidate GitHub run: unit and production-build steps passed; full built-site tests and browser acceptance were still running when this record was prepared.
- An earlier unbounded local test run suffered resource kills and was stopped. It is not counted as passing.
- No actual agriculture UI screenshot artifact has yet been accepted. No visual-parity completion claim is made here.

## Browser evidence and remaining work

The CI-only `scripts/capture-mexico-agriculture-review.mjs` produces viewport, map and full-workspace PNGs, metadata with the actual build commit, viewport/DPR, selected state, image decoding, console/network errors, and layout bounds. It includes the US/Mexico overview, crop, livestock and forestry states, the small-laptop overview pair, mobile crop/overview, and a genuine mobile touch-pan check.

1. Wait for the exact-candidate validation run to finish; inspect failures and fix the underlying cause without weakening acceptance assertions.
2. Retrieve `mexico-agriculture-review-37412003942` if produced. Inspect `metadata.json` and all relevant PNGs, then record exact artifact names and outcomes here.
3. Compare crop/livestock controls, map/background legibility, legend density, overview composition, selected reading and forestry at matching viewports.
4. Correct any visual or behavioral gap and rerun affected checks on the new candidate.
5. Keep the PR in draft and do not merge or publish until the rendered result has been reviewed and release approval is given.

## First browser result and correction

Run 37412003942 produced valid US overview/crop/livestock screenshots, but Mexico timed out before DOMContentLoaded and crop fill was absent. The Mexico page repeated full-resolution boundary geometry in a live clip and outline groups (9.8 MB HTML). The first candidate is not accepted.

The correction preserves all audited crop polygons, which are already clipped to Mexico, and removes the redundant browser clip. State display paths use a documented 0.15-map-unit simplification (original source geometry stays retained); river coordinates are cached as a transparent 1800×1160 PNG. Built page size drops to about 905 KB. Initial livestock presentation uses one sourced representative per product; selecting a product exposes its three retained municipalities. Coordinates are unchanged.

CI now captures and uploads the real-browser evidence immediately after the production build, then runs the same remaining built-site/Canada/release checks. No check is removed and no publication is enabled. Crop visibility has an additional real-checkbox pixel-difference assertion that excludes label/control boxes, so absent fills cannot pass from text or terrain pixels alone. The US forestry check now expects its existing crop/livestock controls to be hidden while forestry is active.
