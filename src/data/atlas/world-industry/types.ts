export interface Source { label: string; url: string }
export interface Stage { id: string; label: string; note: string }
export interface Site {
  id: string;
  name: string;
  country: string;
  coordinates: [number, number];
  stage: string;
  kind: '工場' | '鉱山' | '油ガス田' | '港・受入基地' | '地域' | '設計拠点' | '需要地';
  status: '稼働' | '計画' | '地域集計';
  /** 非公表: checked sources have no site-specific number; not a claim that no public source exists. */
  scale: { value: string; unit: string; year: string; basis: '生産実績' | '設備能力' | '処理実績' | '出荷実績' | '需要実績' | '参考指標' | '非公表'; scope: string };
  note: string;
  sources: Source[];
  labelOffset?: [number, number];
}
export interface SupplyLink {
  id: string; from: string; to: string; label: string;
  evidence: string; year: string; sources: Source[];
}
export interface Sector {
  id: string;
  label: string;
  shortLabel: string;
  scope: string;
  stages: Stage[];
  sites: Site[];
  links: SupplyLink[];
}
