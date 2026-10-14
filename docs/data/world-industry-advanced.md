# 世界産業地図：半導体・太陽電池・蓄電池の資料メモ

確認日：2026-10-14。担当データは `src/data/atlas/world-industry/advanced.ts`。
指定された過去調査スレッドは、この作業環境から参照できなかったため、公開一次資料を実際に開いて再確認した。

3産業各4工程・8地点、計24の代表地点。全拠点・全品種・各地域の産業総量を網羅しない。
座標は都市・工業地区の案内位置で、敷地境界・輸送路ではない。
拠点別の能力が確認できない箇所は数量を推定せず「数値未収録」とした。
データ型の `非公表` は、確認した資料に該当拠点の数量がない意味で使用しており、他資料にも一切存在しないと断定するものではない。

## 数量を収録した地点

| 地点 | 数量・対象年 | 扱い・範囲 | 一次資料 |
| --- | --- | --- | --- |
| Arm San Jose | 400人超・対象年未記載 | 技術・機械学習・営業・管理など全職種の従業員。設計者数や製造能力ではない参考指標 | [Arm拠点紹介](https://careers.arm.com/usa-san-jose-office) |
| JASM 熊本第1工場 | 55,000枚/月・2022年2月発表 | 12インチの当初計画能力。現在の実現能力ではない。2025年報で2024年末の量産開始を別途確認 | [当初計画](https://pr.tsmc.com/english/news/2911)、[2025年報](https://investor.tsmc.com/static/annualReports/2025/english/index.html) |
| GF Dresden | 950,000枚/年・対象年未記載 | 現行拠点ページの300mm換算の設備能力。将来の拡張目標と別 | [GF拠点紹介](https://gf.com/manufacturing/dresden/) |
| GF Singapore | 約1,500,000枚/年・2023年発表 | 拡張後の拠点全体、300mm換算。新設棟だけの数量ではない | [拡張発表](https://gf.com/news-and-events/news/globalfoundries-officially-opens-us4-billion-expansion-facility-in-singapore-creating-1000-new-jobs/)、[現行拠点紹介](https://gf.com/manufacturing/singapore/) |
| OCI Samalaju | 35,000t/年・対象年未記載 | 親会社の公表年産規模。特定年の実生産量・稼働率は示されないため参考指標 | [OCI Holdings事業紹介](https://www.oci-holdings.co.kr/en/business/green-energy)、[製造拠点](https://www.ociterrasus.com/about) |
| Qcells Cartersville | 3.3GW/年・2026年6月発表 | セル工程のフル稼働時の計画能力。生産開始確認と能力達成は別。併設工程を合算しない | [Qcells発表](https://us.qcells.com/blog/qcells-begins-solar-cell-manufacturing-at-americas-first-and-only-vertically-integrated-solar-factory-in-cartersville-georgia/) |
| Qcells Dalton | 5.1GW/年・2023年末拡張、2026年再掲 | モジュール工程の設備能力。別工場と別集計 | [同発表](https://us.qcells.com/blog/qcells-begins-solar-cell-manufacturing-at-americas-first-and-only-vertically-integrated-solar-factory-in-cartersville-georgia/) |
| REC Singapore | 4,000,000枚/年・対象年未記載 | 工場紹介の年間製造枚数の目安。設備能力や暦年生産実績と断定しない。GWへ換算しない | [REC工場紹介](https://www.recgroup.com/en/made-in-singapore) |
| Albemarle Atacama | リチウム濃度約6%・対象年未記載 | 蒸発濃縮後のかん水濃度。年間の量・能力ではない参考指標 | [Albemarle Chile](https://www.albemarle.com/us/en/global-locations/chile) |
| POSCO 光陽 | 90,000t/年・2022年11月 | 正極材工場の拡張後設備能力。EV台数相当や会社合計を代用しない | [POSCO Future M発表](https://www.poscofuturem.com/en/pr/view.do?num=638) |
| Panasonic Nevada | 約41GWh/年・2025年7月 | Nevadaのセル能力。Kansasの将来32GWhを加算しない | [Panasonic発表](https://na.panasonic.com/news/panasonic-energy-begins-mass-production-at-new-automotive-lithium-ion-battery-factory-in-kansas-aiming-for-annual-capacity-of-32-gwh-to-accelerate-us-local-production) |
| Tesla Lathrop | 40GWh/年・対象年未記載 | Megapack組立能力、年1万基相当。セル能力ではない | [Tesla Megafactory](https://www.tesla.com/megafactory) |

対象年未記載の資料は、確認日を統計対象年に置き換えず、その旨を画面用データにも記載。
ウエハー枚数、装置台数、t、GW、GWh、人数、濃度は異なる尺度で、同じ円サイズに換算しない。
GWは定格出力、GWhは蓄電容量。セルとモジュール・パックを工程横断で足し合わせない。

## 地点と工程を選ぶ際の留意点

- ASML Veldhovenは装置製造、Siltronic Burghausenは基板ウエハー製造。回路を形成する前工程と分けた。
- 半導体の設計と材料・装置は前工程を並行して支える役割であり、設計から材料製造へ一列に進む意味ではない。
- TSMC竹南AP6とAmkor Bac Ninhは後工程の代表。メーカー間の個別取引・移送を推定していない。
- WACKER Nünchritzのポリシリコン生産は現行公式ページで確認。20,000t/年の拠点能力は一次資料で確認できず不採用。
- LONGiの楚雄・Kuching・蕪湖は公式の工程別所在地・工場発表で確認。会社全体の出荷量を工場へ配分しない。蕪湖の15GW第2期案は2025年報に中止記載があるため、稼働能力に使用しない。
- OCI TerraSusの既存太陽電池向け工場と、Tokuyamaとの半導体用合弁増設計画は別。
- BASF Schwarzheideの正極材工場と併設リサイクル設備の能力は別。POSCO浦項は人工黒鉛負極材で、シリコン系実証設備や将来のVietnam計画を含めない。
- CATL寧徳は実際の生産拠点を表示。会社世界シェア・全拠点の出荷量を当地の能力に使用しない。

## 供給線

実線データは **Albemarle Atacama → La Negra** の1件のみ。
[Albemarle Chile公式紹介](https://www.albemarle.com/us/en/global-locations/chile)が、蒸発池で濃縮したかん水をAntofagastaのLa Negraへ輸送し、精製・化学転換すると説明している。
これは同一企業内の実際の工程間移送であり、他企業との取引推定ではない。描画線は地点の関係を示し実輸送路を示さない。
その他の一般的な工程接続は `stages` に記述し、地図上の取引線を捏造しない。

## 検証

NodeのTypeScript型除去によるデータ読み込みで、3産業・各4工程、全工程に地点あり、24地点のID重複なし、座標範囲、全規模欄、HTTPS出典、供給線の端点と根拠を確認。
実画面・UI操作・ビルドは親担当で検証し、この分担ではデータファイルと資料メモのみを変更。コミット・公開は実施していない。
