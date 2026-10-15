# Atlas internal load reductions (2026-10-15)

Base: `d166204299c2a12acd7c0275b9d0114d49c5040e` (main).
Branch: `perf/atlas-deferred-data-20261015`.
No deployment, access changes, dependencies, data simplification or feature removal.
The workspace `.agents` directory was empty; no applicable local skill was available.

## Changes

- US: start the common map with an empty crop source. Fetch the 142,114-byte crop geometry and 2,846-byte crop labels on the first agriculture visit, reuse the request and source thereafter, and allow failures to retry. Old requests cannot change the active field's presentation. Shared land geometry remains eager because natural landform selection uses it.
- Saved natural-view URLs with a selected crop still load that crop geometry for `crop-context`, including retry through the existing natural-view control. Agricultural comparison overlays retain their shared geometry loader and direct links.
- Mexico population: retain all 32 original state paths once in the existing definitions and reference them with `use` for the interactive density map. Selection, fill, keyboard handlers, composition rendering and copied definitions for standalone fallback SVGs use the same geometry. A CSS variable passes the original non-scaling stroke into the referenced density paths, while preserving the other existing uses; standalone fallback copies retain their original stroke rule.
- Mexico population: no `src` on the hidden fallback image and no unconditional external SVG assignment during rendering. Static fallback serializes the current map, including definitions and selection, as before. The external image is assigned only if serialization fails. The JavaScript-free inline map, explanation and full table remain.
- Canada elevation: use a 1×1 canvas with smoothing disabled and a cleared destination to sample the same integer source pixel. The original bitmap, image, palette, projection and outlines remain.

## Measurement boundaries

Repository/source bytes, built HTML bytes, transferred bytes and execution time are separate quantities. No image/data asset was deleted. Production CDN transfer, production latency, user-device memory and actual process/GPU memory are **unmeasured**.

Cloud Chromium 151.0.7922.173 ran with `chromiumSandbox: true`. Primary viewport: 1896×996, DPR1; secondary: 1280×665, DPR1.5; visual viewport scale 1. Fresh browser contexts, raw loopback HTTP without compression/throttling, three loads per route and viewport. These transfer figures are local raw HTTP, not a prediction of production gzip/Brotli delivery. Gzip values below are separately calculated with Node's default `gzipSync` on the same built files.

| Built Mexico population HTML | Before | After | Reduction |
|---|---:|---:|---:|
| Raw bytes | 6,546,947 | 3,395,871 | 3,151,076 (48.13%) |
| Gzip bytes | 1,287,289 | 666,505 | 620,784 (48.22%) |

The hidden external `density.svg` remains 3,159,467 raw bytes (620,801 gzip bytes). Normal loads no longer request it. US agriculture geometry and labels total 144,960 raw bytes (54,018 gzip bytes); normal nature/population entries defer these, while agriculture entries and crop comparisons retain the necessary requests. Bundle changes must be included when comparing total page traffic.

| Route under `/atlas/north-america/` | Before total HTTP bytes | After total HTTP bytes | Reduction |
|---|---:|---:|---:|
| `nature/` | 4,354,169 | 4,210,168 | 144,001 |
| `population/` | 5,214,528 | 5,070,527 | 144,001 |
| `agriculture/` | 4,443,996 | 4,445,357 | **−1,361** |
| `mexico/population/` | 10,355,455 | 4,044,861 | 6,310,594 |
| `mexico/population/?view=density` | 10,023,562 | 3,712,968 | 6,310,594 |

All three samples at both viewport sizes returned these byte totals. Agriculture still needs both crop assets; the small bundle increase is included rather than hidden from the comparison. No repository asset bytes were removed; verification code and evidence add source-tree bytes.

CDP **page main-thread TaskDuration** medians (milliseconds, three samples) were:

| Route | 1896×996 before → after | 1280×665 before → after |
|---|---:|---:|
| Nature | 1,605 → 1,406 | 1,506 → 1,394 |
| Population | 1,918 → 1,798 | 1,669 → 1,670 |
| Agriculture | **1,821 → 1,984** | **1,689 → 1,976** |
| Mexico default | 562 → 471 | 514 → 357 |
| Mexico density | 426 → 318 | 384 → 298 |

