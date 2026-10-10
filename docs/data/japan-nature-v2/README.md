# 日本自然環境 v2 — 原資料と有限初便

対象は #306 の日本専用基図・地図枠。原資料を再取得または保存済みの原TIFFから読み、旧アジアラスタの粗いマスクを再拡大していません。共有controller・状態・Astroページ・CSSは統合担当が接続します。

| レイヤー | 採用原資料・粒度 | 時間・権利 | 取得・範囲 |
| --- | --- | --- | --- |
| 気候 | [Beck et al. (2023)](https://doi.org/10.1038/s41597-023-02549-6) 保存済み0.1°原TIFF、約8–11km | 1991–2020・CC BY4.0 | `data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif`、SHA `7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361`。1km原archiveは取得不可。国内6気候地域の説明と別分類 |
| 標高 | [NOAA ETOPO2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model)、60秒、約1–2km | 2022は版年、EGM2008基準m・CC0 | [固定原GeoTIFF](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif)、HTTP200、465,969,062B、既存SHA一致 |
| 年降水 | [GPCC v2025](https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025)、0.25°、約20–28km | 1991–2020の月別平年値12か月合計、mm/年・CC BY4.0 | [固定原NetCDF gzip](https://opendata.dwd.de/climate_environment/GPCC/GPCC_Precipitation_Analysis_Climatology/Version_2025/gpcc_precipitation_analysis_climatology_1991_2020_v2025_025.nc.gz)、HTTP200、28,442,738B、既存SHA一致。法的根拠は既存DWD台帳を継承 |
| 集水域 | [BasinATLAS v1 level06](https://www.hydrosheds.org/hydroatlas)、既存28日本record | 版v1・CC BY4.0 | 既存台帳・簡略化済み形状を日本のみ抽出。NEXT_SINK連結、沿岸小流域群を独立水系に変えない |
| 地下水 | [WHYMAP](https://www.whymap.org/) 2008、1:25,000,000、既存41日本record | BGR/UNESCO、出典明記して再利用 | 既存サービス取得・加工台帳を継承。かん養の大分類と帯水層、取水可能量や貯水量ではない |
| 川名 | [Natural Earth v5.1.2 1:10m rivers](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/) | public domain・一般化形状 | [固定配布repo原GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_rivers_lake_centerlines.geojson)、HTTP200、7,307,743B。日本該当は石狩川・利根川・最上川の3例だけ |
| 雨温図 | 既存気象庁国内観測所の札幌・東京・那覇 | 1991–2020、°C/mm・気象庁利用条件 | 共通 `AsiaClimateDiagram` / #300軸。追加観測所を創作しない |

取得日時は2026-10-10。固定元ファイルのSHA・配信ファイルSHA・マスク基図SHA・原セル位置サンプルは `public/assets/atlas/japan-nature-v2/manifest.json`。原465MB/28MBダウンロードは作業cache `/tmp/japan-nature-source` のみ、Gitへ含めません。

## 地理の意味と見た目

- 全レイヤーの表示範囲は122–147°E /24–46°N。既存日本基図全feature bbox `(122.938162,24.212104,145.824962,45.520413)` を包含します。基図自体に南鳥島・沖ノ鳥島は収録されていません。全国の領土の全島を含むとの主張はしません。
- ~2km間隔のWeb Mercator PNGは原セル最近傍の表示用。2km画素は観測解像度ではありません。元の気候0.1°・降水0.25°の粗さを明記します。補間したカテゴリーや海のセル・隣島からの穴埋めなし。
- 標高500m／年降水250mmの段階色と線は、それぞれ同じ原格子・同じしきい値からcontourpyで生成して海岸線にclip。平滑化なし。原セル間の等値線の線形補間は地図表現であり、細部の観測を増やしません。
- 数値PNG/gridは原セル最近傍、ベクトルの段階色/線は原セル間の等値線表現です。両者の境界位置は異なり得ます。格子クリックの数値は元格子値で、線上の現地測定値ではありません。
- 低い海岸セルに海底の影響による負のETOPO標高があり、改変せず数値gridに保持。PNG最低色に含みます。0mより低い部分は陸の基図を背景にし、等高線は500mからです。
- 原格子欠測は透明。2,107,488全displaypixel照合で基図陸150,067pixel、標高欠測0／降水欠測1／気候未分類31。小島が2km表示画素より小さい場合は表示されない可能性があります。
- BasinATLASとWHYMAPは既存世界資料の簡略化済み形状です。詳細海岸で再clipしても元の空隙や原資料の粗さを解消しません。国内精密資料に見せません。
- 原川の位置を移動せず、地図ラベルは収録川上のanchorです。川名3例を国内の全国河川網として表示しません。

## 説明の出典

日本海側/太平洋側などの定性説明は、[気象庁「日本の気候」](https://www.jma.go.jp/jma/kishou/know/kisetsu_riyou/tenkou/Average_Climate_Japan.html) と [神戸地方気象台「兵庫県の気候特性」](https://www.data.jma.go.jp/kobe-c/climate/kiko/kiko.html) を確認。六地域の代表locatorは地点を考える目安で、地域境界ポリゴンや雨温図を作るデータではありません。定量観測を持つ3都市と、定性代表地の金沢・松本・高松を区別します。気候地域説明にはKöppen出典でなく各気象庁説明を使用。

## 取得障害と次便

次の直接取得で `Tunnel connection failed: 403 Forbidden`。別host・設定変更による回避なし。

- Beck1km原archive: `https://ndownloader.figshare.com/files/45057352`。既存0.1°原memberは手元の既存台帳から利用。
- 国交省国内河川W05: `https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W05.html`。NE10mは国内公的河川網の代替完成品ではない。
- 気象庁追加金沢国内平年原表: `https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no=54&block_no=47606&year=&month=&day=&view=`。取得失敗、未採用。

未整備: 全国1kmKöppen、国内公的河川網/主要湖沼・流域原表、追加代表都市平年値。これらは残作業として明示し、本初便を完全整備扱いにしません。許諾未確認の資料・新規キー・課金は使用しません。

## 検証と再生成

```
PYTHONPATH=/tmp/japan-python python scripts/prepare-japan-nature-v2.py --source-dir /tmp/japan-nature-source
PYTHONPATH=/tmp/japan-python python scripts/validate-japan-nature-v2.py --source-dir /tmp/japan-nature-source
node --test tests/unit/atlas-japan-nature-v2.test.mjs
```

独立validationは生成側と別の原セル添字・GDAL座標変換で、各ラスタの全2,107,488pixelを原資料/詳細maskと照合。数値/PNG alpha、原気候palette、ベクトル全featureの海岸外面積/長さ、250mm/500m間隔、全配信SHAを検証。結果は `validation.json`。単体4件成功。

安全なChromeの1440×900/1024×768の画面・選択/解除/戻るは統合担当が実施します。このデータ担当の結果だけで実画面検証完了とは扱いません。
