// MAFF, Wheat Supply and Price reference tables, pp. 28 and 34 (FY2023).
// https://www.maff.go.jp/j/seisan/boueki/mugi_zyukyuu/attach/pdf/index-178.pdf
// The balance-sheet imports are net of exports. Customs origins cover foreign
// food wheat within and outside state trade; their scope is narrower.
export const japanWheatSupply={
 year:2023,
 unit:'thousand tonnes',
 production:1094,
 netImports:5104,
 inventoryChange:-114,
 domesticUse:{food:4944,processing:242,other:1126},
 // Separately reported flour output by intended use, not wheat-grain disposition.
 flourUses:{unit:'thousand tonnes',bread:1823,noodles:1541,confectionery:503},
 selfSufficiency:[
  {year:2019,rate:16},{year:2020,rate:15},{year:2021,rate:17},
  {year:2022,rate:15},{year:2023,rate:17},
 ],
 origins:{total:4478183,rows:[
  {name:'カナダ',tonnes:1863031},
  {name:'米国',tonnes:1785971},
  {name:'豪州',tonnes:822935},
  {name:'その他',tonnes:6246},
 ]},
} as const;
