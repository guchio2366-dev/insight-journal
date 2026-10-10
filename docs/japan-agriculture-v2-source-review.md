# 日本農林業・公的産地事例と需給の有限初便

確認日：2026-10-10。#306 の地図枠・状態に接続する独立資料と部品。これは農林業の全国細地域分布の完成版ではない。

## 採用範囲

米、小麦、ばれいしょ、キャベツ、トマト、りんご、みかん、生乳・酪農、肉用牛、豚の10品目。国内生産量や産出額の「上位10」という順位は作っていない。食生活と地理条件の関係を学べる編集選定。

|採用|学ぶ価値|公的に確認した地域事例|
|---|---|---|
|米|平野の水田と水管理、食品加工・需要|阿賀野|
|小麦|畑作・輪作と国内用途、輸入依存|十勝・中札内|
|ばれいしょ|広い耕地、大型機械、輪作|十勝|
|キャベツ|高冷地の夏秋供給と都市への輸送|嬬恋|
|トマト|施設栽培・出荷季節、局地的な土壌条件|八代周辺の塩トマト（GI事例）|
|りんご|北の果樹産地、複数年の管理|弘前|
|みかん|温暖な沿岸・斜面、段々畑・かん水|有田川|
|生乳・酪農|牧草地、集乳、乳製品加工|別海・十勝|
|肉用牛|繁殖・肥育と飼料、酪農との違い|都城・十勝|
|豚|飼料、衛生管理、加工と需要|都城|

次点は鶏肉・鶏卵、たまねぎ、大豆、茶、かんしょ、さとうきび。鶏の肉用・採卵、茶の生葉・製茶、大豆の食用・加工・飼料など資料の範囲を先に分ける。さとうきびは初期地図範囲外の南西諸島の重要品目であり、初期に映らないことを不採用理由にしない。採否理由は `selection.json` と統計部品の開閉欄に収録。

林業は農畜産の順位に混ぜず、別サブタブ。森林の存在と、木材の供給・利用の違いを説明する。面的被覆はこの便で未収録である。

## データの意味

9点は地域の概略位置を編集して設けた WGS84 の代表点。原資料から取得した農場の測量座標や園地境界ではない。点の大きさ・数・色の面積には生産量を符号化しない。県の総量から県内全域を生産地帯として塗らない。`geometryKind` は `representative-point`、`extent` と `quantity` は `null`。

同じ地域で複数品目を扱う（十勝は畑作・酪農・肉用牛）。品目の選択は輪郭を強調する用途で、他の代表地点を消すことは想定していない。産地選択でカメラを動かさない。原資料は異なる時点の地域事例で、同一年の全国分布として比較しない。都城市紹介の「日本一」は対象年がないため数量・順位として採用していない。八代の塩トマト登録資料は一般の熊本産トマトの全範囲ではない。

## 取得障害と代替範囲

