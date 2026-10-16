# 欧州の農林業残件：2026-10-16の部分実装

**新たに接続したのは全国の数量比較7例です。欧州全体の需給・域外輸出行列、実消費、森林・パルプの追加数量は完成していません。** 最新main `3fbb4c957c21685bddbf8148a95a2a03ba210553` をfetchし、クリーンなcheckoutから地域専用ブランチ `feat/europe-agro-residuals-20261016` を作成しました。追補の指示に従い専用ブランチをcommit・pushして渡し、PR・マージ・公開は統合担当に残します。

参照した実装基準は [`atlas-agro-statistics-implementation-20261014.md`](../atlas-agro-statistics-implementation-20261014.md)、現行欧州データ・画面・統計controller、米国 `CropStatistics.astro` と `supply-use.ts`、既存共通三列rendererです。

## 取得できた数量と表示

大豆は**2023暦年・原料豆・t**。FAOSTAT QCL236の同じ保存版の全国生産とWorld（370,876,094.01 t）に、公式WITS / UN Comtrade公開表のH0 120100総輸出・総輸入を対応させました。油・粕の重量は加算しません。

|国|生産量 t|世界生産比|総輸入 t|総輸出 t|P＋I−X t（在庫未調整）|数量で最大の相手・World輸出比|
|---|---:|---:|---:|---:|---:|---|
|ウクライナ|4,742,550|1.279%|1,875.190|3,489,890|1,254,535.190|トルコ 27.793%|
|フランス|387,820|0.105%|459,745|121,735|725,830|スペイン 28.312%|
|イタリア|1,095,940|0.296%|2,320,440|17,047.400|3,399,332.600|フランス 14.751%|
|ドイツ|129,000|0.035%|3,259,380|29,198|3,359,182|ポーランド 26.967%|

表示は①生産量・World比、②生産＋輸入と在庫未調整の見かけ供給／総輸出、③全相手数量に基づく輸出先の円・表です。**P＋I−Xを実消費や国産収穫物の配分とは呼びません。** 食用・飼料・搾油・在庫変動・国産原料の輸出追跡はnullを維持します。

相手はウクライナ49、フランス52、イタリア34、ドイツ46区分。上位5は金額順でなく数量順、その他は残る実在行の合計です。相手合計−World総輸出は順に `+1.473 / −0.029 / −0.033 / +0.016 t`。公表表示精度の差を保持し、架空のその他へ配分しません。ドイツのBunkers、Other Asia, nes等は原統計区分を保持し、国へ推測割当しません。

これは全国の総輸出なので、欧州内・EU内の相手も含みます。**4国を足した欧州域外輸出は生成していません。** WITSの輸出入ページでは更新表示日が異なります。元ページの `Page Refreshed` 表示を各保存JSONへ記録し、統合された公式需給表とは区別します。

WASDEは**2024/25販売年度・百万t**、同じWASDE-675原表の国行とWorld行です。

|国・品目|生産|World生産|輸入|国内利用Total|飼料（Totalの内数）|輸出|期首在庫|期末在庫|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|ウクライナ・小麦|23.40|799.10|0.07|8.50|3.60|15.75|1.51|0.73|
|英国・小麦|11.15|799.10|3.81|15.03|6.83|0.50|3.26|2.69|
|ウクライナ・子実トウモロコシ|26.80|1,235.03|0.02|6.50|5.30|20.02|0.54|0.84|

国内利用は独立した原表Totalで、P−Xの推定ではありません。飼料の内数は帯へ再加算せず、輸入・持越在庫・期末在庫を区別します。各国の販売年度の集計Worldであり、共通暦年のFAO Worldとは接合しません。小麦の製品換算範囲をHS1001の相手表と自動一致させず、同販売年度の全相手数量は未収録のままです。

## 既存合意の保持

- 品目選択時の欧州地域参考は三列へ整理しました。既存FAO欧州2023生産（小麦・トウモロコシ・じゃがいも）は生産量とWorld数量も明示。需給と域外数量が不足する品目には不足を表示します。2021年の地域貿易金額は別年の閉じた参考へ残し、大豆の**輸入元**を輸出先の円へ流用しません。
- 品目未選択の概説HTMLはmainと完全一致。`EuropeVerifiedStatistics.astro` の `[data-eu-verified-overview]` から品目分岐直前までのSHA-256は `fd7323ed6e91e8c8c287ed2566e51f0e9f713591a7d37acf45b475bf75c087b7`。供給熱量・金額・世界生産の既存概説を変更していません。
- 新しい全国数量の表示中も、既存FAO生産・順位・2015〜2024年推移を別資料の折り畳み欄へ保持。元のDOMノードとイベントを移動し、概説・別分野へ戻ると元の位置へ復元します。明示的に異なる年を指定したURLには新数量を代入しません。
- 森林の既存4国・8製品バランス、搬出材用途、フィンランド実投入、英国大型製材所市場は保持。国を選んだ場合にパルプの不足、m³とt、原料パルプ・板用材と完成パルプの違いを明記。国未選択の既存森林欄も原文一致で保持します。森林の追加需給・相手数量を取得したとは扱いません。
- 地図データ・地図描画・ニュース・日本専用画面は変更していません。共通renderer/controller/dataも編集していません。

