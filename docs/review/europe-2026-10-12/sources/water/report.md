# 欧州主要7水系・取得調査（2026-10-12）

結論：この環境から新たな流域原形は取得できず、7自然流域の完成には外部ファイルが必要です。repo変更・形状創作・国境平滑化・拒否URLの再試行は行っていません。今回の追加取得で自動承認レビューの拒否はありません。記録された403はいずれもHTTP GET前のCONNECT tunnelです。

## 保存済みデータの検証

`existing-seven-water-basin-check.json` は名称アンカーを既存BasinATLAS v1.0 L4表示gridで照合し、NEXT_DOWNを追跡したものです。再実行用は `inspect-existing.py`。基になる全L4原ポリゴン（shp/shx/dbf/prj）は /workspace と /tmp に存在しません。

| 名称 | アンカーのMAIN_BAS | 同MAIN_BAS区画 | 検証結果 |
| --- | --- | --- | --- |
| ライン | 2040023010 | 1 | 国mask済み表示区画。独立した全流域認定は未実施 |
| ドナウ | 2040008490 | 9 | 各NEXT_DOWNが同じ出口に達する。原形は国maskで切れており全流域ではない |
| セーヌ | 2040022150 | 1 | 国mask済み表示区画。独立した全流域認定は未実施 |
| テムズ | 2040048790 | 1 | 単独流域へ転用不可。既存区画は西-6.15°～東1.70°、北58.62°まで及び、テムズ以外の英国の流域を含む粗い沿岸合算区画 |
| ドン | 2040006590 | 9 | 各NEXT_DOWNが同じ出口に達する。ただし国maskで切れた表示面 |
| ヴォルガ | 2040068680 | 9 | 各NEXT_DOWNが同じ出口に達する。ただし国maskで切れた表示面 |
| ウラル | null | 0 | 名称位置は国mask外。カザフスタン部分を含む原形不足 |

番号を7名称へ置換し面を合算するだけでは、テムズとウラルを正しく描けません。NEXT_DOWNで同じ出口へ到達する事実と、名称付き自然流域の完全な外縁がある事実を区別してください。

## 新しい正規候補

[GRDC Major River Basins 2020・公式製品](https://grdc.bafg.de/products/basin_layers/major_rivers/) は520主要流域、名前付き主要河川、河道網の別レイヤーを公開しています。公式側がHydroBASINS L12をdissolveし、より粗い階層と照合した独立派生製品です。Figshareの鏡ではありません。選択流域のGeoJSON/Shape取得があり、全世界GeoJSON約130MBの代わりに対象だけを受け取れる見込みがあります。選択部分の実バイト数・ファイル名・CRS・7名称の実形状は取得できておらず未確認です。名称Thamesは調査開始時の公開選択肢に掲載。ネットワークは選択版では集水面積1575km²超のみなので小さな源流を完全収録とは呼べません。

公式製品は引用とHydroSHEDSの帰属表示を条件にpublic useを認めています。GRDCをCC BY4.0と称していません。元の[HydroBASINS](https://www.hydrosheds.org/products/hydrobasins)/[HydroRIVERS](https://www.hydrosheds.org/products/hydrorivers)は商用・教育等利用可能ですが、[HydroSHEDS独自ライセンス](https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v1_4.pdf)を伴い、HydroATLASのCC BY4.0と別です。個々の製品の条件を再利用時に保持します。

[EEA ECRINS自然subbasins v0](https://sdi.eea.europa.eu/catalogue/srv/api/records/48545018-0505-494c-9ee1-d9ae792d4cf8) は2011-12-31作成、元期間1990–2006、縮尺1:250000、EPSG:3035、CC BY4.0。公式フォルダでは90.7MB。4万km²より大きい自然流域を支流／本流沿いで区分し、ドナウ・ヴォルガの階層を記録しています。小流域のテムズまで7すべての独立面があることを未確認のまま採用しません。必要ならFEC、河道接続、Gazetteerとの照合が必要です。

ECRINSのArcGIS `FunctionalRiverBasinDistricts` は自然流域そのものではないWFD地区の機能的調整です。7自然流域の代替に未採用。Standalone HydroBASINS等も同形状の別経路から拒否済みデータを再取得するためには使っていません。

## 正確な取得結果

- `https://mrb.grdc.bafg.de/` 初回通常urllib GET: `URLError(OSError('Tunnel connection failed: 403 Forbidden'))`。publisher応答は得ていない。以後同配信先へ取得ルート変更・再試行なし。
- `https://sdi.eea.europa.eu/datashare/s/ns7PXfNCETwTJZH/download` web reader: unsupported content-type `application/zip`（400、閲覧器能力不足）。続く初回通常urllib GET: `URLError(OSError('Tunnel connection failed: 403 Forbidden'))`。以後取得停止。
- 旧Figshare `https://figshare.com/ndownloader/files/20087237`、River候補20087486、API9890531は今回未要求。旧403はヘッダー未保持でサイト／tunnel判別不能。

詳細は `acquisition-errors.json` と `source-candidates.json`。

## ユーザーから受け取る最小手順

1. 正規[GRDCアプリ](https://mrb.grdc.bafg.de/)を開く。
2. Basin選択でRHINE、DANUBE、SEINE、THAMES、DON、VOLGA、URALを選ぶ。全7名称が選択できることを確認する。綴りが異なる場合は表示名も記録する。
3. `Download selected basins → GeoJSON` のZIPをそのまま提供する。Technical Documentationと取得時の出典情報も保持する。全世界130MBは選択版が利用できない場合だけ。
4. 受領後にファイル名／実サイズ／SHA256／CRS／7流域ID／アウトレット／国境切断なし／main-riverの収録範囲／ライセンスを検証し、小さな7面GeoJSONを作る。面はGRDC原形を使い、独自に見た目から接続・合成しない。

旧BasinATLAS L4の4ファイルは合計77,323,443byteでhash固定されていますが、L4だけではテムズ不足を解消しません。原形取得手順を4.28GB全体ZIP要求だけに狭めず、GRDC7対象の正規小部分を優先してください。新原形のない状態でGeoJSONを作っていません。
