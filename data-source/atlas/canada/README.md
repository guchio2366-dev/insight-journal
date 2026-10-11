# Canada nature pilot — revised 2026-10-11

This source ledger covers the Canada natural geography pilot. The default climate location is the capital Ottawa. Regina is a separate Prairie example for the next canola lesson, not a regional climate average.

## Sources and processing

- ECCC Canadian Climate Normals 1991–2020: Ottawa 6105976, Vancouver 1108447, Winnipeg 5023222, Iqaluit 2402590, Regina 4016560, Toronto 6158355, Montreal 7025250, Calgary 3031092, Halifax Stanfield 8202250. `climate-source-extract.json` preserves the two numeric source rows, inventory coordinates, source URLs and page hashes. The official station inventory is retained. Extract published numerical facts into new charts; official graphics are not reproduced. Government website terms are linked without claiming that this dataset has an Open Government Licence.
- Natural Earth v5.1.2 1:50m rivers and lakes, public domain. Retain source features with a vertex in the display bounds; coordinates are unchanged except for the separately documented St. Lawrence replacement below. This yields 84 river and 149 lake features and includes cross-border waters. It is not a flow, basin-boundary or national clipping dataset. Existing Natural Earth 1:110m country boundaries provide locator context.
- NRCan Atlas of Canada 6th edition Physiographic Regions, archived 2009, geological classification based on 1967 mapping. Official metadata and original JPEG are retained. Open Government Licence – Canada. Resize the image for display, preserve the original layout and provide the original JPEG. The official Lambert source is registered to the site's shared Mercator locator without changing its classification.
- Climate mechanisms: Canada's Changing Climate Report (2019), chapter 4. Numerical station observations are distinguished from regional explanations.

Run `node scripts/prepare-canada-nature.mjs` to regenerate climate JSON, vector subsets, resized image and the public manifest from the retained source files. No network is required. Missing numeric cells remain null; no station or month is inferred. The public manifest records editions, licences, processing and SHA-256 hashes. The downloaded archive is not required and is not included in this change.

## Acceptance checks

Routes: `/atlas/north-america/canada/` and `/atlas/north-america/canada/nature/`.

- Initial Ottawa climate, all 12 months, common axes, annual facts, composite metadata and source links.
- Compare all nine observation points; selecting a city does not move the map. The initial camera fits southern Canada to the actual desktop map frame. Pan, wheel and keyboard camera operations remain available; the country/south/zoom/focus buttons are removed.
- URL query and browser back/forward restore city, comparison, view, water selection and camera.
- Landform view shows the official full-resolution map link and adjacent Japanese explanations with English map-name equivalents.
- Water view shows real river/lake geometry. Select Mackenzie, show only selected, then return to all waters. Unnamed shapes are filtered as well.
- Read through all three views to the source footer, including year, units, missingness and limits. Keyboard city selection and ordinary desktop navigation work.
- Shared climate plot keeps its existing default axis for other regions; Canada's axis extends to −30°C for northern winter temperatures.

Local unit, built-output and real-controller Happy DOM tests cover these behaviours. Desktop visual layout and external-link operations need an actual browser; the parent will supplement with cloud Chrome. Automated DOM testing is not reported as actual-browser verification.

## Canada map revision scope

The Canada-only Draft integrates source-backed crop/livestock production belts, four forest display classes, nine climate stations and existing elevation, river/drainage/rainfall/landform layers, three industry learning sectors, and actual population-grid plus simultaneous population-group/religion distributions. Browser acceptance uses 1920×1080 CSS pixels as primary and 1440×900 as auxiliary, with sandboxed Chrome, DPR and actual map-frame metadata. Source/controller tests and actual screenshot inspection are separate evidence.

## Four additional official climate stations — 2026-10-11

Original ECCC result HTML for Toronto, Montreal Trudeau, Calgary and Halifax Stanfield was obtained by ordinary HTTPS in the existing GitHub review job (114359778238). The parent checked the returned original bytes and SHA-256. `scripts/update-canada-climate-stations.mjs <original-html-directory>` checks the exact 12-month/annual/quality rows against the retained official station inventory, records the original page hash, and checks each observation point against the existing 0.1° Köppen source TIFF and published Canada geometry. The source TIFF is read from the existing shared world-source archive; no Russia asset is edited. Run `prepare-canada-nature.mjs` afterward. No source graphics, inferred values or new station coordinates are used.

Original page SHA-256 values:

- Toronto: `8088e3e8921485f948ec0310d0743384e53665129e462d8d13f01c6c362b6a3a`
- Montreal: `9d98d1463a3942b0fe9d7c0f5878cb07b70ccd40b4ab5b5c08c869bd96664473`
- Calgary: `62ff281e17bb5f3e5cda7bc72f480f201b340fe9b1ed65e649083801eabb00a0`
- Halifax: `161837f0566452a22cec95f70a2517c87f8340ba8ab533bda9e19c8ad8ca289c`

