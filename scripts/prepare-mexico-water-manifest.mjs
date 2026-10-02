/** Aggregate separately verified, offline Mexico vector layers. */
import {readFile, writeFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const folder = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/atlas/mexico-water-v1');
const layers = {};
for (const id of ['rivers', 'groundwater', 'precipitation', 'basins', 'contours']) {
  let metadata;
  try {metadata = JSON.parse(await readFile(resolve(folder, `${id}.source.json`), 'utf8'));}
  catch (error) {if (error.code === 'ENOENT') continue; throw error;}
  const file = metadata.file ?? metadata.asset?.file;
  if (!file || file !== `${id}.geojson`) throw new Error(`Unexpected ${id} asset file`);
  const bytes = await readFile(resolve(folder, file));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const expectedHash = metadata.asset?.sha256 ?? metadata.assetSha256;
  if (expectedHash && expectedHash !== sha256) throw new Error(`${id} source/asset hash mismatch`);
  const data = JSON.parse(bytes);
  if (data.type !== 'FeatureCollection' || !data.features.length) throw new Error(`${id} requires actual vector features`);
  await stat(resolve(folder, file));
  const normalized = id === 'contours' ? {
    publisher: 'NOAA NCEI', name: '標高等高線（500m間隔）', edition: 2022,
    observedPeriod: null, displayIntervalM: metadata.contourIntervalM,
    periodNote: '2022年はモデルの版。統一観測年ではない。元DEMの負標高を保持し、表示等高線は0〜5,000m。',
    unit: 'm',
  } : {};
  layers[id] = {...metadata, ...normalized, file, bytes: bytes.length, sha256, featureCount: data.features.length};
}
if (!Object.keys(layers).length) throw new Error('No verified vector layers available');
const manifest = {
  schemaVersion: 1, regionId: 'mexico', coverage: 'Source-specific Mexico coverage; see each layer.',
  coordinateReference: 'EPSG:4326 longitude, latitude; source transformations recorded per layer.',
  layers,
};
await writeFile(resolve(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({file: resolve(folder, 'manifest.json'), layers: Object.keys(layers)}));
