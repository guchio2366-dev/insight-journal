# 世界産業地図パイロット：銅・鉄鋼

確認日：2026-10-14。データ本体は `src/data/atlas/world-industry/metals.ts`。

代表地点の選定であり、生産拠点・取引の網羅データではない。緯度経度は施設・集計範囲の概略位置。異なる製品、集計範囲、実績／能力の数量を合算・共通の円尺度に使わない。

## 数量の一次資料

| 対象 | 採用値と範囲 | 確認箇所 |
| --- | --- | --- |
| Escondida | FY2026、1,261 千t-Cu、操業全体100%ベース、精鉱中銅＋カソード | [BHP Operational Review FY2026](https://www.bhp.com/-/media/documents/media/reports-and-presentations/2026/260716_bhpoperationalreviewfortheyearended30june2026.pdf)、p. 3 |
| WAIO | FY2026、291 百万t-鉄鉱石、複数鉱山の操業全体100%ベース | 同上 p. 4。BHP持分量257百万tと区別 |
| Hamburg | 2025暦年、451,775 t-精製銅、生産実績 | [Aurubis Environmental Statement 2026](https://www.aurubis.com/en/dam/jcr:0ef146d1-4255-4502-b5c6-c57fb98f9dba/20260703_Umweltbericht_2026_EN_interaktiv.2026-07-06-14-44-17.pdf)、Hamburg章 p. B-52（PDFの50ページ目） |
| 直島 | 年20万t超の電気銅、生産規模の紹介値。対象年の記載なし | [直島製錬所](https://www.mmc.co.jp/naoshima/)。年度実績／設計能力としては扱わない |
| Kalinganagar | FY2024–25資料、拡張後の粗鋼能力8百万t/年、立上げ中 | [Tata Steel Manufactured Capital](https://www.tatasteel.com/investors/integrated-report-2024-25/manufactured-capital.html) |
| Ludhiana | FY2024–25資料、計画電炉能力0.75百万t/年 | 同上。稼働判定は資料時点の「計画」であり、現在の稼働確認ではない |
| 中国／インド | 2024年鋼材見掛消費856.6／147.9百万t、国全体 | [worldsteel, World Steel in Figures 2025](https://worldsteel.org/data/world-steel-in-figures/world-steel-in-figures-2025/)、Apparent steel use表。粗鋼生産・企業シェア・都市需要とは区別 |

## 線の根拠

- 銅：Kennecottの採掘地点から製錬・精製施設。[Rio Tinto公式拠点紹介](https://www.riotinto.com/en/operations/us/kennecott)に、採掘・選鉱・製錬・精製の統合操業と、坑内採掘鉱石の既存施設での処理を明記。表示線は概略接続であり、移送量・輸送経路を示さない。
- 鉄鋼：Ghent製鉄所から同市のArtevelde Stadiumの屋根。[ArcelorMittalの公式利用事例](https://belgium.arcelormittal.com/en/what-we-do/applications-steel/arteveldestadion-gent)に屋根鋼板のGhent製造を明記。梁はルクセンブルク製。納入年・重量は資料に記載なし。

工程順の一般的な関係は `stages` のみで説明し、未確認の工場間取引として線にしない。Rohtak→Ludhianaは年次報告に将来供給の記載があるが、稼働中の供給線としては採用していない。

## 不明値と確認範囲

`非公表` は「今回確認した資料に施設単独の数量の記載がない」という意味で、世界中の全公開資料に存在しないと断定するものではない。Kennecottの鉱山／製錬所、Avellino、Pori、Rohtak、Ghent、スタジアム屋根の量はこの扱い。Ghentはベルギー4拠点合計の年500万t出荷を単独工場へ転用していない。

[Aurubis Sites](https://www.aurubis.com/en/about-us/group/sites)で所在地・製品を確認。Avellinoの[2025年炉更新発表](https://www.aurubis.com/en/media/press-releases/press-releases-2025/aurubis-upgrades-shaft-furnace-at-avellino-site-to-boost-copper-wire-rod-production)の増加率は絶対能力／実生産量へ転用しない。Poriの[公式会社紹介](https://www.aurubis.com/en/finland/about-us)にも生産量の絶対値は記載なし。

既存の東アジア・米国・欧州調査スレッドを参照できるツールはこの分担環境では確認できず、上記の公開一次資料を使用した。

Node 24でデータを実importし、地点ID・工程・座標・年／単位／範囲／出典・接続端点・供給根拠の不変条件を確認済み。画面／統合テストは親担当で実施。
