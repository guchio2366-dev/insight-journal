# 欧州 PC レビュー（2026-10-11）

基準：`origin/main` `755ec125daf9272e21328ff4c1ecab32756ce917`。欧州内の修正だけを Draft PR にまとめ、公開・マージは行わない。

## 画面

Chromium の production preview、1920×1080、MapLibre 読込後の画面を保存した。記録は [browser-evidence.json](browser-evidence.json)。横スクロールおよび JavaScript エラーは0件。セーヌ川・アルプス山脈の地図名からの選択と宗教分類の切替も確認した。

| 初期画面 | 画像 |
| --- | --- |
| 穀物・畑作 | [agriculture-1920x1080.png](agriculture-1920x1080.png) |
| 気候 | [climate-1920x1080.png](climate-1920x1080.png) |
| 河川 | [rivers-1920x1080.png](rivers-1920x1080.png) |
| 地形 | [terrain-1920x1080.png](terrain-1920x1080.png) |
| 降水量 | [precipitation-1920x1080.png](precipitation-1920x1080.png) |
| ドナウ川の連結区画 | [danube-1920x1080.png](danube-1920x1080.png) |
| 人口密度 | [population-1920x1080.png](population-1920x1080.png) |
| 民族の地域事例 | [ethnicity-1920x1080.png](ethnicity-1920x1080.png) |
| クロアチア事例の選択 | [ethnicity-croatia-1920x1080.png](ethnicity-croatia-1920x1080.png) |
| 宗教 | [religion-1920x1080.png](religion-1920x1080.png) |

## 実装範囲と資料境界

- 農畜産の3ジャンルで既存の16品目の集中域を同時表示し、品目の件数切り詰めを外した。代表色面と、重なりで隠れる別品目の輪郭を分けた。ブドウ・オリーブと乳用・肉用を分離する元格子は未収録なので、その形状は作らない。
- 降水量の13帯を連続する青系に統一し、同じ250 mm等雨量線から段階色を再生成した。欠測を塗り足していない。
- 地形26名称を1920×1080の初期画面内に配置し、密集部分は引出線で地図上の位置につないだ。局地風の固定矢印は描かない。河川名と収録線は選択できる。線はNatural Earthの収録区間だけを強調し、完全な本流とは呼ばない。
- ドナウ川・ヴォルガ川はBasinATLASの `MAIN_BAS` で接続するレベル4の各9区画を一緒に輪郭表示した。公開格子は対象国と地図枠で切れているため、川の全流域とは呼ばない。
- 民族はONS 2021のイングランド・ウェールズ331行政区で、宗教はPew 2020の国別推計とONSの同行政区で出典・分母を分けた。両者の欠測を0にしていない。Pewの分類から宗派を推測していない。
- EEA ECRINSの公式データ取得口はこの環境からHTTP 403となった。[HydroATLAS](https://www.hydrosheds.org/hydroatlas) の BasinATLAS と RiverATLAS は集合データベースとして CC BY 4.0 であり、全流域と本流の検証候補になる。元のレベル4区画のハッシュと `MAIN_BAS`・`NEXT_DOWN` は [selected-inputs.json](../../../data-source/atlas/europe/drainage/selected-inputs.json) に記録済みだが、元の形状ファイルはこの作業環境に残っていない。公式 Figshare のダウンロードと API への通常の接続も HTTP 403 となった。全流域には国境で切っていない同一 `MAIN_BAS` の全区画、本流には RiverATLAS の `MAIN_RIV`・`ORD_CLAS`・`NEXT_DOWN` と独立した河口・河川名の照合が必要。今の図はどちらも満たさず、全流域・源流から河口までの本流とは表示しない。取得先と検証手順は [connected-basin-review.json](../../../data-source/atlas/europe/drainage/connected-basin-review.json) に記録した。別製品の HydroRIVERS を RiverATLAS として扱わない。
- [Copernicus CORINE Land Cover 2018](https://land.copernicus.eu/en/products/corine-land-cover/clc2018) は、ぶどう園（221）とオリーブ園（223）の別区分があり、公開図の候補になる。ただし土地被覆図であり生産量・収穫面積・品種分布ではない。25 ha の最小作図単位と2017–2018年の対象期間を明記する必要がある。公式 REST 配信先への通常の接続は HTTP 403 となり、元図形を確認・収録できていない。乳用・肉用の地域分布も現在の家畜総数格子から推定しない。
- [MapSPAM 2020 v2.2](https://www.mapspam.info/data/) の独立したブドウ・オリーブ格子の有無は品目表で未確認で、[利用条件](https://www.mapspam.info/terms/) は CC BY-NC 3.0。既存の温帯果樹格子を品目別へ推測配分せず、新格子も収録していない。
- 農畜産の食品群別自給率帯、林業の輸出入先、地下水図、欧州全域の宗教細地域と民族分布は、対応する原表・定義・利用条件が揃うまで未表示とした。既存の出典付き集計は維持した。

追加の実画面確認は [corrections-checks.json](corrections-checks.json) に記録した。1920×1080の地形26名称、セーヌ川の線選択、ドナウ川9区画、降水量13色、民族のクロアチア事例への移動を確認した。

検証：`npm test`（1125件成功、3件スキップ）、`npm run build`、`npm run verify:release`、`node --test tests/e2e/atlas-europe.test.mjs`、`tests/browser/atlas-europe-pc-review.mjs`（1440×1000・1024×800の操作地図、および1024×800の簡易地図）、`tests/browser/atlas-europe-corrections-review.mjs`（1920×1080の5操作）が成功。全分野の `npm run test:e2e` では旧表示を前提とした欧州の5件が失敗したため期待値を更新し、該当3ファイル33件は再実行で成功した。最新の地図拡大調整後も対象の単体・統合検査と実ブラウザは成功。全分野の再実行は次のCIで確認する。ビルド時はAstro telemetryの設定先を書けるよう `ASTRO_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME=/tmp/europe-xdg` を指定した。