## 出典・生成物

- [公式WITS大豆輸出：ウクライナ](https://wits.worldbank.org/trade/comtrade/en/country/UKR/year/2023/tradeflow/Exports/partner/ALL/product/120100)、[フランス](https://wits.worldbank.org/trade/comtrade/en/country/FRA/year/2023/tradeflow/Exports/partner/ALL/product/120100)、[イタリア](https://wits.worldbank.org/trade/comtrade/en/country/ITA/year/2023/tradeflow/Exports/partner/ALL/product/120100)、[ドイツ](https://wits.worldbank.org/trade/comtrade/en/country/DEU/year/2023/tradeflow/Exports/partner/ALL/product/120100)。対応するImports公開表のWorld量と全行も保存。
- [WASDE-675公式PDF](https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf) p.18 / p.22を通常閲覧し、販売年度・Domestic Totalの注記と照合。保存TXTのSHA-256 `de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285` を固定。
- FAO全国／Worldは既存 `public/assets/atlas/europe/farming-statistics-v1/statistics.json`。QCL原版SHA `c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853`、品目236 `Soya beans`、年・t・国／WorldのA区分を照合。
- 保存先：[`data-source/atlas/europe/quantity-flow-20261016/`](../../data-source/atlas/europe/quantity-flow-20261016/)。WITS保存JSONは**公式公開ページの全表示行の転記**であり、元APIのraw bytesやダウンロードCSVとは主張しません。web取得本文も保存し、全表示行数・数値・数量単位・抜け行をテストしています。
- オフライン再生成：`python scripts/europe/prepare-selected-quantity-flow.py`。生成物は [`src/data/atlas/europe/selected-quantity-flow.json`](../../src/data/atlas/europe/selected-quantity-flow.json)と同内容の欧州専用配信JSON。表示時のみ遅延fetchし、国・品目切替後の古い完了を棄却します。HTTP取得失敗は再試行でき、成功後は各国で再利用します。追加JSONは約26 kB（gzip約4.5 kB）。

## 取得不能箇所と必要作業

正確な対象・失敗・独立した代替公式資料は [取得監査](../../data-source/atlas/europe/quantity-flow-20261016/acquisition-audit.json) と [FAO林業bulk取得記録](../../data-source/atlas/europe/quantity-flow-20261016/fao-forestry-bulk.acquisition.json) に保存。

|操作・対象|今回の結果|代替で確認した範囲／未達|
|---|---|---|
|Eurostat for_pp 2024公開APIへ通常GET|CONNECTトンネル403、提供元HTTP状態不明|独立したEurostat公開記事は2022 EU値。2024全国パルプ量へ転用しない|
|FAO公式Forestry normalized ZIPへ通常GET|CONNECTトンネル403、提供元HTTP状態不明|[FAO公式独立公開表](https://www.fao.org/forestry/statistics/data/en)の2024世界量・整数の国別シェアは読めた。欧州完全需給・全国パルプt・全相手行列は不足。Pulp for paper比率とWood pulp世界tは範囲も同一確認できず掛け算しない|
|FAO公式林産物報告cd8005enのhandleを閲覧|403 Forbidden|同報告の別URL・mirrorで取り直していない|
|EC cerealsのCIRCABC原表リンク|Internal Error、本文未取得|独立した[公式dashboard](https://agridata.ec.europa.eu/Reports/Cereals_Dashboard.pdf)と[EU見通し](https://agriculture.ec.europa.eu/data-and-analysis/markets/outlook/short-term_en)は読めた。EUと欧州、年・予測／歴史値・原料／製品が異なるため需給へ混成しない|
|WITS ROU 2023大豆輸出公開表|webツールからアクセス不能|ルーマニアを0や他国で補完しない|

未達を埋めるために、利用者または統合担当が通常の公式画面で出力できる環境から、以下を提供する必要があります。認証・制限回避やユーザーPC接続は求めません。

1. **FBS/SUA 2023**：[FAOSTAT FBS](https://www.fao.org/faostat/en/#data/FBS)／[公式データ一覧](https://www.fao.org/faostat/en/)のSupply Utilization Accounts（2010–）から出力。対象地域の閉じた構成国一覧と全対象の生産・輸入・輸出・国内供給・期首／期末／在庫変動・食用・飼料・加工・種子・損耗・残差・その他。元商品コード／原料換算・単位・記号・符号規約を含める。地図45対象・FAO欧州・EU27は区別する。
2. **2023 TM/Comtrade全相手数量**：[FAOSTAT Detailed trade matrix](https://www.fao.org/faostat/en/#data/TM)／[UN Comtrade公式画面](https://comtradeplus.un.org/)から、全Reporter、全PartnerおよびWorld、分類版・商品コード・数量単位・金額・品質記号・再輸出の扱いを出力。上位相手だけでは欧州域外分母を確定できない。構成国との域内取引と帰属不明を明示的に分離する。
3. **FO/JFSQ 2024**：[FAOSTAT Forestry](https://www.fao.org/faostat/en/#data/FO)／[Eurostat for_pp](https://ec.europa.eu/eurostat/databrowser/view/for_pp/default/table?lang=en)と[FAO公式定義一覧](https://www.fao.org/forestry/statistics/classifications/en)から、丸太1861、産業用丸太1865、製材1872、パルプの各定義・元コード表と全国／Worldの生産・輸入・輸出を出力。丸太・製材m³、パルプt、樹皮基準と加工段階を区別。追加の在庫・投入・副産物資料には対象工場・樹種・期間・単位・改訂・符号規約が必要。
4. カロリー自給率には国内産の食用熱量の分子・輸入飼料の扱い・加工換算・重複排除の別定義も必要。重量比やP＋I−Xから生成しない。

## 検証と統合

新規地域単体テスト11件は成功。既存欧州統計テストと合わせた23件も成功。オフライン再生成、入力hash、同年・同単位World、全WITS表示行、在庫／用途null、域内相手と統計区分の保持、仕向け列順、数量順の上位、旧図のノード／イベント保持、遅延結果棄却、HTTP失敗・再試行・キャッシュ、概説原文一致を検査しています。

ビルドは成功。環境の既定HOME下へキャッシュを書けないため、`ASTRO_TELEMETRY_DISABLED=1 XDG_CACHE_HOME=/tmp/europe-cache XDG_CONFIG_HOME=/tmp/europe-config npm run build` を使用。package-lockや依存バージョンは変更していません。

全単体の参考実行・欧州静的E2E・release検証の集計は、この文書末尾の追記を参照してください。全単体の既知の失敗は共有テスト `atlas-agro-selected-native.test.mjs` が「概説不変」を欧州部品**全体**の固定hashで判定する点です。選択時分岐の正当な変更でも失敗します。共有テストを直接変更せず、[統合担当向け提案パッチ](agro-shared-overview-test-proposal-20261016.patch)で概説ブロックの固定hashを検査する修正を提示。提案を一時テストコピーへ適用した5件は成功し、`git apply --check` も成功しています。実ブランチの全単体が成功したとは報告しません。

実画面は1896×996、1280×665 CSS px・DPR1.5に設定した[クラウド撮影スクリプト](../../scripts/europe/capture-selected-quantity-flow-review.mjs)を用意しました。しかし安全なChromium起動はSUID sandbox helper構成不備で停止し、**撮影0件・画像目視未達**です。[実行記録](../qa/europe-agro-20261016/browser-report.json)。sandbox無効化・権限変更はしていません。統合担当の通常の安全なクラウドCIで `node scripts/europe/capture-selected-quantity-flow-review.mjs` を実行し、地図文字・三列・横はみ出し・国切替と概説復帰を目視する必要があります。


### 受渡し時の検証集計

- 最終地域単体：23/23成功（新規11、既存欧州12）。
- 最終欧州操作E2E：9/9成功。国切替、数量順の相手表示、HTTP遅延、旧図とquick summaryの別資料への保存、概説復帰、森林の国選択時だけのパルプ不足表示を確認。
- ビルドとlocal release検証成功。
- 全単体の参考実行：1,446件中1,442成功・1失敗・3スキップ。失敗は共有の全ファイル固定hashのみ。最終のHTTP遅延取得改善は上記地域単体／E2Eで再確認。全単体成功とは扱わない。
- 共有テスト提案パッチ：一時コピー5/5成功、`git apply --check`成功。
- 全地域E2E：開始済みの重複実行は追補の受渡し指示で停止。全件成功の主張はしない。
- 実画面：安全なChromium起動で停止。指定2サイズ・DPR1.5の撮影／目視は未達。

ソースhash付きの機械可読結果は[validation.json](../qa/europe-agro-20261016/validation.json)。共通テストは提案のみを統合担当が適用してください。
