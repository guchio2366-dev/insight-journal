# アジア3地域の気候分類データ v1

## 採用した資料

- 論文：Beck et al. (2023), *High-resolution (1 km) Köppen–Geiger maps for 1901–2099 based on constrained CMIP6 projections*, Scientific Data 10, 724. https://doi.org/10.1038/s41597-023-02549-6
- 固定した公開記録：Figshare `21789074` の記録版1（公開日2024-03-15）。https://doi.org/10.6084/m9.figshare.21789074.v1
- メタデータ：https://api.figshare.com/v2/articles/21789074/versions/1
- 原本：https://ndownloader.figshare.com/files/45057352 （`koppen_geiger_tif.zip`, 130,339,513 bytes）
- 原本 SHA-256：`d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d`
- 配布元照合用 MD5：`b19c60b2c83380bd1010911f377139e5`
- 使用ファイル：`1991_2020/koppen_geiger_0p1.tif` と `legend.txt`。
- 取得・利用条件確認日：2026-09-25。

ライセンスは **CC BY 4.0**。公開元の [GloH2O](https://www.gloh2o.org/koppen/) と版指定メタデータで確認した。派生物にも著者、論文、[ライセンス](https://creativecommons.org/licenses/by/4.0/)、切り出し・再投影・国別マスクを施したことを示す。地図製品のV1/V2/V3という名称とFigshare記録版1は異なるため、両者を同一視しない。

1991–2020の観測に基づく気候値から導かれた気候分類であり、現在の天気、観測所の測定値、将来予測を表すものではない。気候の格子値を雨温図の観測値として利用しない。

## 加工と座標系

1. 固定原本をSHA-256と配布元のMD5で検証する。変更があれば停止し、最新版へ自動的に置き換えない。
2. 配布元が高解像度分類から多数決法で集約した **0.1度** のGeoTIFFを読み込む。元格子はEPSG:4326、3,600列×1,800行、左上端 `(-180, 90)`、0は海域等のデータなし。
3. 地域ごとにEPSG:3857へ再投影。出力画素の中心に最も近い元格子値を採用する。分類番号の連続補間は行わない。
4. 現行サイトの `src/data/atlas/regional-countries.json` の対象国ポリゴンを画素中心で判定し、対象国・地域外を0にする。穴と複数ポリゴンを処理する。小島を大きく描いたり近隣の分類を補充したりしない。
5. この同じUInt8配列から、PNGとクリック照会用JSONを生成する。PNGは配布元の凡例のRGBを使用し、0だけ完全透明。生成後にPNGと照会用配列の完全一致を検証する。

横方向の出力間隔は約11.13kmのメルカトル座標間隔。地上距離は緯度で変わる。**1kmの表示地図とは表記しない**。画素数は面積や国土比率として使用しない。

国境マスクは、既存サイトのNatural Earth Admin 0（1:110mと一部の小国の1:50m）に準拠する。境界の一般化と気候格子の解像度により沿岸や小島が欠ける。主権・係争地について独自の判断を加えたものではない。Natural Earthは[public domain](https://www.naturalearthdata.com/about/terms-of-use/)。使用した境界JSONのハッシュをmanifestに記録する。

## 出力契約

生成先：`public/assets/atlas/asia-climate-v1/`

| 地域ID | 範囲 `[西,南,東,北]` | 出力格子 | 分類数 |
|---|---|---|---|
| `east-asia` | `[72,17,147,55]` | 750×489 | 19 |
| `southeast-asia` | `[90,-12,143,30]` | 530×436 | 11 |
| `south-central-asia` | `[44,-2,100,57]` | 560×718 | 22 |

各地域に `{region}.png` と `{region}.grid.json` を置く。manifestの `regions[regionId]` に `image`、`grid`、`width`、`height`、`bounds4326`、`bounds3857`、`imageCoordinates`、`classIds`、`classPixelCounts`、`countryCoverage` を含む。

照会用JSONの必須項目：

```ts
type ClimateGrid = {
  schemaVersion: 1;
  regionId: string;
  period: string;
  width: number;
  height: number;
  bounds4326: [number, number, number, number];
  bounds3857: [number, number, number, number];
  crs: 'EPSG:3857';
  noData: 0;
  values: number[];
};
```

`values[row * width + column]` は0〜30の整数。行は北から南、列は西から東。画像・格子の端は `bounds3857`、値は画素中心を代表する。東端と南端は範囲外として判定する。

MapLibreのimage sourceにはmanifestの `imageCoordinates` をそのまま渡す。順序は左上・右上・右下・左下。PNGはすでにWeb Mercatorで生成されており、緯度方向に等間隔な画像ではない。`raster-resampling: 'nearest'` を指定して分類境界に中間色を作らない。

照会の座標変換：

```ts
const x = 6378137 * longitude * Math.PI / 180;
const y = 6378137 * Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
const [west, south, east, north] = grid.bounds3857;
const column = Math.floor((x - west) / (east - west) * grid.width);
const row = Math.floor((north - y) / (north - south) * grid.height);
const value = column >= 0 && column < grid.width && row >= 0 && row < grid.height
  ? grid.values[row * grid.width + column] : 0;
```

`0` は分類なし。海域、元データの欠測、対象国・地域外を含むため、温度0や低い値と解釈しない。国・地域の判定は国境ポリゴン側で行い、気候格子だけから推測しない。

分類定義は `src/data/atlas/asia-climate-definitions.ts` の `asiaClimateClasses`。各要素は `id`、`code`、`name`、`color`、`description`、`group`、配布元の英語表記 `sourceLabel`。画面内の凡例とクリック解説に同じ定義を使う。IDは配布元の1〜30を維持する。

## 収録範囲と制約

- 対象30か国・地域のうち29に分類画素がある。
- **モルディブ（MDV）は、今回の0.1度分類と国境マスクでは分類画素がない。** 周辺海域や別の島の気候を補って表示しない。国を選ぶ操作は残し、詳細パネルでは広域格子で小島の分類を確認できないことを示す。独立した観測所データが確認できれば、雨温図はそちらの出典から掲載できる。
- 他の国でも全島・全沿岸を収録しているという意味ではない。国内の部分欠測は `countryCoverage` の画素数で確認する。
- 地域外のロシア、中東等は透明。対象国境にまたがる地点では、粗い境界と画素によって分類なしになる場合がある。
- 気候区分と都市・観測所の月別値は異なる資料。都市の雨温図から独自に判定した区分と、この格子の区分を混同しない。

## 再生成

通常のサイトビルドで外部データを再取得しない。生成物をリポジトリから配信する。原本は130MBあるため、公開ディレクトリやGitには格納しない。

検証に使用した環境はPython 3.12.14、NumPy 2.3.5、Pillow 12.3.0。再生成時の実際の版はmanifestにも保存する。

```sh
python scripts/atlas-asia-climate.py --archive /path/to/koppen_geiger_tif-figshare-v1.zip --download
```

原本が保存済みなら `--download` を外す。スクリプトは入力チェックサム、GeoTIFFの座標系・解像度・原点・欠測、30分類の凡例、画素中心での国境マスク、PNGと照会配列の一致を確認する。出力ファイルのサイズとSHA-256をmanifestに記録する。

## 今回の確認結果

- 全3地域のPNGと照会値の一致、原本・加工後ファイルのハッシュを確認。
- 原本の分類値は0〜30、凡例は1〜30で欠番なし。
- 全3地域の画像を目視し、上下・東西の向き、対象国の形、海域と対象外国の透明化を確認。
- 地点照会の例：東京Cfa、ソウルDwa、台北Cfa、シンガポールAf、バンコクAw、ジャカルタAf、デリーBSh、アルマトイDfa。これは当該表示格子の分類であり、各観測所を再分類した結果ではない。
- PNGは地域ごとに約11〜28KB、照会用JSONは約0.47〜0.83MB（無圧縮）。必要な地域だけを読み込む。PNGのみの初期表示と、照会データの読み込み状態を区別できる。
- 実ブラウザの描画、画面上のクリック、雨温図との接続は統合担当の確認対象。
