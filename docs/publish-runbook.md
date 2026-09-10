# Publication runbook

## Save a private note

The conversation layer identifies the question, current understanding, reasons,
sources, the user's stated view, open questions, and selected important
utterances. It assigns an operation ID and content hash, checks for an existing
operation, writes an immutable revision snapshot, writes the note, reads both
back, and then relates the note to affected themes.

Retries reuse the same operation ID. An uncertain or partial write is reconciled
before creating anything new.

## Prepare a public revision

1. Fetch only the explicitly selected private revisions.
2. Draft a standalone article or theme with original wording.
3. Assign or retain the public ID and slug.
4. Add checked sources, a short timeline, and a map or a public omission reason.
5. Build a fresh `PublicPayload` through the allowlist projection.
6. Validate the payload, references, Markdown, map metadata, and private markers.
7. Serialize deterministically and record the payload hash.
8. Present the exact revision for review. Stop before deployment until the user
   explicitly asks to publish that revision.

## Publish after approval

After approval, re-fetch the prepared record and require the same payload hash.
Commit the Markdown and referenced assets atomically, let CI build and deploy, and
verify the public article plus `_release.json`. Only then mark the private
publication record as published.

The initial repository workflow performs validation only. Activating GitHub Pages
and adding a deployment workflow are separate launch actions.

## Withdraw

Remove the article from content, search, themes, and related links in one reviewed
change. Keep the private publication record and state that the public URL was
withdrawn. Git history and third-party caches may retain prior bytes.

