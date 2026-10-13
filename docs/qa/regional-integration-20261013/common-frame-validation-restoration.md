# 中南米の農業・林業の寸法完全一致の復旧

PR348の旧検査同期では、受入済み地域PC検査が最低高さ440pxと共通news/nav/fieldsを検査していたため、補助検査のmap/reader完全一致をその条件へ同期した。しかし完全一致を外す必要までは確認していなかった。親の指摘を受け、元のmap/reader/news/fields/navの完全一致を復旧し、最低高さ440pxも併せて保持する。製品・データ・workflow・公開設定の変更はない。

公開e3237f18に対する成功run38454794477の未加工計測JSONでは、農業（大豆選択後）と林業は双方、map={x:376,y:239,width:961.375,height:829}、reader={x:1351.375,y:239,width:548.625,height:829}。news/fieldsも同一。これらの数値は画像目視の代用にせず、通常ChromeのDOM計測として扱う。

元PR334固定head8daa7d64の地域検査scripts/verify-latin-review-revisions-pc.mjsは、現在のb4c529c8と同一blob 5ab3cb816b0d14fd523c49279e45805bd73ae2fb。最低高さ、可視legend、共通nav/news/fields、切替／back、Mapcamera保持の既存回帰を変更していない。今回の補助検査でもそれらと作物／牛の併存、11品目、20都市位置／7原典人数、民族／宗教の実地域・併存、原表・欠測の意味を保持する。

基点は製品補修merge 9cdf54e06692c8c8392a70060d7af0dc126d2191。検証専用追補として保存し、その本番SHAへの通常PC検査で復旧条件を確認する。PR348の固定head b4c529c8と検証branchは変更しない。アジア農業の位置保持補修と既存Pages再公開も継続する。