1. **2024年市町村別農業産出額の詳細品目原表**
   - 確認できた公式入口：[市町村別農業産出額](https://www.maff.go.jp/j/tokei/kouhyou/sityoson_sansyutu/)。2026-08-03更新の詳細品目xlsx。2026-09-18の訂正案内も入口にある。
   - exact source: `https://www.maff.go.jp/j/tokei/kouhyou/sityoson_sansyutu/attach/xls/index-25.xlsx`
   - この環境の通常 `urllib.request.urlopen` は `URLError: Tunnel connection failed: 403 Forbidden`。web toolはxlsxに対して `Unsupported content-type: application/octet-stream`。回避・認証追加・代理ミラーは行わない。未取得原表の値や順位を実装しない。
   - 代替：公的な地域説明を独自要約して代表点を示す。数量分布の代替ではない。
   - 原表取得後は1,718市町村＋東京都特別区、1,000万円の値と `x` 等を保持して整形する必要がある。これは県別産出額をセンサス等で按分した加工統計で、市町村別の価格・単収差は反映されない。[作成方法・利用上の注意](https://www.maff.go.jp/j/tokei/kouhyou/sityoson_sansyutu/gaiyou/)を凡例へ接続する。2024年は2025センサス適用の説明があるため、旧2020センサス前提で固定しない。

2. **全国樹木被覆の WorldCover overview**
   - 既存メキシコの `prepare-mexico-tree-cover.mjs` は、WorldCover2021 categorical overview を固定rangeで取得し、元データ10mと約0.6km表示資料を区別する。
   - 通常range取得を評価した exact source: `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N42E141_Map.tif`、`Range: bytes=0-65535`。
   - 同じプロキシ403で停止。範囲や要求ヘッダーを変えて回避しない。既存の粗い東アジア森林マスクを拡大して精細に見せる代替も採用しない。
   - 取得可能になった場合、Japan NE10m形状と同じマスク・Mercator座標で切り出す。WorldCover class10 は植林・果樹を含む樹木被覆で、法的森林や木材生産域ではない。面積・割合をこの最低overviewから推計しない。画像・カテゴリーquery・nodata・source SHAを残す。細島の解像不足はカバレッジで確認する。

## 全国需給で確認した数値

**小麦：2023年度の既存収録値を再利用。** `japan-wheat-supply.ts` から参照し、重複した別原表を作らない。3列は供給と用途／外国産食糧用小麦の輸入先／公表自給率。需給表の純輸入と輸入先の対象量を混ぜない。小麦粉の用途別生産は原麦の需給へ加算しない。世界シェアや意味の薄い全国指標で埋めない。

**木材：2024暦年の林野庁資料。** [2024年木材需給表](https://www.rinya.maff.go.jp/j/press/kikaku/attach/pdf/251121-1.pdf)の本文2–5頁で数量・対象・注記を確認。千m³（丸太換算）。国内生産34,809＋輸入47,065＝総供給81,874。国内消費77,871＋輸出4,003＝総需要81,874。国内消費の用途は製材22,054、合板7,542、パルプ・チップ25,131、その他410、しいたけ原木154、燃料22,580。用途合計は端数処理で1千m³異なる。自給率42.5%（建築用材等52.9%、非建築用材等36.5%）。森林面積や蓄積とは違う。輸出入相手別数量は未収録で、全商品貿易の相手先を流用しない。

## 実装インターフェース

- `src/data/atlas/japan-agriculture-v2.ts`: `japanAgricultureProducts`, `japanAgricultureSites`, `japanAgricultureSources`, `japanAgricultureSelectionCandidates`, `japanAgricultureReading`, `japanForestrySupply`, `japanAgricultureTopics`, `getJapanAgricultureReading(topic, siteId)`。
- topic ids: `all`, `rice`, `wheat`, `potato`, `cabbage`, `tomato`, `apple`, `mandarin`, `milk`, `beef`, `pork`, `forest`。全国・任意の県・産地は初期選択しない。
- `JapanAgricultureControls.astro`: props `{initialTopic?: string}`、既定`all`。ボタン `data-japan-farm-topic`。
- `JapanAgricultureStatistics.astro`: 同props。各パネル`data-japan-agriculture-panel`、地域ボタン`data-japan-farm-site`。root controllerがURL/stateと`hidden`を管理する。UI内から新しいinsightページへ遷移しない。
- `node scripts/prepare-japan-agriculture-v2.mjs`: offline・networkなし、代表点/出典/選定/木材需給とhash付きmanifestを生成。公開assets約20KB。
- `node --test tests/unit/atlas-japan-agriculture-v2.test.mjs`: 5件成功。用途分離、null保持、source到達、供給と需要の一致、公開asset hashと再現性を検証。
- 共有controller/state/Page/CSS/gitは農林業担当が編集しない。統合後の安全Chrome・PC画面・履歴/選択/解除確認はrootへ渡す。

## 残作業と見込み

有限初便は公的産地事例9点、10品目の読み、小麦需給3列、2024年木材需給まで。**公的細地域数量図と全国森林図の完成ではない。** 数量原表・森林原資料の正規取得が必要で、取得障害が続く場合は本整備の完了時刻を約束できない。取得可能になった後の整形・数量/面の検証・各品目の需給接続は追加1〜2作業日を暫定目安とし、資料範囲の調査後に更新する。
