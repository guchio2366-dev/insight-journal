# 農畜産・林業の保存資料監査（2026-10-14）

欧州・東／東南／南中央／西アジアの読取監査。基点は公開済み main `7005d50c33841cff1eee6d00485e10ed85daeb85`。日本専用画面と地図は変更対象外。checkout と親ディレクトリに `AGENTS.md`、checkout に `.agents/skills` は見つからなかった。新規取得・認証変更・過去403経路の再試行はしていない。

## 地域仕様と対象を省略しない扱い

- 国の生産、世界公表分母、地域の観測国合計は別物。保存された地域対象全件を一覧・欠測表示の対象にし、有効値のある国だけを残して全地域完成とはしない。国別行だけの順位は「収録地域内の順位」であり世界順位ではない。
- `docs/east-asia-approved-20261009.md` と `docs/east-asia-food-wood-residuals-20261013.md` は、地域左＝需給、中央＝域外相手、右＝kcal構成／国内由来kcal自給の案。実数のない帯を描かず、数量比をカロリー自給率へ転用しない。今回の右＝世界生産比・推移・適切なランキングという直接指示に従う場合も、この未取得kcal案を完成扱いにしない。
- 欧州は FAO年鑑の公表Europe地域行（UN M49基本、ロシア全土、EUとは異なる）と、国別45対象、2021貿易40報告区分、EurostatのEU/国別を区別する。
- 東アジアは CHN/JPN/KOR/PRK/MNG/TWN に対応する6報告区分。貿易の域内判定には香港・マカオも含むが、その2区分自身は集計報告主体に含まない。TWN貿易は Other Asia, nes（OAS）であり、FAO台湾と厳密に同じ区分ではない。日本を含む既存地域集計を日本専用画面の改変禁止と混同しない。
- 地理的東南アジアは BRN/IDN/KHM/LAO/MMR/MYS/PHL/SGP/THA/TLS/VNM の11か国。2023貿易・2024生産を2023年ASEAN10か国（TLS除外）と同一視しない。2026年現在の加盟国から過去年の境界を変更しない。`docs/qa/southeast-asia-ethnicity-trade-audit-20261013.md` は11か国の国別対世界額を地域純供給と呼ばず、HS1006相手表がないことを明記。
- 南中央アジアは AFG/BGD/BTN/IND/LKA/MDV/NPL/PAK/KAZ/KGZ/TJK/TKM/UZB の13対象。南アジア8、中央アジア5を分ける画面の境界を保持し、インド例を地域全体へ転用しない。
- 西アジアは ARM/AZE/BHR/CYP/GEO/IRQ/ISR/JOR/KWT/LBN/OMN/QAT/SAU/PSE/SYR/TUR/ARE/YEM/IRN/EGY の編集20対象（M49西アジアだけではない）。19対象FBS、9／16報告国TMを20対象の完全集計と呼ばない。

## 使用できる保存データと不足

