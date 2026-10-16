# 東アジア：追補結果と取得不足（2026-10-16）

**追加4系列を地域専用の閉じた需給参考へ実装。主三列の全面完成ではない。** ブランチ `codex/east-asia-agro-statistics-20261016` は初回push済みで、remote/HEADが `4050654072e90a0ab6f2a46ddf67191035ea26c3` と一致した。追加分も検証後に同じブランチへpushし、最終SHAは応答に記録する。PR・マージ・公開は統合担当へ委ねる。

## 補完できた量

[USDA公式WASDEページ](https://www.usda.gov/oce/commodity/wasde)のSeptember 2026 → Textから、[WASDE-675公式TXT](https://www.usda.gov/oce/commodity/wasde/wasde0926.txt)の該当行を再照合した。保存TXTのSHAを固定して4行を新たに正規化したもので、PDF原物の新規取得・新しい版との同一性を主張しない。単位・年度は行内で統一する。

|国・製品／頁|生産／World|輸入／国内利用／輸出|期首／期末在庫|単位|
|---|---|---|---|---|
|韓国・とうもろこし子実 p22|0.09／1,235.03|11.44／11.45／0.00|2.04／2.13|百万t|
|中国・精米換算米 p24|145.28／542.30|2.34／144.96／1.15|103.00／104.50|百万t|
|韓国・精米換算米 p24|3.59／542.30|0.33／4.25／0.19|1.21／0.68|百万t|
|中国・綿繊維 p26|32.00／119.53|5.19／39.00／0.06|36.71／34.84|百万480lb俵|

全て**2024/25販売年度・WASDE-675の同表国／World**。韓国とうもろこしの飼料9.25は国内利用11.45の内数。輸出0.00は公表丸め値で、厳密なゼロ・取引不存在・厳密な輸出比を推定しない。収支差は順に−0.01／+0.01／+0.01／0.00で別掲する。綿花表のLossは国行0.00、World行の−0.23も原行に保持し、国内利用の帯へ二重加算しない。

米の精米換算は既存QCL籾米とは別製品基準、綿繊維はQCL種子綿とは別。QCLへのaliasを追加していない。2023暦年WITSの相手数量は、これらの2024/25輸出量の内訳ではない。国産原料由来の追跡、全相手数量、食用・加工等の詳細、地域全体の域外集計は依然未達。品目未選択時・日本選択時は追加しない。

- データ：`src/data/atlas/east-asia-supply-use-references.json`
- 再生成：`python scripts/east-asia/prepare-supply-use-references.py`（原文hash、頁、製品名、単位、年度、非数値・注記、重複、内数、収支差を検証）
- 地域表示：`src/scripts/atlas-east-supply-use-references.ts`。既存の供給／仕向け共通帯を再利用。
- [共通提案パッチ](common-integration.patch)：**未適用**。②の既存閉じた参考へ4系列、③の既存閉じた参考へ2023数量を呼び出す9行。主図のQCLや同年相手欠測の文言を置換しない。

## 取得不足：資料・URL・必要列・試した経路

|資料|公式入口／不足ファイルURL|必要な列|今回と既存の取得状態|
|---|---|---|---|
|FAOSTAT FBS/SUA 2023|[FBS](https://www.fao.org/faostat/en/#data/FBS)、[公開カタログ](https://bulks-faostat.fao.org/production/datasets_E.json)|国・品目・原料換算・年・単位・P/I/X・符号付き在庫・国内供給・Food/Feed/Processing/Seed/Losses/Other/Residuals/Tourist・旗・版|既存：SPA数値未返却、カタログurllibは接続トンネル403。別の[UNdata公開表](https://data.un.org/Data.aspx?d=FAO&f=itemCode%3A2511)は2021まで。2023へ補完しない。拒否URLを再取得していない|
|Global forest products facts and figures 2024／2023|[2024 cd8005en](https://openknowledge.fao.org/handle/20.500.14283/cd8005en)、[2023 cd3650en](https://openknowledge.fao.org/handle/20.500.14283/cd3650en)|パルプ製品コード・国／World・実生産・I/X・年・t／含水基準・旗・同版|[公式書刊一覧](https://www.fao.org/forestry/statistics/publications/forest-product-statistics/en)→各公式handleを通常閲覧。両方web readerが403。ミラー・別hostへ取り直さない|
|Pulp and paper capacities, survey 2023–2025|[cd2190t](https://openknowledge.fao.org/handle/20.500.14283/cd2190t)|国・製品・年・実生産／能力の別・単位・含水基準・旗。I/Xは別途必要|[公式パルプ書刊一覧](https://www.fao.org/forestry/statistics/publications/pulp-and-paper/en)→公式handleでweb reader 403。能力を生産へ代用しない|
|USDA PSD 全品目公開CSV|[公開ZIP](https://apps.fas.usda.gov/psdonline/downloads/psd_alldata_csv.zip)|品目・国・販売年度・P/I/X/国内利用/在庫属性・単位・値・改訂日|公開SPAは数値を返さず、正式download URLのurllibは `Tunnel connection failed: 403 Forbidden`。原サイトのHTTP403とは断定しない。別経路で同じZIPを取り直さない|
|台湾・糧食供需年報112年（2023）|[現行の公式書刊一覧](https://agrstat.moa.gov.tw/moasdweb/book/Book.aspx)、[現行114年版](https://agrstat.moa.gov.tw/moasdweb/book/Book.aspx?bookID=1446)|対象範囲、品目別P/I/X・在庫動用/増加の符号・飼料/種子/加工/減耗/食用・単位・旗・編製方法|旧`/sdweb/public/book/Book.aspx`は404。公式rootから現行`/moasdweb/`への移動を確認し、現行目次は読めた。原表リンクはreaderに露出せず、通常HTMLのurllib取得は接続トンネル403。最新114年（2025）を2023と扱わない|
|KREI Agriculture in Korea 2025／食料需給の原表候補|[公式レポート一覧](https://www.krei.re.kr/eng/page/120)、[書誌544440](https://www.krei.re.kr/eng/page/120?biblioId=544440&cmd=view&pageIndex=1)|2023品目別需給の有無をまず確認。存在すれば期間・商品・P/I/X・在庫・用途・単位・旗|公式トップ・一覧は読めた。公式トップの書誌リンクはweb readerが400 timeout。未読の報告書に必要原表があるとは断定せず、数値を採用しない|

利用者が通常の公式exportを行える場合は、FBS/SUAの中国本土・韓国・北朝鮮・モンゴル・台湾相当区分の2023全要素CSV、パルプ同製品同版の国／World原行、同年全Partner数量を提供すれば再照合できる。台湾は「統計書刊 → 包含歷史書刊 → 糧食供需年報 → 112年」の平衡表・製品別詳表と編製方法が必要。OASと台湾の統計範囲は自動一致させない。認証・アクセス制限の解除やユーザーPC接続を求めない。

## 検証と実画面の引継ぎ

地域単体51件成功（新規4件を含む）。全単体は1,445成功・3スキップ・失敗0。最終build、built HTMLと地域rendererを使う追加DOM統合1件、release検証も成功。共通提案は適用チェックとメモリ上bundle／8通りの選択・概説DOM検証が成功し、実ファイルは未変更。初回コミットの全E2E647成功／11スキップは保持するが、今回の追加4系列に対する全E2E再実行や実ブラウザ画像の代用とは呼ばない。実画面は前回のsandbox起動不能を継続して引き継ぎ、撮影済みとは扱わない。

統合担当はsandboxが有効なクラウドChromeで `scripts/east-asia/capture-selected-quantities.mjs` を実行する。1896×996／1280×665 CSS px、DPR1.5を保持し、11選択状態と米国大豆基準、4需給参考の開閉・概説復帰・日本除外を確認する。
