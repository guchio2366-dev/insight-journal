import {
  canadaCensusContains, canadaCensusFeatureBounds, canadaCensusGeographicLabels,
  canadaCensusProvinceNames, type CanadaCensusCollection, type CanadaCensusFeature,
  type CanadaCensusProductId, type CanadaCensusCell,
} from './atlas-canada-census-map';
import {canadaAgricultureProducts,canadaAgricultureProductOrder,type CanadaAgricultureIndicatorId} from './atlas-canada-agriculture-products';

export const canadaAgricultureOverviewIds = canadaAgricultureProductOrder;
export const canadaAgricultureOverviewColors = Object.fromEntries(canadaAgricultureProductOrder.map(id=>[id,canadaAgricultureProducts[id].color])) as Record<CanadaAgricultureIndicatorId,string>;
export const canadaAgricultureOverviewNames = Object.fromEntries(canadaAgricultureProductOrder.map(id=>[id,canadaAgricultureProducts[id].name])) as Record<CanadaAgricultureIndicatorId,string>;

/** A display anchor must fall inside the held CCS polygon, including its holes. */
export function canadaAgricultureInteriorAnchor(feature: CanadaCensusFeature) {
  const geometry = feature.geometry, bounds = canadaCensusFeatureBounds(geometry);
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  const candidates: { area: number; point: number[] }[] = [];
  for (const polygon of polygons) {
    const ring = polygon[0]; let area = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      area += cross; x += (ring[j][0] + ring[i][0]) * cross; y += (ring[j][1] + ring[i][1]) * cross;
    }
    if (Math.abs(area) > 1e-14) candidates.push({ area: Math.abs(area), point: [x / (3 * area), y / (3 * area)] });
  }
  candidates.sort((a, b) => b.area - a.area);
  for (const candidate of candidates) if (canadaCensusContains(geometry, candidate.point)) return candidate.point;
  for (const n of [3, 5, 9, 17, 33]) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const point = [bounds[0] + (bounds[2] - bounds[0]) * (x + .5) / n, bounds[1] + (bounds[3] - bounds[1]) * (y + .5) / n];
    if (canadaCensusContains(geometry, point)) return point;
  }
  for (const polygon of polygons) for (let i = 1; i < polygon[0].length - 1; i++) {
    const ring = polygon[0], point = [(ring[0][0] + ring[i][0] + ring[i + 1][0]) / 3, (ring[0][1] + ring[i][1] + ring[i + 1][1]) / 3];
    if (canadaCensusContains(geometry, point)) return point;
  }
  throw new Error('Canada agriculture: no interior display anchor for ' + feature.properties.DGUID);
}

/** Province/national values remain their own official publications, never sums of CCS. */
export function buildCanadaAgricultureOverviewModel(dataset: any, geometry: CanadaCensusCollection, context: CanadaCensusCollection) {
  const ids = canadaAgricultureOverviewIds.filter(id=>dataset.products[id]), seen = new Set<string>();
  const anchors: Record<string, { point: number[]; bounds: number[] }> = {};
  for (const feature of geometry.features) {
    const id = String(feature.properties.DGUID), record = dataset.records[id];
    if (!record || seen.has(id) || ids.some(product => !record.cells[product])) throw new Error('Canada agriculture: incomplete or duplicate source join');
    seen.add(id);
    anchors[id] = { point: canadaAgricultureInteriorAnchor(feature), bounds: canadaCensusFeatureBounds(feature.geometry) };
  }
  if (seen.size !== 1757 || Object.keys(dataset.records).length !== seen.size) throw new Error('Canada agriculture: expected all 1,757 CCS');
  const counts = Object.fromEntries(ids.map(id => [id, Object.fromEntries(['published', 'quality-f', 'not-covered'].map(status => [status, Object.values(dataset.records).filter((record: any) => record.cells[id].status === status).length]))]));
  const summaries = [
    { id: 'prairie', name: 'プレーリーの穀物・カノーラ', codes: ['48', '47', '46'], anchorProvince: '47', products: ['canola', 'wheat'] },
    { id: 'west', name: '西部の母牛・放牧地', codes: ['48', '47'], anchorProvince: '48', products: ['beef', 'pasture'] },
    { id: 'east', name: '東部にも干草', codes: ['35', '24'], anchorProvince: '24', products: ['hay', 'wheat', 'corn', 'dairy', 'soybeans'] },
  ].map(group => ({ ...group, values: Object.fromEntries(group.products.map(id => {
    const cells: CanadaCensusCell[] = dataset.provinces.filter((province: any) => group.codes.includes(province.code)).map((province: any) => province.cells[id]);
    if (cells.length !== group.codes.length || cells.some(cell => cell.status !== 'published' || cell.value === null)) throw new Error('Canada agriculture: a concentration requires published province values');
    const value = cells.reduce((sum, cell) => sum + cell.value!, 0);
    return [id, { value, nationalShare: value / dataset.products[id].national.value * 100, unit: dataset.products[id].unit }];
  })) }));
  return { anchors, ids, counts, summaries, products:canadaAgricultureProducts, provinceNames: canadaCensusProvinceNames, labels: canadaCensusGeographicLabels(geometry), context,
    evidence: { regionCount: seen.size, retainedIndicatorCells: seen.size * ids.length, exactDguidJoin: true, allDisplayAnchorsInsideOriginalCcs: true, boundarySourceGeneralizationMetres: 5000, overviewGranularity: 'official province/territory publication values, not summed CCS', detailAggregation: 'display cells group symbols, not values; counts are CCS, not farms' } };
}
