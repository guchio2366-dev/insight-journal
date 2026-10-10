# Africa 産業：main への収録と残る範囲

基点は main ab2bf515。未公開 Draft #280（a6b5297d）の産業位置データと局所ラベル処理を再利用し、現行の atlas-africa.ts の産業描画・URL選択だけに接続する。旧 #239 の農業・人口・自然レイヤーや共通UI全体は取り込まない。マージ・公開は行わない。

初便は天然ガス（ハッシ・ルメル）、原油（ニジェール・デルタ）、銅・コバルト（DRC南部）、銅（ザンビア）、ダイヤ（ジュワネン）、航空機製造（カサブランカ）、港湾物流（ラゴス）の7地点。5種の色は今回収録した産業種別であり、依頼された産業分類全体が完成したという意味ではない。地点の数・半径・濃淡には数量を割り当てない。地図の初期はすべて表示、選択でも他地点を残す。既存テーマボタン・国別比較と年選択を保持する。

## 原資料の再確認（2026-10-10）

- EIA Algeria（2025-06-05）：ハッシ・ルメルを主要ガス田と説明。 https://www.eia.gov/international/content/analysis/countries_long/Algeria/algeria.PDF
- EIA Nigeria（2025国別分析）および2016地域解説：ニジェール・デルタの原油立地。 https://www.eia.gov/international/analysis/country/NGA と https://www.eia.gov/todayinenergy/detail.php?id=27572
- USGS DRC：2024年の世界最大コバルト生産国であることを確認。生産の順位は埋蔵量の順位と混ぜない。 https://www.usgs.gov/centers/national-minerals-information-center/congo-kinshasa
- USGS Copperbelt 地質（2014）と main の既存ザンビア解説：地質の帯の代表位置。 https://pubs.usgs.gov/publication/sir20105090T
- Kimberley Process Botswana の Annual Rough Diamond Summary 2024、Production 行：18,125,016 carats / USD 1,359,240,745.89。表示は約1,813万カラット / 約13.6億米ドル。全国年間の粗ダイヤの生産・生産価値であり、輸出行（20,342,706.06 carats / USD 2,813,405,410.59）やジュワネン単独の量ではない。2025行と取り違えない。 https://www.kimberleyprocess.com/participants/botswana
- Debswana Jwaneng：鉱山の操業とキンバーライト地質。 https://www.debswana.com/jwaneng/
- ITA Morocco Aerospace（2025-07-31）と main の既存製造業解説：技能・製造業集積。全国の企業・輸出統計をカサブランカの地点量へ割り振らない。 https://www.trade.gov/country-commercial-guides/morocco-aerospace
- Nigerian Ports Authority Lagos Port Complex：アパパ港の輸送接続と港内の食品工場。ページに公表年が見当たらないため確認年と公表年を区別する。 https://nigerianports.gov.ng/lagos-port/

資料の全文・画像・図版は再配信しない。公開URL、最小限の数値、独自の短い要約だけを用いる。代表座標は #280 と main の既存点を使用し、測量座標や面の境界へ変換しない。403・警告・有料条件を迂回していない。

## 次便候補（未実装、最終十分とは未判定）

|候補|必要性|有限の確認単位|
|---|---|---|
|ガーナ南西部の金|「金・ダイヤ」の金がない。西部の金産地が読めない|Minerals Commission/USGS の操業地域と全国産出年を照合し1つの地域例にする|
|南アフリカのブッシュフェルト白金族とムプマランガ石炭|レアメタルと南部エネルギーが銅・コバルトだけでは足りない|DMRE/USGS/EIA の2地域、全国量と地域量を区別|
|ギニアのボーキサイト（ボケ地域）|ベースメタルが銅だけ。西部のアルミ原料を欠く|USGS/鉱業省の既存操業地域を1例、輸出量と生産量を区別|
|南アフリカの自動車製造地域|製造業がモロッコの航空機1例だけ|dtic/Stats SA の操業地域・全国製造/完成車統計を1〜2例|
|稼働するレアアース産地|レアアースをコバルトと同一分類と誤解させない|USGSと公的操業資料で、鉱床・計画・試験操業・実生産を区別。資料未確認の案件を生産地として描かない|

これらは次点の調査候補であり、位置と数量の公的原典照合が済んだ収録成果ではない。施設全数や投資評価へは広げない。

## 検証

`verify-africa-industry-review.mjs` は production build を使い、1024×768・1440×900・390×844 で全7点の通常クリック・産業名クリック・キーボードとフォーカス、全地点保持、出典本文とリンク、戻る・進む・再読込、ラベルと点の重なり、枠外と横はみ出し、全国ダイヤ量の範囲を検査し画面を記録する。スマホはChromiumのtouch emulationで実機ではない。

## 独立レビュー後の安全な再検証

新規レビューのsandbox無効化指定を除去し、chromiumSandbox:trueで起動する。Playwright既定のself-XSS警告無効化引数も除外する。安全な起動ができなければ停止し、設定変更・権限拡大・fallbackは行わない。元のsandbox無効実行の画像を修正後の検証証拠として扱わない。ローカル環境はSUID sandbox未構成のため再実行しない。修正後headの画面確認は標準CI runnerでのみ実施し、結果をPRへ記録する。
