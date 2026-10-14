/** Product/stage evidence, checked 2026-10-14. Company revenue is worldwide
 * consolidated revenue; it is never territorial GDP or a map-point weight. */
export type EastIndustryMetric={label:string;value:number|null;unit:string;year:string;scope:string;source:string;publisher:string;denominator?:string};
export type EastIndustryEvidence={economic:EastIndustryMetric[];world:EastIndustryMetric[];meaning:string;boundary:string;confidence:'高'|'中'};
const metric=(label:string,value:number|null,unit:string,year:string,scope:string,source:string,publisher:string,denominator?:string):EastIndustryMetric=>({label,value,unit,year,scope,source,publisher,...(denominator?{denominator}:{})});
const nbs='https://www.stats.gov.cn/english/PressRelease/202601/t20260128_1962394.html';
const annual='https://www.stats.gov.cn/english/PressRelease/202602/t20260228_1962661.html';
const iea='https://iea.blob.core.windows.net/assets/19c60aa0-ee07-4a20-a138-33c967ac5008/GlobalCriticalMineralsOutlook2026.pdf';
const tsia='https://www.tsia.org.tw/api/DownloadOverview?ID=35';
const lng='https://www.datocms-assets.com/146580/1783403747-igu-world-lng-report-2026.pdf';
const pv='https://iea-pvps.org/wp-content/uploads/2026/09/Trends-In-PV-Applications-2026.pdf';
const oilseeds='https://apps.fas.usda.gov/psdonline/circulars/oilseeds.pdf';
const steel='https://worldsteel.org/data/world-steel-in-figures/world-steel-in-figures-2026/';
const mongolia='https://med.gov.mn/uploads/users/3962/files/M25-12EN.pdf';
const hk='https://www.brandhk.gov.hk/docs/default-source/factsheets-library/hong-kong-themes/2026-07-23/international-financial-centre_en_jul-2026_rev.pdf';
const sized='中国本土の一定規模以上企業（年間主営業収入2,000万元以上）。売上であり付加価値ではない。';
export const eastIndustryEvidence:Record<string,EastIndustryEvidence>={
 coal:{economic:[
  metric('中国・採炭洗炭業の売上',2608.86,'十億元CNY','2025',sized,nbs,'中国国家統計局'),
  metric('モンゴル・石炭輸出額',5.769,'十億USD','2025','石炭輸出の通関額。採掘業GDPではない。',mongolia,'モンゴル経済開発省')],world:[
  metric('中国・石炭生産',4.71,'十億t','2025','IEAの石炭生産系列。同じ系列の世界9.1十億tに対し約51.8%。','https://www.iea.org/reports/coal-mid-year-update-2026/production','国際エネルギー機関（IEA）','世界の石炭生産9.1十億t')],
  meaning:'中国の大きな国内生産と、モンゴルの原料炭輸出は別の役割です。鉄鋼用原料炭と発電用一般炭を区別すると、電力政策と中国向け調達の両方が読めます。',boundary:'中国国家統計局の原炭4.83十億tとは定義が異なるため、IEAの世界合計と混ぜません。モンゴル資料の総輸出額の記述に不一致があり、石炭の輸出構成比は算出しません。',confidence:'高'},
 gas:{economic:[
  ...([['中国',69.77],['日本',67.37],['韓国',48.67],['台湾',24.17]] as [string,number][]).map(([name,value])=>metric(name+'・LNG輸入',value,'百万t','2025','LNG（液化天然ガス）の輸入量。国内ガス生産やGDPではない。',lng,'国際ガス連盟（IGU）'))],world:[
  metric('上記4か国・地域の世界輸入比',209.98/436.98*100,'％','2025','IGU World LNG Report 2026、貿易表・輸入図。',lng,'IGU','世界LNG貿易436.98百万t')],
  meaning:'世界取引の約半分を中国・日本・韓国・台湾が受け入れます。国産ガス田、受入基地、発電所を分けることで、日本の燃料調達と海上輸送への依存が見えます。',boundary:'輸入量は最終需要・発電量・付加価値と一致しません。GIIGNLの別集計の世界合計と組み合わせません。',confidence:'高'},
 rareearths:{economic:[metric('北方稀土・主要希土類製品売上',32.63739742211,'十億元CNY','2025','企業の希土類製品区分。全希土類を含み、磁石専業の売上ではない。','https://static.cninfo.com.cn/finalpage/2026-04-18/1225118607.PDF','中国北方稀土・2025年報')],world:[
  metric('中国・磁石用希土類の分離精製',85,'％','2025','磁石用希土類の分離・精製。全17元素の採掘シェアではない。',iea,'IEA','世界の磁石用希土類分離・精製'),
  metric('中国・焼結永久磁石製造',94,'％','2024','ネオジム・プラセオジム・ジスプロシウム・テルビウムを用いる磁石供給網。','https://www.iea.org/reports/rare-earth-elements/executive-summary','IEA','世界の焼結永久磁石製造')],
  meaning:'鉱石を採れる国を増やしても、分離精製と高性能磁石の代替は同時には進みません。モーターや風力発電機の調達は、元素と加工段階を分けて考える必要があります。',boundary:'2024年の分離精製91%と2025年の85%は異なる対象年の値です。両年を一つの同年供給網として合算しません。',confidence:'高'},
 copper:{economic:[
  metric('中国・精製銅生産',14.72,'百万t','2025','精製金属量。銅鉱石や精鉱の重量ではない。',annual,'中国国家統計局'),
  metric('モンゴル・銅精鉱輸出額',5.809,'十億USD','2025','精鉱2.282百万tの輸出通関額。含有銅重量ではない。',mongolia,'モンゴル経済開発省')],world:[metric('中国・銅製錬能力の世界比',50,'％程度','2025','年間設備能力。年の実生産量のシェアではない。',iea,'IEA','世界の銅製錬設備能力')],
  meaning:'モンゴルの採掘・選鉱と中国・日本の製錬を分けると、鉱床への依存と加工設備への依存を区別できます。配線と電化の需要は金属銅にあり、精鉱の重量をそのまま需要量にはできません。',boundary:'地図のオユ・トルゴイと東予の間に個別取引を確認した線は引きません。品目GDPは未取得。',confidence:'高'},
 foundry:{economic:[
  metric('TSMC・連結売上',122.42,'十億USD','2025','台湾本社企業の世界売上。台湾国内の生産額ではない。','https://investor.tsmc.com/static/annualReports/2025/english/index.html','TSMC'),
  metric('TSMC・営業利益率',50.8,'％','2025','世界連結営業利益／世界連結売上。','https://investor.tsmc.com/static/annualReports/2025/english/index.html','TSMC','TSMC世界連結売上')],world:[metric('TSMC・受託製造市場シェア',72.5,'％','2026年4–6月','世界ファウンドリー（半導体受託製造）の企業売上ベース。','https://www.trendforce.com/presscenter/news/20260909-13225.html','調査公表元TrendForce','世界ファウンドリー市場売上（上位10社計ではない）')],
  meaning:'先端ロジックの受託製造は企業と台湾の拠点に集中します。高い営業利益率は量だけでなく工程技術・歩留まり・顧客設計への対応から稼ぐ事業であることを示します。',boundary:'企業シェアは台湾国土内の生産シェアではありません。熊本第1工場の稼働と、第2工場の建設・先端工程の計画を区別します。nmは工程名で、素子の実寸ではありません。',confidence:'高'},
 memory:{economic:[
  metric('SK hynix・世界売上',97.1,'兆KRW','2025','韓国本社企業の連結売上。海外工場を含む。','https://news.skhynix.com/en/sk-hynix-2025-financial-results-record-breaking-results-achieved-%C2%B7-largest-shareholder-returns/','SK hynix'),
  metric('キオクシア・世界売上',2337.6,'十億JPY','2025年度','2025年4月–2026年3月。フラッシュメモリーとSSD等の世界連結売上。','https://www.kioxia-holdings.com/en-jp/about/glance.html','キオクシア')],world:[
  metric('Samsung・DRAM市場シェア',39.4,'％','2026年4–6月','DRAM（作業用記憶半導体）の企業売上ベース。','https://www.trendforce.com/presscenter/news/20260907-13219.html','TrendForce','世界DRAM市場売上'),
  metric('SK hynix・DRAM市場シェア',24.9,'％','2026年4–6月','Samsungとの合計64.3%。NAND（保存用フラッシュメモリー）を含めない。','https://www.trendforce.com/presscenter/news/20260907-13219.html','TrendForce','世界DRAM市場売上')],
  meaning:'韓国企業のDRAMと日本のフラッシュメモリーは用途が異なります。AI向けの需要が強くても、企業の世界売上やブランドシェアから国内工場の数量を逆算できません。',boundary:'DRAM・NAND・HBM（広帯域メモリー）の市場を一つに混ぜません。暦年とキオクシアの年度も別です。',confidence:'高'},
 equipment:{economic:[
  metric('東京エレクトロン・世界売上',2443.533,'十億JPY','2026年3月期','2025年4月–2026年3月。連結売上。','https://www.tel.com/ir/library/report/pjuomj00000000tf-att/fy26q4tanshin-e.pdf','東京エレクトロン'),
  metric('東京エレクトロン・海外売上比',90.2,'％','2026年3月期','企業の海外向け売上。日本の装置輸出通関額ではない。','https://www.tel.com/ir/library/report/pjuomj00000000tf-att/fy26q4tanshin-e.pdf','東京エレクトロン','同社連結売上')],world:[metric('塗布・現像装置の世界シェア',91,'％','2025','東京エレクトロン。Gartner推計の出荷売上ベース。装置全種類ではない。','https://www.tel.com/ir/library/report/pjuomj00000000tf-att/fy26q4presentations-e.pdf','東京エレクトロン（Gartner推計を掲載）','世界の塗布・現像装置出荷売上')],
  meaning:'日本の装置企業は、海外の半導体工場投資から収入を得ます。特定工程の強さが輸出管理や保守部品の供給に関わり、完成半導体の生産シェアとは別の交渉力になります。',boundary:'91%を半導体装置全体の日本シェアへ転用しません。装置購入国の投資額と装置製造国も別です。',confidence:'高'},
 materials:{economic:[metric('SUMCO・世界売上',409.6,'十億JPY','2025','半導体シリコンウエハー企業の連結売上。国内製造額ではない。','https://www.sumcosi.com/english/ir/','SUMCO')],world:[metric('東京応化・フォトレジストシェア',26.1,'％','2025推計','感光材料の出荷数量ベース。富士キメラ総研2026年資料を同社が掲載。','https://www.tok.co.jp/products/semiconductor-pre','東京応化工業（調査資料を掲載）','世界の半導体用フォトレジスト出荷数量')],
  meaning:'ウエハーと感光材料は完成チップより上流にあります。工場や装置が用意できても、純度と工程適合の認定を終えた材料への切替は別の制約です。',boundary:'半導体ウエハーと太陽光用ウエハーは別製品。フォトレジストの数量比を材料全体の売上比へ転用しません。',confidence:'高'},
 packaging:{economic:[
  metric('台湾本社・組立検査の売上',623.5,'十億TWD','2024実績','台湾に本社を置く企業の世界合算。海外事業を含む。',tsia,'台湾半導体産業協会（TSIA）・2025年版'),
  metric('TSIA掲載・組立検査従業者',131906,'人','2024実績','TSIA表7の従業者。国内・海外の雇用地の内訳はこの資料では未確認。台湾全産業の雇用ではない。',tsia,'TSIA')],world:[metric('台湾本社・組立検査の世界シェア',49,'％','2024実績','世界1位。企業本社による市場分類。',tsia,'TSIA','世界の半導体組立・検査市場売上')],
  meaning:'後工程の組立・検査にも台湾企業への集中があります。OSAT（外部受託の組立・検査）と、TSMC等が社内で行う先端パッケージは区別します。',boundary:'2025年欄は予測のため実績として掲載しません。台湾本社企業の売上を台湾の領域GDPへ換算せず、前工程売上とも合算しません。',confidence:'高'},
 batteries:{economic:[
  metric('CATL・世界売上',423.7,'十億元CNY','2025','寧徳時代の企業世界売上。国内生産額ではない。','https://www.catl.com/en/news/6773.html','CATL'),
  metric('CATL・電池販売量',661,'GWh','2025','車載用と定置蓄電用を含む販売量。工場能力772GWhとは別。','https://www.catl.com/en/news/6773.html','CATL')],world:[
  metric('中国・電池セル生産',80,'％','2025','IEAの電池セル生産集計。',iea,'IEA','世界の電池セル生産'),
  metric('中国・LFP正極材生産',98,'％','2025','LFP（リン酸鉄リチウム）正極材に限定。',iea,'IEA','世界のLFP正極材生産')],
  meaning:'コバルトを使わないLFPへ移行しても、正極材の中国集中は残ります。セルの国籍、材料を調達する国、車両へ組み込む場所を分けることが脱炭素と供給網の読み方になります。',boundary:'GWhは蓄電容量換算の電池量。発電量・台数ではなく、販売量と設備能力も同じではありません。',confidence:'高'},
 photovoltaic:{economic:[
  metric('中国・太陽光モジュール生産',575,'GW','2025','年に製造されたモジュールの定格出力合計。発電所導入量ではない。',pv,'IEA太陽光発電システム研究協力（IEA-PVPS）'),
  metric('LONGi・世界売上',70.347,'十億元CNY','2025','企業の世界売上。モジュールの自社生産額ではない。','https://www.longi.com/en/news/annual-report-2025/','LONGi')],world:[
  metric('中国・モジュール生産比',79,'％（公表値）','2025','Trends in PV Applications 2026。世界生産722.467GW。端数・公表丸めにより単純比は約79.6%。',pv,'IEA-PVPS','世界の太陽光モジュール生産722.467GW'),
  metric('中国・太陽光セル生産',689,'GW','2025','世界779GWに対し約88.4%。半導体メモリーのセルとは別。',pv,'IEA-PVPS','世界の太陽光セル生産779GW')],
  meaning:'日本の発電設備調達は、セル・モジュールの中国集中とつながります。雲南の水力利用と東部の製品加工を分ければ、脱炭素製品を製造する電源と最終設置場所の違いが見えます。',boundary:'設備能力1,531.087GW／年や発電所の新設量と製造量を混ぜません。中国国家統計局の別系列とは未整合のため接合しません。',confidence:'高'},
 steel:{economic:[...([['中国',960.8],['日本',80.7],['韓国',62.2],['台湾',17.2]] as [string,number][]).map(([name,value])=>metric(name+'・粗鋼生産',value,'百万t','2025','2026年6月版の改訂値。鉄鉱石・圧延鋼材とは別。',steel,'世界鉄鋼協会'))],world:[metric('上記4か国・地域の粗鋼世界比',1120.9/1849*100,'％','2025','中国1位、日本4位、韓国6位、台湾14位。',steel,'世界鉄鋼協会','世界粗鋼生産約1,849百万t')],
  meaning:'東アジア4か国・地域が世界粗鋼の約6割を占めます。大量の原料輸送、港湾用地と需要産業が集積を支え、製鉄の脱炭素では原料炭・電力・水素の条件が変わります。',boundary:'2026年1月速報の韓国61.9・台湾17.1百万tを最新版と混ぜません。設備能力と年の生産を区別します。',confidence:'高'},
 auto:{economic:[
  metric('中国・自動車製造業の売上',11179.56,'十億元CNY','2025',sized+' 部品を含みEVだけではない。',nbs,'中国国家統計局'),
  metric('同業種・利益',461.02,'十億元CNY','2025','売上に対し約4.1%。NBS公表の利益で営業利益ではない。',nbs,'中国国家統計局')],world:[metric('中国・電気乗用車の生産比',75,'％近く','2025','IEA：電池式とプラグインハイブリッドの乗用車。','https://www.iea.org/reports/global-ev-outlook-2026/manufacturing-and-trade','IEA','世界の電気乗用車生産（約2,200万台）')],
  meaning:'中国の電気自動車製造と日本・韓国の完成車・部品集積を同じ工程で捉えます。大きな売上がそのまま高い利益率を意味せず、電池と完成車の競争条件は異なります。',boundary:'中国の新エネルギー車（商用車等を含む）とIEAの電気乗用車は別集合。業種全体の売上をEVだけに割り当てません。',confidence:'高'},
 soybean:{economic:[
  metric('中国・大豆輸入量',111.83,'百万t','2025暦年','通関輸入。国内大豆生産20.91百万tとは別。',annual,'中国国家統計局'),
  metric('中国・大豆輸入額',360.2,'十億元CNY','2025暦年','加工業GDPではなく原料調達の通関額。',annual,'中国国家統計局')],world:[
  metric('中国・大豆圧搾量',103.5,'百万t','2024/25年度','USDA 2026年10月表7。世界359.161百万tの約28.8%。',oilseeds,'米国農務省（USDA）','世界大豆圧搾359.161百万t'),
  metric('中国・大豆輸入の世界比',108/179.145*100,'％','2024/25年度','同じUSDA年度の中国108百万t／世界179.145百万t。',oilseeds,'USDA','世界大豆輸入179.145百万t')],
  meaning:'食用油と飼料用大豆粕は港で受け入れる輸入大豆の圧搾から生まれます。中国は世界輸入の約6割を占め、国内の食品用大豆産地だけを見ても飼料原料の調達集中は説明できません。',boundary:'暦年2025とUSDAの2024/25年度は別の期間。2025/26予測を実績に混ぜず、大豆圧搾と一次作物生産も分けます。',confidence:'高'},
 ships:{economic:[metric('中国・船舶建造完工量',53.69,'百万DWT','2025','DWT（載貨重量トン）：船が積載できる重量。造船所の売上ではない。','https://zjic.zj.gov.cn/ywdh/cyfz/202602/t20260202_23931162.shtml','中国工業情報化部（浙江省公式転載）')],world:[
  metric('中国・完工量の世界シェア',56.1,'％','2025','建造を完了した船のDWTベース。','https://zjic.zj.gov.cn/ywdh/cyfz/202602/t20260202_23931162.shtml','中国工業情報化部','世界船舶完工量（DWT）'),
  metric('中国・新規受注の世界シェア',69,'％','2025','受注した船のDWT。現在の完工生産とは別。','https://zjic.zj.gov.cn/ywdh/cyfz/202602/t20260202_23931162.shtml','中国工業情報化部','世界船舶新規受注量（DWT）')],
  meaning:'中国の数量、韓国の大型船集積、日本の瀬戸内の造船・舶用機械を分けて読みます。将来の仕事量である受注と完成船の量は、企業の稼働や景気に違う意味を持ちます。',boundary:'DWT・GT（総トン）・CGT（建造の作業量を補正したトン）は交換できません。点の数を建造量順位と解釈しません。',confidence:'高'},
 logistics:{economic:[metric('上海港・コンテナ取扱',55.06,'百万TEU','2025','TEU（20フィートコンテナ換算）。積替え・空コンテナを含む取扱量。','https://en.portshanghai.com.cn/LatestNews/4941.jhtml','上海国際港務集団（SIPG）')],world:[metric('上海港・コンテナ取扱順位',1,'位','2025','16年連続世界1位と港湾運営者が公表。','https://en.portshanghai.com.cn/LatestNews/4941.jhtml','SIPG','世界の港湾別コンテナ取扱量')],
  meaning:'上海の大量取扱と釜山の積替え、高雄・日本の港の背後産業への接続は異なる機能です。港湾量は海上輸送の結節を示しますが、同じコンテナが複数港で数えられることがあります。',boundary:'取扱量を輸出額・港湾GDP・国内最終需要へ変換しません。他港の最新同年値は未確認で、0や別年で補いません。',confidence:'高'},
 finance:{economic:[
  metric('香港・金融のGDP比',26.2,'％','2024','金融サービス。香港GDPが分母で、中国本土・東アジアGDPではない。',hk,'香港政府','香港GDP'),
  metric('香港・金融就業者',265000,'人','2024','香港就業者の7.2%。取引所だけの従業者数ではない。',hk,'香港政府')],world:[metric('香港・オフショア人民元決済比',75,'％','2026年1–5月','オフショア（中国本土外）人民元決済の集中。',hk,'香港政府','世界のオフショア人民元決済')],
  meaning:'香港の金融は人民元と国際資金の接続で大きな役割を持ちます。東京・上海・台北の市場制度と専門人材の所在を併せて読むと、製造業の工場とは異なる集積条件が見えます。',boundary:'決済の流量はGDPではありません。香港の26.2%を東アジア全体へ転用せず、サービスに物品の供給・使用式を当てません。',confidence:'高'},
 design:{economic:[
  metric('台湾本社・IC設計売上',1272.1,'十億TWD','2024実績','IC（集積回路）設計企業の世界合算。',tsia,'TSIA'),
  metric('TSIA掲載・IC設計従業者',59554,'人','2024実績','TSIA表3の従業者。国内・海外の雇用地の内訳はこの資料では未確認。工場の雇用ではない。',tsia,'TSIA')],world:[metric('台湾本社・IC設計世界シェア',16.8,'％','2024実績','世界2位。企業本社による分類。',tsia,'TSIA','世界のIC設計市場売上')],
  meaning:'新竹・台北の設計オフィスは工場を持たずに知的財産と製品設計から稼ぐ企業の拠点です。製造を受託する企業への依存と、設計者の集積を分けて考えられます。',boundary:'2025年のTSIA欄は予測。設計・受託製造・後工程の売上を足して半導体GDPにはしません。',confidence:'高'},
 refining:{economic:[metric('中国・原油処理',737.59,'百万t','2025','製油所で処理した原油。原油採掘量・燃料輸出量ではない。',annual,'中国国家統計局')],world:[metric('中国・原油精製能力',17.35,'百万bbl／日','2025','bbl（バレル）：体積単位。世界103.66百万bbl／日の約16.7%。','https://publications.opec.org/asb/chapter/show/154/2833','石油輸出国機構（OPEC）・2026年版','世界原油精製能力103.66百万bbl／日')],
  meaning:'精製は輸入原油を需要に合う燃料と原料へ変える工程です。臨海の受入設備と市場が立地を支え、エネルギー安全保障では採掘国と精製の所在を分ける必要があります。',boundary:'重量で測る処理実績と体積で測る日量能力を直接比にしません。石油・石炭等の広い業種GDPを製油所へ割り当てません。',confidence:'高'},
 digital:{economic:[
  metric('中国・ソフトウェアIT業売上',15.48,'兆CNY','2025','ソフトウェア・情報技術サービスの広い業種。クラウド単独ではない。','https://english.www.gov.cn/archive/statistics/202601/31/content_WS697d4dcec6d00ca5f9a08db0.html','中国工業情報化部（中国政府転載）'),
  metric('同業種・利益',1.88,'兆CNY','2025','同業種の利益。企業1社の営業利益ではない。','https://english.www.gov.cn/archive/statistics/202601/31/content_WS697d4dcec6d00ca5f9a08db0.html','中国工業情報化部')],world:[metric('Alibaba・IaaS世界シェア',7.7,'％','2025','IaaS（計算・保存・ネットワーク等の基盤を提供するクラウド）の売上ベース。世界4位。','https://www.alibabacloud.com/blog/alibaba-maintains-leading-position-by-revenue-as-asia-pacifics-largest-cloud-provider-with-growing-market-share_603054','Alibaba（Gartner 2026年調査を掲載）','世界IaaS市場売上')],
  meaning:'杭州・城南・東京の企業はソフトウェアとオンラインサービスから稼ぎます。国の広いIT業売上と、一社のクラウド市場シェアを分けると、利用市場・企業本社・サーバー立地の違いが読めます。',boundary:'オフィスをデータセンターと表示しません。広い業種売上をクラウド単独の規模にせず、サービスに物品の需給式を使いません。',confidence:'中'},
 minorMetals:{economic:[metric('Ga・Ge品目別GDP／雇用',null,'未取得','対象年未確認','ガリウム・ゲルマニウムだけの領域内付加価値・雇用は未取得。広い非鉄金属業で補わない。',iea,'IEA（供給集中の資料）')],world:[
  metric('中国・ガリウム精製比',99,'％','2025','IEAの精製段階の供給集中。高純度電子材料の企業別市場ではない。',iea,'IEA','世界のガリウム精製'),
  metric('中国・ゲルマニウム精製比',94,'％','2025','元素・加工段階に対応する集計。',iea,'IEA','世界のゲルマニウム精製')],
  meaning:'大きなGDPがなくても、99%・94%という精製集中は輸出管理の影響を大きくします。秋田の亜鉛製錬副産物とリサイクルはガリウム調達の別経路であり、鉱石・金属・電子材料の代替は同じではありません。',boundary:'低純度の一次金属と高純度金属・化合物は別製品。DOWAの高純度品世界1位という無年次説明を、IEAの同年99%と同じ市場として比較しません。ゲルマニウムの施設分布は未確認。',confidence:'中'},
};
export const eastAdoptedIndustryIds=Object.keys(eastIndustryEvidence);
export function formatEastIndustryMetric(m:EastIndustryMetric){return m.value===null?'未取得':m.value.toLocaleString('ja-JP',{maximumFractionDigits:3});}
