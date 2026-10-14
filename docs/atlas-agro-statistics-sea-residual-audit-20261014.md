# 東南アジア農林業・残件原表監査（2026-10-14）

読取基点 `b5727102ab6b84e0428ab953d074984cb086a336`。親から引き継いだ公開確認は `5b62` / Pages run `38534680921` であり、本監査で再確認した公開結果ではない。新規取得、過去拒否URL・同一資料・別ホストの再試行、認証・通信設定変更はしていない。作成は本ファイルだけ。並行作業の `data-source/atlas/southeast-asia-independent-publications-20261014/` は親の別取得であり、本監査の既存原表判定へ混ぜていない。

## 結論と集計境界

保存資料には東南アジアのFBS/SUA用途・在庫・食料供給kcal、品目別域外全相手行列、国内原産の食用kcal分子がない。FAO Statistical Yearbook 2025 の全文PDF・全文テキスト・東南アジアの表49抜粋も確認できない。したがって、保存資料だけで**東南アジアの食料供給カロリー構成・推移・カロリー自給率の数値を確定することはできない**。一方、FAOSTAT公表の東南アジア地域生産行は保持されており、生産・世界比の補足は進められる。

既存地図の対象は地理的11か国：BRN（ブルネイ）、IDN（インドネシア）、KHM（カンボジア）、LAO（ラオス）、MMR（ミャンマー）、MYS（マレーシア）、PHL（フィリピン）、SGP（シンガポール）、THA（タイ）、TLS（東ティモール）、VNM（ベトナム）。2023年・2024年当時のASEAN10か国と同一ではない。加盟時期・ASEANstatsのTLS系列制約は [2026-10-08指示書](qa/southeast-asia-overview-source-review-20261008.md:7) に保存されている。現在の加盟国から過去年の境界を変更しない。

## 実際の失敗記録と記録不足

下表は**保存された取得結果**を再掲する。未保持だけを理由に403と推測していない。東アジア対象APIの失敗を「東南アジア11か国を照会して失敗」とは記載しない。全球ZIPの失敗は東南アジアにも必要な共通原表の取得障害として関係する。

|日付・証跡|実際の操作・対象URL|保存結果と判定|
|---|---|---|
|2026-10-09、[東アジア承認指示書](east-asia-approved-20261009.md:61)|Python urllib HTTPS GET。`https://bulks-faostat.fao.org/production/Food_Balances_(2010-)_E_All_Data_(Normalized).zip`、`https://bulks-faostat.fao.org/production/Trade_DetailedTradeMatrix_E_All_Data_(Normalized).zip`|`URLError: <urlopen error Tunnel connection failed: 403 Forbidden>`。FBS/TM全球原表。出版社自身が拒否した証拠ではなくCONNECT障害。生CSV/ZIP・応答ヘッダはない。|
|同指示書|`https://fenixservices.fao.org/faostat/api/v1/en/data/FBS?area_code=351,110,117,116,154,136&year=2023&page_size=100000`|同じurllib CONNECT 403。コード対応も未検証の東アジア試行であり、SEA地域値・SEA照会結果に使えない。|
|2026-10-10、[共通統計指示書](atlas-shared-agro-forestry-statistics-20261010.md:32)|Python urllib HTTPS GET。`https://bulks-faostat.fao.org/production/datasets_E.json`、`https://fenixservices.fao.org/faostat/api/v1/en/data/FBS?area_code=110&year=2023&page_size=10`|`Tunnel connection failed: 403 Forbidden`。カタログと小規模FBS照会。SEA専用照会ではない。以前の保存カタログの存在と、この日の取得失敗は別。|
|2026-10-11、[東アジア第2回指示書](east-asia-round2-20261011.md:25)|通常HTTPS取得。`https://fenixservices.fao.org/faostat/api/v1/en/definitions/types/area` と上記FBS/TM全球ZIP|`URLError <urlopen error Tunnel connection failed: 403 Forbidden>`。地域コード辞書も未取得。この記録を根拠に任意のFBS地域コードを確定しない。|
|2026-10-13、[構造化取得証跡](../data-source/atlas/east-asia/statistics-2023/acquisition-results.json:3)|`curl --fail --location --max-time 35`、`https://www.fao.org/faostat/en/`|`curl (22): HTTP 403`、`stopped:true`。応答ヘッダ／拒否主体は未記録。|
|同証跡:12|`curl --fail --location --max-time 30`、`https://openknowledge.fao.org/handle/20.500.14283/cd4313en`|`curl (22): HTTP 403`、停止。[指示書](east-asia-food-wood-residuals-20261013.md:45) は同PDFの別配信元への迂回もしないと明記。|
|同証跡:18|`curl --fail --location --max-time 35`、`https://fenixservices.fao.org/faostat/api/v1/en/data/FBS?area=41,110,117,116,154,214&year=2023&output_type=objects&show_codes=true&show_flags=true&null_values=true&page_size=100000`|`curl (22): HTTP 403`、停止。中国本土等の6区分用でありSEA API失敗ではない。|
|2026-10-13、[SEA米監査](qa/southeast-asia-ethnicity-trade-audit-20261013.md:14)|文書記録：「追加の米相手国別照会はこの環境からHTTP 403で取得できなかった」|SEA米相手国の取得失敗はこの要約で確認できる。ただし**失敗した具体URL・Reporter/Partner・クエリ・操作ツール・応答ヘッダは未保持**。公的入口 `https://comtradeplus.un.org/` を確認した記述だけから、その入口URL自身が403だったと断定しない。具体的失敗URLを組み立てて捏造しない。|
|2026-10-08と10-13のSEA指示書|`https://data.aseanstats.org/trade-annually`|ページの選択仕様・2026-07-01更新表示・CC BY 4.0等を確認した記録。データ抽出値は未保持。**ASEANstats抽出の403／実行失敗の証跡はない**ため「取得済み」「403で取得不能」とも記載しない。|

