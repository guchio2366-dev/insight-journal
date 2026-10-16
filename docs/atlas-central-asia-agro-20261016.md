# 中央アジアの選択品目統計（2026-10-16）

部分完了。主要品目選択時の地域生産・世界シェアと、国別の既存需給・別定義の輸出先参考を接続した。域内使用・域外輸出・同期間の全相手数量が全品目で揃った状態ではない。

開始時に `git fetch origin main`。基準は `3fbb4c95`、専用ブランチは `codex/central-asia-agro-20261016`。開始時の作業ツリーはクリーン。checkout と親に AGENTS.md はなかった。`docs/atlas-agro-statistics-implementation-20261014.md`、selected-quantity-flow、quantity-flow-audit、source-audit、米国 `CropStatistics` / 共通renderer、現行中央アジアfocus・原値・関連テストを照合した。

## 実装範囲

- 中央アジア5か国は KAZ / KGZ / TJK / TKM / UZB に固定。南アジア・アフガニスタンは含めない。主要品目は既存の小麦・綿花・とうもろこし・牛・羊・山羊と森林に限定。
- 国未選択・品目選択時だけ、①地域生産・世界比、②域内使用と域外輸出、③域外相手数量を地図下に配置する。5か国の生産原値が同年・品目・要素・単位・原表版で揃う場合だけ合計する。世界比には同じWorld分母が必要。未繰綿の生産合計は計算できるがWorldが保存されておらず、世界比は未収録とする。用途・域外貿易が欠ける②③に数量帯や円を作らない。
- 国選択時は既存の共通三列を使う。カザフスタン小麦に、同じWASDE-675の国内利用9.00百万tの内数Feed3.90百万tを追加した。食用・加工用途に読み替えず、親合計へ加算しない。供給と仕向けの丸め差0.01百万tも保持。
- USDA KZ2025-0002のAppendix 1、2024列46相手を別定義参考として閉じた欄へ追加。小麦・小麦粉の合算で粉の原穀換算基準は未確認。2024/25 WASDEに接合せず、2024 FAO未製粉小麦生産へ差し引かない。通関相手を最終消費地としない。国産分・再輸出を分離できない。
- この参考表の公表総輸出は7,116,464t、相手行計は7,116,465t。中央アジア内4相手計4,608,827t、収録域外相手計2,507,638t。+1tを保持し、架空の「その他」を作らない。域外の偏りは収録域外相手計を分母にする。カザフスタンの例を地域全体の輸出とは呼ばない。
- 丸太（燃料材を含む）・製材をm³、パルプをtの別製品として明記。パルプ数量は未収録。飼養頭数・密度から羊肉・山羊肉を推計しない。
- 旧地域参考は選択時だけ既存の `syncAgroRegionalReferences` で折り畳み、未選択・分野切替で元ノードと配置を復元。品目未選択時の合意内容は変更しない。

|2024年の系列|5か国合計|範囲|
|---|---:|---|
|小麦|28,181,615.46 t|QCL15、WASDE販売年度と別|
|未繰綿|4,139,508.61 t|QCL328、World未収録。綿繊維・綿糸と別|
|とうもろこし|3,023,992.94 t|子実|
|牛肉|2,239,180.37 t|生体数・乳と別|
|牛生乳|21,653,116.60 t|肉と別|
|丸太|4,250,285 m³|FO1861、燃料材を含む|
|製材|445,303 m³|FO1872、丸太から控除しない|
|羊肉・山羊肉|未収録|欠測を0にしない|

抽出は `python3 scripts/prepare-central-asia-agro.py`。共有データは読取のみで、地域専用JSONへ原値文字列・旗・World・元ファイルSHAを保存する。異なる単位・原表版・Worldが混ざると停止する。

## 配置と共通部分の境界

共有renderer・共有controller・地図データ・CSSは変更していない。中央アジアの4入口（地域root / nature / agriculture / population）の専用ルートだけで既存 `AsiaAtlasPage` を包み、専用adapterを追加する。自然環境から農林業へクライアント内で移った場合も接続するための入口であり、自然環境・人口の本文や地図を複製していない。中央アジアindustry、overview、他地域、日本専用は従来の経路のまま。

ビルドには静的専用経路が汎用動的経路より優先される警告が4件出る。最終出力は専用経路を各1回生成する。これを統合側で1か所の遅延importへまとめる場合の任意提案は `docs/review/central-asia-agro-2026-10-16/common-hook-proposal.patch`。この提案を共通コードへ適用してはいない。専用経路を維持するなら提案パッチは不要。

## 新規資料の確認・取得できなかった箇所

