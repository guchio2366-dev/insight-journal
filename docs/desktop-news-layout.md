# Desktop news rail

## Approved scope

The user approved the desktop concept and common layout changes across all four
tabs, limited to introducing the news rail. Target viewports: 1920×1080,
1440×900, 1366×768. Mobile/tablet redesign is explicitly out of scope.

Locked: left independent news scroll, existing map in the middle, existing
field explanations on the right, no changes to statistics or public content.
Flexible: rail width (300–380px; 380–520px while reading), map/reading ratio,
spacing. Below 1200px the rail stacks safely above the existing workspace.

### Laptop correction (all four fields)

At 1200–1599 CSS pixels all four fields retain the same news / map / reading
columns as the monitor layout. Their idle rail uses `clamp(220px,19vw,340px)`;
the map/reading grid uses `1.65fr / minmax(320px,1fr)` with a 14px column gap.
Nature's climate overview stays below the map, with its selected explanation
spanning both rows on the right. News-reader expansion is unchanged.
Agriculture uses this layout for its overview, every crop/livestock product,
forestry and relation readings; it no longer depends on selecting corn or
opening a story. Existing corn/product-story overrides remain unchanged, as do
the layouts below 1200px and at/above 1600px. Only the legacy land overview
retains the single-column laptop fallback.

### Expanded agriculture readings

All 11 crop/livestock products use the common `.agri-reading-body` scroll
container. The full-reading disclosure and its sources remain in normal flow;
no nested flex/hidden-overflow box may clip their content. The body is keyboard
focusable. On narrow or short screens the existing page scroll reaches the full
text. This also removes the corn-only nested scroll layout that hid the text
beyond the disclosure's visible edge.

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
`tests/e2e/atlas-desktop-layout.test.mjs` checks the built CSS cascade at
390, 1199, 1200, 1280, 1366, 1440, 1599, 1600, and 1920 CSS pixels. These are
style-contract checks, not browser geometry or GPU-rendering tests.
Expanded-reading checks cover all 11 products at laptop, monitor, mobile and
short-screen sizes, including the source links at the end of the text. Browser
review must additionally open the disclosures and scroll the text to its end.
