# 南産業の追加撮影：地図への復帰と描画完了の確認

2026-10-13、[Draft #344](https://github.com/guchio2366-dev/insight-journal/pull/344) の `c528febc2900ec03a5f9c41154f9b72d116c2c11` からの撮影追補。親は正式取得した48 PNGのhead/hash/bytes/寸法/viewport/DPRとreview.json、重要16枚と32選択記録を照合し、通常選択のラベル不具合解消、気候初期未選択、中央地形の国選択なし、民族→宗教→民族の復元を確認した。

残った問題は、一覧へスクロールした選択後画像に地図がないことと、履歴解除画像の地図面・鉄鋼名付近の描画欠け。後者が持続するアプリ不具合か描画途中かは、この追補の実Chrome検査で区別する。旧画面の全面再撮影、産業データ・配置・選択仕様・日本の変更はしない。

## 撮影位置と状態

地図要素へ `scrollIntoView` で戻し、カーソルを地図外へ移す。URL、選択地点、国選択、MapLibreの生のcenter/zoomを前後で完全照合する。地図の四隅が画面内にあり、別の要素で覆われていないことも検査する。地図をpan/zoomして撮影位置を調整しない。

## 描画待ちと欠けの検査

単なる通信完了・2 RAFから、MapLibreのpublic API `loaded()`、`areTilesLoaded()`、`isMoving()`、WebGL contextの健全性と、実際の地図画像の安定を確認する。撮影専用windowフラグがある南アジアセッションだけ、rootに読み取り用のmap getterを用意する。通常製品セッションの動作、scene、camera、styleを変えない観測口であり、強制再描画・drawing buffer設定変更はしない。

地図clipを繰り返し撮影し、同じSHA256が3回以上・500ms以上続くことを要求する。安定した初期画面に既存の海・陸の描画色が実在することも確認し、空白の安定を合格にしない。

各選択後／履歴解除の画素を同じpageの初期地図と比較する。HTMLラベル・点の範囲を除外し、1画素隣接とRGB差3までの既存描画差を許すが、残る地理画素の不一致が0.5%を超えると失敗する。鉄鋼名の暗色画素は別に照合し、初期の95%未満なら失敗する。名前・表示集合・位置の既存検査も維持する。持続する欠けを強制再描画で隠して撮影しない。

安定確認用clipだけでなく、保存した未加工の全viewport PNGを読み、同じ地図範囲の画素を比較する。保存するPNGを加工せず、出力画像そのものの地理面・鉄鋼名の欠けも検査する。

## 追加画像だけの資料

既存のSouth/Central撮影出力・artifactを使い、focusedモードでは以下8 PNGとreview.jsonだけを保存する。workflowや公開設定の変更はない。PNGとJSONの合計が20,000,000 bytes未満であることを検査する。

- 比較用 `south-asia-industry.png`
- 履歴解除 `south-asia-industry-cleared.png` と再確認 `south-asia-industry-cleared-confirmed.png`
- 1920／1440／1024各幅の `*-south-asia-industry-selected-sc-chattogram-garments.png`
- 1440／1024各幅の `*-south-asia-industry-selected-sc-dhaka-garments.png`

review.jsonには従来のhead/hash/bytes/PNG寸法/viewport/DPR/URL/状態を保持し、地図の画面内矩形、位置調整前後の状態、描画準備状態、安定回数／時間、比較したcanvas hash、地理画素と鉄鋼名の比較結果を追加する。初期／選択操作の従来検査は続けるが、親が受入済みの48枚を新資料へ重ねて保存しない。最終head・CI・artifactと欠けの判断はDraft本文へ記録する。

この担当は既知の画像・ブラウザー取得制限を再試行／迂回しない。実Chromeは既存CIで実行し、修正後の画像目視は親の正式取得・独立確認へ返す。Draft・main・未公開を維持する。
