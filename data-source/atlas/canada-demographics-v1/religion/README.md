Religion data snapshot for the Canada atlas

Statistics Canada table 98-10-0353-02, reference year 2021, released 2023-06-21 and accessed 2026-10-02. The parent cube PID is 98100353; the displayed table view PID is 9810035302.

The original selected database-loading CSV contains 1,033 physical rows for Canada and the 41 whole census metropolitan areas, with Total - Age, Total - Gender and 2021 Counts selected. Geography selection uses exact official classification codes at geography level 503, plus official DGUID verification against the existing atlas population data. Ottawa - Gatineau is one whole CMA (505 / 2021S0503505 / member 85); provincial part members 86 and 87 are excluded.

The selected export omits 17 zero coordinates. The saved official table HTML contains an embedded `prepareTable` response with the exact cells for all 42 selected geographies. The preparation script checks every original CSV count against that response and accepts an omitted coordinate only when its official cell is numeric `0.0`, formatted `0`, with an empty reference marker. The completed 1,050-row extraction CSV identifies each cell's source in `SOURCE_DATA_ORIGIN`. This is explicit source verification, not missing-value imputation.

The nine displayed categories are the immediate children of Total - Religion: member IDs 2, 3, 19, 20, 21, 22, 23, 24 and 25. All 25 source categories, including the Christian denominations, remain in the CSV. Christian is not added to its children. The default category is No religion and secular perspectives (25).

The denominator is this table's Total - Religion count for each geography, using the same reference year and dimension selection. It represents weighted estimates of persons in private households in occupied private dwellings from the long-form census and differs from whole-population census counts. Percentages are computed in the UI from these published counts. Census counts undergo random rounding; totals can differ slightly when added. Published zero is retained and does not establish the complete absence of people with that affiliation.

Official data quality codes, notes and short/long-form total non-response rates are preserved for each geography. Canada, Montreal, Vancouver, Calgary and Brantford carry notes that one or more incompletely enumerated reserves or settlements are excluded. No selected cells carry suppression symbols, empty values, or status markers in this snapshot.

Run `node scripts/prepare-canada-religion.mjs` from the repository root. The script generates the topic JSON, completed selected CSV, public manifest and this folder's provenance JSON. It performs strict metadata, hierarchy, row-count, cell-value, geography, denominator, zero and duplicate checks before writing outputs. `provenance.json` records source URLs, request body, byte counts, SHA-256 hashes and the 17 exact zero coordinates.

Licence: https://www.statcan.gc.ca/en/terms-conditions/open-licence

Adapted from Statistics Canada, Religion by gender and age: Census metropolitan areas and census agglomerations (Table 98-10-0353-02), 2021. This does not constitute an endorsement by Statistics Canada of this product.
