# 都市の雨温図と所在地の気候区分

右欄は「雨温図 → 観測所所在地の原分類名・日本語説明 → 観測値・期間・出典」の順。従来の観測値文章、観測対象範囲の注記、12か月の表、使用年数、出典は閉じた補助欄に保持する。地図の主要ラベル短縮と、選択時の完全な原コードは変更しない。

| SMN観測所 | INEGIの原図形 | 原分類／日本語名 | 完全な原コード |
| --- | --- | --- | --- |
| 09048 TACUBAYA CENTRAL (OBS) | climate-1124／OBJECTID 1124 | 32 Templado subhúmedo／温帯・亜湿潤 | `C(w1)(w)` |
| 25015 CULIACAN (DGE) | climate-287／OBJECTID 287 | 52 Semiseco cálido／半乾燥・高温 | `BS1(h')hw` |

保存済みの公式SMN原文に記載された座標を、INEGI 2008年刊行の原ZIP内SHP・DBFに照合した。表示用簡略化前の1,695ポリゴンを調べ、各地点を厳密に内包する原図形は1件。原分類と描画用データも一致する。全数値は監査JSONに記録し、通信なしで再現できる。

- 原典：`data-source/atlas/mexico/nature/climate-2008.zip`、`data-source/atlas/mexico/climate-normals/nor9120_09048-selected.txt`、`nor9120_25015-selected.txt`
- 監査：`data-source/atlas/mexico/climate-normals/classification-audit.json`（ZIP・構成ファイル・観測所資料のSHA-256、原ID、原座標、境界距離、丸め感度）
- 再計算：リポジトリ直下で `node scripts/audit-mexico-city-climate.mjs`。第1引数でリポジトリ、第2引数で出力先を指定できる。
- 局所検証：`node --test tests/unit/atlas-mexico-climate-city-reading.test.mjs tests/unit/atlas-mexico-climate-controller.test.mjs tests/unit/atlas-mexico-climate-normals.test.mjs`（11件成功）

分類はGarcía改訂によるINEGIの原区分であり、米国ページのケッペン＝ガイガー分類へ換算しない。雨温図の1991–2020年平年値から再判定した分類でも、市域全体を代表する分類でもない。原分類図の統一観測対象期間は未記載。

タクバヤは細分類の原境界から約296 m、異なる主要分類までは約7.62 km。クリアカンは原境界まで約10 km。原図は縮尺1:100万で、SMN座標資料には測地基準・座標時点・位置精度の明示がない。小数桁の丸め感度は確認したが、計算上の距離や桁数を測量精度とは扱わない。原図と同じ投影式で所在地を重ね、時点付き測地変換や境界の推測移動はしていない。
