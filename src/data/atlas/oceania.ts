export const oceaniaRegions = {
  australasia: 'オーストラリア・ニュージーランド',
  melanesia: 'メラネシア',
  micronesia: 'ミクロネシア',
  polynesia: 'ポリネシア'
};
export type OceaniaRegion = keyof typeof oceaniaRegions;
export const oceaniaSourceRegions: Record<string, OceaniaRegion> = {
  'Australia and New Zealand': 'australasia', Melanesia: 'melanesia', Micronesia: 'micronesia', Polynesia: 'polynesia'
};
export const oceaniaNames: Record<string, string> = {
  AUS: 'オーストラリア', NZL: 'ニュージーランド', PNG: 'パプアニューギニア', FJI: 'フィジー',
  SLB: 'ソロモン諸島', VUT: 'バヌアツ', NCL: 'ニューカレドニア', FSM: 'ミクロネシア連邦',
  MHL: 'マーシャル諸島', PLW: 'パラオ', NRU: 'ナウル', KIR: 'キリバス', GUM: 'グアム',
  MNP: '北マリアナ諸島', WSM: 'サモア', ASM: '米領サモア', TON: 'トンガ', TUV: 'ツバル',
  COK: 'クック諸島', NIU: 'ニウエ', PYF: '仏領ポリネシア', WLF: 'ウォリス・フツナ',
  PCN: 'ピトケアン諸島', NFK: 'ノーフォーク島', ATC: 'アシュモア・カルティエ諸島'
};
