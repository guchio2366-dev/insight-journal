import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Download this fixed source separately; generation never calls external services.
const sourceUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson';
const expectedHash = '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb';
if (!process.argv[2]) throw new Error('Usage: node scripts/prepare-oceania-map.mjs /path/to/ne_50m_admin_0_countries.geojson');
const raw = readFileSync(process.argv[2]);
if (createHash('sha256').update(raw).digest('hex') !== expectedHash) throw new Error('Source SHA-256 mismatch');
const source = JSON.parse(raw);
const contextCodes = ['IDN', 'TLS', 'PHL'];
const features = source.features.filter(f => f.properties.CONTINENT === 'Oceania' || contextCodes.includes(f.properties.ADM0_A3)).map(f => ({
  type: 'Feature',
  properties: { code: f.properties.ADM0_A3, name: f.properties.NAME_EN, subregion: f.properties.SUBREGION, kind: f.properties.CONTINENT === 'Oceania' ? 'oceania' : 'context' },
  geometry: f.geometry
}));
const output = { type: 'FeatureCollection', source: { name: 'Natural Earth Admin 0 Countries 1:50m', version: 'repository tag v5.1.2', url: sourceUrl, sha256: expectedHash, license: 'Public domain', licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/', retrievedAt: '2026-09-25', method: 'Oceania by CONTINENT; IDN/TLS/PHL as context. Original WGS84 geometry and precision retained. Display clipping and longitude wrapping occur at build time.', omissions: 'Small islands absent in the source, including Tokelau, are not represented. This is a land boundary map, not an EEZ map.' }, features };
const bytes = JSON.stringify(output) + '\n';
writeFileSync(new URL('../src/data/atlas/oceania-countries.json', import.meta.url), bytes);
console.log(`${features.length} features; ${features.filter(f => f.properties.kind === 'oceania').length} selectable; SHA-256 ${createHash('sha256').update(bytes).digest('hex')}`);
