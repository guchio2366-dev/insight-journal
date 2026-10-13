# メキシコ農業統計・三列表示の原表状況（2026-10-13）

## 今回使用した保管済み原表

- DGSIAP 2025年農業・畜産年次統計：`data-source/atlas/mexico/agriculture-v2/` に原CSVと辞書を保管。全国生産量・生産額と32州の値を既存ページから継承。
- FAOSTAT QCL（生産量、要素5510、t、2024年）：保管済みの2抽出から、メキシコ（138）と世界（5000）の同一品目・同一年の行を照合。コーヒー生豆、骨付き牛肉、牛の生乳、骨付き豚肉、鶏肉、殻付き鶏卵の6品目だけ単年比を表示。元ファイルのSHA-256と各品目コードは `src/data/atlas/mexico/agriculture-comparison-2024.json` に記録し、`scripts/prepare-mexico-agriculture-comparison.py` で再生成する。
- コーヒーのSIAP 2025年値は果実、FAOSTAT 2024年値は生豆。数量を差し引かず、同一系列にも接続しない。生乳もSIAPの千LとFAOSTATのtを換算せず、別々に示す。

## 未収録の原表と取得対象

| 指標 | 必要な公式原表・照合条件 | 現状 |
| --- | --- | --- |
| 供給と用途 | [FAOSTAT Supply Utilization Accounts](https://www.fao.org/faostat/en/#data/SCL) のメキシコ行。品目と加工段階、年、単位、国内生産・輸入・輸出・在庫・食用/飼料/その他用途を対応させる。 | 原表未保管。SIAP生産量だけ表示。収支や自給率は未計算。 |
| 輸出相手 | [FAOSTAT Detailed trade matrix](https://www.fao.org/faostat/en/#data/TM) のメキシコを報告国とする輸出数量。相手国、品目、年、単位、合計と重複しない集計を照合する。 | 原表未保管。米国GATSの相手国を転用しない。 |
| 世界生産比の複数年推移 | [FAOSTAT Crops and livestock products](https://www.fao.org/faostat/en/#data/QCL) のメキシコと世界について、同一品目・要素5510・年・tの2015–2024年対応行。 | 保管済み原表からは6品目の2024年単年比のみ表示。欠けた年を補間しない。 |

FAOの公開案内は、SUAが国別食料供給を年ごとに編成し、貿易と生産の資料を用いると説明している。QCLは作物・畜産物の生産量を収録する。今回の実行環境の有効な通信許可表には、FAOSTATの原表配信先 `bulks-faostat.fao.org` が含まれていない。未取得はこの作業でのHTTP拒否という意味ではない。原表への直接取得操作は行っておらず、通信設定も変更していない。Library ZIP取得の既知の403は、この三列表示作業には関係しない。
