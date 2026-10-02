export interface NaturalLayerState { selected: string | null; only: boolean; bounds: [number,number,number,number] | null; }
export type NaturalLayer = 'climate' | 'elevation';
const keys = {climate: ['zone','zoneOnly','zoneBounds'], elevation: ['elevation','elevationOnly','elevationBounds']} as const;
export function readCanadaNaturalLayerState(url: URL, layer: NaturalLayer, ids: readonly string[]): NaturalLayerState {
 const [idKey, onlyKey, boundsKey] = keys[layer];
 const selected = ids.includes(url.searchParams.get(idKey) ?? '') ? url.searchParams.get(idKey)! : null;
 const parts = (url.searchParams.get(boundsKey) ?? '').split(',');
 const values = parts.map(Number);
 const valid = parts.length === 4 && parts.every(p => p.trim() !== '') && values.every(Number.isFinite) && values[0] >= -180 && values[2] <= 180 && values[1] >= -85.051 && values[3] <= 85.051 && values[0] < values[2] && values[1] < values[3];
 return {selected, only: !!selected && url.searchParams.get(onlyKey) === '1', bounds: valid ? values as [number,number,number,number] : null};
}
export function writeCanadaNaturalLayerState(url: URL, layer: NaturalLayer, state: NaturalLayerState): URL {
 const next = new URL(url), [idKey, onlyKey, boundsKey] = keys[layer];
 for (const key of keys[layer]) next.searchParams.delete(key);
 if (state.selected) next.searchParams.set(idKey, state.selected);
 if (state.selected && state.only) next.searchParams.set(onlyKey, '1');
 if (state.bounds) next.searchParams.set(boundsKey, state.bounds.map(x => Math.round(x * 100000) / 100000).join(','));
 return next;
}