|地域|既存重要品目と使用可能な資料|不足と表示上の限界|
|---|---|---|
|欧州45対象|`public/assets/atlas/europe/farming-statistics-v1/statistics.json`：2015–2024、QCL/FO/RLの22指標。小麦・大麦・トウモロコシ・菜種・ヒマワリ・テンサイ・じゃがいも・米（籾）・大豆、牛/豚/鶏/羊の生体数、牛肉/牛生乳/豚肉/鶏肉/卵/羊肉、丸太/製材/森林面積。同じ版World行と原記号・注記を保持。`src/data/atlas/europe/europe_production_shares_2023.json`：公表Europe地域の6品目。`europe_food_composition_2023.json`：2023公表kcal9群、計3490 kcal/人/日。|FBS/SUA同年用途原行・在庫・国内由来kcal分子なし。世界国別全行なし。9群自給率は全てnull。2023地域世界比は2024国別系列に接合しない。|
|欧州貿易・林業|`src/data/atlas/europe/trade_europe_2021_value_donuts.json`：2021大豆HS1201域外輸入、小麦/メスリンHS1001域外輸出、USD、40報告区分。World/域内/帰属不明を除き域外全相手金額を分母。`europe_wood_key_comparisons_2024.json`：DE/AT/FI/SEの産業用丸太と製材各4国の生産/輸入/輸出/見かけ消費、2024千m³。5国搬出材用途、FI実工業投入、UK大型製材所市場の限定資料も保持。|貿易は地理対応が暫定で完全M49地域と同一ではない。EU27完全林産物集計、在庫調整、全欧州の木材用途相手行列なし。見かけ消費を実用途へ読み替えない。m³の丸太と製材、樹皮有/無、パルプtは足さない。UK用途割合を輸出先や全欧州へ転用しない。|
|東アジア6区分|`public/assets/atlas/east-asia-v2/food-wood-statistics-2023.json`：2023、米/小麦/トウモロコシ/大豆/製材/未処理針葉樹原木の53全相手表、名目USD、HS1988/92 H0。全相手行→域外上位5+その他、国別と地域観測集計。`data-source/atlas/east-asia/statistics-2023/wits/`に行・SHA・出典。2023国別丸太/製材生産輸入輸出とQCL参考生産。|`foodModels=null`。PRK全品目、MNGの穀物輸出／針葉樹原木、CHN針葉樹原木輸出など欠測。域外円は方向ごとに4–5/6等の観測値で全地域ではない。HS440320は丸太全体ではない。完全FBS/SUA、kcal、国内由来分子、HS4403/HS44全相手表なし。|
|東南アジア11国|`public/assets/atlas/southeast-asia-v1/world-shares.json`：2015–2024、米/トウモロコシ/大豆/丸太/製材/森林面積の同版世界比。2024生産対象数は米10/11、トウモロコシ9/11、大豆8/11、林業3系列11/11。国別生産原行は下記AsiaFarmStatistics。`asia-trade-v1/southeast-asia.json.gz`は2023HS2017国別対世界の商品輸出入USD。|米HS1006相手行列なし。`partners`は全商品と国ごとの上位3 HS章のみ（米/林産品の円に転用不可）。油ヤシ果実/サトウキビ/キャッサバ/ゴム/コーヒー/茶/ひよこ豆の同版World行は未保持。FBS/SUA・用途・在庫・kcalなし。作物の `reportedRegion.complete=false` を地域全体として出さない。|
|南中央13国|`public/assets/atlas/south-central-asia-v1/world-shares.json`：2015–2024、小麦/トウモロコシ/米/大豆、牛/鶏/羊生体数、牛生乳、丸太/製材/森林面積。`india-rice-export-2023-24.json`：DGCIS 2023/24年度バスマティ/その他米輸出、バスマティ相手別t。2023商品対世界USDは9/13国。|インド米は国内供給帯ではなく輸出内訳。籾米2024tから差し引かない。AFG/BGD/NPL/TKM貿易未保持。他品目相手／輸入元／FBS/SUA・用途・在庫・kcalなし。綿花加工経路の質的説明を量の配分へ転用不可。|
|西アジア20対象|`public/assets/atlas/west-asia-v1/statistics.json`：2015–2024 QCL/FO/RL。`src/data/atlas/west-asia-world-shares.json`：地域返却値・報告数・World・率。`west-asia-wheat-2023.json`：2023FBS小麦製品S2511（19対象returnedSums、3国具体例、符号付き在庫/残差）、TM原穀小麦CPC0111域外輸出入t。`west-asia-mediterranean-food-2023.json`：ナツメヤシ/オリーブ油FBS/SCLとオリーブ油TM。`west-asia-olives-dates-2023-missing.json`も保持。|外部独立照合ハンドオフの集計のみ、原CSV不在（ファイル名/SHA/行番号あり）。用途の国coverageが要素で異なる。3国例も観光客消費未返却、残差負値、丸め差−1千t。国別総輸入/輸出を域外需給へ合算不可。TM小麦は輸入16報告国、域外輸出9報告国。国内由来kcalなし。|

