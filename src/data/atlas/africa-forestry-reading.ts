import type {AfricaThemeMark} from './africa-themes.ts';

export type AfricaForestryReading = {
  title:string;
  takeaway:string;
  reading:string;
  definition:string;
  source:string;
  sourceLabel:string;
  compareMetric:'AG.LND.FRST.ZS';
  compareText:string;
  marks:AfricaThemeMark[];
};

// The background is FAO's 2001 Forest Based Farming System description.
// The mapped value comes from the selected year's pinned WDI forest-area series;
// neither the background nor the national share supplies a forest boundary.
export const africaForestryReading: AfricaForestryReading = {
  title:'森林の割合から、土地利用と管理を読む',
  takeaway:'森林が陸地に占める割合を国別に比べ、農地利用・道路・市場と森林管理の関係を読みます。',
  reading:'FAOの2001年の説明では、コンゴ盆地などの湿潤森林地域で農地と休閑地が使われ、道路・市場への接続や、土壌・野生生物の生息地の管理が課題とされています。この背景説明を、選択年の国別森林割合と合わせて読みます。',
  definition:'森林面積が陸地に占める割合です。天然林と人工林を含み、果樹園や農業生産の樹木は含みません。色は国全体の割合で、森林の境界・林型・保全状態・木材生産量を示しません。',
  source:'https://www.fao.org/4/y1860e/y1860e04.htm',
  sourceLabel:'FAO・森林を基盤とする農業（2001）',
  compareMetric:'AG.LND.FRST.ZS',
  compareText:'選択した年と国・比較国を保ち、森林割合を同じ基準で比較します。森林割合の高低だけから林業の生産量・収益や森林管理の良否は判断できません。',
  marks:[],
};
