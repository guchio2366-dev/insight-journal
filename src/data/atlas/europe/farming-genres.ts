export const europeFarmingGenres = {
  crops: {
    title: '穀物・畑作',
    ids: ['wheat', 'barley', 'maize', 'potato', 'sugarbeet', 'rapeseed'],
    missing: 'ライムギ単独の分布格子は未収録です。',
  },
  livestock: {
    title: '酪農・畜産',
    ids: ['cattle', 'pig', 'chicken', 'sheep'],
    missing: '牛の格子は乳用・肉用を分けていません。酪農地帯と肉牛地帯の別々の面は原資料未収録のため描いていません。',
  },
  horticulture: {
    title: '果樹・園芸',
    ids: ['citrus', 'temperatefruit', 'vegetables'],
    missing: 'ブドウとオリーブ単独の格子は未収録です。温帯果樹と野菜は原資料の集合区分です。',
  },
} as const;

export type EuropeFarmingGenre = keyof typeof europeFarmingGenres;
export const europeFarmingGenreIds = Object.keys(europeFarmingGenres) as EuropeFarmingGenre[];

export function europeFarmingGenreForLayer(id:string):EuropeFarmingGenre|undefined {
  if(id==='dairy')return 'livestock';
  // Retain existing source-backed deep links used by fixed reading examples.
  if(['rice','sunflower','soybean'].includes(id))return 'crops';
  return europeFarmingGenreIds.find(genre=>id===genre||europeFarmingGenres[genre].ids.some(item=>item===id));
}
