# 欧州の農業地域資料・地下水原図の続き

基点は `ab2bf51581f6874fb141b5e858892c7a2faf9f2e`。このDraftは公開済みの欧州画面を作り直さず、酪農・非乳牛、ブドウ、オリーブの地域資料を補います。世界シェア・貿易・自給率統計には触れません。

## 今回、地図で確かめられること

色面は従来のFAO GLW4（牛・豚・鶏・羊の推計密度）とSPAM 2020（収録済みの作物集合区分）のままです。追加した丸印は別の一次資料にある地域の**目印**で、農場の座標、統計地域の境界、上位産地の順位を意味しません。乳牛・非乳牛は区別します。異なる年、対象国、単位の数値を一つの強度階級へ混ぜません。国や地域に印がないことはゼロではありません。

| 対象 | 地域と原資料の値 | 年・指標 | 出典・限界 |
| --- | --- | --- | --- |
| 乳牛・非乳牛 | アイルランド南部NUTS 2：乳牛1,124,842頭。北部・西部NUTS 2：非乳牛395,751頭。 | 2020年、頭数 | [アイルランド中央統計局・農業センサス Table 4.2](https://www.cso.ie/en/releasesandpublications/ep/p-coa/censusofagriculture2020-preliminaryresults/livestock/)。非乳牛は肉牛出荷量ではない。 |
| アルプスの酪農 | オーストリア山間地の酪農の存在を目印で示す。 | 農業形態の記述、量を符号化しない | [オーストリア農業省](https://www.bmluk.gv.at/en/topics/agriculture/agriculture-in-austria/animal-production-in-austria/dairy-farming-in-austria.html)。地図の印は乳牛密度や生乳量の高位階級ではない。 |
| ワイン用ブドウ畑 | リオハ20.1%、ラングドック＝ルシヨン21.3%、フリウリ＝ヴェネツィア・ジュリア約15%、アッティカ9.4%。 | 2020年、各地域の農用地に占めるブドウ畑比率 | [Eurostat `vit_t1` の地域解説](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics)。食用ブドウや全ブドウ収穫量ではない。 |
| オリーブ樹園 | 主に地中海周辺。EU内の面積はスペイン53%、イタリア24%、ギリシャ14%、ポルトガル8%。 | 2023年、樹園面積 | [Eurostat `ef_lus_orcholives` の解説](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Agricultural_production_-_orchards)。地中海の印は模式的な目印で、国の値をその点に割り当てていない。 |

Eurostatの地域原表 [`ef_lsk_bovine`](https://ec.europa.eu/eurostat/databrowser/view/ef_lsk_bovine/)、[`vit_t1`](https://ec.europa.eu/eurostat/databrowser/view/vit_t1/)、[`ef_lus_orcholives`](https://ec.europa.eu/eurostat/databrowser/view/ef_lus_orcholives/) の全行と対応するNUTS境界はこの作業環境で取得できていません。APIへの通常の読み取りが `403 Forbidden` で止まります。地域面の階級図を作るには、原表と同じ版の境界を照合する必要があります。現時点で印を連続した生産面に拡張しません。

## 地下水

[PANGAEAのIHME欧州図](https://doi.pangaea.de/10.1594/PANGAEA.855274)はCC BY 3.0の2008年の図モザイクで、地下水の帯水層・水理地質の定性的な資料です。地下水残量、年間使用可能量、安全な揚水量ではありません。先に用意されたC4 Berlinの投影済み画像のmanifestでは範囲はおよそ東経2.11–15.37度、北緯48.76–55.96度で、欧州全域ではありません。原図には分類コード帯がなくRGBと線・文字が混在するため、色だけを自動分類しません。

Libraryの画像、manifest、凡例を正規の転送手順で準備しましたが、三つとも `download failed` でした。指定された一度の再試行も同じ結果で、実行環境には画像・凡例のローカルファイルがありません。manifestの文字情報は読めましたが、原画像と凡例を開けず、基図との位置合わせも確認できません。地下水レイヤーは追加していません。

## PC画面と確認

- [酪農・畜産 1440px](1440-livestock.png) / [1024px](1024-livestock.png)
- [果樹・園芸 1440px](1440-horticulture.png) / [1024px](1024-horticulture.png)

`scripts/europe/capture-regional-evidence.mjs` で操作地図のジャンル切替、地域印、横はみ出し、JavaScriptエラー、両PC幅の撮影を確認します。詳細値と資料範囲は右の概説・解説・出典に記載しています。
