import { validateReligionData } from './atlas-population-religion.ts';
import { validateReligionOverview } from './atlas-population-religion-overview.ts';

// Cache failures are evicted. All files belonging to a metro share one LRU entry.
export function createPopulationLoader(base: string) {
  const cache = new Map<string, Promise<any>>();
  const metroUse = new Map<string, true>();
  function touch(name: string) {
    const metro = name.match(/^metro-\d+/)?.[0];
    if (!metro) return;
    metroUse.delete(metro);
    metroUse.set(metro, true);
    while (metroUse.size > 2) {
      const oldest = metroUse.keys().next().value!;
      metroUse.delete(oldest);
      for (const key of cache.keys()) if (key === oldest || key.startsWith(oldest + '.')) cache.delete(key);
    }
  }
  async function read(name: string) {
    let response = await fetch(base + name + '.json.gz', { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      response = await fetch(base + name + '.json', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Population HTTP ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = bytes[0] === 31 && bytes[1] === 139
      ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
      : new TextDecoder().decode(bytes);
    const data = JSON.parse(text);
    if (name.endsWith('.geo')) {
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid population geometry');
    } else if (name === 'religion') {
      if (!validateReligionData(data)) throw new Error('Invalid religion data');
    } else if(name==='religion-overview'){
      if(!validateReligionOverview(data))throw new Error('Invalid religion overview');
    } else if (data.version !== 1 || !Array.isArray(data.rows)) throw new Error('Invalid population data');
    return data;
  }
  return {
    get(name: string) {
      touch(name);
      let pending = cache.get(name);
      if (pending) return pending;
      pending = read(name).catch(error => {
        // A late failure from an evicted request must not delete its replacement.
        if (cache.get(name) === pending) cache.delete(name);
        throw error;
      });
      cache.set(name, pending);
      return pending;
    },
    clear() { cache.clear(); metroUse.clear(); }
  };
}
