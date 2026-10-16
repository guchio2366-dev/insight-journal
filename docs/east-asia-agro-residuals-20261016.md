# 東アジアの農林業残件：地域専用実装・引継ぎ（2026-10-16）

**部分完了。新たに韓国丸大豆1国品目を既存の地図下三列へ接続した。輸出相手数量18表（全447相手行、うち数量完備16表）の地域専用参考表示も追加した。追補ではWASDE4系列の需給参考を追加（[追補結果・不足表](east-asia/agro-20261016/source-followup.md)）。実消費・用途・在庫を追跡した完全フロー、地域全体の域外数量、パルプ原行、指定サイズでの画像目視は未達。追指示に基づき地域ブランチをpushし、初回remote SHA `4050654072e90a0ab6f2a46ddf67191035ea26c3` の一致を確認した。PR・マージ・公開は行っていない。**

ブランチ：`codex/east-asia-agro-statistics-20261016`。`git fetch origin main` 後の基準 `3fbb4c957c21685bddbf8148a95a2a03ba210553` から開始。開始時worktreeはclean、AGENTS.mdはcheckoutと親ディレクトリに存在しなかった。`atlas-agro-statistics-implementation-20261014.md`、選択品目の数量フロー仕様・取得監査、東アジア既存資料・データ・表示、米国の `CropStatistics.astro` / `CropSupplyUse.astro` を確認した。

## 接続した結果

|対象|実装した表示|残る境界|
|---|---|---|
|韓国・2023丸大豆|①FAO生産141,477t／同版World370,876,094.01t。②WITS輸入1,297,860t、輸出49.252t、生産比約0.03%、在庫未調整見かけ量1,439,287.748t。③全13相手。数量では中国40t（約81.21%）が最多|提供元混合の比較。見かけ量P+I−Xを実消費・国産分の国内仕向けとは呼ばない。再輸出・食用・飼料・搾油・在庫は追跡不能|
|中国・既存2023丸大豆|既存レコードを維持|JSONオブジェクトの一致を検証。変更・再生成による値の置換なし|
|中国・韓国・モンゴル・OASの既存貿易表|2023 H0小麦・メスリン／トウモロコシ／米／丸大豆／製材／未処理針葉樹原木。選択品目の地域参考欄に数量上位5＋残る実在相手の合計、全相手表とWorldとの差を表示|18表のうち韓国トウモロコシ・針葉樹原木のWorldと各1相手は欠測。円・比率を作らず、判明した行のみ保持|
|森林|既存FAO丸太・製材のP/I/X・見かけ量を維持。WITS製材はm³、針葉樹原木は狭い製品参考として表示|FAO製材とWITS4407は同じ輸出分母ではない。パルプtを丸太／製材m³へ合算・換算せず、能力を実生産に置換しない|

