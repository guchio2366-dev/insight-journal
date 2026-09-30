# Canada nature pilot — 2026-09-30

First publication covers nature only; agriculture, industry and population are later stages. The default climate location is the capital Ottawa. Regina is a separate Prairie example for the next canola lesson, not a regional climate average.

## Sources and processing

- ECCC Canadian Climate Normals 1991–2020: Ottawa 6105976, Vancouver 1108447, Winnipeg 5023222, Iqaluit 2402590, Regina 4016560. `climate-source-extract.json` preserves the two numeric source rows, inventory coordinates, source URLs and page hashes. The official station inventory is retained. Extract published numerical facts into new charts; official graphics are not reproduced. Government website terms are linked without claiming that this dataset has an Open Government Licence.
- Natural Earth v5.1.2 1:50m rivers and lakes, public domain. Retain source features with a vertex in the display bounds; coordinates are unchanged. This yields 84 river and 149 lake features and includes cross-border waters. It is not a flow, basin-boundary or national clipping dataset. Existing Natural Earth 1:110m country boundaries provide locator context.
- NRCan Atlas of Canada 6th edition Physiographic Regions, archived 2009, geological classification based on 1967 mapping. Official metadata and original JPEG are retained. Open Government Licence – Canada. Resize the image for display, preserve the original layout and provide the original JPEG. The official Lambert projection is separate from the locator's equirectangular projection.
- Climate mechanisms: Canada's Changing Climate Report (2019), chapter 4. Numerical station observations are distinguished from regional explanations.

Run `node scripts/prepare-canada-nature.mjs` to regenerate climate JSON, vector subsets, resized image and the public manifest from the retained source files. No network is required. Missing numeric cells remain null; no station or month is inferred. The public manifest records editions, licences, processing and SHA-256 hashes. The downloaded archive is not required and is not included in this change.

## Acceptance checks

Routes: `/atlas/north-america/canada/` and `/atlas/north-america/canada/nature/`.

- Initial Ottawa climate, all 12 months, common axes, annual facts, composite metadata and source links.
- Compare Vancouver/Winnipeg/Iqaluit/Regina; selecting a city does not move the map. Explicit location and zoom controls change the camera.
- URL query and browser back/forward restore city, comparison, view, water selection and camera.
- Landform view shows the official full-resolution map link and adjacent Japanese explanations with English map-name equivalents.
- Water view shows real river/lake geometry. Select Mackenzie, show only selected, then return to all waters. Unnamed shapes are filtered as well.
- Read through all three views to the source footer, including year, units, missingness and limits. Keyboard city selection and ordinary desktop navigation work.
- Shared climate plot keeps its existing default axis for other regions; Canada's axis extends to −30°C for northern winter temperatures.

Local unit, built-output and real-controller Happy DOM tests cover these behaviours. Desktop visual layout and external-link operations need an actual browser; the parent will supplement with cloud Chrome. Automated DOM testing is not reported as actual-browser verification.

## Remaining packages

Canada agriculture: official StatCan canola distribution/quantity, Regina climate reference and Prairie production conditions; distinguish random area-quantity dots from farm locations and connect climate to soils, technology, transport and institutions. Canada industry and population remain separate packages. Mexico nature follows with Mexico City default and an explicitly identified Culiacán example only when station identity and all monthly values are confirmed. This pilot does not assert four-field regional completion.
