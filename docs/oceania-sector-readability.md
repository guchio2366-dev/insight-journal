# オセアニア主要産業：分野別表示のローカル引き継ぎ

基点は公開 main の `6f3d4a27c17bf205220d0eb44563975af2bcbdad`。この作業ではコミット・push・PR・merge・公開を行っていない。既存の作業ディレクトリ `/workspace/insight-journal` は変更せず、別 worktree `/workspace/insight-journal-oceania-sector-readability` で地域専用ファイルだけを変更した。

## 診断と変更

変更前は資源・製造・サービスのどれを選んでも、SVG 内に資源10・製造6・サービス2の計18産業の注記と347鉱山が残っていた。非選択分野を薄くする方式であり、実際に分野が混在していた。混雑だけが原因ではない。

変更後は描画対象を先に分野で絞る。資源10・製造6・サービス2の産業選択肢をそれぞれ独立して表示し、製造業とサービス業では347鉱山を生成しない。凡例・地図の説明・統計の初期表示も現在の分野に合わせる。

大きな選択カードを短い地理注記に置き換え、産業選択は地図外の select に置いた。近接する同産業の案内位置をまとめ、原本の地点は移動しない。国計は文字だけで示し、施設記号や対応線を付けない。豪州・NZ・PNGの全国注記には既存基図の国名案内位置を再利用し、離島を含む国土外接枠の中心を工場位置のように示さない。

対応線は通常最大42px、小画面最大28px。短い注記を配置できない場合は注記を省略する。原本の地点と地図下の資料は残り、省略数を `data-caption-omissions` に記録する。原本の石炭は炭種未分類なので、地図上では原料炭と一般炭を「石炭」にまとめ、統計・定義は別品目として保持する。木材・水産の上流国計を製造施設の位置に転用しない。

18品目の数値・年・分母・工程・一次出典を収めた `src/data/atlas/oceania-industry-catalog.ts`、原本座標、鉱山・都市・地域境界のデータセットは変更していない。新しい工場位置、航路、輸送線、規模推定は追加していない。

## 共有UI担当に渡す表示契約

- 産業分野は常に一つ。初期値は `resources`、有効値は `resources` / `manufacturing` / `services`。
- 明示された有効な `sector` を優先し、他分野の `product` / `industryLocation` は外す。品目だけのURLはその品目の分野を推定する。
- 旧 `sectorOnly=0` は全分野混在を復活させず、`sectorOnly=true` に正規化する。選択中の分野ボタンを再度押しても「全分野」には戻さない。
- 分野変更時は品目・地点選択を解除し、`industry-all` に戻す。地図範囲・国選択を引き継ぐ。
- 地図外の品目 select は現在の分野だけを列挙する（10 / 6 / 2）。「選択を解除」は分野を保持する。
- SVGの `data-active-sector` と各 `data-catalog-sector` / `data-industry-sectors` は現在の分野だけ。別分野を透明度で残す方法に戻さない。
- 注記は操作部品ではない。`role=button`、tabindex、大きな背景矩形を置かない。既存の資料付き代表地点のキーボード操作は保持する。
- 同一分野・同一表示範囲内では品目を選択／解除／単独表示しても注記座標を再計算しない。`data-caption-key` と `data-label-box` で確認できる。
- 統計は地図下、読み取りと現在の凡例は地図外に置く。共有UIの統合時にも、18品目の出典台帳を失わないようにする。

主な接点は `src/lib/atlas-oceania-industry-catalog.ts`（絞り込み・注記）、`src/data/atlas/oceania-learning.ts`（状態・シーン・凡例）、`src/scripts/atlas-oceania-learning.ts`（分野・選択・履歴）、地域専用2コンポーネントとCSS。共有UIファイルは変更していない。

## 実施した検証

最終ソースに対して以下を実施した。

