# Mexico groundwater: retained INEGI geohydrological units

The ten compressed class files are byte-identical to the reviewed 0.002-degree display candidate from the national INEGI Serie II archive. The original archive is 148,922,652 bytes and remains outside the repository; its official URL, digest, CRS transformation and source-record audit are retained in `groundwater.canonical.source.json`. The generator uses the retained class files without a new download or geometry repair.

The classes distinguish consolidated and unconsolidated material, with either source yield (>40, 10–40, <10 L/s) or qualitative occurrence potential (medium, low). They are not present groundwater volume, current withdrawals, or CONAGUA legal aquifer boundaries. Low potential does not mean no water. Source creation was 1996-03-01 and revision 2008-12-01; a common observation period is not specified.

All 29,479 classified source records and 48,769 rings are retained. Water-body records (5,055) and foreign records (17) are excluded explicitly. The source had 92 invalid polygons; display generalization leaves 48 invalid geometries in the audit. Neither analytical topology nor exact local boundaries are claimed. The country clip is a display mask from the existing 32-state boundary, not an analytical intersection.

Run `node scripts/prepare-mexico-groundwater.mjs` to derive the public manifest, unchanged class transports and national overview PNG. The 1800×1160 image uses the existing 900×580 Mexico Lambert map coordinates and all ten class colours. It avoids fetching all 8.24 MB of vector data for the national overview. Selecting a class loads that class alone (99,094 to 2,552,848 bytes). Tiny parts may be below image resolution; the class vectors retain their reviewed geometry.

INEGI permits free use with attribution and preservation of metadata and processing information. The official dictionary is linked from `valueDefinitionSource` (printed pages 20–21). The original proposal status in the canonical input is historical provenance; the public implementation's validation and release are tracked separately.
