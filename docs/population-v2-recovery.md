# Population v2 — recovery checkpoint

Base: 3ded01fddd9b7f43e6b89fe6f18b7161f183a9e2 (includes water-label fixes).
The previous local runtime failed its exec-server initialization handshake.
This commit reconstructs the population UX changes from the recorded work and
adds regression checks using the repository's existing GitHub Actions workflow.

## Implemented scope
- County-largest ACS ethnicity map: eight exclusive B03002 categories, unique plurality.
- Legend selection replaces the reading panel without changing map color, camera, or fetching data.
- Density city selection replaces national reading; the old density-metro control is retired.
- Religion cities and cultural regions share one selector and one reading panel; no county graphs.
- Five contiguous focus states reuse the 2024 county vote map with matching static fallbacks.
- New Hampshire is included; Vermont is not. Alaska explicitly states the missing geography match.
- Shared map lifecycle, URL restoration, keyboard/tap controls, and late-request protection.

## Data work still blocked
The PRRI county religion estimates and tract-level ethnicity estimates have not
been acquired or verified. No substitute statewide religious fill, fabricated
county winner, or county-density proxy for tract ethnicity is shipped.
Religion remains an explicitly labelled cultural-reference map.
The three existing metro boundary/density datasets are preserved in the repository.
The metro ethnicity selector will be enabled only after compatible B03002 tract
data are checked against those boundaries and suppression codes.

## Verification
Run the existing Validate site workflow: unit tests, production build, built-site
tests, and release verification. Rendering builds ethnicity and focus-state
fallback images from the same data and color functions as the interactive map.
Visual checks on a real browser/device remain separate from the DOM tests.
