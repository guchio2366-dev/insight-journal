# 農林業の残件3区分と再開入力（2026-10-16）

基準はPR369の `a65cf1379edd79586334e9c432548a27a6294612`。全13地域の部分実装・同SHAの一般CI成功と、必須数量ゲート失敗は別判定。以下の追加作業でも数量ゲートを緩めず、日本専用・品目未選択時・年度選択UIを変更しない。

## 1. 既存原表から再集計・再利用できるもの

**今回追加：中央アジアの米。** 既存の品目selectには米があるが地域統計アダプターの対応から漏れていた。共有保存版の5か国・2024年・QCL item27 / element5510 / t / 同一archiveを抽出して接続した。籾米1,193,722.70t、公表World820,223,277.890000t。TJKのI旗など元行を保持し、精米・販売年度米へ換算しない。Worldを国合計で作らない。国内利用・域外輸出・相手数量は依然不足。

根拠：`public/assets/atlas/regional-production-statistics-v1/statistics.json` → `scripts/prepare-central-asia-agro.py` → `src/data/atlas/central-asia-agro-production.json`。既存5か国のどれかが欠ければ地域完全値を作らない処理を維持する。

既に統合済みの再利用も確認した。単に「未取得」として再取得依頼を重ねない。

|地域|保存済み原表から既に実装している範囲|それでは埋まらない残件|
|---|---|---|
|米国|WASDE同版の生産・World・在庫・用途、既存暦年相手、乳の原成分別表|同販売年度の全月・全相手、畜産の同年・同製品の数量対応|
|カナダ|2024原料大豆のP・World・I・X・全相手、菜種の同版USDA国・World、AAFC別改訂参考|AAFCの未保持用途原行、同販売年度全相手、森林全国数量|
|メキシコ|WASDE綿繊維・精米、GAIN小麦・ソルガム、4暦年HS相手表、DGSIAP2025分類|同年度相手、同版World不足、森林の取得・販売とは別の製品需給|
|欧州|4か国2023丸大豆の同年P/I/X・相手、小麦等のWASDE、既存森林用途参考|地理45対象・EU27・FAO地域を区別した全対象需給・域外行列|
|東アジア|中国・韓国2023丸大豆、18貿易参考表、森林P/I/X|他品目・対象国の用途と対応相手、欠測World・数量|
|東南アジア|公表SEA生産と保存国行、精米需給・加工品参考|地理11か国の完全coverage、同製品需給、全Reporterの域外相手|
|南アジア|WASDE7国品目行、8か国の保存生産・林産物、別期バスマティ・製茶参考|同年度相手、他品目用途、欠測国・未保持World|
|中央アジア|5か国の保存生産、今回の籾米接続、KAZ小麦粉混合の独立相手参考|同年需給・加工範囲、羊・山羊・綿の不足原行とWorld、全域外行列|
|西アジア|SAUデーツ全相手、ARM/OMN/TURの保存FBS、TUR GAIN別期参考|20対象の完全原行、原穀・果実・保存品・油の対応、同年域外行列|
|アフリカ|ZAF/EGYの保存WASDE、保存QCL地域・国行、ZAFとうもろこし相手参考|全対象用途・数量相手、欠測World、林産物製品数量|
|オセアニア|9通関表・420行、保存生産・World、AUS小麦WASDE|全対象需給、PNGカカオの原桁検証、欠測World・相手数量|
|中南米|5国大豆P・相手、3国の在庫未調整見掛量、チリINFOR工程別量、既存WASDE|34対象全体の同年用途・域外行列、BRA欠測World、複合品目対応|
|ロシア|2024 QCLの国・WorldともAのみ、保存林産物、別年2020/21小麦需給|同年用途・全相手。非Aを旧公的値で置換しない|

各行の原票・抽出器・hash・残件は `src/data/atlas/agro-quantity-coverage.json` の各地域 `deliveries[].sourceReport` から参照できる。共通正規化22行だけで、地域固有の全packetが検査済みとは扱わない。

## 2. 定義対応の確認で進められるもの

**今回修正：中南米のOther Asia, nes。** 保存BRA相手表の数量・World・分母・旗を変えず、地域区分だけ `external` → `unresolved` にした。Free Zonesと同様、帰属未確定を域外へ押し込まない。

実画面で1280pxの数量セルが桁の途中で折り返されることも確認したため、この相手表だけ数値を一行で読む配置へ修正する。表内の横スクロールを保持し、ページや地図の幅は変更しない。

**メキシコ複合品目の既存定義は確認済み。** 果樹の地図はMapSPAM `bana/plnt/citr/trof/temf`、野菜は `toma/onio/vege`、コーヒーは `coff/rcof`。統計は独立したDGSIAP2025分類で、果樹57原名称・野菜54原名称・コーヒーはCafé cereza。「その他」は193原名称・混合単位で数量合計nullを保持する。これは2020地図と2025統計の完全な調和済み分類ではない。

