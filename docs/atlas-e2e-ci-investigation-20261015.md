# 既存17失敗と本番CIの調査

基準mainは `d166204299c2a12acd7c0275b9d0114d49c5040e`、軽量化のアプリ最終実装は `9c43ebc9bbc0b40511c29ae94da6edd717ace0b1`。両者で未修正の同じテストを、同じクラウドChromium 151.0.7922.173・有効なsandbox・フォント・viewport・待機条件で実行しました。基準には作業前に保存した不変のdistを別cwdから配信しています。アジアのアプリコードは今回変更していません。

## 17件の内訳

対象は `tests/e2e/atlas-asia-industry-status.test.mjs` の2親テスト。最初の全95ファイル実行は677件中660成功・17失敗・スキップ0でした。基準側も同じ失敗名とエラーを再現しました。**実際の失敗ケースは13件、残り4件は親テストへの集計**です。

| 親／子の名前（元テスト） | 件数 | 基準mainでも同じ原因 |
|---|---:|---|
| `Asia industry preserves source publication status...` → `desktop`, `laptop`, `mobile` | 3 | East Asiaには旧 `[data-industry-current-feature]` chipがない。可視0件を1件と期待していた。現在は統計カタログのnative select。 |
| `Asia desktop headers and maps align with the US reference` → `manufacturing and transport topic layouts align with the US reference` | 2 | 1024/1440pxともUSの旧subtabs locatorがない。USは専用ページの品目select。 |
| 同 → `climate and population layouts align with the US reference without claiming population fill equivalence` | 2 | natureの地図上端差69px／22pxを誤って1px以下と要求。現行の承認済み個別レイアウトを無視していた。 |
| 同 → `country selection and reset remain usable in the industry header` | 2 | 1024pxは地域列と国・reset列が意図的に別行。1440pxは日本選択で専用全国図へ遷移するため、地域ページに`place=JPN`が残るという期待が古い。 |
| 同 → `South and Central Asia focus links remain a separate keyboard-operable row` | 2 | 地域リンクの正規入口は地域root→nature。旧テストは直接industryへ到達すると期待してタイムアウト。 |
| 同 → `climate city and monthly precipitation controls retain their selection and return paths` | 2 | 月別表はfigureの兄弟だが、figure内を検索してnullを参照。 |
| 上記publication親1、desktopの1024/1440親2、desktop最上位親1 | 4 | 子の失敗の集計。別の4不具合ではない。 |

TAPログ（ANSI色コードと行末空白のみ除去）：[基準main](reviews/atlas-lightweight-20261015/original-baseline-asia.txt)、[候補の同じ部分＋全体集計](reviews/atlas-lightweight-20261015/original-candidate-asia.txt)。比較条件・元テストのSHA-256・一致結果は既存の [全サイト記録](reviews/atlas-lightweight-20261015/full-e2e.json) と [比較JSON](reviews/atlas-lightweight-20261015/baseline-asia-comparison.json) にあります。

## 同じmainの公開CIが成功した理由

[Pages run 38670870998](https://github.com/guchio2366-dev/insight-journal/actions/runs/38670870998)、[build job 116213438243](https://github.com/guchio2366-dev/insight-journal/actions/runs/38670870998/job/116213438243) は上記mainで成功しました。実ログはE2E **650件中642成功・失敗0・8スキップ**です。問題の2親テストは `ATLAS_ASIA_BROWSER` / `ATLAS_ASIA_DESKTOP_LAYOUT` が設定されていないため、明示的にスキップされています。[原ログの該当行](reviews/atlas-lightweight-20261015/original-pages-ci-excerpt.txt)。単に同じ検査が本番では通った、という状況ではありません。

`atlas-asia-pc-review.yml` でも「East Asia map expansion supersedes the former exact US frame parity」と明示され、既存のEast専用キャプチャとSouth/Central専用検証へ移行しています。軽量化でアジアの画面を変更した結果ではありません。

## テストの修正方針

- 実在するnative picker、公式の統計名、3分野と品目、数量、URLとreloadを検証する。
- 日本は専用ページへの遷移と地域への復帰、中国は地域内の国選択とresetを検証する。
- 地域リンクはkeyboardで正規入口へ到達した後、分野タブからindustryへ進む。中央アジアの専用産業図も対象。
- 廃止済みのUSとの完全なピクセル位置一致を、各地図の有用な表示領域・横幅・タブ順序・中央の操作到達性・見出しの可読性へ置き換える。許容差の拡大で旧条件を通さない。
- 月別表を正しい都市パネルから参照し、12か月の可視表とchartの一致を確認する。主メニューにない月別降水量は既存の保存URLから入り、前後月と比較復帰を検証する。
- 旧テストで最初のchip失敗に隠れていた東南アジアの古いMY統計UI参照も、現在の3分野・品目・公表数量・reloadへ更新する。公表0と欠測の区別は既存 `atlas-asia-controller.test.mjs` と `atlas-asia-industry.test.mjs` の数値・表示・再試行テストを維持する。旧MYの実ブラウザ検証を継続できたとは報告しない。

JPの公表値／秘匿／該当なし、24業種、47都道府県の数値順、年度表、凡例、pointer、比較と戻り、reload、503再試行のアサーションは維持しています。失敗テストのスキップ追加やアジアのプロダクト機能変更は行いません。

## 今後のCIでの実行

既存の `validate.yml` と `pages.yml` のChromium準備後に、修正した1ファイルを両方の明示フラグ付きで実行する段階を加えます。通常の全サイトE2E内では引き続き任意テストとしてスキップされても、その後の専用段階で全プロファイルを実行します。sandboxを強制する同じ検証用importを使います。ジョブ・権限・外部サービス・公開経路の追加や変更はありません。公開リポジトリの既存GitHub Actions上で動きます。

## 修正後の同条件検証

同じ最終テストを、候補のdistと基準mainの不変distに順番に実行し、**両方とも34成功・失敗0・スキップ0・取消0**を確認しました。候補91.9秒、基準94.7秒。これは機能テストの所要時間で、サイト性能の比較値ではありません。PC 1440×1000 / 1024×768とモバイル390×844を含みます。

TAPログ：[候補](reviews/atlas-lightweight-20261015/repaired-candidate-asia.txt)、[基準main](reviews/atlas-lightweight-20261015/repaired-baseline-asia.txt)。[結果JSON](reviews/atlas-lightweight-20261015/repaired-asia-results.json) に最終テストのSHA-256、起動条件、元ログと保存ログのハッシュを記録しました。ユニットも再実行し1,433成功・既存3スキップ・失敗0です。2つのworkflowのYAML解析と明示フラグ設定も確認しました。

この修正中の `src/` 差分は0件で、軽量化の最終38組の画素一致と転送量測定の対象コードは変わっていません。全サイトとGitHub側の再実行結果は、後続のPR・Actionsの記録を参照してください。
