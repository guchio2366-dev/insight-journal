# North America livestock layer — source and transformation record

## Published meaning

The agriculture map shows 15 representative points across five categories:
beef cattle, dairy, hogs, broilers and layers. A point identifies a broad,
named concentration discussed in the accompanying reviewed text. It does not
locate a farm, delimit a production region, or encode inventory, sales or
density through symbol size or count.

This restrained representation is intentional. The USDA workbook supplies
county maps for several livestock measures, but it does not provide one
equivalent, directly comparable measure for all five categories. The first
release therefore does not invent quantitative boundaries from unlike series.

## Official evidence

- [USDA NASS 2022 Census of Agriculture web maps](https://www.nass.usda.gov/Publications/AgCensus/2022/Online_Resources/Ag_Census_Web_Maps/Overview/index.php)
- [USDA NASS downloadable map data](https://www.nass.usda.gov/Publications/AgCensus/2022/Online_Resources/Ag_Census_Web_Maps/Data_download/index.php)
- Source workbook: `NASSAgCensusDownload2022_175maps_Links.xlsx`
- Retrieved: 2026-09-13
- SHA-256: `de1afcf078f8c0fd9b0008a48fa4e49b66ddb8e24e947f4bf1a2cd078423bd9e`
- [USDA ERS Animal Products](https://www.ers.usda.gov/topics/animal-products) for production-system context

Relevant workbook series include cattle density and sales, hog-and-pig sales,
and poultry-and-egg sales. Suppressed county values remain suppressed; the site
does not infer or fill them. The point anchors in `src/data/atlas/livestock.ts`
were placed within broad concentrations visible across the official maps and
reviewed against the written regional descriptions.

## Display and fallback

MapLibre projects the WGS84 anchors over the existing shared terrain, state,
river and crop layers. Nearby anchors collapse into one candidate control at
small viewports so that readers can choose among overlapping categories. The
same anchors generate two small SVG fallbacks, one over crops and one over the
land base. Generate them with:

```sh
python3 map/atlas/prepare_livestock_fallback.py
```

The SVGs reference committed same-origin WebP base maps. They remain readable
when WebGL fails and add no map API or runtime server dependency.

## Update boundary

Before drawing livestock areas or varying symbol size, obtain a common measure
for every displayed category, record its year and unit, normalize geography,
preserve suppressed values, and test positional alignment. Until then, keep the
representative-point wording on the page and in accessible descriptions.
