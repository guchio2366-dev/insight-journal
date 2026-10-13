# 欧州 農畜産・Helsinki原資料調査（2026-10-12）

結果: 新しい採用可能な原数値表／地理データは取得できていません。保存済みの根拠と独立候補、取得停止の正確な記録を整理しました。共有repoのコードは変更していません。

## Helsinki

既存JSONは JMA ClimatView station `2978`, `HELSINKI KAISANIEMI -FINLAND`, `[24.95,60.18]`, 高度4m、期間1991–2020。降水12か月はすべて `null`。気温は保存されており、描画だけの問題ではありません。元情報の複製は `helsinki-existing-jma.json`。

[FMI降水平年表](https://www.ilmatieteenlaitos.fi/1991-2020-sadetilastot)は期間1991–2020、`ID / Havaintoasema / Kk / Sadem.` が必要です。`Kk` 1–12が月、13が年、`Sadem.` が平均降水mmです。最大値・最小値と混同しません。web readerでは最初の別地点13行だけ表示され、Helsinki行は未取得。原HTML保存GETは CONNECT 403で停止しました。

[FMI気温平年表](https://www.ilmatieteenlaitos.fi/1991-2020-lampotilatilastot)も存在します。Helsinki Kaisaniemi のFMI番号候補100971は第三者station照合で見つけたものなので、一次表の名称一致を見て確定してください。JMAの気温にFMI降水だけを入れる場合は、地点・期間・正常値の作成方法を要照合。確実なのは同一原資料の気温と降水12か月を揃えることです。

権利の注意: [FMI open-data service](https://en.ilmatieteenlaitos.fi/open-data-licence)はCC BY4.0ですが、[通常website規約](https://en.ilmatieteenlaitos.fi/site-information)は別で、他web/appへの気象・気候情報の抽出利用を制限しています。web表のExcel/PDF exportも自動的にopen-data licenceとみなせません。個別のopen-data指定／利用条件を同梱してください。

[WMO CLINO 1991–2020](https://www.ncei.noaa.gov/products/wmo-climate-normals)は独立した正規公表。欧州原データ一覧の初回GETもCONNECT 403で停止。station02978の実ファイル名とサイズは未確定です。[FMI Reports 2021:8](https://doi.org/10.35614/isbn.9789523361485)のHELDA入口はAnubis Access Deniedで停止しました。

## 農畜産

旧台帳の `agr_r_milkpr?lang=EN&time=2023` とCLC2018配信403は再試行していません。別経路への切替もしていません。NUTS2生乳原表は未保存で、地域code・品目・単位・年・値・欠測／秘匿flagが必要。統計の[Eurostat再利用条件](https://ec.europa.eu/eurostat/web/main/help/copyright-notice)とGISCO境界条件は別です。原表のNUTS版に一致する境界を使い、全国値を国内帯へ分配しません。

CLC2018の必要入力は221ブドウ畑・223オリーブ畑の正式subsetとCRS/版/年/条件metadataです。これは土地被覆であり、生産量や収穫量ではありません。URL不明の旧拒否を調べて迂回することはしていません。

独立候補:

- [JRC EuroCropsV2](https://data.jrc.ec.europa.eu/dataset/b9fb9e67-78a9-4327-9d59-39a928d812d3): 作物申告の実農区画。CC BY4.0を[配信先copyright](https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/DRLL/EuroCropsV2/gpqtv201/copyright.txt)でも確認。全欧州を網羅せず、未収録部分をゼロとみなせません。[publisher README](https://github.com/Martincccc/EuroCropsV2)のgeomはEPSG:3035、original_codeをHCAT4 mappingで照合。ブドウ／オリーブ該当codeは未取得なので推測していません。Toscana候補 `iti1_2023.parquet` の初回Range GETはCONNECT403で停止。
- [CAPRIモデル原研究](https://www.nature.com/articles/s41597-026-06919-8): 乳牛／非乳牛を分ける独立モデル候補。地域統計の空間配分結果を実測農場境界として扱いません。必要packageは `fsulucategory_luperha.zip` と `fsucroparea_ha.zip`、対応readme。CC BY4.0は原研究Data Recordsで確認。Zenodo record初回GETはCONNECT403で、サイズ／CRS／個別作物code未確認。
- [2020農業センサスの統計Atlas](https://essd.copernicus.org/articles/17/3893/2025/): 実際の農業センサスを1–40km可変グリッドに集計。独自の均等割当とは異なりますが、原研究ではドイツを非公開。乳牛別原表を含むかは未確認です。論文CC BY4.0とデータ条件を混同せず候補止まり。
- [JRC地域作物統計](https://data.jrc.ec.europa.eu/dataset/685949ff-56de-4646-a8df-844b5bb5f835): NSI／Eurostatに基づく面積・生産量・単収の独立集成。データはXLSX。ブドウ・オリーブの収録範囲は未確認。原表を取得していないため追加面は描けません。

Irelandの『〇非』: repoの `ie-nw-other-cows` は2020北部・西部NUTS2の「非乳牛395,751頭」例。肉牛出荷量ではありません。対になる南部「乳牛1,124,842頭」とともに飼養頭数の局所例です。意味はあるものの略号は不適切。札は撤去し、右説明に「乳牛以外の牛」と明記できます。全欧州酪農分布の代わりにはなりません。

## 最小限の提供で再開する方法

1. Helsinki: 同一観測所の1991–2020月平均気温・月平均降水12行（原表PDF/Excel、名称・ID・期間・単位・個別再利用条件を残す）。WMO原提出CLINOまたは権利確認済みFMI open datasetを優先。空港・Kumpula等でKaisaniemiの欠測を黙って埋めない。
2. 酪農: agr_r_milkpr 2023 NUTS2全行をCSV/TSV/JSON export。flags/code/単位/定義を残し、対応NUTS境界条件を別同梱。
3. ブドウ／オリーブ: CLC2018 classes221/223 subsetのGPKG/shape一式とmetadata。元データ条件を保持。
4. 代替候補EuroCropsなら、[正式配信一覧](https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/DRLL/EuroCropsV2/gpqtv201/)から同一年の該当作物だけをGPKG等に抽出し、original_codeとHCAT4対応、geometry/CRS/収録地域/欠測の意味を残す。公開directoryの概数は `iti1_2023` 182M、`es_2023`12G、`fr_2023`3.5G、`pt_2023`1.3G。これは原ファイル全体の丸めた表示で、subsetサイズは不明。

正確な試行URL/errorは `download-denials.json`、機械可読の候補・条件・不足は `source-record.json`。承認審査拒否はなく、すべて接続／サイトアクセス上の障害です。権限変更・認証・課金は行っていません。
