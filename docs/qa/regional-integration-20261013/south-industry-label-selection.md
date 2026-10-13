# 南アジア産業ラベル：選択時の表示集合・配置を固定

2026-10-13、統合Draft [#344](https://github.com/guchio2366-dev/insight-journal/pull/344) の基点 `831bba225b372dd63c7e7d663b38305dd10feb62` に対する追補。日本の追補は別担当で、この修正の対象外。main更新・Ready化・マージ・公開は行わない。

## 確認した不具合と変更

親の独立確認側が、ユーザー提供の同head画像ZIP `south-central-focus-38400005760-1.zip`（Library `libfile_7bb991de4ce0819191e5bfca600c5f29`、9,874,682 bytes、28枚）を正規Libraryから取得し、重要16枚を実見。ダッカ衣料の選択前後で、地図枠・点が同じなのにアーメダバード医薬品／ベンガルールITサービスの名称が消え、鉄鋼名が移動、チェンナイ名が出現した。中央産業と南の茶選択には同じ不具合を確認していない。

`atlas-asia-industry.ts` は選択地点を配置順の先頭へ移し、毎回の衝突判定をやり直していた。さらに、集合名を選択地点名へ置き換え、選択されたcompact地点は名称へ昇格していた。この3つを南アジアの地域産業に限って固定する。

- 初期の配置順と衝突判定を、地点選択中も使う。表示する名称・compact対象・地理座標・anchor／offsetが変わらない。
- ダッカ・チッタゴン等の集合名を選択中も保持。詳しい選択地点名は既存の説明欄で読む。
- compact地点は位置と大きさを保持し、既存の選択色・輪郭・aria-pressedだけを変える。元の一覧／説明への操作を保持。

`focusId === 'south-asia'` の条件だけに適用。中央・東・東南の処理、地図範囲、原データ・点・色分類・産業入口・既存の出典は変更しない。

## 回帰検証と画像の同一性

`tests/unit/atlas-south-industry-selection.test.mjs` は実controllerをbundleし、既存19地点を全て選択・解除する。名称・compact・anchor／offset・地理座標・選択対象を照合する。修正前は最初のダッカ選択で親の画像指摘と同じ変化を再現して失敗し、修正後は成功した。DOM用のmap/Marker代替は単体の範囲で、実画面合格の代用にしない。

既存 `tests/e2e/atlas-south-central-focus.test.mjs` に、sandbox付きChrome／DPR1での1920×1080、1440×900、1024×768の回帰を追加。各幅で19地点を全て選択し、表示集合・compact状態・名称と地図に対する相対矩形を選択前と比較（許容0.75 CSS px）。地図枠・camera・選択強調も検査。初期／ダッカ選択／compact選択／リセットを撮影する。元の1920幅のダッカ選択と履歴解除も同じ検査で確認する。

親の追加指定に従い、南／中央の気候都市未選択初期、中央地形の地点選択後、中央の民族→宗教→民族への復帰も撮影する。前者の気候初期は国・都市未選択をassertし、後者は元の国選択なし・透過度0.80→0.43→0.80のassertを維持する。

全画像は既存CI artifact `south-central-focus-<run>-<attempt>` に保存。追加した `review.json` はcheckoutの40桁head、指定review head、buildのrelease情報、各PNGのhead・viewport・DPR・画素寸法・bytes・SHA256・URL／状態を記録する。産業選択の検査前後の表示集合・相対矩形・cameraも記録する。buildRelease.commitShaは既存のGITHUB_SHA（PR検査用合成commitの場合がある）と区別し、撮影headを捏造しない。workflow・公開設定の変更はない。

## 目視・取得制限

この担当の正規Library consumer-local取得は、返された完全なtransferを現行helperへ渡して1回実行したが `library file transfer failed: download failed`。HTTPコードは返っていないので403と推測せず、再試行・拒否配信先への別経路取得は行っていない。この担当が元ZIPを実見したとは扱わない。

ローカルChromiumの既知sandbox helper不備と、提供Browserサービス不在も再試行／無効化していない。実Chromeの撮影・幾何／操作は既存CIで検証し、修正後の画像目視は親の独立確認へ返す。新headと最終CI・artifact IDはDraft本文で記録する。この限定修正で全地域の画像受入や資料不足を完了扱いしない。
