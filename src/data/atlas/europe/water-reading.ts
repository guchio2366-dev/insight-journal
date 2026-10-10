/** GPCC precipitation reading kept distinct from river/lake location and water supply. */
export const europePrecipitationLayer = {
  id: 'precipitation', field: 'nature' as const, title: '年降水量・250mm等雨量線', period: '1991–2020', unit: 'mm/年',
  note: 'GPCC/DWDの1991–2020年の月別平年値を12か月合計し、原格子中心間を線形補間して250mm等雨量線と同じ境界の段階青色を表示します。原資料は0.25度格子の雨量計に基づく補間値です。四隅に完全な年値が揃う範囲だけ描き、沿岸部などで補間できない箇所や原格子の欠測を塗り足していません。地点照会は最も近い原格子の年値で、補間した色の値とは異なることがあります。細かな山地や小国の局地的な降水量、河川流量・地下水量・利用できる水の量は表しません。',
  source: 'https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025',
  image: '/assets/atlas/europe/precipitation-contours-v1/precipitation.png', manifest: '/assets/atlas/europe/precipitation-contours-v1/manifest.json',
  grid: '/assets/atlas/europe/precipitation-v1/values.bin.gz', gridType: 'display' as const, nodata: -1,
  breaks: Array.from({length:12},(_,i)=>(i+1)*250), colors: ['#eef7fb','#dceef7','#c7e3f2','#add5eb','#8fc4df','#6fb1d3','#529ac5','#3d82b4','#2f6da4','#245b94','#1c4b82','#153b6d','#0c2d57'],
  labels: [...Array.from({length:12},(_,i)=>i===0?'250未満':`${(i*250).toLocaleString('ja-JP')}–${((i+1)*250).toLocaleString('ja-JP')}未満`),'3,000以上'],
};

export const europePrecipitationReading = {
  title: '年降水量の分布', period: '1991–2020',
  takeaway: '年降水量の高い帯はノルウェー西岸やアルプス周辺にあり、イベリア半島の内陸や東南欧の低い帯と対照をなします。',
  body: '大西洋から届く湿った空気は西岸の山地で上昇して雨を降らせます。アルプスでも斜面の向きと標高が降水の分布に関わります。内陸や山地の風下側では海からの湿気が届きにくく、地中海沿岸は夏の乾燥も年合計に反映されます。色と250mm刻みの等雨量線は同じ補間境界で、地点照会は最寄りの原格子値です。',
  note: '等雨量線と色帯は同じ補間境界から作り、原格子の四隅に完全な年値が揃う範囲だけ描きます。沿岸などで補間できない箇所は未描画です。地点照会は最寄り原格子の年値を保持し、補間した色の値とは異なることがあります。12か月すべての値がある原格子だけを合計しています。0は有効な値で、欠測とは区別しています。表示は1,800×1,502画素ですが、原資料の解像度は0.25度です。年降水量から河川の流量、地下水の涵養量、供給可能な水量を推定していません。ロシアは東経65度までの表示範囲に限ります。',
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
  attribution: 'GPCC/DWD, Rustemeier et al. (2025), DOI: 10.5676/DWD_GPCC/CLIMAT_V2025_025, CC BY 4.0。12か月合計・原格子中心間の等雨量線と段階帯・表示範囲の切り出し・配色を変更。',
};
