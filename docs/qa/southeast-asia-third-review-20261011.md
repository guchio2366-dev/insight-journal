# 東南アジア第3次表示確認・資料範囲

## 産業・実画面

13産業群の選択を右欄の最初の主操作とし、国別統計・比較・資料は開閉欄に移した。30地点の一覧と地域供給網も開閉欄に置き、選択地点の短い解説を先に見せる。PC画像検査はMapLibre canvas、フォールバック非表示、地点マーカー描画を待ってから撮影し、ゴム・タイヤは再読込後も確認する。農畜産初期図、作物・家畜選択、メコン選択後も他の水系を残す画面、標高・民族・宗教の画面を追加した。

## 地形の紫の輪郭

[Natural Earth 1:10m Physical Labels](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/) の `geography_regions_polys` v5.1.2から、名前が一致する7地形のポリゴンを抽出した。[固定した原データ](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson)のSHA-256を生成スクリプトが照合する。採用名は Mekong Delta、Irrawaddy Delta、Khorat Plat.、Barisan Mountains、JAVA、BORNEO、LUZON。前便で使った矩形窓＋標高閾値の輪郭は、地形名の範囲を裏付けないため除去した。

Natural Earth自身はこれを主要地形の**面ラベル用の概略領域**と説明し、精密な地質・水文境界とはしていない。ボルネオについては島全体の輪郭を示し、北部内陸の着目点が専用ポリゴンを持つとは表現しない。バリサン山脈の収録ポリゴンはスマトラ島南部寄りで、島内のすべての山地を網羅しない。標高の色面と500m等高線は別の[NOAA ETOPO 2022](https://doi.org/10.25921/fd45-gt74)の値である。

## 民族・宗教の補完

[フィリピン統計庁の2020年民族集計](https://psa.gov.ph/content/ethnicity-philippines-2020-census-population-and-housing)から、地域別の民族回答7例を採用した。地図には4つの代表的な地方の民族名・地方名・世帯人口比をラベルで示し、右欄には7例を掲載する。ラベル位置は地方を探すための目印。居住域の境界やその地点の人口比ではない。GeoEPRの政治的集団の面とは別の出典・分類と記した。BARMMにはマギンダナオ26.4％のほかタウスグ23.3％とマラナオ22.7％もあり、最多分類だけで地域を塗らない。

宗教はフィリピン統計庁の2020年地方別カトリック回答（ビコール93.5％、中ビサヤ90.5％、東ビサヤ92.3％、バンサモロ5.3％）を追加した。地図には3地方のラベルを置き、右欄には4地方を示す。地方ごとの世帯人口が分母で、バンサモロの残りを単一宗教へ割り当てない。

全国構成は[ベトナム2019年国勢調査公表](https://vietnam.un.org/en/28931-results-population-and-housing-census-0142019)、[フィリピン2020年国勢調査](https://psa.gov.ph/content/religious-affiliation-philippines-2020-census-population-and-housing)、[東ティモール2022年国勢調査](https://timor-leste.unfpa.org/sites/default/files/pub-pdf/final-main-report_tlphc-census_2022.pdf)の国全体の回答を右欄に表示し、ベトナム・東ティモールは国の代表位置の円にも示す。ベトナムは全人口、フィリピンは世帯人口、東ティモールは3歳以上。年と分類も異なる。ベトナムの残差は「宗教なし」だけを意味せず、民間信仰や儀礼の有無も示さない。GeoEPR/EPR-EDの居住域と合算しない。

上記以外の国については検証済みの同一定義の細地域割合をこの便で追加していない。未掲載を0％や特定集団の不在として表さない。
