# Asia monthly precipitation normals

Source: GPCC Precipitation Analysis Climatology Version 2025, original 0.25° grid, reference period 1991–2020, twelve monthly normals in mm/month. DOI: https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025. GPCC/DWD, CC BY 4.0; the exact product and inherited publisher rights evidence are recorded in `source.json` and pinned by the served manifest’s input hashes. DataCite’s registered rights list is empty and is not treated as license evidence.

Reproduce offline with Node 24:

```powershell
node scripts/prepare-asia-seasonal-precipitation.mjs --source <private-cache>/gpcc-1991-2020-v2025-025.nc.gz
node --test tests/unit/atlas-asia-seasonal-precipitation.test.mjs
```

The pinned compressed input SHA-256 is `3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5`. The raw global source remains outside the checkout. The generator validates the actual coordinate arrays, month records and interleaved CDF2 record stride before reading precipitation. Actual latitudes run 89.875° to −89.875° despite the inconsistent `degrees_south` attribute.

Each region has a gzip little-endian float32 cube with the original geographic cell centres and dimensions. Index: `((month - 1) * width * height) + row * width + column`, row zero north. Zero is valid; −1 denotes source missing or a cell centre outside that region’s target-country polygons. Each region uses independent detailed geography with polygon holes preserved. The country coverage report explicitly records Maldives’ absence of an original land cell centre. No nearby cell is substituted. Tokyo’s city locator falls in a source cell centred in Tokyo Bay, so its target-land query is missing even though the raw GPCC cell has values.

The 36 small PNGs are Web Mercator nearest-source-cell display samples, with explicit display dimensions and map image corners. Their projection differs from the numeric cube: they avoid stretching a geographic raster’s linear latitude rows over Mercator. The shared seven breaks are 10, 25, 50, 100, 150, 200 and 300 mm/month; all months and regions share eight colours. These display pixels add no spatial detail. The browser should render them with nearest raster resampling.

Validation covers all asset and input hashes, source orientation and known-location monthly values, independent masks, preserved zero and missing values, and every delivered PNG pixel against its mapped native monthly cell. `validation.json` includes source metadata, raw and delivered location samples, flipped-latitude comparisons, monthly counts and country coverage. The decoder also verifies the uncompressed cube SHA-256 before accepting values.

The source is a station-interpolated grid climatology, not a city average, a complete 30-year observation series at each cell, a crop calendar or available water supply. The publisher requires at least twenty complete station years for this fixed-reference climatology. Monthly normals alone cannot determine planting, harvesting, irrigation, river discharge or groundwater recharge.