AsiaFarmStatistics の共通元は `public/assets/atlas/asia-farming-v1/statistics.json`（30対象）と西アジア版（20対象）。型は `src/data/atlas/asia-farming.ts`：`countries[ISO].observations[] = {domain,item,element,elementCode,year,unit,value:number|null,flag,note}`。QCLは生産5510、収穫面積、飼養数を別系列にする。FOは丸太1861／製材1872の生産5516／輸入5616／輸出5916を分ける。原ZIP自体は不在だが版SHA対応の国別抜粋がある。共通Worldは `src/data/atlas/shared-world-statistics.json`。欧州型 `EuropeFarmStatistics` は観測を `[measureId,year,rawDecimal,unit,flag,note?]` の文字列精度で保持する。

## 具体的な不足ファイルと利用者操作

新たな費用・認証発行・権限拡大は不要。利用者が既存の正規FAOSTAT画面から出力できる場合は、以下のCSV/ZIPを年・品目・地域境界を固定して提供する（この環境で403だったURLへの再試行を依頼するものではない）。

1. FBS（Food Balances 2010–）／SUA：対象国全件、共通利用可能年2023、既存重要品目の全要素。生産、輸入、輸出、国内供給、符号規約付き在庫変動、食用、飼料、加工、種子、損失、その他、残差/調整、観光客消費、食料供給kcal/人/日、国・品目コード/原料換算・単位・フラグ。西アジアは上記ハンドオフに記載のFBS1/2、TM1/2、SCL1–7を元CSVとして提供すれば再照合可能。
2. Detailed trade matrix／正規Comtrade出力：全Reporter/全PartnerとWorld行、同年・同一品目分類版、輸出入方向、数量/数量単位/金額の区別、原報告フラグ。上位相手だけでは域外分母を確定できない。地域構成国をPartnerから除外し、未知相手をその他域外へ押し込まない。東南アジアはまず2023HS1006全11国、南中央は既存穀類/綿花等、西アジアは保存CPC定義に一致させる。
3. 世界ランキング用QCL/FO：地域だけでなく世界の全国別行と同版World行、同年・同品目・要素・単位を出力。報告国の有効行で順位を作り、欠測国・同値順位・対象数を表示する。
4. kcal構成は同版食用kcalと人口（地域重み付け時）。カロリー自給の分子には国内産の食用原料・可食部/加工/熱量換算、輸入飼料の畜産への扱い、原料/加工品重複排除の定義が別途必要。FBS生産÷国内供給をそのままこの分子にしない。

## 共通3列の安全な接続箇所

