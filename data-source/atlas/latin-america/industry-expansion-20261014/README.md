# 中南米の産業採用：2026-10-14

- `evidence.json`：主案17群・追加5群の採用根拠、109指標と定義、67追加出典、42追加立地および既存立地の補足。企業の公表値は企業の値として記載し、国内付加価値に置換しない。
- `coverage.json`：22群と31カタログ品目の対応、立地・指標・行政地域の数。
- `coordinate-original-subset.geojson`：Natural Earth v5.1.2都市データの採用featureを原属性・原座標のまま保存。
- `admin-original-subset.geojson`：Natural Earth v5.1.2行政地域データの採用19featureを原形状・原属性のまま保存。表示時の簡略化前。
- `manifest.json`：公開入力のURL・SHA-256、生成物のSHA-256、取得状況。403や大容量で本文の取得に制約があった資料を明記。

全文の定義、年、分母、単位、世界比較の国集合は各指標の `period` / `geography` / `geographicLevel` / `productStage` / `denominator` / `unit` / `note` に記録する。`missing` は未取得・未照合であり0ではない。`sources` は一次出典のID参照。

再生成手順と画面の表示契約は `docs/atlas/latin-industry-expansion-20261014.md` を参照。工場位置として確認できない点は都市または行政地域の案内位置として明記し、地域原料供給と工場加工を分けた。
