# Insight Journal

ChatGPTとの対話で整理した知識のうち、公開を明示的に承認した記事だけを掲載する静的サイトです。

## 開発

```sh
npm ci
npm run validate:content
npm test
npm run build
npm run test:e2e
```

公開データにはNotionのID、URL、会話URL、認証情報、未公開ノートを含めません。`main`への配信設定は初回公開時に有効化します。
