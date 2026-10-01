# メキシコ農林業 初回版の原典と再現

初回はINEGI「Censo Agropecuario 2022」の州別公表値を採用する。期間は2021年10月1日〜2022年9月30日、全国00と31州・メキシコ市の32地域（01〜32）。州境のMarco Geoestadístico 2025年12月版と統計年を別に表示する。

| 指標 | 原表・CSV列 | 単位・範囲 |
| --- | --- | --- |
| 灌漑農地率 | ca2022_11、SUP_RIEGO ÷ SUP_AGRIC × 100 | %。活動中の農業生産単位の農業用地総面積に占める灌漑面積。播種・非播種・休耕を含む。州総面積、播種面積、生産単位数を分母にしない。 |
| 白粒トウモロコシ生産量 | ca2022_agr02、CULTIVO=Maíz grano blanco、TON_AGCA | t。露地の一年生作物、白粒の穀粒。全トウモロコシや年次農業統計と混合しない。 |
| 松材取得量 | ca2022_for15、VOL_OBT_PINO | m³。活動中の林業生産単位が取得した松材。丸太以外の形態も含む。森林面積・森林被覆・蓄積・認可量・販売量ではない。 |
| シナロアの秋冬作事例 | ca2022_agr04、白粒・州25、TON_AGOI / TON_AGOI_R | t、生産量の灌漑構成比%。32州の追加分布にはしない。 |

原表のCSV ZIPとExcelをrawに無加工で保管した。ZIP内メタデータは利用条件として[INEGI Términos de Libre Uso](https://www.inegi.org.mx/inegi/terminos.html)を明記し、原典表示・加工主体の明示のもとで再利用する。原表URL、取得日、SHA-256、列、抽出条件、個別メタデータ、脚注の要点はsource-manifest.jsonを参照する。林業の補足調査はforestry/source-manifest.jsonとreading-source-notes.mdに保持する。

再現コマンドは `python scripts/prepare-mexico-agriculture.py`。Python標準ライブラリのみを使い、ネットワークへ接続しない。ZIP→32州・全国抽出→比率計算→src/data/atlas/mexico/agriculture.json→public/assets/atlas/mexico-agriculture-v1のJSON・CSV・台帳を同時に生成する。全国の農業用地、灌漑面積、天水面積、白粒量、松材量の5合計が州合計と一致しなければ停止する。

主指標は32地域とも数値が公表されている。公表0を保持し、非該当NA・秘匿*・空欄・非掲載を0で補わない。*が生産単位数に現れても数量が公表されていれば数量を採用する。Excel表示の0.00には丸められた微小値が含まれ得るため、CSVの小数値を保持し表示時のみ丸める。

シナロアは白粒7,451,358.0778 t（全国白粒量の34.0%）、灌漑農地率68.9%。秋冬作白粒は4,003,356.4681 t、そのうち灌漑3,991,350.1689 tで99.7%。68.9%と99.7%は分母が異なる。ドゥランゴとチワワの松材量合計は全国松材量の79.4%。森林面積の割合ではない。

専用比較は自然環境ページに置き、元の地図項目を保持する。白粒量は気候分布、灌漑率は気候分布、松材量は地形分布と並べる。灌漑率は農業側と同じ4階級・色・分母を使う。量は円の面積で表し、全32州を基準に固定する。選択州だけを強調しても他州の地物と分布を消さない。比較URLに元のmetric/state/only/fallbackを保存して、対象を持つ戻り、履歴、再読み込みで復元する。

林業の因果説明には[CONABIOの温帯林](https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado)を参照し、冷涼な山地の松・オーク林→松材取得→丸太・製材向けの利用→水・土壌・生息地の機能をつなぐ。面積や森林減少を取得量から推計しない。農業の食品・流通説明には[SADERの白粒からトルティーヤへの説明](https://www.gob.mx/agricultura/articulos/del-campo-al-comal-el-proceso-de-hacer-tortillas-de-maiz?idiom=es)を要約して参照する。

後続候補は市町村分布、他作物、森林被覆、木材加工・輸送拠点。未取得DGSIAP2025municipalCSVと分母不一致のSinaloa2024PDF43%は使わない。2023年全トウモロコシ24.2%は公式公表表で確認したが、本版の2022年白粒34.0%へ混合しない。
