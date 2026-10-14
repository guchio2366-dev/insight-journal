import {industryRegions,industrySources} from './industry-regions.ts';

export type UsSector='resources'|'manufacturing'|'services'|'construction-real-estate';
export type UsMetric={label:string;display:string;period:string;definition:string;source:string;status:'observed'|'estimated'|'company'|'missing'};
export type UsIndustry={id:string;label:string;short:string;sector:UsSector;color:string;reading:string;why:string;metrics:UsMetric[];legacy?:string};
export type UsSite={id:string;industry:string;place:string;coordinates:[number,number];stage:string;scope:string;period:string;status:'cluster'|'operating'|'registered'|'planned'|'headquarters';reading:string;scale:string|null;mapScale?:string;sources:string[]};
const metric=(label:string,display:string,period:string,definition:string,source:string,status:UsMetric['status']='observed'):UsMetric=>({label,display,period,definition,source,status});
const card=(id:string,label:string,short:string,sector:UsSector,color:string,reading:string,why:string,metrics:UsMetric[],legacy?:string):UsIndustry=>({id,label,short,sector,color,reading,why,metrics,legacy});
export const usIndustryCheckedAt='2026-10-14';
export const usIndustrySources:Record<string,{title:string;url:string}>={
 ...industrySources,
 trade:{title:'BEA・Census：2025年貿易・2026年6月年次改定',url:'https://www.bea.gov/sites/default/files/2026-06/trad1326.pdf'},
 nsf:{title:'NSF：2024年の業種別世界付加価値（2026年公表）',url:'https://ncses.nsf.gov/pubs/nsb20262/production-patterns-of-knowledge-and-technology-intensive-industries'},
 bls:{title:'BLS：2026年9月雇用表・季節調整済み',url:'https://www.bls.gov/ces/data/employment-and-earnings/2026/table1a_202609.htm'},
 oil2025:{title:'EIA：2025年原油生産の世界比較',url:'https://www.eia.gov/todayinenergy/detail.php?id=67844'},
 basins:{title:'EIA：2025年原油生産地域',url:'https://www.eia.gov/todayinenergy/detail.php?id=67404'},
 gas2025:{title:'EIA：2025年乾性天然ガス生産',url:'https://www.eia.gov/tODAyinenergy/detail.php?id=67684'},
 gasBasins:{title:'EIA：天然ガスの3大生産地域',url:'https://www.eia.gov/todayinenergy/detail.php?id=67345'},
 lng:{title:'EIA：LNG輸出と契約構造',url:'https://www.eia.gov/todayinenergy/detail.php?id=67224'},
 lng2026:{title:'EIA：2026年上半期LNG輸出',url:'https://www.eia.gov/todayinenergy/detail.php?id=68064'},
 japanLNG:{title:'EIA：2025年日本の米国産LNG調達',url:'https://www.eia.gov/TODAYINENERGY/detail.php?id=67244'},
 power:{title:'EIA：2025年米国発電量・電源構成',url:'https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php'},
 nuclear:{title:'EIA：米国の原子力発電所・州別分布',url:'https://www.eia.gov/energyexplained/nuclear/us-nuclear-industry.php'},
 uranium:{title:'EIA：2025年ウラン・濃縮サービス調達',url:'https://www.eia.gov/uranium/marketing/index.php'},
 texasPower:{title:'EIA：テキサス州の発電・エネルギー',url:'https://www.eia.gov/states/TX/overview'},
 californiaPower:{title:'EIA：カリフォルニア州の発電・エネルギー',url:'https://www.eia.gov/states/CA/overview'},
 refining:{title:'EIA：2026年1月1日製油所能力',url:'https://www.eia.gov/petroleum/refinerycapacity/table1.pdf'},
 refinedExports:{title:'EIA：2025年完成石油製品輸出・月次数量',url:'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=M&n=PET&s=MTPEXUS1'},
 ethane:{title:'EIA：2025年エタン・天然ガス液の輸出',url:'https://www.eia.gov/todayinenergy/detail.php?id=67387'},
 oica:{title:'OICA：2025年世界自動車生産',url:'https://oica.net/auto-industry-growth-shifted-east-in-2025-amid-global-repositioning/'},
 alabama:{title:'アラバマ州：複数メーカーの自動車集積',url:'https://www.madeinalabama.com/sectors/automotive/'},
 sia:{title:'SIA：2026年産業報告・2025年企業売上',url:'https://www.semiconductors.org/2026-state-of-the-industry-report-historic-growth-amid-intensifying-global-competition/'},
 chipChain:{title:'米国政府：2025年供給網レビュー・半導体工程別',url:'https://www.trade.gov/sites/default/files/2025-01/20212024-Quadrennial-Supply-Chain-Review.pdf'},
 design:{title:'SIA：2021年設計人材の推計（2022年報告）',url:'https://www.semiconductors.org/wp-content/uploads/2022/11/2022_The-Growing-Challenge-of-Semiconductor-Design-Leadership_FINAL.pdf'},
 ecosystem:{title:'SIA：設計・工場・装置材料の施設地図（全数調査ではない）',url:'https://www.semiconductors.org/ecosystem/'},
 applied:{title:'Applied Materials：2025年度事業別決算',url:'https://ir.appliedmaterials.com/news-releases/news-release-details/applied-materials-announces-fourth-quarter-and-fiscal-year-2025'},
 tsmc:{title:'TSMC Arizona：量産工場と建設計画の区別',url:'https://www.tsmc.com/static/abouttsmcaz/index.htm'},
 intelPackaging:{title:'Intel：2026年Rio Rancho後工程の稼働・技術',url:'https://www.intel.com/content/www/us/en/newsroom/news/intel-foundry/intels-us-advanced-packaging-enables-next-generation-ai-semiconductors.html'},
 hemlock:{title:'NIST：Hemlock・既存キャンパスと2028年生産計画',url:'https://www.nist.gov/chips/hemlock-semiconductor-michigan-hemlock'},
 corning:{title:'NIST：Cantonの露光用材料・2029年増産計画',url:'https://www.nist.gov/chips/corning-new-york-canton'},
 massbio:{title:'MassBio：2026年版・2025年州内バイオ医薬雇用',url:'https://www.massbio.org/industry-reports/industry-snapshot/'},
 ncBio:{title:'NCBiotech：2025年研究・製造拠点',url:'https://www.ncbiotech.org/sites/default/files/2025-06/NC%20Life%20Sciences%20Flier%20%2825-100_CC%29-FINAL%2024Apr2025.pdf'},
 foodJobs:{title:'BLS：2024年食品・飲料加工雇用（2026年公表）',url:'https://www.bls.gov/opub/mlr/2026/article/feeding-the-economy-employment-growth-in-food-and-beverage-manufacturing-expected-to-continue-through-the-2024-34-decade.htm'},
 dairy:{title:'USDA NASS：2025年乳製品加工生産',url:'https://www.nass.usda.gov/Publications/Todays_Reports/reports/daryan26.pdf'},
 meat:{title:'USDA：食肉貿易・2026年10月改定',url:'https://apps.fas.usda.gov/psdonline/circulars/livestock_poultry.pdf'},
 crushing:{title:'USDA NASS：2025暦年大豆搾油・地域別加工量',url:'https://esmis.nal.usda.gov/sites/default/release-files/795800/cafoan26.pdf'},
 oilseeds:{title:'USDA：大豆処理・大豆粕・大豆油、2026年10月版',url:'https://apps.fas.usda.gov/psdonline/circulars/oilseeds.pdf'},
 ethanol:{title:'EIA：2026年1月1日バイオ燃料加工能力（9月公表）',url:'https://www.eia.gov/biofuels/capacity/'},
 ethanolStates:{title:'EIA：2025年州別エタノール設備能力',url:'https://www.eia.gov/petroleum/ethanolcapacity/'},
 cloud:{title:'Synergy：2026年第2四半期クラウド基盤市場・調査原公表',url:'https://www.srgresearch.com/articles/q2-cloud-market-passes-143-billion-highest-growth-rate-in-eight-years'},
 virginiaCloud:{title:'VEDP：バージニアのクラウド基盤立地',url:'https://www.vedp.org/industry/cloud-ai-infrastructure'},
 bis:{title:'BIS：2025年4月世界外国為替取引',url:'https://www.bis.org/statistics/rpfx25_fx.pdf'},
 nyFinance:{title:'ニューヨーク州会計監査官：2025年証券業雇用',url:'https://www.osc.ny.gov/press/releases/2026/03/dinapoli-246900-average-bonus-on-wall-street-up-6-percent-in-2025'},
 bts:{title:'BTS：2025年米加墨越境貨物貿易',url:'https://www.bts.gov/newsroom/transborder-freight-data-annual-report-2025-0'},
 aci:{title:'ACI：2025年世界空港貨物順位（2026年公表）',url:'https://aci.aero/2026/07/15/worlds-busiest-airports-atlanta-holds-asia-climbs-strong-demand-while-asia-pacific-growth-reshape-the-rankings/'},
 laPort:{title:'ロサンゼルス港：2025年取扱実績',url:'https://portoflosangeles.org/references/2026-news-releases/news_012226_sotpla26_event'},
 steel:{title:'worldsteel：2025年粗鋼・製造工程（2026年版）',url:'https://worldsteel.org/data/world-steel-in-figures/world-steel-in-figures-2026/'},
 devices:{title:'ミネソタ州：医療機器・生命科学集積',url:'https://mn.gov/deed/dobusiness/key-industries/leading-life-sciences/'},
 tourismGDP:{title:'BEA：2023年観光衛星勘定（2025年公表）',url:'https://apps.bea.gov/scb/issues/2025/02-february/0225-travel-tourism-satellite-account.htm'},
 tourismStatus:{title:'BEA：観光衛星勘定の定期作成停止（2026年2月）',url:'https://www.bea.gov/data/special-topics/travel-and-tourism'},
 unTourism:{title:'UN Tourism：米国の国際観光収入の位置（2025年5月）',url:'https://www.untourism.int/news/international-tourist-arrivals-grew-5-in-q1-2025'},
 vegas:{title:'LVCVA：2025年ラスベガス来訪者',url:'https://press.lvcva.com/news-releases/las-vegas-welcomes-38.5-million-visitors-in-a-complex-year-marked-by-shifting-travel-dynamics/s/eb1a5d19-71e6-4df5-b0da-c20fc38fa2ac'},
 minerals2026:{title:'USGS：2025年鉱物・純輸入依存（2026年版）',url:'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026.pdf'},
 substitution:{title:'GAO：2026年重要鉱物の代替可能性評価',url:'https://www.gao.gov/products/gao-26-108687'},
 machineGDP:{title:'BEA：2025年機械製造業付加価値・FRED掲載',url:'https://fred.stlouisfed.org/series/USMACHMANNGSP'},
 constructionGDP:{title:'BEA：2025年建設付加価値・FRED掲載',url:'https://fred.stlouisfed.org/series/USCONSTNGSP'},
 realEstateGDP:{title:'BEA：2025年不動産・賃貸・リース付加価値・FRED掲載',url:'https://fred.stlouisfed.org/series/USRERENTLEANGSP'},
};
export const usIndustrySectors=[
 {id:'resources',label:'資源・エネルギー',reading:'原油・ガスはパーミアン、バッケン、アパラチアなどの地下資源に、精製とLNGは湾岸のパイプライン・港湾に集まり、発電は燃料・風況・日射と既存設備によって分布する。',why:'採る場所、使える燃料へ変える場所、発電する場所の立地条件は異なる。資源量と加工・輸送能力を分けて読む。'},
 {id:'manufacturing',label:'製造業',reading:'湾岸の精製・石油化学、中西部から南部の自動車、西岸・テキサスなどの航空宇宙・半導体、北東部とノースカロライナの医薬、中西部の食品加工が異なる供給網を形成する。',why:'原料に近い加工、部品と技能が集まる組立、設計・研究開発と資本設備を組み合わせる製造では、集積の理由が異なる。'},
 {id:'services',label:'サービス業',reading:'金融はニューヨーク、情報技術は西岸とオースティン、データ基盤は北バージニアに集まり、貨物物流は沿岸港・内陸交通・航空中継の結節点、観光は集客設備を持つ地域に分布する。',why:'専門人材と顧客の近接、情報・交通網の接続、訪問先としての魅力が立地を支える。物品の生産・消費収支をサービスへ当てはめない。'},
 {id:'construction-real-estate',label:'建設・不動産',reading:'オースティン・ダラスなどでは人口・企業の移動に建設と不動産活動が結び付く。新しく造る建設と、既存の住宅・業務床を利用する不動産サービスは別の活動である。',why:'既存枠を保持する。建設のフローと、不動産の賃貸・帰属家賃を区別し、住宅売買総額を付加価値へ読み替えない。'},
] as const;
const missing=(definition:string,source:string)=>metric('確認できていない統計','未取得','2026-10-14確認',definition,source,'missing');
export const usIndustries:UsIndustry[]=[
 card('crude-oil','原油','原油','resources','#9b5135','原油はパーミアン盆地を中心に南テキサスとノースダコタにも分布し、シェール開発とパイプラインが産地を支える。','地下の資源、水平掘削・水圧破砕、輸送設備を組み合わせた生産。中東の供給と比べる入口。',[metric('米国生産','1,360万','2025年','日量バレル。リース・コンデンセートを含む原油。世界1位。','oil2025'),metric('パーミアンの国内比率','48%','2025年','日量660万バレル／米国原油生産。','basins'),metric('原油輸出','987.10億ドル','2025年','Census財輸出。付加価値ではない。','trade')]),
 card('natural-gas','天然ガス・LNG','天然ガス・LNG','resources','#596e91','ガスはアパラチア・パーミアン・ヘインズビル、輸出用液化設備はルイジアナ・テキサス沿岸に集まる。','産地と液化港を分ける。国内ガス価格と液化料金を組み合わせる契約は原油連動価格とは異なる。',[metric('乾性天然ガス生産','39兆立方フィート','2025年','年間生産。販売用ガスやLNG輸出とは段階が異なる。','gas2025'),metric('3大地域の国内比率','67%','2025年','アパラチア・パーミアン・ヘインズビル／米国販売用ガス生産。','gasBasins'),metric('LNG輸出','日量174億立方フィート','2026年上半期','前年比23%増。米国は世界最大のLNG輸出国。','lng2026'),metric('日本の米国産LNG比率','7%','2025年','分母は日本の全LNG輸入。米国の輸出先比率ではない。','japanLNG')]),
 card('power','電力：原子力・風力・太陽光・ガス','電力','resources','#3c7a74','風力はテキサスなど大平原、太陽光は南西部、原子力はイリノイや南東部の既存設備に分布し、電源構成が地域で異なる。','風況・日射・用水・送電と需要が立地を制約する。国内発電とウラン・濃縮サービスの調達先を分ける。',[metric('大型設備の発電量','4兆4,290億kWh','2025年','容量1MW以上。小規模太陽光を除く。ガス41%、原子力18%、再生可能24%、石炭17%（丸め値）。','power'),metric('発電・送配電雇用','43.16万人','2026年8月','NAICS2211。ガス配給・水道を含めない。','bls'),metric('濃縮サービス外国供給','77%','2025年','原子炉所有者の濃縮役務調達。ロシア26%。原子力発電量の輸入比率ではない。','uranium')]),
 card('refining','石油精製','石油精製','manufacturing','#a44955','精製はテキサス・ルイジアナの湾岸と西海岸の確認施設に分布し、原油パイプライン・港・加工設備に結び付く。','燃料規格と地域間輸送も供給を左右する。原油産地と製油所を区別する。資源の地図にも重複表示する。',[metric('原油処理能力','日量1,816万バレル','2026年1月1日','操業可能130製油所。設備能力であり実処理量ではない。','refining'),metric('テキサス＋ルイジアナ','50.3%','2026年1月1日','2州の原油処理能力／米国能力。','refining'),metric('完成石油製品輸出','日量約305万バレル','2025年','月次数量合計÷365。天然ガス液を含む広い石油製品とは異なる。','refinedExports'),missing('同一定義の2025年国別精製能力順位。世界1位とは断定しない。','refining')]),
 card('petrochemicals','石油化学：エタン原料・基礎樹脂','石油化学','manufacturing','#b97931','エタン原料の石油化学はテキサス・ルイジアナ湾岸に集まり、ガス田由来の原料と分離・貯蔵・輸出設備を共有する。','エタンからエチレン、樹脂へ加工する工程。燃料精製と区別し、中国向け原料輸出の集中も読む。',[metric('エタン輸出','日量57.9万バレル','2025年','9か国向け、半分超が中国。米国とノルウェーが海上輸出国。','ethane'),metric('プラスチック原料輸出','436.16億ドル','2025年','輸入193.07億ドル。樹脂等の広い集合で、エチレン単独ではない。','trade'),missing('エチレン・ポリエチレン単独の世界生産比率。','ethane')]),
 card('auto','自動車・部品','自動車・部品','manufacturing','#4c8051','自動車はミシガンなど中西部からケンタッキー・アラバマへ連なり、部品網・技能と新設工場・道路網が集積を支える。','国内生産と巨大市場、米加墨の分業、日本企業の現地製造を読む。企業本社と工場を区別する。',[metric('自動車生産','1,024万台','2025年','乗用車＋商用車。世界9,640万台の10.6%、世界2位。','oica'),metric('自動車・部品・エンジン貿易','輸出1,603.44億ドル','2025年','輸入4,220.02億ドル。財貿易分類、付加価値ではない。','trade')],'auto'),
 card('aerospace','航空宇宙：機体・エンジン・部品','航空宇宙','manufacturing','#ab751e','航空宇宙はワシントン州の製造・供給網とフォートワースなどの防衛産業に集積し、機体・部品・試験整備が分業する。','民間機、軍用機、宇宙とエンジン・部品の範囲を分ける。航空物流とは別産業。',[metric('航空宇宙の世界付加価値比率','51.4%','2024年','ISIC303、軍用・宇宙を含む。米国本社企業だけの売上ではない。','nsf','estimated'),metric('民間航空機関連輸出','1,541.17億ドル','2025年','機体494.10＋エンジン760.73＋部品286.34億ドル。民間輸出で軍用・宇宙の付加価値とは別。','trade')],'aerospace'),
 card('chip-design','半導体設計・EDA・回路IP','半導体設計','manufacturing','#4f6a9c','半導体設計はカリフォルニアやオースティンの人材・研究・顧客集積に結び付き、工場の所在地とは異なる。','EDAは電子回路設計自動化ソフト、回路IPは再利用できる設計資産。製造委託と設計・知財の稼ぎを分ける。',[metric('米国内設計技術者','約6万人','2021年','世界18.7万人の約32%。企業職歴等による推計。最新雇用ではない。','design','estimated'),metric('米国本社企業の設計売上比率','51%','2022年','世界設計市場売上。国内製造比率ではない。EDA・回路IPの世界付加価値は68%。','chipChain','estimated'),metric('米国本社半導体企業売上','4,250億ドル','2025年','全工程を含む企業世界売上。世界半導体売上7,956億ドルの53.4%。設計単独のGDPには使わない。','sia','company')]),
 card('chip-equipment','半導体製造装置','半導体装置','manufacturing','#755d9c','半導体装置はベイエリアなどの技術集積に立地し、顧客の工程開発と専門部品・技術者の近接が開発を支える。','成膜・エッチング・検査等の装置を区別する。極端紫外線露光装置はオランダの一社に集中する。',[metric('米国企業の前工程装置市場比率','46%','2022年','企業国籍別。日本26%、オランダ18%。米国内製造比率ではない。','chipChain','estimated'),metric('Applied半導体システム売上','207.98億ドル','2025年度','営業利益率35.5%。一社の世界事業で、国内産業全体の規模ではない。','applied','company'),missing('米国内装置産業の最新の独立した付加価値・雇用。','chipChain')]),
 card('chip-fabrication','半導体前工程：回路形成','半導体前工程','manufacturing','#336f86','前工程はフェニックス、オースティン・ダラス周辺などの工場・技能・用水・電力基盤に立地し、設計拠点と分布が異なる。','ウェハー上に回路をつくる工程。発表投資額を稼働能力へ換算せず、量産と計画を分ける。',[metric('米国内製造能力の世界比率','約10%','2022年','全ウェハー製造能力の基準値。当時10nm未満先端ロジックは0%。2032年予測を現在値にしない。','chipChain','estimated'),metric('TSMC Arizona第1工場','N4量産','2024年第4四半期開始','稼働工場の事例。米国全体の生産能力比率とは異なる。','tsmc','company'),missing('2025～26年の工程別国内能力の全国集計。','ecosystem')]),
 card('pharma','医薬品：研究・製剤・原薬','医薬品','manufacturing','#a75c7b','医薬品はボストン・ケンブリッジの研究集積とノースカロライナの研究・製造地域に分布し、大学・病院・技能が立地を支える。','研究開発、製剤、原薬は別段階。原薬工場数を国別供給数量へ読み替えない。',[metric('医薬品製剤貿易','輸出1,192.02億ドル','2025年','輸入2,875.15億ドル。製剤貿易分類で原薬数量ではない。','trade'),metric('世界医薬品付加価値比率','28.0%・世界1位','2024年','ISIC21、バイオ医薬を含む。','nsf','estimated'),metric('マサチューセッツ州関連雇用','11万3,503人','2025年','州のバイオ医薬研究・製造等。全国製薬工場雇用とは別。','massbio')]),
 card('food','食品・飲料加工','食品加工','manufacturing','#718143','乳製品はウィスコンシン、食品加工はワシントンなど原料と輸送網に結び付き、搾油・飼料原料加工は中西部に集まる。','肉類・乳製品・穀物加工を分ける。農場の一次生産と加工業の規模・世界優位を混同しない。',[metric('食品・飲料製造雇用','210.06万人','2024年','米国製造業雇用の16%。農場・飲食店を除く。食肉処理・加工55.64万人。','foodJobs'),metric('豚肉輸出','316.2万トン','2025年','枝肉重量換算。世界1,039.2万トンの30.4%。EU27を一主体とし域内貿易を除く。2026年10月改定。','meat','estimated'),metric('ウィスコンシンのチーズ比率','24.6%','2025年','米国チーズ生産148億ポンドの州比率。カッテージチーズを除く。','dairy')],'food'),
 card('oilseed-processing','大豆搾油・飼料原料加工','搾油・飼料加工','manufacturing','#8b7542','大豆搾油はアイオワ・イリノイなどの中西部に集まり、集荷と畜産需要の近接が油・大豆粕の併産を支える。','大豆を食用油・燃料原料と飼料向け大豆粕へ加工する。同じ加工を食品の文脈にも含め、二重計上はしない。',[metric('米国大豆処理量','7,200.3万トン','2025/26年度','世界3億7,583.8万トンの19.2%、中国に次ぐ2位。各国販売年度の合算、2026年10月推計。','oilseeds','estimated'),metric('大豆粕輸出','1,859.7万トン','2025/26年度','世界8,697.8万トンの21.4%、アルゼンチン・ブラジルに次ぐ3位。原料大豆輸出とは別。','oilseeds','estimated'),metric('アイオワ／イリノイの加工比率','21.8%／10.2%','2025暦年','NASS地域別大豆処理量／全国処理量。販売年度表と年を混ぜない。','crushing')]),
 card('biofuels','燃料用エタノール加工','エタノール加工','manufacturing','#aa843d','燃料用エタノール加工はアイオワ・ネブラスカなど中西部に集まり、原料集荷・副産物の飼料利用・燃料出荷に結び付く。','農産物を燃料へ変える加工。生産能力と実生産、エタノールと再生可能ディーゼルを分ける。資源側にも表示する。',[metric('米国エタノール設備能力','日量120.2万バレル','2026年1月1日','189工場。能力であり実生産量ではない。','ethanol'),metric('中西部地区の能力比率','94.5%','2026年1月1日','175工場、113.6万バレル／全国120.2万バレル。','ethanol')]),
 card('software-cloud','ソフトウェア・クラウド','ソフト・クラウド','services','#28766f','ソフト開発はワシントン州・オースティンなどの技術集積、クラウド設備は北バージニアの通信・電力基盤に結び付く。','本社・開発人材とデータセンターを区別する。クラウド基盤と業務ソフトは同じ市場ではない。',[metric('ソフトウェア出版雇用','65.29万人','2026年8月','NAICS5132。計算基盤・データ処理等は同年9月45.38万人（クラウド以外も含む）。','bls'),metric('世界付加価値比率','ソフト出版74.6%','2024年','IT・情報サービス43.7%とは別分類。','nsf','estimated'),metric('世界クラウド基盤市場','1,430億ドル／四半期','2026年第2四半期','Amazon28%、Microsoft20%、Google15%、計63%。企業国籍別で国内設備比率ではない。調査原公表。','cloud','estimated')]),
 card('finance','金融・保険','金融・保険','services','#835276','金融はニューヨークの証券市場と専門人材に集まり、ダラスの業務拠点やサンアントニオの保険など都市ごとに機能が異なる。','仲介・運用・保険のサービスを区別する。ドル利用比率を米国内金融業生産比率とは呼ばない。',[metric('金融サービス貿易','輸出2,140.10億ドル','2025年','輸入720.74億ドル。保険サービスを除く仲介・証券・運用等。','trade'),metric('米ドルの外国為替利用','89.2%','2025年4月','世界取引の片側。二通貨で合計200%。国内金融の世界生産シェアではない。','bis'),metric('ニューヨーク市証券雇用','19万8,200人','2025年暫定','市の証券業。銀行・保険全体の雇用ではない。','nyFinance')],'finance'),
 card('logistics','港湾・陸空物流','貨物物流','services','#39708e','物流はロサンゼルス港、ダラスの内陸交通、アンカレッジ・ルイビル・メンフィスの航空網などの結節点に集積する。','輸送する商品の価額は物流会社の売上ではない。港の取扱、航空中継、倉庫の仕事を区別する。',[metric('トラック／倉庫・保管雇用','147.31万人／183.18万人','2026年9月','旅客を含む運輸業全体のGDPを貨物だけに割り当てない。','bls'),metric('米加墨貨物貿易','1兆5,856億ドル','2025年','米国国際財貿易の29.8%。商品の価額で物流売上ではない。','bts'),metric('アンカレッジ航空貨物','385.5万トン・世界3位','2025年','米国首位。中継貨物等を含む空港貨物取扱。ルイビル4位、マイアミ5位、メンフィス6位。','aci')]),
 card('steel','鉄鋼：高炉・電炉','鉄鋼','manufacturing','#647580','鉄鋼は五大湖周辺などの既存金属集積に立地し、原料・水運・技能とスクラップ・電力利用の工程差が供給を左右する。','電炉は主に電気で鋼を溶解する方式。原料や電源によって排出量が変わり、電炉だけでゼロ排出とはしない。',[metric('米国粗鋼生産','約8,190万トン','2025年','世界約18.5億トンの4.4%、世界3位。','steel'),metric('電炉による生産比率','71.3%','2025年','分母は米国粗鋼生産。日本25.8%。製造工程の比較。','steel','estimated')]),
 card('medical-devices','医療機器・医療歯科用器具','医療機器','manufacturing','#a86281','医療機器はミネアポリス・セントポールなどの専門メーカー・病院集積に立地し、臨床人材と技術の近接が製品開発を支える。','医薬品とは製品・規制・供給網が異なる。掲載は確認集積例で、全国の全工場分布ではない。',[metric('医療機器輸出','459.92億ドル','2025年','財貿易の広い医療機器集合。医療・歯科用器具の国際分類より広い。','trade'),metric('医療・歯科用器具世界付加価値','34.6%・世界1位','2024年','ISIC325。上の輸出範囲と同一集合にしない。','nsf','estimated')]),
 card('machinery','農業・建設・食品加工機械','機械','manufacturing','#796548','機械はイリノイ・ウィスコンシンなど中西部に集積し、農業・食品工場の需要と金属加工・部品・技能の蓄積に結び付く。','農機・建機・食品加工機械を区別し、半導体装置との重複は合算しない。',[metric('機械製造業付加価値','2,202.04億ドル','2025年','50州＋DC、NAICS333全体。農機だけの規模ではなく半導体装置等も含む。','machineGDP'),metric('一般機械の世界付加価値比率','13.6%','2024年','ISIC28。中国36.2%。NAICS333と完全一致ではない。','nsf','estimated'),metric('農業／掘削建設機械輸出','82.23億／121.73億ドル','2025年','それぞれ別の財貿易品目。','trade')],'machinery'),
 card('tourism','観光・娯楽','観光・娯楽','services','#997445','観光はラスベガスのリゾート・会議やサンアントニオの歴史・会議需要に集まり、集客設備と交通接続が立地を支える。','住民の飲食・娯楽利用と来訪者需要は異なる。国際旅行には教育・業務等も含む。',[metric('観光直接付加価値','約8,400億ドル','2023年','同年GDPの約3.0%。BEAは2026年2月に定期作成停止。2023年が確認できた最新。','tourismGDP'),metric('国際観光収入順位','世界1位','2024年に対応する2025年5月公表','UN Tourismの世界最大収入国の記述。到着者数順位とは異なる。','unTourism'),metric('ラスベガス来訪者','3,850万人','2025年','地域来訪者数。国際旅行者だけではない。','vegas')],'tourism'),
 card('chip-packaging','半導体後工程：組立・封止・試験','半導体後工程','manufacturing','#96719d','後工程は既存半導体企業の拠点にあり、アリゾナ等では新設計画も進むため、稼働施設と計画の位置を分ける。','後工程は切断・組立・封止・試験。ウェハー上の配線形成とは別。全国工場分布を一つの施設で代表させない。',[metric('米国の組立・試験・封止比率','約5%','2025年政府レビュー引用','SIA2023年資料の引用。元統計基準年未確認のため現在値とは断定しない。','chipChain','estimated'),metric('米国企業の装置市場比率','封止5%／試験30%','2022年','企業国籍別。前工程装置46%と別市場。','chipChain','estimated'),missing('最新の後工程国内付加価値・能力全国集計。','ecosystem')]),
 card('chip-materials','半導体材料：ウェハー・薬液・ガス','半導体材料','manufacturing','#4a8784','半導体材料は材料企業と製造工場の供給基盤に結び付くが、高純度材料と原料鉱物は別の工程・地理を持つ。','ガリウム等の原料、ウェハー、薬液・ガス、封止材料を区別する。全材料を一つの輸入依存比率で扱わない。',[metric('ガリウム純輸入依存','100%','2025年','分母は米国ガリウム見掛消費量。全半導体材料の依存度ではない。','minerals2026'),missing('材料別の米国付加価値・世界シェア。国内工場位置は確認施設例だけを使う。','ecosystem')]),
 card('construction','建設','建設','construction-real-estate','#86627f','建設はオースティンなど人口・企業が流入する都市の新しい住宅・業務床・設備需要に結び付く。','既存枠を保持。新規工事の付加価値と既存不動産の賃貸サービスを分ける。',[metric('建設付加価値','約1.340兆ドル','2025年','50州＋DC、NAICS23。世界輸出競争力の指標ではない。','constructionGDP')],'construction'),
 card('real-estate','不動産・賃貸・リース','不動産・賃貸','construction-real-estate','#72658a','不動産・賃貸はダラスやオースティンの企業・人口移動と既存資産の利用に結び付き、建設とは異なる活動を持つ。','持家の帰属家賃や各種リースを含む。住宅売買額をGDPへ置き換えない。既存枠を削除しない。',[metric('不動産・賃貸・リース付加価値','約4.234兆ドル','2025年','50州＋DC、NAICS53。売買総額ではなく持家帰属家賃・各種リースを含む。','realEstateGDP')],'real-estate'),
];