| 検証 | 結果 | ログ |
|---|---|---|
| `node --test tests/unit/atlas-oceania*.test.mjs` | 33件成功、失敗0 | `/tmp/oceania-sector-region-unit.log` |
| `npm run build` | 成功 | `/tmp/oceania-sector-build.log` |
| `node --test tests/e2e/atlas-oceania*.test.mjs` | 16件成功、失敗0 | `/tmp/oceania-sector-e2e.log` |
| `npm run verify:release` | 成功 | `/tmp/oceania-sector-release.log` |
| `git diff --check` | 成功 | 引き継ぎ作成時に再確認 |

ここでの E2E は生成HTMLをDOM環境で操作する検証であり、実ブラウザでの画面検証ではない。最終調整前の全体unit suiteは1,401件成功・3件skip・失敗0（`/tmp/oceania-sector-all-unit.log`）。その後に全国注記位置・色・重複記号を調整し、上記の地域unit・ビルド・生成HTML検証を再実行した。全体suiteを最終版で再実行したとは扱わない。

自動検証は、分野所有、製造・サービスの鉱山0件、分野内の選択肢、注記位置固定、注記矩形の非交差、対応線長、URLの分野優先、解除時の分野保持などを確認する。通過だけで人間にとっての読みやすさを保証しない。

## 実画面で確認できた範囲と残るブロッカー

変更前の3画面と、途中版のデスクトップ1920pxの資源・製造・サービス3画面を画像で確認した。途中版では大きなカードがなくなり、分野混在が解消していることを確認した。

ただし途中版画像は、最後の全国注記位置・色・重複記号の調整より前である。初期の参考キャプチャはサンドボックス無効の試験起動で取得してしまったため、正式な画面検証の証拠には採用しない。正式スクリプトのサンドボックス必須を確認した後は、無効化による再試行をしていない。

最終版の `scripts/verify-oceania-industry-catalog.mjs` は `chromiumSandbox:true` を必須とし、デスクトップ1920×1080・1896×996・モバイル390×844で3分野と全品目を確認する設定である。しかしこの環境の `/usr/lib/chromium/chrome-sandbox` は `nobody:nogroup` 所有・mode4755で、Chromiumは「root所有でないためサンドボックスを構成できない」として起動を中断した。所有権変更・権限追加・サンドボックス解除はしていない。`/tmp/oceania-sector-review/sector-verification.json` の結果は `blocked`、最終画面キャプチャは0枚。

したがって**最終版のデスクトップ／モバイル実画面QAと最終的な読みやすさは未確認**。適切に構成された許可済みブラウザ環境でこの地域専用スクリプトを実行し、字形によるはみ出し、国名との重なり、小画面の省略数、選択・履歴・凡例を画面で確認してから統合判断してほしい。手作業の追加確認が必要なら、PNG・ニューカレドニア・島嶼部と豪州東岸・NZの近接注記を優先する。

参考ファイルは `/tmp/oceania-sector-review/` の `before-*.png`、`before.json`、`after-*-1920.png`。`after` は途中版であり最終合格画面ではない。

補足：旧 `layer=mines` / `layer=places` URLは互換性のため残した。分野タブは常に `industry-all` を選ぶ。手入力で `layer=mines&sector=services` のように矛盾させた旧URLは空疎な地図になり得るため、共有UIで旧レイヤーを露出する場合は別途整理が必要。

## ローカル成果物

- 作業 worktree：`/workspace/insight-journal-oceania-sector-readability`
- 基点SHA：`6f3d4a27c17bf205220d0eb44563975af2bcbdad`
- パッチ：`/workspace/shared/oceania-sector-readability.patch`（この文書を含む。`node_modules`のローカルsymlinkは含まない）
- 検証資料：`/workspace/shared/oceania-sector-readability-evidence/`（ログ・ブロッカー・参考画像、画面確認の限界を併記）

パッチはこの基点向けの未コミット差分。共有UI側の変更と突き合わせて適用するための資料であり、公開反映済みの成果物ではない。
