# Atlas source data

`ne_110m_admin_1_states_provinces.geojson` is a clipped copy of Natural Earth
1:110m Admin 1 states and provinces data, used only as the source for the
compact interaction geometry in `src/data/atlas/us-states.json`.

- Source repository: https://github.com/nvkelso/natural-earth-vector
- Source file: `geojson/ne_110m_admin_1_states_provinces.geojson`
- License: public domain, see https://www.naturalearthdata.com/about/terms-of-use/
- Retrieval date: 2026-09-12 UTC

The source file is kept for reproducibility. It is not a crop dataset and must
not be used to infer agricultural distribution. Run
`python3 map/atlas/generate_us_states.py map/atlas/vendor/ne_110m_admin_1_states_provinces.geojson src/data/atlas/us-states.json`
after intentionally changing the source or projection.