- アジア controller：`src/scripts/atlas-asia-explorer.ts` の `renderFarming()`（約461行）冒頭で `active=state.field==='agriculture'`、`topic=farmingTopic()`、国は `state.place`。同関数464/465行の既存地域 renderer の後、overview の早期return（約477行）より前で共通 renderer を呼ぶ。非activeでも呼んでhostを非表示にする。林業は `topic==='forest'`。選択/戻るは既存render経由で再描画され、国別統計の非同期取得後も同関数が呼ばれる。
- 東アジア既存3列は `src/scripts/atlas-east-asia-farm-foundations.ts:41` の `renderEastAsiaFarmFoundations()`、hostは `[data-east-farm-foundations]` 内 `[data-east-forest-flows]`／`[data-east-export-partners]`／`[data-east-world-share]`。現状その3hostを毎回replaceChildrenし、`topic==='wheat' && code==='JPN'` の専用分岐がある。日本専用分岐は保護する。農畜産の中央 `renderEastTrade()` と不足kcal説明は保存。共通world panelは独立hostで加えるか、非日本分岐の右をworld表示へ変更しkcal不足を詳細へ保持する。
- アジア配置：`AsiaAtlasPage.astro` の地図 `.asia-map-panel` 内には南中央/東南の旧connections（157–164行）。東アジア component `EastAsiaFarmFoundations.astro` は独立部品。ページ末尾の `[data-asia-statistics]`（225行）は地図の右説明ではなく地図下統計用。`atlas-asia-layout.ts` は `.farming-statistics`/trade等をそこへ移動しMutationObserverでvisibilityを管理するため、共通hostを追加するなら同期対象も追加するか別の独立sectionにする。東アジアPC CSS `.asia-statistics{grid-column:2}` は外側news+atlasの第2列全幅であり、ニュースを維持して残り幅を使う。
- 西アジア controller：`atlas-west-asia.ts` の `details()`（約453行）が `farmSupply(topic())` を呼ぶ。現在 `farmSupply(t)`（431行）は `[data-west-farm-supply]` を毎回 `innerHTML` 置換する。共通rendererはその既存置換後に独立hostへ描画し、`state.country` と `westFarmingProduct(t)?.id`（wheat-irrigated/rainfed等を小麦へ正規化）、`t.id==='forest'` を渡す。既存 `farmSupply()` は品目別FBS/TM/世界比の保存済み表示を所有するので直接消去しない。
- 西アジア配置：`WestAsiaAtlasPage.astro` の `[data-west-farm-supply]`（60行）は地図パネル内。別の `[data-west-comparison]`（83行）はinitで `root.closest('[data-atlas-shell]')` にappendされ、既存 `.west-layout-statistics{grid-column:1/-1}` はnewsも含む全幅となる。今回の新hostは外側shellのnews以外の列に置き、`grid-column:2` 等を対象hostに限定する。`statisticsContent` は既存renderでinnerHTML置換されるため、共通hostをその子に置かない。

検証：保存値・定義の既存単体テスト `atlas-southeast-asia-world-shares`、`atlas-west-asia-wheat-2023`、`atlas-west-asia-mediterranean-food-2023` の8件が成功。監査担当はUI変更・公開・新規統計数値作成をしていない。

## カナダ・メキシコ・中南米・アフリカ・オセアニア・ロシアの保存原表監査と共通生産データ

監査時の checkout と `/workspace/.agents` に AGENTS.md／関連 SKILL.md は存在しなかった。地図・日本専用・共通UIを監査担当では変更せず、保存資料だけで独立生成した。HTTP取得、過去拒否資料の再試行、認証・proxy・アクセス権・ブラウザsandboxの変更は行っていない。

