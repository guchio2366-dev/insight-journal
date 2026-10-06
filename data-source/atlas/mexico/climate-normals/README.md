# Mexico: selected SMN climate normals

The atlas uses two official CONAGUA / Servicio Meteorológico Nacional station records for **1991–2020**. Both were downloaded directly from the official SMN HTTPS TXT URLs on 2026-10-05; the source emission date is 2026-10-02. The JSON values are parsed from those downloads, not copied from a prompt or estimated from the thematic climate map.

| Atlas use | SMN record | Station scope |
| --- | --- | --- |
| Capital climograph | 09048, TACUBAYA CENTRAL (OBS), WMO 76680 | Miguel Hidalgo, Ciudad de México; 19.40361111° N, 99.19611111° W; 2,308.6 m |
| Agriculture comparison | 25015, CULIACAN (DGE), no WMO code supplied | Culiacán, Sinaloa; 24.806146° N, 107.407188° W; 60 m |

Tacubaya represents its named station, not the airport or a citywide spatial average. Culiacán uses **DGE 25015**, not **OBS 25014**, and does not represent all Sinaloa farms. In both plotted series, Tacubaya has 30 years of data for each month. Culiacán has 29 for October and 30 for every other month. These are counts of years with data, not guarantees of complete daily observations.

`nor9120_09048-selected.txt` and `nor9120_25015-selected.txt` retain the exact downloaded station metadata plus the selected monthly normal and available-year rows. Unrelated maxima, minima, extremes, evaporation and rainfall-day series are excluded. `provenance.json` gives original row numbers, full-download byte counts and SHA-256 hashes, selected-file hashes, and the extraction script hash. The complete downloads remain outside the repository. Annual values are the source's annual values: they are **not** recalculated from rounded monthly values.

The official catalogue is [SMN Normales Climatológicas por Estado](https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado). Attribution must name CONAGUA / SMN, the 1991–2020 period, and the station. Each station's exact TXT and catalogue URLs are included in the JSON.

No explicit dataset licence for these TXT records was verified. The terms page linked by SMN returned HTTP 403 and was not bypassed. `reuse-evidence.json` records a narrow factual-use assessment based on the current [official Ley Federal del Derecho de Autor](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf), Articles 14 X and 107, while acknowledging database protections under Articles 108 and 110. This assessment does not grant or claim an open licence for the complete SMN database. Only the limited statistical facts and provenance are reused; source report prose, graphics, logos and the full database are not redistributed.

To reproduce after downloading the two public official TXT files to a local scratch directory:

```text
node data-source/atlas/mexico/climate-normals/prepare.mjs <09048-TXT-path> <25015-TXT-path>
node --test tests/unit/atlas-mexico-climate-normals.test.mjs
```

The extraction command reproduces the 2026-10-05 snapshot from the original downloads matching the hashes in `provenance.json`. It refreshes the selected evidence, provenance, and `src/data/atlas/mexico/climate-normals.json`. SMN may reissue a TXT with new emission metadata; a later download must be reviewed as a new snapshot, with the retrieval date and pinned full-download hashes updated together. The checks independently compare the delivered numbers, counts, station metadata and identities against the retained selected source rows.
