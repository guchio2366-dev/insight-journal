# 東南アジアの独立刊行物調査・2026-10-14

この調査はアプリコードを変更せず、ASEANstats／ADBの公的刊行物を通常経路で確認した。親担当のFAO冊子 *The State of Food Security and Nutrition in ASEAN 2023*（cc4137en）は対象外。先に既存拒否記録を読み、FAOSTAT API／bulk ZIP、既往FAO PDF、Comtrade APIの拒否経路を再試行しなかった。

## 新しい取得の実行結果

|資料|通常HTTPS GET 1回の結果|本文・データ確認の範囲|
|---|---|---|
|[ADB Key Indicators for Asia and the Pacific 2025](https://www.adb.org/publications/key-indicators-asia-and-pacific-2025)|公式ページから特定した [ki2025.pdf](https://www.adb.org/sites/default/files/publication/1067171/ki2025.pdf) を2026-10-14 08:49:11 UTCにurllibで1回取得。CONNECT403で停止。原PDFを保存できずSHA-256なし。|拒否に先立つWeb読取では375 PDF頁の本文を解析できた。calori／food supply／Food Balancesには一致なし。SDG2表1.2.1は栄養不足率や子どもの栄養指標で、食品群kcal・品目供給用途・在庫ではない。国の「2023」栄養不足率は2022–2024平均であり2023単年ではない。|
|[ASEAN Key Figures 2025](https://www.aseanstats.org/publication/akf2025/)|[公式PDF](https://www.aseanstats.org/wp-content/uploads/2026/04/ASEAN-KEY-Figures-2025_141917042026.pdf) を08:50:17 UTCにurllibで1回取得。CONNECT403で停止。原PDF保存・数値抽出なし。|公式ページで刊行物名とダウンロードリンクを新たに確認。Web PDFパーサーは19,251,976 bytesのサイズ制限で本文を読めなかった。このパーサー制約はHTTPアクセス拒否とは区別し、その後の初回通常取得が403となった時点で停止した。|

記録は `data-source/atlas/southeast-asia-independent-publications-20261014/` の2つの `*.acquisition.json` と `review-results.json`。UTC、URL、標準HTTPS、無再試行、失敗理由を保存。新しい原資料GETは2件、成功した原資料保存は0件、今回追加できる需給／食品群kcal原行は0件。Webで新たに読めた刊行物説明・解析済み本文を、原PDF・原表取得済みと表現しない。

## 刊行物と境界の適合性

- ASEAN公式入口は現在 *Key Figures 2025* と [*Statistical Yearbook 2023*](https://www.aseanstats.org/publication/asean-statistical-yearbook-2023/) をリンクする。Yearbook2025の実在・原表は今回確認できなかった。2023版の存在を2025版と置き換えない。
- Key Figures2025の公式ページは東ティモールを第11加盟国として利用可能データへ追加すると明記する。2023／2024の10加盟国の値と、地理的東南アジア11か国を区別して原表注記を確認する必要がある。刊行年や現在の加盟数から過去年の集計対象を推定しない。
- ADBのSDG栄養指標は食品供給そのものではない。栄養不足率をカロリー構成比や自給率に変換しない。経済表の全商品貿易や主要商品生産指数も、米／森林製品の域外相手国数量行列へ代用できない。
- ADBの統合XLSリンクはWebでInternal Errorとなり、同じ表の別ホスト・ミラーを試していない。ASEANstatsの誤った複数形 `/publications/` はWebで不達となったが、公式トップページのリンクから独立した各刊行物ページを特定した。拒否されたPDFへは迂回していない。
- AFSIS公開入口の候補はWebで不達／timeoutとなり、公式刊行物の本文・原行を取得できなかった。架空の2024商品需給表やURLを作らない。

## 次に必要な原表と利用者操作

アクセス可能な既存の通常ブラウザで、公的入口のエクスポートまたはPDF/XLSダウンロードを行い、保存ファイルを提供すればオフラインで検証できる。認証発行、費用、権限拡大は依頼しない。

1. 食品群kcalには、BRN／KHM／IDN／LAO／MYS／MMR／PHL／SGP／THA／TLS／VNMの2023または2024同一年のFood supply（kcal/人/日）、食品群コードと非重複階層、人口・原記号・年・定義。地域集計には公表地域行、または全対象の同年人口加重を検証できる入力が必要。合計kcalだけでは食品群構成を描けない。
2. 国内供給と用途には、米など既存重要品目の同一年・同じ加工段階・同単位の生産、輸入、輸出、期首／期末在庫または符号規約付き在庫変動、食用、飼料、種子、加工、損失、その他／調整。籾と精米、暦年と販売年度、予測と確報を明記した原表を提供する。国の貿易合計だけでは地域外供給帯を描けない。
3. [ASEANstats年次商品貿易](https://data.aseanstats.org/trade-annually) で2023／2024、報告主体、全相手、HS1006など品目と分類版、輸出／輸入方向を固定して保存。金額／数量と単位、域内／域外、欠測、再輸出の定義・対象国を含める。上位相手だけや全商品表では米の域外円の分母を確定できない。
4. 上記の独立刊行物PDF/XLSは原物と表番号・注記を同時に提供する。ASEAN Key Figures2025が食品群や需給を収録するかは原本文未確認なので、この資料だけで不足が埋まるとは約束しない。ADB KI2025は確認範囲で食品群供給／用途原表を満たしていないため、それだけの提供では需給実装を完了できない。

カロリーベース自給率には、上記食用kcalに加え国内産由来の食用換算、輸入飼料依存畜産の扱い、加工品・原料の重複排除が必要。国内生産重量比をカロリー自給率と呼ばない。
