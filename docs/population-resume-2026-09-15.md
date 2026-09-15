# Population resume checkpoint — 2026-09-15

## Preserved work
Recovered Work changes are retained on local branch codex/population-v2, commit d1ee67e. Patch, source archive and incremental bundle are in the parent scratch directory. These backups have not been pushed to GitHub.

## Current implementation base
Local branch codex/population-religion-resume, commit e531601, reconstructs GitHub main 0516da49ecc8ca0b15a091723705f49e8e8d1069. All 27 changed files were checked against GitHub blob hashes. The complete tree equals 84ef11527ccc04b9edd54dc6dd65b641a02930e4. This is a content snapshot, not an imported copy of remote commit history. The configured origin is a local sibling repository; do not push to it as though it were GitHub.

## Religion data investigation
Official report: https://prri.org/research/census-2023-american-religion/
The report describes 3,142 county estimates for adults and 18 categories. Estimates use pooled surveys and demographic/political model inputs, including 2020 presidential voting. A religion-vote association from these estimates is not independent evidence of a causal relationship.

The official AVA interface at https://ava.prri.org/ was usable. Its current religious-affiliation interface offered Metro, State and Region, with a CSV download, but no county option was observed. State data must not substitute for county data.

A county map linked from the report was opened at https://datawrapper.dwcdn.net/d76SP/7/. Its inspected controls were zoom/reset and social sharing; no data-download control was observed. This does not establish that the underlying dataset is unavailable elsewhere.

A proposed dataset.csv URL could not be opened by web retrieval. Direct PRRI shell access timed out. The official Data Vault link https://prri.parc.us.com/client/index.html timed out in Browser. No complete county dataset was downloaded. County identifiers, all category columns, missing-value rules and reuse terms remain unverified.

## Resolution after restart
The official 2020 U.S. Religion Census summary and group-detail workbooks were downloaded and validated. They provide reproducible county FIPS, group names, adherent counts and definitions. The implementation will therefore use the largest reported adherent group by county, with the survey-versus-congregational-count difference stated in the interface. The confirmed specification and audit results are recorded in `docs/population-religion-dominant-design-v1.3.md`.