Groundwater/geological-unit sources remain archived for acquisition evidence; the Canada page no longer publishes those controls, descriptions or datasets. Nelson remains the source major drainage region, and Saskatchewan is displayed as its tributary drainage subdivision without counting it as a disjoint peer. Precipitation values use the seven official color ranges directly, without measurement-point symbols. Ocean current arrows are sourced explanatory directions (NOAA Northeast Currents), not measured tracks, speed or seasonal boundaries.

## Complete St. Lawrence geographical-feature outline — 2026-10-11

Natural Earth contains only seven upstream vertices for St. Lawrence. The display replaces that feature alone with the exact NRCan / Canadian Geographical Names Database official feature `4d00fe4cba2011d892e2080020a0f4c9`, expanded through the official geographical name `EFGFK`. Both original ordinary-HTTPS responses are retained in `st-lawrence/feature.json` and `st-lawrence/expanded.geojson`. Their geometry is identical: one closed MultiPolygon ring with 3,135 vertices, from the Lake Ontario outlet side through the estuary. It is rendered as the geographical-feature footprint outline, not as an inferred centerline, navigation route, wetted area, water depth or discharge measure. No clipping, simplification or coordinates inferred from cities are applied.

Run `node scripts/prepare-canada-st-lawrence.mjs` for this replacement alone. The full nature preparation also calls this offline adapter after rebuilding the unchanged Natural Earth subsets. The other 83 rivers, all 149 lakes and the original seven-vertex Natural Earth source remain unchanged. `public/assets/atlas/canada-nature-v1/st-lawrence-manifest.json` records the canonical CGNDB name ID and URLs, both original byte hashes, geometry hash, vertex count, output hash and the other-river hash. The complete retrieval record, including the raw API feature ID and exact feature-request URL, is preserved in `st-lawrence/provenance.json`; release validation rules remain unchanged.

- Feature JSON SHA-256: `ee7df12a7dee9d8e7d737aee4b929a065212677e78fc0c6f11153c6ead0dfd95`.
- Expanded GeoJSON SHA-256: `be20c9ef313a4e521c62ad47f0c48ac67c633d60b669a9459ff2b2662626d643`.
- Actual coordinate bounds: `[-76.4696127, 44.1300071, -64.3028586, 50.3008614]`. The API metadata bbox is broader: `[-77.1412943, 44.0872357, -64.0730012, 50.9542312]`. Both are preserved independently; all geometry lies within the metadata bbox.
- Original terms link: Government of Canada terms; no unverified dataset-specific licence is claimed. Original bytes and hashes were obtained and checked by the parent through the existing review CI. Actual screen verification remains the separate existing PC-browser CI check.

## Fine population distribution — 2026-10-11

Adopted: JRC GHSL GHS-POP R2023A V1-0, 2020 published population model. All 24 original 1 km equal-area Mollweide tiles required by the existing Canada outline were acquired through ordinary HTTPS. Original ZIP/TIFF hashes, raster dimensions, CRS, transform, NoData and source-cell counts are pinned in `public/assets/atlas/canada-population-grid-v1/source-inputs.json`.

`scripts/prepare-canada-population-grid.py` sums aligned 5×5 original population cells and divides by their valid equal-area source-cell count. Original NoData −200/nonfinite cells are excluded from both numerator and denominator; genuine zero stays zero. The approximately 9.9 km Web Mercator display-cell centre selects its containing original 5 km aggregate. There is no continuous interpolation or independent census allocation. PNG and Float32 lookup use the same array; complete equality and lossless roundtrips were checked during original generation. Ten existing CMA reference-anchor samples were independently checked against the source aggregates; those local samples are neither city centres nor CMA population/mean-density figures.

The 1000×1293 grid contains 525,177 available display cells, including 389,522 genuine zeros and 135,655 positive values. 4,279 Canada-masked cells remain missing. Country-outline/border generalization, water/border-crossing source cells, display resolution, and the 2020 model/2021 census distinction are declared in the manifest and page. Do not sum display pixels or densities for national or city totals.

Reproduce with retained/pinned originals outside the repository:

```sh
python3 scripts/prepare-canada-population-grid.py --cache /tmp/canada-ghsl-originals --deps /tmp/canada-population-python --download
```

Python dependencies used in acquisition: Rasterio 1.4.3, NumPy 2.2.6, Pillow 11.3.0. The first reviewed acquisition used `--pin-inputs`; subsequent runs verify the original ZIP hashes. The ordinary-HTTPS optional acquisition script is retained; automatic source acquisition was removed from CI after integration. Sources: https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php and the immutable official tile URLs in the pinned source inventory. Attribution: European Commission, Joint Research Centre; CC BY 4.0.

Next candidate: Statistics Canada 2021 CSD boundaries/table. See `population-subdivisions/README.md` for the retained table and the concrete service/transfer limitations. The application publishes the acquired GHSL distribution instead of replacing the requested fine map with definitions or missing-data prose.
