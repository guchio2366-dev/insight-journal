# アフリカ第二弾：自然分布データ

基準 main `755ec125daf9272e21328ff4c1ecab32756ce917`。気候・人口・既存数値元表は変更していない。表示資産は `public/assets/atlas/africa-natural-presentation-v2/`、加工は `scripts/prepare-africa-natural-presentation.py`。

## 出典・権利・単位

|対象|原典と年|権利|元粒度・処理|
|---|---|---|---|
|年間降水量|[GPCC/DWD Climatology v2025](https://opendata.dwd.de/climate_environment/GPCC/html/gpcc_precipitation_analysis_climatology_v2025_doi_download.html)、固定1991–2020年平年値|CC BY4.0。欧州既存の公式利用条件証拠を保持|元0.25°月降水量mm/month。12か月完全値のみ合計。250mm間隔の線形等雨量線と同じ境界の段階青色。欠測四隅の補間・埋め合わせなし|
|標高・地形背景|[NOAA ETOPO2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model)、2022モデル版、観測年は複数|CC0-1.0|既存0.1°土地のみ平均格子、int16 m、EGM2008。標高は500m線間段階色。地形は表示だけsigma2セルの正規化Gaussian＋弱い斜光、等高線なし|
|集水域|[BasinATLAS/HydroATLAS v1.0](https://www.hydrosheds.org/hydroatlas)、2019公開版|CC BY4.0、Linke et al.(2019)|既存レベル6区画のNEXT_SINK統合面。0.008°で既に一般化済みの面を完全保持し、11主要水系へ実名を付ける|
|本流・湖中心線|[Natural Earth v5.1.2 1:10m](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_rivers_lake_centerlines.geojson)|[Public domain](https://www.naturalearthdata.com/about/terms-of-use/)|名付き河道・本流・ナイル支流/デルタ分流の元座標を変更せず保持。人工接続・延長なし|

原GPCC gzipは公式URLから正規取得し、既存欧州原表のSHA-256 `3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5` と一致。全世界原アーカイブ28,442,738byteはprivate `/tmp/africa-round2-physical/gpcc.nc.gz` に置き、配信は地域窓・派生PNG・線・原値照会だけ。NE10m原表SHA-256は `bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a`。この2原本の取得は成功。権限変更・安全機能変更は行っていない。

## 描画契約

manifest共通：EPSG:4326、bounds `[-27,-36,64,39]`、910×750、0.1°、north→south / west→east。Africa既存の正距円筒図に整合。

- `layers.rain`: `rain.png`、`file=rain-lines.geojson.gz`、`labels=rain-labels.json`、`grid=rain.values.gz` float32-LE-gzip、noData -1。主要線ラベル20個は線上かつAfrica陸域内。描画線はAfrica国境クリップパスで切る（元線の隣接陸域はデータとして保持）。数値照会は最近傍**原0.25°**年合計を配信0.1°画素へ載せるだけで、元観測解像度は増えない。色は線形補間なので照会値と一致しない場合がある。
- `layers.elevation`: `elevation.png`、`elevation-lines.geojson.gz`、`elevation-labels.json`。0m/500m/1000m/…/4000m線、500m線間色。原有効最大は4497mで4500m線はない。gridは `../africa-physical-v1/elevation.values.gz` の元格子をそのまま参照。線はAfrica国境クリップパスで切る。
- `layers.terrain`: `terrain.png`。file/contoursなし、数値照会は同じ旧標高格子。標高凡例・大量等高線を地形図へ重ねない。これだけでは地形名称・河川・海・風・海流の表示は完成しないため、統合担当が名称・方向表示を重ねる。
- `layers.basins`: `major-basins.geojson.gz`、11面のFeatureCollection。propertiesには `id/riverId/sourceId/NEXT_SINK/sourceAreaKm2/endorheic/coastal/subBasins/labelCoordinates/outletName/color/riverFeatureIds/sourceMemberIds/outletAttributes/fullBounds`。idは congo/nile/niger/zambezi/orange/limpopo/senegal/volta/ogooue/okavango/chad。薄い面塗り＋本流を同時表示して、面または河道選択時にidで両方強調し、他水系を維持する。出典面積はピクセル面積を計算した値ではない。
- `layers.rivers`: `major-rivers.geojson.gz`、propertiesの `basinId/riverId` で面と照合する。既存ne50-featureIdsだけの解決から拡張が必要。NEの川の下流端が河口へ達しない例では、勝手な線延長を描かない。
- `*-lines.geojson.gz`: MultiLineString、properties `value` と `precipitationMm` または `elevationM`。`*-labels.json`: `{value,label,coordinates:[lon,lat]}` 配列。

## 水系の確認

各集水面の全sourceMemberについて、NEXT_SINK一致、NEXT_DOWNが同面の原区画を指すこと、NEXT_DOWN=0の末端が一意であること、全区画をNEXT_DOWNで追跡して循環なく同末端へ到達すること、SUB_AREA総和がsourceAreaKm2と一致することを確認。名付きNE河道を30点程度/部分線でサンプリングし、原本の集水面内に70%以上の点が入ることを確認した。内流のMAIN_BASを使う仮想的な接続は作っていない。

ナイルの東部デルタはBasinATLASでは別COAST集約1060034270。Damietta Branchは上流端がNile1060034260、河口端がこのCOAST集約内と確認。分流は保持し `deltaCoastalAggregateException=true` を付けるが、COAST集約面を単一ナイル流域に統合しない。オカバンゴは原接続末端のオカバンゴ・マクガディクガディ内流域として表示し、単にオカバンゴ湿地の面積と呼ばない。

## 検証

`node --test tests/unit/atlas-africa-natural-presentation.test.mjs`：7件合格・失敗0件。全ファイルhash、12か月年合計と近傍原値の一致、等雨量線8,957頂点の原格子線形交点誤差0.003mm未満、500m区分、青色単調暗化、海の透明性、面の原本形状完全一致、全NEXT_DOWN接続、全主河道の実ID紐付けを確認。

雨量PNGと地形PNGをconsumer-localで実見した。雨量はサハラ・ナミブの淡色、ギニア湾沿岸・マダガスカル東岸の濃色、コンゴと東部高地を読める。地形は等高線がなく東部/南部高地と低地を区別する起伏背景。PC上のラベル・河口・河道/面選択・他水系維持・読図性は統合担当の実画面確認が必要。

再生成は固定SHA原表を渡す上記scriptのみ。国内平均緑5色図を代替主図としない。架空の密度・流量・雨量・全国一様塗りは追加していない。

## 正確な河口点の取得障害

追加調査した[HydroBASINS Pour Points](https://www.hydrosheds.org/products/hydrobasins)の正規レベル6ZIP `https://data.hydrosheds.org/file/hydrobasins/pour_point/hybas_pour_lev06_v1_shp.zip` はcurl --failでHTTP403。代替ホストやプロキシ等で拒否を迂回していない。[原点資料の技術書](https://data.hydrosheds.org/file/hydrobasins/pour_point/HydroBASINS_PourPoint_TechDoc_v1.pdf)は取得でき、NEXT_SINK末端区画と同IDで河口/内流終点を結合できることは確認したが、座標原表は得られていない。Pour PointsはBasinATLASのCC BY4.0とは異なり、HydroSHEDS v1独自ライセンスでEULA等の配信条件があるため、CC資料と混同して配信していない。

現資産は9外流水系の `outletName`（地中海/ギニア湾/大西洋/インド洋）と2内流水系の内陸終点を保持する。下流まで届くNE原線の末端・デルタ分流は読み取れるが、Congo等の正確な全河口点は現資産だけでは配信完了していない。この未達を注釈だけで完成扱いしない。代替は権利確認済みの別原河道/河口資料、または正規PourPointsへのアクセス・配信条件の解決であり、現河道を架空に延長しない。

## 地形・水系のラベル追加

`src/data/atlas/africa-natural-labels.ts` は36ラベル（地形12、川11、海7、海流3、風3）、12原概略範囲、11水系の短い概説をexportする。`africaNaturalLabels` の各行は id/kind/label/coordinates、任意の axis/direction/season/temperature/rangeId、およびsource/note。axisは端から端への**概略方向案内**で、実測流速・風速・流量や毎日の観測場ではない。

地形範囲は `src/data/atlas/africa-terrain-ranges.json`（42,217byte）。[Natural Earth v5.1.2 geography regions](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson) を正規取得し、12の原形状を変えずに抽出。全世界原表SHA256 `b7b26e50ea917d3696aec87f932def2bf5f890f5770e441d59c162c6f4c92a77`。Public domain。範囲は出典が名称案内用に一般化した形状で、地質・標高閾値の測定境界ではない。マダガスカル中央高地は合意済みMétéo Madagascar2023 pp.7–9の事実から独自の概略軸だけを作り、許諾不明の原図・境界を転写していない。

海域名は[NE v5.1.2 marine regions](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_marine_polys.geojson)を正規取得して確認した名称・概略位置。海流は[NOAA境界海流](https://oceanservice.noaa.gov/education/tutorial_currents/04currents3.html)の北大西洋循環とCanary、[TNCのBlue Benguela保全事業説明](https://www.nature.org/en-us/about-us/where-we-work/africa/stories-in-africa/blue-benguela-namibia/)の冷たい北流、[Haloほか2026の著者公開研究総括](https://egusphere.copernicus.org/preprints/2026/egusphere-2025-6573/) pp.2–3のAgulhas南西流から独自の短い方向軸を整理。Haloほかはpreprint、CC BY4.0。原図や写真は転載せず、AgulhasをBenguelaへ直結する軸も作らない。

風は[NOAAの貿易風方向](https://oceanservice.noaa.gov/education/tutorial_currents/04currents2.html)、[Burtonほか2013のHarmattan観測](https://doi.org/10.1002/qj.2036)、[Parkerほか2005の西部モンスーン研究](https://doi.org/10.1256/qj.04.52)から名称・季節・代表方向を要約。冬/乾季と夏/雨季を画面上に明示し、同時観測の風場に見せない。研究論文の図や数値原表は転載していない。

4件のラベル検証＋7件の原データ検証、計11件合格。全座標/方向軸がAfrica枠内、原河道頂点11箇所に正確なラベル座標、全主要集水面とのid対応、寒暖海流の宣言方向と矢印始終点、冬夏風の季節、Congo既存説明の完全保持を確認。renderer・page・CSSにはこの担当から変更していない。