These are small local samples, not a general speed guarantee. Agriculture's first display now includes deferred loading and its observed main-thread work increased; subsequent visits reuse the data. Time until the map becomes fully interactive, worker/GPU execution, real-network waiting and production performance were **not measured**. The practical benefit is avoiding unnecessary initial data/HTML/image work in the other entries, with the clearest reduction on Mexico population.

## Canada pixel verification

`scripts/verify-canada-elevation-pixels.mjs` compares the base implementation and current implementation with the actual 5460×7515 PNG in sandboxed cloud Chromium. It tests all 13 nontransparent class colours plus transparency, every outer row/column pixel, out-of-range positions, a deterministic interior grid, and repeated alternating colour/transparent selections. Each implementation ran three times with **28,908 positions per run and zero mismatches**; reselecting all sampled classes also matched.

The hit-test canvas dimensions changed from 5460×7515 to 1×1. A single full-size RGBA surface calculates to about **156.5 MiB**; this is a dimensional calculation, **not measured memory savings**. The source bitmap remains allocated. First-hit median was **133.3 ms → 0.5 ms** over three runs (before 70–138.5 ms, after 0.4–0.5 ms). The synthetic 28,908-position batch median was **293.2 ms → 343.1 ms**: repeated bulk sampling is slower, while an ordinary single click avoids the full-surface allocation. The test itself retains a full reference canvas for equivalence checking; it cannot establish application memory usage.

## Tests and limits

- `npm test`: 1,436 tests; 1,433 pass, 3 existing skips, no failures. Skips concern unavailable private BasinATLAS/GIS evidence and one existing groundwater check.
- `npm run build` and `npm run verify:release`: pass for the final build. The existing MapLibre chunk-size advisory remains.
- Impacted E2E: 131 distinct cases covered across nature, population, agriculture insights, industry, US responsive layout, Mexico population/layout/reading, and Canada natural-layer controllers. Failures found while developing the lazy loader were fixed (late completion after page removal, and a population test helper that incorrectly waited for natural-view readiness). The two affected US suites passed all 43 cases on rerun; the final Mexico suites passed all 43 cases after the stroke correction. Final lazy-loading spot checks passed 4/4 and Mexico unit tests passed 25/25.
- Full-site E2E outside these affected suites was not run. No deployment/public-network verification was performed; existing post-publication work was not changed.

## Reproduction and evidence

Use `ASTRO_TELEMETRY_DISABLED=1 XDG_CACHE_HOME=/tmp/insight-cache npm run build` in this restricted environment. Install with `npm ci --cache /tmp/insight-npm-cache` if the default home cache is not writable.

Save the base build separately, then run `scripts/verify-atlas-lightweight.mjs` with `ATLAS_QA_PHASE=before ATLAS_QA_DIST=<base-dist>` and `ATLAS_QA_PHASE=after` against the current build. The script saves measurements and map screenshots under `/tmp/atlas-lightweight/{before,after}`. `scripts/verify-canada-elevation-pixels.mjs` obtains the baseline source from the base SHA and saves `/tmp/atlas-lightweight/canada-pixels.json`. All browser commands require an execution environment in which Chromium's sandbox can start; do not bypass it.

Final browser verification passed 30 cold loads per version (60 total), 18 baseline state checks and 20 final state checks. Final checks include real-browser delayed tab completion, back/forward, unchanged camera, HTTP 503 and successful retry at both sizes. **All 38 paired screenshots have identical RGB pixels**, covering full pages and maps, direct crop/relation URLs, Mexico selection/isolation/religion/static fallback, JavaScript-free maps, print CSS and Canada elevation. The initial SVG-use stroke regression was corrected before these final captures.

Durable compact evidence: [measurements](reviews/atlas-lightweight-20261015/measurements.json) and [exact visual comparison](reviews/atlas-lightweight-20261015/visual-comparison.json). Source SHA-256 hashes and individual timing samples are included. Full raw measurements and PNG pairs remain in `/tmp/atlas-lightweight/`; screenshots are intentionally not added to the repository.
