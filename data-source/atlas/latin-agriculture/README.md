中南米農畜産・初回4指標

`python scripts/fetch-latin-agriculture.py` でFAO公式QCLの採用snapshotを取得し、2024年のバナナ、大豆、全品種コーヒー生豆、牛飼養頭数、骨付き生鮮・冷蔵牛肉、生乳の原表行をCSVへ抽出する。元ZIPのhashを固定し、配信が更新された場合は自動置換を停止する。元ZIPはローカル取得証拠として保持し、Gitへ含めない。抽出CSVはUTF-8/LFで元の値・列・FAO注記を保持する。

`node scripts/prepare-latin-agriculture.mjs` はM49国コードで既存の34か国・地域へ結合する。2020年MapSPAMのバナナ・アラビカ・大豆の収穫面積と、GLW4の牛密度について、既存原分布PNG/grid/manifestのhashを確認する。2024年国統計は地図と年・単位が異なる補助値として保持する。

validity PNGは元gridのvalidRunsを同一Mercator範囲へ最近傍で描く。有効な0・最初の色階級未満は薄灰、NoDataは透明で地の欠測色を見せる。元の色分布PNGを変更せず上に重ねる。国別牛密度は有効格子面積による加重平均であり、公式飼養頭数と区別する。

原表空欄はmissing、該当行なしはunavailable、有効な0はzero、正値はvalue。将来のunfetched/confidentialを0に変換しない。全種コーヒーの2024年生産量と2020年アラビカ面積の範囲差は表示定義に明記する。

`provenance.json` と配信台帳には原典URL、元ZIP・既存入力・採用CSV・配信JSON/画像のSHA-256、年、単位、結合、ライセンスを記録する。MapSPAMとその派生画像/集計はCC BY-SA 4.0、GLW4・FAOSTATはCC BY 4.0。帰属・加工表示をページとデータに記載する。
