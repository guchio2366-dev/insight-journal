# North America atlas: implementation and data contract

## Scope and current baseline

Started from main `b31e9dd302293eeb62ab4dbe005b9559d49b1b3d` (PR #6).
All tracked local files were checked against the remote Git tree; the only
missing local file was the existing `.github/workflows/pages.yml`. No open PRs.
Preserve Astro 7.3.2, GitHub Pages, the publication/privacy boundary, existing
articles and report prose. The approved reference WebP is an art-direction
reference, never a coordinate source. Do not use its pixel hit regions as GIS.

## Rendering contract

- Pin MapLibre GL JS **6.9.0** and its npm lockfile. BSD-3-Clause and included
  third-party notices are distributed at `assets/atlas/maplibre-license.txt`.
- One dynamically imported renderer, one worker, pixel ratio capped at two.
  Base, crop and physical-region data are loaded once. Field changes update
  visibility; they never recreate the map or reset its camera.
- GeoJSON uses WGS84 longitude/latitude. The relief image is reprojected to
  EPSG:3857 before being used as an image source. Do not drape an unprojected
  equirectangular image between four Mercator corners.
- Japanese HTML labels use local system fonts and collision rejection; no
  font/tile API, token, commercial basemap, or demo tile server is used.
- URLs preserve `lng`, `lat`, `z`, `crop` and field route. Invalid numeric state
  returns to a full-extent view. Restore on reload and browser Back/Forward.
- Full CONUS initial extent with visible short field tabs. Touch/click and
  keyboard-accessible legend selection; explicit zoom and fit controls.
- Failure of a critical asset, initialization timeout or WebGL context loss
  shows a self-hosted, georeferenced fallback figure plus the article text.
  No-JavaScript links remain usable. The old generated reference is separately
  identified as an earlier concept image.

## Published data

`public/assets/atlas/v3/manifest.json` is the machine-readable source register:
exact URLs, source year/version, sampling, generalization, coverage, input SHA-256,
output SHA-256 and byte sizes. Site builds use committed outputs and require no
upstream requests. Do not fetch new datasets during every Pages build.

### Natural Earth

- [Vector repository, 5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2):
  countries, lakes, rivers and geographic regions at 1:50 million.
- Reuse the committed `ne_110m_admin_1_states_provinces.geojson` for US state
  reference boundaries and label anchors. Scale differences are intentional;
  this is not parcel-scale mapping. States do not determine crop regions.
- [Natural Earth I shaded relief](https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-1/),
  3.2.0: clip, reproject, mute color while retaining relief luminance, 1,800px.
- [License: public domain](https://www.naturalearthdata.com/about/terms-of-use/).
- Geographic-region polygons describe named landforms; they are neither a soil
  map nor agricultural observation data.

### Agriculture

- [USDA NASS CDL](https://www.nass.usda.gov/Research_and_Science/Cropland/sarsfaqs2.php),
  crop year **2023**, the 30m source retained as a documented historical baseline,
  not presented as the latest crop year.
- Official CroplandCROS ImageServer `CDL_WM`, selected OBJECTID 38,
  `Name=2023_30m_cdls`, `Year=2023`. Verify that selection before any export.
- Export raw U8 classifications on a 2km EPSG:5070 grid using nearest neighbour.
  This is **subsampling**, not a complete spatial area aggregate. All crop
  boundaries are derived from these samples, not from state data or artwork.
- Form binary crop masks (the code register includes double-cropping classes in
  each relevant crop); Gaussian sigma 12km, truncated at 36km; contour thresholds
  13% corn, 12% soybeans, 10% wheat, 7% cotton, 6% rice, 7% selected fruit/veg.
  These are editorial sample-density thresholds, **not reported acreage shares**.
- Remove components below 150km², smooth by 4km, simplify by 1.5km, transform to
  WGS84, clip to US land and exclude lakes. This produces broad learning regions,
  not observed field boundaries. Sparse/minor growing areas may disappear.
- Corn/soy intersection is hatched. It means overlapping generalized regions,
  not simultaneous planting in the same field, and not proof of a crop rotation.
- Source classification code names were checked against the official raster
  attribute table. Fruit/veg excludes rye, millet, Christmas trees and peanuts;
  the exact included codes are in the manifest.
- Raw sampled TIFF is archived, gzip-compressed, in `map/atlas/vendor`. It is
  outside `public` and does not ship to readers. Its decompressed hash is recorded.
- USDA states CDL is public domain and free to redistribute. Classification
  errors and sampling/generalization errors remain; do not calculate production,
  yield, total acreage or world shares from this map.

## Reading and scope boundaries

The map opens at North America → agriculture / climate / land / industry. This
release covers CONUS agriculture and landforms/water. Climate and industry remain
explicitly marked as in preparation, consistent with their previous status.
Climate classification, prevailing winds, soil taxonomy, industry distribution,
Canada/Mexico crop coverage, crop export pies and world-share series are not
claimed to be complete. Preserve the agreed future statistical design: raw
commodities, export quantity total plus country-share pie, dated world production
share and trend, consistent paddy/milled rice and lint/seed-cotton definitions.

Beck et al. Köppen-Geiger was investigated as a climate source. The GloH2O source
page identifies CC BY 4.0 data, but the Figshare download was inaccessible in this
environment. No unverified climate polygons or replacement numbers were invented.
The older Peel et al. 2007 supplement was not adopted because its displayed
CC BY-NC-SA terms would unnecessarily constrain future article reuse.

The crop prose follows conditions → local fit → establishment, with uses following
the explanation. Existing regional context is retained under a disclosure, not
as a duplicate list of map locations. Groundwater remains a secondary topic.

## Reproduce

Use Python with numpy, scipy, rasterio, shapely, pyproj and Pillow. These are
build-time tools only; they are not website runtime dependencies.

```sh
python map/atlas/prepare_maplibre.py --cache /absolute/path/to/source-cache
ASTRO_TELEMETRY_DISABLED=1 npm run check
```

The script downloads Natural Earth from its version-pinned official repository
and shaded-relief distribution. Noto Sans CJK JP is used at build time to label
fallback figures; the font is not distributed as a runtime dependency.

## QA and publication

Unit checks cover data hashes, coverage, fields, source year, missing assets and
URL state. Existing publication-safety checks remain intact. Visual/interaction
review is mandatory and separate from these automated checks.

`/atlas/qa/` is a noindex responsive review harness using same-origin iframes at
390×844, 844×390, 820×1180, 1180×820 and 1280×800 CSS pixels. It is **not** physical
iPhone/iPad testing, Safari validation or full touch/DPR emulation. Record that
distinction with screenshots and results before marking the revision complete.

Use the existing pull-request validation and Pages workflow. Do not change
hosting or permissions. Publish an opt-in review route before promoting the
main map navigation if a local browser preview cannot be reached.
