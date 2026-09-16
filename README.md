# Insight Journal

ChatGPTとの対話で整理した知識のうち、公開を明示的に承認した記事だけを掲載する静的サイトです。

## 地図タブの改稿・UI変更を担当する方へ

農業・自然環境・主要産業・人口タブの説明を更新する際は、[地図と一緒に読むための共通編集・UI指針](docs/atlas-editorial-and-map-guidelines.md)を参照してください。とうもろこしの改修で確認した、キーセンテンス、用語の定義、地図との対応、本文内の比較ボタン、留保表現の扱いをまとめています。

## 開発

```sh
npm ci
npm run validate:content
npm test
npm run build
npm run test:e2e
```

公開データにはNotionのID、URL、会話URL、認証情報、未公開ノートを含めません。`main`への配信設定は初回公開時に有効化します。
