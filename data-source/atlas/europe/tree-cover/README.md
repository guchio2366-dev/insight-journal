# ESA WorldCover 2021 tree-cover extraction

`source.json` records the official product, definition, year and CC BY 4.0 terms.
`range-inputs.json` records exact public COG URLs, bounded byte ranges and SHA256
of the source bytes used. These hashes are not hashes of entire 10 m source tiles.
`retained-extraction.json` describes two small raw compressed overview blocks
from Finland and western Russia, retained for independent offline alignment checks.

Build: `node scripts/europe/prepare-tree-cover.mjs --fetch --cache <private-cache>`.
Omit `--fetch` for an offline rebuild after the private cache has been populated.
The pipeline reads the provider's categorical overview, samples it with nearest
neighbours into EPSG:3857, and clips to existing target-country land polygons.
The provider's overview-generation resampling is not specified; no area or volume
estimate is computed. Display query values are 1 (tree cover), 0 (other valid cover)
and -1 (missing or outside target land). Tree cover includes plantations/tree crops
and is distinct from the separate WDI 2023 national forest-area percentage.
