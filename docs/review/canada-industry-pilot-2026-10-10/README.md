# カナダ主要産業パイロット（Draft）

公開main `e81854398cea55525242a1ed24ad8d10a03917e0` を基点に、カナダの主要産業だけを改修。マージ・公開は行わない。

3分類の目的：資源・エネルギーは採取と原料化、製造業は何をつくるかと調達・用途、サービス業は人・情報・物流機能の集積。10産業・45位置レコードを採用。精製・ニッケル精錬・アルミ製錬は同じID・座標を両分類で使い、統計は原分類のまま保持する。

確認画像は既存CIの `industry-map-review` artifact 内の `canada-industry-pilot/` に生成する。主画像は `1920-resources-initial.png`、`1920-manufacturing-initial.png`、`1920-services-initial.png`。重複表示は `1920-{resources,manufacturing}-overlap-{edmonton,sudbury,kitimat}.png`。1440×900の画像は補助確認。画像のpixel幅からCSS viewportを推測しない。

同梱 `verification.json` に対象SHA、実viewport、倍率、DPR、地図枠寸法、3列の統計枠、全操作の結果を記録する。PC画像の取得・目視確認結果はDraft PRの本文に追記する。ローカルではChromiumのSUID sandbox構成エラーがあり、ブラウザ検証は未実行。安全設定は変更していない。

[採用品目・出典契約・次点・不足資料](../../../data-source/atlas/canada/industry/pilot/README.md)

検証コマンド：`npm test`、`ASTRO_TELEMETRY_DISABLED=1 npm run build`、`npm run test:e2e`、`npm run verify:release`。実画面：`INDUSTRY_REVIEW_CHROME_PATH=<安全なChrome> node scripts/capture-canada-industry-pilot-review.mjs`。既存Canada/US検証はカナダ産業の新UI契約に更新し、他分野の検証を維持する。
