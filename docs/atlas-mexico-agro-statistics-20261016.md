# メキシコ農林業・合意済み三列統計の追加（2026-10-16）

**部分実装。** 綿花・精米・小麦・ソルガムの公表需給を追加し、確認できた4つの暦年HS輸出先表を閉じた別資料として表示した。全主要品目の同期間・同製品の生産／国内利用・輸出／輸出先を揃える主目的には未達。林業の全国同年需給と、小麦・ソルガムの同版世界分母、全品目の同定義・同年度全相手数量は不足したまま。

基点は `git fetch origin main` で確認した `3fbb4c957c21685bddbf8148a95a2a03ba210553`。クリーンな作業ツリーから地域専用ブランチ `region/mexico-agro-statistics-20261016` を作成した。既存指示書 `docs/atlas-agro-statistics-implementation-20261014.md`、メキシコの保管資料・画面・テスト、米国 `CropStatistics` / `CropSupplyUse` と共有rendererを照合した。checkout・親・ルートにAGENTS.mdはなかった。

## 追加した数量と表示

| 品目 | 期間・単位 | 期首在庫 | 生産 | 輸入 | 国内利用 | 輸出 | 期末在庫 | 同じ表の世界生産 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 綿花（繰綿） | WASDE-675・2024/25販売年度・百万480ポンド俵 | 0.24 | 1.00 | 0.60 | 1.35 | 0.18 | 0.31 | 119.53 |
| 米（精米換算・既存補足資料） | WASDE-675・2024/25販売年度・百万t | 0.12 | 0.17 | 0.89 | 1.00 | 0.03 | 0.15 | 542.30 |
| 小麦 | GAIN MX2026-0018・2024/25・千t | 775 | 2,648 | 5,607 | 8,100 | 135 | 795 | 未収録 |
| ソルガム（子実） | GAIN MX2026-0018・2024/25・千t | 269 | 4,200 | 562 | 4,800 | 1 | 230 | 未収録 |

綿花・米は同じWASDE表の国別行とWorld行を照合。小麦・ソルガムは2026-03-13公表GAINの2024/25 **USDA Official** 列だけを採用した。隣接New Post列は小麦国内利用8,000、ソルガム生産4,150と異なるため、両列を混ぜないテストを入れた。小麦年度は2024-07-01〜2025-06-30、ソルガムは2024-10-01〜2025-09-30。WASDEとの版違いの世界量をGAINの分母へ接合していない。

国内利用は公表Total / Total Consumption。輸入と期首在庫を含む全国供給の仕向けで、当年の国産収穫物だけを追跡した分割ではない。小麦の飼料・残差300＋FSI7,800、ソルガムの4,700＋100は国内利用の内数。既存とうもろこしもFeed27.5百万tを内数として表示し、供給元の帯を追加した。生産−輸出から消費を作っていない。再輸出・輸入原料を国産輸出から分離できない限界を表示する。

地図下は①生産・世界シェア、②国内利用と輸出、③輸出先の量と構成比の既存順序。共有の需給・生産rendererと帯を再利用した。GAINの世界分母がない場合は円・推移・順位を作らない。繰綿の俵とDGSIAPの種付き綿t、精米と籾米、子実ソルガムと青刈りを換算・合算しない。米は補足資料のままで、主図の品目に追加していない。

## 確認できた輸出先参考

全てメキシコ報告、2024暦年、HS1988/92（H0）、総輸出。販売年度需給やFAOSTAT製品分類と自動一致しないため、③の中の閉じた「別資料」に保持した。③の同年度・同定義相手未収録の状態も維持する。

| 公開表 | World公表輸出 | 掲載相手数 | 掲載相手合計との差 | 最大の掲載相手と数量・相手合計比 |
|---|---:|---:|---:|---|
| [HS100590・とうもろこし（種子を除く）](https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/100590) | 12,224 t | 3 | +0.043 t | キューバ 7,972.5 t・65.22% |
| [HS520100・綿（カード・コーム前）](https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/520100) | 9,995.06 t | 4 | +0.002 t | パキスタン 4,127.17 t・41.29% |
| [HS090111・コーヒー生豆（カフェイン除去を除く）](https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/090111) | 75,024.4 t | 15 | −0.030 t | 米国 48,135.1 t・64.16% |
| [HS440710・針葉樹製材（厚さ6mm超）](https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/440710) | 57,368 m³ | 1 | 0 m³ | 米国 57,368 m³・100.00% |

割合の分母は公開表に掲載された全相手の数量合計。World公表量を別に残し、相手合計との差を明示する。上位5＋「その他」は掲載相手の実数合計から作り、残差を架空の国へ入れない。差が表示丸めに由来することや、掲載外相手の完全不存在は証明していない。数量が欠けた表や取得できない表から円を作らない。