東アジアのWITS一部URLは `Web tool: URL is not accessible` と別に記録されているが、SEAの失敗・HTTP403へ読み替えない。既存Comtradeの0件応答も403ではなく、データ不存在や取引ゼロの証拠にはしない。

## カロリーに使える保存資料の確認

`src/data/atlas/europe/europe_food_composition_2023.json` は **欧州地域だけ**の2023年、表49、印刷320頁／PDF1始まり334頁、3,490 kcal/人/日の9群抜粋。穀類966、油糧・油脂692、糖類384、根茎・豆153、果物・野菜196、肉358、乳卵454、飲料その他247、魚介40。自給率は全群null。これをSEAへ転用しない。

その資料が記録する年鑑URLは DOI `https://doi.org/10.4060/cd4313en`、公開コピー `https://www.donorplatform.org/wp-content/uploads/2026/01/cd4313en.pdf`。**URL記録は全文PDFの保存ではない**。拒否された同じ年鑑を別ホストから再取得する提案には使わない。`europe_39_country_food_kcal_2023.json` も参照ファイル名だけで実ファイルはない。

本監査ではcheckoutの隠し／ignoredを含む資料一覧、読取可能な `/workspace`・`/tmp` の関連名、`data-source` と `public/assets` 内ZIPのメンバー名を確認した。保持PDFはメキシコ／カナダの別資料。年鑑の全文・SEA表49行・SEA年次食料kcal行は見つからなかった。SEAのkcal値・該当頁は**未確認**で、欧州頁番号をSEA頁の根拠にはしない。

## 保存原表だけで進められる範囲

`data-source/atlas/livestock/faostat-qcl-2024-extract.json` にFAO公表地域 `Area Code=5304`、`M49='035`、`Area=South-eastern Asia` の次の生産行と同版World行がある。コード辞書 `faostat-codes.json` はQCL地域コードを支持するが、**FBS APIでも同じコードだという検証や、品目ごとの完全な国カバレッジ証明にはしない**。数量はQCL生産であり、食用・国内供給・カロリーではない。

|品目（QCL code / element5510）|2024地域生産t・旗|同年World t・旗|地域／World（監査計算）|
|---|---:|---:|---:|
|鶏卵1062|9,891,755.75 A|93,693,573.42 E|10.557561%|
|牛肉867|1,354,107.25 E|69,749,016.37 A|1.941400%|
|鶏肉1058|11,404,371.50 E|128,307,229.46 A|8.888331%|
|豚肉1035|6,994,987.03 E|125,357,199.58 A|5.580044%|
|牛の生乳882|5,360,689.74 E|797,287,454.10 A|0.672366%|

