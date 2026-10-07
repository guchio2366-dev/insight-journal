/** Display-cell heights, not new DEM samples or landform boundaries. */
export const europeElevationBreaks = Array.from({length:11}, (_, i) => i * 500);
export const europeElevationColors = [
  '#c6d9b4', '#dce5bd', '#d6cea3', '#cbbb91', '#bea582', '#ad8d73',
  '#997b69', '#8b766e', '#b3aaa1', '#d1cbc3', '#e8e3dd', '#f5f3ee',
];
export const europeElevationLabels = [
  '0m未満', ...Array.from({length:10}, (_, i) => `${(i * 500).toLocaleString('ja-JP')}〜${((i + 1) * 500).toLocaleString('ja-JP')}m未満`), '5,000m以上',
];
