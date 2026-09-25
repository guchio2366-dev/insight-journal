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
