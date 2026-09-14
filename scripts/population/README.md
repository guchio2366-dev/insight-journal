# Population assets

Sources and approved scope: `docs/atlas-population-design-v1.0.md` and `docs/atlas-population-feasibility-v1.0.md`.

The checked-in `.json.gz` files are the static source assets. `npm run build` expands JSON fallback copies and generates the county geometry gzip before Astro copies public files. No data is downloaded at runtime beyond static assets; no external API keys or database are required. County geometry is shared by population, ethnicity and voting. Metro geometry is loaded only on selection and cached for at most two metros.

To regenerate from the raw files named in the manifest, install Python pandas, openpyxl, pyshp, shapely >=2.1, pyproj, matplotlib and Pillow, then run from the repository root:

```
python scripts/population/build.py RAW_DIR
python scripts/population/votes.py RAW_DIR
python scripts/population/metros.py RAW_DIR
python scripts/population/fallbacks.py RAW_DIR
```

`manifest.json.gz` records raw input hashes. `vote-audit.json.gz` records the exact MEDSL mirror hash, Connecticut town aggregation, county crosswalks, missing records and denominator policy. Sources are linked in the page. Raw downloads are not checked in.

## Deliberate data gap

Pew state religious composition is not acquired. The UI shows every state as unavailable and publishes only the eight confirmed national parent values. Other Christian and other religion parent totals remain unavailable. Do not infer them by summing rounded child categories. This is a release gate for the full approved design, not a zero-value dataset.

## Known geographic limits

National ACS statistics cover 50 states and DC; the map focuses on the contiguous US. Four national urbanization classes are population-weighted NCHS county classes, not the proportion of residents living in a city versus suburb. Metro principal-city and Urban Area boundaries are reading aids; no suburban population is allocated by area. Fourteen NY tracts have suppressed ACS population (errata 148). Alaska county election joins, four New Mexico counties with missing third-candidate votes and Kalawao are missing, not zero.
