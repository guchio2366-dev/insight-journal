# Desktop news rail

## Approved scope

The user approved the desktop concept and common layout changes across all four
tabs, limited to introducing the news rail. Target viewports: 1920×1080,
1440×900, 1366×768. Mobile/tablet redesign is explicitly out of scope.

Locked: left independent news scroll, existing map in the middle, existing
field explanations on the right, no changes to statistics or public content.
Flexible: rail width (300–380px; 380–520px while reading), map/reading ratio,
spacing. Below 1200px the rail stacks safely above the existing workspace.

## Content and interaction contract

- Build the list from approved public `articles` only. Match North America or
  US/CA/MX, newest published date first, slug as deterministic tie breaker.
- Never use concept-image headlines or unrelated India sample content.
- The initial release intentionally shows an empty state until matching public
  articles are added through the existing publishing process.
- Open article content locally in the rail; preserve the existing map instance,
  filters, URL and list scroll position. Close or Escape restores link focus.
- Only an explicit location button changes the camera. Use a documented point
  inside the existing atlas camera bounds. Never move the map on reading scroll.
- Full article links retain access to the original map, timeline and exports.
- No new chart, statistical transform, external ingestion or publishing bypass.

## Verification

`npm run check` covers existing data contracts, build, release, and controller
regressions. `tests/e2e/atlas-news.test.mjs` checks all four static routes,
honest empty state, reader/focus/close behavior, and explicit camera URL changes.
Synthetic article fixtures exist only in tests and are not published.
Desktop browser review additionally checks rail/map/reading geometry, horizontal
overflow, independent scroll, expanded reading, and tab switching.
