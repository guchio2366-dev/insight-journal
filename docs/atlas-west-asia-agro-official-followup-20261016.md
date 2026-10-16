# 西アジア・中東：push確認と独立公式資料の追補（2026-10-16）

初回実装 `823e8e4f9157e2921d7fa8532bfb5d63e0685f5f` を専用ブランチ `codex/west-asia-agro-residuals-20261016` へpushし、`git ls-remote` のリモートSHA一致を確認した。PR・マージ・公開は統合担当の範囲。追加調査で**トルコ3品目の年度需給参考と、小麦粉の全国輸出先参考**を補完した。完全な地域フロー・同版World・パルプ統計の完成とはしない。

## 補完した値と採用範囲

[USDA FASトルコ年次報告 TU2025-0015](https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain+and+Feed+Annual_Ankara_Turkiye_TU2025-0015.pdf)（2025-05-02公表）の公開PDF本文を閲覧し、PDF p.18–19の**2023/24・USDA Official列だけ**を転記した。New Postの別推計・翌年度・将来の0欄を採用せず、MYとTYの輸出入を交換しない。原PDFを通常GETで保存する操作は接続トンネル403で停止し、原本ファイル・公式原本SHAは未保持。web読取に成功した既存内容だけを使い、拒否後に同PDFを再取得していない。

|品目（全国）|MY開始|期首在庫|生産|MY輸入|公表国内利用|MY輸出|期末在庫|原単位|
|---|---|---:|---:|---:|---:|---:|---:|---|
|小麦（PSD基準）|2023-06|6,484|21,000|9,369|19,500|9,950|7,403|1000 MT|
|大麦（PSD基準）|2023-06|922|8,000|142|7,300|77|1,687|1000 MT|
|米（精米換算）|2023-09|416|545|351|815（利用・残差）|295|202|1000 MT|

各行の供給と仕向けの公表合計に照合。国内利用をP−Xから算出しない。小麦・大麦の飼料／残差とFSI、米の利用／残差を維持し、食用摂取へ読み替えない。籾米の813千MTは別の原行で、精米の帯へ入れない。輸入・持越在庫込みの輸出／生産数量比は参考内で表示し、国産分の輸出割合とは呼ばない。主表示のFAO2024暦年とは接合せず、国選択時の閉じた別年度参考へ追加した。国・品目未選択の表示は変更しない。

同報告PDF p.20・表5のMY2023/24列は、小麦粉の製品重量で全国輸出4,007,584t、公表8相手＋Other。イラク1,230,075t／30.69%などを別表で示す。相手見出しDestinationに従い、イラク・シリアを全国輸出から除外しない。Other 1,692,089tの域内外内訳はないので、地域の域外輸出に集計しない。PSD小麦の9,950千tへ換算・差し引き・合算しない。

この参考の生産／World対応と、同じ製品の全相手行列は未収録。主表示の三列を同一定義で全て埋めた件数は追補でも増えていない。公開表の転記JSONと取得・不足記録は次の2ファイル。

- `src/data/atlas/west-asia-turkiye-gain-2023-24.json`
- `data-source/atlas/west-asia/agro-residuals-20261016/official-followup-sources.json`

## 試した別の公式経路と不足列

