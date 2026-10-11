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
| 人口密度 | [population-1920x1080.png](population-1920x1080.png) |
| 民族の地域事例 | [ethnicity-1920x1080.png](ethnicity-1920x1080.png) |
| 宗教 | [religion-1920x1080.png](religion-1920x1080.png) |

## 実装範囲と資料境界

- 農畜産の3ジャンルで既存の16品目の集中域を同時表示し、品目の件数切り詰めを外した。代表色面と、重なりで隠れる別品目の輪郭を分けた。ブドウ・オリーブと乳用・肉用を分離する元格子は未収録なので、その形状は作らない。
- 降水量の低い2帯を茶・緑に変更し、同じ250 mm等雨量線から段階色を再生成した。欠測を塗り足していない。
- 地形26名称を同時に選択できるようにした。局地風の固定矢印は描かない。河川はNatural Earthの収録区間だけを強調し、完全な本流・流域界とは呼ばない。
- 民族はONS 2021のイングランド・ウェールズ331行政区で、宗教はPew 2020の国別推計とONSの同行政区で出典・分母を分けた。両者の欠測を0にしていない。Pewの分類から宗派を推測していない。
- EEA ECRINSの公式データ取得口はこの環境からHTTP 403となり、河川の源流から河口までの連結と全流域を確定できていない。BasinATLASレベル4の単一区画を全流域とは扱わない。
- 農畜産の食品群別自給率帯、林業の輸出入先、地下水図、欧州全域の宗教細地域と民族分布は、対応する原表・定義・利用条件が揃うまで未表示とした。既存の出典付き集計は維持した。

検証：`npm test`（1124件成功、3件スキップ）、`npm run build`、`node --test tests/e2e/atlas-europe.test.mjs`。ビルド時はAstro telemetryの設定先を書けるよう `ASTRO_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME=/tmp/insight-journal-config` を指定した。
