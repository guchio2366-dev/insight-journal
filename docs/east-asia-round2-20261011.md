# 東アジア・第二回添削の実装記録

比較元: main / 本番とも `755ec125daf9272e21328ff4c1ecab32756ce917`（着手時）。PR #291 と日本専用ページ #310 は既に main に入っています。今回の日本専用ページのファイルは変更していません。地域一括の新Draft PRで返し、マージ・公開順は親が調整します。

## 今回の変更

- 東アジアの都市を選んでも国を自動選択しません。他国の都市を補助一覧から直接選べます。URLの再読込でも国への自動変換を復活させず、カメラを保持します。明示的な「日本」選択は既存の日本専用入口へ進みます。
- 雨温図の最上部を「都市―国の雨温図」に統一。Cfaの定量的定義を短く示し、詳細な乾燥条件・分類の優先順位は折り畳みへ移しました。観測所の掲載済み月値と、地図格子の分類の取得状態を分けます。分類取得失敗の再試行は地図を作り直しません。PR #300の共通軸を維持します。
- 林業から全商品の輸出先の円を撤去。6対象（中国・日本・韓国・北朝鮮・モンゴル・台湾）の2024年森林面積、丸太・製材の体積と、2023年HS44木材・木製品・木炭の貿易額を区別して表示します。木材の相手国内訳は未収録、北朝鮮の貿易は欠測です。台湾の貿易はOther Asia, nes報告区分であることを注記します。
- 農畜産の初期図へ5地域名と長江・黄河の位置を追加。地域名は控えめな参照表示です。国全体の統計をその範囲へ配分していません。
- 黄河のNatural Earth原図の3区間（28,212,213）をまとめ、旧区間の重複表示を削除。従来の安定ID `rivers-213` を保持し、流域の選択と本流強調を結びます。4水系の本流を初期表示で強調します。「河川と地下水」でも河川名から本流を選択し、水源・流向・終着先と利用の説明を表示します。名前の選択を地点選択に読み替えず、カメラを保ちます。元資料の存在しない区間を直線で補いません。
- Natural Earth v5.1.2の原図から9地形域を追加。地形域は行政界・流域界ではありません。日本中部・朝鮮半島東部・台湾の山地の形状はこの原図では収録を確認できないため、従来の名前と所在の目安に限定し、その差を明示します。
- 1600px以上のPCでは地図の高さ上限を620→760pxへ拡張。表示範囲・枠寸法と既存のMercator投影による縦横比で調整します。

## データ根拠と取得結果

森林・木材: 保存済みFAOSTATの元レコードから再抽出し、同じアーカイブのWorld値と年・品目・単位を照合。6対象への拡張も元レコードから行っています。中国はFAOのmainland（area 41）、台湾はarea 214で、China aggregateへ台湾を重複加算していません。A/E/X等の資料区分・欠測を保持します。森林参考図はJRC GFC2020 v3の提供元画像で、ここから国別面積を計算していません。

