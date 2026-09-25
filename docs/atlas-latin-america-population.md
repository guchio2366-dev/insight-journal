# 中南米の地域内人口分布

国平均の塗り分けとは別に、2020年の居住人口推計を示す実際のGHSL格子から人口密度の地図を作成した。人口の密集する沿岸・都市と、アマゾン内陸・パタゴニアなどの低密度地域を地域内で比較できる。

## 原典

[GHS-POP R2023AのJRC公式データ記録](https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe)、DOI: `10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE`。Schiavina, Freire, Carioli and MacManus / European Commission, Joint Research Centre。

使用した版は`GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0`。2020年の1 km Mollweide等積投影格子を使用する。[公式タイル一覧](https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/tiles/)から地域に必要な42個を取得した（取得日2026-09-25、ZIP合計97,962,027 bytes）。307 MBの全球ZIPは取得していない。

[公式の説明](https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php)と、その画面が読み込む[メタデータ](https://human-settlement.emergency.copernicus.eu/data/ghs_pop2023.json)により、元値が「セル内の居住人口推計」、nodataが-200、1000 m格子がWorld Mollweideであることを確認。人口センサス等を建築域などの情報で格子へ配分したモデル値であり、個々の世帯を直接観測した値ではない。

[公式著作権表示](https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/copyright.txt)はCC BY 4.0。出典と加工の明示を要する。画面用表記：「欧州委員会 JRC・GHSL GHS-POP R2023A（2020年人口推計）をInsight Journalが地域集計・図化」。

## 集計方法

1. 元GeoTIFFのCRSがESRI:54009、セルが1000×1000 m、タイルが1000×1000セルであることを全42タイルで検証する。
2. 等積投影上で10×10セルごとに人口を合計し、そのブロック内の有効セル面積（1セル1 km²）で割る。したがって単位は人/km²。海域等の元nodata -200は合計にも分母にも入れず、全セル欠測なら欠測のまま保持する。海岸付近の一部有効ブロックの分母は100 km²未満となる。
3. 西経93～33度・南緯56～北緯28度の480×777画素のWeb Mercator格子へ、各画素中心に該当する10 km等積格子の値を選択して描画する。連続補間はしない。
4. 既存の34の国と地域のポリゴンでマスクする。メキシコを除き、プエルトリコとフォークランド諸島を含む。小島を拡大しない。
5. 表示・クリック値を有効数字3桁に丸める。微小な正の推計値は正のまま残し、実際の0と欠測-1を区別する。画像と検索格子は同じ丸め後の密度から生成する。

8区分の境界は1、10、50、100、500、1000、5000人/km²。各区分は下端を含み上端を含まない。分類0は透明、分類1は0以上1未満。これは表示用の区分であり、原典の公式分類ではない。

## 配布ファイルとUI契約

`public/assets/atlas/latin-america-population-v1/`以下に配置する。

| ファイル | 内容 | サイズ |
| --- | --- | ---: |
| `latin-america.png` | 480×777 RGBA、欠測は透明 | 59,088 bytes |
| `latin-america.grid.json` | 同じ画素の人口密度（人/km²） | 1,302,496 bytes |
| `source-inputs.json` | 42個のZIP/TIFFのURL・SHA-256・サイズ・地理参照 | 約27 KB |
| `manifest.json` | 年・出典・単位・凡例・方法・出力ハッシュ・34地域のカバー状況 | 約8 KB |

画像のMapLibre座標は`[[-93,28],[-33,28],[-33,-56],[-93,-56]]`、`raster-resampling`は`nearest`。`manifest.regions['latin-america']`にも画像・格子名、bounds4326、bounds3857、幅・高さ、imageCoordinatesが入る。

格子は北から南、西から東のrow-major。`values`が実際の密度値で、分類IDではない。`noData = -1`、0は有効な0人の推計。位置をEPSG:3857へ変換して`bounds3857`からセルを求める。最寄りの有効セルへの置換はしない。凡例は`manifest.classes`の`minInclusive`・`maxExclusive`・`color`・`label`を使用する。

全34地域に有効画素がある。有効111,969画素のうち正値82,917画素。小島は1～4画素程度の場合があるため、地区や街路の詳細には使わない。国境と海岸はNatural Earth由来の既存形状を使用する。市内密度の細部は10 km集計と表示格子により平滑化される。Web Mercator画素の数や密度値を単純に合計して人口総数を算出してはならない。

## 再生成と検証

Python、NumPy、Pillow、Rasterioを使用。大きな元ZIPはリポジトリ外に置き、通常のWebビルドではネットワークを使用しない。

```text
python scripts/atlas-latin-america-population.py --cache /path/to/latin-population-source-cache
```

独立インストールの依存パッケージを使う場合は`--deps /path/to/packages`を指定する。未取得データの取得は`--download`がある場合のみ実行。初回の精査済み入力を固定するときだけ`--pin-inputs`を指定する。以後は全ZIPのSHA-256一致を要求し、無言で新しい入力に更新しない。

全42タイルの投影・原点・ピクセル寸法・nodata・非負性、34地域のマスク、PNGと検索格子の全画素一致、入力ハッシュを用いた再生成を確認した。さらに別の計算で検索画素中心から元タイルの10×10セルを読み直し、サンパウロ付近11,500、ブエノスアイレス付近9,940、ボゴタ付近13,100人/km²が一致することを確認した。これらは検証座標が入る格子の値であり、都市の行政区域平均ではない。アマゾン内陸・パタゴニアの選定セルでは0、メキシコ・大西洋の対象外セルでは-1を確認した。画像も目視確認済み。