正規の公開入口・公開表のみを使用。認証発行、アクセス権変更、proxy、制限回避はしていない。以下のトンネル403は原サイトのHTTP拒否と区別する。同じ拒否URLを別経路で再取得していない。

|対象・操作|結果|採用範囲|
|---|---|---|
|[USDA KZ2025-0002公開PDF](https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain+and+Feed+Update_Astana(Nur-Sultan)_Kazakhstan+-+Republic+of_KZ2025-0002.pdf)をweb読取|13頁の本文・表を取得。Appendix 1（PDF11–12頁）の2024列を転記。元の公表元欄はTrade Data Monitor, LLC|46相手の数量を別定義参考に採用。PDFバイナリ・バイナリSHAは未取得。SHAを捏造しない|
|同USDA報告をPythonでPDF保存|接続トンネル `403 Forbidden`。上のweb本文確認後の別の通常保存操作で判明|バイナリ保存を断念。既読web本文の表のみ転記し、バイナリ取得を経路変更してやり直していない|
|[WITS KAZ2023 HS100190の全輸出先](https://wits.worldbank.org/trade/comtrade/en/country/KAZ/year/2023/tradeflow/Exports/partner/ALL/product/100190)をPythonで読取|`Tunnel connection failed: 403 Forbidden`|数値採用なし。拒否後の別tool/host再試行なし|
|FAO FBS公開API `https://fenixservices.fao.org/faostat/api/v1/en/data/FBS?area_code=108&item_code=2511&year=2023`|同トンネル403|需給数値採用なし|
|[FAOSTAT FBS正規画面](https://www.fao.org/faostat/en/#data/FBS)|web読取で本文0行、出力表なし|対話画面からのCSV exportは未実行|
|[FAO森林統計入口](https://www.fao.org/forestry/statistics/80938/en/)|Python通常読取で同トンネル403|新しいFO原表の採用なし|
|[UNdataの独立したFAO丸太公開表](https://data.un.org/Data.aspx?d=FAO&f=itemCode%3A1861)|web読取成功。画面の最終年は2022年、全274国・地域、Production / Import Quantity / Export Quantity等|2024年保存値の代用や2024年Worldとの混合はしない|
|[UNdataの小麦・製品/カザフスタン/2023の公開照会](https://data.un.org/Data.aspx?d=FAO&f=itemCode%3A2511%3BcountryCode%3A108%3Byear%3A2023)|web reader Internal Error、表未取得|FBSの代替需給値として採用しない|
|[UNECEの森林資料入口](https://unece.org/forestry-timber/publications/state-forests-caucasus-and-central-asia)、[市場年報入口](https://unece.org/forests/publications/forest-products-annual-market-review-2024-2025)|web reader Internal Error、数表未取得|数値採用なし|

追加のユーザー作業が可能な場合は、通常接続できる正規画面から次をCSV/ZIPとしてexportし、統合担当へ渡す必要がある。今このチャットで認証やPC接続を求めていない。

1. 中央アジア5か国の同じ年・同版FBS/SUA：生産、輸入、輸出、国内供給、符号付き在庫変動、食用・飼料・加工・種子・損失・その他・残差、品目/換算コード、単位、旗。まず共通収録可能な2023年。Worldも同版を出力し、2024年生産と混ぜない。
2. 同年・同分類の全Reporter×全Partner（World行含む）の輸出入数量と単位、再輸出区分・数量旗。小麦/メスリン、未繰綿/綿繊維を別商品にし、原料換算規約を提供。上位相手だけの表では域外分母を確定できない。
3. 同版FOの5か国とWorld：丸太1861・製材1872・パルプ各製品の生産/輸入/輸出、体積/重量、樹皮基準、全相手数量、在庫・工程投入の公表行。密度からm³↔t換算しない。
4. 羊肉・山羊肉のQCL同版2024年・5か国とWorld（原品目コード・5510・t・旗）を追加する場合は、共有manifest/loaderへの系列登録を統合担当が行う必要がある。地域専用値を共有ファイルへ独断で追記しない。

## 検証

詳細結果は `docs/review/central-asia-agro-2026-10-16/validation.json`。新規単体テストは原値一致・欠測・版/単位/Worldの故障注入・地域内除外・丸め差・旧概説復元・遅い国変更を確認。新規built成果物テストは4経路の専用script重複なし・5か国/既存品目限定・他地域/日本/中央産業の非接続を確認する。

- 全単体：1,438成功、3スキップ、失敗0。その後の未繰綿の欠測注記修正には、最終関連単体66件（新規5件を含む）を再実行し全成功。
- 最終ビルド成功。最終の中央アジア・共通アジア・南中央focus/overview・静的releaseのE2Eは19成功、4スキップ、失敗0。4スキップはopt-inブラウザ検証で、実画面の確認には数えない。`verify:release` も成功。
- 任意の全地域E2Eは完走していない。最初の試行はdist再作成と重なったENOENTにより検証として無効。次の広い試行は192成功・失敗0・61キャンセル・3スキップで停止し、その後、最終ビルドと上記の対象範囲を順番に再検証した。全地域E2E完了とは報告しない。
- 共通hook提案は `git apply --check` 成功、未適用。既存ファイルへの編集は0件。

クラウドの `/usr/bin/chromium` は `chromiumSandbox:true` で起動失敗。`The SUID sandbox helper binary was found, but is not configured correctly`。sandbox無効化・OS権限変更はしない。1896×996 CSS px / 1280×665 CSS px、DPR1.5の実画面は0件で、目視・レイアウト・地図描画の最終確認は未達。ユーザーPCは不要。正常なsandbox付きクラウド環境で `node scripts/verify-central-asia-agro.mjs` を実行すると、地図/三列・ニュース幅除外・はみ出し・林業切替・国選択/戻る/再読込を検査して画像とreportを保存する。

PR作成・マージ・公開は行っていない。

## commit・push承認後の追加調査

親担当から今回の地域専用差分のcommit・pushを明示承認されたため、実装を `ee207ff991b32c508a93f6e5f5755faeac4aff5d` にcommitし、`origin/codex/central-asia-agro-20261016` へpushした。`git ls-remote --heads` でこの実装SHAとの一致を確認した。共通hook提案は引き続き未適用で、PR・マージ・公開と実画面確認は統合担当へ引き継ぐ。

追加で取得できた公式公開表の監査記録を `data-source/atlas/central-asia/agriculture/official-source-followup-20261016.json` に保存した。比較可能な中央アジア需給・全相手数量の追加は0件。入手できた資料を以下の理由で不適切に主統計へ接合していない。

|公式別配布先・確認結果|補完できた内容／残る具体的な不足|
|---|---|
|[FAO Forest product data](https://www.fao.org/forestry/statistics/data/en)：公開表を取得|2024年Worldの丸め値（丸太3,905百万m³、製材445百万m³、木材パルプ189百万t、非木材繊維パルプ10百万tなど）を監査JSONへ保存。中央アジア5か国の生産/輸入/輸出、全相手数量、在庫、製品コード・旗は掲載されず、同版の精密World原行は取得できていない。木材/非木材パルプを合算せず、既存分母も置き換えない。|
|[FAO Analytical Brief 121・2010–2024](https://doi.org/10.4060/cd8035en)：公開メタデータからPDF本文まで取得|脚注1は油糧作物集計で未繰綿を綿実換算し、図17もCotton seed表記。この集計をQCL328未繰綿の精密Worldへ転用できない。必要行はWorld/2024/QCL328/5510/t/Value/Flag/同版識別子。羊975・山羊1017についても、5か国＋Worldの同版2024年・5510・t・旗が必要。旧Brief96は2023年で代用不可。|
|[カザフスタン農産物資源・用途バランス配布一覧](https://stat.gov.kz/ru/industries/businessstatistics/stat-forrest-village-hunt-fish/spreadsheets/)と[2025年XLSX配布リンク](https://stat.gov.kz/api/iblock/element/335599/file/ru/)を特定|2026-08-28公表の2025年版へリンク解決することを確認した。公開readerはセルを解析できずZIPバイナリ文字列を返し、Python通常保存は `Tunnel connection failed: 403 Forbidden` で停止。別経路での再保存はしない。2024年版を公開画面から選ぶ通常ブラウザ操作も行ったが、対象の選択肢へ到達できず正確な2024年URLは未確定。2025年版に歴年2024列があるかも未検証。提供が必要なのは品目コード・年・単位・期首在庫・生産・輸入・輸出・食用/飼料/加工/種子/損失/その他/調整・期末在庫・改訂記号の列。|
|[UNECE forest production/trade配布ページ](https://unece.org/forests/data-forest-products-production-and-trade)|別の公式配布入口も調査したが `bot_blocked`。stealth/proxy/認証や別tool再試行を行わず停止。必要なのは5か国の2024年実績（予測と区別）、丸太/製材/パルプの製品コード・生産/輸入/輸出・単位・相手・旗・在庫・樹皮基準。|

公開ブラウザの2024年配布先照会runは `daf2586f-2e76-49ae-a2d4-ec7f8ccd9f72`。2025年の既知拒否ファイルを再取得しない条件で、通常の公開フィルタだけを操作した。安全設定は変更していない。repo内の既存CSVも再確認したが、2024年QCL328/975/1017の該当World/5か国行はなかった。
