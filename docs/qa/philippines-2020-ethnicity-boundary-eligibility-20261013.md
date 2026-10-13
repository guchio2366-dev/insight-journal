# フィリピン2020年民族統計を地方境界に結合するための判定

対象：東南アジア民族地図に既掲載のフィリピン統計庁（PSA）2020年国勢調査・地方別7値。起点は統合 Draft #344 の `831bba22`。本追補は資料判定のみで、境界画像・民族の居住域・統計値を変更しない。

## 結論

2026-10-13時点で、**2020年国勢調査の17地方とPSGCコードに対応し、再配布条件を確認できる境界ジオメトリは確保できていない**。既存の7つの地点札は地方を探す位置として保持し、地方別割合の面塗りを加えない。地方全域の集計割合を実際の居住域へ補間したり、行政境界をぼかしたりしない。

## 原値との対応

[PSA・Ethnicity in the Philippines (2020 CPH)](https://psa.gov.ph/content/ethnicity-philippines-2020-census-population-and-housing) の公表文は17地方を対象とし、下記の数値を明記する。分母は各地方の世帯人口。既存の [`southeast-census-complements.ts`](../../src/data/atlas/asia/southeast-census-complements.ts) と一致する。`PSGC 2020` 欄は未照合であり、コードを推定で埋めない。

| 2020年の地方名 | 民族回答 | 地方内割合 | PSGC 2020 | 地図の現行表示 |
| --- | --- | ---: | --- | --- |
| Region I・Ilocos | Ilocano | 58.3% | 未照合 | 地点札 |
| Region IV-A・CALABARZON | Tagalog | 74.4% | 未照合 | 地点札 |
| Region V・Bicol | Bicol | 78.8% | 未照合 | 地点札 |
| Region VI・Western Visayas | Ilonggo | 67.6% | 未照合 | 地点札 |
| Region VII・Central Visayas | Cebuano | 61.4% | 未照合 | 地点札 |
| Region VIII・Eastern Visayas | Waray | 64.2% | 未照合 | 地点札 |
| BARMM・Bangsamoro | Maguindanao | 26.4% | 未照合 | 地点札 |

BARMMの26.4%は「地方全体がマギンダナオ民族」という意味ではない。PSAは同地方でTausug 23.3%、Maranao 22.7%も報告する。7値は17地方の全民族構成を網羅しないため、7地方だけの着色でも「地方の最多民族分布図」と誤読させない表示が要る。

## 境界候補と利用条件の確認

| 候補 | 2020年・17地方 | PSGC対応 | 利用条件 | 判定 |
| --- | --- | --- | --- | --- |
| [Geoportal Philippines](https://geoportal.gov.ph/) | 地図画面と[公開アプリ](https://geoportal.gov.ph/gpapps/covidapp)の「Regional Boundary (APPROXIMATE)」表示は確認。対象境界の版・年は未確認 | 未確認 | 当該レイヤーの再配布条件未確認 | 通常のHTTP取得は入口で403。ファイルURLを特定できず、再試行・別経路の取得なし |
| [OCHA Humanitarian Data Exchange・Philippines administrative boundaries](https://data.humdata.org/dataset/cod-ab-phl) | カタログへのアクセスがHTTP 403で、ファイルの内容・年・17件は検証できない | 未確認 | ファイル単位の条件を原ページで確認できない | 拒否された原資料を再取得しない |
| [geoBoundaries PHL ADM1 公開メタデータ](https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM1/) | メタデータは `boundaryYearRepresented: 2020`、`admUnitCount: 17` | コード内容は未確認 | メタデータは CC BY 3.0 IGO と記し、原資料はOCHAと明記 | OCHA資料の再配布版。拒否された原資料の代替取得としてジオメトリを取得しない |
| [PSA現行PSGC](https://psa.gov.ph/classification/psgc) | 2026年9月時点で18地方。2020年国勢調査の17地方と異なる | 現行のコード表は公開案内あり | 境界ジオメトリではない | 2020年の面へそのまま結合しない |
| [PSA PSGC API案内](https://psa.gov.ph/classifications-api/psgc) | 掲載版はQ2 2021以降。2020年版は案内にない | `regions` エンドポイントにトークン必須 | API仕様のみ確認 | 2020年コードの根拠にしない |

## 地図化に必要な入力と検証

1. 正規に取得・再配布できる2020年の地方境界。17件の各ポリゴンに公式PSGCコードと地方名があり、原資料の版・取得日・ライセンスを記録できること。
2. PSAの2020年国勢調査における17地方名とPSGCコードの対応表。境界側と同じ年・同じ地方構成か、特にBARMMとビサヤの区分を照合すること。
3. 全17件のコードが重複なく結合し、上表7件の名称・値が一致することを機械検査する。残る10地方と地方内の他民族を0とせず、7値だけで地方の最多民族を決めない。地図に採用する場合は「2020年の地方別世帯人口に対する特定民族の割合」という集計図だと明記し、GeoEPRの居住域とは別レイヤーにする。

上記の入力がそろうまでは、既存の地点札とGeoEPR居住域の区別を維持する。マージ・公開判断はこの資料判定に含めない。
