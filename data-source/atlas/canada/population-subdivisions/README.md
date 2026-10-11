# Canada population source candidate

The retained `98100002-eng.zip` is the original Statistics Canada 2021 census-subdivision table (5,161 CSD identifiers), acquired through ordinary HTTPS on 2026-10-11.

- Original: https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip
- SHA-256: `36ab6c8f3f6b82d70d9dea927cb5cf04f6fbf9b543a7ad543695e6ea70d22876`
- Statistics Canada Open Licence: https://www.statcan.gc.ca/en/terms-conditions/open-licence

CSD is a researched alternative for the fine population map. The official digital-boundary service repeatedly returned HTTP 500 for individual/page requests; some complete acquisitions succeeded, but original-geometry corrections and large prepared-file transfer were not consistently usable for integration. An oversized GitHub log fetch returned `Transport closed`. This candidate is not the published distribution layer, and its counts are never apportioned to smaller invented areas.

The adopted map instead uses the genuine, fully acquired JRC GHSL 2020 population grid, documented in `public/assets/atlas/canada-population-grid-v1/manifest.json`. The existing separate 2021 CMA/CD census statistics remain unchanged. `scripts/prepare-canada-population-subdivisions.mjs` retains the exact-ID source-join alternative for a future controlled evaluation.
