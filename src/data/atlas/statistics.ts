import { atlasStatistics } from './statistics-generated.ts';
export { atlasStatistics };

export const statisticsSources = [
  {
    id: 'source-usda-farm-income',
    title: 'Farm Income and Wealth Statistics',
    publisher: 'USDA Economic Research Service',
    url: 'https://www.ers.usda.gov/data-products/farm-income-and-wealth-statistics',
    releaseDate: '2026-09-03',
    retrievedAt: '2026-09-13',
    note: '2025年の米国販売高は推計値。FarmIncome_WealthStatisticsData_September2026.csvからUS・Allを抽出。'
  },
  {
    id: 'source-usda-fatus-calendar',
    title: 'Value of U.S. agricultural trade by calendar year',
    publisher: 'USDA Economic Research Service',
    url: 'https://www.ers.usda.gov/data-products/foreign-agricultural-trade-of-the-united-states-fatus/calendar-year',
    releaseDate: '2026-09',
    retrievedAt: '2026-09-13',
    note: '暦年、名目金額。2025年までの輸出額・輸入額を同一系列から抽出。'
  },
  {
    id: 'source-usda-fatus-markets',
    title: 'Top U.S. agricultural export markets by volume',
    publisher: 'USDA Economic Research Service',
    url: 'https://www.ers.usda.gov/data-products/foreign-agricultural-trade-of-the-united-states-fatus/us-agricultural-trade-data-update',
    releaseDate: '2026-02-19',
    retrievedAt: '2026-09-13',
    note: '2025暦年、予備値。とうもろこし、大豆、小麦、綿花の数量上位5市場と世界合計。'
  },
  {
    id: 'source-usda-gats-rice',
    title: 'Global Agricultural Trade System, U.S. Standard Query',
    publisher: 'USDA Foreign Agricultural Service',
    url: 'https://apps.fas.usda.gov/gats/default.aspx',
    releaseDate: '2026-09',
    retrievedAt: '2026-09-13',
    note: 'BICO-HS10 Rice、2025暦年、FAS換算可能な明細。単位は精米換算トン（MTMEQ）。'
  },
  {
    id: 'source-usda-psd',
    title: 'Production, Supply and Distribution Online',
    publisher: 'USDA Foreign Agricultural Service',
    url: 'https://apps.fas.usda.gov/psdonline/app/index.html#/app/downloads',
    releaseDate: '2026-09-11',
    retrievedAt: '2026-09-13',
    note: 'マーケティング年2015〜2024。生産量の世界合計、国別内訳、米国シェアを同一系列から算出。米は精米換算、綿花は480ポンド俵。'
  }
] as const;

export type StatisticCropId = keyof typeof atlasStatistics.production;
export const statisticCropIds = ['corn', 'soybean', 'wheat', 'cotton', 'rice'] as const satisfies readonly StatisticCropId[];