原分類・名称集合・元ファイルhashを `data-source/atlas/agro-integration-20261016/retained-composite-definitions.json` に抽出した。単一FAO品目・代表果実・コーヒー生豆へ置換する根拠にはしない。FAO原表と辞書を受領した後、原品目・製品形態・単位ごとの対応を照合する。現段階で正式な全品目crosswalkが完成したとは扱わない。

欧州の `citrus/temperatefruit/vegetables` と中南米 `temf` も集合集計。`src/data/atlas/europe/farming-genres.ts`、各地図元分類を保持し、国別りんご等を集約全体の代理にしない。牛→肉/生乳、鶏→肉/卵、未繰綿→綿繊維、籾米→精米、コーヒーチェリー→生豆、原木→製材→パルプは同一数量として結合しない。

**内部取引の確認結果。** 中央5か国、南8か国、地理SEA11か国、西20対象、中南米34対象と、FAO公表地域・年別ASEAN・EU27は別境界。KAZ、SAU、AUS/NZや中南米各国の相手小計は「その報告国の相手内訳」であり、地域全体ではない。全国の外国向け図には域内の外国も残し、域外小計では除外する。保存資料は一部Reporterに限るため、全国輸出の合計から地域域外輸出を生成しない。中南米既存の相手名集合は今回保存表で確認した名前に限るため、受領するTMの全相手へそのまま転用せず、34対象のコード集合と公式Partner辞書で再判定する。

## 3. 本当に外部原表・公式辞書待ちのもの

公表Worldの欠測、未保持国・用途・在庫・相手行は、保存データの再計算では作れない。新しい公式版が届いた場合、旧版の国値に新しいWorldだけを足さず、必要な国・地域・Worldを同版で再照合する。

親は通常の公式UIから以下を取得成功と報告している。**このcheckoutでは未受領・未検算**。QCL正規化ZIPの通常GETを一度試し、CONNECT tunnel 403で停止した。監査は `data-source/atlas/agro-integration-20261016/qcl-followup-acquisition.json`。同ホストの拒否を迂回する追加取得は行わない。

|原表群|通常配布URL・親報告の公開更新日|受領後の用途|
|---|---|---|
|QCL国別|[正規化ZIP](https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip)・2025-12-31|2023/2024の生産・旗・原値・品目/国辞書|
|QCL公表地域/World|[Area Groups ZIP](https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Area_Groups.zip)・同更新日|国合計でWorldを作らず、同版公表行に結合|
|FBS|[国別ZIP](https://bulks-faostat.fao.org/production/FoodBalanceSheets_E_All_Data_(Normalized).zip)／[Area Groups](https://bulks-faostat.fao.org/production/FoodBalanceSheets_E_All_Area_Groups.zip)・2025-10-28、2010–2023|2023同年の供給・用途・符号付き在庫。QCL2024へ混成しない|
|SUA・現行domain SCL|[国別ZIP](https://bulks-faostat.fao.org/production/SUA_Crops_Livestock_E_All_Data_(Normalized).zip)／[Area Groups](https://bulks-faostat.fao.org/production/SUA_Crops_Livestock_E_All_Area_Groups.zip)・2025-11-01|原品目・加工段階に対応する用途・在庫、FBS製品群との対応辞書|
|TM|[正規化ZIP](https://bulks-faostat.fao.org/production/Trade_DetailedTradeMatrix_E_All_Data_(Normalized).zip)・2025-12-23|同年・同製品のReporter×World＋全Partner数量。親報告420,650,070 bytes|
|FO|[国別ZIP](https://bulks-faostat.fao.org/production/Forestry_E_All_Data_(Normalized).zip)／[Area Groups](https://bulks-faostat.fao.org/production/Forestry_E_All_Area_Groups.zip)・2026-01-09、1961–2024|丸太・製材・パルプ別の同年P/I/X・World・旗。丸太は樹皮なしm³|

公式定義は [FO metadata](https://www.fao.org/faostat/en/#data/FO/metadata) と [JFSQ](https://www.fao.org/statistics/data-collection/forestry/en)。Forestry Trade Flowsは廃止・最終更新2022-05-27との親報告であり、2024年相手数量の充足に使わない。FOのP/I/Xだけでは実際の使途・在庫や全相手は埋まらない。

**再開入力：** 取得済み原ZIP（公開サイトへ同梱しない）と、元URL・取得日時・公表版/更新日・実byte数・SHA-256・ZIP内member名。保存先は取得済み原本の正式受け渡し先でよく、認証情報や利用者PC接続は不要。こちらで原ZIP/抽出memberのhash、CSV header・原コード・年・単位・Flag/Noteを検査し、対象行・辞書・版metadataの検証可能な抽出だけをrepositoryへ保持する。上位相手だけの抜粋、金額だけ、丸めた世界シェアは代替にしない。

原表受領後にも、全選択品目×対象国/地域×加工段階のinventory・版・欠測の照合が必要。販売年度の全月相手、畜産・乳の換算、森林実投入/在庫、PNGカカオの独立公式照合は別途残り得る。全域完成・公開許可とは読み替えない。
