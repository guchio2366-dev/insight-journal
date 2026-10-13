# 欧州文化資料調査 — 2026-10-12

今回の取得範囲では、欧州全体の現代民族居住分布を実装できる原図形は得られていません。宗教の国内実分布も 45 か国を通して作れる状況ではありません。母語／実使用の正規数値は一部保存しましたが、これを全欧州完成とは扱えません。国率から細地域・人口グリッド・居住境界を生成する材料には使用しません。

コード・既存データ・ブランチには変更を加えていません。資料はこのディレクトリだけへ保存しました。

## 保存済みの実数値

`primary-culture-numeric-extracts.json` は一次機関の web reader 出力から数値を転記した抜粋です。原 XLSX の保存に成功したものとは区別してください。年・対象・分母・定義・二重計上・出典・利用条件・不足を各 dataset に保持しています。

- Czechia 2021: 母語 10 分類について「一つだけ」と「第二言語を含む」を別保存。全国総人口 10,524,167、母語未回答 759,394。母語は最初に習得した言語、2 言語まで回答可。公用語制度の表ではありません。
- Czechia 2021: 民族自己認識 10 分類を母語とは別保存。第二民族を含む値は重複を含みます。民族未回答 3,321,058 を消しません。Czech/Moravian/Silesian、Slovak/Polish/Romany 等の値がありますが、全国人数は国内位置を示しません。
- Czechia 2021: Prague、Vysočina、South Moravia、Zlín、Olomouc の母語に関する一次記事の実県値 8 件。県の形状は未取得。完全な 14 県表ではありません。
- Ireland 2022: Census Profile 8 Table 1.6、Irish の毎日使用が多い実在 10 町の人数と割合。**分母は 3 歳以上の Irish 話者で、町の全住民ではありません。** 教育内だけの使用は除外、教育内外の毎日使用を含む。町の正規図形・アンカーは未取得。Gaeltacht の制度境界をそのまま実使用分布として塗りません。
- Åland 2020: UNSD の実集計、総人口 30,129、Swedish 25,986、Finnish 1,405、Other 2,738。UN 表は「language」と表示し、母語・家庭使用の詳細定義は元機関のメタデータ照合が必要。国内境界は作りません。

