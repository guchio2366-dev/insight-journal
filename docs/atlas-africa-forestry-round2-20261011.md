# アフリカ林業第二弾：共通表示と森林面取得の残件

## 表示の変更

アフリカ本体と同じ `AfricaWorkspaceFrame` / `AfricaFieldNavigation` を使い、概要・農林業・自然環境・主要産業・人口の並び、地域ヘッダー、農畜産／林業の操作位置を統一する。林業だけ旧大分類へ戻らない。右側で代表地域の解説を選び、選択でカメラや他の代表位置を変更しない。アフリカ専用CSSで地図の縦幅と右説明のスクロール範囲を広げる。他地域の分岐と表示は変更しない。

## 全域の森林面は未達（保存画像の部分表示を追加）

2026-10-11の保存原資料再確認で、西アジア/南・中央アジアのJRC原画像が北東部/アフリカの角の一部を覆うことを確認し、原座標・原画素で部分表示を追加。緑以外の透明部は非森林/欠測を区別できないため斜線を保持。全域の森林面は未達。詳細は[追加原資料と入力待ち](atlas-africa-source-evidence-20261011.md)。

既存の代表位置2点は林業の解説への入口であり、森林被覆の分布面ではない。森林面の要求は注記で解決したものと扱わない。

ESA WorldCoverの今回のconsumer-local取得は、既存の正規proxy経由で `HTTP Tunneling403`。同資料の別経路への迂回・他環境での取得再試行は行っていない。

独立代替のFAO GLC-SHARE Beta-Release 1.0を調査した。公式[2014年報告書](https://storage.googleapis.com/fao-maps-catalog-data/uuid/ba4526fd-cdbf-4028-a1bd-5a559c4bff38/resources/glc-share-Feb2014.pdf)のPDF p2に、FAOへの完全な謝辞を条件として教育・研究・個人・非営利用途の複製・配布を認める利用条件がある。教育地図の候補として適用可能と考えられるが、商用の再販売等はこの許諾の範囲外。データは2012 Betaを2014年公開、約1km（30arcsec）の土地被覆率。樹木被覆とFAO森林面積は別であり、天然林／人工林や伐採地を区別しない。

2026-10-11 02:05 UTC頃、実行環境のPython urllibで上記FAO公式PDFを正規proxy経由で取得しようとしたところ、`OSError: Tunnel connection failed: 403 Forbidden` → `urllib.error.URLError: <urlopen error Tunnel connection failed: 403 Forbidden>`。ファイルは取得していない。Web閲覧で本文を確認できたことをconsumer-local原図取得成功と扱わず、403を他ツール・proxy・ホストで迂回していない。

追加候補のCopernicus/VITO Tree Cover Fraction 2019は公式情報ページがWebツールで `not accessible via this tool` となり、利用条件と取得方法の確認に至らない。Natural Earth Iの土地被覆彩色は分類値付きの樹木被覆資料ではないため、森林面の代用にしない。

残件は、利用条件確認済みの森林被覆原図をconsumer-localの許可済み正規経路で取得し、被覆値と欠測を保持してアフリカ範囲へ再投影・切り抜くこと。天然林／人工林の無根拠な分離や文章からの森林境界作図は行わない。
