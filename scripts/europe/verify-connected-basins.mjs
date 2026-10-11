import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const basinPath = 'public/assets/atlas/europe/drainage-v1/basins.json';
const gridPath = 'public/assets/atlas/europe/drainage-v1/values.bin.gz';
const riverPath = 'public/assets/atlas/europe/context-v1/rivers.json';
const outputPath = 'data-source/atlas/europe/drainage/connected-basin-review.json';
const basins = JSON.parse(await readFile(basinPath));
const rivers = JSON.parse(await readFile(riverPath)).features;
const gridBytes = gunzipSync(await readFile(gridPath));
const width = 1800, height = 1502;
if (gridBytes.length !== width * height * 4) throw new Error('Unexpected published drainage grid dimensions');
const grid = new DataView(gridBytes.buffer, gridBytes.byteOffset, gridBytes.byteLength);
const byId = new Map(basins.map(row => [row.HYBAS_ID, row]));
const mercator = latitude => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
const top = mercator(73), bottom = mercator(32);
function basinAt([lon, lat]) {
  const x = Math.floor((lon + 25) / 90 * width), y = Math.floor((top - mercator(lat)) / (top - bottom) * height);
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  const index = grid.getFloat32((y * width + x) * 4, true);
  return basins[index - 1] ?? null;
}
function outletPath(row) {
  const seen = new Set(), path = [];
  while (row) {
    if (seen.has(row.HYBAS_ID)) throw new Error(`Basin cycle ${row.HYBAS_ID}`);
    seen.add(row.HYBAS_ID); path.push(row.HYBAS_ID);
    if (!row.NEXT_DOWN) return path;
    row = byId.get(row.NEXT_DOWN);
  }
  return null;
}
const groups = Object.groupBy(basins, row => row.MAIN_BAS);
const named = [
  { name: 'Danube', ja: 'ドナウ川', anchor: [19.04, 47.50], mainBasin: 2040008490 },
  { name: 'Volga', ja: 'ヴォルガ川', anchor: [45, 55], mainBasin: 2040068680 },
];
const reviews = named.map(target => {
  const group = groups[target.mainBasin] ?? [];
  const sourceRiver = rivers.filter(feature => feature.properties.sourceName === target.name);
  const oneLine = sourceRiver.length === 1 && sourceRiver[0].geometry.type === 'LineString' ? sourceRiver[0].geometry.coordinates : null;
  const paths = group.map(outletPath);
  const digits = group.map(row => row.PFAF_ID % 10).sort((a, b) => a - b);
  const entry = oneLine?.[0] ?? null, mouth = oneLine?.at(-1) ?? null;
  return {
    ...target, unitCount: group.length, sourceIds: group.map(row => row.HYBAS_ID), pfafDigits: digits,
    sourceNetworkClosed: paths.every(path => path?.at(-1) === target.mainBasin),
    sourceLevelFourSiblingSetComplete: JSON.stringify(digits) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    clickedAnchor: basinAt(target.anchor)?.HYBAS_ID ?? null,
    lineFeatureCount: sourceRiver.length, lineVertexCount: oneLine?.length ?? null,
    publishedRiverLineStart: entry, publishedRiverLineEnd: mouth,
    lineStartBasin: entry ? basinAt(entry)?.HYBAS_ID ?? null : null,
    lineEndBasin: mouth ? basinAt(mouth)?.HYBAS_ID ?? null : null,
    mainstemComplete: false,
    productDecision: 'Review only. The published river line does not establish a source-to-mouth mainstem; the displayed L4 mask clips source polygons to 45 countries and the frame. Do not call this a verified complete river basin/mainstem in the product.',
  };
});
if (reviews[0].unitCount !== 9 || !reviews[0].sourceNetworkClosed || reviews[0].lineEndBasin !== reviews[0].mainBasin) throw new Error('Danube network/mouth evidence changed');
const output = {
  checkedOn: '2026-10-08',
  sourceReviewOn: '2026-10-11',
  basinSource: 'BasinATLAS v1.0 level 04; CC BY 4.0; published Europe display mask and identifiers',
  riverSource: 'Natural Earth v5.1.2 50m rivers, selected lines; see context-v1/manifest.json',
  method: 'Group only identical MAIN_BAS identifiers, follow NEXT_DOWN to the same outlet; do not merge adjacent polygons. Compare the existing river line endpoints with the published basin grid.',
  limitations: ['The Europe grid is a clipped display mask, not original basin geometry.', 'The stored river lines may start downstream of the source.', 'A complete source river and uncut whole-basin polygon need independent verification before the screen can say 全流域・本流・河口.'],
  proposedWholeBasinSource: {
    product: 'HydroATLAS BasinATLAS v1.0, global level-04 shapefile',
    productUrl: 'https://www.hydrosheds.org/hydroatlas',
    existingProof: 'data-source/atlas/europe/drainage/selected-inputs.json pins original level-04 SHP/DBF/PRJ/SHX hashes and the archive entry ranges; the raw files are not retained in this workspace.',
    officialDownloadLink: 'https://figshare.com/ndownloader/files/20087237',
    technicalDocument: 'https://data.hydrosheds.org/file/technical-documentation/HydroATLAS_TechDoc_v10_1.pdf',
    nextValidation: 'Reacquire the same pinned source entries through an authorized normal download, dissolve every polygon with the verified MAIN_BAS, check that the complete geometry lies inside the map frame, and publish an uncut basin view with its modification and scale recorded.',
    status: 'The existing published 45-country raster cannot recover polygon parts removed by the country mask. Normal access to the official Figshare download and API returned HTTP 403 in this environment.',
  },
  proposedFullMainstemSource: {
    product: 'HydroATLAS RiverATLAS v1.0, global shapefile with regional tiles',
    productUrl: 'https://www.hydrosheds.org/hydroatlas',
    officialDownloadLink: 'https://figshare.com/ndownloader/files/20087486',
    technicalDocument: 'https://data.hydrosheds.org/file/technical-documentation/HydroATLAS_TechDoc_v10_1.pdf',
    databaseLicense: 'CC BY 4.0 for the HydroATLAS collective database; check the RiverATLAS catalog for the exact licenses of the topology columns before distributing derived attributes.',
    neededColumns: ['HYRIV_ID', 'NEXT_DOWN', 'MAIN_RIV', 'ORD_CLAS', 'HYBAS_L12'],
    namedAnchorCandidate: 'Natural Earth 1:10m rivers and lake centerlines: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/ . Its named segments must be checked against the RiverATLAS outlet and course; a label match alone does not verify a complete mainstem.',
    method: 'Identify the outlet from the verified named river and mouth, select its MAIN_RIV network, verify every NEXT_DOWN path reaches the outlet, then trace contiguous ORD_CLAS=1 backbone reaches from source to mouth. Check the displayed reach endpoints and junctions against the source geometry; do not label an unverified longest path as the named mainstem.',
    status: 'Official shapefile is not present; a normal request to the official Figshare API returned HTTP 403 in this environment. No RiverATLAS geometry or topology is published yet.',
  },
  separateHydroRiversBoundary: 'The HydroRIVERS standalone product has different redistribution terms; this review does not relicense or republish it as RiverATLAS.',
  reviews,
};
await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(reviews.map(({ name, unitCount, sourceNetworkClosed, sourceLevelFourSiblingSetComplete, lineVertexCount, lineStartBasin, lineEndBasin }) => ({ name, unitCount, sourceNetworkClosed, sourceLevelFourSiblingSetComplete, lineVertexCount, lineStartBasin, lineEndBasin }))));