同じ地域名称は地理的SEAの編集11か国に対応する。独立照合で卵・牛肉・鶏肉・豚肉は保存11国の同年値も揃い、合計と公表地域行が一致した。牛生乳の独立国行は9/11（SGP/TLS未保持）で、9国合計5,360,689.73tと公表地域行は0.01t異なる。未保持を0にして地域合計を再構成せず、上表では**FAO公表地域行**を使う。原版はQCL 2025-12-31、原ZIP SHA `c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853`。抜粋SHA `55ca92c3b3db92c3a4f36954f6e5da224c9cf84b0169865800402c2a806098c6`。

`data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv` にも同版の公表SEA地域行がある：コーヒー生豆656＝3,100,040.63t（A）、バナナ486＝20,319,878.99t（A）、大豆236＝490,086.63t（E）、牛飼養数866＝48,458,556頭（E）、上表と一致する牛肉・牛生乳。コーヒーの同版World＝11,284,877.41t（A）、世界比27.470751%。原CSV SHA `12f1a5fd1d6fdfb38eb332b8054ee83d45ecb2ded9fe2473c5259c50c86737d9`。既存コーヒーの地域生産参考を補えるが、生豆からアラビカ／ロブスタ別値は作れない。新しいバナナ主題を増やす根拠にはしない。

既存 `southeast-asia-v1/world-shares.json` の2024年は米197,000,960.13t（10/11国、World比24.017967%）、トウモロコシ36,254,072.16t（9/11）、大豆490,086.63t（8/11）の**保存国合計**。公表地域行とは別由来で、欠測国を含む完全地域値と呼ばない。丸太310,839,370m³、製材17,960,408m³、森林面積205,331.04千haは11/11の対応行があるが、用途・在庫を意味しない。

既存 `asia-trade-v1/southeast-asia.json.gz` は2023年・HS2017・current USD。米HS1006の対世界輸入は11/11、輸出は10/11（TLS未保持）。`partners` はTOTALと各国上位3HS章だけで、HS1006／HS1511の全相手行列はない。インドネシアHS15円は油脂類章の国別金額であり、地域パーム油の域外数量円へ転用不可。これらをまとめた額から域内除外分母を逆算しない。

## 残る入力を具体化

- **供給・用途・在庫**：同年のFBS/SUA全11国または定義確認済み地域行。生産、輸入、輸出、国内供給、符号付き在庫変動、食用、飼料、種子、加工、損失、その他、観光客消費、残差・公表調整。期首／期末在庫が必要ならその別原行。在庫変動から期首在庫は作れない。FBS/SUAの具体的CSV/ZIPは未保持、SEA専用SUA照会の取得失敗も未記録。
- **地域外相手**：既存重要品目の同年・同分類版の全Reporter/全Partner/World、輸出入を別方向、数量・単位・金額・旗・再輸出の定義。まず米HS1006、パーム油HS1511など。対象11国のPartnerを域内として除外し、相手不明を域外「その他」に入れない。ASEAN主体を使う場合は対象年・TLS扱いが地理11国と一致するか別表示で確認する。
- **食料kcal構成・推移**：同版・同年の排他的品目群の食料供給kcal/人/日と対象集合。国から集計する場合は同版対応人口による重み付けが必要。公表地域行が正規資料から確認できればそれを直接採用する。未取得なので等幅帯・推移は作らない。
- **カロリー自給率**：上記分母に加え「域内原産で人の食用に供されたkcal」の分子、加工／可食部／熱量換算、輸入飼料による畜産、原料と加工品の重複、輸入原料・再輸出・域内移動の扱い。これは取得障害だけでなく**定義と追加原表の不足**。生産／（生産＋輸入−輸出）、重量自給率、金額割合、国別率の単純平均で置き換えない。公式ASEANカロリー自給率は既存指示書では未発見であり、「存在しない」とは断定しない。

原資料提供を待つ場合は、利用者が既に利用できる正規画面で抽出した原CSVと、年月・対象国／報告主体・品目・方向・単位・旗・元URL／抽出条件を受け取り検算する。この監査では拒否済みURLや同一資料の再取得を依頼していない。親が担当する別公的出版物の許可取得は、別の取得台帳として成功／失敗と採用範囲を記録する。
