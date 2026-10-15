# 東アジア主要産業：分野分離と注記のローカル修正

基準は公開main `6f3d4a27c17bf205220d0eb44563975af2bcbdad`。旧作業のworktreeとコミットは保持し、別のdetached worktree `/workspace/insight-journal-east-asia-readability` で作業。新しいcommit・push・PR・公開は行っていない。

## 現状の診断

描画コードは既に `eastSectorRows(sector)` で分野を絞っていた。しかし、品目を二分野に登録する方式により、銅の鉱山も製造業図に入り、磁石工場が資源図、設計オフィスが製造業図にも出ていた。これは操業工程の混在である。同時に、製造業20項目を最大2か所ずつ地図内ボタンとして置く注記方式が過密を作っていた。

## この差分

- 操業地点は一つの分野へ所属させる。資源21・製造50・サービス18、元の89地点を一つも削除しない。
- 資源図：採掘、ガス受入・採取、発電、燃料精製、Ga原料。製造図：工場・素材製錬。サービス図：金融・IT・港湾・教育研究・半導体設計オフィス。
- 銅は主題を共有しつつ、オユ・トルゴイの採掘は資源、東予の製錬は製造に限定。品目数は資源6・製造17・サービス5（銅だけは両方の主題にある）。独立品目27、主要採用21品目と統計・出典・工程・座標・操業状態は保持。
- 地図内の産業選択ボタンを廃止。非操作の短い産業名＋地名注記に置換。産業名を太字・先頭、地名を補足にし、地名だけの注記にはしない。枠・付箋背景なし。幅650px未満は最大4、650–1099pxは8、それ以上は10注記。引出線は6–24px。
- 同一国・同一産業・約125km以内かつ32px以内の近接地点名をcomplete-linkで集約。元の案内点は動かさず、拠点一覧も保持。注記の配置は選択を入力に取らない。単独表示で追加注記を見せる場合も事前計算済みの位置を使用。
- 目立つ一つの産業のラベルで他産業を押し出さないよう、産業の種類を優先して近接候補を同時に配置する。数量による順位や代表性を示す選定ではない。

## 共通UI担当へ必要な変更

共通ファイルは変更していない。次を統合側で扱う必要がある。

1. `AsiaFieldNavigation.astro`：東アジアの三分野を唯一の主ナビにする。特にモバイルの汎用5分類との二重表示を整理し、17個の製造業品目ボタンは地図外のコンパクトな選択へ。「全産業」「分布全体」は選択分野の分布であることが分かる名称にする。
2. 三分野の入口は `east-resources` / `east-clusters` / `east-services`。切替では `sector` だけでなく対応するoverview topicへ変更し、旧detail・onlyを解除する。地域コントローラーの `data-east-industry-sector` ハンドラーは既にこの動作を持つ。
3. 共通 `src/data/atlas/asia-industry.ts` の `normalizeIndustryState`、clusters分岐は、既に計算している `sector` を戻り値にも保存すると旧URLの分野と表示を一致させられる。今回、設計はservices、磁石はmanufacturing、Gaと燃料精製はresourcesへ所属を明確化したため、古いsector queryの扱いを統合側で確認する。
4. 共通 `tests/e2e/atlas-asia-workspace.test.mjs:72` の固定品目数を **7/20/5 → 6/17/5** に更新する必要がある。overviewを加えたDOMの選択肢数は7/18/6。clusters topic総数30は同じ。現行の固定数によりこの1件が失敗することを確認済み。
5. 凡例は選択分野だけを生成済み。長い全品目凡例の開閉・配置は共通UI側で整理できる。色と品目の対応を失わないよう完全な凡例への経路は保持する。

地域APIは従来どおり `createEastIndustryClusters(root,getState,navigate,camera)`。`eastSectorRows` は操業工程で絞った地点を返す。新しい注記は `span[data-east-industry-annotation]`。既存 `data-industry-label`・アンカーID・座標の属性も残すが、注記はボタンではなく、全品目名が地図上に現れる契約ではない。

## 検証と未確認

- 関連単体15件成功：分野外の点・色・ラベル・凡例が混入しない、89地点を一度ずつ保持する、グループが国・産業を跨がない、注記数・24px上限・重なり・選択後の固定配置・全21品目の根拠データ保持を確認。
- ビルドと公開物検査は成功。
- 共通Asia workspace E2Eは4成功・1失敗。失敗は上記の固定数 `7 !== 8`（資源6品目＋overviewを、旧7品目＋overviewと比較）の1件。共通テストは変更していない。
- 現行mainに合わせてsandbox有効のChromium起動を実行したが、SUIDヘルパー所有・設定の前提で停止。sandboxを無効化したり機械権限を変更したりしていない。
- **修正後の実ブラウザ画面・実フォント・クリック・スクロール・モバイル操作は未確認。可読性確認済みとは扱えない。** 統合側の適格なブラウザ環境で1920／1896／1440／390pxの三分野・選択・単独表示・履歴を撮影する必要がある。
- 保存済みの以前のPC画像を参照。新しい実画面の代わりにはしていない。`/tmp/east-asia-readability/model-*.png` は座標と配置関数を用いた**静的模型**で、画像内にもブラウザ画面ではない旨を表示。模型の文字幅は仮定値である。

再現：`node --test tests/unit/atlas-east-industry-annotations.test.mjs tests/unit/atlas-east-industry-sector-isolation.test.mjs tests/unit/atlas-east-industry-navigation.test.mjs tests/unit/atlas-east-industry-evidence.test.mjs tests/unit/atlas-east-asia-industry-sectors.test.mjs`。ビルド後、適格な環境で `EAST_INDUSTRY_REVIEW_OUTPUT=/tmp/east-readability-browser node scripts/verify-east-asia-industries.mjs`。
