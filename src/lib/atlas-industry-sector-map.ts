/** Map display membership is explicit; statistical totals retain their own catalog. */
export const industryMapSectors = [
  {id: 'resources', label: '資源・エネルギー'},
  {id: 'manufacturing', label: '製造業'},
  {id: 'services', label: 'サービス業'},
] as const;
export type IndustryMapSector = typeof industryMapSectors[number]['id'];
export function industryMapSector(value: unknown, fallback: IndustryMapSector = 'resources'): IndustryMapSector {
  if (value === 'resource') return 'resources';
  return industryMapSectors.some(s => s.id === value) ? value as IndustryMapSector : fallback;
}
export function industrySectorItems<T>(items: readonly T[], sector: IndustryMapSector, membership: (item: T) => readonly string[]): T[] {
  return items.filter(item => membership(item).some(id => id === sector || (id === 'resource' && sector === 'resources')));
}

export type MapLabelPoint = {id: string; industry: string; label: string; x: number; y: number; country?: string; stage?: string};
export type IndustryLabelGroup<T extends MapLabelPoint> = {id: string; industry: string; label: string; anchor: T; members: T[]};
/** Group names, never coordinates. A group's anchor is one actual member location.
 * All pairwise distances are bounded, so a chain cannot join distant facilities. */
export function groupIndustryMapLabels<T extends MapLabelPoint>(points: readonly T[], distance = 58): IndustryLabelGroup<T>[] {
  const groups: T[][] = [];
  for (const point of [...points].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.id.localeCompare(b.id))) {
    const group = groups.find(members => members[0].industry === point.industry && members[0].country === point.country && members[0].stage === point.stage && members.every(other => Math.hypot(other.x - point.x, other.y - point.y) <= distance));
    if (group) group.push(point); else groups.push([point]);
  }
  return groups.map(members => {
    const anchor = [...members].sort((a, b) => members.reduce((sum, p) => sum + Math.hypot(p.x - a.x, p.y - a.y), 0) - members.reduce((sum, p) => sum + Math.hypot(p.x - b.x, p.y - b.y), 0) || a.id.localeCompare(b.id))[0];
    return {id: members[0].id, industry: anchor.industry, label: anchor.label, anchor, members};
  });
}
export type MapLabelBox = {left: number; top: number; right: number; bottom: number};
export type IndustryLabelPlacement<T extends MapLabelPoint> = {group: IndustryLabelGroup<T>; box: MapLabelBox; offset: [number, number]};
const intersects = (a: MapLabelBox, b: MapLabelBox, gap: number) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
/** The inputs must already belong to the selected sector. Selection is deliberately
 * absent: choosing an item does not reshuffle the labels of its sector. */
export function layoutIndustryMapLabels<T extends MapLabelPoint>(groups: readonly IndustryLabelGroup<T>[], viewport: {width: number; height: number}, options: {measure?: (label: string) => number; height?: number; budget?: number; reserved?: readonly MapLabelBox[]; points?: readonly {x: number; y: number}[]} = {}): {placed: IndustryLabelPlacement<T>[]; omitted: IndustryLabelGroup<T>[]} {
  const height = options.height ?? 26, budget = options.budget ?? (viewport.width < 600 ? 7 : 14);
  const occupied = [...options.reserved ?? []], placed: IndustryLabelPlacement<T>[] = [], omitted: IndustryLabelGroup<T>[] = [];
  const sorted = [...groups].sort((a, b) => a.industry.localeCompare(b.industry) || a.id.localeCompare(b.id));
  const first = new Set<string>();
  const ordered = [...sorted.filter(g => {if (first.has(g.industry)) return false; first.add(g.industry); return true;}), ...sorted.filter(g => sorted.find(s => s.industry === g.industry) !== g)];
  for (const group of ordered) {
    const width = options.measure?.(group.label) ?? Math.max(40, [...group.label].length * 13 + 16), {x, y} = group.anchor;
    const candidates: [number, number][] = [[12, -height / 2], [-width - 12, -height / 2], [-width / 2, -height - 12], [-width / 2, 12], [12, 12], [-width - 12, 12], [12, -height - 12], [-width - 12, -height - 12]];
    const offset = placed.length < budget ? candidates.find(([dx, dy]) => {
      const box = {left: x + dx, top: y + dy, right: x + dx + width, bottom: y + dy + height};
      return box.left >= 4 && box.top >= 4 && box.right <= viewport.width - 4 && box.bottom <= viewport.height - 4 && !occupied.some(b => intersects(box, b, 5)) && !(options.points ?? []).some(p => intersects(box, {left: p.x - 5, top: p.y - 5, right: p.x + 5, bottom: p.y + 5}, 2));
    }) : undefined;
    if (!offset) {omitted.push(group); continue;}
    const box = {left: x + offset[0], top: y + offset[1], right: x + offset[0] + width, bottom: y + offset[1] + height};
    occupied.push(box); placed.push({group, box, offset});
  }
  return {placed, omitted};
}
