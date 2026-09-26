# Asia detail implementation

Scope: East Asia (6), Southeast Asia (11), South/Central Asia (13). Russia and the Middle East, including Iran, remain context only. Extend the existing North America workspace and shared visual language; do not redesign other regions.

## Interaction and rendering contract

- One MapLibre instance per page. A field and its topic select the visible layers. Large image/query assets load only when needed; geometry and manifests stay local and versioned.
- Selection, country, topic, point, camera and a comparison return target are encoded in the existing URL state. Changing topics keeps the place and camera. Opening a comparison records the previous topic and exact selection. Back/reload restore it.
- Natural: existing 1991–2020 climate and station normals; add ETOPO 2022 terrain, 500 m display-grid contours, Natural Earth river/lake geometry. Rivers are line geometry, not representative point substitutes or discharge estimates.
- Population: GHSL 2020 density from the equal-area 1 km population raster. Use explicitly described 5 × 5 km source aggregates and nearest-neighbour display; never interpret Web Mercator pixel counts as area or population totals. Urban-centre statistics must keep the UCDB definition and year distinct from municipal populations.
- Population now includes 52 selected UCDB centres across all 30 countries, publisher population for 2000/2010/2020 within the fixed 2025 footprint, real urban polygons, and native 1 km maps for Tokyo, Shanghai, Seoul, Jakarta, Manila, Bangkok, Singapore, New Delhi, Dhaka, Tashkent and Malé. It does not yet provide country-specific administrative population statistics, age distributions or cultural composition.
- GHS-POP coastal zero cells can include sea, so the denominator is valid source-cell area rather than land area. No country-outline mask or nearest-land filling is applied. Natural Earth 1:10m geometry is only the display/selection context. The UCDB GeoPackage centroid fields named LON/LAT contain Mollweide metres and must be reprojected, not read as degrees.
- Agriculture: retain the rice layer and its attribution. Add 34 MapSPAM/GLW crop and livestock numeric maps, three publisher-rendered forest reference images, and separate 2015–2024 FAOSTAT national series. Units, missing/zero values, China mainland scope, coffee/millet category differences and forest-image analysis limits are explicit. See `atlas-asia-farming-detail.md` for provenance and checks.
- Industry: use defined sector statistics and source-supported locations; national shares are not maps of factory locations. Missing Taiwan/North Korea observations remain missing.
- Each topic exposes a one-sentence reading, place-specific evidence, unit/year, limitations, primary source and an adjacent-field comparison. Country summaries and point values must describe what was actually measured/modelled.
- Context countries are neutral. Colours and values use the same array. Below-sea-level elevations and genuine zero population are valid values; missing data use separate sentinels.
- Static country SVG and accessible country/topic controls remain available on renderer failure. Controls and reading panels work without hover; mobile touch targets at least 44 px. Status/retry and reduced motion retain existing behaviour.

## Source ledger

| Layer | Pinned source | Meaning and constraints |
| --- | --- | --- |
| Climate | Beck et al. (2023), Figshare 21789074 v1, 1991–2020, CC BY 4.0 | Existing climate-v2, 30 arc-second source; ~2.23 km Mercator display |
| Terrain | NOAA ETOPO 2022, 60 arc-second surface GeoTIFF; DOI 10.25921/fd45-gt74 | Metres relative to EGM2008; average resampling; rounded display values do not imply metre accuracy |
| Water geometry | Natural Earth 1:50m v5.1.2 rivers/lakes, public domain | Generalized geometry, not live water extent, flow, water quality or water availability |
| Population | EC JRC GHS-POP R2023A, epoch 2020, ESRI:54009 1 km | Modelled resident population; equal-area aggregates; EC reuse notice and attribution |
| Urban centres | EC JRC GHS-UCDB R2024A V1.2, GENERAL_CHARACTERISTICS and GHSL themes | Join ID_UC_G0; 2025 polygon, GH_POP_TOT_2000/2010/2020. Not administrative or commuting regions; CC BY 4.0 |
| Population coastlines | Natural Earth 1:10m v5.1.2 Admin 0 Countries | Public domain; region clip plus 5 degrees, 0.002-degree simplification; never used for population totals or masks |
| Crops | IFPRI MapSPAM 2020 v2r2, harvested area | Modelled crop allocation; hectares harvested per native 5 arc-minute cell; multiple harvests can exceed physical area |

Raw cache files are read-only inputs. Each generated manifest records input/output SHA-256, dimensions, processing method, no-data rules and per-country coverage. Generation is separate from the website build and has no network dependency.

## Acceptance checks

1. Validate all 30 country codes and image/grid dimensions, source hashes, sentinel handling, masked coverage, real point samples and decoded image/query agreement.
2. Exercise country → point → topic → comparison → return, history, invalid URLs, delayed/failing fetches and renderer failure with the production controller.
3. Run repository unit tests, content/schema validation, full build, e2e and release verification.
4. Use the real rendered website at desktop and mobile widths: all three regions, terrain/water/density, source reading, keyboard selection, comparison and restoration; inspect console/network failures and screenshots.
5. Recheck the remote base before a scoped PR, review the final diff, wait for CI and deployment, then verify public URLs. Report remaining parity gaps honestly; tabs alone do not constitute completion.
