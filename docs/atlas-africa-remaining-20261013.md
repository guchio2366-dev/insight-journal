# アフリカ既承認残件の台帳（2026-10-13）

基点：既存Draft PR337 / `fix/africa-third-review-20261012`、保存済みhead `49106d04b0afe1886734e009494f459623b5e115`。main `a07ab727`は祖先。産業/第三弾のCI成功は地域全依頼の完了ではない。前環境の未知の未保存差分を復元したとは扱わない。checkoutにAGENTS.md/SKILL.mdはなく、`.agents`/`.codex`は空。新規PR、Ready、merge、deploy、費用/権限拡大は行わない。

## 実装と必要入力の区別

|残件|現在の保存済み実装|次の最小入力|取得/判断上の障害|
|---|---|---|---|
|森林全域|JRC2020原画像2枚の北東部/角の一部だけ。透明部の非森林/欠測は未区別|全55国範囲の原forest/tree-cover分類、年、凡例、元座標、利用条件、hash|ESA/JRC/FAO既知proxy403。新たな独立UMD公開catalogueも通常GETがCONNECT403。発行元の非公開と断定しない。Hansen2000樹冠率はFAO森林/現森林/人工林と異なる|
|南ア東部人工林|林業の説明/分類帯。人工林の面はない|森林用人工林を農業樹園地から区別した原分類/geometry、年、出典、利用条件|DFFE既知proxy403。独立WRI植栽樹木catalogue候補（URL実在は未確認）もCONNECT403・上流に未到達。施設点、国集計、森林全体から面を作らない|
|ガーナ16州形状|2021民族9分類の144人数/構成帯を保持。国の枠だけ|2021の16州と対応するgeometry・原州名・年・利用条件|geoBoundaries/OCHA既知proxy403。政府geoportal候補入口（実在は未確認）もCONNECT403・上流に未到達。原図をなぞる/州境をぼかす/旧10州の転用はしない|
|追加赤道雨林観測所|12地点/マダガスカル4地点の雨温図。コンゴ盆地の観測所は未収録|1地点の正規観測所番号・実座標・標高・12月の平均気温/雨量・平年期間・単位/出典/条件。原Beck格子で分類照合|JMA64040既知proxy403。独立NOAA/WMO1961–90公開indexの通常GETもCONNECT403。max/min平均を月平均温度に置き換えず、未取得月を0で埋めない|
|主要帯水層|河道32・接続流域11。地下水の名前/面は未取得|公表された帯水層名称/IDと範囲・縮尺・版/年/条件。量を示す場合は別の量種/単位/期間|BGS/BGR既知proxy403。独立IGRAC入口もCONNECT403。集水域/地質を帯水層や利用可能水量へ読み替えない|
|カカオ分布|SPAMの既存作物、既存コーヒー/茶概略帯。カカオの原分布なし|カカオの原格子/公表産地・年・量種・条件。異なる年のICCO数量と結合しない|IFPRI/SPAM新catalogueの通常GETがCONNECT403。Kalischek et al.2023の独立CIV/GHAカカオ検出確率図候補を確認（10m、論文の閾値0.65）。論文本文の追加閲覧がIDP認証URLへの非retryable 500で停止し、原rasterの場所/年/配布条件を確定できなかった。ログイン/cookie操作なし。未取得QCL47行は入力要求一覧で数値ではない|
|キリスト教宗派|Pew2020の国大分類だけ。宗派の居住面なし|原人口/分類/対象/年が確認できる国・州統計。地図には対応geometryが別途必要|ガーナ2021表5.7公開事実を確認。Pew2020と混ぜず統計表として進める。福音派/ペンテコステ等の重なりを勝手に排他的分類にしない。全大陸の面は未達|
|具体言語|Glottolog5.3の2222個別レコードを所持、8系統群の代表点表示だけ|所持レコードの選択/名称/資料へのリンクは実装可能。話者面/人数は別の根拠が必要|南ア2022公表家庭言語表も確認。母語/理解/共通語と別指標。点のbuffer/Voronoi、州内均一面、WLMS購入はしない|

2026-10-13の新probeは既存設定の通常GET、1回、20秒timeout、読込上限1MiB。全てCONNECT403・0bytesで停止。`data-source/atlas/africa/culture/remaining-source-probes-20261013.json`に実URL/日時/エラーを保存。同資料の別app/host/runnerへの移送、認証/セキュリティ変更を行わない。公開web本文を読めたこととexecutor原geometry/raster/CSV取得を区別する。Personal Contextはこの会話で利用不可だったため、保存済み台帳と今回の親指示で進める。

## 今回進めた実装

