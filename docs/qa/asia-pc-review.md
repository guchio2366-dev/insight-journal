# Asia PC review artifacts

`Review Asia atlas on PC` builds the checked-out PR head and verifies that build
on a loopback-only static HTTP preview. It does not visit the published site,
deploy files, or upload previously captured local images.

The workflow runs for Asia-specific pull-request paths targeting `main`, and for
the same paths on `fix/asia-industry-publication-status` pushes. It uses the
existing repository dependencies, official GitHub Actions, read-only repository
permission, and the runner's existing Chrome. It prepares `fonts-noto-cjk` on the
temporary runner when Japanese fonts are absent, using the same Ubuntu package
and commands as the existing validation workflow. Font setup is recorded. Missing
Chrome or fonts after setup are failures. Browser verification needs only local
built assets; it changes no repository permissions, application secrets, network
configuration, or certificate trust settings.

## Evidence

The downloadable `asia-pc-review-<run-id>-<attempt>` artifact ZIP contains newly
generated PNGs and JSON verification records in `review-artifacts/asia-pc`.
Each run records both the requested head and the actual checked-out commit.

At **1440×1000** and **1024×768**, it captures the US and Asia versions of:

- Manufacturing overview.
- US automobiles and Japan transport equipment, preserving each source's topic
  definition rather than treating the categories as statistically identical.
- Climate.
- Population.

The 16 viewport images cover eight comparisons. Map width, height, map top and
main field-tab top must agree within 1 CSS pixel for all eight comparisons.
Manufacturing guides retain readable type, and the visible population scope
identifies the 2020 population estimates and grid data at 13px or larger.

Population is a **layout-only comparison**. The US reference does not show the
population distribution fill, so these checks do not establish equal distribution
rendering, values or colors. The nonblank-map check only establishes that a map
is present, and this limitation is also recorded in the JSON evidence.

The same local browser checks publication states and principal controls,
including city selection by picker and map, their shared rain-temperature chart
and URL, monthly controls, focus links, URL restoration, comparison return and retry. External browser
requests are blocked before sending and reported as failures. No TLS exceptions
are used. The artifact is evidence of the local production build, not a check of
the deployed site.

## Local reproduction

Build the site using the normal development commands, then use an existing Chrome
or Chromium executable and existing Japanese fonts:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
REVIEW_CHROME_PATH=/usr/bin/chromium node scripts/capture-asia-pc-review.mjs
```

The isolated development container may require the existing explicit
`ATLAS_ASIA_BROWSER_UNSANDBOXED=1` opt-in when its Chromium sandbox is unavailable.
CI does not accept this opt-in. No machine permissions or certificate settings
need to change. Keep generated review files out of commits.
