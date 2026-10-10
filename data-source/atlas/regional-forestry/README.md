# 4地域の林業の基礎説明と森林被覆の取得状況

基点は main ab2bf515。Canada・Asia・Europe の既存表示を確認し、数値原表とは独立した林業の基本説明を追加した。森林面積、生産量、貿易・自給・世界シェアは再取得していない。

## 使用できた資料

ロシア西部の被覆は main に保存済みの public/assets/atlas/europe/tree-cover-v1。ESA WorldCover 2021 v200、CC BY 4.0、樹木被覆分類10。元画像の座標範囲 [-25,32,65,73] を変えず、既存のロシア地物へSVGで切り抜く。元画像と分類マスクのhash、実際のMoscow付近の原画素との座標一致をテストした。西部以外へ補間・延長しない。

Asiaの保存済みJRC GFC2020 v3 WMS画像3件も原画像・hash・EPSG3857座標を維持して再利用。OceaniaはPNG西部・パラオ等と豪州北端の小範囲（保存範囲 [90,-12,143,30]）だけ、Russiaは南部の保存範囲 [44,-2,100,57] と [72,17,147,55] だけを既存の地域地物に切り抜く。RussiaのESA範囲全体を除外するmaskで2021年の樹木被覆を優先する。

JRC公式 https://forobs.jrc.ec.europa.eu/GFC/v3 を2026年10月10日に確認：FAO-FRA/EUDRの森林定義に沿う2020年の統合推計。ESAの樹木被覆分類とは異なる。Copernicus/JRCの出典明記による無償再利用。WMSはRGB画像のみで分析には不適で、透明画素の非森林／欠測を区別できない。その場所は斜線を残し「分類未判定」と明記する。シベリアの低密度樹林で過大推計があるという提供元の既知制約も表示する。新規ダウンロード・規約同意は不要。

4地域の基本説明は src/data/atlas/regional-forestry.json に資料URL・対象時期を記録。FAO、各国政府・森林担当機関、World Bank の文章を要約。古い資料の予測・企業情報・貿易先を現在の実績に置き換えない。代表位置は著者による概略座標で、森林境界、伐採区画、加工施設や調査地点ではない。小さな林業国を一律に詳細化しない。

## 未取得範囲と403

availability.json は正確な接続先・方法・失敗・再利用ファイルのhashを保存し、public配信版と同一。

ESA WorldCover 公開COGへのNode直接接続はタイムアウト、環境のHTTP CONNECT経由のHEADは403。原典が拒否したかは確認できず、環境の接続制限として記録した。別資料としてAsiaで採用済みのJRC GFC2020の正式WMSにGetCapabilitiesを要求したが、同じくCONNECT段階で403。別ホスト・ミラーへの変更、拒否の迂回、有料契約、権限拡大、アカウント作成、新たな規約同意は行っていない。

全域の原分類格子はアフリカ・中南米・オセアニアで未取得。オセアニアでは豪州のほぼ全域（北端の小範囲を除く）・NZ・PNG東部・保存WMS範囲外の島々は参考図もない。ロシアはESA西部範囲とJRC南部参考図の範囲外が未取得。JRCの透明画素は範囲内でも分類未判定。取得済み元画像のnodataも欠測として残す。樹木被覆と森林面積・木材生産量・森林タイプ・商業伐採地は異なる。分類95のマングローブ、分類20の低木は分類10に加えない。

## 表示・操作

/atlas/{africa,latin-america,oceania,russia}/agriculture/forestry/ に独立モジュールを作成。初期は地域全体の地図と右の概説→解説。選択で他地域の位置・取得済み被覆面を維持。全体・拡大縮小・マウス移動・キーボード移動・選択解除・URL復元を提供。国比較・年度比較・長方形選択枠・インサイト遷移は追加していない。公開共通UIのスタイルは変更していない。

## 検証

既存unit suiteは新規テスト追加前に1,054 pass、3 skip、0 fail。新規unit5件と既存ESA原画素テスト4件、built-site4件が成功。JRC原画像のhash・座標・描画色／透明画素、選択後の参考図維持と画像失敗も検証。production build成功。ローカルChromeはSUID/namespace sandboxを利用できず、sandboxや権限は変更していない。

Regional forestry PC review は既存GitHubランナーの通常sandbox付きChromeで1536×864と1920×1080を撮影する。PR headのSHAを検証し、全域／選択の画像・サイズ・操作・リクエスト失敗をartifactに保存する。PC目視の結果はPRと引継ぎ報告に記載する。

## 再現用取得処理と残件

scripts/regional-forestry/prepare-tree-cover.mjs はEuropeの既存COG概観抽出アルゴリズムを使う独立した地域用処理。今回は原図を取得できず配信画像を生成していない。通常の正規接続が可能な環境でのみ、例えば node scripts/regional-forestry/prepare-tree-cover.mjs --region africa --fetch --cache /tmp/regional-forestry-source-cache で取得できる。403は停止し、森林面を代替生成しない。

4地域全域の被覆取得、表示への接続と検証は残件で、このDraftでは完了扱いにしない。数値統計は別担当の成果と統合する必要がある。マージ・公開は行わない。

## ロシア数値の統合依存先

親担当から2026年10月10日に指定されたDraft PR #296（https://github.com/guchio2366-dev/insight-journal/pull/296）、head e2f7a5d に依存する。`src/data/atlas/russia-forestry-statistics.json` は森林面積・丸太・製材の2015〜2024年30行を既存の欧州保存値から接続したもの。独立表示は `src/components/atlas/RussiaForestryStatistics.astro`。こちらでは同じ数値を再取得・再実装していない。

コンポーネントを読んだところ、上記ロシア系列に加えて `src/data/atlas/shared-forestry-summary.json` もimportしているため、このデータも接続に必要。propsは不要。親が #296 の数値と画像を確認後、最終統合時にこの3ファイルの必要部分だけを接続する。`RegionalForestryPage.astro` の地図＋右解説の `forest-primary-grid` の後へ、`region==='russia'` のときだけ独立表示を配置できる。森林面積・木材生産量は分布の凡例や画素から算出せず、統計表の対象年2015〜2024と地図の2020／2021年を区別する。#296 の全変更を繰り返し取り込む必要はない。

## 全域未取得の基図（親レビュー反映）

Africa・中南米では全域が一律未取得のため、全面の斜線を外し、中立色の基図と代表位置を表示する。「全域の森林被覆面：未取得」と短い説明で、基図の色が森林の有無を表さないことを明記。Russia・Oceaniaは取得済み範囲との区別のため斜線を維持する。これは森林分布の完成ではなく、代表地域と林業利用の説明を先に整える部分成果。追加取得の再試行・新規調査は行わない。