対象地域はメキシコという1か国。国内取引は含めず、米国・カナダも国外相手として含める。この値を北米全体の域外集計として再利用する際は北米域内相手の除外が別途必要。仕向け国は最終消費地とは限らず、総輸出の再輸出内訳は未収録。相手国での用途を推定していない。

林業は既存INEGI松材取得・販売の図を保持。丸太m³、製材m³、木材パルプtの対象・加工段階・欠測を別々に説明し、不足原表リンクをSCLからFO／UN Comtradeへ訂正した。HS440710は全針葉樹の製材で、松限定の生産・「製材向け」取得材・丸太・木材パルプの代理にはしない。厚さ6mm超という範囲も[WTOのHS92/96/02/07/12の分類案内](https://ttd.wto.org/en/download/six-digit)と照合した。

## 出典保存・再生成・取得障害

`data-source/atlas/mexico/agro-statistics-20261016/` に公式公開表の数量転記CSV・観測記録TXT、GAINの行番号付き表抜粋、README、全取得記録 `acquisition.json` を保存した。WITSの原HTMLやGAINの原PDFファイルをダウンロードできたとは記載していない。観測したテキスト／数値の転記であることとSHA-256を明記する。

`python scripts/prepare-mexico-agro-statistics.py` はオフライン。原表版のhash、報告国、方向、年、HS分類、品目、単位、重複、収支、相手合計を検査して地域専用JSONだけを生成する。転記CSVの各相手・数量も保存した観測テキストと照合し、不一致を止める故障注入を検査した。負値や不一致は停止する。Worldを国合計で作らず、欠測を0にしない。FO・SCLの未取得値は生成しない。

| 実行した通常操作・対象 | 結果と限界 |
|---|---|
| Python GET：`https://bulks-faostat.fao.org/production/datasets_E.json` | CONNECT段階の403。配布先カタログへのプローブが拒否され、FBS/SCL/TM/FO ZIP本体は未取得。各ZIPを実際にダウンロードした結果という扱いにはしていない。 |
| Python GET：`https://fenixservices.fao.org/faostat/api/v1/en/data/QCL?area_code=138&item_code=56&element_code=5510&year=2024` | CONNECT 403。QCLの公開APIプローブ。 |
| Python GET：WITSのHS100590公開表と旧GAIN MX2025-0048のPDF | CONNECT 403。既に読めたWITS公開表の原HTMLは保存できなかった。採用した小麦・ソルガムは別の公式資料MX2026-0018の公開テキスト。 |
| FAO公式林業の説明・公開表、SEMARNAT公式の指標・ダウンロード一覧 | 閲覧できた。林産物の定義と公式XLSXの所在を確認。SEMARNAT概説の異年・丸太換算m³r・金額比を本三列の製品数量へ転用しなかった。 |
| FAO公式2020年鑑 `https://www.fao.org/3/cc3475m/cc3475m.pdf` と公式リンクのDOI | web取得403。年鑑値は未取得。 |
| UNdataのメキシコ丸太表とWITSの100700 / 100110 / 071333 / 440320 / 470321公開表 | webツールでアクセス不可。空欄・0輸出とは解釈しない。 |
| SEMARNAT公式の貿易・見掛消費・木材生産XLSX | webツールはXLSX非対応。通常Python GETによる `https://anuarios.semarnat.gob.mx/wp-content/uploads/2025/07/Consumo_aparente_2019-2023.xlsx` 取得はCONNECT 403。ファイル未取得。 |

認証発行、proxy変更、通信制限解除、拒否資料の迂回取得は行っていない。公式公開表で読めた数値だけを採用した。

## 残件と必要な作業

| 未達 | 通常の公式ダウンロードが許可された環境で必要な書出し |
|---|---|
| 豆・さとうきび・コーヒー・果樹・野菜・肉・乳・卵などの同期間需給 | FAOSTAT FBS/SCLのメキシコ（Area138 / MEX）、2024暦年の生産・輸入・輸出・在庫変動・国内供給・食用／飼料／種子／加工／損耗／その他用途の元行。品目辞書、換算定義、単位、原フラグ・注記も一緒に提供。果樹・野菜の地図上集約へ単一果実を代用しない。2024がない場合は、利用できる同一年の国／World生産と需給・全相手表を揃えて再検討する。 |
| 小麦・ソルガムの世界比 | 同じ需給資料・版・年度に対応するWorld生産原行。別年・別版・国合計から作らない。 |
| 全主要品目の同年度輸出先 | FAOSTAT TMまたはメキシコ公表／UN Comtradeから、メキシコ報告のWorldと全相手数量、商品分類版、コード辞書、単位、輸出／再輸出区分、対象開始・終了日を保存する。販売年度需給と接続する場合は月次原行を同じ期首・期末と商品範囲へ集計できることを確認する。 |
| 林業・丸太／製材／木材パルプ | FAOSTAT FOのメキシコとWorldについて同じ年・版・製品の生産、メキシコ輸入・輸出、在庫・用途があればその原表。丸太全体と産業用丸太、針葉樹／広葉樹、木材パルプ／古紙／非木材パルプのコード辞書を保存する。丸太・製材のm³とパルプtを別系列にする。SEMARNAT XLSXを使う場合も原製品量と丸太換算m³rを区別できる原ファイルが必要。 |
| 世界シェアの時系列・完全順位 | メキシコ／Worldの同一定義・同版2015–2024対応行と、網羅性を確認できる国別行。単年値を補間せず、保管国の順位を世界順位と呼ばない。 |
| 指定サイズの実画面・目視 | sandboxが正常に使えるクラウドChromeで下記の専用captureを実行し、16場面と開いた輸出先表の画像を確認。ユーザーPC接続は不要。 |

上記の正規CSV/XLSXをこの地域専用原表ディレクトリへ追加できれば、既存の期間・範囲の区別を保って接続を続けられる。制限解除や認証情報の共有は必要作業に含めない。

## 検証

- 地域専用の新規単体6件：原表hash・完全再生成、WASDE国／World照合、GAIN列と年度、国内利用内数、全相手分母・World差・kg→t、誤分母／欠測／重複／域内相手の故障注入。
- メキシコ地域E2E16件（既存14＋新規2）：全追加品目の選択・三列・単位・参照開閉、地図camera、米の補足位置、松取得図の保持、概説復帰時の生産額構成の保持。happy-domであり実ブラウザ画像検査ではない。
- 全単体：1,442件、1,439 passed、3 skipped、0 failed。
- `ASTRO_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME=/tmp/mexico-agro/config npm run build` 成功。最初の実行はAstroの書込先 `/home/agent/.config/astro` が使えなかったため、アプリ設定を許可済み一時ディレクトリへ指定して実施した。npm依存取得も `--cache /tmp/mexico-agro/npm-cache` で実施。依存版・lockfileは変更していない。
- 全体 `npm run test:e2e`：660件、649 passed、11 skipped、0 failed。
- `npm run verify:release` 成功。`git diff --check` と専用captureの構文検査も通過。

実画面は未達。`scripts/capture-mexico-agro-statistics.mjs` は1896×996と1280×665 CSS px、DPR1.5、概説＋7品目の計16場面を対象に、地図サイズ保持、横はみ出し、三列、品目同期、閉じた参照、概説復帰、JavaScriptエラーを確認し、画面PNGとreportを出力する。通常の `chromiumSandbox:true` で起動すると、`/usr/lib/chromium/chrome-sandbox` のSUID構成不備でブラウザが中止した。capture結果は `blocked`、撮影0/16。作業中の起動失敗記録は `docs/qa/mexico-agro-statistics-20261016-screen-report.json`。sandbox無効化・所有者・権限変更はしていない。提供済みcloud runtimeの `ensure` も `BROWSER_CONFIG_AUTH_TOKEN is required` で利用不可だった。認証情報を要求・作成していない。

クラウドでの再確認コマンド（パッチ適用後のcheckoutで実行）：

```sh
GITHUB_SHA=$(git rev-parse HEAD) ASTRO_TELEMETRY_DISABLED=1 npm run build
CHROME_PATH=/usr/bin/google-chrome node scripts/capture-mexico-agro-statistics.mjs
```

## 統合

変更はメキシコ専用component・lib・data・style・source・生成／確認script・test・この地域の記録に限定。`MexicoAgriculturePage.astro`、地図・controller・既存概説、共有component・renderer・共通data、他地域・日本専用は変更していない。追補指示により専用ブランチへのcommit・pushとremote SHA照合を行って統合担当へ渡す。PR・merge・公開は統合担当の範囲で、本担当では実施しない。

同じmainを基点とするメキシコパッチとして適用可能。共通部品の必須変更はない。統合担当向けの任意提案は、共有`renderAgroMarketingUse`にも供給元の帯と公表用途の内数を表示できるAPIを用意すること。本担当では共有rendererを編集せず、地域用wrapper内で既存`agroBand`を再利用した。採用する場合は他地域の同年度・同製品契約を別途検査する。
