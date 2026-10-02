import basinRecords from '../../public/assets/atlas/europe/drainage-v1/basins.json' with { type: 'json' };

/** Source identifiers; index is the display code, never a float32 HYBAS_ID. */
export type EuropeDrainageBasin = Readonly<{
  index: number;
  HYBAS_ID: number;
  PFAF_ID: number;
  NEXT_DOWN: number;
  MAIN_BAS: number;
}>;
export type EuropeDrainageState = { basin?: string };
export type EuropeDrainageGridSpec = { width: number; height: number };
export type EuropeDrainageCell = {
  index: number;
  basin: EuropeDrainageBasin;
  center: [number, number];
  row: number;
  column: number;
};
export type EuropeDrainageOutline = {
  rgba: Uint8ClampedArray;
  transparent: boolean;
  /** Rendered boundary-pixel count, not geographic area or length. */
  boundaryPixels: number;
};
export const europeDrainageGrid = Object.freeze({ width: 1800, height: 1502 });
export const europeDrainageBounds = Object.freeze({ west: -25, east: 65, south: 32, north: 73 });

function validGrid(spec: EuropeDrainageGridSpec): boolean {
  return Number.isSafeInteger(spec.width) && spec.width > 0
    && Number.isSafeInteger(spec.height) && spec.height > 0
    && Number.isSafeInteger(spec.width * spec.height);
}

/** Validate the small public JSON package before interpreting any display code. */
export function readEuropeDrainageBasins(input: unknown): readonly EuropeDrainageBasin[] {
  if (!Array.isArray(input) || !input.length) throw new TypeError('Invalid Europe drainage identifier package');
  const indexes = new Set<number>(), identifiers = new Set<number>();
  const records = input.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new TypeError('Invalid Europe drainage basin');
    const record = item as Record<string, unknown>;
    for (const field of ['index', 'HYBAS_ID', 'PFAF_ID', 'NEXT_DOWN', 'MAIN_BAS']) {
      if (!Number.isSafeInteger(record[field]) || (record[field] as number) < 0) throw new TypeError('Invalid Europe drainage identifier');
    }
    const basin = record as unknown as EuropeDrainageBasin;
    if (basin.index < 1 || !/^\d{10}$/.test(String(basin.HYBAS_ID)) || indexes.has(basin.index) || identifiers.has(basin.HYBAS_ID)) throw new TypeError('Invalid or duplicate Europe drainage basin');
    indexes.add(basin.index); identifiers.add(basin.HYBAS_ID);
    return Object.freeze({ index: basin.index, HYBAS_ID: basin.HYBAS_ID, PFAF_ID: basin.PFAF_ID, NEXT_DOWN: basin.NEXT_DOWN, MAIN_BAS: basin.MAIN_BAS });
  });
  return Object.freeze(records);
}

export const europeDrainageBasins = readEuropeDrainageBasins(basinRecords);

/** URL state accepts only a listed, canonical decimal HYBAS_ID string. */
export function normaliseEuropeDrainageBasin(input: unknown, basins = europeDrainageBasins): string | undefined {
  if (typeof input !== 'string' || !/^\d{10}$/.test(input)) return undefined;
  return basins.some(basin => String(basin.HYBAS_ID) === input) ? input : undefined;
}

export function europeDrainageBasinByIndex(input: unknown, basins = europeDrainageBasins): EuropeDrainageBasin | undefined {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input <= 0) return undefined;
  return basins.find(basin => basin.index === input);
}

export function europeDrainageIndexForBasin(input: unknown, basins = europeDrainageBasins): number | undefined {
  const canonical = normaliseEuropeDrainageBasin(input, basins);
  return canonical ? basins.find(basin => String(basin.HYBAS_ID) === canonical)?.index : undefined;
}

