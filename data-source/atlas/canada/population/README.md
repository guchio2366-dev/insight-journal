# Canada population, initial release

Statistics Canada tables 98-10-0003-01 and 98-10-0001-01 were downloaded on 2026-09-30. The original CSVs and metadata are retained unchanged. The population counts are 2016 and 2021 census counts; density and land area are 2021 only. Each value's immediately following Symbols column is retained separately, including revised `r` values. Geographic footnote 2 identifies incomplete enumeration exclusions. These are not 2026 population estimates.

The selection is exactly 41 `2021S0503` census metropolitan areas (CMA), plus Canada and the 13 provinces/territories. Municipalities, census agglomerations and provincial portions of Ottawa–Gatineau are not additional population observations. The original 2021 boundary ZIP `lcma000b21a_e.zip` is retained. Its XML explicitly identifies the Open Government Licence–Canada. Its 42 CMA shape records comprise 41 unique CMAs because Ottawa–Gatineau has Ontario and Quebec portions. Those portions are combined geometrically, with its population counted once.

Run `node scripts/prepare-canada-population.mjs` from the repository root to regenerate data, map geometry, selected CSV and provenance. No network, shell ZIP tools or extra dependencies are required. The shared `scripts/lib/canada-geography.mjs` reads the original ZIP, DBF and shapefile, preserves outer/interior rings, simplifies display coordinates with a 250 m Douglas–Peucker tolerance in the original projection, and converts EPSG:3347 to longitude/latitude using the GRS 1980 ellipsoid. Simplification never produces population, area or density values. Original ring count and projection checks are recorded in the manifest. Geometric symbol anchors are inside the original polygons and do not represent people, city halls or population-weighted centroids.

Statistics licence: https://www.statcan.gc.ca/en/terms-conditions/open-licence . Derivative-product acknowledgement is displayed on the page. Geography licence: https://open.canada.ca/en/open-government-licence-canada . Original source URLs, access date, byte counts and SHA-256 hashes are in `provenance.json` and the public manifest.

Sources:

- https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000301
- https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101
- https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcma000b21a_e.zip
- https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/Definition-eng.cfm?ID=geo009
- https://www150.statcan.gc.ca/n1/daily-quotidien/220209/dq220209b-eng.htm
- https://tc.canada.ca/en/corporate-services/transparency/corporate-management-reporting/transportation-canada-annual-reports/transportation-canada-2024/role-canada-s-transportation-network

The explanatory urban-change analysis refers to 2016–2021 (and immigration in 2016–2019), not current 2026 migration. Natural Earth country outlines and the St. Lawrence River are lower-resolution public-domain context, reused from existing verified site datasets. ECCC observation locations are alignment spot checks only; no station is silently substituted for a whole CMA's climate.
