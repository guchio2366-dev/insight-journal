import usClimateLegend from '../../public/assets/atlas/nature-v1/climate-legend.json';
import { precipitationBands } from '../data/atlas/water-resources';
import type { CanadaNaturalGroup } from './atlas-canada-natural-layer';

// The US page owns the presentation vocabulary. Source classifications stay intact.
const extraClimateCodes: Record<string, {nameJa:string;color:string}> = {
  Dwc: {nameJa:'冷帯冬季少雨・冷夏',color:'#919dbb'},
  Dfd: {nameJa:'冷帯湿潤・厳冬',color:'#66869f'},
};
export function canadaClimateGroups(groups: CanadaNaturalGroup[]): CanadaNaturalGroup[] {
  return groups.map(group => {
    const style = usClimateLegend.find(item => item.code === group.id) ?? extraClimateCodes[group.id];
    if (!style) throw new Error(`No shared climate presentation for ${group.id}`);
    return {...group, color:style.color, name:style.nameJa};
  });
}
export const canadaPrecipitationPresentation = precipitationBands.map((band,index) => ({
  id:`p${index}`, color:band.color, name:band.title,
}));
