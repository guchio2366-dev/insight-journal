# Canada Köppen geooverlay

The overlay uses the original **1991–2020, 0.1-degree** global GeoTIFF from Beck et al. (2023), pinned to Figshare article 21789074 version 1. It is the publisher's broad-view product, not the 1 km/0.01-degree map. It describes reference-period climate classes, independently of the ECCC station normals.

## Preserved input and licence

- Original member: `1991_2020/koppen_geiger_0p1.tif`, already preserved at `data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif`. This work reuses it without another download or a duplicate raw copy.
- Exact member SHA-256: `7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361`; 217,452 bytes.
- Archive: <https://ndownloader.figshare.com/files/45057352>. Its previously recorded SHA-256 is `d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d`. This generation verifies the preserved member, not a newly downloaded archive.
- Metadata: <https://api.figshare.com/v2/articles/21789074/versions/1>; prior raw metadata is preserved at `data-source/atlas/latin-nature/koppen-figshare-v1-metadata.json`.
- Citation: Beck, H.E. et al. (2023). *High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections*. Scientific Data 10, 724. <https://doi.org/10.1038/s41597-023-02549-6>.
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution to Beck et al. (2023) and the adaptation into clipped polygons must accompany reuse. The [publisher's data and licence page](https://www.gloh2o.org/koppen/) was checked on 2026-10-02. The source is deliberately version-pinned; this asset does not claim to use the latest release.

The raster tags are checked before generation: EPSG:4326; 3,600 × 1,800 pixels; pixel-is-area; 0.1° × 0.1° scale; tiepoint at −180°, +90°; unsigned-byte categorical class IDs 1–30; 0 means no-data and remains unclassified. Original publisher RGB colours and the faithfully translated 30-class source labels come from the existing `public/assets/atlas/asia-climate-v1/legend.json`.

## Canada land mask

`land-mask.geojson.gz` is a shared country mask usable by this package's elevation generator. `land-mask-provenance.json` records exact input hashes and processing.

The mask unions all 13 Statistics Canada 2021 Census cartographic province/territory features from `data-source/atlas/canada/industry/province-boundaries-2021.geojson.gz`. The uncompressed input SHA-256 is `28966276a200b7c88f97cc4d1e770588e161e2fe63aa85ca9b736015aaeddd57`. The original official query, retained in `boundary-request.json`, requested EPSG:4326, `maxAllowableOffset=0.02` and `geometryPrecision=5`. The reference date is 2021-01-01; the licence is [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada). See the [official boundary guide](https://www150.statcan.gc.ca/n1/pub/92-160-g/92-160-g2021001-eng.htm).

Coastal water is already removed by the cartographic source. Rounded source rings are validated with Shapely's structure method, retaining polygonal land and discarding only collapsed zero-area geometry. Existing Natural Earth v5.1.2 1:50m lake polygons (`data-source/atlas/canada/lakes.geojson`; SHA-256 `d350b75978b26fe839b797c2c529b2fb8f47fb3983c03f4964e36d5df9378a52`; public domain) intersecting Canada are subtracted, including cross-border lakes. This scale does not resolve every small water body. There is no bounding-box-only country assignment.

## Reproduction and verification

Run from the repository root with Python 3.12+, NumPy, Pillow and Shapely 2.1+:

```text
python scripts/prepare-canada-koppen-geooverlay.py
```

If dependencies are installed in a separate workspace directory, add `--dependency-dir PATH`. `--mask-only` regenerates just the shared land mask. The generation needs no network.

Identical original categorical cells are represented by horizontal cell runs and unioned per class, then intersected with the real land mask. No class averaging, interpolation, merging, missing-value replacement, minimum-area filtering, geometry simplification or coordinate rounding is performed. Polygon clipping does not create finer climate information.

`koppen-manifest.json` carries the public contract: classes use abbreviation `id`, original numeric `code`, Japanese `name`, original RGB `color` and Japanese `description`. The GeoJSON repeats these properties and emits one polygon/multipolygon feature per represented class. The manifest includes exact input/output hashes, valid geometry and round-trip checks, area-overlap checks, excluded neighbor/water checks and the five ECCC station coordinate samples against the raw TIFF. These point samples are not classifications recalculated from station monthly data.
