# 南アジア：三分野別の地図・引き渡し

基点は公開版／取得した最新main `6f3d4a27c17bf205220d0eb44563975af2bcbdad`。
地域固有の修正のみ。commit・push・PR作成・マージ・デプロイは実施しない。

## 現状と修正範囲

現行の共有描画 `atlas-asia-industry.ts` は、South用readingがある場合、分野のフィルタを省き全45地点を薄く残す。凡例も12業種すべてを表示する。既に分離済みの地図が過密なのではなく、他分野の混在と145×56pxの付箋・長い引出線が重なっている。

**共有描画の接続は未実装。下記の地域差分だけでは公開画面の分離は完成しない。** 共通UI担当 `01a13bda-c2ca-71a3-83a7-b710ce4610c1` が接続してから、実ブラウザーで統合確認する。

| 分野 | 元の地点 | 地域見出しの候補 | 960×640の文字見出し | 360×520の文字見出し |
|---|---:|---:|---:|---:|
| 資源・エネルギー | 13 | 11 | 9 | 8 |
| 製造業 | 24 | 18 | 15 | 8 |
| サービス業 | 8 | 8 | 8 | 7 |

元の45地点、82指標、43資料、座標・工程・規模・根拠年は変更しない。ブータンの水力、オディシャの鉄鋼、マネサル周辺の二輪車、ハリヤーナの乗用車、グジャラートの医薬品、スリランカ高地の製茶の見出しをまとめる。集約するのはラベルであり、原地点は残す。新たな中点・工場・能力合計は作らない。

文字は業種と地名の二段・30px高・最大132px幅。白い細縁の文字と小点を使い、大きな付箋・規模の第三段・引出線は置かない。規模と工程は選択後の解説へ残す。携帯幅は8見出しまでとし、同じ業種の地名を増やす前に全業種の見出しを一つずつ確保する。初期範囲はモルディブも含む `[60,-1,98,39]`。他分野の範囲は変更しない。

## 共通描画側への接続契約

地域APIは `src/data/atlas/south-asia-industry-cartography.ts` の `southIndustryMapView(topic, country)`。
`sector/groupIds/groups/sites/labels/bounds/reading/guides` を返す。品目topicも所属する分野の地点集合を返す。旧 `sc-overview`・未指定は資源・エネルギーへ解決し、45地点の全分野図を返さない。

共有ファイルに必要な変更（この差分には含めない）：

1. `src/scripts/atlas-asia-industry.ts` のSouth地域描画で `view=southIndustryMapView(state.topic,state.place)` を取得。円・hit layer・選択リングの全フィルタに同じ `view.groupIds` と国条件を適用する。`southReading` を理由にフィルタを省略する箇所を残さない。
2. GeoJSON原点は45件を保持してもよいが、表示・hitは `view.sites` の13／24／8件に限定する。他分野を低い不透明度で残さない。
3. ラベルは `southIndustryLabelLayout(view.labels, p=>map.project(p), canvas, view.sites.map(s=>s.point))` を使用。`placement` のある見出しだけを作り、`label.industry` と `label.place` を二段に表示する。CSS変数 `--south-label-width` に `placement.width+'px'` を渡す。選択を配置順序・衝突判定・文字量の入力にしない。
4. 元地点の円は4px程度、hit範囲は別に保持する。省略した見出しの代わりに16pxの大量のDOMボタンを重ねない。元地点はhit layerと分野内一覧から選択可能にする。
5. 見出しのクリックは `label.anchorId` へ、見出しの選択強調は `label.siteIds.includes(state.detail)` へ結び付ける。他の構成地点を選んでも施設の出典・規模はその地点に属する。集約見出しを新施設や地域生産量にしない。
6. `view.guides` は空。Southの旧label guide SVGを作らず、前分野の線も消す。今回のデータに根拠ある取引・輸送線はない。
7. `select/normalize/hit` も `view.sites` で検証し、他分野の古いdetailを解除する。同じ分野内の地点選択はカメラ・見出し位置を変えない。分野切替時の初期カメラだけ共通UIで扱う。
8. `AsiaFieldNavigation.astro` と `atlas-asia-navigation.ts` は三分野を別地図の入口として扱う。旧13品目ストリップはSouth固有CSSで非表示にした。全分野の「全体」図へ戻さない。凡例・所在地一覧・下部統計は地域reading側で選択分野に絞っている。

`tests/e2e/atlas-south-central-focus.test.mjs` と `scripts/verify-south-asia-industries.mjs` の「分野・品目を変えても常に45ラベル」という旧条件は、新しい指示と両立しない。共通担当で分野別13／24／8点、見出しの集約、同一分野内の選択不動性、他分野のhit・線・凡例が0であることへ更新する。今回、南アジア専用unitテストは新契約へ更新した。

## 確認したもの・未確認

- 南アジア専用unit 5件成功。三分野の排他性、原45地点の保全、同一分野内の品目選択で配置不変、短い隣接ラベル、重なりと枠内収容、凡例・一覧・統計の一致を検査。
- 全unit：1,402件通過、失敗0、既存skip 3件。本番ビルド・`verify:release` 成功。
- 静的SVG／Sharpのプレビュー6枚（960×640と360×520 × 三分野）を目視。全業種が一つ以上の見出しを持つ。ラベルと点の原データは地域APIと同じ。
- **実サイトの新表示・MapLibreの描画・実ポインター／タッチ・統合後の画面は未確認。** ローカルChromiumはSUID sandbox helperの所有者設定不備で起動不可。サンドボックス無効化や権限変更はしない。静的プレビューをブラウザー画面の確認済みとは扱わない。
- `scripts/preview-south-asia-sector-maps.mjs` で再生成可能。例：`XDG_CACHE_HOME=/tmp/south-asia-sector-font-cache node scripts/preview-south-asia-sector-maps.mjs /tmp/south-asia-sector-readability-preview`。

作業ツリー：`/workspace/insight-journal-south-sector-readability`（基点でdetached）。以前の作業ツリー・branchは保持。保全先：`/tmp/south-asia-sector-readability-preserved/`。
