# Mexico agriculture atlas, v2

## Source snapshots

- IFPRI MapSPAM 2020 v2r2, physical area, all production technologies, 46 crops, 5 arc-minute cells. Primary distributor: https://cgiar-climate-data-hub.github.io/catalog/spam2020/ and machine-readable https://cgiar-climate-data-hub.github.io/catalog/spam2020.json. Original DOI: https://doi.org/10.7910/DVN/SWPENT. Dataset-specific license: CC-BY-SA-4.0. The project's legacy generic terms page describes older data; this release uses the current dataset-specific license.
- DGSIAP Cierre de la Producción Agrícola 2025: https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php. Original CSV is retained byte-for-byte in deterministic gzip. Crop source values are current Mexican pesos.
- DGSIAP Cierre de la Producción Pecuaria 2025: https://nube.agricultura.gob.mx/datosAbiertos/Pecuario.php. Original CSV is retained byte-for-byte in deterministic gzip. Animal-product source values are thousands of current Mexican pesos, converted to pesos in output. Annual production is tonnes except milk, which is thousand litres.
- Both official DGSIAP dictionaries are retained. Current general reuse statement: https://nube.agricultura.gob.mx/datosAbiertos/. Retrieved directly on 2026-10-06 and recorded in `dgsiap-terms-evidence.json`; it describes freely usable, reusable and shareable data, potentially requiring attribution and retention of the same conditions. No separately named or year-2025-specific license is asserted.
- Municipality locations: INEGI Catálogo Único de Claves Geoestadísticas, documented at https://www.inegi.org.mx/servicios/catalogounico.html. Each retained coordinate has its specific public source URL and response hash. Coordinates identify the municipal seat, not a farm or facility. Coordinate reference dates are retained per locality; they are not represented as 2025 measurements.
- National clipping: existing `src/data/atlas/mexico/geometry.json`, derived from INEGI Marco Geoestadístico, December 2025, https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/. Its original URL, metadata and hash are embedded in the geometry file. INEGI terms: https://www.inegi.org.mx/inegi/terminos.html.

Retrieved 2026-10-06. Input hashes and sizes are pinned in `source-snapshot.json`. The immutable 383,909-byte NPZ snapshot preserves all 46 exact float32 crop-area arrays for Mexico, after the documented cell-center country mask. It is not a digitization of the rendered map. All original global shard URLs, byte counts and SHA-256 values are recorded in `spam-acquisition.json`; the full 28,983,306-byte download is kept out of the repository.

## Display and statistical interpretation

1. Crop geometry is a model-based cartographic summary, not observed field boundaries or current cropland land cover. Crop physical areas are grouped into 11 categories. A cell is displayed only if the sum of all modeled crop physical area is at least 10% of that full cell's spherical area. Its largest crop group determines the color. Only cells with their centers inside Mexico are adopted. Adjacent same-class cells are merged and clipped to Mexico; tiny clipped fragments with no source-cell center are omitted. `components` counts retained output polygons, while `rawClippedComponents` and `omittedNoCenterFragments` disclose the single omitted wheat sliver. Polygon footprint must never be summed as cultivated hectares.
2. Label anchors are actual member-cell centers nearest the centers of the largest two components for each crop group. No zone was hand-drawn from state production totals.
3. Animal badges represent 2025 municipality-level production. For each of five product types, rank states by value, take the largest-value municipality within each of the first five states, then retain the first three candidates separated by at least 150 km. Aggregate multiple DDR records within a municipality before ranking. Put each badge at the official municipal-seat coordinate. Badge quantities are municipal production, not site counts or livestock inventories.
4. `broiler` is only an internal ID for DGSIAP `Ave / Carne`; display it as chicken meat, not a claim that the source separates broilers from spent laying hens. `beef` is `Bovino / Carne`, not beef-cattle inventory. `dairy` is `Bovino / Leche`, not dairy-cow inventory. `beans` is common bean / Frijol, not all pulses. Coffee production is harvested cherry, not green coffee beans.
5. National monetary composition includes all recorded crop and animal-product values, excluding animal `Ganado en Pie` rows to avoid double-counting live-animal and carcass valuations. Forestry and fishing are outside the denominator. This is gross nominal production value, not GDP, profit, income or exports.
6. MapSPAM classification and DGSIAP crop-name classification are independent and explicitly recorded. They are not a perfectly harmonized time series. The map is 2020; statistical rankings and monetary composition are 2025. `other` has mixed quantity units, so quantity is null and only its monetary value is summed. Empty state/product records mean no recorded output in these rows; they are not evidence that unreported production cannot exist.
7. Municipal rows may repeat a municipality/species/product key across distinct DDRs. They are distinct records, not duplicated totals. All relevant records are summed for state and national values and municipality ranking.

## Reproduction and validation

Offline rebuild from the retained small snapshots:

    python scripts/prepare-mexico-agriculture-parity.py
    python scripts/validate-mexico-agriculture-source.py

Dependencies: Python 3.12, numpy 2.5.3, pandas 2.2.3, numcodecs 0.16.5, shapely 2.1.2. The original source extraction validates the Zarr v3 shard index with CRC32C and source content with SHA-256. Normal output regeneration has no network requests.

Optional independent re-acquisition of the raw crop source, followed by exact clipped-snapshot verification:

    python scripts/acquire-mexico-crop-snapshot.py --cache /path/to/cache

This tool HEAD-checks uncached source objects before download, enforces the 28.98 MB total bound and <2 MB per-object bound, checks pinned hashes, and writes only to the named cache. It fails closed if source data change. It does not replace the source snapshot automatically.

Outputs: `public/assets/atlas/mexico-agriculture-v2/agriculture-atlas.json`, `manifest.json`, and `crop-grid-query.json`. The builder does not touch `rivers.svg` or any UI source. The public manifest includes dataset hashes, sources, methods and year distinctions.

## Attribution and licensing

Crop grid and zone derivatives: International Food Policy Research Institute (IFPRI), MapSPAM 2020 v2r2, via CGIAR Climate Action Data Hub; clipping, grouping and visualization by Insight Journal. Distributed under CC-BY-SA-4.0: https://creativecommons.org/licenses/by-sa/4.0/.

Production statistics: Dirección General del Servicio de Información Agroalimentaria y Pesquera (DGSIAP), 2025 annual closure. Independent grouping and calculations by Insight Journal.

Geographic coordinates and boundary context: INEGI. Independent cartographic processing; no endorsement by INEGI, DGSIAP, IFPRI or CGIAR is implied. Licenses for derived data do not change the application's code license.
