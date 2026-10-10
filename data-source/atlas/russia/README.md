# Russia first edition: scope and reproduction

Five routes provide an entry and four learning fields. Existing world entries are retained; Russia is the tenth entry. The three learning windows (European side/Urals, Siberia, Far East) are editorial reading frames, not administrative regions.

| Field | Displayed evidence | Time and meaning |
| --- | --- | --- |
| Nature | Original Beck Köppen–Geiger 0.1° classes | 1991–2020 climate; not weather, rainfall amounts, terrain or soil |
| Agriculture | MapSPAM wheat; GLW4 cattle | 2020 model harvested ha per native 5′ cell; cattle head/km² |
| Industry | Eight primary-source examples | Metals, oil, gas, coal, refining, management and two ports; dated national output/refinery capacity in text, representative points without quantity encoding or invented routes |
| Population | GHS-POP density and UCDB urban centres | 2020 model population; 5×5 valid 1km-cell density; 2025 fixed urban footprints containing 2020 population |

Every comparison retains the original map, both full legends, year/unit labels, an identical explicitly clipped frame, selected learning region and a named return. Missing cells remain distinct from valid zero. Raster display uses nearest-neighbour rendering. Natural conditions are read with management, transport, markets and institutions; neither layers nor explanations claim climate alone determines society.

Natural Earth v5.1.2 default de facto geometry is fixed and is not a verification of current borders. Its Crimea geometry and the unchanged UCDB Ukraine city assignment differ; these are explained in the source drawer. Original Crimea/Kuril disputed geometries are overlaid separately. No national totals or new sovereignty claims are made.

Source records below retain URLs, dates, source/output hashes, methods and attribution. Copyrighted company, port and FAO article bodies are not copied; short paraphrases and response hashes are retained. Open raster/urban sources are CC BY 4.0; Natural Earth is public domain. MapSPAM's prescribed adaptation text follows its full citation.

Normal `npm run build` consumes committed checked assets and needs no source downloads. Optional preparation requires the pinned source files recorded in each manifest: Python/NumPy/Pillow for climate and agriculture, Shapely for the climate display-class selection, Python standard library for UCDB, and GeoTIFF.js for bounded GHS-POP decoding. Each `scripts/prepare-russia-*` command exposes its input arguments and verifies pinned hashes. Global source caches remain outside public Git.

Verification includes all asset SHA ledgers, exact source crop windows across 180°, zero/missing separation, all 253 source-defined Russia urban records, independently decoded population windows, original representative coordinates and dated primary-source claims. Unit/E2E checks cover geometry, state/history/return, attribution, server-rendered no-JavaScript maps and the world entry. Real browser review compares the existing US and Russia screens at 1366×768 and 1180×757, with additional 390px layouts.

Oil/gas fields, national production/reserves, current population or crop statistics, terrain/soil/land cover and changing transport routes are outside this first edition. The four published fields use available validated evidence rather than placeholders or invented values.
