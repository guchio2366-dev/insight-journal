/** Quantitative surfaces use the existing Lambert SVG frame, never a lon/lat rectangle. */
export interface MexicoSurfaceLegend {
  domain: [number, number];
  ticks: number[];
  colorStops: {value: number; color: string}[];
  bands?: {min: number; max: number; color: string}[];
  interval?: number;
  unit: string;
}
export interface MexicoSurfaceLayer {
  image: {file: string; width: number; height: number; sha256: string};
  legend: MexicoSurfaceLegend;
  titleJa: string;
  periodLabelJa: string;
  sourceLabelJa: string;
  descriptionJa: string;
  limitationsJa: string[];
  sourceUrl: string;
  provenanceFile: string;
}
export interface MexicoSurfaceManifest {
  schemaVersion: number;
  layers: {precipitation: MexicoSurfaceLayer; elevation: MexicoSurfaceLayer};
  [key: string]: unknown;
}

export function validateMexicoSurfaceManifest(value: unknown): MexicoSurfaceManifest {
  const manifest = value as MexicoSurfaceManifest;
  if (manifest?.schemaVersion !== 1 || !manifest.layers) throw new Error('数値面の資料台帳がありません');
  for (const [id, unit] of [['precipitation', 'mm/年'], ['elevation', 'm']] as const) {
    const layer = manifest.layers[id];
    if (!layer || layer.image?.width !== 900 || layer.image?.height !== 580 ||
        !/^(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|webp|svg)$/.test(layer.image.file) ||
        !/^[a-f0-9]{64}$/.test(layer.image.sha256)) throw new Error('数値面の画像・投影フレームが不正です');
    const legend = layer.legend;
    if (!legend || legend.unit !== unit || legend.domain?.length !== 2 || !legend.domain.every(Number.isFinite) ||
        legend.domain[0] >= legend.domain[1] || !Array.isArray(legend.colorStops) || legend.colorStops.length < 2 ||
        !Array.isArray(legend.ticks) || legend.ticks.length < 2) throw new Error('数値凡例の単位・範囲が不正です');
    if (legend.colorStops[0].value !== legend.domain[0] || legend.colorStops.at(-1)?.value !== legend.domain[1] ||
        legend.colorStops.some((stop, index) => !Number.isFinite(stop.value) || !/^#[a-f0-9]{6}$/i.test(stop.color) ||
          (index > 0 && stop.value <= legend.colorStops[index - 1].value)) ||
        legend.ticks.some((tick, index) => !Number.isFinite(tick) || tick < legend.domain[0] || tick > legend.domain[1] ||
          (index > 0 && tick <= legend.ticks[index - 1]))) throw new Error('数値凡例の順序が不正です');
    for (const key of ['titleJa', 'periodLabelJa', 'sourceLabelJa', 'descriptionJa'] as const) {
      if (typeof layer[key] !== 'string' || !layer[key].trim()) throw new Error('数値面の定義・期間・出典がありません');
    }
    if (!Array.isArray(layer.limitationsJa) || !layer.limitationsJa.length || layer.limitationsJa.some(note => typeof note !== 'string' || !note.trim())) throw new Error('数値面の欠測・精度の説明がありません');
    if (!/^https:\/\//.test(layer.sourceUrl) || !/^(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(layer.provenanceFile)) {
      throw new Error('数値面の出典参照が不正です');
    }
    if (legend.bands && (id !== 'precipitation' || legend.interval !== 250 || !legend.bands.length ||
        legend.bands[0].min !== legend.domain[0] || legend.bands.at(-1)?.max !== legend.domain[1] ||
        legend.bands.some((band, index) => !Number.isFinite(band.min) || !Number.isFinite(band.max) ||
          band.max - band.min !== 250 || !/^#[a-f0-9]{6}$/i.test(band.color) ||
          (index > 0 && band.min !== legend.bands![index - 1].max)))) throw new Error('250mm降水帯の数値凡例が不正です');
  }
  return manifest;
}

export function mexicoSurfaceGradient(legend: MexicoSurfaceLegend): string {
  const [minimum, maximum] = legend.domain;
  if (legend.bands) return `linear-gradient(to right, ${legend.bands.flatMap(band =>
    [`${band.color} ${(band.min - minimum) / (maximum - minimum) * 100}%`, `${band.color} ${(band.max - minimum) / (maximum - minimum) * 100}%`]).join(', ')})`;
  return `linear-gradient(to right, ${legend.colorStops.map(stop => `${stop.color} ${(stop.value - minimum) / (maximum - minimum) * 100}%`).join(', ')})`;
}

export function mexicoSurfaceTickPosition(legend: MexicoSurfaceLegend, value: number): number {
  return (value - legend.domain[0]) / (legend.domain[1] - legend.domain[0]) * 100;
}
