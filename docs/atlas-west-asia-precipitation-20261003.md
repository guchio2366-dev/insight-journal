# 西アジアの年降水量と小麦の比較（2026-10-03）

水資源へ `annual-precipitation`（年降水量の分布）を追加した。既存の `precipitation` は気象庁ClimatViewの18観測所の主題として保持する。新主題は観測所の点を塗り広げたものではなく、GPCC／DWDの雨量計観測に基づく0.25度格子の補間平年値である。v2025配布版の1991–2020年平年値を使い、12か月すべてが有限・非負・未欠測の原格子だけ年合計を求める。表示格子は原格子の最近傍値で、画像の色と地点照会は同じfloat32値を参照する。0と欠測を区別し、小国や海岸の未収録を近隣値で補わない。

配信は `public/assets/atlas/west-asia-precipitation-v1/` の独立資産とした。既存 `west-asia-v1` の公開snapshotは変更していない。新主題または新主題を元図とする比較が開かれたときだけmanifestを読み、既存1000×987表示範囲との一致、原典・期間・版・配色・配信サイズとハッシュの契約を検証して、runtimeのlayer配列のコピーへ接続する。地点照会の数値格子は地点選択後に取得し、圧縮済みと配信側で展開済みの両方のSHA-256を照合する。新主題を使わない画面では年降水量の数値キャッシュを解放する。PNGは17,393bytes、gzip数値格子は65,402bytes、展開後の格子は3,948,000bytesである。

灌漑小麦・天水小麦から年降水量へ、年降水量から両小麦へ専用の比較を用意した。元の分布を残し、双方の全凡例・単位・時点を表示する。1991–2020年の平年値と2020年の推計収穫面積は異なる資料であり、農林業の国別統計の年を変えても降水量の平年期間は変わらない。元の国・都市・地点・地図範囲・統計年は、主題名付きの戻りリンク、再読み込み、履歴で保持する。年合計を生育期の雨や栽培限界へ読み替えず、灌漑設備・貯水・地下水・水の配分と、品種・土壌・経営も考える説明を付けた。地図の重なりは実際の水源・取水量・利用可能量・持続可能性の証明ではない。

原典は [GPCC Precipitation Analysis Climatology v2025, 0.25°](https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025)。取得したgzipは28,442,738bytes、MD5 `d701c717e08ce6ad457c9f4004984d65`、SHA-256 `3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5`。CC BY4.0の根拠は製品からリンクされたDWD公式legal noticeの索引文で、直接アクセス403、DataCite登録のrights空という事実も保存する。登録のrightsに利用条件があるとは扱わない。原典URL、権利の根拠、原月別値を使った緯度方向・年合計の照合、配信filehashと加工方法は `data-source/atlas/west-asia/precipitation/` と公開manifestへ記録した。巨大な原NetCDFはGitに追加しない。

2026-10-03にも原典を独立に確認した。[GPCC製品ページ](https://opendata.dwd.de/climate_environment/GPCC/html/gpcc_precipitation_analysis_climatology_v2025_doi_download.html)が1991–2020年など固定期間の平年値には少なくとも20年の完全なデータを使うこと、Terms of Useが記録したDWD legal noticeへリンクすることを確認した。[DWD公式legal noticeの索引](https://www.dwd.de/EN/service/legal_notice/legal_notice.html?lsbId=836106&nn=507014)のCC BY4.0と出典明示の条件、直接取得403、[公式MD5一覧](https://opendata.dwd.de/climate_environment/GPCC/GPCC_Precipitation_Analysis_Climatology/Version_2025/readme_md5_gpcc_precipitation_analysis_climatology_1991_2020_v2025.txt)の0.25度ファイルのチェックサムも再確認した。

再生成：`node scripts/prepare-west-asia-precipitation.mjs --source <private GPCC .nc.gz>`。対象単体テスト18件が成功し、全987,000画素のPNG色・透明度と数値格子の一致、12か月完全性、原典MD5/SHA-256、0と欠測、gzip両配信形式、破損拒否、元snapshot保全、URLと両小麦の比較入口を確認した。生成済みページを使う新規controllerテスト6件と既存controllerテスト20件も成功した。両小麦の元分布と両凡例、主題名付き復帰、地図範囲・都市・国・地点・統計年の保持、年操作から独立した平年期間、18観測所との比較、manifest不整合と破損格子からの再試行、遅い応答による別主題の上書き防止を確認した。

PCの実画像では、灌漑小麦・天水小麦から年降水量へ進む両比較を1366×768と1180×757で確認した。新しい比較説明を短く整え、文字を縮小せず、14色の全階級と欠測の凡例を一画面に保持した。凡例末尾はそれぞれ746.17px、744.17pxで画面内に収まり、2枚のraster・期間・単位・元主題名付きの戻り・標準SVG操作が残る。例外、console error、failed assetは0。私的な検証画像は `../europe-asia-water-farming-evidence/candidate-priority-build2-20261003/` に保存した。表示に影響しないmanifest待機後のlayer重複防止も追加している。
