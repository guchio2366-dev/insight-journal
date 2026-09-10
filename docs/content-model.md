# Public content model

Articles and themes use `PublicPayload` schema version 1. The Markdown body is
stored after YAML front matter in `src/content/articles` or `src/content/themes`.

Stable public IDs and slugs never reuse private IDs. Article references to themes
use `themeIds`; `relatedPublicIds` contains related public articles only. Source
IDs are local to one entry and use `s1`, `s2`, and so on.

## Date handling

`publishedAt` is preserved across revisions. `updatedAt` advances when a public
revision changes. Timeline events keep structured historical years, including
negative years for BCE. Month-only, range, approximate, and unknown dates retain
their stated precision; they are not coerced through JavaScript `Date`.

## Maps

Maps are static PNG files stored at
`public/assets/{publicId}/{sha256-prefix}.png`. Each map records its bounds,
points, source IDs, source dataset, image dimensions, byte count, and full
SHA-256. The build validates the stored file rather than downloading a map from
an external service.

## Editorial rules

- Separate sourced facts, interpretation, and the author's view.
- Link material claims to a checked source. Mark an unchecked source as such.
- Summarize reporting in original language; do not reproduce paywalled articles.
- Keep direct quotations short and necessary, with an exact source locator.
- Show uncertainty and date precision instead of inventing missing details.
- Prepare and review a new public payload for every update. Editing a private note
  alone never changes a published page.
