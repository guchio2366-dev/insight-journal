# Atlas QA — 2026-09-12

Implementation is staged through the existing GitHub Actions validation and
GitHub Pages workflow. No hosting permissions, publication/privacy settings,
paid API or runtime server were added.

## Automated checks

- 36 unit tests: existing content/privacy/export/search checks; new data hashes,
  geography coverage, URL state, pinned MapLibre style validation and visibility-
  only field switching with camera-reset traps.
- 3 static end-to-end checks including every promoted atlas route, shared
  renderer, lower explanations, non-interactive planned fields and public safety.
- Astro build, Pagefind and release verification.
- Separate geospatial sanity checks confirm valid crop polygons and broad-region
  control points; see `atlas-data.md` for methodology and limitations.

## Browser verification boundary

The provided cloud Chrome has no usable WebGL2. Its real
`GPUInitializationError` correctly activates the self-hosted fallback. Screenshots
from this environment are **fallback views**, not evidence of a working GPU map.

Verified in the initial review: all six crop-legend clicks produce the correct
summary and detail anchor; the detail link scrolls to the intended crop section.
The short field tabs and full-extent fallback fit the initial phone/tablet sizes.
Review found inherited mobile-header overflow and an overlapping failure banner;
both were corrected before promotion.

## Final responsive measurements

Same-origin iframe CSS viewports in cloud Chrome, initial full extent, fallback
mode. These are not simulated Safari devices or physical-device tests.

| CSS viewport | Full map and tabs visible | Page horizontal overflow | Workspace bottom |
| --- | --- | --- | --- |
| iPhone portrait 390×844 | Yes | None | 459px |
| iPhone landscape 844×390 | Yes | None | 375px |
| iPad portrait 820×1180 | Yes | None | 686px |
| iPad landscape 1180×820 | Yes | None | 828px |
| PC 1280×800 | Yes | None | 808px |

The map and tabs fit at every size. On the last two sizes, the final lower-guide
padding extends about 8px beyond the viewport; the map itself is fully visible.
The static map was visually checked for terrain, water, state/crop positioning
and text overlap. Dynamic-label collision metrics are not meaningful in fallback
mode (there are no rendered HTML map labels).

The explicit review-only asset failure produced `manifest.json: 404` and kept
the fallback, crop legend and text accessible. Switching to land after that
failure loaded `land-fallback.webp` correctly. Normal public navigation from
North America to agriculture also reached the promoted shared renderer.

Publication verified for merge `e545e5a9ae3e89a29746bf30a360f01e8f12a725`:
GitHub Actions run `34662271249` succeeded and public `_release.json` reported
that exact SHA. The subsequent documentation/source-citation commit does not
alter the map data, geometry or layout represented by these screenshots.

Not browser-verified here: GPU-rendered labels, coordinate-based polygon picking,
live pan/zoom and camera preservation, browser Back/Forward with an active map,
WebGL context-loss recovery, Safari or real iPhone/iPad touch behavior. The
automated style/camera-contract checks do not replace those checks.

Climate, industry, soils/winds, Canada/Mexico agriculture and commodity export/
world-share charts remain future scope, not completed functionality.
