# Mexico: selected SMN climate normals

The atlas uses four official CONAGUA / Servicio Meteorológico Nacional station records for **1991–2020**. Tacubaya and Culiacán were downloaded directly from the official SMN HTTPS TXT URLs on 2026-10-05, with exact retained selected rows and full-download hashes. Chihuahua and Villahermosa were checked in the official TXT bodies by the parent web reader on 2026-10-12; this execution environment received the monthly and annual values, station coordinates, and data-year counts, but its direct TXT downloads failed at the CONNECT tunnel with HTTP 403. The two new records are separately marked as reviewed transcriptions, without invented byte counts or hashes.

| Atlas use | SMN record | Station scope |
| --- | --- | --- |
| Capital climograph | 09048, TACUBAYA CENTRAL (OBS), WMO 76680 | Miguel Hidalgo, Ciudad de México; 19.40361111° N, 99.19611111° W; 2,308.6 m |
| Agriculture comparison | 25015, CULIACAN (DGE), no WMO code supplied | Culiacán, Sinaloa; 24.806146° N, 107.407188° W; 60 m |
| Northern dry comparison | 08040, CHIHUAHUA (OBS), WMO 76225 | Chihuahua; 28.670819° N, 106.031002° W; 1,509 m |
| Southeastern wet comparison | 27054, VILLAHERMOSA (DGE), no WMO code supplied | Villahermosa, Tabasco; 17.99666667° N, 92.92833333° W; 24 m |

Tacubaya represents its named station, not the airport or a citywide spatial average. Culiacán uses **DGE 25015**, not **OBS 25014**, and does not represent all Sinaloa farms. In both plotted series, Tacubaya has 30 years of data for each month. Culiacán has 29 for October and 30 for every other month. These are counts of years with data, not guarantees of complete daily observations.

`nor9120_09048-selected.txt` and `nor9120_25015-selected.txt` retain the exact downloaded station metadata plus the selected monthly normal and available-year rows. Unrelated maxima, minima, extremes, evaporation and rainfall-day series are excluded. `provenance.json` gives original row numbers, full-download byte counts and SHA-256 hashes, selected-file hashes, and the extraction script hash. The complete downloads remain outside the repository. Annual values are the source's annual values: they are **not** recalculated from rounded monthly values.

The new station transcription and its access limitation are in `parent-reviewed-additions.json`. The station points were intersected with the retained original INEGI SHP/DBF, so the climate classes are source polygons at those coordinates, not classes inferred from the rainfall and temperature arrays. The official catalogue is [SMN Normales Climatológicas por Estado](https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado). Attribution must name CONAGUA / SMN, the 1991–2020 period, and the station. Each station's exact TXT and catalogue URLs are included in the JSON.

No explicit dataset licence for these TXT records was verified. The terms page linked by SMN returned HTTP 403 and was not bypassed. `reuse-evidence.json` records a narrow factual-use assessment based on the current [official Ley Federal del Derecho de Autor](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf), Articles 14 X and 107, while acknowledging database protections under Articles 108 and 110. This assessment does not grant or claim an open licence for the complete SMN database. Only the limited statistical facts and provenance are reused; source report prose, graphics, logos and the full database are not redistributed.

To reproduce after downloading the two public official TXT files to a local scratch directory:

```text
node data-source/atlas/mexico/climate-normals/prepare.mjs <09048-TXT-path> <25015-TXT-path>
node --test tests/unit/atlas-mexico-climate-normals.test.mjs
```

The extraction command reproduces the two 2026-10-05 records from original downloads matching the hashes in `provenance.json`, then includes the separately reviewed Chihuahua and Villahermosa records from `parent-reviewed-additions.json`. It refreshes the selected evidence, provenance, and `src/data/atlas/mexico/climate-normals.json` without dropping the additional two stations. SMN may reissue a TXT with new emission metadata; a later download must be reviewed as a new snapshot, with the retrieval date and pinned full-download hashes updated together. The checks compare the first two delivered records against retained source rows and the additional two against the reviewed transcription, retaining the evidence distinction.
