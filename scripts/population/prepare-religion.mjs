// Reviewed aggregate input only. No web scraping and no inferred state observations.
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { validateReligionData } from '../../src/lib/atlas-population-religion.ts';
import { validateReligionOverview } from '../../src/lib/atlas-population-religion-overview.ts';
const input = JSON.parse(await readFile(new URL('../../data/atlas/population-religion-reviewed.json', import.meta.url), 'utf8'));
if (!validateReligionData(input)) throw new Error('Reviewed religion input failed validation');
const output = new URL('../../public/assets/atlas/population/v1/religion.json.gz', import.meta.url);
await writeFile(output, gzipSync(JSON.stringify(input), { level: 9, mtime: 0 }));
const overview=JSON.parse(await readFile(new URL('../../data/atlas/population-religion-overview-reviewed.json',import.meta.url),'utf8'));
if(!validateReligionOverview(overview))throw new Error('Reviewed religion overview failed validation');
await writeFile(new URL('../../public/assets/atlas/population/v1/religion-overview.json.gz',import.meta.url),gzipSync(JSON.stringify(overview),{level:9,mtime:0}));

if (input.rows.length) {
  const { gunzipSync } = await import('node:zlib');
  const { religions } = await import('../../src/data/atlas/population.ts');
  const { religiousShareColor } = await import('../../src/lib/atlas-population-religion.ts');
  const geometry = JSON.parse(gunzipSync(await readFile(new URL('../../public/assets/atlas/population/v1/states.geo.json.gz', import.meta.url))));
  const rows = new Map(input.rows.map(row => [row.id, row]));
  const mercator = latitude => 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
  const top = mercator(50), bottom = mercator(24), scale = Math.min(1200 / 59, 720 / (top - bottom));
  const left = (1200 - 59 * scale) / 2, offsetY = (720 - (top - bottom) * scale) / 2;
  const ringPath = ring => ring.map(([x, y], i) => `${i ? 'L' : 'M'}${(left + (x + 125) * scale).toFixed(2)},${(offsetY + (top - mercator(y)) * scale).toFixed(2)}`).join(' ') + 'Z';
  for (const [group] of religions) {
    const paths = geometry.features.filter(f => !['state:02', 'state:15'].includes(f.properties.id)).map(f => {
      const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const d = polygons.flatMap(polygon => polygon.map(ringPath)).join(' ');
      return `<path d="${d}" fill="${religiousShareColor(rows.get(f.properties.id)?.shares[group])}"/>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" role="img"><title>Pew Religious Landscape Study 2023–24, adult state shares. © 2025 Pew Research Center</title><rect width="1200" height="720" fill="#edf1ef"/><g fill-rule="evenodd" stroke="#637c7c" stroke-width=".5">${paths}</g></svg>`;
    await writeFile(new URL(`../../public/assets/atlas/population/v1/religion-${group}.svg`, import.meta.url), svg);
  }
}