|対象|保存済みの接続元・既存表示|今回共通化した範囲／残る不足|
|---|---|---|
|カナダ|`src/data/atlas/canada/canola.json`／`wheat.json`、StatCan 32-10-0359-01、2020/21/22/25年の州別生産・面積。`beef.json` は2021/25/26年の千頭で肉生産ではない。`forestry.json` は2021/23/24年NAICS321/322加工業収入の千CADで丸太・製材m³ではない。|保存QCLから2024牛肉・牛生乳・豚肉・鶏肉・鶏卵・大豆の6系列を同年Worldへ厳密照合。既存UIで重要な選択品目だけ採用する。作物需給／国別相手貿易／カナダFO量は未収録。頭数・収入から肉量・木材量を推計しない。|
|メキシコ|DGSIAP2025全国／州別農畜産原CSV、`MexicoAgricultureTradeStatistics.astro` の既存3列、`agriculture-comparison-2024.json` の6品目世界比。|既存6品目に保存QCLのバナナ・大豆を加えた8系列がデータ上で照合可能（UIの新規品目追加はしない）。コーヒー果実2025と生豆2024、牛生乳SIAP千LとQCL tは接合しない。国内需給／相手国量／FOは未収録。|
|中南米|`src/data/atlas/latin-america/agriculture.json`、`world-production-2024.json`、`data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv`。既存34対象の国別値・3作物の報告国合計世界比。|大豆・バナナ・コーヒー生豆と保管QCLの肉・乳・卵を全国系列として照合。34対象の欠測を0としない。報告国合計を地域全体や域外残余と呼ばない。FBS／詳細貿易／森林FOは未収録。既存MapSPAM2020 haランキングはQCL2024 tランキングと別。|
|アフリカ|`africa-regional-statistics.json` はFAO公表Africa5100と5小地域の2024生産World対応行（コーヒー、牛肉、生乳等）。国別量は保管QCLの同版抜粋。|今回共通JSONには国別系列だけ接続し、公表地域合計は取り込まない。地域の対象国・FAO境界は既存rendererに保持。QCL国別肉・乳・卵・3作物以外の多く、FBS／域外TM／FOは未収録。|
|オセアニア|`oceania-livestock-production.json` は豪州・NZの2024牛肉・牛生乳。`OceaniaLearningPage.astro` はABARES2026 Figure6による2022/23–2024/25平均輸出割合（カノーラ85・羊肉82・牛肉77・小麦75%）。|豪州7・NZ6 QCL単年系列を保存値から照合。輸出平均割合を同年の供給帯に変換しない。豪NZ比較をオセアニア地域全体とは呼ばない。牛/羊GLW頭密度から肉量・用途を作らない。FBS／相手貿易／FO／多品目過去年次は未収録。|
|ロシア|`RussiaLearningPage.astro` にUSDA2021報告の小麦2020/21用途（輸出39.5、食用・種子・工業用23.5、飼料・残差18.0百万t）、輸出先説明とQCL2020–22世界比。`russia-forestry-statistics.json` にRL森林面積・FO丸太/製材2015–24。|欧州原表から15 QCL生産＋2 FO生産＋1 RL面積の18系列・180年次行を厳密照合。USDA用途3値は年度の独立量で2020収穫量の分割ではない。全相手数量未収録のため輸出先円は作れない。小麦2023/24原値X（非公式）を共通データでは旗付き保持するが、既存の公式値2020–22限定表示合意を消さない。林業輸入/輸出、パルプ、用途は未収録。|

共通化は `scripts/prepare-regional-production-statistics.py` を実行し、`public/assets/atlas/regional-production-statistics-v1/statistics.json` と同内容の `statistics.json.gz` を生成する。197国・地域、2,593系列、18,451年次行。QCLは194対象・1,847系列・11,186行、FOは90対象・656系列・6,365行、RL森林面積は90対象・90系列・900行。日本JPNと米国USAを出力から除き、FAO World・地域集計・China351合計も国ランキングから除外する。CHNはFAO mainland156、TWNは158を別報告区分として保持する。欠測・未収録は順位に含めず、順位の分母は同一系列・年・単位の有効値がある収録国・地域。日本・米国を含む世界全件順位ではない。順位表示は必ず「収録N国・地域の中」とする。

国別契約は `countries[ISO] = {name,series:[{id,label,domain,item,element,unit,definition,sourceUrl,archiveSha256,rows}]}`。`rows` は `year,value,rawValue,flag,note,worldValue,worldRawValue,worldFlag,share,retainedSources` を保持。FO輸入/輸出（5616／5916、例えば `roundwood-imports`／`sawnwood-exports`）に世界生産分母を付けず、`worldValue/share=null`。丸太全体1861・製材1872・薪材1864・産業用丸太1865は別系列で、丸太生産と製材生産の二重加算・差し引きをしない。RL森林面積は森林面積比であり生産シェアではない。パルプは保存FO国別原表がなく生成しない。

