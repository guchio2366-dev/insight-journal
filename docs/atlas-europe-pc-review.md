# 欧州PC検証のCI成果物

`.github/workflows/atlas-europe-pc-review.yml` は、`main` 向けPRで欧州専用ファイルが変わったときだけ実行する。pushイベントや定期実行は設けず、同じPRの新しい実行が古い実行を取り消す。共通CIのunit・E2E検証はそのまま利用する。

PRのheadをcheckoutしてproduction buildを作り、`_release.json.commitSha` とgit HEADを照合する。操作検証用画像はそのbuildのloopback previewから毎回新規撮影する。宗教2枚とドナウ接続区画の検証図は、PR headに保存済みのレビュー画像を別の `source-review/` に同梱し、新規撮影した操作検証画像とは区別する。公開サイトや外部データサービスは使わない。ブラウザーの外部リクエストは遮断し、検証失敗として記録する。

## 対象

- 1440×1000と1024×800、DPR 1、通常の操作地図。
- 欧州と米国の気候画面を同じ寸法で撮影し、描画完了と凡例・操作・説明の配置を確認する。
- 地形名の主題は数値欄を出さず、等高線の主題で標高値mと500m間隔を分けて読む。地点選択後の全体表示維持、戻る・進む・再読込・比較からの復帰を確認する。
- 流域選択後の範囲外クリックで地点・流域・輪郭・比較URLを解除し、流域操作に隣接する結果表示を確認する。
- ロンドンの人口からアルプスへ進んだときの地形名・出典、元の人口地点への復帰を確認する。
- 民族・宗教は事例・分類・地域を自動選択せず、選択後も欧州全体の表示と全行政区の分布を保つ。戻る・進む・再読込・選択あり／なしの比較復帰を確認する。
- 気候の理由と農畜産物の本文が雨温図の下で常時見えること、農畜産の固定した世界生産シェア・域外貿易相手・供給熱量の3列と、林業の同じ加工段階の供給・見かけ消費を確認する。自給率の未確認値を作らない。
- 1024幅の明示的な簡易表示は操作検証として区別し、通常描画の比較成功には含めない。

1440幅では農畜産初期・小麦選択・林業・産業・地形・降水量の全ページ画像6枚、1024幅では産業と林業の補助画像2枚を保存する。米国の等高線・降水量・流域は、この検証の正常描画比較対象に含めない。対象にした米国気候画面がfallbackになった場合は失敗とする。

1440幅では地図の位置・寸法の一致を検証する。1024幅には既存の比率差があり、欧州の地図は米国より約75px広く、65px高く、49px下にある。欧州は地域選択を2行、地図／解説を1.65:1で配置し、米国は地域選択を1行、解説を380pxで配置するためである。この差をmanifestの未一致事項へ残し、1024幅は通常描画・地図下の凡例・右側の解説・地図内の操作順序・横はみ出しの検証として扱う。既存画面の完全な寸法一致は主張しない。

## 成果物と制約

通常のActions artifact `europe-pc-review-<head SHA>-<run ID>` に画像と結果JSONを7日間保存する。`source-review/` には既存の `religion-regional-samples.png`、`religion-subotica.png`、`danube-connected-review.png` が入る。結果JSONには実際のHEAD、src tree、build情報、browser、viewport、操作検証画像の寸法・hash、画面の測定値、操作結果、描画状態、失敗・未確認範囲を含める。最終判定には画像そのものも確認する。

権限は `contents: read` のみ。既存と同じ公式checkout/setup-node/upload-artifactを用い、秘密情報や公開用権限は受け取らない。標準runnerのChromeを独立したstepで確認し、版とパスを表示する。日本語フォントが不足する場合だけ、runner既定の公式Ubuntuパッケージ配布元から `fonts-noto-cjk` を一時runnerへ導入する。フォントの準備方法・使用可能なfont・解決されたfont名はmanifestに記録する。ブラウザー不足とfont不足は別のエラーとして停止する。

通常の一時的な開発依存の導入だけを行い、配布元・鍵・証明書検証・ネットワーク権限・sandbox・課金・認証・信頼ストアの設定は変えない。aptの取得エラーは停止条件とし、証明書エラーを無視しない。過去に拒否されたActions詳細ログの取得は再試行せず、今回の正常なjob出力・結果JSON・artifactで検証する。

## ローカル再現

依存関係の導入後、リポジトリrootからproduction previewを起動する。

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
node scripts/generate-release.mjs --commit "$(git rev-parse HEAD)"
node scripts/verify-release.mjs --commit "$(git rev-parse HEAD)"
ASTRO_TELEMETRY_DISABLED=1 npm run preview -- --host 127.0.0.1 --port 4173
```

別terminalで、既存のChromium/Chromeを指定する。出力先には新しい空ディレクトリを使う。

```sh
EUROPE_REVIEW_EXPECTED_HEAD="$(git rev-parse HEAD)" \
EUROPE_REVIEW_CHROMIUM_PATH=/usr/bin/chromium \
EUROPE_REVIEW_OUTPUT=/tmp/europe-pc-review-local \
node tests/browser/atlas-europe-pc-review.mjs
```

ローカル撮影はCI成果物に再送しない。CIはcheckoutしたheadからbuildと撮影をやり直す。
