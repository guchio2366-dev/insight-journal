# パナマの別設問指標：画面と操作の記録

旧sandbox無効状態の画像・metadataは合格証拠から撤回し、このフォルダーから除去した。

sandbox有効のパナマ4ケースと先行12ケースは [CI run 38046027106](https://github.com/guchio2366-dev/insight-journal/actions/runs/38046027106) で成功。検証headは `8fbf8630e7c9836282c46e76895e430d3b968e5b`。[新画像・完全なbrowser-results.jsonのartifact](https://github.com/guchio2366-dev/insight-journal/actions/runs/38046027106/artifacts/11667344443) の `panama/` に初期・選択後8枚とsandbox状態1枚、`regions/` に先行地域21枚を保存した。PC想定は1280×665と1024×665で、実機2台ではない。

`chromiumSandbox:true` と実際のsandbox状態を確認。両指標維持、右欄単一、再読込・戻る・人口密度復帰、既存の国・範囲・代替表示状態を検証した。

新画像のダウンロードはこの実行環境で403となり、**新画像の目視確認は未完了**。artifactを参照して親が確認できる。拒否された取得先を迂回していない。最終headの再検証artifact・全体CI状態はPRのChecksと本文で確認する。

[資料・定義・権利・検証方法](../../atlas-panama-census-identity-20261010.md)。metadataには実際のsandbox状態、ソースhead、画像SHA256、CI runを記録する。マージ・公開は行っていない。