/** Decode an already-decompressed LE mask; gzip/network handling stays in the controller. */
export function readEuropeDrainageValues(input: ArrayBuffer | Uint8Array, spec: EuropeDrainageGridSpec = europeDrainageGrid, basins = europeDrainageBasins): Float32Array {
  if (!validGrid(spec)) throw new TypeError('Invalid Europe drainage display dimensions');
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength !== spec.width * spec.height * 4) throw new RangeError('Invalid Europe drainage display mask length');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), values = new Float32Array(spec.width * spec.height);
  const indexes = new Set(basins.map(basin => basin.index));
  for (let i = 0; i < values.length; i++) {
    const value = view.getFloat32(i * 4, true);
    if (value !== -1 && !indexes.has(value)) throw new TypeError('Unlisted Europe drainage display index');
    values[i] = value;
  }
  return values;
}

const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));

/** Match displayCell: resolve the pixel centre, not exact original GIS containment. */
export function europeDrainageCell(values: Float32Array, point: readonly number[], spec: EuropeDrainageGridSpec = europeDrainageGrid, basins = europeDrainageBasins): EuropeDrainageCell | undefined {
  if (!validGrid(spec) || values.length !== spec.width * spec.height || point.length < 2) return undefined;
  const [longitude, latitude] = point, frame = europeDrainageBounds;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < frame.west || longitude >= frame.east || latitude <= frame.south || latitude > frame.north) return undefined;
  const top = mercator(frame.north), bottom = mercator(frame.south);
  const column = Math.min(spec.width - 1, Math.floor((longitude - frame.west) / (frame.east - frame.west) * spec.width));
  const row = Math.min(spec.height - 1, Math.floor((top - mercator(latitude)) / (top - bottom) * spec.height));
  const index = values[row * spec.width + column], basin = europeDrainageBasinByIndex(index, basins);
  if (!basin) return undefined;
  const centreLongitude = frame.west + (column + .5) / spec.width * (frame.east - frame.west);
  const centreLatitude = (2 * Math.atan(Math.exp(top - (row + .5) / spec.height * (top - bottom))) - Math.PI / 2) * 180 / Math.PI;
  return { index, basin, center: [centreLongitude, centreLatitude], row, column };
}

/**
 * Selected-side 4-neighbour boundary of the exact display mask. This is a
 * display-grid outline, including clipped frame edges; it is not the original
 * GIS boundary of a whole river catchment. No dilation, area or volume estimate.
 */
export function europeDrainageOutline(values: Float32Array, selectedIndex: unknown, options: EuropeDrainageGridSpec & { color?: readonly [number, number, number, number] } = europeDrainageGrid, basins = europeDrainageBasins): EuropeDrainageOutline {
  if (!validGrid(options) || values.length !== options.width * options.height) throw new RangeError('Invalid Europe drainage outline mask');
  const { width, height } = options, rgba = new Uint8ClampedArray(width * height * 4);
  const selected = europeDrainageBasinByIndex(selectedIndex, basins);
  if (!selected) return { rgba, transparent: true, boundaryPixels: 0 };
  const color = options.color ?? [23, 60, 72, 255];
  if (color.length !== 4 || color.some(channel => !Number.isInteger(channel) || channel < 0 || channel > 255)) throw new TypeError('Invalid Europe drainage outline colour');
  let boundaryPixels = 0;
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const at = row * width + column;
    if (values[at] !== selected.index) continue;
    if (column === 0 || column === width - 1 || row === 0 || row === height - 1
      || values[at - 1] !== selected.index || values[at + 1] !== selected.index
      || values[at - width] !== selected.index || values[at + width] !== selected.index) {
      rgba.set(color, at * 4); boundaryPixels++;
    }
  }
  return { rgba, transparent: boundaryPixels === 0 || color[3] === 0, boundaryPixels };
}

/** A representative river position selects only its containing display section. */
export function europeDrainagePositionLabel(basin: EuropeDrainageBasin): string {
  return `その表示位置を含む区画（HYBAS_ID ${basin.HYBAS_ID}）`;
}
