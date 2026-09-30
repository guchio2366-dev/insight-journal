# Canada agriculture: canola pilot

Published scope of this package: canola distribution, provincial comparison and the explanation connecting natural conditions to cultivation, harvest management, processing, transport, demand and institutional feedback. Major crops, livestock and forestry remain separate unfinished packages. The page explicitly states this boundary.

## Source and method ledger

- Statistics Canada 2021 Census of Agriculture canola map: https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-027-eng.htm . Original JPEG: `m-c/m-c-027-eng.jpg` relative to the same article. Each source dot represents 10,000 acres / approximately 4,047 hectares and is randomly placed within a census division's agricultural area. It is not a farm location or farm count. Never reconstruct exact division areas from rounded dot counts. Suppression and null/ecumene categories remain in the legend.
- Map preprocessing: crop the original 1133×875 image to `[left=0, top=0, width=1133, height=814]`, removing the footer official symbols while retaining the complete map, legend, insets and source line; JPEG re-encode at quality 95. No point geometry or classes changed. Original source SHA-256 and transformation are in `provenance.json`. The cropped input is retained and the original is linked rather than redistributed with its government symbols.
- Statistics Canada table 32-10-0359-01: https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210035901 . Download https://www150.statcan.gc.ca/n1/tbl/csv/32100359-eng.zip . Retain 132 rows: 2020/2021/2022/2025 × Canada and 10 provinces × seeded area (ha), harvested area (ha), production (metric tonnes). Retain vectors, units, decimals, quality status and revision symbols. Blank values remain null; actual zero remains zero. Original full-CSV checksum is recorded; metadata and selected source rows are retained. The territories are not represented by invented zeros.
- Licence: https://www.statcan.gc.ca/en/terms-conditions/open-licence . Statistics Canada Open Licence; acknowledge Statistics Canada without implying endorsement. The distribution-map year remains 2021 when users change the annual-statistics year. The annual source is an estimate series, not a map made from its provincial totals.
- Regina Airport ECCC 1991–2020 climate composite 4016560: reuse the sourced nature package. This is a local example, not a Prairie average. The country nature page still defaults to Ottawa. Monthly precipitation includes snowfall water equivalent and is not soil moisture or available irrigation water.
- Manitoba Agriculture: https://www.gov.mb.ca/agriculture/crops/crop-management/canola.html . Supports cool-season growth, extreme heat/moisture constraints, field management, varieties, contracts, harvest and storage. Prose paraphrases facts; its source images and text are not reproduced.
- AAFC Japan market overview: https://agriculture.canada.ca/en/international-trade/reports-and-guides/market-overview-japan . Use its account of 2023 trade and Prairie suppliers; no third-party trade table is republished and no 2026 trade values are implied.
- USDA FAS report CA2025-0017, 2025-03-31: https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Oilseeds+and+Products+Annual_Ottawa_Canada_CA2025-0017.pdf . Supports separate seed/oil/meal pathways, rail/ocean transport and the report's historical discussion of demand and policy uncertainty. No forecasts are inserted into the observed annual data. This is USDA staff analysis at the report date, not a claim about current policy.

## Reproduction

Place the official downloaded `canola-map.jpg` and extracted `field-crops/32100359.csv` and `field-crops/32100359_MetaData.csv` in a working source directory. Run `node scripts/acquire-canada-canola.mjs <source-directory>` to reproduce retained inputs and provenance. The original full CSV and ZIP stay outside the repository.

Run `node scripts/prepare-canada-agriculture.mjs` to regenerate application JSON, map/CSV public assets and manifest offline. No source fetch is needed for a production build because generated files and retained inputs are checked in.

## Browser acceptance

Route `/atlas/north-america/canada/agriculture/`: distribution and legend readable at desktop sizes; zoom/return and original-image link; year switch leaves distribution fixed at 2021; seeded/harvested/production switch keeps units; province comparisons show true values, F missing and r revisions; back/forward and reload restore controls; causal paragraphs and sources read to the end. Follow links to Regina climate, Winnipeg, landform, water and Vancouver, then return. Check the nature page's new agriculture navigation as well.

Automated tests cover source values, null versus zero, revision markers, unit/year contracts, hashes, URL validation, static content, real-controller interactions and natural-environment links. Actual desktop visual and external-link testing is supplemented by the parent's cloud Chrome, not claimed as a local browser run.

## Next packages

The wheat package is documented separately in `wheat/README.md` and reuses the pilot's controls. Next prioritize a livestock distribution and a forestry distribution with public primary sources and causal explanations. Check source coverage before deciding exact secondary items. Reuse dated provenance, comparisons, missingness, place-to-map links and nature-to-social-feedback explanation. Livestock, forestry and other crops are not marked complete by these two crop publications.
