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
both were corrected before promotion. Final responsive measurements follow below
after the deployment is verified.

Not browser-verified here: GPU-rendered labels, coordinate-based polygon picking,
live pan/zoom and camera preservation, browser Back/Forward with an active map,
WebGL context-loss recovery, Safari or real iPhone/iPad touch behavior. The
automated style/camera-contract checks do not replace those checks.

Climate, industry, soils/winds, Canada/Mexico agriculture and commodity export/
world-share charts remain future scope, not completed functionality.
