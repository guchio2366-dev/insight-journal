# ロシア農畜産の暫定10品目

**右側の地理説明の根拠：**[USDA FAS の2017年地域別小麦報告](https://ipad.fas.usda.gov/highlights/2017/08/Russia%20wheat/index.htm)は南部などの冬小麦と、シベリア地区（オムスクを含む）の春小麦を区別する。冬小麦は秋播き・越冬・翌夏収穫、春小麦は春播き・夏の生育という作型差と、既存の長期気候図を合わせて説明する。2017年の地域別報告は2020年MapSPAMの各セルの小麦種別を証明しないため、地図上で冬・春の境界は描かない。小麦用途と輸出先は別の2020/21年度全国統計であり、産地ごとの流通経路を導けない。

この候補は教材で比較する対象であり、作物の重量と家畜の飼養頭羽数を混ぜた公式の「生産上位10位」ではない。少額・少量を除く共通閾値は未決なので、次点を生産ゼロや掲載対象外と判定しない。全国値は保存済みFAOSTAT QCL（2025-12-31公開版）のロシア（M49 643）2022年の公表値 `A`。2023–24年には非公式値 `X` や補完値 `I` が混じるため、候補比較の基準年に使わない。2020年の空間分布とは年・指標が異なる。

| 暫定候補 | 2022年全国値 | 理由 | 2020年全域分布 |
| --- | ---: | --- | --- |
| 小麦 | 104.2百万t | 主穀物と輸出、南西部・西シベリアの比較 | MapSPAM保存済み |
| テンサイ | 48.9百万t | 食品加工と作物構成の比較 | 未収録 |
| 大麦 | 23.4百万t | 飼料・食用と小麦の比較 | 未収録 |
| ジャガイモ | 18.9百万t | 主食系作物の分布比較 | 未収録 |
| ヒマワリ種子 | 16.4百万t | 油糧作物への作付け転換を読む | 未収録 |
| トウモロコシ | 15.9百万t | 穀物・飼料の比較 | 未収録 |
| 牛 | 17.6百万頭 | 既存GLW4密度と肉・乳の用途 | GLW4保存済み |
| 豚 | 26.2百万頭 | 飼料と畜産構成を比較 | 未収録 |
| 羊 | 19.1百万頭 | 草地利用と牛の比較 | 未収録 |
| 鶏 | 488.2百万羽 | 家畜の種類と密度を比較。原資料は千羽単位 | 未収録 |

**次点・未解決：**大豆（6.0百万t）、菜種（4.5百万t）、米（0.9百万t）は同じ保存系列に2022年公表値があるが、統計的意義の閾値と教材上の優先度は未決。ライムギは[USDA FAS の2025年7月公表表](https://apps.fas.usda.gov/psdonline/circulars/2025/07/Grain.pdf)の2022/23年度全国生産量200万t、世界総量1214.9万tで、同表ではEUに次ぐ生産規模と確認できる。これはマーケティング年度であり、FAOSTATの2022暦年と混ぜて重量順位を作らない。このFAOSTAT保存系列にはライムギ全国行がなく、MapSPAM 2020 v2r2の個別作物コードにもないため、ライムギの全国格子分布と地理的集中は示さない。別の公開可能な分布資料が必要。

**分布データの状況：**MapSPAM 2020 v2r2（CGIAR版、CC BY-SA 4.0）は大麦、テンサイ、ジャガイモ、ヒマワリ種子、トウモロコシの元5分格子を収録するが、ロシア切り出しは未保存。2026-10-08の公開Zarrメタデータ1回の要求はHTTP 403。固定Harvard Dataverse原本のHEAD 1回もHTTP 403。別経路での再試行はしない。GLW4の豚・羊・鶏もロシア切り出しが未保存。既存の欧州画像はロシア西部のみで、全国分布として転用できない。

**輸出先の状況：**USDA 2021年報告は2020年7月～2021年2月の主要向け先としてエジプトとトルコを挙げるが、全相手国の同期間総量を示さない。国別構成比を計算できない。UN Comtradeの利用規約は書面許可なしの自動取得・再配布・公開を禁じるため、新規の相手国データや円グラフには使わない。2025/26年度FAO小麦輸出予測は全国総量であり、相手国・産地別の行先ではない。FAOSTATのDetailed Trade Matrixは年別・相手国別の代替候補だが、現リポジトリに原表はなく、UNSD等から提供された元データの二次利用条件とロシア小麦行の収録状況を確認するまで掲載しない。

出典：[FAOSTAT QCL](https://www.fao.org/faostat/en/#data/QCL)、[FAOデータ利用条件](https://www.fao.org/contact-us/terms/db-terms-of-use/)、[IFPRI MapSPAM 2020 v2r2・CGIAR配布説明](https://cgiar-climate-data-hub.github.io/catalog/spam2020/)、[USDA FAS Grain and Feed Annual](https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain+and+Feed+Annual_Moscow_Russian+Federation_04-15-2021)、[USDA FAS Grain: World Markets and Trade, July 2025](https://apps.fas.usda.gov/psdonline/circulars/2025/07/Grain.pdf)、[FAO GIEWS Russian Federation Country Brief](https://www.fao.org/giews/countrybrief/country.jsp?code=RUS)、[UN Comtrade利用規約](https://comtrade.un.org/licenseagreement.html)。
