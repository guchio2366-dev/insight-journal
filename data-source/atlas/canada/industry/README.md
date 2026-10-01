# カナダ主要産業：州内GDP割合と公式州境

初回版は2023・2024・2025年、13州・準州の産業構成を比べる。地下資源の立地から加工・輸送・市場へのつながりを読むための統計地図で、絶対金額・雇用・生産量・施設所在地の地図ではない。

## 統計の契約

- 原典：Statistics Canada **36-10-0400-01**, *Gross domestic product (GDP) at basic prices, by industry, provinces and territories, percentage share*。
- 表：https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610040001
- 原CSV ZIP：https://www150.statcan.gc.ca/n1/tbl/csv/36100400-eng.zip
- 公表日：2026-05-01。取得・参照日：2026-09-30。
- 年：2023、2024、2025。地域：10州と3準州。全国値・他の地域集計を重ねない。
- 指標：`Mining, quarrying, and oil and gas extraction [21]`、`Manufacturing [31-33]`、`Services-producing industries [T003]`、`All industries [T001]`。
- UOM：`Percentage share`、SCALAR_FACTOR：`units`、DECIMALS：2。39年地域レコード×4指標＝156値。今回の選択に欠損・秘匿はなく、STATUS・SYMBOLは全値で空欄。VECTORと記号を保持する。

原CSVメタデータのNote ID **1**は、current price weightsが各産業の州・準州全経済GDPに占める割合であることを定義する。Note ID **9**は当年価格・連鎖価格の別表36-10-0711-01を参照。Note ID **12**は2025-11-06公表分からNAICS Canada 2022 version 1.0を採用したことを説明する。ブラウザー表の脚注番号とCSVメタデータのNote IDは一致しない場合がある。

地図は21・31–33・T003だけを切り替える。T001は各州100%の分母確認用として表に残す。21を石油・ガス採取211だけの値や、農林漁業を含む全天然資源産業と呼ばない。農林漁業・電気等の供給・建設などが残るため、選択3分類を足して100%とする円グラフを作らない。棒幅は公表割合そのもの（`value%`）で、最大州を100%とする独自正規化ではない。0と欠損を区別し、記号を落とさない。

36-10-0711-01の連鎖価格水準は採用しない。同表の連鎖価格はFisher数量指数に基づき、時系列・成長率に適するが名目構成比・水準比較には適さない。2023–25年の当年価格値は同表では未公表のため、欠損を推測補完した金額を作らない。

## 州境・表示図

- 原典：Statistics Canada *2021 Census Cartographic Boundary Files*, `PR - lpr_000b21s_e`。
- 正式公開レイヤー：https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/0
- カタログ：https://open.canada.ca/data/en/dataset/ef70dc3b-1069-4037-9bce-61f47e628a1d
- 定義・精度：https://www150.statcan.gc.ca/n1/pub/92-160-g/92-160-g2021001-eng.htm
- 境界基準日：2021-01-01。cartographic境界は沿岸水域を除く。原典はNAD83 Lambert conformal conic、公開クエリでEPSG:4326へ出力。13 featureのPRUID・DGUID・PRENAMEで地域を結合する。

公開クエリは`boundary-request.json`、個別カタログのライセンス証拠は`boundary-license.json`、元の詳細GeoJSONはgzip圧縮した`province-boundaries-2021.geojson.gz`に保持する。ZIP配信はタイムアウトしたが、公式ガイドとカタログに明記されたEsri RESTの公開queryはHTTP 200で取得できた。アクセス制御を迂回していない。

表示は900×580の等緯度経度位置図。`industry-geometry.json`のpathは、原典から表示座標でDouglas–Peuckerの許容幅0.25pxによって一般化し、bbox対角0.5px未満の小リングは表示だけで省略する。元詳細境界・元bounds・原典hashは保持する。閉じたリングと穴はevenoddで描き、面積の算出・順位付けには使わない。丸と州略号は編集上の位置案内で、資源・工場・輸送量を表さない。