木材貿易の範囲: [UNSD HS44定義](https://unstats.un.org/unsd/classifications/Econ/Detail/EN/32/44)。HS44の国別輸出入総額には丸太・製材以外も含まれます。保存されたUN Comtrade抽出にはHS44の全相手国行列がありません。公式APIの通常GET `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=156&period=2023&partner2Code=0&customsCode=C00&motCode=0&maxRecords=500&includeDesc=true&flowCode=X&cmdCode=44` は `curl: (22) The requested URL returned error: 403` でした。相手国を全商品から代用していません。

河道: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson` の通常HTTPS取得に成功。SHA256 `f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51` は従来の元資料と同一。上流が漏れた原因はHuang/Yellow別名の扱いでした。

地形: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson` の通常HTTPS取得に成功。原図のNE_IDと形状を保持し、範囲を手描きしていません。再現コマンドは `scripts/east-asia/prepare-nature-foundations.py`。

地域の食料需給は未完了です。[FAOの2010–2023年公開案内](https://www.fao.org/statistics/highlights-archive/highlights-detail/food-balance-sheets-2010-2023/en) は読めました。次の通常HTTPS取得はそれぞれ `URLError <urlopen error Tunnel connection failed: 403 Forbidden>` でした。

1. `https://fenixservices.fao.org/faostat/api/v1/en/definitions/types/area`
2. `https://bulks-faostat.fao.org/production/Food_Balances_(2010-)_E_All_Data_(Normalized).zip`
3. `https://bulks-faostat.fao.org/production/Trade_DetailedTradeMatrix_E_All_Data_(Normalized).zip`

保存データがないことだけで取得不能と判断していません。供給・用途・全相手国・カロリーの同一対象/年のレコードを取得できないため、地域全体の帯や円は描いていません。中国限定や林産物を農畜産に代用せず、日本の小麦の別資料は日本限定と明示して残します。数量自給率をカロリー自給率へ読み替えません。

国内の宗教・民族分布は、下記の公的な地域概説・施設事例で部分補完しました。全域を同一定義で覆う詳細な区域統計は未完了です。追加候補の中国人口普査年鑑 `https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/indexch.htm` はWeb取得ではフレーム案内のみ、通常GETは `curl: (22) The requested URL returned error: 403`。韓国統計庁の検討先 `https://kostat.go.kr/board.es?mid=a20101000000&bid=11738&act=view&list_no=359629` はWebツールが `URL ... is not accessible via this tool` を返し、内容/対象を検証できませんでした。未検証値を採用していません。既存の成人調査の国別値を国内区域へ塗り分けていません。

## 実ブラウザーと画像

ローカルChromeの標準sandbox起動はSUID helperの所有者不整合で停止。sandboxを無効化していません。公式Playwright配布 `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1194/chromium-headless-shell-linux.zip` のGETも `curl: (22) The requested URL returned error: 403` でした。

既存の読み取り専用PC検証workflowを使用し、1920×1080 CSS / 100% / DPR1 / sandbox有効のChromeと日本語フォントで本番比較画像・変更後画像を採ります。`results.json` は最終head、比較本番SHA、初期/選択/戻る/再読込/タブ往復、カメラ、矩形、意図的503の分類取得失敗・再試行を記録します。画像は軽量JPEGと `index.html` にまとめます。日本専用ページの検証で使われる東アジアの都市選択も、新しい独立選択（placeなし）を期待するよう更新しています。日本専用の実装は変更していません。最終CI・実画像を目視できたかはPR本文/親への最終報告を参照してください。

中間head c4c2068 の通常ログ取得（run 38109982253）は results-receiver.actions.githubusercontent.com がForbidden、PC画像artifact `east-asia-approved-38109982237-1`（artifact ID 11690854404）の通常ダウンロードは productionresultssa16.blob.core.windows.net がForbiddenでした。別経路や画像のログ搬出で迂回していません。

半導体の地図下構成は今回も実装していません。[既存の未承認構成案](east-asia-approved-20261009.md#未承認-地図下半導体だけの構成案) に、設計→ウエハー製造→組立検査、材料・装置、IDM/ファブレス/ファウンドリー/OSAT、売上と設備能力を分けた分母の説明があります。


## 親から共有されたPC失敗の修正

run 38110621418 / job 114385233071 の親によるログ・実画像確認では、500mmの引出線が9.044pxで10px条件に不足しました。元anchorは箱外にあり、等雨量線の地理座標の誤りではありません。東アジアの降水ラベルだけに箱とanchorの最低距離を設け、通常12px・4500/5500mmは16pxを確保します。元anchor・投影・元等雨量線は変更しません。従来の10px/14pxの実ブラウザー条件を維持します。

流域の黄河選択は b-4060007850 に正しく遷移していました。農業→気候への復帰後は非表示の黄河ラベルが2要素あり、isVisible()の単一要素要求で失敗したため、可視要素数0の検査へ修正します。流域へ戻った後の可視要素数1の検査は維持します。親確認では、宗教・気候・人口・産業・農業・河川名・林業・地形の既存検査は通過しています。


## 追加QAと公的な国内分布の補完

- 産業初期札は1600px以上のPCで最大幅を156→190pxに調整し、韓国の6業種を2段に収める配置を検証します。国・業種の区分を混ぜず、全業種名・色・23地点の位置と選択を保持。大きい札1枚へ業種を省略する新仕様は入れません。
- 民族の初期札の4集団への間引きを東アジアだけ撤廃。保存済みGeoEPRの8集団を地図の元anchorと結びます。台湾については原住民族委員会の[タイヤル](https://www.cip.gov.tw/en/tribe/grid-list/A7F31083995F0E60D0636733C6861689/info.html?cumid=5DD9C4959C302B9FD0636733C6861689)、[アミ](https://www.cip.gov.tw/en/tribe/grid-list/50AABE9D1284F664D0636733C6861689/info.html?cumid=5DD9C4959C302B9FD0636733C6861689)、[パイワン](https://www.cip.gov.tw/en/tribe/grid-list/E8D1B17F6A81D678D0636733C6861689/info.html?cumid=5DD9C4959C302B9FD0636733C6861689)の地理概説を採用。北中部山地・東部平野・南部山地の参照点を置き、台湾先住民族を一つの均質な面として読みません。境界や民族人口を言語・国境から作っていません。
- 宗教は[文化庁宗教年鑑2025年版](https://www.bunka.go.jp/tokei_hakusho_shuppan/hakusho_nenjihokokusho/shukyo_nenkan/pdf/r07nenkan.pdf)第2表から、新潟の神道系神社4,654（38頁）・愛知の仏教系寺院4,506（40頁）を採用。2024年末の施設数で、住民の信者割合ではありません。双方とも宗教法人を含む宗教団体の施設列を使い、法人だけの別列を混ぜていません。
- 台湾内政部[指南宮](https://taiwangods.moi.gov.tw/html/landscape_en/1_0011.aspx?i=16)（GPS121.58663,24.97986）と[佛光山](https://taiwangods.moi.gov.tw/html/landscape_en/1_0011.aspx?i=87)（GPS120.44628,22.74727）の宗教文化拠点を原位置で追加。宗教百景は代表施設の紹介で、完全な宗教GIS・地区全住民の構成ではありません。原ページの施設成立史を右で読みます。
- 中国西部は[2004年の公的なチベット仏教の歴史概説](https://strasbourg.china-consulate.gov.cn/chn/ztlm/zgxz/200405/t20040521_4197425.htm)を、年を明示した文化概説として採用。過去の寺院・信者数を現在値へ転用しません。これは別の公開資料の通常閲覧で、NBSの403を迂回した取得ではありません。
- 国別宗教調査は別の見出しと分母を保持。新しい参照札は元の全国の割合の面表示ではなく、文化・施設・地理概説です。民族・宗教とも全住民の全域統計が完成したとは報告しません。PR289を採用した変更ではありません。
- 実ブラウザーに民族の初期・選択・再読込・戻る・タブ往復、都市→他国選択→外国都市→再読込、元河道上の通常ポインタークリックを追加。旧UIを復活させず、カメラ・原地点・札の重なり・全業種名を検査します。

## 残件を分けた取得・定義状況

1. 農畜産の供給用途：FAOの2010–2023年の公開案内は読めますが、上記FBS本体は通常GET403。生産・輸入・在庫変化と、食用・飼料・加工・種子・損失・輸出を同一年・対象で対応できる原行が不足しています。
2. 農畜産の域外相手：上記Detailed Trade Matrix本体は通常GET403。国内6対象を全て報告側・相手側として扱い域内取引を除ける原行が未取得。国別総額や全商品の相手を転用していません。
3. 品目群のカロリー構成と自給：同じFBS対象年の食用kcal/人/日と品目別需給が未取得。取得後は上下帯の品目幅を同じ食用カロリー構成に揃え、下段の濃淡は品目別の対応する供給自給指標として分母を明記する案です。100%超は切り捨てず濃淡の上限を100%にして実値・域外への供給余力を別表示、欠測は無地にする案。輸出向け生産まで含む数量比率をそのまま「食用カロリー自給率」とはしません。換算の定義を整える前に実装していません。
4. 木材の相手国：HS44国別総額と丸太・製材の体積は掲載済みですが、上記Comtrade全相手行GET403。HS44全体とHS4403/4407の相手を同一視していません。
5. 国内文化：上記8民族札・台湾3民族概説・日本2施設集計・中国1歴史概説・台湾2施設で部分補完。漢族等の全域と朝鮮半島国内の同一定義統計は未収録。全国調査の色帯だけで国内分布完了とはしません。
6. 山地の範囲：日本中部は国土地理院の検討URL `https://www.gsi.go.jp/kihonjohochousa/kihonjohochousa41140.html` がトップへリダイレクトし、対応範囲の形状を検証できません。朝鮮半島東部は国土情報院候補 `http://nationalatlas.ngii.go.kr/pages/page_111.php` のWeb取得が `Failed to fetch https://nationalatlas.ngii.go.kr/pages/page_111.php: (400) Bad Request`。台湾は上記原住民族委員会の概説に中央山脈の記述を確認できますが、民族の居住記述は山脈の境界データではありません。3範囲を点・長方形から手描きしていません。既に取得済みのNatural Earthの9地形域は独立して実装・検証します。


### 公的参照札の初回CIで判明したanchor選択

head22e70edの全単体テストは、最初の居住域anchorが画面外でも別の元anchorが画面内にある既存ケースで、民族札が出ないと再現しました。配置は元anchor集合から画面内の位置を選ぶよう修正し、元座標の移動・境界の捏造はしていません。既存の「民族・宗教は人口密度や行政区の塗りを重ねず、切り替えと遅い応答を処理する」テストが修正後に成功しています。

head22e70edのPC artifact11691889367（run38113106141、約5.9MB）の通常ダウンロードは `gh run download 38113106141 -n east-asia-approved-38113106141-1` が `productionresultssa12.blob.core.windows.net: Forbidden`。Validate push run38113102855の通常ログ取得も `results-receiver.actions.githubusercontent.com: Forbidden` でした。いずれも別エンドポイント・ログへの画像搬出では迂回していません。PCの詳細は親側の許可された閲覧で確認を依頼しています。

文化参照点の独立投影検査は、MapLibreが使うmap containerのclientWidth/clientHeightで計算します。CSS枠のgetBoundingClientRectには小数が含まれるため、枠の小数幅を地図の内部ピクセル寸法へ流用しません。元座標の投影誤差0.1pxの条件は維持します。
