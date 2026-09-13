# North America agriculture statistics — source and transformation record

## Published series

The page ships only reviewed, normalized values. It does not call a paid map or
statistics API at runtime. National charts remain fixed when a reader selects a
crop region. Crop charts cover raw agricultural commodities; processed goods
are not added to their totals.

| Display | Definition | Period | Official source |
| --- | --- | --- | --- |
| U.S. cash receipts | Crop and livestock parent totals, followed by 11 crop and 5 livestock subcategories; not profit, GDP or physical production | 2025 estimate | USDA ERS Farm Income and Wealth Statistics, 2026-09-03 release |
| U.S. agricultural exports/imports | Calendar-year nominal trade value | 2016–2025 | USDA ERS FATUS calendar-year workbook |
| Export destinations | Physical export quantity, top five destinations and residual Other | 2025 preliminary | USDA ERS FATUS; rice from USDA FAS GATS |
| World production | Production and U.S. share calculated within one PSD commodity, unit and marketing year | MY 2015–2024 | USDA FAS PSD, 2026-09-11 file |

Commodity bases are grain corn, whole soybean, unmilled wheat, cotton excluding
linters for trade and cotton lint in 480-pound bales for production. Rice trade
uses BICO-HS10 FAS-convertible line items in metric tons milled equivalent
(MTMEQ); rice production uses PSD `Rice, Milled`. These bases are printed beside
the charts and must stay paired with their values.

The destination shares divide each displayed destination by the matching world
total from the same query. `Other = total - top five`. The production share is
`United States production / sum of all PSD country or reporting-area production`.
The file contains the EU aggregate without duplicate member-country production
rows for these extracts. A trend sentence compares the mean of the last three
marketing years with the first three; it is descriptive, not a significance
test or forecast.

Cash receipts are read from the source unit `thousand USD`. The page first
divides Crop and Livestock receipts by All Commodities, then divides each child
category by its own parent. Consequently the two chart levels have different
denominators. One-thousand-dollar rounding residuals in each parent are kept as
explicit reconciliation metadata rather than silently assigned to a category.

## Input register

| Input | Retrieved | SHA-256 | Repository policy |
| --- | --- | --- | --- |
| `FarmIncome_WealthStatisticsData_September2026.csv` | 2026-09-13 | `b2a34d461c77451d62f2839c83860b0b2884f139319f1e656f46997861876808` | 111 MB, re-download; do not commit |
| `ers-fatus-calendar-2025.xlsx` | 2026-09-13 | `7c3da78decec4839068e139044c827b348c403bc474b3f30ceeb34ae87c71c0b` | committed source workbook |
| `ers-fatus-top-markets-2026-09.xlsx` | 2026-09-13 | `73b4a69bb54beea310baf655936e3edeaa877b2ac1672be5aaa05d3f187a920d` | committed source workbook |
| `psd_alldata.csv` | 2026-09-13 | `e123e801565da541a0a954e33a17b49d058af45a295bcef3edcf9896872759a2` | 202 MB, re-download; do not commit |
| `rice-gats-2025.csv` | 2026-09-13 | `62b64c2177d1f0aed37aaf65bb71b433089875680a261477ab372fa82b501946` | committed small extract |

Farm Income release URL:
`https://www.ers.usda.gov/media/29517/september-3-2026-release.zip`.
PSD full download URL:
`https://apps.fas.usda.gov/psdonline/downloads/psd_alldata_csv.zip`.

The rice query used GATS U.S. Standard Query: FAS U.S. Trade; Exports;
BICO-HS10; product `0030AT` Rice; all partners; annual January–December 2025;
quantity Q1; FAS-converted; Product/Partner; include All and rank. GATS reports
that quantity totals include only line items whose units equal or can be
converted to the assigned unit, so the chart carries that qualification.

## Reproduction

`scripts/prepare-atlas-statistics.py` reads the two small committed workbooks,
the reviewed rice extract and locally downloaded Farm Income/PSD CSVs. It
validates required years, unique U.S. rows and all displayed totals before
rewriting `src/data/atlas/statistics-generated.ts`.

```sh
python3 scripts/prepare-atlas-statistics.py \
  --farm-income /absolute/path/FarmIncome_WealthStatisticsData_September2026.csv \
  --psd /absolute/path/psd_alldata.csv
npm test
```

The script requires Python and `openpyxl` only during editorial updates. No raw
input or Python dependency is shipped to the reader.
