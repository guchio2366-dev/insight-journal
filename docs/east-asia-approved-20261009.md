# 東アジア・2026-10-09 承認済み添削

この変更は PC の人口、東京の気候、産業、農畜産、年降水、流域を対象とする。新規 Draft PR でレビューし、公開・マージは行わない。宗教・民族は変更対象外。

## 地図と説明

投影は既存の MapLibre Mercator を維持。東アジア全体の実 extent を padding 5px で fit し、枠の寸法だけを変更する。枠の高さを対象extentのMercator上の縦横比に合わせて上限化し、fit後の縦方向の空白も詰める。都市選択時は現在 camera を保存する。東京 URL の初期読み込みでも都市への自動ズームを行わない。左ニュース、中央地図、右スクロール説明の PC 三列。農畜産統計と地域との気候の関連はニュース以外の全幅。

人口は2020年推計。四川盆地・関中平野・長江中流の内陸集積、平野と水・農業の基盤、工業化・交通と都市圏を説明する。2020年より後の減少や移動の説明には使わない。

東京は図→区分と定量定義→季節性の原因→関東の農畜産の順。Beck et al. (2023) の1991–2020格子分類を用い、C/D境界0℃、B先行、Cfaのa・fを月平均と夏冬半年の条件で説明する。秋雨前線と台風、冬の西高東低と日本海側山地の降水が太平洋側の冬少雨を説明する。

- 気候分類: https://www.nature.com/articles/s41597-023-02549-6 / https://www.gloh2o.org/koppen/
- 同じ分類規則の先行論文・Table 1: https://www.nature.com/articles/sdata2018214
- 東京平年値: https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?block_no=47662&prec_no=44
- 季節性: https://www.data.jma.go.jp/cpd/j_climate/kanto_koshin/main.html
- 関東農業: https://www.maff.go.jp/kanto/kihon/kikaku/meguji/kanto_meguji_r5.html
- 地域農業: https://www.fao.org/4/y1860e/y1860e08.htm
- モンゴル: https://www.fao.org/in-action/scala/countries/mongolia
- タリムの内陸水系・農業と河畔林: https://science.nasa.gov/earth/earth-observatory/winter-and-summer-in-the-tarim-basin-51678/

年降水はCHELSAの1981–2010推計を維持。250mm刻みの等雨量線と段階色を同じ場から描画し、500mmごとの数値を線上の元anchorと短い引出線で結ぶ。線の値と、クリック時の平滑化前格子値を区別する。東京の1991–2020との期間差を注記する。

長江・黄河・タリム・アムールは初期同時塗分け。名前を都市より優先し、地図名をクリックして各水系を選ぶ。BasinATLASの出口単位の合成区域を維持するため、公式流域境界と断定せず、数値の定義は補足に残す。

## 産業の採用・次点

初期図は国別GDP製造業比率から、代表都市の産業種類へ変更。初期と各選択で分類を統一: 自動車、半導体・電子、鉄鋼、電池、造船、石油化学。色は種類、記号は一定サイズ、複数種類は等分扇形。面積・生産量・世界シェアを表さない。重要な台湾の新竹・台南を収録し、未掲載地域は0扱いしない。工場全数・敷地境界ではなく都市付近の概略位置。

採用理由: 自動車・電子・鉄鋼・電池は部品と素材から製品へつながる集積の特徴を説明できる。造船は海岸の大用地・深水域・鋼材・熟練者と世界市場との関係、石油化学は港とコンビナートの原料・蒸気共有を説明できる。

次点: 一般機械・ロボットは産業分類が広く電子・自動車との重複整理が必要。繊維・衣料は工程別分布と同一定義の地域統計を照合する必要。金融・情報サービスは工場位置ではなく都市の雇用・付加価値を用いる方が適切。これは編集上の採用判断であり生産量の順位ではない。

- 自動車: https://oica.net/production-statistics/ と企業の工場一覧
- 半導体: https://www.tsmc.com/english/aboutTSMC/TSMC_Fabs （台湾・熊本・上海）; https://semiconductor.samsung.com/foundry/manufacturing/manufacturing-sites/
- 鉄鋼: https://globalenergymonitor.org/projects/global-iron-steel-tracker/ ; 日本製鉄・POSCO・CSCの工場資料
- 電池: https://www.iea.org/reports/global-ev-outlook-2025/electric-vehicle-batteries ; CATL・Panasonic・LG Energy Solution の立地資料
- 造船: https://unctad.org/system/files/official-document/rmt2025ch2_en.pdf ; 各造船企業資料
- 石油化学: https://www.basf.com/cn/en/who-we-are/organization/key-production-sites/jiangsu ; 丸善石油化学四日市工場・韓国産業省蔚山資料

各点の具体URLは `src/data/atlas/east-asia-industry-clusters.ts`。複数産業の都市は追加資料も表示する。既存日本県別・中国省別統計は補助の国別入口へ残す。国と産業を同列の入口に混ぜない。

## 農畜産・取得障害と残件

