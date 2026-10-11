# 東アジア・第二回添削の実装記録

比較元: main / 本番とも `755ec125daf9272e21328ff4c1ecab32756ce917`（着手時）。PR #291 と日本専用ページ #310 は既に main に入っています。今回の日本専用ページのファイルは変更していません。地域一括の新Draft PRで返し、マージ・公開順は親が調整します。

## 今回の変更

- 東アジアの都市を選んでも国を自動選択しません。他国の都市を補助一覧から直接選べます。URLの再読込でも国への自動変換を復活させず、カメラを保持します。明示的な「日本」選択は既存の日本専用入口へ進みます。
- 雨温図の最上部を「都市―国の雨温図」に統一。Cfaの定量的定義を短く示し、詳細な乾燥条件・分類の優先順位は折り畳みへ移しました。観測所の掲載済み月値と、地図格子の分類の取得状態を分けます。分類取得失敗の再試行は地図を作り直しません。PR #300の共通軸を維持します。
- 林業から全商品の輸出先の円を撤去。6対象（中国・日本・韓国・北朝鮮・モンゴル・台湾）の2024年森林面積、丸太・製材の体積と、2023年HS44木材・木製品・木炭の貿易額を区別して表示します。木材の相手国内訳は未収録、北朝鮮の貿易は欠測です。台湾の貿易はOther Asia, nes報告区分であることを注記します。
- 農畜産の初期図へ5地域名と長江・黄河の位置を追加。地域名は控えめな参照表示です。国全体の統計をその範囲へ配分していません。
- 黄河のNatural Earth原図の3区間（28,212,213）をまとめ、旧区間の重複表示を削除。従来の安定ID `rivers-213` を保持し、流域の選択と本流強調を結びます。4水系の本流を初期表示で強調します。元資料の存在しない区間を直線で補いません。
- Natural Earth v5.1.2の原図から9地形域を追加。地形域は行政界・流域界ではありません。日本中部・朝鮮半島東部・台湾の山地の形状はこの原図では収録を確認できないため、従来の名前と所在の目安に限定し、その差を明示します。
- 1600px以上のPCでは地図の高さ上限を620→760pxへ拡張。表示範囲・枠寸法と既存のMercator投影による縦横比で調整します。

## データ根拠と取得結果

森林・木材: 保存済みFAOSTATの元レコードから再抽出し、同じアーカイブのWorld値と年・品目・単位を照合。6対象への拡張も元レコードから行っています。中国はFAOのmainland（area 41）、台湾はarea 214で、China aggregateへ台湾を重複加算していません。A/E/X等の資料区分・欠測を保持します。森林参考図はJRC GFC2020 v3の提供元画像で、ここから国別面積を計算していません。

木材貿易の範囲: [UNSD HS44定義](https://unstats.un.org/unsd/classifications/Econ/Detail/EN/32/44)。HS44の国別輸出入総額には丸太・製材以外も含まれます。保存されたUN Comtrade抽出にはHS44の全相手国行列がありません。

河道: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson` の通常HTTPS取得に成功。SHA256 `f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51` は従来の元資料と同一。上流が漏れた原因はHuang/Yellow別名の扱いでした。

地形: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson` の通常HTTPS取得に成功。原図のNE_IDと形状を保持し、範囲を手描きしていません。再現コマンドは `scripts/east-asia/prepare-nature-foundations.py`。

地域の食料需給は未完了です。[FAOの2010–2023年公開案内](https://www.fao.org/statistics/highlights-archive/highlights-detail/food-balance-sheets-2010-2023/en) は読めました。次の通常HTTPS取得はそれぞれ `URLError <urlopen error Tunnel connection failed: 403 Forbidden>` でした。

1. `https://fenixservices.fao.org/faostat/api/v1/en/definitions/types/area`
2. `https://bulks-faostat.fao.org/production/Food_Balances_(2010-)_E_All_Data_(Normalized).zip`
3. `https://bulks-faostat.fao.org/production/Trade_DetailedTradeMatrix_E_All_Data_(Normalized).zip`

保存データがないことだけで取得不能と判断していません。供給・用途・全相手国・カロリーの同一対象/年のレコードを取得できないため、地域全体の帯や円は描いていません。中国限定や林産物を農畜産に代用せず、日本の小麦の別資料は日本限定と明示して残します。数量自給率をカロリー自給率へ読み替えません。

国内の宗教・民族分布の追加も未完了です。追加候補の中国人口普査年鑑 `https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/indexch.htm` はWeb取得ではフレーム案内のみ、通常GETは `curl: (22) The requested URL returned error: 403`。韓国統計庁の検討先 `https://kostat.go.kr/board.es?mid=a20101000000&bid=11738&act=view&list_no=359629` はWebツールが `URL ... is not accessible via this tool` を返し、内容/対象を検証できませんでした。未検証値を採用していません。既存の成人調査の国別値を国内区域へ塗り分けていません。

## 実ブラウザーと画像

ローカルChromeの標準sandbox起動はSUID helperの所有者不整合で停止。sandboxを無効化していません。公式Playwright配布 `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1194/chromium-headless-shell-linux.zip` のGETも `curl: (22) The requested URL returned error: 403` でした。

既存の読み取り専用PC検証workflowを使用し、1920×1080 CSS / 100% / DPR1 / sandbox有効のChromeと日本語フォントで本番比較画像・変更後画像を採ります。`results.json` は最終head、比較本番SHA、初期/選択/戻る/再読込/タブ往復、カメラ、矩形、意図的503の分類取得失敗・再試行を記録します。画像は軽量JPEGと `index.html` にまとめます。最終CI・実画像を目視できたかはPR本文/親への最終報告を参照してください。

半導体の地図下構成は今回も実装していません。[既存の未承認構成案](east-asia-approved-20261009.md#未承認-地図下半導体だけの構成案) に、設計→ウエハー製造→組立検査、材料・装置、IDM/ファブレス/ファウンドリー/OSAT、売上と設備能力を分けた分母の説明があります。
