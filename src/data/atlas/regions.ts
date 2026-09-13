export type AtlasFieldStatus = "ready" | "planned";

export interface AtlasFieldDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  status: AtlasFieldStatus;
}

export const northAmericaFields: AtlasFieldDefinition[] = [
  {
    id: "agriculture",
    label: "農業",
    shortLabel: "Agriculture",
    description: "作物域を、地形・水・気候・輸送と一緒に読む",
    href: "/atlas/north-america/agriculture/",
    status: "ready"
  },
  {
    id: "natural",
    label: "自然環境",
    shortLabel: "Environment",
    description: "気候・水資源・地形・標高を同じ場所で読み比べる",
    href: "/atlas/north-america/nature/",
    status: "ready"
  },
  {
    id: "industry",
    label: "主要産業",
    shortLabel: "Industry",
    description: "産業集積と交通を地域の形として見る",
    href: "/atlas/north-america/industry/",
    status: "ready"
  }
];

export const northAmericaRegion = {
  id: "north-america",
  label: "北米地図",
  description: "地形・河川・州境を共通の土台に、分野ごとの地図を重ねる。"
};
