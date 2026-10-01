# Mexico state locator source

Official INEGI Catálogo Único geometry response: https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/
Retrieved 2026-10-01. The response identifies the vector source as Marco Geoestadístico December 2025 and the statistical source as Censo de Población y Vivienda 2020. Those are distinct dates.

`inegi-geo-states-2025.json.gz` losslessly preserves the acquired 28,836,523-byte response. Uncompressed SHA-256: `170c3ea5ff472f08ece97970dc90ad4ba8c6f503e33859655f315091c105cc91`. Gzip SHA-256: `00637f7a8ca51a0a56249cbdc2aa2821ee089da1483200b63857a2577bac3b82` (9,152,198 bytes).

Usage follows INEGI Términos de Libre Uso: https://www.inegi.org.mx/inegi/terminos.html . Original metadata and credit are retained. INEGI does not endorse this site's processing.

Run `node scripts/prepare-mexico-geometry.mjs` to regenerate the locator, then `node scripts/verify-mexico-geometry.mjs`. The processor simplifies common arcs once in the thematic maps' GRS80 Lambert plane, preserving graph junctions, all 32 states, all 400 polygon rings and the original coordinate precision. It reduces tolerance when comparison with the original chains detects new intersections, containment, orientation changes or an accidental common chord. The common frame and per-state locator index are generated together. It does not recompute population density, agricultural area, climate area shares or official administrative boundaries.
