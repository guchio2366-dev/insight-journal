# Mexico locality population distribution

The population entry opens the entire country without selecting a state. Orange
circle area represents people. Gray anchors locate source points and do not encode
population. The right panel retains official totals, visible values, point meaning,
source notes and an accessible list of the largest visible marks. Existing state
density/count views and the existing ethnicity and eight religion categories remain
available.

INEGI ITER 2020 contains 189,432 real localities, totaling 126,014,024 people. Each
nine-digit ENTIDAD/MUN/LOC key and numeric POBTOT is retained. LOC 0000 aggregate
rows and LOC 9998/9999 synthetic summaries are excluded. Counts reconcile with all
2,469 municipalities and all 32 existing state totals. Missing and confidential
values are never converted to zero.

The first request is a 331,683-byte gzip overview of 8,359 groups. Each source
locality belongs to one 4 × 4 display-unit cell within its original state. Counts
are summed, and group position is the population-weighted mean of original
representative coordinates. At a camera width of 90 display units or less, only
intersecting state shards load and original locality points replace groups. All
32 detail shards total 4,118,481 gzip bytes. No density surface or housing positions
are inferred. Circle areas use one common scale per visible map, with a matching
legend and a maximum radius of 14 CSS pixels. Map navigation preserves geographic
proportions and its `localityFrame` URL.

The original coordinates are the official representative DMS values. They use the
existing background's display projection; ITER's datum and epoch are not explicitly
documented in the reviewed descriptor, so no datum accuracy or epoch-dependent
transformation is claimed. Counts use 2020 locality codes; background state geometry
is 2025. Source dates, licence URL, digest, display projection and processing notes
are retained in `public/assets/atlas/mexico-population-localities-v1/manifest.json`.

Regenerate from the already-authorized official nationwide archive:

```sh
python3 scripts/prepare-mexico-population-localities.py --archive /path/to/iter_00_cpv2020_csv.zip
node --test tests/unit/atlas-mexico-population*.test.mjs
```

The archive must match SHA-256
`9342fdbd45bda5897f2b827a12904843b6f8fb85d4e72da299e09e4d2422ab60`.
The selected eight original source fields remain in the repository as a gzip CSV;
assets are deterministic gzip files. No archive download occurs during builds.

PC evidence uses the existing `capture-mexico-pc-review.mjs` and existing sandboxed
CI browser. Population checks include the nationwide counts, actual painted Canvas
pixels, cluster expansion, partial shard loading, original locality keys, URL reload
and national reset. No new workflow or browser security exception is required.

Remaining baseline work is separate: ITER cultural categories need explicit treatment
of confidentiality, denominators and the difference between its four religion groups
and the existing eight groups before any locality cultural view is added. Mobile work
is outside this implementation's requested scope.