初期overviewと農畜産品目で、丸太・製材・全商品貿易・世界生産比へfallbackする経路を停止した。左=主要品目の供給と用途、中央=品目別の域外輸出入相手、右=カロリー構成と自給状況。地域合計の原表が取得できていないので、架空の帯・円は描かず未収録を表示する。日本小麦の保存済み2023年度需給・通関輸入は原定義で保持し、重量自給率をカロリー自給率へ読み替えない。

公式公開状態: FAOSTAT Food Balances 2010–2023 は2025年10月公開。
https://www.fao.org/statistics/highlights-archive/highlights-detail/food-balance-sheets-2010-2023/en

2026-10-09の取得 action はいずれも Python urllib HTTPS GET、結果は `URLError: <urlopen error Tunnel connection failed: 403 Forbidden>`。

1. https://fenixservices.fao.org/faostat/api/v1/en/data/FBS?area_code=351,110,117,116,154,136&year=2023&page_size=100000
2. https://bulks-faostat.fao.org/production/Food_Balances_(2010-)_E_All_Data_(Normalized).zip
3. https://bulks-faostat.fao.org/production/Trade_DetailedTradeMatrix_E_All_Data_(Normalized).zip

アクセス制限を迂回していない。取得不能をデータ不存在と同一視しない。この試行のAPI area codeの地域対応も原表取得後に検証する必要があり、集計済み値として採用していない。

実データ完成の必要条件:

- 中国・香港・マカオ・台湾等を二重計上せず、日本・韓国・北朝鮮・モンゴルを含む対象を固定。現行の保存済み4対象だけの合計を東アジア合計としない。
- 同一年・同一品目・重量単位で、生産＋輸入＋在庫取崩しと、食用・飼料・加工・種子・損失・輸出・在庫積増し等を照合。正負の在庫の規約を原表で確認し、国内供給量への輸出二重控除を避ける。
- 同年・同HS範囲の全相手国行列から域内取引を除き、域外輸出／域外輸入を別の分母で円表示。上位3相手＋「その他」では内部取引を除去できない。
- 食料供給kcalと国内生産の食用換算を品目群ごとに照合。加工品・原料の二重計上を避ける。重量自給率とカロリー自給率を区別する。

右側の提案: 上帯は同一年の食料供給kcal構成で幅を決定、下帯は同じ幅で品目群の自給状況を濃淡表示。100％超は幅を延ばさず別記号と実率、欠測は斜線と「未収録」。品目群の率を100％で上限化したカロリー自給率への寄与と、上限なしの生産／供給比は別指標として定義し、承認後に実データで実装する。

## 未承認: 地図下・半導体だけの構成案

この案はドキュメントのみ。産業ページの地図下には実装しない。

1. 横方向に「設計→ウエハー製造→組立・検査」。設計は回路・配置・検証、製造はシリコン上に素子と配線を作る、組立はパッケージ化し検査は機能・品質を確かめる。ファブレス・ファウンドリー・OSAT・IDMを役割の重なりとともに定義。
2. 下段に材料（シリコンウエハー、フォトレジスト、ガス等）と装置（露光・成膜・エッチング・検査）。これらが複数工程へ供給される矢印を置く。国別名だけを箱へ入れない。
3. 工程ごとの代表製品・企業例と、集積を支える人材、電力・超純水、供給企業との共同改良を短文で説明。工場地図を見なくても役割が分かる構成。
4. 世界シェアは一つの横棒へ異なる分母を混ぜない。設計=ファブレス売上（企業本社所在地）、製造=設置済み能力（工場所在地、月産ウエハー・換算方法・技術世代）、組立検査=OSAT売上（企業本社）を別パネルとする。同じ年で照合できなければ欠測を表示し、能力と売上を合算しない。先端ロジックだけのシェアと全半導体のシェアを区別。
5. 資料候補: SIA/BCG 2024 report（歴史値2022と将来2032を混ぜない） https://www.semiconductors.org/wp-content/uploads/2024/05/Report_Emerging-Resilience-in-the-Semiconductor-Supply-Chain.pdf 。この案では数値を未採用。最新公表値と同一定義の分母が揃ってから採用値を提案する。

## ブラウザー検証

`scripts/capture-east-asia-approved-review.mjs` は本番ビルドをローカル静的serverで読み、外部通信を遮断したsandbox有効のChromeで、2 PC寸法の初期・選択・戻る・タブ往復を検証する。軽量JPEGと `results.json` を同じartifactへ保存。headと画像SHAを記録する。

人口・農畜産は本文の見出しと分布要約の可視性、初期右スクロール枠内への収まり、要約→原因説明の順を検証する。産業は地図直下の6色・名称と地図記号の色の一致を確認し、数値のない点に数値凡例を出さない。年降水は数値を等雨量線のanchorから離し、4500・5500mm付近を保護する。両PC幅で引出線の長さとanchorがラベルに覆われないことを検証し、この2値の周辺の拡大キャプチャもartifactへ含める。農畜産3列の原表取得障害は引き続き残件であり、全項目の完成とは扱わない。

ローカルChrome起動は `/usr/lib/chromium/chrome-sandbox` がroot所有でないため `SUID sandbox helper binary was found, but is not configured correctly` で停止。`--no-sandbox` 等は使わず、実画面検証はCIへ移す。CIの最終結果と画像目視はPRコメントに追記する。
