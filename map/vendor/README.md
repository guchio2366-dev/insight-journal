# Natural Earth base map

- Dataset: Natural Earth, Admin 0 – Countries, 1:110m
- Source repository: <https://github.com/nvkelso/natural-earth-vector>
- Source file: `geojson/ne_110m_admin_0_countries.geojson`
- Source blob: `1e6ab74c7042f97013be69ceec798be8e1aff27d`
- Local file: `ne_110m_admin_0_south_asia.geojson`
- Local SHA-256: `8f57658e0fc6691e681879659e1f94dffcfb0120384016fc2d97b27f6952a4a6`
- License: public domain under the [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/)

The local file is a deterministic 17-feature subset selected by intersection with
the sample map bounds. Geometry and country properties are unchanged. The renderer
reads this vendored subset; CI validates the published PNG and does not download map
data.