|資料・入口|正規URLと試行結果|引き続き必要な列・操作|
|---|---|---|
|USDA FASトルコ年次報告|上記公開PDFをweb読取。直接保存GETはトンネル403、再試行なし|同版World、全相手行列、原穀・加工品換算。公式配布からPDF原本を通常保存できる環境で提供すると原本SHAも記録できる|
|FAO需給定義ハンドブック|[概念・定義の公開HTML](https://www.fao.org/4/x9892e/x9892e02.htm)は読取成功|在庫変動の増加＋・減少−、加工品貿易の親品目換算と単位・期間の明示を確認。数量原行は載らないため、2023 FBS/SUAと全相手TMの不足は解消しない|
|UNECE林産物市場レビュー|[公式入口](https://unece.org/forests/forest-products-annual-market-review)はweb読取403（応答層未確認）、再試行なし|パルプの全国生産・輸出入t、同年World、在庫、加工段階・樹皮基準、全相手数量。通常閲覧できる環境で対象年・国の表と定義を出力する必要がある|
|UNECE国別市場声明の候補入口|[候補URL](https://unece.org/forests/market-statements)はtool inaccessible、本文・HTTP状態なし|国別資料・ファイル名自体を取得できていない。特定のPDFを入手済みとは扱わない|
|GASTAT公式入口|[公式トップ](https://www.stats.gov.sa/en)は内部取得エラー。候補カテゴリ `/en/statistics-tabs/-/categories/124135` もtool inaccessible、資料の存在・名称未確認|農業統計／食料需給の正式な資料を通常の公式入口で特定し、品目別の生産・輸入・輸出・在庫・用途・期間・単位・相手を出力。推定した資料名・数値は採用しない|
|トルコ統計局データポータル|[公式入口](https://data.tuik.gov.tr/)から `https://veriportali.tuik.gov.tr/` へ移動。9行のアプリ外枠のみ、数表・ダウンロードURLは得られず|作物需給表の同年度全要素、商品分類・単位、完全な相手行列。通常の公式UIでCSV/XLSXを書き出す必要がある|
|FAOSTAT分類定義入口|[公式入口](https://www.fao.org/faostat/en/#definitions)はアプリ外枠のみ、解析本文0行|QCL577/260と貿易の生鮮・乾燥・原料・保存品の対応、換算率。同定できるまでサウジの輸出量を果実生産から引かない|

別の独立配布系である [UNECE統計DBの林業ディレクトリ](https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__26-TMSTAT1/) は閲覧できた。Tradeの[輸入表](https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__26-TMSTAT1__070-TM21_TR/010_en_TM21_15_r.px/)は林産品総額・千USD、1964–2019年で、パルプtの表ではない。輸出表も林産品総額。Consumptionの工業用丸太は樹皮を除く千m³、製材は実材積m³で、定義はP＋I−X。これらを2024年のパルプ量・実加工投入量・全域合計へ転用していない。表名・最終年・単位・不足列と正確な表URLは機械可読の取得記録へ追加した。FAOの候補 `/forestry/statistics/resources/en/` は404で、資料の存在・数量を推定していない。

FAOの正しい [Resources索引](https://www.fao.org/forestry/statistics/publications/en) へ公式ホームのリンクから到達し、資料名・日付・公式handleを確認した。`Pulp and paper capacities, survey 2023–2025`（2024-09-30、[cd2190t](https://openknowledge.fao.org/handle/20.500.14283/cd2190t)）と `Global forest products facts and figures 2024`（2025-12-24、[cd8005en](https://openknowledge.fao.org/handle/20.500.14283/cd8005en)）は各1回の通常リンク読取が403。再試行なし。前者は能力・実生産・将来予測の列を区別し、後者も丸めた世界量を全国量へ付け替えない。必要なのはパルプの実生産／同年World／輸出入・在庫・全相手のt列と製品定義であり、能力の数値からは補完しない。

FAOSTAT API・FO ZIP・JFSQ定義handleなど初回に拒否された資料を、別ホスト・proxy・認証変更・別toolで取り直していない。今回のUSDA報告・FAO概念HTML・各国／UNECE入口は別の公式資料。未取得の値・欠測国・将来0欄を推定で埋めていない。

## 検証・統合への引継ぎ

地域単体・コントローラー・ビルド・releaseを追補後に確認し、結果を `data-source/atlas/west-asia/agro-residuals-20261016/followup-validation.json` へ保存する。初回 `validation.json` は823e8e4f時点の履歴と明記した。

画面確認は統合担当へ引継ぎ。既存の安全な実行入口をトルコ大麦・米も含む15状態×2幅（1896×996／1280×665 CSS px、DPR1.5）へ拡張した。Chromium sandbox不備の回避操作はせず、この環境で新しい画面画像は作成していない。パルプ／完全地域需給の原表・実画面は引き続き未達。

統合時は初回コミットと追補コミットを順に採用するか、専用ブランチの先頭を取り込む。初回を既に採用済みなら追補だけをcherry-pickする。共通部品への変更は不要で、PR・マージ・公開は統合担当が行う。

追補後の検証：地域単体53件成功、地域E2E50件成功・実ブラウザの既存3件スキップ、失敗0件。ビルド・release・画面確認スクリプトの構文検証も成功。数値の転記原本未保持・完全フロー・パルプ・実画面の未達は残る。