韓国大豆のFAO国行は `Republic of Korea` / area117 / QCL236 / 5510 / 2023 / t / flag A。同年Worldと保存QCL archive SHAが一致する。WITS公式公開表の品名 `Soya beans`、H0 120100、gross、Kg単位、輸出49,252kg、輸入1,297,860,000kgを再確認した。[輸出原表](https://wits.worldbank.org/trade/comtrade/en/country/KOR/year/2023/tradeflow/Exports/partner/ALL/product/120100)・[輸入原表](https://wits.worldbank.org/trade/comtrade/en/country/KOR/year/2023/tradeflow/Imports/partner/ALL/product/120100)。全13相手合計49.251tとWorldの差−0.001tは別掲し、架空のその他で補わない。

全相手数量は金額でなく数量で並べ替える。中国トウモロコシは金額最多のベトナムより、数量最多の北朝鮮6,750.02tを先に表示する。相手行の東アジア内／外／不明を区別し、域外小計には中国本土・日本・韓国・北朝鮮・モンゴル・Other Asia, nes・香港・マカオを加えない。国の対世界輸出ではこれらの外国相手も保持する。地域の域外輸出総額・総量とは呼ばない。OASは原表の `Other Asia, nes` を表示し、FAO台湾生産への新しい対応づけは行わない。

品目未選択時の出力は従来のまま。数量参考は明示的な選択時だけ追加し、概説復帰・日本選択では除去する。日本専用ページ、共通部品、地図データ・描画・枠・ニュースには変更なし。新たな品目を地図へ追加していない。

## 共通部品への提案（未適用）

[`east-asia/agro-20261016/common-integration.patch`](east-asia/agro-20261016/common-integration.patch) は地域専用docsへ保存した未適用提案。共通 `renderAgroExistingStatistics` に9行を追加し、選択時だけ地域専用数量adapterを、三列の②③にある閉じた別資料参考へ呼び出す。②へWASDE4系列、③へ2023年輸出相手数量を参照する。`git apply --check` 通過。**このブランチの共通コードには適用していない。**

韓国丸大豆の主三列は既存の `agroEastQuantityFlow` インターフェースを使い、共通変更なしで接続済み。他品目の2023輸出相手数量は地域専用の既存参考欄に接続済みだが、共通③への接続は上記パッチの統合後となる。同年・同製品の不足注記は消さず、2024年FAO／2024/25 WASDEの輸出内訳へ接合しない。提案パッチは共通ファイルを変更せずメモリ上で適用したコードをesbuildでbundleし、選択時のみ数量が追加され、既存金額カードが残ることをDOMで検証した。

再生成：`python scripts/east-asia/prepare-selected-quantities.py`。保存原表の年・分類・単位・相手重複・負値・国とWorldの版を検証し、韓国レコードと輸出数量JSONを作る。2回実行でバイト一致。新規の原統計ダウンロード成功は0件で、出典URLとSHAは生成物へ保持する。

## 取得できなかった箇所と必要な入力

取得記録：[`../data-source/atlas/east-asia/agro-20261016/acquisition-results.json`](../data-source/atlas/east-asia/agro-20261016/acquisition-results.json)。通常の公式入口と別の公式公開表を調べた。認証発行、proxy、権限変更、拒否資料のミラー取得はしていない。

- FAO bulk公開カタログ `https://bulks-faostat.fao.org/production/datasets_E.json` のurllib取得は `Tunnel connection failed: 403 Forbidden`。接続トンネルの失敗で、原サイトのHTTP403とは断定しない。FAOSTAT FBSの公開画面はreaderに数値原行を返さなかった。代替[UNdata小麦・製品需給表](https://data.un.org/Data.aspx?d=FAO&f=itemCode%3A2511)は読めるが2021年までで、2023年への補完には不採用。
- FAOの公式分類ページからJFSQ定義 `https://openknowledge.fao.org/handle/20.500.14283/cb4108en` を開いたところweb readerが403を返した。独立した[FAO森林公開表](https://www.fao.org/forestry/statistics/data/en)は読めたが、2024世界集計と丸めた主要国シェアのみでは各国P/I/Xを復元できない。[パルプ能力調査の独立定義](https://www.fao.org/media/docs/statisticslibraries/questionnaires/pulp-and-paper-capacities/pulp-and-paper-capacities-survey-definitions.pdf?sfvrsn=ca5dd57c_1)は読めた。能力は実生産でなく、パルプ・溶解パルプ・非木材パルプの範囲を混同しない。UNdataの中国本土・品目1875／1856の独立公開表も調べたが、readerがURL取得不能を返し、原行や品目対応は得られなかった。
- **利用者側で通常の公式exportが可能なら**、2023暦年について中国本土41・韓国117・北朝鮮116・モンゴル141・台湾214のFBS/SUA全要素CSVを提供してほしい（日本専用は対象外。地域地理境界の算出に日本等の域内相手判定を使うこととは別）。品目コードと加工品／原料換算、Production・Import・Export・Domestic supply・符号定義付きStock variation・Food・Feed・Processing・Seed・Losses・Other uses・Residuals・Tourist consumption、単位・旗・注記・版を含める。重量の生産から輸出だけを引いた値を消費へ代用できない。
- 林業は同じFO公開版・同年の丸太1861／製材1872／対象パルプ製品の国別P/I/XとWorld原行、製品定義・単位・旗・注記が必要。パルプの集計コード・溶解用包含・含水基準を公式メタデータと共に指定する。丸太のm³からパルプtの歩留まりを作らない。
- 数量相手表は同年・同分類版のWorld＋全Partner（HS6内訳、数量単位・NetWeight・gross/re-export区分）を提供してほしい。韓国欠測2表、北朝鮮全表、モンゴル穀物／大豆／原木など不足を0で埋めない。地域全体の域外貿易には閉じた報告国集合と全相手が必要。国の総輸出を足しただけでは域内取引が混ざる。
- 綿花・茶・畜産の残件も未完了。種を含む綿花／綿繊維、生葉／製茶、生体数／肉・生乳・卵をそれぞれ区別した同年の需給・相手数量が必要。羊・山羊の分布から肉・乳・繊維用途を逆算せず、家畜頭数を輸出重量へ置き換えない。今回この範囲の新しい数量原表は得ていない。
- 食用の国産由来カロリー分子は別途未収録。今回は品目未選択時の新仕様を作らず、重量比をカロリー自給率へ転用しない。

## 検証

- `npm test`：1,441成功、3スキップ、失敗0。新規8テストは原行／SHA・韓国三列・全18数量表・欠測・数量順位・域内除外・OAS境界・林産物単位・概説復帰を検査する。
- 対象を絞った4ファイル：31成功。既存中国レコード一致、生成物の2回実行バイト一致、`git diff --check` 成功。
- 選択時の数量／金額ラベルを確定後、東アジア全単体＋数量フローを再検証：47成功、失敗0。
- `ASTRO_TELEMETRY_DISABLED=1 npm run build` 成功。最初の通常buildはAstro telemetryが書込禁止のホームconfig作成を試み停止したため、telemetryを環境変数で無効化して再実行した。ソースの設定変更なし。
- `npm run test:e2e`：647成功、11スキップ、失敗0（初回buildの静的成果物・DOM操作検証）。選択時ラベルの最終版は追加の地域47件と再buildで検証。`npm run verify:release` も成功。これらを実ブラウザの画像目視の代用とは扱わない。
- [`qa/east-asia-agro-20261016/report.json`](qa/east-asia-agro-20261016/report.json)：1896×996、1280×665 CSS px、DPR1.5、`chromiumSandbox:true`。ローカルworking treeのbuild identityは`local`として記録。ChromiumのSUID sandbox設定不備で起動停止、撮影0件。安全なuser namespace sandboxの可否も確認したが `No usable sandbox` で停止。`--no-sandbox`やシステム権限変更は行っていない。画像目視・実レイアウトの可読性を完了とは呼ばない。

クラウド側にsandboxが正常なChromeを用意した後、`REVIEW_CHROME_PATH=/path/to/chrome node scripts/east-asia/capture-selected-quantities.mjs` を実行する。指定2サイズ×11選択状態、日付／単位／全相手表、WASDE参考の開閉、概説復帰、日本除外、米国大豆基準を記録する。ユーザーPCへの接続は不要。共通提案パッチを統合した場合も、統合後に同じ検査と②③の別資料参考の開閉を確認する。
