// Small published UN Comtrade partner extracts displayed by World Bank WITS.
// 2023 calendar year, gross imports, HS 1988/92 (H0), current USD.
// WITS publishes values in thousands of USD to two decimals. These stored
// values are multiplied by 1,000; the remainder is total less the shown top 3.
type ImportPartners={total:number;top:readonly {name:string;value:number}[];source:string};
export const cropImportPartners:Partial<Record<'CHN'|'KOR'|'TWN',Partial<Record<'rice'|'wheat'|'maize'|'soybean',ImportPartners>>>>={
 CHN:{
  rice:{total:1407227120,top:[{name:'ベトナム',value:542961190},{name:'タイ',value:298379150},{name:'ミャンマー',value:224818670}],source:'https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2023/tradeflow/Imports/partner/ALL/product/1006'},
  wheat:{total:4305162600,top:[{name:'豪州',value:2506563900},{name:'カナダ',value:984888910},{name:'米国',value:319325400}],source:'https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2023/tradeflow/Imports/partner/ALL/product/1001'},
  maize:{total:9016159310,top:[{name:'ブラジル',value:4046940450},{name:'米国',value:2611269780},{name:'ウクライナ',value:1807972240}],source:'https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2023/tradeflow/Imports/partner/ALL/product/1005'},
  soybean:{total:59444094520,top:[{name:'ブラジル',value:40954089980},{name:'米国',value:15299669750},{name:'アルゼンチン',value:1244740440}],source:'https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2023/tradeflow/Imports/partner/ALL/product/120100'},
 },
 KOR:{
  rice:{total:259370990,top:[{name:'中国',value:108183250},{name:'米国',value:73911590},{name:'ベトナム',value:38563180}],source:'https://wits.worldbank.org/trade/comtrade/en/country/KOR/year/2023/tradeflow/Imports/partner/ALL/product/1006'},
 },
 TWN:{
  rice:{total:86776760,top:[{name:'米国',value:31157980},{name:'ベトナム',value:20890790},{name:'タイ',value:15697650}],source:'https://wits.worldbank.org/trade/comtrade/en/country/OAS/year/2023/tradeflow/Imports/partner/ALL/product/1006'},
 },
};
