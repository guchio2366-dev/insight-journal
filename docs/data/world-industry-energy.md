# 世界産業地図パイロット：エネルギー

確認日：2026-10-14。対象は天然ガス・LNG、原油・石油。世界を網羅するデータセットではなく、産地・加工・受入／需要の違いを読む代表地点。

## 収録と指標

- 天然ガスは豪州→日本のLNGとノルウェー→英国の管路供給、計6施設に加え、ノルウェー→欧州の輸送量を2つの地域案内点で表示（計8地点）。Gassco系統の地域輸送量を個別施設へ配分していない。供給側と受入側の同じ輸送量を足さない。ガス田面積・開発井数は参考指標であり、生産量ではない。液化設備はLNG質量、Nyhamna・直江津は標準状態のガス体積による能力。
- 石油は北海の産地、製油所3地点、需要国2地点の計6地点。米中需要は `kind: 地域` / `status: 地域集計`。国の案内点を都市や工場の需要量と読まない。
- 日量・年量、液体のLNGとガス、熱量、実績・能力を混ぜない。円の面積へ共通換算するための数値は提供していない。
- `year: 2026年10月確認` は更新年非表示の公式施設ページを確認した時点であり、2026年の年間実績を意味しない。
- EIAノルウェー資料は Johan Sverdrup の2023年値に711,000 / 712,000 b/dの表記差があるため、表示は両者と整合する「約71万バレル/日」に丸めた。
- 中国需要はEIAの2023年表にある32.2 quads。1 quad = 10¹⁵ Btu = 千兆Btu。石油・その他液体燃料の一次エネルギー消費であり、米国の製品供給量とは定義も単位も異なる。
- 「非公表／記載なし」は参照した施設説明に年間受入量がないことを限定的に示す。別の統計資料にも存在しないという主張ではない。

## 確認した一次公開資料

| 対象 | 資料と確認内容 |
| --- | --- |
| イクシス田・ダーウィン | [INPEX Australia](https://www.inpex.com.au/projects/ichthys-lng)：2018年開始、田面積約800 km²、890 km管路、Bladin Pointの2系列で年930万t LNGのピーク能力。別プロジェクトのDarwin LNGと区別。 |
| 直江津 | [INPEX施設説明](https://www.inpex.com/english/business/project/naoetsu.html)：2024年4月に最大送出能力を750万→825万Nm³/日へ改定。[2018年10月31日発表](https://www.inpex.com/english/news/english/news/assets/pdf/e20181031.pdf)：イクシス初荷到着実績。個別カーゴ量は記載なし。 |
| Ormen Lange | [ノルウェー政府・海洋庁](https://www.norskpetroleum.no/en/facts/field/ormen-lange/)：稼働、2007年生産開始、開発説明は生産井24本、井流を2本の管路でNyhamnaへ。 |
| Nyhamna | [Gassco](https://gassco.eu/en/prosessanlegg/nyhamna/)：輸出能力8,400万Sm³/日、Ormen Lange以外も受入。 |
| 英国向け管路 | [Gassco管路一覧](https://gassco.eu/en/about-us/where-we-are/pipelines-and-platforms/)：Langeled NorthはNyhamna→Sleipner 627 km、SouthはSleipner→Easington 523 km。[英国受入基地](https://gassco.eu/en/mottaksterminaler/the-united-kingdom/)：Easingtonで調圧・温度調整。施設説明は年受入量なし。 |
| 欧州向け地域輸送実績 | [Gassco年次表](https://gassco.eu/en/about-us/what-we-do/key-figures/)のGas transport：2025年に欧州受入基地へ114.9 billion scm、すなわち1,149億標準m³を輸送。サイト内の年途中比較表ではなく年次表を採用。 |
| 北海油田・Mongstad | [EIAノルウェー資料](https://www.eia.gov/international/content/analysis/countries_long/norway/)：2023年油田原油実績約71万b/d、Mongstad蒸留能力203,000 b/d。[ノルウェー政府の油田説明](https://www.norskpetroleum.no/en/facts/field/johan-sverdrup/)：現在の稼働・送油先。 |
| 初送油・初荷販売 | [Equinor 2019年10月21日](https://www.equinor.com/news/archive/2019-10-21-first-oil-sverdrup-mongstad)：283 km管路でMongstad到着。初荷100万バレルをUNIPECへ販売し、中国へ出荷予定。中国到着はこの資料では確認していない。 |
| Jamnagar | [Reliance Industries](https://www.ril.com/businesses/energy/refining-marketing)：単一立地複合拠点の原油処理能力1.4百万b/d。実績値ではない。 |
| Port Arthur | [EIA製油所能力表](https://www.eia.gov/energyexplained/oil-and-petroleum-products/refining-crude-oil-refinery-rankings.php)：2026-01-01時点Motiva施設656,400 b/d（暦日・稼働可能常圧蒸留能力）。同市のValero施設とは別。 |
| 米国需要 | [EIA FAQ](https://www.eia.gov/tools/faqs/faq.php?id=33&t=6)：2025年20.6百万b/d。消費の代理指標としての石油製品供給量であり、バイオ燃料を含む。 |
| 中国需要 | [EIA中国資料](https://www.eia.gov/international/content/analysis/countries_long/China/)：2023年表の石油・その他液体燃料32.2 quads（推計含む）。 |

## 線の意味

ガスの5本は2025年の地域輸送実績1例、既設管路の接続3例、2018年初荷の受入実績1例。石油の2本は2019年初送油と初荷の販売・出荷予定。実績、既設接続、販売／予定を `evidence` に書き分けた。実輸送量が資料にない区間は明示し、設備能力や管路長を輸送実績へ読み替えていない。管路の中間設備・船舶の航路は再現していない。各産業の一般的な工程順は `stages` で示し、推測の取引線は作成していない。

既存の地域版コードにあるノルウェー・南アジアの出典URLを手がかりに再確認した。指定された過去スレッド自体には、この担当ではアクセスしていない。Shell・Chevron等の一部URLは取得できず採用せず、Gassco・政府・INPEX・EIA等で確認できた記録に限定した。