周辺国土は既存のNatural Earth v5.1.2、1:110m、public domain。Ottawa・Vancouverの位置案内は既存ECCC気候データの観測点座標を使用し、中心市街地や施設座標とは呼ばない。人口ページの未マージ実装・都市圏座標には依存しない。

## 説明文の根拠

- CER *Provincial and Territorial Energy Profiles – Alberta*：https://www.cer-rec.gc.ca/en/data-analysis/energy-markets/province-territory-energy-profiles/alberta.html
- `Oil and Gas > Production > Crude Oil`：2023年のアルバータ原油生産の4分の3超が北部オイルサンド、ビチューメンの一部を合成原油に加工する説明。
- `Oil and Gas > Trade and Transportation > Crude Oil and Liquids`：Edmonton・Hardistyの集荷拠点、Enbridge MainlineとTrans Mountainが結ぶ市場、州内精製品の道路・鉄道・製品パイプライン輸送。
- 生産事例は2023年。CER本文更新日は2026-03-26、参照日は2026-09-30。年次GDP割合とは対象・時点が異なる。事実を独自に要約し、CER図・地図・写真を再配布しない。
- Transport Canada *Transportation in Canada 2024*, *Role of Canada’s Transportation Network*：https://tc.canada.ca/en/corporate-services/transparency/corporate-management-reporting/transportation-canada-annual-reports/transportation-canada-2024/role-canada-s-transportation-network
- 2024年の交通報告（2025年公開）。Ontario・Quebecの中央回廊、五大湖／セントローレンスの水路、BCの港・道路・鉄道・国境とのつながりを根拠として要約。`forestrySources.transport`の深いURLを共有する。実際の輸送経路・量を州別地図へ推測描画しない。

自然環境へのリンクは選択年・産業・2州比較を`industryReturn`に保持する。`Ottawa / water / St. Lawrence / only=1`で中央回廊の位置、`Vancouver / water / Fraser / only=1`でBCの沿岸・市場との位置関係を問う。水量・航行条件を河川位置だけから判断しない。

## 保存物・検証・ライセンス

`industry-selected.csv`に156値、`36100400-metadata.csv`に原CSVメタデータ、`provenance.json`に出典・定義・原hashを保存する。公開ファイルは`public/assets/atlas/canada-industry-v1/industry-selected.csv`と`manifest.json`。原典・抽出・表示図のSHA256および一般化方法はmanifestに記録する。

原典ZIP SHA256：`be6796c83f33297e680c80dcb1d43ec61eb842af061d59924707bc920bb2ecc6`。原CSV：`b789332f97a0eaa95d7f26738cfa11fd38616f810aecb526a55520e2267cb620`。原CSVメタデータ：`2f2838819dacfaef973c6d2a7786a1a7fd64c11bf0ccf600b3420fd4674197fc`。詳細境界：`28966276a200b7c88f97cc4d1e770588e161e2fe63aa85ca9b736015aaeddd57`。

Statistics Canada Open Licence：https://www.statcan.gc.ca/en/terms-conditions/open-licence 。境界の個別公式カタログはOpen Government Licence–Canada：https://open.canada.ca/en/open-government-licence-canada 。ページに完全な原典名・参照年・取得日とAdapted帰属・非推奨文を掲示する。政府ロゴを転載せず、公式機関による推奨を示唆しない。

> Adapted from Statistics Canada, Table 36-10-0400-01, Gross domestic product (GDP) at basic prices, by industry, provinces and territories, percentage share, reference years 2023, 2024 and 2025 (accessed September 30, 2026). This does not constitute an endorsement by Statistics Canada of this product.

> Adapted from Statistics Canada, 2021 Census Cartographic Boundary Files, province and territory boundaries, geographic reference date January 1, 2021 (accessed September 30, 2026). This does not constitute an endorsement by Statistics Canada of this product.

> Contains information licensed under the Open Government Licence – Canada.
