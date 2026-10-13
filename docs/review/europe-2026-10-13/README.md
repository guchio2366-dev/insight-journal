# 欧州 Draft #335 継続点検（2026-10-13）

このチェックポイントは [前回の要求・取得記録](../europe-2026-10-12/README.md)と [PR #335](https://github.com/guchio2366-dev/insight-journal/pull/335) の続きです。公開・マージは行わず Draft のままにします。下記の原資料待ちを含むため、欧州依頼全体を完了としません。

## 今回反映した部分

- 水資源の地図と右欄にライン、ドナウ、セーヌ、テムズ、ドン、ヴォルガ、ウラルを同じ「本流の水系」として置いた。保存済み5水系は同じ `MAIN_BAS` の区画を統合した輪郭を名称・線・セレクトから選べる。テムズとウラルには対象の原流域面がないため、河川線と名称だけを強調し、無関係な英国沿岸の区画やカザフスタン側の推定面を描かない。元の `HYBAS_ID` 区画は補足に残した。現在の5面は対象国・表示枠で切れ、自然全流域ではない。
- 既存の畜産の牛は GLW4 2020 の乳用・肉用を分けない合計であることを地図ラベルにも明示した。元の牛の概略面内で原格子値が正の西フランスにラベルを移し、豚・鶏・羊のラベル衝突を避けた。面・値・他品目は変更していない。果樹・園芸の3集合品目と酪農専用／ブドウ／オリーブの未収録を右説明・凡例で区別した。
- 保存済み一次資料のチェコ2021年の公表地域における母語割合8行と、アイルランド2022年の10都市でのアイルランド語の日常使用の例を右欄の表へ追加した。前者は母語回答者が分母、後者はアイルランド語話者が分母。地図の欧州全域の実使用分布を埋めたと扱わない。民族と宗教の現在の全国値・限定された地方値もそのまま残す。
- テストでは7名称のクリック、選択・再読込・履歴、輪郭有無、カメラと名称位置の固定、牛／鶏の衝突、他品目、言語表と欠測文を通常／簡易1920×1080 CSS 100%・DPR1で確認した。[変更部の画像と機械検査](images/checks.json)。既存PC画像は別チェックポイントにある。

同梱画像はコミット前の候補で、`checks.json` の `commitSha=local` を最終headの証拠として扱わない。最終headのproduction releaseとの一致はコミット後の別検査とPR本文に記録する。

## 原資料で止まっている範囲

| 要求 | 確定している障害 | 最小入力 |
|---|---|---|
| 7自然全流域と本・支流 | 5水系の面は表示国で切断。テムズの旧Level4は北緯58.62度までの英国沿岸合算、ウラルは欠測。GRDC公式選択アプリの初回GETはCONNECT tunnel 403。旧Figshare `https://figshare.com/ndownloader/files/20087237` と River候補 `20087486` の403は応答ヘッダー未保存でサイト／Tunnelの判定不能。 | [GRDC Major River Basins公式選択アプリ](https://mrb.grdc.bafg.de/)から7名称（Rhine, Danube, Seine, Thames, Don, Volga, Ural）を選んだ流域GeoJSONと別の本流／河道ネットワーク、技術文書・使用条件。選択ZIPの正確なfilename、size、CRSは未確認。単に元L4を再配布してもテムズは解決しない。 |
| 酪農専用の地域面 | Eurostat `agr_r_milkpr?lang=EN&time=2023` の原表を取得できず、旧GETのCONNECT tunnel 403。全牛モデルは乳牛を区別できない。 | `agr_r_milkpr` の2023年NUTS2生乳量の原行と地域code・単位・flags、版の合うGISCO NUTS境界と別々の再利用条件。 |
| ブドウ・オリーブの個別面 | CORINE Land Cover 2018配信は旧403。旧URL・応答種別は保存されず、推測による再試行をしない。別製品のLUCAS2018 CSVの初回GETもCONNECT tunnel 403。 | [CLC2018](https://land.copernicus.eu/en/products/corine-land-cover/clc2018) の `221` vineyards と `223` olive groves の図形subset、年・版・CRS・[利用条件](https://land.copernicus.eu/en/data-policy)。土地被覆であり生産量ではない。 |
| Helsinki Kaisaniemi の雨温図 | 保存JMA地点2978、1991–2020の気温12か月はあるが降水12か月は欠測。FMI通常サイト表の初回GETはCONNECT tunnel 403。今回の独立FMI open-data WFS metadata初回GETも同じ段階で失敗。別地点Helsinki-Vantaa JMA候補も同様に失敗し、Kaisaniemiの値へ流用しない。 | 同一観測所・1991–2020の月平均気温・降水の各12行、地点名と番号、単位・品質・再利用条件。FMI通常web表とopen-dataの権利は別なので権利を示す原ファイルが必要。 |
| 民族・宗派／無所属・言語の欧州域内分布 | 既存のEngland/Wales 2021 LAD331、チェコの公表数値、国別SMRE/Pew等は地域・定義をまたぐ。チェコ14県の実境界GETはCONNECT tunnel 403。今回の独立Poland NSP2021三主題XLSX、ONS TS024言語ZIPも初回GETでCONNECT tunnel 403。国別割合を国内の架空の色面に展開しない。 | 同じ年・定義の行政単位別原統計と対応境界、帰属・分母・無回答・複数回答・再利用条件。最小追加候補はチェコ14県の正規GeoJSON1個、Poland 2021の16県3主題XLSX、England/WalesのTS024 ZIP。これらだけで欧州全域の分布完成にはならない。 |

すべての今回の独立取得URL・正確なエラーは [acquisition-summary.json](sources/acquisition-summary.json) に保存。拒否されたURLの反復やミラー、権限拡大、課金、認証変更は行っていない。今回のCONNECT tunnel 403はpublisherのHTTP応答ではない。旧Figshareの403は上記のように種別未確定。サイズと内部ファイル名の未確認箇所を確認済みとして書かない。提供時は元ファイルと同梱metadataをそのまま渡せば、受領後にSHA256、実サイズ、CRS、識別子、面の完全性と再利用条件を照合できる。

具体的な取得経路・既存保存物・各出典の定義は [水系](../europe-2026-10-12/sources/water/report.md)、[農畜産と気候](../europe-2026-10-12/sources/agri-climate/report.md)、[民族・宗教・言語](../europe-2026-10-12/sources/culture/report.md)に記録済み。一次表の取得が必要という状態であり、統計的な推測・全国値の面塗り・言語と民族の同一視による穴埋めは行わない。
