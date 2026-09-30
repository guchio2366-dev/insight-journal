# Canadian forestry first release

Retrieved 2026-09-30. `provenance.json` records official source URLs, release/reference years, selection, licenses, source hashes and palette verification. No NRCan `statisticalprofile-datasets` derivative is used: that repository declares personal use only and reserved copyright. Harvest-volume comparison is excluded pending usable original data.

## Forest cover is a natural distribution, not logging or manufacturing

NRCan / Canada Centre for Remote Sensing, **2020 Land Cover of Canada**; OGL–Canada. Original classified Landsat grid: 30 m. Overall 86.9% accuracy based on 832 reference samples applies to the whole classification, not specifically the four displayed forest classes. Map reference year remains 2020 when manufacturing statistics change year.

- WMS 1.3.0, `landcover-2020`, official style; EPSG:4326 uses latitude/longitude request axis order. Requested `[40,-145,85,-50]`; display bounds in longitude/latitude are `[-145,40,-50,85]`, 1800×1160. This aligns with the existing Canada locator's linear lon/lat coordinates; it is not equal area. The reduced display cannot expose every 30 m cell.
- The first 131072 bytes of the public cloud-optimized GeoTIFF are retained as `landcover-2020-cog-header.bin`. The official server returned HTTP 206 for this range. It is little-endian BigTIFF, version 43. IFD ColorMap tag 320 provides 256 colors. It independently confirms class 1 `[0,60,0]`, class 2 `[147,155,111]`, class 5 `[19,139,4]`, class 6 `[91,116,42]`.
- These correspond to temperate/sub-polar needleleaf forest; sub-polar taiga needleleaf forest; temperate/sub-polar broadleaf deciduous forest; mixed forest. **Class 2 is taiga needleleaf, not deciduous needleleaf.**
- The official downloadable legend PNG differs from the raster/COG for broadleaf class 5 (blue 60 vs 4) and cropland class 11 (green 137 vs 157). The retained original legend is audit evidence, not the derivative's color lookup. Our matching legend and mask use the authoritative COG palette, validated against every opaque image pixel. Unknown colors cause generation failure; currently unknown pixels are zero.
- Forest-only mask retains source pixels for classes 1/2/5/6 and makes other classes transparent. Four independent category assets permit true isolation and recovery to all four classes. No interpolation, smoothing, forest-area estimates, forest stock, harvesting polygons, mill locations or production inferred from display pixels. Pixel counts in the manifest are diagnostic display counts, not hectares.
- Other land-cover classes may contain trees (e.g. wetland), and temporarily disturbed forest land may not have tree cover. The mask is **four forest-cover classes**, not total forest-land area, legal forestry land, tree-species geography or exact forest boundaries.
- Natural Earth country outlines (1:110m) and Fraser/St. Lawrence river geometry (1:50m) are existing public-domain locator data with different detail from the raster. Three province reading anchors are editorial markers, not boundaries or mills. Vancouver/Ottawa positions reuse ECCC station coordinates; no point represents a whole provincial forest climate.

OGL notice: “Contains information licensed under the Open Government Licence – Canada.” Source and licence links are displayed; source-derived mask and legend modifications are disclosed. Government logos are not included.

## Original Statistics Canada manufacturing data

Table **16-10-0117-01**, released **2025-12-18**, reference years **2021, 2023, 2024**. Source CSV ZIP and full CSV hashes are recorded; immutable selected rows and original metadata are retained here.

- Select Canada and ten provinces; exclude Atlantic/Prairie/Northern regional aggregates and three territories.
- Select `Revenue from goods manufactured` for `Wood product manufacturing [321]` and `Paper manufacturing [322]`.
- 66 original rows = 3 years × 11 geographies × 2 industries. **20 original `x` suppression values stay empty/null**. Quality letters, revision symbols, vectors and decimals are retained. Original unit is Dollars × thousands (千CAD), nominal, not inflation adjusted.
- Manufacturing revenue includes manufacturing services such as processing/repair work; it is not total revenue, GDP, profits, export value, harvested volume, lumber-only revenue, or the value of the forest.
- Logging [11331] is a different sector and its original table 16-10-0114-01 calls the analogous activity metric `Revenue from logging activities`. It is not silently combined with the manufacturing metric. No logging revenue or volume is published in this slice.
- Initial SSR is 2024 wood-product manufacturing. Missing/suppressed bars have explicit `width:0%` and missing class. Original zero would have 0 width without the missing class. JS uses the same meaning. Bars use the maximum **published** provincial value in selected year/industry, excluding Canada; suppressed values prevent claims of complete provincial rankings. Amounts remain available for cross-year comparisons, and nominal price effects are explained.
- Statistics Canada Open Licence permits derivatives; the product/year/access date and complete “Adapted from Statistics Canada … This does not constitute an endorsement …” notice appear on the page.

## Explanations and retained scope

NRCan forest classification provides forest-region/tree-composition distinctions. BC BEC describes climate, soils, topography, vegetation and succession/site history. Forest industry overview defines logging/transport and wood/paper manufacturing. These are factual paraphrases with links, not copied official graphics or derivative statistical CSVs.

Transport Canada's **2024** annual transport report, published 2025, describes northern BC resource-to-port highways and Lower Mainland bridge/freight infrastructure. Fraser River/Vancouver are locator examples; no specific timber consignment, rafting route or export share is asserted.

NRCan's **State of Canada's Forests 2025** explains the **2023 historical** mortgage-rate/housing-start/wood-demand/harvest-area feedback. This is explicitly not a current-2026 demand or policy assertion. No current tariffs or unverified trade quantities are used.

The default nature page remains capital Ottawa; the forestry climate example explicitly selects Vancouver and says it is a coastal station, not a whole-BC/forest-site average. Nature comparison URLs retain a whitelisted local forestry return state without redirects. Existing forestry UI conventions—natural distribution versus product statistics, named examples, contextual comparison and returning to choices—are used without altering US-only NLCD assets/bounds.

## Reproduction and checks

From repository root: `node scripts/prepare-canada-forestry.mjs` regenerates JSON, masks, public selected CSV and manifest from retained sources, without network. Then follow repository unit/build/E2E/release checks. The map palette, source row selection, suppression, SSR, year/metric/province/category changes, keyboard anchors, history/reload, nature return and existing Canada pages are checked. HappyDOM/controller checks are distinct from the parent's real Chrome screen QA.
