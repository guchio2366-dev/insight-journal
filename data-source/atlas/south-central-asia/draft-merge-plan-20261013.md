# South / Central Draft integration plan (not executed)

Heads checked on 2026-10-13: South Draft PR #339 `8a7f465`, Central Draft PR #340 `398ea725`, common main base `a07ab727`. `git merge-tree --write-tree --name-only 8a7f465 398ea725` reports five content conflicts. The two source-audit Markdown files are independent; no census polygon or number is added by this audit.

Merge South into the intended main integration branch first, then bring Central onto that updated tree. Resolve each shared file by retaining both focus-specific conditions rather than selecting either whole file:

| Conflict file | Preserve from South | Preserve from Central |
| --- | --- | --- |
| `src/components/atlas/AsiaAtlasPage.astro` | Three South industry entrances and South crop source/method; Sri Lanka ethnicity source and Palk/monsoon notes | Central physical sources, Turan and mid-latitude wind provenance, Central focus scope |
| `src/components/atlas/AsiaSettlementPanel.astro` | Sri Lanka 2024 nationwide/district ethnicity reading | Kazakhstan 2025 nationwide ethnicity reading; Central religion report distinctions |
| `src/scripts/atlas-asia-explorer.ts` | South crop-area selection, nonexclusive overlap and livestock dimming | Central terrain/landform country-selection clearing and repeated opacity synchronization |
| `src/scripts/atlas-asia-presentation.ts` | South crop-area display and map labels | Central Turan/westerlies reference labels, country-free terrain and 500 m contours |
| `tests/e2e/atlas-south-central-focus.test.mjs` | South industry three entrances and crop selection assertions | Central terrain no-country, wind/Turan visible labels, opacity toggle assertions |

After resolving, check that both `south-asia` and `central-asia` routes retain their own country set, direct URLs, map layers, source statements and test assertions. Run a production build, `npm run verify:release`, the focused PC Chrome workflow with normal sandbox and the full `Validate site` workflow. Preserve separate source years and denominators for every social marker. This plan does not authorize treating GeoEPR/EPR-ED as local census composition or inventing district geometry.
