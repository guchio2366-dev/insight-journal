# 承認済み地域修正の統合検証（未公開）

対象は既存 Draft PR #332〜#343 の12件。公開基点は `a07ab7277b2c7eb89e51ef1be0d72dccfbec497d`。検証専用ブランチは `codex/regional-integration-validation-20261013`。12個の固定headを親として統合した実装チェックポイントは `51043c14a2d9216c19ea058997dd77db11590a58`。

この統合は地域全依頼の完了判定、公開、main更新の代わりではない。元12PRはDraft・未マージのまま、元ブランチ・headを更新していない。Ready化、auto-merge、Pages実行、公開設定、依存関係、費用・権限の変更は行わない。

## 固定headと取り込み順

最初に#336以外の11 remote headを確認し、そのSHAだけを取り込んだ。以後のremote更新は追従しない。#336は最初から除外し、親／ユーザーが「PRに記載された最終版を使う」を選んだ後、`49ebae11372a08e17750ed05c6f57111c360089e`を最後に取り込んだ。40桁のSHAと元ブランチ名は [fixed-heads.json](fixed-heads.json) に保存。

| 順 | 元Draft PR | 地域 | 固定head |
|---|---|---|---|
|1|[#332](https://github.com/guchio2366-dev/insight-journal/pull/332)|カナダ|`ec603ceb`|
|2|[#333](https://github.com/guchio2366-dev/insight-journal/pull/333)|メキシコ|`45db8625`|
|3|[#334](https://github.com/guchio2366-dev/insight-journal/pull/334)|中南米|`8daa7d64`|
|4|[#335](https://github.com/guchio2366-dev/insight-journal/pull/335)|欧州|`319bcc72`|
|5|[#337](https://github.com/guchio2366-dev/insight-journal/pull/337)|アフリカ|`441dd136`|
|6|[#338](https://github.com/guchio2366-dev/insight-journal/pull/338)|東南アジア|`2c77f87e`|
|7|[#339](https://github.com/guchio2366-dev/insight-journal/pull/339)|南アジア|`8285dfff`|
|8|[#340](https://github.com/guchio2366-dev/insight-journal/pull/340)|中央アジア|`23cebe68`|
|9|[#341](https://github.com/guchio2366-dev/insight-journal/pull/341)|東アジア|`780ee82a`|
|10|[#342](https://github.com/guchio2366-dev/insight-journal/pull/342)|日本|`4f89febf`|
|11|[#343](https://github.com/guchio2366-dev/insight-journal/pull/343)|西アジア|`0960013f`|
|12|[#336](https://github.com/guchio2366-dev/insight-journal/pull/336)|オセアニア／ロシア|`49ebae11`|

## 競合の解決と保持した意味

保存済み [南・中央の5ファイル統合案](../../../data-source/atlas/south-central-asia/draft-merge-plan-20261013.md) に従い、#339→#340の順で地域条件を合成した。全ファイルのours/theirs採用で片側の変更を捨てていない。

| 統合箇所 | 保持した地域別の変更 |
|---|---|
|`AsiaAtlasPage.astro`|南のcrop/livestock原ファイル・季節風出典、中央の専用家畜／居住域ファイル・ラベル・トゥラン／偏西風出典、東南の季節風と沿岸流説明、東の作物集積ラベル・海域／林業説明・地域用基図の定義|
|`AsiaSettlementPanel.astro`|南のスリランカ2024全国・地区の民族回答とインド2011州宗教、中央のカザフ2025全国民族と限定GeoEPR/EPR-ED面、東南の国勢調査の地方差、東の限定宗教文化圏。年・分母・全国値と居住面を混ぜない|
|`AsiaFieldNavigation.astro`|南の三産業入口、東の三分野／個別業種、既存の他地域用分類帯を保持|
|`atlas-asia-explorer.ts`|南の作物面クリック・ブラマプトラ、中央の地形／標高で国選択を作らない制御、東南の大陸／島嶼範囲とURL、東の林業地点選択・地形操作とタブ往復のカメラ保持を合成|
|`atlas-asia-presentation.ts`|南の非排他的作物面・8家畜面・インド34区域宗教、中央の6家畜面・一律濃度・宗教透過度0.80→0.43→0.80、東南の雨量色／河川名／季節風・海峡、東の集積内ラベル・林業地点・初期宗教文化圏・地形の河川を保持|
|`atlas-south-central-focus.test.mjs`|南・中央双方の初期地域・操作・PNG一覧を保持。南の三産業／作物重複域と中央の地形国選択解除／宗教透過度復元の独立試験を両方残す|

#339取り込み時はpresentationの1ファイル、#340は上記保存案の5ファイル、#341は画面／ナビ／社会説明／controller／presentationの5ファイルで実競合を解決した。欧州／西アジアの共通レイアウトテスト、物理説明・雨量凡例・産業・水資源・比較などの非競合自動合成も点検した。

全12固定headが統合チェックポイントの祖先であることを確認。元PR固有630ファイルはそれぞれの元headとGit blob/modeが一致し、欠落0。重複13パスは [preservation.json](preservation.json) に記録した。新しい原データ・面・数値・業種・仕様は追加していない。

元PRが含む承認済みの検証ワークフロー7件は、各元headと完全一致している。統合作業独自のworkflow変更は0。`pages.yml`、依存関係lockfile、公開設定は基点から無変更。新しいブランチへのpushとDraft PRで既存の読み取り専用検査を起動する。

## 受入記録とスキル

全12PR本文の受入・CI・目視・未達を確認し、次の保存記録を参照した。旧head画像を統合headの画像と呼ばない。

| PR | 保存済み受入・不足記録 |
|---|---|
|332|[Canada implementation](../../../data-source/atlas/canada/followup-20261012/implementation.json)、[remaining-items](../../../data-source/atlas/canada/followup-20261013/remaining-items.json)|
|333|[産業3分野](../../atlas-mexico-industry-three-sectors-20261012.md)、[農業三列の原表](../../reviews/mexico-agriculture-three-column-status-20261013.md)|
|334|[地域修正・林業加工](../../atlas/latin-review-revisions-20261012.md)、[産業三分野](../../atlas/latin-industry-sectors-20261012.md)|
|335|[欧州継続点検・最小入力](../../review/europe-2026-10-13/README.md)、[産業](../../review/europe-industry-2026-10-12/README.md)|
|336|[9＋9受入](../../oceania-russia-ux-refresh-acceptance-20261012.md)、[作物帯とNZ加工](../../oceania-crop-belts-nz-processing-20261013.md)|
|337|[第三弾](../../atlas-africa-third-review-20261012.md)、[残件台帳](../../atlas-africa-remaining-20261013.md)|
|338|[第四レビュー](../southeast-asia-fourth-review-20261012.md)、[民族・米原表](../southeast-asia-ethnicity-trade-audit-20261013.md)|
|339|[家畜生成](../../../data-source/atlas/south-central-asia/south-livestock-generation.md)、[社会原資料監査](../../../data-source/atlas/south-central-asia/south-subnational-social-audit-20261013.md)|
|340|[第二段](../../../data-source/atlas/south-central-asia/central-second-pass.md)、[社会原資料監査](../../../data-source/atlas/south-central-asia/central-subnational-social-audit-20261013.md)|
|341|[地域・産業](../../east-asia-second-feedback-20261012.md)、[食料・木材残件](../../east-asia-food-wood-residuals-20261013.md)|
|342|[地図と地方](../../japan-layout-review-2026-10-12.md)、[農業数量監査](../../japan-agriculture-regional-2026-10-13.md)|
|343|[宗教原資料](../../atlas-west-asia-religion-source-review-20261013.md)、元PR本文の最終受入|

workspace、基点、固定headの全Git treeに`AGENTS.md`／`.agents/skills`がなかった。不存在を以前の未保存作業の不存在とは扱わない。利用可能な [testing-data-visualizations SKILL.md](skill://Plugin_40dab999fe9c8191bbc2f550371692fc/testing-data-visualizations/SKILL.md) を検証設計に適用。新規レイアウト提案や生成画像による再設計は対象外。

## 検証チェックポイント

この文書はDraft作成前の保存記録。最終の統合head、全CI結果・artifact ID、失敗への対応は統合Draft PR本文に追記する。

- ローカル本番ビルド：112ページ成功。初回はAstroのtelemetryが書込不能なホーム設定へアクセスして失敗したため、既存CIと同じ`ASTRO_TELEMETRY_DISABLED=1`を指定して成功。npm cacheも書込可能な`/tmp`へ限定。依存版・権限を変更していない。
- release境界：成功。初期ローカルbuildの`commitSha=local`は実SHAとの一致証拠ではない。保存後に`generate-release --commit`／`verify-release --commit`で検証headへ明示照合する。
- 単体：先行実行は1,292成功／3既存skip／0失敗。built E2Eと同時の再実行では1,290成功／3skip／2失敗。既存Mexico surface試験の`prepared surface controller settled`待機期限が原因で、元headと同一のコード／試験を保持。並行負荷の影響は仮説に留め、順次再検査で確かめる。期限・assertion・skipを緩めない。
- built E2E：実行中。全体結果、既存条件付きブラウザ試験のskipと実ブラウザ実行を区別して記録する。
- PC実ブラウザ：標準sandbox起動を一度確認し、既知の`setuid_sandbox_host.cc:166`で停止。helperはnobody所有／4755。sandbox無効化、所有者変更、権限拡大は行っていない。既存CIのsandbox付きChromeで各地域と共有経路を検査する。
- 統合headでの画像目視：このチェックポイントでは未実施。既知の画像／ログ配信403経路を再取得・別経路で迂回しない。CIによるPNG生成・幾何／操作合格と、人による画像目視を分ける。

## 真の未達と親へ返す判断

以下は統合で解消する資料不足ではなく、各固定PRが明記した残件。保存した実装の範囲と不足入力を保持する。

| 地域 | 継続する不足・完成扱いにしない範囲 |
|---|---|
|カナダ|CTの実出自／宗教、年度別伐採面・正確な施業区画、原NetCDF再照合、元添付画像|
|メキシコ|名付き本流・河口／流向・地下水原表の結合、SUA需給・輸出相手・複数年世界比|
|中南米|全域森林、正確な工場敷地、実流域／地下水、全域の民族宗教実居住域|
|欧州|7自然全流域・本支流接続、Kaisaniemiの同期間降水、酪農・ブドウ・オリーブ個別面、欧州全域の社会／言語分布|
|オセアニア／ロシア|全域林業、自然流域・地下水、追加作物／用途別家畜、実施設と供給網、民族宗教。共有林業の外枠不整合は中南米台帳の既存残件として保持|
|アフリカ|全域森林・人工林、Ghana16州形状、雨林観測所、主要帯水層、カカオ面、全大陸の宗派／言語居住域|
|東南アジア|PSA地方境界への対応、民族全住民分布、米相手表・供給／用途。新ジャンル採否は親の判断|
|南／中央アジア|未確認国の地区別社会原表と分母・対応境界、全域林業。GeoEPR/EPR-EDを住民構成に読み替えない|
|東アジア|FBS/SUA用途・カロリー原行（配信foodModelsはnull）、未取得報告・木材相手の網羅、社会分布・一部産業の補完|
|日本|西日本を含む河川網、全国細地域数量と原本再照合、詳細森林、資源・サービス全国網。新ジャンル／流域の採否は親の判断|
|西アジア|スンナ／シーア等の細地域宗派、ユダヤ系の国内分布、対応する独立原表・再利用条件|

原資料取得や有料サービスへの新規要求は行っていない。既知拒否を統合の不具合と同一視せず、既存台帳のエラー・最小入力を残す。新たな指針、データ採否、公開可否は親へ返す。

## 二重マージを避ける関係

統合Draftは、上表の固定12headを一括でレビューするための候補。親が将来統合PRを採用するなら、元12PRは同じ固定差分を別途マージする経路として併用しない。元PRの後続headを採用する場合は、この固定一覧との差分を別に確認して統合する必要がある。今回、元PRの状態変更・閉鎖・mainへのマージは行わない。Draft・CI成功は公開承認ではない。