19入力ファイルのSHA-256を出力 `sources` に記録。FAOSTAT原ZIP版SHA一致を確認した上で、domain/item/element/year/unitが一致する国別／World行だけ結合。Decimalで重複値と旗を照合し、値・旗・単位・版の不一致は生成停止。Mexico、Latin、Oceania、Russiaの既存消費データも保存元と照合。CSV・欧州tupleの元数値文字列を優先する。Asiaの元JSONが数値しか持たない行は、その保持数値の文字列表現がrawValueであり、未保存の原CSV桁を作らない。M/L・空欄をnull、公表0を0として保持。World未収録時に国合計・別年・別単位を代替せずshare=null。

plain JSONは5,586,918 bytes、gzipは598,099 bytes（約584 KiB）。gzipは`mtime=0`で決定的生成し、ブラウザで使う場合は解凍可能な既存方式で一度だけ取得する。全データをページ初期HTMLへ埋め込む必要はない。

検証：`node --test tests/unit/atlas-regional-production-statistics.test.mjs` の2件成功。全出力値／元文字列、分母と比率、欠測と公表0、FO輸出入の分母不適用、source全19ハッシュ、gzipとplain一致、再生成一致を確認。故障注入で同版重複の値変更、単位変更、ZIP版変更が生成停止することも確認した。独立データ担当の検証はデータ契約までで、UI適用・実画面・最終CIは統合担当が行う。

## 生産系列単位の配信分割と取得予算

共通統計の追加取得を100,000 bytes以内へ抑えるため、元JSONと全体gzipを保持したまま `by-series/{id}.json.gz` 32ファイルを追加。生産（QCL5510／FO5516）と森林面積（RL5110）のidごとに分割し、FOは同domain/item/unitの輸入5616・輸出5916だけ同梱。他品目は含めない。対象国・原数値・分母・旗・出典・method・limitsは全体JSONと完全一致し、断片同士の取得で年や定義を変えない。

`manifest.json` の契約は `{schemaVersion,seriesIds,files:{[id]:{file,gzipBytes,countryCount}}}`。最大1ファイルは34,234 bytes。牛肉29,357 bytes＋牛生乳29,358 bytes＝58,715 bytes（約57.3 KiB）、同時取得も100,000 bytes以内。manifest自体は別途5,217 bytesで、肉乳と合算しても63,932 bytes。gzipは全32ファイルmtime=0。初期の農業overviewで全32系列を一括取得する実装は、この分割予算の対象ではなく避ける。

|生産／面積series id|gzip bytes|収録国・地域数|
|---|---:|---:|
|banana-production|7,695|144|
|barley-production|17,237|58|
|buffalo-milk|4,641|19|
|cassava-production|4,503|17|
|cattle-meat|29,357|189|
|cattle-milk|29,358|183|
|chicken-eggs|27,057|190|
|chicken-meat|29,537|191|
|coffee-production|7,136|79|
|forest-area|24,240|90|
|industrial-roundwood-production|13,458|49|
|maize-production|17,729|62|
|pig-meat|25,376|172|
|potato-production|12,409|39|
|qcl-156-production|4,753|19|
|qcl-191-production|3,373|8|
|qcl-201-production|3,605|10|
|qcl-254-production|3,177|6|
|qcl-328-production|4,791|22|
|qcl-79-production|4,562|18|
|qcl-836-production|4,114|15|
|rapeseed-production|11,165|35|
|rice-production|14,932|63|
|roundwood-production|34,234|90|
|sawnwood-production|31,925|90|
|sheep-meat|11,769|39|
|soybean-production|17,342|114|
|sugarbeet-production|10,723|36|
|sunflower-production|9,130|31|
|tea-production|3,872|13|
|wheat-production|22,050|75|
|wood-fuel-production|13,102|49|

追加検証：`node --test tests/unit/atlas-regional-production-statistics.test.mjs` は3件成功。32圧縮ファイルを解凍し、元データから選択した生産系列と同FO品目の輸出入との完全同値、無関係品目の除外、manifestのid／ファイル集合／サイズ／国数、gzip時刻0、個別取得と肉乳同時取得の100,000 bytes予算を確認。
