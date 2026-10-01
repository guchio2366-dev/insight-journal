# Russia agriculture display data

The initial agriculture page uses wheat and cattle distributions with a 2020 reference year. These are spatial model estimates, not present-year observations. The generated PNG and Float32 lookup grids retain the original 5-arcminute cells in the unwrapped display window `[18, 40, 191, 83]` (west, south, east, north). Cells east of 180E use the original negative-longitude source columns.

No country mask changes the emitted values. The display's border convention is separate from the source model's underlying statistical territorial scope. The display window contains neighbouring countries; UI geometry clipping must identify its own source convention. No country or regional animal total is computed from densities, and no official national crop total is computed from the display grid.

Missing source cells use `-1` in the numerical lookup and transparent PNG pixels. Valid zero remains `0` and has an opaque, separate colour. Every valid source value, the missing-cell identity, numerical round trip, PNG class and ten original-cell samples are verified during generation. Latitude/longitude cells do not have equal ground area; displayed area or the simple sum of density values must not be interpreted as livestock numbers.

## Inputs and generation

Use an existing archive from [IFPRI MapSPAM 2020 v2r2, Harvard Dataverse fixed V6.0](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/SWPENT&version=6.0). The archive SHA256 and wheat member SHA256 are pinned in `scripts/prepare-russia-crops.py`. Supply it with `--source`; the script does not download raw data.

```sh
python scripts/prepare-russia-crops.py --source /path/to/spam2020V2r2_global_harvested_area.geotiff.zip
python scripts/prepare-russia-livestock.py --cache /path/to/existing/glw-cache --date-line-cache /path/to/existing/date-line-cache
```

Both scripts need NumPy and Pillow. Cattle additionally needs numcodecs for the pinned Blosc chunks. The cattle cache uses `glw-zarr.json` and `glw-cattle_c_0_2`, `glw-cattle_c_0_3`; the date-line cache uses `glw-cattle_c_0_0`. This is the [CGIAR GLW4 Float32 Zarr conversion](https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/) of FAO livestock density, not a claim of bitwise identity with the FAO Float64 original.

Outputs are the two `public/assets/atlas/russia-*-v1` directories, with manifest source receipts, units, full class breaks, cell counts and verification results. Source receipts here preserve only acquisition identity and necessary extracted facts; raw archives and chunks are not included in the public repository.

## Attribution

MapSPAM uses the pinned Dataverse V6.0 CC BY 4.0 terms. Display `russia-crops-v1/attribution.json`'s full `citation` followed by `requiredAdaptationText`, as required by IFPRI terms section 5.2. Do not substitute the legacy MapSPAM website's different licence or citation version.

Cattle uses CC BY 4.0, with attribution to FAO and the CGIAR Climate Data Hub. The source manifest includes the reference year, conversion edition, original FAO catalogue and [FAO database terms](https://www.fao.org/contact-us/terms/db-terms-of-use/en).
