# ロシア人口分布・都市中心の原本記録

確認日：2026-10-01。大きな原ZIP/GeoTIFFはリポジトリ外の既存キャッシュを使用し、公開Gitには入れない。`source-record.json` に原本URL、SHA-256、引用、利用条件、GeoTIFF/CSV/GeoPackageの最小限の抽出事実を保存する。原本SHAは既存公開地域で確認した固定版と一致。

- GHS-POP R2023A V1.0：2020年の居住人口モデル、原本1km等面積Mollweideセル内の人。5×5原本セルの人数合計を、有効セル面積（1セル1km²）で除した密度。水面を含む。国・地域の総人口は計算しない。
- 18–191°E（180°を越す経度を展開）、40–83°Nの表示窓。原数値は国ポリゴンで加工せず、UIが採用した出典境界で表示をclipする。周辺国の値を国統計として数えない。
- 都市中心はUCDB R2024A V1.2の `GC_CNT_GAD_2025=Russia` を全253件保持。2020年人口を2025年固定footprint内で示す。市行政人口・都市圏人口・国総人口の代替ではない。2000/2010も同じ固定範囲の人口で、都市範囲の拡大率ではない。
- UCDBはSevastopol、Simferopol、Yalta、Kerch、YevpatoriyaをUkraineに割り当てている。これらをRussiaに移さない。採用する地図出典の境界と都市統計の国割当がクリミアで異なることを明記する。主権について独自の主張を付けない。
- 欠測は-1（透明）、元の有効0は0（白）。都市中心がない場所も無人を意味しない。2020年以降の移動・避難・現在人口を推定値で補わない。

CC BY 4.0。データ個別引用と最新GHSL研究論文の引用を併記し、Insight Journalによる切り出し・集約・図化を示す。一般的なGHSLウェブサイトのみの引用にしない。

## 再生成

```text
python -B scripts/prepare-russia-centres.py --urban-cache /path/to/pinned-ucdb-cache
node --expose-gc --max-old-space-size=72 scripts/prepare-russia-population.mjs --source /path/to/pinned-global-1km.tif --geotiff-module /path/to/geotiff/dist-module/geotiff.js
```

通常のサイトビルドはこれらを実行せず、確認済み静的アセットを配信する。各原本ハッシュ、都市ID結合、座標の逆変換、既知都市座標、表示格子とPNGの一致、gzip往復、公式GeoTIFF LZWとの3タイル一致を再生成時に確認する。
