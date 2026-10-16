# 農林業13地域の統合候補・検証記録

**全域完成・公開済みではない。必須原表の不足が残るため、マージとPages公開は保留。**

基準mainは軽量化公開済み `3fbb4c957c21685bddbf8148a95a2a03ba210553`。13地域の最終部分成果を統合したapplication commitは `58be943225b7fdef8bb68392c7e377571305007d`。後続 `a80a153fcf3156de1e089bb95b1b955e6f4ecfd9` は東南アジアの検証scriptで、林業画面の非表示ボタンではなく可視の「農畜産」タブから未選択へ戻る修正だけを含む。src/public/data-sourceとbuild設定は同一。

最終成果の元SHA・原本一致確認は [regional-provenance.json](regional-provenance.json)。地域固有のapplication/dataは担当最終SHAと一致し、共通接続は南アジアcontroller、東アジアの参考、アフリカ林業pageなどの別ファイルへ追加した。日本専用、品目未選択時の新仕様、新しい年度選択UIは追加していない。ロシアの旧試作年度selectorも取り込んでいない。

## 実行した検証

- 単体：1,555件中1,552成功、既存skip3、失敗0。各地域の保存原票・hash・抽出・数量定義の検査を含む。
- ビルド・配信境界検査：成功。候補の `_release.json` を実際にビルドしたSHAへ設定し、HEAD一致とapplication/test/source入力の無変更を検査。
- 全E2E初回：683件中671成功、既存skip11、失敗1。アフリカ林業の閉じた統計詳細内の対象国選択を旧テストが地図用selectorと誤認した。対象国未選択・詳細閉鎖・他の地図selector追加なしを検査する修正後、影響範囲の3ファイル10件が成功。全件の最終HEADでの再実行はGitHub CIの結果を別に確認する。
- ローカル実ブラウザー：13地域すべての担当検証が成功。1896×996と1280×665 CSS px、両方DPR1.5。12地域は `58be9432`、東南アジアは検証scriptだけを修正した `a80a153f`。同一capture SHAと偽らず [local-browser-summary.json](local-browser-summary.json) に区別して保存。
- 実行中Chromium 151.0.7922.173のNamespace、PID/Network namespace、Seccomp-BPFを各実行で確認。OSやhelperの設定、sandbox無効化flag、ユーザーPC接続は使用していない。
- 成功した地域実行から480画像を取得。そのうち13地域・両profileを含む代表27画像を実際に目視。[manual-image-review.json](manual-image-review.json) は見た画像、hash、対象、所見を列挙する。480画像すべてや全品目の数値を個別目視したという意味ではない。欧州林業は担当captureが既存参考表を対象にしていたため、主3列も別に2profileで撮影・検査した。
- 軽量化回帰：米国自然・人口・農業、メキシコ人口のcold loadを両profileで8件確認。自然・人口の農業資産先読みとメキシコの旧人口SVG読み込みが戻っていない。性能の前後比較を再計測したという意味ではない。[lightweight-regression.json](lightweight-regression.json)。

最初のブラウザー実行では、スクロール前後のY座標比較、閉じた参考内の列の数え込み、12px注記と本文の混同、出力先設定、既存の短いPC地図幅、非表示復帰ボタンの操作という検証側の問題を修正した。実際のDOMで原因を切り分け、アプリの数量をテストに合わせて変えていない。小比率の「0.01%未満」は円内で2行に折り返す例も目視記録に残している。

画像そのものと詳細ログはクラウド環境の `/workspace/agro-statistics-local-handoff/` に保持する。GitHubの農林業review workflowでも最終PR HEADの全13地域を再撮影し、従来のartifactへ保存する。ここに保存したローカル結果をCIの結果へ読み替えない。

## 原表の残件と公開判定

[data-coverage.json](data-coverage.json) は `dataGatePassed: false`。現段階の共通正規化検査は保存済みWASDE22行で、原表hashエラー・構造エラーは0、全行が相手数量未充足などでpartial。構造上のgap78件は、全不足観測値の件数ではない。新しい地域固有packetの全行をこの22行だけで照合済みとは扱わない。13地域の全選択・国／地域・加工段階inventoryの最終照合も未完了。

不足原表は [重複を除いた最小取得依頼](../../atlas-agro-source-request-minimum-20261016.md) に集約した。

1. QCLの同版・同年の国別生産と公表World。
2. FBS/SUAの用途・輸入・輸出・在庫と製品対応metadata。
3. 同期間・同製品のWorld＋全Partnerの輸出入数量。
4. FO/JFSQの加工段階別数量と対応する林産物全相手表。

「4ファイルで全完成」とは限らない。販売年度の全月相手表、畜産・乳の換算、森林の実投入・在庫、PNGカカオの独立公式確認、複合分類の対応は依頼に別記した。欠測を0にせず、P−Xを消費と呼ばず、金額円を数量円に変換しない。取得拒否の記録は保持し、拒否URLの再試行や制限回避はしない。

review workflowの数量充足stepはこれらの必須不足が残る間は失敗する。画面検証や一般回帰が成功しても、全地域完成としてready化・merge・Pages deployを行わない。

## 既存CIレビューの追補

旧地域林業とアフリカPC確認の失敗を調べ、検証対象を現行の選択時panelへ対応した。共通レビューは従来の1440×900・1024×768・390×844を維持し、63ケース・40操作、エラー0。アフリカは22場面、地域林業は1920×1080・1440×900・1024×768の9地域／画面組合せで成功。旧統計用の選択欄も特定の名前に限定し、未選択では閉じる／隠すこと、既存地図のラベル・カメラ・zoom・履歴・readerの条件を維持する。アフリカの明示解除後は、初期の未選択統計HTMLと完全一致することも検査した。

[legacy-review-followup.json](legacy-review-followup.json) はこのローカルworking-tree検証の記録であり、最終CI成功とは区別する。追加修正はQA scriptだけで、application/dataは上記 `58be9432` から変えていない。CLI認証が401になった後は、接続済みGitHubアプリでPRとCIを読み取って作業を継続した。公開権限の追加や認証回避は行っていない。