// Retain sourced existing categories; their economic charts remain available below.
const retained=[['shipbuilding','造船','manufacturing'],['railway','鉄道車両','manufacturing'],['mining','鉱業：石炭・金属鉱物','resources'],['professional','専門・業務サービス','services'],['health-education','医療・教育','services'],['other-manufacturing','家具等の製造','manufacturing']] as const;
for(const [id,label,sector] of retained){const peers=industryRegions.filter(r=>r.subsector===id);usIndustries.push(card(id,label,label,sector,'#67776f',peers.map(r=>`${r.name}：${r.function}`).join('。')+'。',peers[0]?.description??'地域資料の確認範囲で読む。',[missing('既存統計の分類・年・取得範囲は下部の保存済み詳細で確認。狭い品目へ広いGDPを転用しない。',peers[0]?.source??'bls')],id));}

export const usResearchRequirements=['crude-oil','natural-gas','power','refining','petrochemicals','auto','aerospace','chip-design','chip-equipment','chip-fabrication','pharma','food','oilseed-processing','biofuels','software-cloud','finance','logistics','steel','medical-devices','machinery','tourism','chip-packaging','chip-materials','construction','real-estate'] as const;
export const usSectorIndustryIds=(sector:UsSector)=>usIndustries.filter(i=>i.sector===sector||sector==='resources'&&['refining','biofuels'].includes(i.id)).map(i=>i.id);
const remap:Record<string,string[]>={auto:['auto'],aerospace:['aerospace'],electronics:['chip-design'],machinery:['machinery'],metals:['steel'],chemicals:['refining','petrochemicals'],food:['food'],information:['software-cloud'],finance:['finance'],'trade-logistics':['logistics'],tourism:['tourism'],construction:['construction'],'real-estate':['real-estate']};
export const usIndustrySites:UsSite[]=industryRegions.filter(r=>r.mapRole!=='context'&&!['oil-gas','utilities'].includes(r.subsector)).flatMap(r=>(r.id==='baytown-chemical'?['petrochemicals']:r.id==='puget-refinery'?['refining']:remap[r.subsector]??[r.subsector]).map(industry=>({id:`${r.id}-${industry}`,industry,place:r.name,coordinates:r.coordinates,stage:r.function,scope:r.scope,period:r.year,status:r.id.includes('refinery')||r.id==='baytown-chemical'?'registered':'cluster',reading:r.description,scale:null,sources:[r.source]} as UsSite)));
const site=(id:string,industry:string,place:string,coordinates:[number,number],stage:string,scope:string,period:string,reading:string,sources:string[],scale:string|null=null,status:UsSite['status']='cluster')=>usIndustrySites.push({id,industry,place,coordinates,stage,scope,period,reading,sources,scale,status});
site('permian','crude-oil','パーミアン盆地',[-102.2,31.9],'原油採取','盆地の案内位置・施設座標ではない','2025','西テキサス・ニューメキシコ南東部のシェール開発。',['basins'],'日量660万バレル、米国原油の48%');
site('eagle-ford','crude-oil','南テキサス／イーグルフォード',[-99.2,28.5],'原油採取','盆地の案内位置','2025','シェール層と掘削・搬出設備。',['basins'],'日量120万バレル、全国9%');
site('bakken','crude-oil','バッケン／ノースダコタ',[-103,48],'原油採取','盆地の案内位置','2025','北部の原油産地。',['basins'],'日量120万バレル、全国9%');
site('appalachia','natural-gas','アパラチア／PA・WV・OH',[-79.5,40.2],'販売用ガス採取','複数州の産地案内位置','2025','地下資源とパイプラインが支えるガス産地。',['gasBasins'],'米国販売用ガスの31%');
site('permian-gas','natural-gas','パーミアン盆地',[-102.2,31.9],'天然ガス採取','盆地の案内位置','2025','原油とガスが近接して産出。',['gasBasins']);
site('haynesville','natural-gas','ヘインズビル／東TX・LA',[-94,32.1],'天然ガス採取','産地の案内位置','2025','湾岸の液化・搬出基盤へ接続するガス産地。',['gasBasins']);
site('gulf-lng','natural-gas','テキサス・ルイジアナ沿岸',[-93.8,29.9],'液化・輸出','沿岸設備群の案内位置・個別施設ではない','2026上半期','液化設備はガス田の位置と異なり、港湾・パイプラインを利用する。',['lng','lng2026']);
site('tx-power','power','テキサス',[-100,33.3],'風力等の発電','州の案内位置','2026確認','風況と広い土地、送電・需要が発電立地を支える。',['texasPower']);
site('ca-power','power','カリフォルニア',[-119.3,35.7],'太陽光等の発電','州の案内位置','2026確認','日射と電源構成、送電・需要の関係。',['californiaPower']);
site('il-nuclear','power','イリノイ',[-89,41.5],'原子力発電','州の案内位置・発電所座標ではない','2025末','既存原子力設備と冷却・送電基盤。',['nuclear'],'11基・6発電所、設備11,592MW');
site('la-refining','refining','ルイジアナ湾岸',[-91.6,30.4],'原油精製','州沿岸の案内位置','2026年1月1日','港湾と原油搬入、既存の精製設備。',['refining'],'15製油所、原油処理能力日量300.5万バレル');
site('bay-equipment','chip-equipment','カリフォルニア／ベイエリア',[-121.9,37.33],'装置開発・製造','技術集積の案内位置・本社と工場を同一視しない','2026確認','専門装置企業と半導体開発・部品・人材が近接する。',['california','ecosystem']);
site('az-fab','chip-fabrication','フェニックス／TSMC Arizona',[-112.1,33.7],'ウェハー回路形成・N4量産','フェニックス地区の案内位置・施設座標ではない','2024Q4量産開始・2026確認','企業資料で量産を確認した前工程の事例。',['tsmc'],'第1fabはN4量産。全国能力の代表値ではない','operating');
site('austin-fab','chip-fabrication','オースティン',[-97.74,30.27],'半導体製造','都市圏の案内位置・工場の境界ではない','2026確認','既存の半導体工場、人材・供給基盤。',['ecosystem','austin']);
site('dallas-fab','chip-fabrication','ダラス周辺',[-96.8,32.78],'半導体製造','都市圏の案内位置・工場の境界ではない','2026確認','既存の半導体工場、人材・供給基盤。',['ecosystem','dallas']);
site('rio-rancho-packaging','chip-packaging','リオランチョ／Intel Fab9',[-106.67,35.23],'先端組立・封止','市の案内位置・施設精密座標ではない','2024開設・2026企業資料確認','稼働中の先端後工程施設の事例。全国の後工程分布・生産量を代表する点ではない。',['intelPackaging'],null,'operating');
site('az-packaging-plan','chip-packaging','TSMC Arizona後工程計画',[-112.1,33.7],'先端後工程・建設計画','地区案内位置・稼働設備ではない','2026年初の初期工事','後工程の新設計画。前工程第1fabの稼働と区別する。',['tsmc'],null,'planned');
site('hemlock-material-plan','chip-materials','ヘムロック／ミシガン',[-84.23,43.41],'高純度ポリシリコン増産計画','既存キャンパスの市案内位置・新設備は計画','2025政府公表・2028年生産予定','半導体用高純度材料。既存メーカーと新施設の生産予定を区別し、補助金を生産額としない。',['hemlock'],'NISTによれば先端用純度を供給する世界5社の一社。米国所有メーカーという定義', 'planned');
site('canton-material-plan','chip-materials','カントン／ニューヨーク',[-75.17,44.6],'露光装置・マスク用材料増産計画','市の案内位置・増産計画','2025政府資料・2029年本格生産目標','高純度溶融シリカ・低膨張ガラス。原料ガリウムと別製品で、増産能力は実績ではない。',['corning'],null,'planned');
site('boston-pharma','pharma','ボストン・ケンブリッジ',[-71.1,42.36],'バイオ医薬研究・事業集積','都市圏の案内位置','2025','大学・病院・研究人材の集積。',['massbio'],'マサチューセッツ州関連雇用11万3,503人（都市だけの値ではない）');
site('nc-pharma','pharma','ノースカロライナ／研究三角地帯',[-78.9,35.9],'医薬研究・製造','地域案内位置・工場座標ではない','2025','大学・研究・製造技能と複数の生産企業が集まる。',['ncBio'],'州資料は生命科学製造企業145社超。医薬品だけの社数ではない');
site('iowa-crush','oilseed-processing','アイオワ',[-93.5,42],'大豆搾油・大豆粕生産','州の加工集積案内位置','2025暦年','原料集荷、搾油設備、油と飼料原料の出荷が結び付く。',['crushing'],'米国大豆処理量の21.8%');
site('illinois-crush','oilseed-processing','イリノイ',[-89,40],'大豆搾油・大豆粕生産','州の加工集積案内位置','2025暦年','加工能力は原料大豆の生産シェアとは別。',['crushing'],'米国大豆処理量の10.2%');
site('iowa-ethanol','biofuels','アイオワ',[-93.5,42],'燃料用エタノール加工','州の加工集積案内位置','2025年1月1日','トウモロコシ集荷と副産物飼料・燃料の出荷。',['ethanolStates'],'42工場、年50.39億米ガロンの能力');
site('nebraska-ethanol','biofuels','ネブラスカ',[-99,41.4],'燃料用エタノール加工','州の加工集積案内位置','2025年1月1日','原料と加工・輸送の接続。全国最新値2026年とは時点が異なる。',['ethanolStates'],'24工場、年24.04億米ガロンの能力');
site('virginia-data','software-cloud','北バージニア',[-77.5,39],'クラウド・データ基盤','地域の案内位置・企業本社ではない','2026確認','光通信密度、既存ネットワーク、電力と運用基盤が立地を支える。',['virginiaCloud']);
site('la-port','logistics','ロサンゼルス港',[-118.27,33.73],'港湾貨物取扱','港湾地区の案内位置','2025','太平洋航路と内陸搬出への接続。',['laPort'],'年間約1,020万TEU（20フィートコンテナ換算）。重量とは異なる');
site('anchorage-cargo','logistics','アンカレッジ',[-149.9,61.2],'国際航空貨物・中継','空港都市の案内位置','2025','太平洋航空貨物の中継機能。全貨物を米国輸出とは呼ばない。',['aci'],'385.5万トン、世界3位');
site('louisville-cargo','logistics','ルイビル',[-85.76,38.25],'航空貨物・配送網','空港都市の案内位置','2025','航空貨物ネットワークの集約。',['aci'],'339.6万トン、世界4位');
site('memphis-cargo','logistics','メンフィス',[-89.97,35.15],'航空貨物・配送網','空港都市の案内位置','2025','配送網の集約。旧年の世界順位を現在へ転用しない。',['aci'],'296.95万トン、世界6位');
site('miami-cargo','logistics','マイアミ',[-80.28,25.79],'航空貨物','空港都市の案内位置','2025','航空貨物の国際接続。',['aci'],'312.8万トン、世界5位');
site('mn-devices','medical-devices','ミネアポリス・セントポール',[-93.2,44.95],'医療機器の開発・製造集積','都市圏の案内位置','2026確認','病院、臨床人材、専門メーカーの近接。',['devices']);

const mapScales:Record<string,string>={permian:'国内48% · 2025',appalachia:'国内31% · 2025','il-nuclear':'11基 · 2025末','la-refining':'能力300.5万b/d · 2026','iowa-crush':'国内21.8% · 2025','iowa-ethanol':'能力50.39億gal/年 · 2025','anchorage-cargo':'385.5万t · 2025','boston-pharma':'MA州11.35万人 · 2025'};
for(const s of usIndustrySites)if(mapScales[s.id])s.mapScale=mapScales[s.id];
const foodSite=usIndustrySites.find(s=>s.id==='wisconsin-food-food');if(foodSite){foodSite.scale='ウィスコンシンは全国チーズ生産の24.6%（2025年、カッテージ除外）';foodSite.mapScale='チーズ国内24.6% · 2025';foodSite.sources.push('dairy');}

export function usSitesForSector(sector:UsSector){const ids=new Set(usSectorIndustryIds(sector));return usIndustrySites.filter(s=>ids.has(s.industry));}
export const usIndustryFlows:never[]=[]; // No source-confirmed transaction routes were acquired.
