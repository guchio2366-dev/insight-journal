# メキシコ第二弾：原資料と未収録項目（2026-10-11）

この記録は未収録値をゼロと扱わず、既存地図から量や流向を推測しないための入力台帳。既存のカナダ・メキシコ原データは変更しない。

| 表示要件 | 保全済みの入力と確認結果 | 次に必要な原資料 | 現段階の扱い |
| --- | --- | --- | --- |
| ブラボー、レルマ―チャパラ―サンティアゴ、グリハルバ―ウスマシンタの本流・流向・河口 | `mexico-water-v1/rivers.geojson.gz` は61,350原区間を小流域内 Strahler 次数7/8/9の3群へ集約。群には原IDを保つが、配信GeoJSONには各区間の河川名・流向・河口がない。元ZIP `inegi-national-rivers-orderge7-original.zip` は台帳にハッシュがあるが作業ツリーにはない。`mexico-basin-review-v1/catalog.json` は3代表水系の国内流域を特定し、158流域全体ではないと明記。 | [INEGI 水文地図](https://www.inegi.org.mx/temas/hidrografia/)が説明する流路線、流域出口点、対応する辞書・属性。原配信先 `antares.inegi.org.mx` または `www.inegi.org.mx` で名称、下流接続、出口を照合。 | 流域の国内範囲だけ確認済み。線の端点や座標の並びを河口・流向と見なさない。 |
| 年間の帯水層別利用可能量 | `mexico-groundwater-v1` はINEGIの固結・非固結材料と井戸産出量／賦存可能性の10分類。1996年作成、2008年改訂。法定帯水層や現在の地下水量ではない。 | [CONAGUA データ公開一覧](https://datos.conagua.gob.mx/views/index_datos_abiertos.html)の `Acuiferos_Disponibilidad_09-11-2023.zip`、`Disponibilidad_de_agua_por_acuifero.zip`、対応辞書と境界。原配信先 `datos.conagua.gob.mx`。値の単位・年度・算式を照合する。 | 既存10分類を利用余地の量に読み替えない。値と境界が揃うまで年次量の地図を作らない。 |
| 農業の需給帯 | メキシコSIAP 2025原表は国内の品目別生産量・生産額、州別値を保持。輸入、国内用途、在庫の一貫した収支表は手元にない。米国WASDEの既存需給表をメキシコへ転用できない。 | FAOSTATのメキシコ品目別 Supply Utilization Accounts と方法書、対象年・品目定義が揃う原表。 | 既存生産量は表示可能。需給の残余を差し引きで創作しない。 |
| 輸出先円 | 保全済みのGATS輸出先は米国の統計で、メキシコ原産品の輸出先ではない。メキシコの相手国別値は手元にない。 | [FAOSTAT Detailed trade matrix](https://www.fao.org/faostat/)のメキシコを報告国とする品目・相手国・年・単位の原表、またはメキシコ公式の同等表。FAOSTATの既存 bulk 原配信先は `bulks-faostat.fao.org`。 | 米国の輸出先をメキシコの円図に流用しない。 |
| 世界比の推移 | 保全済みFAOSTAT QCL抽出のメキシコ行は2024年だけ。牛肉・牛生乳などの単年比較は可能だが、メキシコの2015–2024連続値はない。2024年の作物6行も推移には不足。 | [FAOSTAT Production](https://www.fao.org/faostat/)の同一定義のメキシコ・世界の複数年値。保全済み取得メタデータは `bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip` を示す。 | 単年値を時系列に引き延ばさない。世界比は年・品目・単位を揃えてから生成。 |

追加取得を行う前に通信先と資料範囲をまとめて確認する。取得できた原表はサイズ、ハッシュ、辞書、期間、座標、単位、利用条件を検証する。
