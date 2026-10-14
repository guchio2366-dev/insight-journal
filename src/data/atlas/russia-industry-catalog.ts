/** Russia-only catalogue. Quantities retain the source's product stage and reporting territory. */
export type RuSector = 'resources' | 'manufacturing' | 'services';
export type RuSource = {title:string;url:string;period:string;method:string};
export const ruSources:Record<string,RuSource> = {
 usgs:{title:'USGS — Russia minerals review (2024)',url:'https://www.usgs.gov/centers/national-minerals-information-center/russia',period:'2024年・2026年更新',method:'米国地質調査所の国別生産表・世界順位。推計を含む。ロシア税関の品目別輸出報告ではない。'},
 eia:{title:'EIA — Russia country analysis',url:'https://www.eia.gov/international/content/analysis/countries_long/russia/',period:'2025-07-24公表',method:'米国エネルギー情報局。原油・コンデンセート・全液体燃料の定義、short ton と metric tonne を区別。'},
 oilTrade:{title:'EIA — Russian oil exports shift to Asia',url:'https://www.eia.gov/todayinenergy/detail.php?id=65885',period:'2024年・2025-08-07公表',method:'EIAによるGTTracker・Argus・Vortexa等の分析。ロシア直接報告の税関統計ではない。'},
 gasTrade:{title:'EIA — Russia natural gas and coal trade',url:'https://www.eia.gov/todayinenergy/detail.php?id=66044',period:'2024年等・2025-09-03公表',method:'欧州向けガス縮小と東方への輸送制約。輸送能力と実績を区別。'},
 nornickel:{title:'Nornickel 2025 — operational performance',url:'https://ar2025.nornickel.com/business-overview/operational-performance/',period:'2025年',method:'企業グループの実績。フィンランドでの精製を含むためロシア全国量へ置換しない。'},
 kola:{title:'Nornickel — Kola site and toll refining',url:'https://nornickel.com/business/assets/kola-division-russia/',period:'2024年の操業説明・2026-10確認',method:'コラはNi精製拠点。貴金属の最終精製はKrastsvetmet等への委託であり、コラのNi精製と混同しない。'},
 krastsvetmet:{title:'Krastsvetmet — production in Krasnoyarsk',url:'https://www.krastsvetmet.ru/about-us/contacts/',period:'2026-10確認',method:'クラスノヤルスクの生産拠点と事務所。モスクワの事務所と区別。'},
 niMarket:{title:'Nornickel 2025 — commodity markets',url:'https://ar2025.nornickel.com/strategic-report/commodity-markets/',period:'2025年',method:'企業の世界市場推計。一次ニッケル全体と高純度ニッケルは別市場。'},
 polyus:{title:'Polyus — 2025 production and financial results',url:'https://www.polyus.com/en/media/press-releases/proizvodstvennye-i-finansovye-rezultaty-za-2-polugodie-2025-i-2025-god/',period:'2025年',method:'Polyus社の生産・売上高。全国の金生産・鉱業付加価値ではない。'},
 polyusSites:{title:'Polyus — operating assets',url:'https://www.polyus.com/en/',period:'2025年実績',method:'操業鉱山の所在州を確認。州都の案内点は鉱山の敷地ではない。Sukhoi Log開発案件を操業鉱山に含めない。'},
 rusal:{title:'RUSAL — consolidated financial statements 2025',url:'https://rusal.ru/upload/iblock/cb5/0rza8mew6avlvb9z4l90la23ebcnko1c/RUSAL_Consolidated-Financial-Statements-for-12m2025_ENG.pdf',period:'2025年・注記5',method:'海外拠点を含むグループ。一次アルミ・合金の売上を使用し、連結売上全体と区別。'},
 rusalSites:{title:'RUSAL — geography',url:'https://rusal.ru/en/about/geography/',period:'2026-10確認',method:'操業拠点の都市。点は工場の敷地を示さない。'},
 hydro:{title:'RUSAL — Boguchany energy and metals complex',url:'https://rusal.ru/en/innovation/development/bemo/',period:'2026-10確認',method:'水力発電と製錬の一体的整備を説明。全国の電源構成をこの一例から推計しない。'},
 steel:{title:'worldsteel — World Steel in Figures 2026',url:'https://worldsteel.org/data/world-steel-in-figures/world-steel-in-figures-2026/',period:'2025年',method:'粗鋼生産は推計。半製品・完成鋼材の輸出重量は粗鋼生産と別段階。EU27集合と構成国を二重に順位付けしない。'},
 severstal:{title:'Severstal — Cherepovets steel mill',url:'https://severstal.com/eng/about/structure/businesses/cherepovetskiy-metallurgicheskiy-kombinat/',period:'現行設備紹介',method:'操業拠点・製鋼工程。設備能力を年間実績へ読み替えない。'},
 nlmk:{title:'NLMK — questions and answers',url:'https://www.nlmk.com/en/media-center/questions-and-answers/',period:'現行設備紹介',method:'リペツク製鉄とストイレンスキー鉄鉱石の関係。'},
 rapu:{title:'Russian Fertilizer Producers Association — analytics',url:'https://www.rapu.ru/analitics/',period:'2025年・2024年',method:'アンモニア、塩化カリは製品重量。2022年以降の輸出は業界の専門家推計で直接税関報告と区別。'},
 nitrogenSites:{title:'RAPU — nitrogen fertilizer production map',url:'https://rapu.ru/nitrogen-fertilizer-production/map/',period:'現行拠点紹介',method:'窒素肥料の操業都市。地図上の都市点は設備の正確な位置ではない。'},
 potashSites:{title:'Uralchem — Uralkali assets',url:'https://www.uralchem.ru/about/assets/28109/',period:'現行拠点紹介',method:'上カマ鉱床、ベレズニキ・ソリカムスクの採掘・加工集積。'},
 phosagro:{title:'PhosAgro 2025 — operational performance',url:'https://ar2025.phosagro.com/en/perfomance-review/operational-performance/',period:'2025年',method:'会社のDAP/MAP製品量。りん含有量やロシア全国生産量ではない。'},
 phosphateMarket:{title:'PhosAgro 2025 — market overview',url:'https://ar2025.phosagro.com/en/strategic-report/market-overview/',period:'2025年',method:'世界DAP/MAP製品量は会社の市場推計。国のシェアではなく同社の下限的規模として表示。'},
 enrichment:{title:'World Nuclear Association — uranium enrichment',url:'https://world-nuclear.org/information-library/nuclear-fuel-cycle/conversion-enrichment-and-fabrication/uranium-enrichment',period:'2025年能力・2026-09-29更新',method:'SWUは分離作業単位。年能力であり実際の生産や売上ではない。Rosatomのロシア4工場。'},
 usSwu:{title:'EIA — Uranium Marketing Annual Report, table 16',url:'https://www.eia.gov/uranium/marketing/table16.php',period:'2025年・2026年改訂',method:'米国原発事業者の購入濃縮役務。供給元別SWU。W（秘匿）は0ではない。'},
 ports:{title:'ASOP — Russian seaport cargo turnover 2025',url:'https://www.morport.com/rus/news/gruzooborot-morskih-portov-rossii-za-2025-god',period:'2025年・2026-01-16公表',method:'港湾協会のロシア港湾集計。輸出・輸入・通過・内航を含む取扱量。国産品の輸出量やGDPではない。地理範囲は同協会の報告範囲。'},
 alrosa:{title:'ALROSA — IFRS statements 2025',url:'https://www.alrosa.ru/upload/iblock/716/4qtpyyo2q8ggbhcpysfxhauxoolmzuww/ALROSA%20IFRS%202025%20ENG%20with%20exception.pdf',period:'2025年',method:'連結売上には他事業を含む。ダイヤモンド単独の売上内訳は秘匿。注記1の操業地域を使用。'},
 wheat:{title:'USDA — WASDE October 2026',url:'https://www.usda.gov/oce/commodity/wasde/wasde1026.txt',period:'2025/26年度推計・2026-10-09公表',method:'USDAの年度需給推計。2026/27予測と混在させない。生産と輸出は在庫変動等があるため差引で国内使用にしない。'},
 wheatTerritory:{title:'USDA FAS — Russia grain and oilseed exports',url:'https://fas.usda.gov/data/russia-grain-and-oilseed-exports-expand',period:'USDA集計領域の説明',method:'USDAロシア統計はクリミア等を含めない。国境背景の描写とは別の集計領域。'},
 kamaz:{title:'KAMAZ — general information',url:'https://kamaz.ru/en/about/general-information/',period:'現行会社紹介',method:'鋳造・鍛造・エンジン・車両組立。最新の全国製造規模は未取得。'},
 management:{title:'Nornickel — head office geography',url:'https://ar2024.nornickel.com/en/about-company/geography.html',period:'2024年末',method:'モスクワの本社機能。採鉱・精錬場所として扱わない。'},
 fesco:{title:'FESCO 2025 — operations overview',url:'https://ar2025.fesco.com/strategic-report/operations-overview',period:'2025年',method:'港・鉄道・倉庫の物流機能。本社の管理機能と区別。'},
 japanLng:{title:'UN Comtrade / WITS — Japan LNG imports, HS 271111',url:'https://wits.worldbank.org/trade/comtrade/en/country/JPN/year/2024/tradeflow/Imports/partner/ALL/product/271111',period:'2024年',method:'日本が報告した輸入。ロシア原産5,683,620,000 kg／全輸入65,890,700,000 kg。ロシアの直接輸出報告・FOB輸出収入ではない。'},
 usPd:{title:'UN Comtrade / WITS — US palladium imports, HS 711021',url:'https://wits.worldbank.org/trade/comtrade/en/country/USA/year/2024/tradeflow/Imports/partner/ALL/product/711021',period:'2024年',method:'米国が報告した未加工・粉状パラジウム輸入。ロシア27,599 kg／全輸入63,900 kg。採掘量と別段階。'},
 chinaNi:{title:'UN Comtrade / WITS — China nickel imports, HS 750210',url:'https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2024/tradeflow/Imports/partner/ALL/product/750210',period:'2024年',method:'中国が報告した非合金・塊状ニッケル輸入。ロシア46,290,500 kg／全輸入97,260,900 kg。全ニッケル輸入ではない。'},
 chinaCu:{title:'UN Comtrade / WITS — China copper cathode imports, HS 740311',url:'https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2024/tradeflow/Imports/partner/ALL/product/740311',period:'2024年',method:'中国が報告した精製銅カソード輸入。ロシア230,113,000 kg／全輸入3,753,280,000 kg。精鉱の輸入ではない。'},
 ne:{title:'Natural Earth — populated places v5.1.2',url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson',period:'固定版v5.1.2',method:'Public domain。都市の案内座標。鉱床・工場敷地・港区域の境界を表さない。'},
 ghsl:{title:'JRC — GHS Urban Centre Database R2024A V1.2',url:'https://data.jrc.ec.europa.eu/dataset/1a338be6-7eaf-480c-9664-3a8ade88cbcd',period:'都市境界2025年',method:'既存ロシア人口データの都市重心。工場・鉱山そのものの座標ではない。'},
};
export type RuMetric = {label:string;value:string;period:string;scope:string;note:string;source:string};
export type RuIndustry = {id:string;name:string;short:string;color:string;sectors:RuSector[];reading:string;why:string;chain:string;metrics:RuMetric[];missing:string;sourceIds:string[]};
const m=(label:string,value:string,period:string,scope:string,note:string,source:string):RuMetric=>({label,value,period,scope,note,source});
export const ruIndustries:RuIndustry[]=[
 {id:'oil',name:'石油・石油精製',short:'石油・精製',color:'#9b5731',sectors:['resources','manufacturing'],reading:'西シベリアのスルグト周辺に原油産地が広がり、オムスクなど内陸の製油所と黒海・バルト海の積出港に加工・輸送機能が分かれる。',why:'西シベリア堆積盆地の油田と既設のパイプラインが産地を結び、製油所は幹線輸送と内陸の燃料需要を支える。',chain:'採掘 → 原油輸送 → 精製 → 燃料・石油化学原料。個別油田から各製油所への納入量は未取得。',metrics:[m('全国の原油生産','日量920万バレル','2024年','原油・コンデンセートを除く','全液体燃料や原油＋コンデンセートと別定義。','eia'),m('全国の実際の精製処理','日量540万バレル','2024年','製油所処理実績','オムスクの2025年能力は日量44万バレル。能力と処理実績を加算しない。','eia'),m('世界の原油・コンデンセート生産','12.3%・第2位','2024年','世界の同じ製品段階の生産量','原油のみの920万バレルとは分母・製品段階が異なる。','usgs'),m('原油・コンデンセート輸出','日量480万バレル','2024年','ロシア輸出・EIA推計','中国日量220万、インド170万。アジア・オセアニア向け81%（2020年41%）。直接税関報告ではない。','oilTrade')],missing:'品目に一致するGDP・雇用と、2025年通年の相手国別統一系列は未取得。',sourceIds:['usgs','eia','oilTrade']},
 {id:'gas',name:'天然ガス・液化天然ガス（LNG）',short:'天然ガス・LNG',color:'#22668b',sectors:['resources','manufacturing'],reading:'ヤマロ・ネネツのガス田と北極海岸の液化設備、極東サハリンのLNGが、欧州向け配管とアジア向け船輸送の異なる供給経路をつくる。',why:'西シベリア北部の巨大ガス資源を基盤に配管と液化設備が整備され、東方への振替は鉄道と同様に既存の輸送能力に制約される。',chain:'ガス田 → 処理 → 配管、または液化 → LNG船。液化能力・船積量・乾性ガス生産は別指標。',metrics:[m('全国の乾性天然ガス生産','23.2兆ft³','2024年・暫定','ロシアの乾性ガス','乾性ガスの実績。下記USGSの天然ガス世界系列とは定義を区別。','eia'),m('世界の天然ガス生産','15.3%・第2位','2024年','世界天然ガス生産','USGS掲載の2024年系列。EIAの乾性ガス量と分母・系列を区別。','usgs'),m('全国LNG輸出','1.6兆ft³','2024年','LNGを気体体積に換算','北極圏港から63%。配管ガスを含めない。','eia'),m('日本のLNG輸入に占めるロシア','8.6%','2024年','日本の全LNG輸入65,890,700,000 kg','ロシア5,683,620,000 kg。日本の直接輸入報告に基づく相手国側統計。輸入額36.20億USD。','japanLng'),m('EUのロシア産ガス輸入','日量44億ft³','2024年','EU向け・配管＋LNG','2020年147億ft³/日から縮小。数量と売上を混同しない。','gasTrade')],missing:'ガスだけのGDP・雇用、全輸出を一貫した定義で結ぶ最新需給表は未取得。',sourceIds:['eia','usgs','japanLng','gasTrade']},
 {id:'coal',name:'石炭（一般炭・原料炭）',short:'石炭',color:'#555551',sectors:['resources'],reading:'クズバスを中心とする西シベリアの炭鉱が国内産出の過半を担い、極東港へ向かう長距離鉄道がアジア市場への出口を制約する。',why:'厚い炭層と採掘設備がクズバスに集積し、産地と港の距離が長いため鉄道の輸送枠が輸出競争力を左右する。',chain:'一般炭は発電・熱、原料炭はコークスを経て製鉄へ。品種別用途を合算して脱炭素リスクを判断しない。',metrics:[m('全国の採炭産出額','218億USD','2024年','石炭採掘の産出額','付加価値・GDP・輸出額ではない。','usgs'),m('世界の石炭輸出','14%・第3位','2023年','世界石炭輸出重量','ロシア2.33億short ton。1 short ton=約907 kg。2024年へ年をずらさない。','eia'),m('原料炭の輸出','4,000万short ton','2024年','ロシア原料炭','ロシア石炭輸出重量の17%。一般炭を含む世界シェアとは別の年・区分。','eia')],missing:'品種別の最新国内使用・地域別産出額は未取得。',sourceIds:['usgs','eia','gasTrade']},
 {id:'palladium',name:'パラジウム',short:'パラジウム',color:'#794b87',sectors:['resources','manufacturing'],reading:'ノリリスク・タルナフでパラジウムが銅・ニッケルと併産され、クラスノヤルスクのKrastsvetmet等への委託精製を経て自動車触媒向けに供給される。',why:'パラジウムは銅・ニッケルの併産物であるため、価格上昇に対してパラジウムだけの増産をすぐに行いにくい。',chain:'硫化鉱 → 選鉱・製錬 → 貴金属精製 → 主に排ガス浄化触媒。白金との代替と電動化の影響を別に考える。',metrics:[m('全国の鉱山生産','89,000 kg','2024年・推計','含有パラジウム','精製85,908 kgは別段階。足し合わせない。','usgs'),m('世界の鉱山生産','41%・第1位','2024年','世界パラジウム鉱山生産','少数地域への供給集中を示す。','usgs'),m('米国の該当品目輸入に占めるロシア','43.2%','2024年','HS 711021 未加工・粉状Pd、全輸入63,900 kg','ロシア27,599 kg・輸入額8.778億USD。米国側報告。鉱山生産とは別段階。','usPd')],missing:'パラジウム単独の全国付加価値・雇用・企業売上は未取得。',sourceIds:['usgs','nornickel','kola','krastsvetmet','usPd']},
 {id:'nickel',name:'ニッケル',short:'ニッケル',color:'#4e7250',sectors:['resources','manufacturing'],reading:'ノリリスクでの硫化鉱採掘とコラ半島の精錬が結び付き、高純度ニッケルの供給拠点を形成する。',why:'既存の硫化鉱・精錬網が強みだが、世界一次ニッケル供給の66%を占めるインドネシアの増産と競合する。',chain:'含有精鉱 → 製錬・精製 → ステンレス・合金・電池材料。すべてのニッケルがそのまま電池に使えるわけではない。',metrics:[m('全国の販売可能精鉱中Ni','205,000 t','2024年','硫化物精鉱のNi含有量','精製ニッケル145,209 tとは別段階。','usgs'),m('世界の鉱山生産','5.5%・第3位','2024年','世界のNi含有量','高純度市場と一次ニッケル市場の順位を混同しない。','usgs'),m('中国の該当品目輸入に占めるロシア','47.6%','2024年','HS 750210 非合金塊、全輸入97,260,900 kg','ロシア46,290,500 kg・輸入額7.879億USD。中国側報告。','chinaNi'),m('世界一次ニッケル需要','362万t','2025年・企業推計','世界の一次Ni需要','65%はステンレス向け、電池向け50万t。電池だけで重要性を説明しない。','niMarket')],missing:'ロシア産だけの高純度Ni売上は未取得。Nornickel連結生産はフィンランド精製を含む。',sourceIds:['usgs','nornickel','niMarket','chinaNi']},
 {id:'copper',name:'銅（精鉱・精製銅）',short:'銅',color:'#b65d36',sectors:['resources','manufacturing'],reading:'ノリリスクの併産銅、ウラルの鉱山・製錬所、ザバイカルの新旧鉱床が離れて分布し、精鉱と精製銅の供給網を形成する。',why:'硫化鉱床への近接とウラルの蓄積した製錬基盤が集積を支え、遠隔地の鉱床開発には電力・鉄道が必要になる。',chain:'銅含有鉱石 → 精鉱 → 粗銅 → 精製銅。電力網・電動化向け需要を、各段階の重量を加算して示さない。',metrics:[m('全国の精鉱中銅','102万t','2024年・推計','精鉱のCu含有量','鉱石中Cu 127万tとは別段階。','usgs'),m('世界鉱山生産／精製生産','4.4%／3.2%','2024年','世界の各段階、鉱山第6位・精製第6位','全国精製銅89.5万t。一次・二次を含む。','usgs'),m('中国のカソード輸入に占めるロシア','6.1%','2024年','HS 740311、全輸入3,753,280,000 kg','ロシア230,113,000 kg・輸入額21.13億USD。中国側報告。精鉱を含まない。','chinaCu')],missing:'鉱山・精鉱・精製を一貫して結ぶ全国の国内使用量は未取得。',sourceIds:['usgs','nornickel','chinaCu']},
 {id:'gold',name:'金',short:'金',color:'#a07812',sectors:['resources'],reading:'クラスノヤルスク地方、イルクーツク州、サハ共和国、マガダン州に金鉱業が分散し、大規模露天掘りと遠隔地の処理設備が結び付く。',why:'地質的な金鉱床の分布が産地を決め、電力・道路や自前の処理設備を備える企業が遠隔地の鉱石を製品にする。',chain:'採鉱 → 選鉱・浸出 → 金地金。操業中の鉱山と開発中のSukhoi Logを区別。',metrics:[m('全国の金生産','315,000 kg','2024年','鉱山生産','Polyus社の実績と年・対象が異なる。','usgs'),m('世界鉱山生産','9.5%・第2位','2024年','世界の金鉱山生産','金融資産・外貨獲得の規模を支える。','usgs'),m('Polyusの金生産／売上','252.88万oz／87.23億USD','2025年','企業全体の実績','1 troy oz=31.1035 g。Olimpiada 92.6万oz、Blagodatnoye 43.4万ozなど。同年の全国比は未取得。','polyus')],missing:'金単独の全国GDP・雇用、最新全国量と同年の企業シェアは未取得。',sourceIds:['usgs','polyus','polyusSites']},
 {id:'aluminum',name:'一次アルミニウム',short:'一次アルミ',color:'#497c91',sectors:['manufacturing'],reading:'クラスノヤルスク、ブラーツク、サヤノゴルスク、タイシェトに大型製錬所が集まり、シベリアの水力発電と電力多消費の電解製錬が結び付く。',why:'アルミナを電気分解する工程は大量の電力を要し、河川の水力と大型製錬設備の組合せがシベリアで発達した。',chain:'ボーキサイト → アルミナ → 一次アルミ → 合金・圧延。ロシアでの製錬量と海外を含む原料調達・企業売上は別。',metrics:[m('全国の一次アルミ生産','388.4万t','2024年','一次金属','再生アルミや圧延品を含まない。','usgs'),m('世界一次アルミ生産','5.3%・第3位','2024年','世界の一次アルミ','水力を背景とした供給だが、個別製品の排出原単位は未取得。','usgs'),m('RUSAL 一次アルミ・合金売上','119.09億USD','2025年','海外拠点を含む連結事業','連結総売上148.12億USDと別。国の輸出額・GDPではない。','rusal')],missing:'製錬地域別の実際の生産量、品目別全国GDP・雇用は未取得。',sourceIds:['usgs','rusal','rusalSites','hydro']},
 {id:'steel',name:'鉄鋼',short:'鉄鋼',color:'#596887',sectors:['manufacturing'],reading:'チェレポヴェツとリペツクに高炉・製鋼の大型拠点があり、鉄鉱石・石炭の調達網と国内外の鋼材需要を結ぶ。',why:'鉄鉱石・コークス・電力・鉄道をまとめる一貫製鉄の設備蓄積が立地を固定し、リペツクではストイレンスキー鉄鉱石が原料基盤になる。',chain:'鉄鉱石＋コークス → 銑鉄 → 粗鋼 → 半製品・鋼材。粗鋼量と輸出鋼材重量は別段階。',metrics:[m('全国の粗鋼生産','6,790万t','2025年・推計','粗鋼','2024年ではなく最新2025年系列。','steel'),m('世界粗鋼生産','3.7%・国別第5位','2025年','世界18億4,890万t','EU27集合を1国として構成国と重複計上しない。','steel'),m('半製品・完成鋼材の輸出','1,520万t','2025年','ロシアの鋼材輸出','粗鋼生産から引いて国内使用を求めない。','steel')],missing:'最新の全国鉄鋼GDP・雇用、同年の工場別実生産は未取得。',sourceIds:['steel','severstal','nlmk']},
 {id:'nitrogen',name:'窒素肥料・アンモニア',short:'窒素肥料',color:'#58863a',sectors:['manufacturing'],reading:'トリヤッチ、チェレポヴェツ、サラヴァトなどに窒素肥料設備が分布し、天然ガス供給と化学工業基盤が立地を支える。',why:'アンモニアは天然ガスから水素を得る製法が中心で、ガスの安定調達と大型連続設備が肥料の費用構造を左右する。',chain:'天然ガス → 水素・アンモニア → 尿素等の窒素肥料。アンモニア製品tと窒素含有tを区別。',metrics:[m('全国アンモニア製品量','1,860万t','2025年','製品重量・業界集計','2024年は1,810万t。窒素含有量ではない。','rapu'),m('全国アンモニア中の窒素','1,490.3万t N','2024年','窒素含有量','世界の同じ含有量の9.6%・インドと並び第2位。2025年製品tと直結しない。','usgs')],missing:'窒素肥料だけの付加価値・雇用と直接報告による最新品目別輸出は未取得。',sourceIds:['rapu','usgs','nitrogenSites']},
 {id:'potash',name:'カリ鉱業・カリ肥料',short:'カリ肥料',color:'#986a48',sectors:['resources','manufacturing'],reading:'ペルミ地方の上カマ鉱床に沿うベレズニキとソリカムスクに採掘・加工が集まり、鉱床への近接がカリ肥料の供給を集中させる。',why:'採掘可能なカリ塩鉱床の地理的偏在が、窒素肥料とは異なる供給集中と調達リスクを生む。',chain:'地下のカリ塩 → 採掘・選鉱 → 塩化カリ肥料。製品tとK₂O換算tは別。',metrics:[m('全国塩化カリ製品量','1,790万t','2025年','KCl製品重量・業界集計','2024年1,690万t。K₂O量ではない。','rapu'),m('全国カリ生産','1,000万t K₂O','2024年','酸化カリ換算の含有量','世界同定義の21%・第2位。製品重量と足し合わせない。','usgs')],missing:'カリ単独のGDP・雇用、最新輸出実績の直接報告値は未取得。',sourceIds:['rapu','usgs','potashSites']},
 {id:'phosphate',name:'りん鉱業・りん酸肥料',short:'りん酸肥料',color:'#7b8350',sectors:['resources','manufacturing'],reading:'コラ半島ヒビヌイのアパタイト鉱床と、チェレポヴェツ・ヴォルホフ・バラコヴォの加工拠点が、原料採掘と肥料製造の分業を形成する。',why:'りんを含む鉱石の産地と化学反応・複合肥料の設備が離れ、原料輸送と既存化学工業が加工拠点を支える。',chain:'アパタイト精鉱 → りん酸 → りん安・複合肥料。DAP/MAPはりん酸二安／一安、製品重量。',metrics:[m('全国アパタイト精鉱','1,530万t','2025年','精鉱製品重量・業界集計','りん含有量・りん鉱石重量と別。','rapu'),m('PhosAgro DAP/MAP生産','456.77万t','2025年','会社のりん安製品重量','世界DAP/MAP 6,500万tという同社推計の7.0%。ロシア全国シェアではない。','phosagro'),m('世界DAP/MAP市場','6,500万t','2025年・企業推計','世界の同じ肥料製品重量','国のりん鉱石生産順位と混同しない。','phosphateMarket')],missing:'りん酸肥料だけの全国売上・GDP・雇用は未取得。複合肥料全体の値を転用しない。',sourceIds:['rapu','phosagro','phosphateMarket']},
 {id:'enrichment',name:'ウラン濃縮・核燃料役務',short:'ウラン濃縮',color:'#766b29',sectors:['manufacturing','services'],reading:'ノヴォウラリスク、ゼレノゴルスク、アンガルスク、セヴェルスクの4工場に濃縮能力が集まり、遠心分離設備の蓄積が原発燃料の国際調達を左右する。',why:'濃縮は鉱石産地よりも高度な分離設備・技能と長期契約に依存し、原発の燃料仕様と調達先変更には時間がかかる。',chain:'天然ウランの転換 → 濃縮役務 → 再転換・燃料加工。SWU（分離作業単位）はウランの重量ではない。',metrics:[m('Rosatom ロシア濃縮能力','2,913.3万SWU/年','2025年','ロシア4工場の年能力','実際の濃縮量・ウラン鉱石生産・売上とは別。','enrichment'),m('世界の濃縮設備能力','42.8%','2025年','世界6,807.6万SWU/年','同じ年能力の比。世界実生産シェアではない。','enrichment'),m('米国購入濃縮役務のロシア分','25.8%','2025年','米国事業者の購入1,271万SWU','ロシア328.4万SWU。秘匿Wは0にしない。','usSwu')],missing:'最新の実際の全国役務生産・売上・雇用は未取得。ゼレノゴルスクは位置未収録で地図点を補わない。',sourceIds:['enrichment','usSwu']},
 {id:'logistics',name:'鉄道・港湾・国際物流',short:'鉄道・港湾物流',color:'#386d82',sectors:['services'],reading:'黒海ノヴォロシースク、バルト海、北極海ムルマンスク、極東のヴォストーチヌイ・ヴァニノ・ウラジオストクが異なる海域への出口を担い、東方港への内陸輸送は鉄道容量に制約される。',why:'西シベリアの資源と海港の距離が大きく、既設の東西幹線と港湾設備が荷主の航路選択と輸送費を左右する。',chain:'サービスは貨物を運ぶ機能。生産−輸出＝国内使用の物品需給式を当てはめない。線のない地図から実際の個別航路を推定しない。',metrics:[m('ロシア港湾総取扱量','8億8,450万t','2025年','ASOPのロシア港湾範囲','輸出6億9,660万、輸入4,120万、通過7,150万、内航7,520万t。総量と輸出を区別。','ports'),m('上位3港の総取扱量比','43.3%','2025年','全国港湾総量8億8,450万t','ノヴォロシースク1億6,800万、ウスチルガ1億3,050万、ヴォストーチヌイ8,470万t。','ports'),m('極東の港の取扱実績','ヴァニノ4,210万t','2025年','全貨物取扱量','ウラジオストク4,160万t。コンテナ個数やロシア国産品の輸出量ではない。','ports')],missing:'貨物輸送だけの最新全国GDP・雇用・国際比較順位は未取得。鉄道会社連結売上を貨物役務へ転用しない。',sourceIds:['ports','eia','gasTrade']},
 {id:'diamond',name:'天然ダイヤモンド',short:'天然ダイヤ',color:'#965a88',sectors:['resources'],reading:'サハ共和国のミールヌイ・ウダーチヌイ周辺とアルハンゲリスク州に天然ダイヤの採掘が分布し、キンバーライト鉱床が立地を決める。',why:'宝飾用の評価と原産地追跡が販売を左右し、天然石は合成ダイヤの供給とは別の鉱床・流通基盤に依存する。',chain:'採掘 → 選別 → 原石取引 → 研磨・宝飾。天然宝飾用・天然工業用・合成品を分ける。',metrics:[m('全国の天然宝飾用生産','2,090万carat','2024年','天然・宝飾用','世界同分類の30%・第1位。1 carat=0.2 g。','usgs'),m('全国の天然工業用生産','1,640万carat','2024年','天然・工業用','世界同分類の42%・第1位。合成品を含む工業用全市場の42%ではない。','usgs'),m('ALROSA連結売上','2,350.89億RUB','2025年','他事業を含む企業連結','ダイヤ単独売上内訳は秘匿。全国輸出額として使わない。','alrosa')],missing:'制裁後の天然原石の全国輸出相手別直接報告と、ダイヤ単独売上は未取得／秘匿。',sourceIds:['usgs','alrosa']},
 {id:'helium',name:'ヘリウム',short:'ヘリウム',color:'#548586',sectors:['resources','manufacturing'],reading:'オレンブルクとアムール州スヴォボードヌイ周辺のガス処理がヘリウム供給を担い、天然ガス中の成分を回収する設備が立地を決める。',why:'低濃度のヘリウムをガスから分離するため、資源組成と大規模ガス処理設備が必要で、MRIや半導体向けの供給を短期に代替しにくい。',chain:'ヘリウムを含む天然ガス → ガス処理・分離 → 精製・液化。ガス田の埋蔵量や設計能力を実生産にしない。',metrics:[m('全国ヘリウム生産','1,530万m³','2024年','生産されたヘリウムの気体体積','前年比97%増。アムール設備の全設計能力ではない。','usgs'),m('世界の生産','9.3%・第3位','2024年','世界の同じヘリウム生産体積','天然ガスの世界シェアとは別の市場。','usgs')],missing:'2025年通年の全国実生産、ヘリウムだけの売上・GDP・雇用は未取得。',sourceIds:['usgs']},
 {id:'wheat',name:'小麦（農業・港湾との接続）',short:'小麦',color:'#9a7b25',sectors:['resources'],reading:'ロストフ・クラスノダール・スタヴロポリの南部冬小麦地帯が黒海の穀物輸出と結び付き、シベリアの春小麦地帯とは気候条件が異なる。',why:'南部の肥沃な土壌と温暖な栽培期間、黒海港への近さが大量輸出を支え、肥料供給と物流の変化が食料安全保障へ波及する。',chain:'小麦の一次生産は農林業分野と重複掲載。製粉工場の位置は未収録。港湾の穀物取扱量を小麦生産と同一視しない。',metrics:[m('全国の小麦生産','9,030万t','2025/26年度・推計','USDA集計領域','世界8億4,406万tの10.7%。クリミア等を含めない。','wheat'),m('全国の小麦輸出','4,800万t','2025/26年度・推計','USDA年度の輸出重量','世界2億2,691万tの21.2%。暦年貿易統計とは別。','wheat')],missing:'2026/27予測と混在させない。産業地図の点は新たな収量データではなく、既存農業分布への案内。',sourceIds:['wheat','wheatTerritory']},
 {id:'trucks',name:'トラック・車両製造',short:'トラック製造',color:'#806350',sectors:['manufacturing'],reading:'ナーベレジヌイェ・チェルヌイにKAMAZの鋳造・鍛造・エンジン・車両組立が集まり、部品から完成車までの設備集積を形成する。',why:'一貫した設備・技能・部品調達網の蓄積が立地を支え、金属や燃料の輸出とは異なる製品製造の例になる。',chain:'鋳鍛造 → エンジン・部品 → 車両組立。1社の工場をロシア製造業全体の代表値にしない。',metrics:[],missing:'最新の車種別全国生産・輸出・雇用・世界シェアは未取得。既存の操業集積例として保持。',sourceIds:['kamaz']},
 {id:'management',name:'企業管理・都市物流',short:'企業管理',color:'#6e587a',sectors:['services'],reading:'モスクワには資源企業の本社管理と都市向け物流が集まり、遠隔地の採掘・精錬とは異なる人・情報・意思決定の機能を担う。',why:'大都市の専門人材・金融・顧客への近接が管理機能を支え、資源の物理的な産地と企業の所在地を分ける必要がある。',chain:'本社所在地を鉱山・工場・物品生産量へ置換しない。管理サービスへ物品需給式を当てはめない。',metrics:[],missing:'管理機能だけのGDP・雇用と国際比較量は未取得。資源企業の連結売上をモスクワの生産額として計上しない。',sourceIds:['management','fesco']},
];
export const ruSectors:{id:RuSector;name:string;reading:string;why:string}[]=[
 {id:'resources',name:'資源・エネルギー',reading:'西シベリアの石油・ガスとクズバスの石炭、ノリリスクの併産金属、東シベリア・極東の金や天然ダイヤが、地質と長距離輸送に沿って分布する。',why:'鉱床が採掘の場所を固定し、鉄道・配管・港湾と加工設備が市場への届き方を決める。南部の小麦は肥料と黒海物流を通して資源産業と接続する。'},
 {id:'manufacturing',name:'製造業',reading:'欧露部の鉄鋼・肥料、シベリアの水力を使うアルミ製錬、ガス処理・石油精製と核燃料設備が、原料・電力・蓄積した技能を加工価値へ変える。',why:'素材産業は原料だけでなく安定した電力と大型連続設備に依存し、燃料・金属・肥料・車両で異なる供給網を形成する。'},
 {id:'services',name:'サービス業',reading:'モスクワの企業管理、黒海・バルト海・北極海・極東の港湾、4都市の核燃料濃縮役務が、都市の専門機能と既存設備に集中する。',why:'管理には人・情報、物流には港湾と鉄道、濃縮役務には特殊設備が必要で、物品の産地と役務の集積は一致しない。'},
];
export type RuSite={id:string;place:string;coordinates:[number,number];positionSource:'ne'|'ghsl';positionName:string;industries:string[];sectors:RuSector[];stage:string;note:string;sourceIds:string[]};

export const ruSites:RuSite[]=[
 {
  "id": "west-siberia-oil",
  "place": "西シベリア（スルグト）",
  "coordinates": [
   73.40930335137601,
   61.26122515424017
  ],
  "positionSource": "ghsl",
  "positionName": "Surgut",
  "industries": [
   "oil"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "原油採掘地域",
  "note": "油田地帯の都市案内点。個別油井や鉱区の位置・生産比率ではない。",
  "sourceIds": [
   "eia"
  ]
 },
 {
  "id": "yamal-nenets-gas",
  "place": "ヤマロ・ネネツ（ノヴィ・ウレンゴイ）",
  "coordinates": [
   76.64591544271059,
   66.08227716323414
  ],
  "positionSource": "ghsl",
  "positionName": "Novy Urengoy",
  "industries": [
   "gas"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "天然ガス採取地域",
  "note": "ガス田・北極圏LNG設備を含む地域の案内点。液化工場の敷地ではない。",
  "sourceIds": [
   "eia"
  ]
 },
 {
  "id": "kuzbass-coal",
  "place": "クズバス（ケメロヴォ）",
  "coordinates": [
   86.09740575955443,
   55.3523801586561
  ],
  "positionSource": "ghsl",
  "positionName": "Kemerovo",
  "industries": [
   "coal"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "石炭採掘地域",
  "note": "西シベリアの採炭集積を案内。市内の採掘量ではない。",
  "sourceIds": [
   "eia",
   "usgs"
  ]
 },
 {
  "id": "norilsk-resource-region",
  "place": "ノリリスク・タルナフ",
  "coordinates": [
   88.224992,
   69.340017
  ],
  "positionSource": "ne",
  "positionName": "Norilsk",
  "industries": [
   "palladium",
   "nickel",
   "copper"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "採鉱・選鉱・製錬",
  "note": "同じ硫化鉱床からの併産金属。3品目の重量をまとめて鉱山規模にしない。 貴金属の最終地金精製は委託先の別工程。",
  "sourceIds": [
   "nornickel",
   "usgs"
  ]
 },
 {
  "id": "kola-refining",
  "place": "コラ半島（モンチェゴルスク）",
  "coordinates": [
   32.828735,
   67.929121
  ],
  "positionSource": "ne",
  "positionName": "Monchegorsk",
  "industries": [
   "nickel"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "ニッケル精製",
  "note": "コラはニッケル精製拠点。貴金属の最終精製はKrastsvetmet等への委託であり、ここをPd地金精製工場としない。",
  "sourceIds": [
   "nornickel",
   "kola"
  ]
 },
 {
  "id": "ural-copper",
  "place": "ウラル（チェリャビンスク）",
  "coordinates": [
   61.39971804757956,
   55.15751426842105
  ],
  "positionSource": "ghsl",
  "positionName": "Chelyabinsk",
  "industries": [
   "copper"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "鉱業・製錬地域",
  "note": "チェリャビンスク・オレンブルク・スヴェルドロフスク等に分布する地域集積の案内点。市の生産量ではない。",
  "sourceIds": [
   "usgs"
  ]
 },
 {
  "id": "transbaikal-copper",
  "place": "ザバイカル（州都チタを案内位置）",
  "coordinates": [
   113.48912053947502,
   52.03855384016583
  ],
  "positionSource": "ghsl",
  "positionName": "Chita",
  "industries": [
   "copper"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "銅鉱業地域",
  "note": "Bystrinsky・Udokan等を含む州の案内点。チタに両鉱山があるという意味ではない。",
  "sourceIds": [
   "usgs",
   "nornickel"
  ]
 },
 {
  "id": "krasnoyarsk-gold",
  "place": "クラスノヤルスク地方（金）",
  "coordinates": [
   92.86697534647236,
   56.03574359626852
  ],
  "positionSource": "ghsl",
  "positionName": "Krasnoyarsk",
  "industries": [
   "gold"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "金鉱業地域",
  "note": "州都の案内位置。Olimpiada・Blagodatnoye鉱山の敷地ではない。両鉱山2025年生産92.6万／43.4万oz（Polyus）。",
  "sourceIds": [
   "polyus",
   "polyusSites"
  ]
 },
 {
  "id": "irkutsk-gold",
  "place": "イルクーツク州（ボダイボ周辺）",
  "coordinates": [
   114.193242,
   57.850748
  ],
  "positionSource": "ne",
  "positionName": "Bodaybo",
  "industries": [
   "gold"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "金鉱業地域",
  "note": "Verninskoye等の鉱業地域の都市案内点。Verninskoye 2025年27.17万oz。",
  "sourceIds": [
   "polyus",
   "polyusSites"
  ]
 },
 {
  "id": "sakha-gold",
  "place": "サハ共和国（アルダン周辺）",
  "coordinates": [
   125.38939,
   58.602998
  ],
  "positionSource": "ne",
  "positionName": "Aldan",
  "industries": [
   "gold"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "金鉱業地域",
  "note": "Kuranakh操業地域の案内点。2025年32.97万oz。",
  "sourceIds": [
   "polyus",
   "polyusSites"
  ]
 },
 {
  "id": "magadan-gold",
  "place": "マガダン州（金）",
  "coordinates": [
   150.80901914177326,
   59.56039670645614
  ],
  "positionSource": "ghsl",
  "positionName": "Magadan",
  "industries": [
   "gold"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "金鉱業地域",
  "note": "州都の案内点。Natalka鉱山の敷地ではない。同鉱山2025年56.74万oz。",
  "sourceIds": [
   "polyus",
   "polyusSites"
  ]
 },
 {
  "id": "mirny-diamond",
  "place": "サハ共和国ミールヌイ周辺",
  "coordinates": [
   113.961354,
   62.540019
  ],
  "positionSource": "ne",
  "positionName": "Mirny",
  "industries": [
   "diamond"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "天然ダイヤ採掘地域",
  "note": "ALROSAの操業地域。個別坑口や全ての鉱山を示さない。",
  "sourceIds": [
   "alrosa",
   "usgs"
  ]
 },
 {
  "id": "udachny-diamond",
  "place": "サハ共和国ウダーチヌイ周辺",
  "coordinates": [
   112.39654,
   66.423166
  ],
  "positionSource": "ne",
  "positionName": "Udachny",
  "industries": [
   "diamond"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "天然ダイヤ採掘地域",
  "note": "ミールヌイと別の北部鉱業集積。天然と合成品を区別。",
  "sourceIds": [
   "alrosa",
   "usgs"
  ]
 },
 {
  "id": "arkhangelsk-diamond",
  "place": "アルハンゲリスク州",
  "coordinates": [
   40.55378625655952,
   64.55506031697159
  ],
  "positionSource": "ghsl",
  "positionName": "Arkhangelsk",
  "industries": [
   "diamond"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "天然ダイヤ採掘地域",
  "note": "州都の案内点。操業鉱山の敷地ではない。",
  "sourceIds": [
   "alrosa",
   "usgs"
  ]
 },
 {
  "id": "omsk-refining",
  "place": "オムスク",
  "coordinates": [
   73.35366983230905,
   54.98704290214417
  ],
  "positionSource": "ghsl",
  "positionName": "Omsk",
  "industries": [
   "oil"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "石油精製",
  "note": "2025年推定能力は日量44万バレル。全国2024年実処理日量540万バレルと別の年・対象。",
  "sourceIds": [
   "eia"
  ]
 },
 {
  "id": "ryazan-refining",
  "place": "リャザン",
  "coordinates": [
   39.720098586181784,
   54.62413858533011
  ],
  "positionSource": "ghsl",
  "positionName": "Ryazan",
  "industries": [
   "oil"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "石油精製",
  "note": "2025年推定能力は日量34万バレル。実処理量は未取得。",
  "sourceIds": [
   "eia"
  ]
 },
 {
  "id": "nizhny-refining",
  "place": "ニジニ・ノヴゴロド地域",
  "coordinates": [
   43.92233791890137,
   56.297772782539475
  ],
  "positionSource": "ghsl",
  "positionName": "Nizhny Novgorod",
  "industries": [
   "oil"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "石油精製地域",
  "note": "都市案内点。地域製油所の2025年推定能力日量34万バレル。工場の敷地ではない。",
  "sourceIds": [
   "eia"
  ]
 },
 {
  "id": "korsakov-lng",
  "place": "サハリン南部（コルサコフ周辺）",
  "coordinates": [
   142.777476,
   46.642436
  ],
  "positionSource": "ne",
  "positionName": "Korsakov",
  "industries": [
   "gas"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "ガス液化・積出地域",
  "note": "PrigorodnoyeのLNG集積を案内する都市位置。液化設備そのものの位置ではない。",
  "sourceIds": [
   "eia"
  ]
 },
 {
  "id": "orenburg-gas-helium",
  "place": "オレンブルク",
  "coordinates": [
   55.11792633122789,
   51.79558368339297
  ],
  "positionSource": "ghsl",
  "positionName": "Orenburg",
  "industries": [
   "gas",
   "helium"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "天然ガス処理・ヘリウム回収",
  "note": "ヘリウムを含むガスの処理地域。両製品の数量単位・全国市場を区別。",
  "sourceIds": [
   "usgs",
   "eia"
  ]
 },
 {
  "id": "amur-helium",
  "place": "アムール州スヴォボードヌイ周辺",
  "coordinates": [
   128.131187,
   51.406176
  ],
  "positionSource": "ne",
  "positionName": "Svobodnyy",
  "industries": [
   "helium"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "アムールガス処理・ヘリウム回収",
  "note": "都市の案内位置。ヘリウムの全国実生産を設計能力へ置き換えない。",
  "sourceIds": [
   "usgs"
  ]
 },
 {
  "id": "krasnoyarsk-aluminum",
  "place": "クラスノヤルスク",
  "coordinates": [
   92.86697534647236,
   56.03574359626852
  ],
  "positionSource": "ghsl",
  "positionName": "Krasnoyarsk",
  "industries": [
   "aluminum"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "一次アルミ製錬",
  "note": "金鉱業の地方案内点と同じ都市座標でも、こちらは都市の製錬集積を示す。",
  "sourceIds": [
   "rusalSites",
   "hydro"
  ]
 },
 {
  "id": "bratsk-aluminum",
  "place": "ブラーツク",
  "coordinates": [
   101.61294874781801,
   56.157177355249466
  ],
  "positionSource": "ghsl",
  "positionName": "Bratsk",
  "industries": [
   "aluminum"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "一次アルミ製錬",
  "note": "水力発電と電力多消費の製錬設備の集積。工場別実生産は未取得。",
  "sourceIds": [
   "rusalSites",
   "hydro"
  ]
 },
 {
  "id": "sayanogorsk-aluminum",
  "place": "サヤノゴルスク",
  "coordinates": [
   91.400405,
   53.089433
  ],
  "positionSource": "ne",
  "positionName": "Sayanogorsk",
  "industries": [
   "aluminum"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "一次アルミ製錬",
  "note": "Sayanogorsk・Khakas製錬所を都市単位の1案内点で示す。",
  "sourceIds": [
   "rusalSites"
  ]
 },
 {
  "id": "tayshet-aluminum",
  "place": "タイシェト",
  "coordinates": [
   97.987703,
   55.927709
  ],
  "positionSource": "ne",
  "positionName": "Tayshet",
  "industries": [
   "aluminum"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "一次アルミ製錬",
  "note": "操業拠点。公称能力を実生産として面積に変換しない。",
  "sourceIds": [
   "rusalSites"
  ]
 },
 {
  "id": "cherepovets-steel",
  "place": "チェレポヴェツ",
  "coordinates": [
   37.895435280503406,
   59.128856499971405
  ],
  "positionSource": "ghsl",
  "positionName": "Cherepovets",
  "industries": [
   "steel",
   "nitrogen",
   "phosphate"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "製鉄・肥料製造",
  "note": "Severstal製鉄とPhosAgro等の化学設備が同じ都市にある。異なる産業の数量を合算しない。",
  "sourceIds": [
   "severstal",
   "phosagro",
   "nitrogenSites"
  ]
 },
 {
  "id": "lipetsk-steel",
  "place": "リペツク",
  "coordinates": [
   39.56331260137426,
   52.60573524819459
  ],
  "positionSource": "ghsl",
  "positionName": "Lipetsk",
  "industries": [
   "steel"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "一貫製鉄",
  "note": "NLMKの製鉄集積。ストイレンスキー鉱山の鉄鉱石と結び付く。",
  "sourceIds": [
   "nlmk"
  ]
 },
 {
  "id": "tolyatti-nitrogen",
  "place": "トリヤッチ",
  "coordinates": [
   49.42409947839969,
   53.52476272420722
  ],
  "positionSource": "ghsl",
  "positionName": "Tolyatti",
  "industries": [
   "nitrogen"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "アンモニア・窒素肥料",
  "note": "窒素肥料の生産都市。天然ガス由来水素を使う化学工程。",
  "sourceIds": [
   "nitrogenSites"
  ]
 },
 {
  "id": "salavat-nitrogen",
  "place": "サラヴァト",
  "coordinates": [
   55.93730277639653,
   53.35406262383162
  ],
  "positionSource": "ghsl",
  "positionName": "Salavat",
  "industries": [
   "nitrogen"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "窒素肥料",
  "note": "バシコルトスタンの化学工業集積。",
  "sourceIds": [
   "nitrogenSites"
  ]
 },
 {
  "id": "berezniki-potash",
  "place": "ベレズニキ",
  "coordinates": [
   56.81550043722837,
   59.40931339484083
  ],
  "positionSource": "ghsl",
  "positionName": "Berezniki",
  "industries": [
   "potash",
   "nitrogen"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "カリ採掘・肥料製造",
  "note": "上カマ鉱床のカリ採掘・加工と都市の窒素肥料設備。採取と製造を分けて読む。",
  "sourceIds": [
   "potashSites",
   "nitrogenSites"
  ]
 },
 {
  "id": "solikamsk-potash",
  "place": "ソリカムスク",
  "coordinates": [
   56.749962,
   59.669987
  ],
  "positionSource": "ne",
  "positionName": "Solikamsk",
  "industries": [
   "potash"
  ],
  "sectors": [
   "resources",
   "manufacturing"
  ],
  "stage": "カリ採掘・加工",
  "note": "ベレズニキとともに上カマ鉱床の集積を形成。",
  "sourceIds": [
   "potashSites"
  ]
 },
 {
  "id": "khibiny-phosphate",
  "place": "ヒビヌイ（キロフスク）",
  "coordinates": [
   33.668735,
   67.609089
  ],
  "positionSource": "ne",
  "positionName": "Kirovsk",
  "industries": [
   "phosphate"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "アパタイト採掘・選鉱",
  "note": "りん酸肥料の原料産地。下流の肥料製造拠点とは別工程。",
  "sourceIds": [
   "phosagro",
   "usgs"
  ]
 },
 {
  "id": "volkhov-phosphate",
  "place": "ヴォルホフ",
  "coordinates": [
   32.338739,
   59.929093
  ],
  "positionSource": "ne",
  "positionName": "Volkhov",
  "industries": [
   "phosphate"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "りん酸肥料製造",
  "note": "PhosAgroの下流製造拠点。",
  "sourceIds": [
   "phosagro"
  ]
 },
 {
  "id": "balakovo-phosphate",
  "place": "バラコヴォ",
  "coordinates": [
   47.802348575891834,
   52.022438008848006
  ],
  "positionSource": "ghsl",
  "positionName": "Balakovo",
  "industries": [
   "phosphate"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "りん酸肥料製造",
  "note": "鉱床に近い採掘地とは異なる化学工業集積。",
  "sourceIds": [
   "phosagro"
  ]
 },
 {
  "id": "novouralsk-enrichment",
  "place": "ノヴォウラリスク",
  "coordinates": [
   60.09210158376079,
   57.25403464197437
  ],
  "positionSource": "ghsl",
  "positionName": "Novouralsk",
  "industries": [
   "enrichment"
  ],
  "sectors": [
   "manufacturing",
   "services"
  ],
  "stage": "濃縮設備・役務",
  "note": "ウラン採掘ではなく遠心分離による濃縮。",
  "sourceIds": [
   "enrichment"
  ]
 },
 {
  "id": "angarsk-enrichment",
  "place": "アンガルスク",
  "coordinates": [
   103.87108854958659,
   52.524488664843105
  ],
  "positionSource": "ghsl",
  "positionName": "Angarsk",
  "industries": [
   "enrichment"
  ],
  "sectors": [
   "manufacturing",
   "services"
  ],
  "stage": "濃縮設備・役務",
  "note": "核燃料工程の設備・役務。4工場のうち1拠点。",
  "sourceIds": [
   "enrichment"
  ]
 },
 {
  "id": "seversk-enrichment",
  "place": "セヴェルスク",
  "coordinates": [
   84.8895938250746,
   56.59721040582418
  ],
  "positionSource": "ghsl",
  "positionName": "Seversk",
  "industries": [
   "enrichment"
  ],
  "sectors": [
   "manufacturing",
   "services"
  ],
  "stage": "濃縮設備・役務",
  "note": "近隣トムスクの都市中心と区別した既存GHSL座標。",
  "sourceIds": [
   "enrichment"
  ]
 },
 {
  "id": "moscow-management-logistics",
  "place": "モスクワ",
  "coordinates": [
   37.63786861381086,
   55.748862156060426
  ],
  "positionSource": "ghsl",
  "positionName": "Moscow",
  "industries": [
   "management"
  ],
  "sectors": [
   "services"
  ],
  "stage": "企業本社・都市物流",
  "note": "管理機能の都市案内点。本社所在地を鉱山や製錬所として表示しない。",
  "sourceIds": [
   "management",
   "fesco"
  ]
 },
 {
  "id": "murmansk-port",
  "place": "ムルマンスク",
  "coordinates": [
   33.08975748347829,
   68.96245248281656
  ],
  "positionSource": "ghsl",
  "positionName": "Murmansk",
  "industries": [
   "logistics"
  ],
  "sectors": [
   "services"
  ],
  "stage": "北極海側の港湾",
  "note": "2025年取扱4,700万t。都市重心で港湾区域の厳密な境界ではない。",
  "sourceIds": [
   "ports"
  ]
 },
 {
  "id": "st-petersburg-port",
  "place": "サンクトペテルブルク",
  "coordinates": [
   30.336421213424174,
   59.93314942246161
  ],
  "positionSource": "ghsl",
  "positionName": "Saint Petersburg",
  "industries": [
   "logistics"
  ],
  "sectors": [
   "services"
  ],
  "stage": "バルト海港湾",
  "note": "2025年取扱5,460万t。ウスチルガ・プリモルスクとは別の港。",
  "sourceIds": [
   "ports"
  ]
 },
 {
  "id": "novorossiysk-port",
  "place": "ノヴォロシースク",
  "coordinates": [
   37.759363494756414,
   44.72191464030899
  ],
  "positionSource": "ghsl",
  "positionName": "Novorossiysk",
  "industries": [
   "logistics"
  ],
  "sectors": [
   "services"
  ],
  "stage": "黒海港湾",
  "note": "2025年取扱1億6,800万t。全貨物量で、小麦だけの輸出量ではない。",
  "sourceIds": [
   "ports"
  ]
 },
 {
  "id": "vladivostok-port",
  "place": "ウラジオストク",
  "coordinates": [
   131.9203545221523,
   43.12737582118304
  ],
  "positionSource": "ghsl",
  "positionName": "Vladivostok",
  "industries": [
   "logistics"
  ],
  "sectors": [
   "services"
  ],
  "stage": "日本海側の港湾",
  "note": "2025年取扱4,160万t。都市重心の案内点。",
  "sourceIds": [
   "ports"
  ]
 },
 {
  "id": "nakhodka-port",
  "place": "ナホトカ・ヴォストーチヌイ港湾地域",
  "coordinates": [
   132.879601271296,
   42.80929400193726
  ],
  "positionSource": "ghsl",
  "positionName": "Nakhodka",
  "industries": [
   "logistics"
  ],
  "sectors": [
   "services"
  ],
  "stage": "極東港湾地域",
  "note": "ナホトカ市の案内点。ヴォストーチヌイ港8,470万tとナホトカ港2,810万tは2025年の別港統計。",
  "sourceIds": [
   "ports"
  ]
 },
 {
  "id": "vanino-port",
  "place": "ヴァニノ",
  "coordinates": [
   140.242489,
   49.087325
  ],
  "positionSource": "ne",
  "positionName": "Vanino",
  "industries": [
   "logistics"
  ],
  "sectors": [
   "services"
  ],
  "stage": "極東港湾",
  "note": "2025年取扱4,210万t。内陸の鉄道容量と海上輸送が接続。",
  "sourceIds": [
   "ports"
  ]
 },
 {
  "id": "naberezhnye-chelny-trucks",
  "place": "ナーベレジヌイェ・チェルヌイ",
  "coordinates": [
   52.383848224859086,
   55.722010443569204
  ],
  "positionSource": "ghsl",
  "positionName": "Naberezhnye Chelny",
  "industries": [
   "trucks"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "トラックの鋳鍛造・エンジン・組立",
  "note": "KAMAZの操業集積。都市重心で工場敷地ではない。",
  "sourceIds": [
   "kamaz"
  ]
 },
 {
  "id": "rostov-wheat",
  "place": "ロストフ州",
  "coordinates": [
   39.7072608997243,
   47.24590888686889
  ],
  "positionSource": "ghsl",
  "positionName": "Rostov-on-Don",
  "industries": [
   "wheat"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "南部の冬小麦地帯",
  "note": "州都の案内点。圃場の収量・面積ではない。既存の農林業地図に実分布を掲載。",
  "sourceIds": [
   "wheat",
   "wheatTerritory"
  ]
 },
 {
  "id": "krasnodar-wheat",
  "place": "クラスノダール地方",
  "coordinates": [
   39.00996214957138,
   45.054745169251596
  ],
  "positionSource": "ghsl",
  "positionName": "Krasnodar",
  "industries": [
   "wheat"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "南部の冬小麦地帯",
  "note": "州都の案内点。圃場の収量・面積ではない。既存の農林業地図に実分布を掲載。",
  "sourceIds": [
   "wheat",
   "wheatTerritory"
  ]
 },
 {
  "id": "stavropol-wheat",
  "place": "スタヴロポリ地方",
  "coordinates": [
   41.95761095653648,
   45.03508120486804
  ],
  "positionSource": "ghsl",
  "positionName": "Stavropol",
  "industries": [
   "wheat"
  ],
  "sectors": [
   "resources"
  ],
  "stage": "南部の冬小麦地帯",
  "note": "州都の案内点。圃場の収量・面積ではない。既存の農林業地図に実分布を掲載。",
  "sourceIds": [
   "wheat",
   "wheatTerritory"
  ]
 },
 {
  "id": "krasnoyarsk-palladium-refining",
  "place": "クラスノヤルスク（Krastsvetmet）",
  "coordinates": [
   92.86697534647236,
   56.03574359626852
  ],
  "positionSource": "ghsl",
  "positionName": "Krasnoyarsk",
  "industries": [
   "palladium"
  ],
  "sectors": [
   "manufacturing"
  ],
  "stage": "貴金属の委託精製",
  "note": "ノリリスク系の貴金属を最終精製する委託先の1社。工場の敷地ではなく都市重心。Ni精製を担うコラと工程を分ける。",
  "sourceIds": [
   "kola",
   "krastsvetmet"
  ]
 }
];