- 保存済みGlottolog2,222記録をそのまま保持し、既存の選択/URL `layerClass=language:<glottocode>`、原点のクリック、Space、右側の資料名・元系統・国コード・個別原資料リンクを接続。点の座標/数/大きさとカメラを保持し、他点を残す。話者人口・居住面・国割合を生成しない。アフリカ以外の記録位置を持つ英語/仏語等を利用国へ移動せず、制度的共通語の面とも同一視しない。
- ガーナ2021表5.7の男女計・全地域：4つのキリスト教分類＋4他分類、16州の128人数と全国値を公表数値の事実として抜粋。全国対象30,753,327人、Christian小計21,932,708人。原分類を保持し、小計を4分類に重複加算しない。州/分類の両方向合計を照合。Pew2020国面を変更せず、右の統計・州別表へ追加。元の民族表の分母30,484,536人や全人口30,832,019人と混ぜない。
- 南ア2022表2.9の17分類×9州＝153公表百分率と全国17値を追加。1歳以上の「家庭で最も使う言語」であり、母語や全員の理解言語ではない。手話0.02%やKhoi/Nama/Sanの0.01%など元の精度・0を保持し、丸めた列を100%へ再正規化しない。分類のまとめ方をGlottologへ無理に結合せず、州内の面を作らない。

出典：

- Ghana Statistical Service, 2021 PHC Volume3C, table5.7, 本文58頁/PDF72頁：`https://census2021.statsghana.gov.gh/gssmain/fileUpload/reportthemelist/2021%20PHC%20General%20Report%20Vol%203C_Background%20Characteristics_181121.pdf`
- Statistics South Africa, Census2022 Statistical Release P0301.4, table2.9, 本文23頁/PDF35頁：`https://census.statssa.gov.za/assets/documents/2022/P03014_Census_2022_Statistical_Release.pdf`

公表された数値事実の抜粋・原出典への謝辞のみ。報告書の表画像/図/文章や行政区geometryを転載せず、報告書/GISの包括的licenseを主張しない。数値CSVのsha256と転記条件、対象/年/原頁、限界をJSONへ保持。原PDFはexecutorへダウンロードしておらず、そのhashはnull。画面に見える表とCSV/JSON原数値を比較し、原PDFbytes取得や原図の目視を成功扱いにしない。

カカオ追加候補：[Kalischek et al.2023](https://doi.org/10.1038/s43016-023-00751-8)。CIV/GHAの10mモデル検出確率で、数量・収穫面積の観測表とは異なる。論文の二値化閾値0.65を確認したが、原rasterの位置/入力年/配布条件は未確認。本文追加取得がIDP/cookie認証URLへの非retryable500で停止。別の原図/スクリーンショットからrasterをなぞらず、認証やcookieを変更しない。採用には元の連続確率raster/NoData/年/CRS/license/hashが最低限必要で、ICCO作物年度数量を塗り分ける代用にはしない。

## 検証・実画面・全体未達

初回の新しい言語Space試験は、DOM試験環境でglobal MouseEventを使うhandlerが働かず失敗した。既存コードと同じwindow.MouseEventへ修正し、選択・座標/点数/カメラ保持・履歴/reloadが再試験で通過。旧失敗を成功扱いしない。原数値/sha/丸め/分母を含むAfrica unit97件は成功。全unit1235件中1232成功・3skip・失敗0（実装最終時の結果はPRへ追記）。built-site試験と同headのPC結果は確定後にPRへ記録する。

PC確認は通常sandboxChrome、1920x1080 CSS100%DPR1主基準、1440/1024補助。個別Zulu記録の実文字・元位置・選択/reload/Space、2222点維持、州の統計と55国Pew面の区別を検査し、第三弾/産業回帰を保持。画像・JSON・manifest合算20MiB未満を要求する。ローカルChromiumのSUID helperはnobody/nogroup所有で安全起動不能。sandbox/所有者/認証を変更せず既存CIを使う。既知の公式画像/log配布先Forbiddenを再取得/別app/host/runnerで迂回せずartifact IDを親へ渡す。CI計測・撮影と独立画像目視、実装と全域完了/公開を区別する。

森林全域・人工林・州shape・追加雨林観測所・帯水層・カカオ原分布は未実装。宗派/言語の全大陸居住面も未実装。今回の追加は所持資料の閲覧と確認した国/州の統計であり、これらの地図依頼を解決扱いにしない。親へ必要判断として、正規取得済みの原入力供給と条件/年/対象を確認した採用判断を返す。新しい地理レイヤー/主要仕様を承認したことにはしない。

ローカル全操作604件中597成功・7skip・失敗0。追加の言語地図のroleをimgからgroupへ変更し、資料点を操作できること/話者面でないことをSVG descriptionにも明記。個別言語の選択・位置保持・履歴/再読込の再試験成功。画面には必要な指標/出典/限界を残し、転載方針等の実装説明は台帳へ分離した。最終headのCI/撮影・artifact確定結果は既存Draft本文を参照。
