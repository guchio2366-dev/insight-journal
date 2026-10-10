# 全国構成表示のレビュー記録

旧sandbox無効状態の画像・metadataは合格証拠から撤回し、このフォルダーから除去した。

sandbox有効の12ケース（1280×665／1024×665）は [CI run 38046024870](https://github.com/guchio2366-dev/insight-journal/actions/runs/38046024870) で成功。検証headは `21612ea875a824bf6ad2df5eefbc48b3db35d570`。[新画像21枚・完全なbrowser-results.jsonのartifact](https://github.com/guchio2366-dev/insight-journal/actions/runs/38046024870/artifacts/11667379414) に、初期・選択後の画面とsandbox状態を保存した。Chrome 154.0.8037.97、日本語Noto CJKフォント。実機2台ではない。

`chromiumSandbox:true` を固定し、実際のPID／network namespace、Seccomp-BPF、有効なsandbox状態を検査。地図内カード境界・重なり、他分布維持、右欄内単一区分、URL再読込・戻る・人口密度復帰、JSなしの全数値表を確認した。日本語フォントで判明したカード境界の問題は人口表示の配置に限定して修正した。

新画像のダウンロードはこの実行環境で403となり、**新画像の目視確認は未完了**。artifactを参照して親が確認できる。拒否された取得先を迂回していない。最終headの再検証artifact・全体CI状態はPRのChecksと本文で確認する。

[資料・定義・検証方法](../../atlas-population-culture-20261010.md)。metadataには実際のsandbox状態、ソースhead、画像SHA256、CI runを記録する。マージ・公開は行っていない。
