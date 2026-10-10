# 全国構成表示のレビュー記録

ローカルdistをChromium 151で確認。1280×665、1024×665は2台のPCを想定したviewportで、実機2台ではない。実行手順と環境上のsandbox制限は[実装・資料の記録](../../atlas-population-culture-20261010.md)。

初期は全収録項目が同時に見える。選択後も地図の記号は維持し、単一区分は右欄内だけで表示する。これらの操作、戻る、再読込、密度復帰、国記号の切れ・重なり、右欄へのはみ出し、JS例外なしを[12ケースの結果](browser-results.json)で検証。

| 代表状態 | 1280幅 | 1024幅 |
| --- | --- | --- |
| 豪州/NZ祖先・民族（初期） | [画像](oceania-ethnicity-pc-1280-initial.png) | [画像](oceania-ethnicity-pc-1024-initial.png) |
| 豪州/NZ宗教（初期） | [画像](oceania-religion-pc-1280-initial.png) | [画像](oceania-religion-pc-1024-initial.png) |
| ロシア宗教（初期） | [画像](russia-religion-pc-1280-initial.png) | [画像](russia-religion-pc-1024-initial.png) |
| 南アフリカ宗教（初期） | [画像](africa-religion-pc-1280-initial.png) | [画像](africa-religion-pc-1024-initial.png) |
| 南アフリカ人口集団（選択後） | [画像](africa-ethnicity-pc-1280.png) | [画像](africa-ethnicity-pc-1024.png) |
| ロシア民族（未収録の説明） | [画像](russia-ethnicity-pc-1280.png) | [画像](russia-ethnicity-pc-1024.png) |

各国の定義・年・原区分・未収録範囲を読み、原値の残差補完や正規化、国内居住域の作図がないことを確認。残る選択後の画面もこのフォルダーに保存。
