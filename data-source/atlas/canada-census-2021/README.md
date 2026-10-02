# Canada Census Agriculture 2021

The retained official table archives contain field crops/hay (32-10-0309-01), cattle inventories (32-10-0370-01), and land use (32-10-0249-01). Selected CSVs preserve original row text for the seven explicitly named variables, 2021, official national/province records, and 1,747 published CCS records. Filter the `Unit of measure` dimension to Hectares or Number of animals: the separate `UOM` column is Number for both. Preserve original value, quality A–F, vector, coordinate, symbol, and decimals. F has a blank value; zero is numeric zero.

`leca000e21a_e.zip` is the official 2021 agricultural ecumene package, including generalized CCS polygons and the ecumene mask. `ccs-source-4326.geojson` is the complete official REST layer-1 query with `outSR=4326`, copied byte-for-byte to the public map asset. It has 1,757 polygons, including ten territorial CCSs with no published agricultural rows. Every published CCS joins by DGUID. No new simplification, rounding, tracing or invented points is applied; the original product is already generalized at 5 km.

These polygons are statistical administrative regions. Under the main farm headquarters rule, all parcels of an operation may be assigned to its headquarters region. The values do not identify cultivated fields, farms or individual animals. No area density or exact parcel area is inferred from polygon size. The map year remains 2021 independently of annual survey controls. RTA-adjusted regional figures must not replace government national/provincial totals by summation.

Pasture is Tame or seeded pasture + Natural land for pasture. Hay is specifically Alfalfa and alfalfa mixtures + All other tame hay and fodder crops, excluding forage seed. This derived two-component hay measure has national value 5,238,906 ha and is distinct from the retained original map's Total hay figure of 5,394,265 ha. No inferred three-component redefinition is made. If any component has grade F, the sum is null; component quality grades remain intact and no official aggregate grade is invented.

The statistical tables and documentation use the Statistics Canada Open Licence. The geometry package's XML declares Open Government Licence – Canada. The manifests preserve each product's source, license, access date (2026-10-02), release/reference dates, byte size, SHA-256, and extraction method. Adapted statistical attribution and geometry license attribution are also available to the UI.

Offline reproduction from the authorized audit cache:

```powershell
node data-source/atlas/canada-census-2021/convert.mjs 'C:/Users/guchi/AppData/Local/Temp/canada-crop-data-audit-20261002' 'C:/Users/guchi/Documents/Codex/2026-09-30/task/insight-journal-canada-census'
node --test tests/unit/atlas-canada-census-data.test.mjs
```

The converter reads the original ZIP-extracted CSVs and metadata from the cache, retains selected source rows, verifies all published DGUID joins and quality/value invariants, and emits the fixed dataset, byte-identical geometry and source ledgers. The test independently extracts CSVs from the original ZIPs and compares every retained component against its original official row.
