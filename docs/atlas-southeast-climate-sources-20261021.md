# 東南アジアの雨温図・出典確認（2026-10-21）

## 追加：プノンペン

- 資料：気象庁 Tokyo Climate Center, ClimatView「Monthly Normal」
- [観測所の月別平年値表](https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml_nrm.php?e=6&k=0&m=9&n=48991&r=0&s=1&y=2025)
- 観測所：PHNOM-PENH (KHMOUGH), Cambodia, WMO 48991。北緯11.60度・東経104.87度、標高10m。
- [ClimatViewの仕様](https://ds.data.jma.go.jp/tcc/tcc/products/climate/climatview/outline.html)で、月平均気温・月降水量の平年期間が1991–2020と確認できる。資料はCLIMATとGHCNに基づく。
- 月平均気温は摂氏、降水量はmm。1〜12月の各12値を同じ観測所・同じ平年期間で採用。欠測月は両系列ともなし。全国平均ではない。
- 降水量の月別値の合計は1,455.0mm。2月が最少4.6mm、9月が最多266.2mm。気温は12月26.9℃〜5月30.5℃。
- 利用条件：[気象庁のコンテンツ利用について](https://www.jma.go.jp/jma/kishou/info/coment.html)。

### 取得方法とハッシュの意味

公式表を検索・ページ取得サービスで読み、上記の観測所情報と24個の値を転記した。この環境では直接HTTP取得がDNSエラーになったため、原HTMLのハッシュは得られていない。`sourceSha256`は原HTMLを取得したと装うものではなく、次の検証済みTSVのUTF-8バイト列のハッシュである。`sourceHashKind: 'verified-table-tsv'`で既存のHTMLハッシュと区別する。

以下のコードブロック内の文字列を使用する。列区切りはタブ、改行はLF、末尾にLFを1つ含む。SHA-256：`9b531d26d8562564cd5e270c2b08ec1331bc4035cfdf0096abebc9ff89b13319`。

```tsv
month	temperatureC	precipitationMm
01	27.0	15.0
02	28.0	4.6
03	29.7	31.8
04	30.3	92.8
05	30.5	128.4
06	29.6	166.3
07	29.0	171.3
08	29.0	181.4
09	28.4	266.2
10	28.3	260.2
11	28.1	103.5
12	26.9	33.5
```

再生成用の`STATIONS`にも48991を追加した。通常の生成処理では観測所ディレクトリと2年分の表内の平年値の一致を確認し、取得したHTMLのハッシュに置き換わる。既存の値を無関係に更新しないため、今回、全観測所の一括再取得は行っていない。

## 東ティモール：同じ比較表への追加を保留

1991–2020の同一観測所・12か月の気温と降水量を、公的原表で確認できなかった。これはデータが存在しないという断定ではない。

- [東ティモール気象地球物理局DNMGのClimateページ](https://dnmg.gov.tl/en/climate/)では、Historical ClimateとClimate Dataが「Not currently published」とされていた。
- [JICA「The Project for Study on Dili Urban Master Plan」最終報告書、第2章](https://openjicareport.jica.go.jp/pdf/12268603.pdf)にはDili Airportの2005–2013年の月平均降水量がある。DNMGの資料に基づく9年間の平均で、1991–2020平年値とは期間が異なるため混ぜない。
- 同報告書の降水量は1月から順に107.0, 133.0, 87.5, 116.4, 80.0, 31.6, 39.9, 5.3, 16.4, 41.9, 72.8, 170.0mm（公表年合計902.0mm）。この列を既存の雨温図データには追加していない。
- Wikipediaに1991–2020という記載はあったが、対応する原表へのリンクと数値を検証できなかったため不採用。
- [WMO/NCEIの標準平年値案内](https://www.ncei.noaa.gov/products/wmo-climate-normals)も確認した。地域別アーカイブは取得時にタイムアウト・リダイレクトエラーとなり、未収録であることの証拠にはしていない。

追加後の東南アジアの観測所は16地点・10か国。東ティモールは未収録として明示し、0や隣国の値で補わない。

