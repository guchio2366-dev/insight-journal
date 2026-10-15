# 中央アジア：分野別地図の可読性修正

現在の版は、工程理解に役立つ共有加工地点を残した修正版。基点は `6f3d4a27c17bf205220d0eb44563975af2bcbdad`。新規ブランチは `fix/central-asia-industry-readable-20261015`。旧作業 `/workspace/central-asia-industry`（`f6e83c5d`）は変更せず、別worktreeで保全した。PR作成・mainマージ・公開は統合担当が行う。

## 今回の最終仕様

現行mainは既に分野別に地点を絞っていたが、数量・年を含む付箋と長い引出線が地図を覆っていた。修正では、地図内の選択用付箋を透明背景の短い非操作注記へ変え、数量・年・範囲・出典は詳細と地図下の統計に保持する。近接する同じ産業・国・実工程の種類を集約し、1集約最大1本・40 CSS px以内の短い対応線を使う。選択・解除・限定表示によって配置とカメラを移動させない。

資源・エネルギー、製造業、サービス業は、選択された分野の宣言された地点・注記・線・凡例だけを描く。背後の5か国の地理を再利用する。資源20／製造14／サービス8の参照に、37の確認済み位置レコードを使う。銅・クロムの加工5地点は、資源の採掘から金属化までの理解と、製造の加工の理解に必要な参照として両方に残す。一枚に未選択分野の全地点を混ぜることと、意味のある共有地点を持つことは別。

銅採掘／銅製錬、クロム鉱／フェロクロムは、表示分野からではなく地点の実工程から注記名を決める。資源の凡例は採掘・発電と関連鉱産物加工を区別する。製造では金属加工と州の繊維・製粉、サービスでは物流と旅行を示す。同じ共有地点の統計を二重計上しない。

文化観光とタシケントの旅行手配は別注記。異なる期間の量は注記で加算しない。国境・座標・資料・63指標・51出典・11品目は保持し、地域の案内位置を工場敷地や生産量の重心へ読み替えない。アルマリクは製錬の案内位置で、近接する鉱山・選鉱の説明を残す。

## 地域固有の差分

- `src/data/atlas/central-asia-industry.ts`：アルマリクの工程表記。共有地点の分野参照はmain同様に保持。
- `src/lib/atlas-central-asia-industry.ts`：分野の概説、実工程による注記名、短い地名、同国・産業・実工程の集約、短距離配置。
- `src/scripts/atlas-central-asia-industry.ts`：非操作の短い注記、地図上の数量を撤去、最寄り実地点への対応線、分野別凡例。
- `src/styles/atlas-central-asia-industry.css`：透明な短い注記。
- `src/components/atlas/asia/CentralAsiaIndustryPage.astro`：実工程に沿う凡例と共有加工地点の説明。
- `tests/unit/atlas-central-asia-industry.test.mjs`：分野別の描画対象と意味のある共有地点・実工程を検査。単一分類を強制しない。
- `scripts/verify-central-asia-industry.mjs`：地域専用の操作検証を実工程表示に対応。
- `scripts/verify-central-asia-readability.mjs`：注記・線・位置固定・分野別描画対象の地域専用検証。

共通UI、ルート、共有CSS・共有検査、他地域、日本の他分野には変更を加えていない。

## 検証済み部分と未確認部分

修正後の地域単体・範囲検査8件は全合格。production buildと配信検証は成功。JavaScript検証ファイルの構文も確認した。

ブラウザーは `chromiumSandbox:true` の安全な設定で起動を試みたが、`/usr/lib/chromium/chrome-sandbox` のSUID helper構成エラーにより起動前に失敗した。OS権限・所有者・安全設定は変更せず、sandboxを無効にする検査は再実行していない。したがって共有地点を戻したこの版の実画面・注記の枠内配置・可読性・実操作は未確認。統合担当の安全に構成されたChromeで確認が必要。

現在の結果とソースSHA256は [current-validation.json](current-validation.json)、起動エラーは [safe-browser-launch.txt](safe-browser-launch.txt)。地域検証は常に内蔵sandbox有効で、既存の `REVIEW_CHROME_PATH` により事前構成されたChromeを指定できる。新検証から内蔵sandboxを無効にする環境変数分岐を除去した。

```sh
node --test tests/unit/atlas-central-asia-industry.test.mjs tests/unit/atlas-south-central-focus-scope.test.mjs
ASTRO_TELEMETRY_DISABLED=1 XDG_CONFIG_HOME=/tmp/central-asia-config npm run build
npm run verify:release
REVIEW_CHROME_PATH=/path/to/preconfigured/chrome node scripts/verify-central-asia-readability.mjs
REVIEW_CHROME_PATH=/path/to/preconfigured/chrome node scripts/verify-central-asia-industry.mjs
```

## 共通UIへの接続

`resources / manufacturing / services` の選択を `data-central-sector` ボタンと同じ状態へ接続する。地域コントローラーはこの属性、`data-central-choices` の選択肢列、地域root内のtablistを使うため、共通コントロールへ置換する場合は属性・イベントの橋渡しが必要。産業選択肢は地図外に置く。`data-central-overlap` は同じ共有加工地点を別の工程文脈で読む既存操作として保持する。

モバイルのニュースと共通操作列が地図より先に並ぶ構成は変更していない。初期viewportでの地図の収まり、共通UI統合後のページ全体の密度と可読性は共通担当で確認する。

## 旧検証の履歴

`before/`、`after/`、`interaction-images/`、`comparison.json`、`interaction-review.json` は前の単一分類版を内蔵sandbox無効で検査した履歴。PC・モバイル・横向きの画像と位置記録を保全しているが、現在の共有地点版の実画面検証結果として扱わない。旧版の製造業注記矩形面積比は1440pxで20.6%→5.5%、390pxで27.4%→8.1%だった。矩形面積比は注記外接矩形合計÷地図枠面積であり、透明文字の実描画面積・地形の遮蔽率ではない。

以前に転送した `e157833...` のローカルパッチとZIPは旧版であり、現在のブランチの最終状態を取り込む。元の作業履歴を破壊せず、単一分類の制約を直す追加commitで引き継ぐ。
