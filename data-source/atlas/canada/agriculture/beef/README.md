# Canada beef, pasture and feed: initial teaching scope

Retrieved September 30, 2026. No fabricated or interpolated figures.

## Headcount table

Statistics Canada Table 32-10-0130-01, Number of cattle, by class and farm type; released August 24, 2026.

- Official CSV: https://www150.statcan.gc.ca/n1/tbl/csv/32100130-eng.zip
- Table/definitions: https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210013001
- 2021, 2025, 2026; **At July 1** only; **On all cattle operations** only.
- Canada plus ten provinces; Beef cows, Dairy cows, Total cattle: 99 source cells / 33 geography-year records.
- Original unit Head, scalar thousands, one decimal. Retain vectors/status/symbols/precision. Selected cells have no missing values. UI handles null and published zero separately; tests use clearly synthetic edge fixtures rather than claiming real missingness.
- Inventories are not annual slaughter, production, beef weight or export flows. Beef cows are not all beef cattle. Dairy cows are cows that have calved at least once and are kept mainly for milk (table note 5). Never derive beef cattle by subtracting Dairy cows from Total cattle.
- Provincial farm-type breakdowns are unavailable for Atlantic provinces (note 12); do not fill them with zeros. Territories and regional overlapping aggregates are outside this slice.

## Fixed census maps

2021 agricultural census maps; pages modified December 23, 2022. Original JPEGs are retained as cropped derivatives, removing only footer government symbols. Map, legend, source, dates, scale and insets remain unchanged. Provenance includes original/derived SHA-256 and crop rectangle (1133×814).

| Original | Meaning of one randomly located dot | Original national total |
| --- | --- | --- |
| [Total beef cows](https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-043-eng.htm) | 2,500 animals | 3,776,389 animals |
| [Total pasture area](https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-013-eng.htm) | 40,000 acres / approximately 16,188 ha | 18,559,652 ha |
| [Total hay area](https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-037-eng.htm) | 8,000 acres / approximately 3,238 ha | 5,394,265 ha |

Dots are not farms/feedlots or literal land parcels. Preserve confidentiality hatching/null legend; absence of dots is not proof of zero. Do not back-calculate exact census-division values from rounded dots. Map year is independent of survey controls. Census and July survey counts need not match.

## Definition cross-check

- [2021 questionnaire](https://www.statcan.gc.ca/en/statistical-programs/instrument/3438_Q1_V6): land-use categories distinguish tame/seeded pasture (excluding hay/silage/seed harvest) and natural pasture (including grazed woodland and shared grazing land under permits/licences/leases).
- [Land use 32-10-0249-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210024901) national hectare values 4,828,538 + 13,731,114 = 18,559,652, equal to pasture map.
- [Field crops and hay 32-10-0309-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210030901) and questionnaire distinguish alfalfa/mixtures (including hay, silage, green feed, dehydrated alfalfa), other tame hay/fodder crops (hay/silage), and forage seed (including turf grass seed). The map's published Total hay total is preserved; it is **not relabelled as dry hay only, beef-only feed, harvested weight or a reconstructed sum of selected table categories**. In the downloaded national table, the three categories have 3,056,486, 2,182,420 and 155,358 ha; their sum is 5,394,264 ha, one hectare below the original map total. The reason is not established here; do not silently correct either source or claim an exact component identity.

## Causal prose and reuse

Manitoba Agriculture carrying capacity / stocking rates, winter feeding, finishing feed sources are linked beside the related prose. Summarize facts, without reproducing photos or ration tables or offering feed prescriptions. Undated guidance is marked as consulted September 30, 2026. Feed categories and stages are also backed by cattle-table notes 10–11. Specific port routes, export shares, prices and current trade-policy assertions are outside this first release.

Statistics Canada [Open Licence](https://www.statcan.gc.ca/en/terms-conditions/open-licence) permits adaptation and redistribution, including commercial use; government symbols are excluded. The required adapted-source English acknowledgment lists products/reference dates and states non-endorsement. Provincial material is factual paraphrase with direct source links, not redistributed originals.

Regenerate: `node scripts/acquire-canada-beef.mjs <research-directory>` then `node scripts/prepare-canada-beef.mjs`. The research directory contains cattle/32100130.csv and the original map-043.jpg, map-013.jpg, map-037.jpg. Full official downloads stay outside the repository. Public selected CSV, maps and manifest are under `/assets/atlas/canada-beef-v1/`.
