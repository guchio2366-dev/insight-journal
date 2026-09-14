// Compressed population sources are versioned. Expand deterministic JSON fallbacks for the static host.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
const base=new URL('../public/assets/atlas/population/v1/',import.meta.url);
for(const name of await readdir(base))if(name.endsWith('.json.gz'))await writeFile(new URL(name.slice(0,-3),base),gunzipSync(await readFile(new URL(name,base))));
await writeFile(new URL('counties.geo.json.gz',base),gzipSync(await readFile(new URL('counties.geo.json',base)),{level:9,mtime:0}));
