# Population assets

Sources and approved scope: `docs/atlas-population-design-v1.0.md`, `docs/atlas-population-feasibility-v1.0.md` and `docs/atlas-population-religion-culture-v1.2.md`.

The checked-in `.json.gz` files are the static source assets. `npm run build` expands JSON fallback copies and generates the county geometry gzip before Astro copies public files. No data is downloaded at runtime beyond static assets; no external API keys or database are required. County geometry is shared by population, ethnicity and voting. Metro geometry is loaded only on selection and cached for at most two metros.

To regenerate from the raw files named in the manifest, install Python pandas, openpyxl, pyshp, shapely >=2.1, pyproj, matplotlib and Pillow, then run from the repository root:

```
python scripts/population/build.py RAW_DIR
python scripts/population/votes.py RAW_DIR
python scripts/population/metros.py RAW_DIR
python scripts/population/fallbacks.py RAW_DIR
```

`manifest.json.gz` records raw input hashes. `vote-audit.json.gz` records the exact MEDSL mirror hash, Connecticut town aggregation, county crosswalks, missing records and denominator policy. Sources are linked in the page. Raw downloads are not checked in.

## Religion phases

The current UI publishes Pew's five national parent categories from `population-religion-overview-reviewed.json`, then links six sourced regional readings to the common 12-city catalog. The five published whole percentages sum to 98; the chart leaves the remaining 2 points gray and does not renormalize or label it as an exact nonresponse rate.

Pew state religious composition is not acquired. Phase 1 therefore shows reference points for the regional explanations and does not draw a state choropleth. The existing 10-category input in `population-religion-reviewed.json` and its range/missing-value validation remain available for a later quantitative phase. Do not infer missing parent values by summing rounded child categories.

## Known geographic limits

National ACS statistics cover 50 states and DC; the map focuses on the contiguous US. Four national urbanization classes are population-weighted NCHS county classes, not the proportion of residents living in a city versus suburb. Metro principal-city and Urban Area boundaries are reading aids; no suburban population is allocated by area. Fourteen NY tracts have suppressed ACS population (errata 148). Alaska county election joins, four New Mexico counties with missing third-candidate votes and Kalawao are missing, not zero.