CZSO 統計は商用を含む複製・配布・引用可、出典表示・意味を変更しない条件です。[利用条件](https://scitani.gov.cz/podminky-uzivani-dat)。CSO 統計は [CC BY 4.0](https://www.cso.ie/en/aboutus/whoweare/copyrightpolicy/)。UNdata は [出典表示による複製・再配布可](https://data.un.org/Host.aspx?Content=UNdataUse)。保存 JSON の源ページリンクは各値に対応します。

## 最小の追加入力で進められる資料

### Czechia 2021 — 形状＋民族＋母語＋宗教を一つの公式ファイルで

[公式 open-data カタログ](https://data.gov.cz/dataset?iri=https%3A%2F%2Fdata.gov.cz%2Fzdroj%2Fdatov%C3%A9-sady%2F00025593%2F85a846845abaa196144637618d9ced38) が、14 kraj/NUTS3 の公式行政図形と選択統計を公開しています。基準 2021-03-26、提供側の一般化解像度 100 m。カタログの権利欄は著作権のある作品／DBでない、sui generis DB 権なし、個人情報なし。境界をさらにぼかす必要はありません。これは公式行政集計の面であって、民族や宗教の居住境界ではありません。

[公式 FeatureServer 10100](https://geodata.csu.gov.cz/server/rest/services/Hosted/sldb2021_obyvatelstvo/FeatureServer/10100) の項目定義は取得できました。`cz-census2021-regions-source-metadata.json` に分野別の field dictionary を保存しています。

- 母語: Czech、Moravian、Slovak、Ukrainian、Russian、Polish、German、Vietnamese、Romany、English と未回答／単数／複数。
- 民族: Czech、Moravian、Silesian、Slovak、Ukrainian、Vietnamese、Polish、Russian、German、Romany と未回答／単数／複数。
- 宗教: Roman Catholic、無宗教、教会への所属、教会に属さない信仰、未回答。提供列だけで全 Protestant/Orthodox/Islam に細分することはできません。

初回通常 GET は CONNECT tunnel 403。サイトに届いておらず publisher の HTTP 応答はありません。再試行・別経路・同資料のミラー取得はしていません。

ユーザーの最小提供手順:

1. 上の公式カタログで **geojson Download** の ZIP をダウンロードし、そのまま提供する。
2. または次の公式 query を通常のブラウザーで開いて `cz-census2021-regions.geojson` として保存・提供する。14 feature、UTF-8 GeoJSON、WGS84、全列を含む指定。

```text
https://geodata.csu.gov.cz/server/rest/services/Hosted/sldb2021_obyvatelstvo/FeatureServer/10100/query?where=1%3D1&outFields=*&outSR=4326&f=geojson
```

ファイルのバイトサイズ／ZIP 内の正確な filename は取得できていないため未確認です。値列が第二民族／第二母語を含むかは alias だけで断定せず、取得後に保存全国抜粋と総和照合してください。Czech 母語の一つだけの全国数は 8,996,475、第二言語込みは 9,213,987。Czech 民族はそれぞれ 6,033,014 と 6,415,104 です。この違いを使って定義を点検できます。

市町村版も公式カタログにありますが、県版を拒否された後に細分版へ経路を切り替えて取得していません。最初の実装支援は 14 県の上記 1 ファイルでよい見込みです。

### Swiss religion 2024 — canton の実地域集計

[FSO 表 36347568](https://www.bfs.admin.ch/bfs/en/home/news/whats-new.assetdetail.36347568.html): `Religionszugehörigkeit nach Grossregion und Kanton`, 2010–2024、恒常居住人口 15 歳以上。全国最多分類しかない SMRE より地理的な単位は細かいですが、これは canton 全体の所属割合であり細居住境界ではありません。

```text
https://www.bfs.admin.ch/bfsstatic/dam/assets/36347568/master
```

初回通常 GET は CONNECT tunnel 403。原 XLSX・size・シート定義・FSO 再利用条件の詳細は未取得／未検証なので**採用可能ファイルとは扱いません**。FSO の元ページから XLSX の提供が得られれば、権利確認と原列確認後の canton 面＋右割合が可能です。FSO には actual main languages の district pooled 2022–2024 表 36491978 もありますが、本調査では値・形状・権利を揃えて取得していません。

### Estonia — 2021 の母語／民族／宗教

RL21434 は 2021-12-31 の母語×行政単位×年齢×性別。初回 API メタデータ GET が CONNECT tunnel 403 で停止しました。

```text
https://andmed.stat.ee/api/v1/en/stat/rahvaloendus/rel2021/rahvastiku-demograafilised-ja-etno-kultuurilised-naitajad/rahvus-emakeel/RL21434.px
```

API の variant や別配信先へ切り替えていません。原値／行政 shape 未取得。既存保存の RL21452 宗教 7 地点の一部例は保持できますが、それを全域民族／宗教図の完成扱いにしません。[一次 Census の説明](https://rahvaloendus.ee/en/results/demographic-and-ethno-cultural-characteristics-of-the-population) は民族、母語、会話能力、方言を別設問として明確に分けています。

## 欧州全体の不足と候補の判断

- **民族全域:** 許諾確認済みの現代全欧州居住図形は本調査で見つかっていません。GeoEPR は既記録の政治的部分集合なので単独採用不可。GREG は 1964 Soviet Atlas Narodov Mira 由来で、権利が未確認かつ現在の移住・混住を表せません。時期の古い面を現代の実分布として塗る案は採りません。人種・母語・国籍を民族の代理にはしません。
- **宗教全域:** SMRE 45 国の 2006–2015 全国率は保持可能。ただし全国率から地域内の Catholic/Protestant/Orthodox/Islam/no-affiliation の境界を作れません。全欧州の宗派・無所属の広域実分布まで今回の保存値で完成にできません。地域値の上書きには同定義の母集団、出典年、未回答、全カテゴリーの保持が必要です。
- **言語全域:** 母語は actual spoken-language に関する測定ですが、家庭使用／会話能力／公用語表を同じ系列に混ぜません。2024 Eurobarometer SP540（調査 2023、EU27）を公式に発見しました。対象年齢・市民の条件・母語複数回答の原質問票は本調査で取得できておらず、実装前の照合が必要です。公式 survey ページは JS で表値なし、Publications Office 原資料は初回 open が HTTP 429。反復しておらず、国内居住 shape を含む資料でもありません。[公式 survey](https://europa.eu/eurobarometer/surveys/detail/2979)、[公式データカタログ](https://data.europa.eu/data/datasets/s2979_100_1_sp540_eng?locale=en)。報告 PDF 原表が提供されても、国全体測定だと明示して使い、国内帯を作りません。
- **UNdata languages:** [一次統計の UN 集約表](https://data.un.org/Data.aspx?d=POP&f=tableCode:27) は 2026-08 更新、43,861 行、国別元年を持ち、複製再配布条件は明確。Europe の多数国が入っていますが France/Germany/Italy/Spain 等の完全網羅はありません。画面の Comma download は上限 100,000 行なので当表全行は上限内。原 CSV を提供してもらえば各国の latest observation を整理できる見込みですが、定義は原国勢調査に照合が必要、地域 shape は含みません。今回 filtered view は tool で inaccessible、原 CSV は未取得です。
- **Spain languages:** INE 2021 ECEPOV は実初期言語と使用頻度を行政地域・県単位に提供。Catalonia の初期言語表 `tpx=55536` 等を発見しましたが JS により値なし。原表の download filename／size／定義／利用条件を全部揃えていないため未採用。[公式地域表](https://www.ine.es/dynt3/inebase/es/index.htm?capsel=9019&padre=9014)。複数言語地域を公用語制度で代用しません。

## 実装担当への引継ぎ

1. 保存数値は右説明・補足統計へ使えます。初期 Europe 全域の地図を何もない注釈だけで完成としないでください。
2. 現存の SMRE 全国値の割合札を撤去し、全国背景を保つ独立 UI 修正は可能ですが、それだけで宗教実分布要件達成とは言いません。
3. 本調査による文化3項目をまとまって面実装へ進める最小追加入力は **CZSO 14県 GeoJSON 1 個**です。面の意味は実県集計、境界は保持。Czechia は全欧州の部分であることを表示します。
4. 全欧州民族／宗教実分布には追加の合法原資料が必要です。国全体統計しかない場所は不足として残し、部族・語族・国籍の推定面を描きません。
5. 全 acquisition 失敗は `acquisition-errors.json`。自動承認拒否ではなくネットワーク／取得応答で、権限拡大・課金・安全制限回避・署名 URL・ミラー迂回は行っていません。
