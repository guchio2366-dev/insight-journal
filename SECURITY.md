# Security and privacy boundary

This repository is public. It contains only site code, synthetic fixtures, and
content that has passed the publication contract.

Never add any of the following:

- Notion page URLs, database IDs, page IDs, or access tokens
- ChatGPT share URLs or raw conversation exports
- private notes, important-utterance records, or unpublished titles
- credentials, API keys, cookies, or deployment tokens

The browser bundle and GitHub Actions do not connect to Notion. Publication is a
one-way projection: an approved public payload is reconstructed from an explicit
allowlist, validated, serialized, and only then written to this repository.

If private data is suspected in a commit, stop publication. Removing a page from
the current build does not erase git history or external caches, so treat exposure
as a separate incident and rotate affected credentials when applicable.

