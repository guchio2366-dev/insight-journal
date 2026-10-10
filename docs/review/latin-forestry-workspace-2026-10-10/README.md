# 中南米：農畜産・林業の共通ワークスペース

中南米の林業ページを `LatinAmericaWorkspace` の map / items / reading-heading / reading / sources に接続する。農畜産と同じ地域ナビ、大分類帯、ニュース欄、地図・右説明欄、農畜産／林業切替を使う。林業の地物・代表位置・解説・統計・取得状況は変更しない。

農畜産／林業の切替は `LatinAgricultureNavigation` に集約。大分類では農林業、サブ切替では実際のページを active としてSSRから表示する。遷移先に国・地域・強調・数値表示フラグを引き継ぎ、戻る・再読込時も実際のルートの active を維持する。

## PC確認の再現

`npm ci && npm test && npm run build && npm run test:e2e && npm run verify:release`

`REVIEW_CHROME_PATH=/path/to/chrome node scripts/verify-latin-forestry-workspace.mjs`

主確認は1920×1080 **CSS viewport**、DPR=1、初期ズーム100%、scroll=(0,0)。1024×768は補助。PNGの画素寸法、CSS実寸、DPR、visualViewport.scale、各ナビの順序・寸法・色・active、ニュース／地図／右説明欄／サブ切替の矩形、commit SHA、画像SHA256を report.json に記録する。スクロールやズーム変更によって位置を合わせない。通常のクリック、農畜産⇔林業、ブラウザの戻る／進む、直接URL、事例選択の再読込を確認する。

既存 `Regional forestry PC review` CI はPR headのbuildを測定し、PR baseも別checkoutでbuildして同じ条件のbefore画像を保存する。成果物名は `regional-forestry-pc-review-<head SHA>`。CIはcontents:readのまま。ブラウザは通常のサンドボックスを有効にして起動する。公開・デプロイはしない。

この実行環境のChromiumはSUID sandboxの設定不備により起動できなかったため、ローカルPC目視を合格扱いにしていない。CI画像の取得・目視結果はPRの検証報告で確認する。

## 同じ林業共通部を利用する地域の読み取り点検

| 地域 | 農畜産側の根拠 | 林業側の根拠 | 所見・今回の範囲 |
| --- | --- | --- | --- |
| 中南米 | `LatinAmericaWorkspace.astro` の横幅を使う `latin-fields` と地図内サブ切替 | 変更前は `RegionalForestryPage.astro` の独立 `forest-fields` | 今回、既存の共通ワークスペースへ接続 |
| アフリカ | `src/pages/atlas/africa/index.astro` の `africa-fields`（5列）と `africa-map-subfields` | `RegionalForestryPage.astro` の `forest-fields` と地図下の `forest-subfields` | 同じ独立外枠への切替があり、不整合が残る。独自外枠の改修は今回行わない |
| オセアニア | `OceaniaLearningPage.astro` の地域ナビ・`oceania-learning-fields`・`oceania-workspace-subviews` | `RegionalForestryPage.astro` の独立見出し・`forest-fields` | 同じ独立外枠への切替があり、不整合が残る。独自外枠の改修は今回行わない |
| ロシア | `RussiaLearningPage.astro` の地域ナビ・`russia-learning-fields`・農林業のサブ切替 | `RegionalForestryPage.astro` の独立見出し・`forest-fields`、`RegionalForestryFrame.astro` のRussiaNewsRail | 同じ独立外枠への切替があり、不整合が残る。独自外枠の改修は今回行わない |

林業地図・解説・出典の共通部品抽出は上記4地域に作用する。中南米以外の3地域の外枠・ナビ・内容は保持し、CIで1920×1080の修正前後の矩形とPNG SHA256の一致を確認する。森林データ不足、統計内容、地図内の代表点、カナダ産業のコード・レビューは対象外。
