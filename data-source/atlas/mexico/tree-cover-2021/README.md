# Mexico tree cover, 2021

A cartographic background separate from the agricultural crop map and the 2022 pine-harvest statistics.

## Source and license

ESA WorldCover 10 m 2021 v200, ESA WorldCover consortium.

- Primary documentation: https://esa-worldcover.org/en/data-access
- Dataset DOI: https://doi.org/10.5281/zenodo.7254221
- License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/
- Attribution: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium

The exact same attribution and license are in the public `tree-cover-manifest.json`. The cropped and reprojected display is an adaptation by Insight Journal, produced 2026-10-06. The provider does not endorse it. INEGI country geometry remains under its own free-use terms and is not relicensed by this notice.

## Bounded acquisition

Reused the checked-in Europe WorldCover COG-overview approach. Mexico's existing official national geometry intersects 46 three-degree tiles. Forty-five source tiles are available; the tiny offshore N18W117 tile returns 404 and remains unknown. Acquisition reads only a fixed 65,536-byte TIFF header and, where not already contained in that header, the smallest categorical overview's compressed byte range. All responses are required to be HTTP206 and to match the requested exact byte range and length.

Actual bounded transfer: 3,547,793 bytes. No full-resolution tile was downloaded. A sample source tile alone is 121,796,395 bytes, but its overview is 58,305 bytes. The gzip snapshot contains the exact range bytes, their SHA-256 hashes, source metadata, ranges and source URLs. `range-inputs.json` provides human-readable provenance without embedded binary data.

## Interpretation

- Label: `2021年の樹木被覆`.
- Paint only ESA class10 at Mexico pixel centers. This class includes mapped planted trees and orchards. It does not identify pine trees, logging, timber supply or legally defined forest land. Mangroves are a separate class95 and are not part of this overlay.
- Original supplier data have 10m source resolution, but this product samples the lowest internal 562×562 overview for each three-degree tile, about0.6km at the equator, then samples a national1800×1160 display. The output must not be advertised as10m detail.
- The supplier's overview resampling algorithm is not specified in the inspected metadata. No area or percentage statistic is computed.
- Nearest-neighbor class sampling is used at display pixel centers. There is no interpolation between categories. The image fits the exact existing Mexico900×580 Lambert viewbox and preserves the56-unit map padding.
- Outside Mexico, other valid cover, source nodata and unavailable source remain transparent in the visual overlay. Their categories are kept separate in the retained display-code grid and manifest counts. Seven offshore display pixels are unknown; all other520,468 Mexico display pixels are valid. Tiny islands and patches may be unresolved.

## Reproduction

    node scripts/prepare-mexico-tree-cover.mjs
    python scripts/validate-mexico-tree-cover.py

The generator uses only Node built-ins, the existing Mexico projection module and the retained source snapshot. It makes no network requests. It validates the original TIFF metadata, dimensions, year, license, class codes, range hashes, country mask and all painted pixels.

Outputs are only `tree-cover-2021.png`, `tree-cover-manifest.json`, the retained diagnostic query and the range-provenance record. Crop/livestock data files, their manifest and UI components are never changed by this script.
