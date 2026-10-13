import overview from '../../../../public/assets/atlas/europe/drainage-v1/main-basin-overview-manifest.json' with { type: 'json' };
import basins from '../../../../public/assets/atlas/europe/drainage-v1/basins.json' with { type: 'json' };
import manifest from '../../../../public/assets/atlas/europe/drainage-v1/manifest.json' with { type: 'json' };

export const drainageValueLabels: Record<number, string> = Object.fromEntries(basins.map(basin => [
  basin.index, `流域区画 HYBAS_ID ${basin.HYBAS_ID}（Pfafstetter ${basin.PFAF_ID}）`,
]));

export const drainageLayer = {
  id: 'drainage', field: 'nature' as const, title: '主要水系・保存済み流域面', period: 'BasinATLAS v1.0（2019年公開）', unit: '流域区画ID',
  note: '初期色面は同じMAIN_BASの保存区画を5水系に統合。国境で切られた保存範囲で全流域ではありません。テムズとウラルの原流域面は未収録です。BasinATLASのレベル4流域区画です。色は隣り合う区画を見分けるための識別色で、流量や地下水量の大小を表しません。区画は各河川の流域全体とは限らず、小さな沿岸流域をまとめた区画もあります。地形・排水モデル由来の境界で、2019年は製品の公開年です。北緯60度以北は元の地形資料が粗く、境界の精度が低下します。',
  source: 'https://doi.org/10.6084/m9.figshare.9890531.v1',
  attribution: 'BasinATLAS v1.0 / HydroATLAS, Bernhard Lehner; Simon Linke; Michele Thieme。方法の引用：Linke et al. (2019), CC BY 4.0。HydroSHEDS/WWF由来の流域区画。全世界レベル4の元形状から45か国・表示範囲へ切り出し、投影・配色を加工。元データは無保証です。',
  licence: 'https://creativecommons.org/licenses/by/4.0/',
  manifest: '/assets/atlas/europe/drainage-v1/manifest.json',
  image: '/assets/atlas/europe/drainage-v1/main-basin-overview.png', grid: '/assets/atlas/europe/drainage-v1/values.bin.gz', gridType: 'display' as const, nodata: -1,
  colors: overview.groups.map(group=>group.color), labels: overview.groups.map(group=>group.name+'（保存範囲）'),
  valueLabels: drainageValueLabels,
};

export const drainageReading = {
  title: '主要水系・保存済み流域面', period: 'BasinATLAS v1.0（2019年公開）',
  takeaway: 'ライン・セーヌは北海・英仏海峡側、ドナウ・ドンは黒海・アゾフ海側、ヴォルガはカスピ海側へ水が集まる5水系の保存面を示します。',
  body: '山地や平原の起伏が水の集まる向きを分けます。ドナウ川はアルプス・カルパチア・バルカン周辺の支流を受けて黒海へ、ヴォルガ川は東欧平原の広い範囲から集まってカスピ海へ注ぎます。同じ河口に至るレベル4区画をドナウ・ヴォルガの各9区画についてまとめています。表示面は対象国と地図枠で切れており、青線もNatural Earthの収録区間です。源流から河口までの完全な本流・全流域の図ではなく、その河川の流域全体を示すとは限りません。',
  note: '同じ色は同じMAIN_BASの保存区画を表し、灰色はそれ以外のモデル区画です。完全な自然流域かどうかは、色だけで判断しません。色に量の順序はありません。2019年は公開年で、境界には元の地形・排水モデルの年代と精度が反映されます。元資料は15秒角相当ですが、北緯60度以北は粗い地形資料に基づきます。表示用の1,800×1,502画素は元の解像度を高めません。海・出典にない区画・小国の表示不足を補完せず、ロシアは東経65度までに限ります。流量・地下水量・利用できる水量は計算していません。',
  sources: [
    { label: 'HydroATLAS：BasinATLASの流域区画・製品とCC BY 4.0', url: 'https://www.hydrosheds.org/hydroatlas' },
    { label: '著者公開BasinATLAS v1.0：実際に取得した出典', url: 'https://doi.org/10.6084/m9.figshare.9890531.v1' },
    { label: 'Linke et al. (2019)：流域・河川の区画と属性の方法', url: 'https://doi.org/10.1038/s41597-019-0300-6' },
    { label: 'HydroATLAS技術文書：区画の階層・精度・無保証', url: 'https://data.hydrosheds.org/file/technical-documentation/HydroATLAS_TechDoc_v10_1.pdf' },
    { label: 'CC BY 4.0：帰属・加工表示・無保証の条件', url: 'https://creativecommons.org/licenses/by/4.0/' },
  ],
  comparisonQuestions: {
    climate: '同じ流域区画の中で降水や気候がどう違うかを比較します。ひとつの地点の降水量を、その区画全体の流量と読み替えません。',
    terrain: '山地・平野と区画境界の位置を比較します。地形モデル由来の境界であり、北部の細かな境界を断定しません。',
    water: '河川の表示位置がどの区画に入るかを読みます。レベル4の区画は、名前のある河川の全流域とは限りません。',
  },
  attribution: drainageLayer.attribution,
  disclaimer: 'HydroATLASのデータは現状のまま無保証で提供されています。精度・適合性を保証せず、作者の責任制限は技術文書4.2–4.3節とCC BY 4.0第5節に記載されています。',
};

export const europeDrainageLayer = drainageLayer;
export const europeDrainageReading = drainageReading;
