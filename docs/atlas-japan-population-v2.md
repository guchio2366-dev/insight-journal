# 日本人口の後続初便（2026-10-10）

全国図の実データは既存GHSL 2020年・5km集約のままです。この便では、主要8都市と周辺の平野を読む参照位置・説明、既存3都市域の輪郭、47県の2020年国勢調査人口・年齢構成を追加するための独立部品を用意しました。全国の元1km格子を取得した完成版ではありません。

## 採用資料と範囲

|資料|年・対象・単位|処理・保持|権利・根拠|
|---|---|---|---|
|[国勢調査・表2-3](https://www.e-stat.go.jp/stat-search/file-download?fileKind=0&statInfId=000032142406)|2020-10-01、47都道府県＋全国、人口・15歳未満・15〜64歳・65歳以上・年齢不詳、人|既存 `asia-social-v1` から日本の人口と年齢人数のみ抽出。未補完表の年齢不詳を保持。全国126,146,099人と47県の合計が一致。WDI年央人口は混ぜない|[e-Stat利用規約](https://www.e-stat.go.jp/terms-of-use)。数値の利用・加工と出典表示。既存原本取得日2026-09-27、原xlsx SHA-256 `d148f2c3c26985fffecd44110e5792295c4e02514e49f1b2eb4764345e9f355a`|
|[GHS-POP R2023A](https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE)|2020年推計居住人口、元等面積1km²セル。全国表示は5×5集約の人/km²、東京窓のみ元1km|全国5km表示・照会を精細化しない。東京の既存PNG・float32格子を無改変保存。Web Mercator表示の画素間隔約700mは観測解像度ではない。海を含むセルの元密度を陸地だけの密度へ読み替えない|[GHSL利用条件](https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php)、CC BY 4.0。製品引用Schiavina et al. (2023)、方法引用[Pesaresi et al. (2024)](https://doi.org/10.1080/17538947.2024.2390454)|
|[GHS-UCDB R2024A V1.2](https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php)|東京・大阪・名古屋、2020年人口／2025年固定都市域輪郭|既存east-asia.urban.jsonの3形状・IDを無改変抽出。2020年の市域、行政境界、通勤圏には読み替えない|GHSL CC BY 4.0。元生成manifestと入力hashを継承|
|[地理院地図](https://maps.gsi.go.jp/)、環境省地盤環境情報|主要都市の参照位置・平野の説明|8都市の点は人口規模を持たない。平野ポリゴンを描かない。追加参照点の概略位置は都市の人口重心ではない|外部地図への案内、独立した短い解説。地図・文章・画像の転載なし|

東京・大阪・名古屋は既存GHSL都市域の代表点をそのまま使用。札幌は既存JMA観測所の位置、新潟は既存asia-water参照点を再利用。仙台・広島・福岡は市街地の概略参照点（緯度経度0.01度程度）で、建物や統計境界の位置を示しません。選択してもカメラ移動しない設計で統合してください。

平野・地形の説明は環境省の[石狩](https://www.env.go.jp/water/jiban/directory/ishikari.html)、[仙台](https://www.env.go.jp/water/jiban/directory/sendai.html)、[新潟](https://www.env.go.jp/water/jiban/directory/niigata.html)、[広島](https://www.env.go.jp/water/jiban/directory/hiroshima.html)と地理院地図を参照。交通・仕事・サービスが集積へ関わるという記述は立地を考える説明であり、人口格子から測定した因果ではありません。右の概説は分布の読み取り、解説は条件と理由に分けています。

## 取得障害と公的代替の評価

元ファイルは `/workspace`・`/tmp` に存在しません。以下へ通常HTTPS接続を行い、この環境のプロキシから `Tunnel connection failed: 403 Forbidden` が返りました。別経路への切替、403回避、権限・ネットワーク設定変更は行っていません。公式ページがweb検索で読めることを原ファイル取得成功とは扱いません。

- 元GHSL 1km TIFFを含む[公式ZIP](https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0.zip)。既存manifestの元TIFF SHA-256は `db25d12ab0851446af467a56eb1651d383867dc3fbf4aa6348ec8e3372225196`（ZIPのhashではない）。原資料入手後に全国1kmを生成する必要があります。
- [2020年国勢調査地域メッシュの公式案内](https://www.stat.go.jp/data/mesh/r2_w.html)、[e-Stat人口及び世帯500m/JGD2011、T001141](https://www.e-stat.go.jp/gis/statmap-search?aggregateUnit=H&datum=2011&page=1&serveyId=H002005112020&statsId=T001141&toukeiCode=00200521&toukeiYear=2020&type=1)。公表された1km・500m・250m格子の実データ、欠測／秘匿仕様を取得・照合していません。全国図へ接続したとは扱いません。
- [国土数値情報250mメッシュ人口（R6国政局推計）](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh250r6.html)はCC BY 4.0の公的代替候補。2020年 `PTN_2020` を含みますが、[試算方法](https://nlftp.mlit.go.jp/ksj/gml/datalist/r6_about_future_population.pdf)では不詳補完と市町村合計への調整を行っています。国勢調査公表メッシュの直接値と同一とは限らず、未取得のため採用しません。将来予測を現在人口として描くこともありません。

全国元1kmまたは国勢調査メッシュの通常取得・原表検証が残っています。入手後の日本抽出・同一基図との海岸整合・凡例／照会・ブラウザ検証は追加60〜90分を暫定目安とし、配信量／欠測の確認で調整します。

## 採否と追加機能の範囲

人口密度と主要都市は国内集中を読む主題として採用。47県人口と全国・県別の年齢3区分は、人数の多さと生活・医療・交通需要を考える年齢構成を区別する補助表として採用し、人口密度の地図を県別年齢色へ無条件に増やしません。年齢の割合は年齢判明人口が分母で、不詳人数を別記します。

人口増減は同一範囲の国内原表確認を追加で要するため初便から除外。国籍・民族自己認識・宗教は異なる概念で、資料のない民族・宗教分布を創作しません。この便は国籍原表も抽出せず、年比較・国比較・発展的insight遷移・任意県初期選択を追加しません。

## 統合インターフェースと検証

- `src/data/atlas/japan-population-v2.ts`: `japanPopulationPlaces`（8件）、`japanPopulationReading`、`getJapanPopulationReading(topic, cityId?)`、`japanPopulationSources`。
- `src/components/atlas/JapanPopulationStatistics.astro`: props `{showAge?: boolean}`、既定true。主セレクター `[data-japan-population-statistics]`、行 `[data-japan-population-row="JP-xx"]`。静的表で県選択は追加しません。キーボードでスクロール可能。6列が横に収まらない画面では表内を横スクロールし、文字を縮めません。
- `public/assets/atlas/japan-population-v2`: census JSON、3都市域 `urban.geojson`、東京窓の元1km資産・metadata、source/output SHA-256 manifest。全国図へ東京の細密窓を自動overlayしません。
- `scripts/prepare-japan-population-v2.py`: checked-inデータのみで再生成。ダウンロードなし、元データ改変なし。

`node --experimental-strip-types --test tests/unit/atlas-japan-population-v2.test.mjs`: 5件成功。47県の全人数／年齢不詳を元抽出値と照合、全国・年齢別合計、元hash、東京窓の画像と照会の一致、元都市形状と同一、8点の既存人口格子が正の値であることを確認。主要都市参照点に人口数値を創作していません。実画面・カメラ不変・選択解除・戻る検証はroot統合後に安全なChromeで実施する範囲です。
