# Third-party notices

The sample map uses geographic data from [Natural Earth](https://www.naturalearthdata.com/).
Natural Earth data is in the public domain under its
[terms of use](https://www.naturalearthdata.com/about/terms-of-use/).

The vendored file is a deterministic 17-feature subset of Natural Earth Admin 0
Countries at 1:110m scale. Its source repository path, source blob, local hash,
and derivation are recorded in `map/vendor/README.md` and
`map/create_subset.py`.


## Natural environment atlas

- Köppen–Geiger classification: Beck, H.E., McVicar, T.R., Vergopolan, N., et al. (2023), *High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections*, Scientific Data 10, 724. https://doi.org/10.1038/s41597-023-02549-6 . CC BY 4.0. The 1991–2020 snapshot was obtained through koppen.earth (Haizea Analytics with KAUST, GloH2O and ANU), reprojected with nearest-neighbour sampling, masked and recolored. The snapshot is not asserted to be V3.
- NOAA NCEI U.S. Climate Normals 1991–2020: U.S. government public domain. Source station CSVs and conversion audit are retained in `data/sources/nature-v1`.
- USGS 3DEP: U.S. government public domain. Elevations sampled on a 500 m grid; contours generated, simplified and compressed for national/regional display. No surveying accuracy is implied.
- Principal aquifers: USGS Ground Water Atlas, distributed through Esri's USA Aquifers Feature Layer. Attribution is retained in the public manifest.
- Natural Earth physical geography and relief: public domain, as credited above.
- Fallback map text is rasterized from Noto Sans CJK JP (SIL Open Font License 1.1); the font software is not redistributed.


## Africa atlas

- Natural Earth Admin 0 Countries 1:50m, public domain. Retrieved 2026-09-25. https://www.naturalearthdata.com/about/terms-of-use/
- World Bank, World Development Indicators (source 2), including FAO, UN Population Division and national accounts sources. Retrieved 2026-09-25. CC BY 4.0 under the World Bank data terms: https://datacatalog.worldbank.org/public-licenses . Indicator definitions, upstream credits, URLs and hashes are preserved in data-source/atlas/africa/manifest.json.
- Derived Africa country subset, rounded coordinates, code harmonization, country/year extraction and Japanese explanations are modifications made for this site. No endorsement by the original providers is implied.

## Canada forestry

- NRCan / Canada Centre for Remote Sensing, 2020 Land Cover of Canada: Open Government Licence - Canada. Four forest-cover classes are masked from an official WMS image, with colors independently verified against the source GeoTIFF palette. Modified mask and legend, bounds, years, hashes and source URLs are recorded in data-source/atlas/canada/agriculture/forestry and the public manifest. No area estimates are derived.
- Statistics Canada Table 16-10-0117-01: Statistics Canada Open Licence. Original nominal manufacturing revenues (thousand CAD), quality symbols and confidential values are preserved. Product, reference years, access date and prescribed derivative attribution are displayed. NRCan personal-use-only statisticalprofile-datasets derivatives are not used.
- Existing Natural Earth public-domain country/river locator data and existing ECCC station positions are reused. No mill, logging boundary or shipping route is inferred from these location markers.

## Canada industry

- Statistics Canada Table 36-10-0400-01, 2023–2025 provincial and territorial GDP percentage shares at current basic prices: Statistics Canada Open Licence. Source values, vectors, decimals, flags, definition, release and access date are retained. The prescribed "Adapted from Statistics Canada" acknowledgment appears in the page. These are official shares, not shares calculated from non-additive chained-dollar levels.
- Statistics Canada 2021 Census Cartographic Boundary Files: Open Government Licence – Canada and Statistics Canada Open Licence. The documented public Esri REST query supplies 13 EPSG:4326 province/territory features. Display geometry is simplified to 0.25 pixels; rings smaller than a 0.5-pixel bounding-box diagonal are omitted from the display only. Full original coordinates are retained, with original request/licence evidence and hashes. No area calculation or cadastral accuracy is claimed.
- CER Alberta profile (2023 production facts, updated March 26, 2026) and Transport Canada 2024 transportation report: independent factual summaries and links only; no CER figure, image or map is redistributed. Natural Earth public-domain land/water data and existing ECCC observation points are reused for geographic comparison.

## Canada population

- Statistics Canada Census2021 Tables98-10-0003-01 and98-10-0001-01 (released February9,2022): Statistics Canada Open Licence. 55region records/275source cells preserve2016/2021 population, changes, density, land area, source symbols and enumeration notes. The2016 population is adjusted to2021 geography; prescribed derivative attribution is displayed.
- Official2021 Census CMA cartographic boundaries, EPSG3347 NAD83 Lambert: Open Government Licence – Canada. 42source pieces are joined to41CMA entities, including Ottawa–Gatineau once. Original source projection, inverse transform,250m simplification, holes, location checks and source/public hashes are retained in the manifest. Map areas do not estimate population/density.
- Natural Earth public-domain land/water data and existing ECCC1991–2020 observation points provide geographic context. Source statistical definitions, Statistics Canada2022 population analysis and Transport Canada2024 report are independently summarized and linked.

## Regional forestry foundations

- Western Russia reuses the existing Europe ESA WorldCover 2021 v200 tree-cover image and categorical extraction ledger (CC BY 4.0), clipped to existing Russia geometry without changing source bounds. © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. Class 10 is tree cover, not timber supply, harvest boundaries, forest type, or official forest area.
- No new Africa, Latin America, Oceania or eastern/northern Russia forest raster was acquired. Environmental CONNECT 403 failures, exact URLs, missing coverage and reused-input hashes are recorded in data-source/atlas/regional-forestry and the public availability manifest. Missing data are not replaced with zero or inferred forest surfaces.
- FAO, national forestry/government agencies and World Bank publications are independently summarized and linked with their dates. Approximate editorial example locators are not measured forestry sites or polygons. Existing Natural Earth public-domain boundaries are reused.

The regional forestry module also reuses the unchanged JRC publisher-rendered PNGs already saved under `public/assets/atlas/asia-farming-v1/`, retaining their source coordinates and manifest hashes. Attribution: Bourgoin, Clement; Verhegghen, Astrid; Ameztoy, Iban; Carboni, Silvia; Achard, Frederic; Colditz, Rene (2025): Global map of forest cover 2020 - version 3. European Commission, Joint Research Centre (JRC), https://forobs.jrc.ec.europa.eu/GFC/v3 . Copernicus/JRC free reuse with acknowledgement (official licence verified 2026-10-10). These clipped reference images are distinct from ESA tree cover and are not used for classification queries, forest/harvest boundaries or area estimates. Transparent WMS pixels remain unclassified.
