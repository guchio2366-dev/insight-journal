# メキシコ産業地図：地域固有の可読性修正（ローカル）

基点は最新 `origin/main 6f3d4a27c17bf205220d0eb44563975af2bcbdad`。既存worktree `/workspace/insight-journal-mexico-industry` の `ce802dc7` と空の作業ツリーを保全し、別worktree `/workspace/insight-journal-mexico-sector-readability` で作業した。commit・push・PR作成・マージ・公開は実行していない。

現行は産業データを既に分野で絞っていた。過密の原因は、同じ州に重複する産業点、6／9／8枚の選択用付箋、23／54／24本の位置対応線だった。

## 地域固有の変更

- 資源・製造・サービスを、それぞれ独立したSVG・注記・数量凡例へ分離。表示するのは選択した分野のmap panel一つ。
- 品目の選択は地図外のnative select。34項目（工程の重複を含む36選択）を保持。
- 付箋と引出線を除去。地図内の短い地域・産業例ラベルは操作メニューにしない。
- 州案内点の重複を一州一点へ集約：資源23→14、製造54→21、サービス24→7。
- 近接州の地域ラベルは表示用の編集区分。公式の統計地域・新しい施設座標・規模順位ではない。産業例は、その地域の既存出典付きmemberからだけ選ぶ。ガス輸入を石油採掘と誤読させない短名を使用。
- 全分野のmemberから位置を割り当てるため、品目・州・単独表示の選択で残るラベルの位置やカメラを変更しない。手動ズーム・画面サイズ変更に対応。
- 狭い画面に収まらない注記は長距離へ押し出さず省略を明示。州点と地図外の全地域・品目・工程一覧を保持。
- 元の34項目、1,088州値、320指標、定義・年・単位・欠測・立地・工程・出典・原表は無変更。地域点選択から工程の根拠を読み、品目選択後は元の統計を読む。

## 地域の検証と限界

`node --test tests/unit/atlas-mexico-industry*.test.mjs` は27件通過。新しい4件のDOM操作テストは、3独立地図・他分野の非表示・全34項目の数量と出典・位置維持・単独表示・州選択・キーボード・履歴・再読込を確認。従来の比較・輸出・食品加工18件も通過。build、Pagefind、release検証、差分の空白検査は通過。

静的配置図として、地図幅750pxと358pxの3分野、計6枚をSVG出力してInkscapeで描画し目視した。地域ラベル／州境／案内点の重なり、文字の短さ、付箋・長い線がなくなることを確認した。デスクトップは資源7・製造8・サービス5ラベル。358pxでは資源7・製造5・サービス5ラベル（製造3件を省略し一覧に保持）。

この配置図はDOMテストの画面変換を与えた静的SVGで、実ブラウザー画面ではない。背景画像、ページ全体のCSS、実タッチ・スクロール・native select、実ブラウザー上の文字寸法は未確認。sandbox付きChromiumはSUID sandbox helperの所有者設定で起動できず、sandbox無効化・権限拡張・リモートCIは実行していない。テスト成功を実画面の可読性確認済みとは扱わない。

## 共通UI・統合担当へ

共通ファイルは変更していない。メキシコ側の既存 `data-ma-sector` の3tabは維持し、独立map panelを `data-ma-sector-map="resources|manufacturing|services"` とした。active panelは `[data-ma-sector-map]:not([hidden])`。品目は `[data-ma-industry-select="分野名"]` からnative change／selectOptionで操作する。`data-ma-industry` は各optionに残している。

統合担当の `scripts/verify-industry-pages-smoke.mjs:34` はまだ旧メキシコ操作方式を参照している。この地域では、次の設定が必要（担当範囲を守るため当ファイルは変更していない）。

```js
map: '[data-ma-sector-map]:not([hidden]) [data-ma-frame]',
camera: '[data-ma-sector-map]:not([hidden]) [data-ma-map]',
products: '[data-ma-choices]:not([hidden]) [data-ma-industry-select]',
mode: 'select',
```

旧比較の `?legacy=1` と `?compare=population|electronics` は維持。メキシコ専用browser reviewは新しいmap panel・native select・短い非操作注記へ対応させた。統合後、動作するsandbox環境で1920×1080、1280×900、390×844、844×390のページ全体と実操作を確認する。

受け渡しは基点SHAに対するパッチ。新規component・lib・unit testを含む。対象ファイルはメキシコ固有のcomponent／script／style／地域test／この記録だけ。既存の共有UI・他地域・統合workflow・データは変更していない。
