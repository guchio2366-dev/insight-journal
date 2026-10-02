/** GPCC precipitation reading kept distinct from river/lake location and water supply. */
export const europePrecipitationLayer = {
  id: 'precipitation', field: 'nature' as const, title: '年降水量の分布', period: '1991–2020', unit: 'mm/年',
  note: 'GPCC/DWDの1991–2020年の月別平年値を12か月合計した分布です。原資料は0.25度格子の雨量計に基づく補間値。表示用の格子に最も近い原格子の値を置き、欠測を補っていません。細かな山地や小国の局地的な降水量、河川流量・地下水量・利用できる水の量は表しません。',
  source: 'https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025',
  image: '/assets/atlas/europe/precipitation-v1/precipitation.png', grid: '/assets/atlas/europe/precipitation-v1/values.bin.gz', gridType: 'display' as const, nodata: -1,
  breaks: [250, 500, 750, 1000, 1500, 2000], colors: ['#f5f0dd', '#d9e6df', '#b6d7df', '#86bdd2', '#529abc', '#2877a5', '#14537d'],
  labels: ['250未満', '250–500未満', '500–750未満', '750–1,000未満', '1,000–1,500未満', '1,500–2,000未満', '2,000以上'],
};

export const europePrecipitationReading = {
  title: '年降水量の分布', period: '1991–2020',
  takeaway: '沿岸・内陸・山地の位置をたどり、年降水量の分布を気候分類や地形と読み比べます。',
  body: 'この地図は、雨量計の観測をもとにGPCCが補間した月別降水量の平年値を12か月合計したものです。観測所の点の値とは資料と空間の単位が異なります。気候グラフの年降水量と違いがあっても、どちらかの値を置き換えず、観測所と0.25度格子の違いを確かめます。',
  note: '12か月すべての値がある原格子だけを合計しています。0は有効な値で、欠測とは区別しています。表示は1,800×1,502画素ですが、原資料の解像度は0.25度です。年降水量から河川の流量、地下水の涵養量、供給可能な水量を推定していません。ロシアは東経65度までの表示範囲に限ります。',
  sources: [
    { label: 'GPCC/DWD：1991–2020年の降水量平年値と原格子', url: 'https://opendata.dwd.de/climate_environment/GPCC/html/gpcc_precipitation_analysis_climatology_v2025_doi_download.html' },
    { label: 'GPCC/DWD：資料のDOIと著者表記', url: 'https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025' },
    { label: 'DWD：利用条件（CC BY 4.0）', url: 'https://www.dwd.de/EN/service/legal_notice/legal_notice.html' },
  ],
  comparisonQuestions: {
    climate: '年降水量の分布と気候分類を見比べ、同じ気候分類の中にも降水量の違いがあるかを確かめます。',
    terrain: '降水量と地形を切り替え、海岸・山地・内陸の位置関係を読みます。地形だけで降水量の原因を断定しません。',
    water: '河川・湖の位置と降水量を比べます。川の水は流域全体から集まるため、川の位置の降水量をそのまま流量として読みません。',
  },
  attribution: 'GPCC/DWD, Rustemeier et al. (2025), DOI: 10.5676/DWD_GPCC/CLIMAT_V2025_025, CC BY 4.0。12か月合計・表示範囲の切り出し・配色を変更。',
};
