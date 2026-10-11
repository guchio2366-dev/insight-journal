import {japanWheatSupply} from './japan-wheat-supply.ts';

/** Locality anchors are editorial locators, never field boundaries or measured production extent. */
export type JapanAgricultureProductId='rice'|'wheat'|'potato'|'cabbage'|'tomato'|'apple'|'mandarin'|'milk'|'beef'|'pork';
export type JapanAgricultureTopic='all'|'forest'|JapanAgricultureProductId;
export type JapanAgricultureSource={id:string;title:string;href:string;period:string;accessed:string;license:string;status:'verified-html'|'verified-pdf'|'existing-checked-in'|'download-blocked';note?:string};
export type JapanAgricultureProduct={id:JapanAgricultureProductId;title:string;color:string;category:'crop'|'horticulture'|'livestock';overview:string;reason:string;selectionReason:string;sourceIds:string[]};
export type JapanAgricultureSite={id:string;name:string;coordinates:[number,number];products:JapanAgricultureProductId[];geometryKind:'representative-point';coordinateMethod:string;extent:null;quantity:null;overview:string;reason:string;sourceIds:string[]};

const maffTerms='PDL1.0（出典表示・加工表示。第三者の写真・動画・ロゴは使用しない）';
export const japanAgricultureSources:JapanAgricultureSource[]=[
 {id:'hamamatsu-potato',title:'農畜産業振興機構：浜松・湖西の三方原馬鈴薯',href:'https://vegetable.alic.go.jp/yasaijoho/santi/0803_santi1.html',period:'2008年3月の産地紹介（現行数量・順位ではない）',accessed:'2026-10-11',license:'産地の事実を独自に要約。原文・写真・図を再配布しない。',status:'verified-html'},
 {id:'toyohashi-farming',title:'農畜産業振興機構・JA豊橋：キャベツと地域の農業',href:'https://vegetable.alic.go.jp/yasaijoho/santi/1712_santi1.html',period:'2017年12月の産地紹介・2016年度への言及',accessed:'2026-10-11',license:'産地の事実を独自に要約。原文・写真・図を再配布しない。',status:'verified-html'},
 {id:'miura-cabbage',title:'農畜産業振興機構・神奈川県：三浦半島のキャベツ',href:'https://vegetable.alic.go.jp/yasaijoho/santi/1203_santi1.html',period:'2012年3月の産地紹介（現行数量・順位ではない）',accessed:'2026-10-11',license:'産地の事実を独自に要約。原文・写真・図を再配布しない。',status:'verified-html'},
 {id:'azumino-apple',title:'JA長野県：安曇野のりんご産地と摘果',href:'https://oishii.iijan.or.jp/products/noutiku-20250613',period:'2025年6月11日の生産者取材',accessed:'2026-10-11',license:'産地の事実を独自に要約。原文・写真・図を再配布しない。',status:'verified-html'},
 {id:'nobeyama-milk',title:'JA長野県：野辺山の酪農と耕畜連携',href:'https://oishii.iijan.or.jp/products/noutiku01-20250423',period:'2025年4月23日の生産者取材',accessed:'2026-10-11',license:'産地の事実を独自に要約。原文・写真・図を再配布しない。',status:'verified-html'},
 {id:'nanyo-mandarin',title:'農林水産省：愛媛・南予の柑橘農業システム',href:'https://www.maff.go.jp/j/pr/aff/2402/heritage05.html',period:'2024年2月の産地紹介（現行数量・順位ではない）',accessed:'2026-10-11',license:maffTerms,status:'verified-html'},
 {id:'wood-nichinan',title:'林野庁白書：日南などのJAS製材',href:'https://www.rinya.maff.go.jp/j/kikaku/hakusyo/r6hakusyo_h/all/chap3_3_2.html',period:'2024年度白書・事例3－8',accessed:'2026-10-11',license:maffTerms,status:'verified-html'},
 {id:'wood-asahikawa',title:'林野庁白書：旭川のシラカバ材利用',href:'https://www.rinya.maff.go.jp/j/kikaku/hakusyo/r6hakusyo_h/all/chap3_3_3.html',period:'2024年度白書・事例3－9',accessed:'2026-10-11',license:maffTerms,status:'verified-html'},
 {id:'wood-nagai',title:'林野庁白書：長井・置賜の木質バイオマス熱供給',href:'https://www.rinya.maff.go.jp/j/kikaku/hakusyo/r6hakusyo_h/all/chap3_2_3.html',period:'2024年度白書・事例3－5',accessed:'2026-10-11',license:maffTerms,status:'verified-html'},
 {id:'shonai',title:'農林水産省：庄内平野・鶴岡市水沢の米づくり',href:'https://www.maff.go.jp/j/nousin/sekkei/museum/m_siki/13_shounai/index.html',period:'地域事例・最新数量ではない',accessed:'2026-10-11',license:maffTerms,status:'verified-html'},
 {id:'municipal-2024',title:'農林水産省：2024年市町村別農業産出額（推計）詳細品目',href:'https://www.maff.go.jp/j/tokei/kouhyou/sityoson_sansyutu/attach/xls/index-25.xlsx',period:'2024年・2026年8月3日更新',accessed:'2026-10-10',license:maffTerms,status:'download-blocked',note:'この実装環境の取得はHTTPプロキシ403。原表の数値・順位は未収録。市町村別の価格・単収差を反映しない按分推計で、xは秘匿。'},
 {id:'municipal-method',title:'農林水産省：市町村別農業産出額の作成方法・利用上の注意',href:'https://www.maff.go.jp/j/tokei/kouhyou/sityoson_sansyutu/gaiyou/',period:'2024年推計の説明',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'tokachi',title:'北海道農政事務所：十勝地域の農業の概要',href:'https://www.maff.go.jp/hokkaido/obihiro/kannnaigaiyou/zenntai.html',period:'2020年センサス・2023年産出額を参照する地域説明',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'nakasatsunai',title:'農林水産省白書：中札内村の小麦と輪作',href:'https://www.maff.go.jp/j/wpaper/w_maff/r6/r6_h/trend/part1/chap2/c2_2_00.html',period:'2024年度の事例',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'tsumagoi',title:'農林水産省：嬬恋の高原キャベツ',href:'https://www.maff.go.jp/j/nousin/sekkei/museum/m_siki/20_tumago/index.html',period:'地域事例・2015年度への言及を含む（最新数量ではない）',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'yatsushiro',title:'農林水産省GI登録：くまもと塩トマトの生産地',href:'https://www.maff.go.jp/j/shokusan/gi_act/register/0111/index.html',period:'2021年10月7日登録・2024年10月29日更新',accessed:'2026-10-10',license:maffTerms,status:'verified-html',note:'八代市・氷川町・宇城市の干拓地に限るGI事例。一般の熊本県産トマトすべての範囲ではない。'},
 {id:'tomato-season',title:'農林水産省：冬春・夏秋トマトの産地とハウス栽培',href:'https://www.maff.go.jp/j/pr/aff/2208/spe1_01.html',period:'2022年8月',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'hirosaki',title:'農林水産省：弘前のりんご産地',href:'https://www.maff.go.jp/j/pr/aff/2011/producer01.html',period:'2020年11月・2018年統計への言及を含む',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'aridagawa',title:'農林水産省：有田川町のみかんと段々畑',href:'https://www.maff.go.jp/j/pr/aff/1701/spe1_02.html',period:'2017年1月の産地取材',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'betsukai',title:'北海道農政事務所：別海町の酪農と生乳加工',href:'https://www.maff.go.jp/hokkaido/kushiro/douga/240325betsukaidouga.html',period:'2023年10–11月撮影・2024年3月掲載',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'betsukai-land',title:'農林水産省：別海町の冷涼な気候・牧草地と酪農',href:'https://www.maff.go.jp/j/pr/aff/1806/characterinformation.html',period:'2018年6月の産地取材',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'agano',title:'農林水産省：阿賀野市の米づくりと食品企業',href:'https://sannyu-portal.maff.go.jp/',period:'掲載事例・数量統計ではない',accessed:'2026-10-10',license:maffTerms,status:'verified-html'},
 {id:'miyakonojo',title:'都城市：畜産と地域の産業',href:'https://www.city.miyakonojo.miyazaki.jp/site/kanko/1753.html',period:'現行地域紹介・順位の対象年未記載',accessed:'2026-10-10',license:'事実の独自要約のみ。原文・写真・図を再配布しない。',status:'verified-html',note:'対象年のない「日本一」は数値・順位として採用しない。'},
 {id:'wheat-supply',title:'農林水産省：小麦の需給と価格に関する資料',href:'https://www.maff.go.jp/j/seisan/boueki/mugi_zyukyuu/attach/pdf/index-178.pdf',period:'2023年度・28頁、34頁（既存収録値）',accessed:'2026-10-10',license:maffTerms,status:'existing-checked-in'},
 {id:'forest-resources',title:'林野庁：森林資源の現況',href:'https://www.rinya.maff.go.jp/j/keikaku/genkyou/r4/index.html',period:'2022年3月31日現在',accessed:'2026-10-10',license:maffTerms,status:'verified-html',note:'森林の面積・蓄積の資料。全国の詳細森林被覆図はこの便で未収録。'},
 {id:'wood-balance',title:'林野庁：2024年木材需給表',href:'https://www.rinya.maff.go.jp/j/press/kikaku/attach/pdf/251121-1.pdf',period:'2024暦年・2025年11月公表',accessed:'2026-10-10',license:maffTerms,status:'verified-pdf',note:'丸太換算材積。需要・供給・輸出を区別。端数処理で内訳の合計が総数に一致しない場合がある。'},
];

export const japanAgricultureProducts:JapanAgricultureProduct[]=[
 {id:'rice',title:'米',color:'#597d36',category:'crop',overview:'阿賀野の米づくりを、日本海側の平野の農業事例として示します。点は栽培地の範囲ではありません。',reason:'米づくりには生育期の熱と水を確保し、田の水位を調整する仕組みが必要です。生産地と食品加工・都市の需要をつないで読みます。',selectionReason:'主食と水田の水管理を日本の平野・河川と結び付ける基本品目。',sourceIds:['agano','municipal-method']},
 {id:'wheat',title:'小麦',color:'#b08028',category:'crop',overview:'十勝と中札内に、小麦を輪作に組み込む畑作の事例があります。国内産地と輸入の両方を読む品目です。',reason:'広い農地での機械作業や輪作が安定生産を支えます。中札内の「きたほなみ」は日本めん向け。パン・めん・菓子の需要を国内生産だけで賄う構造ではありません。',selectionReason:'例外扱いの合意を継承。輸入先・用途・自給率から、産地図だけでは分からない日本の食を読む。',sourceIds:['tokachi','nakasatsunai','wheat-supply']},
 {id:'potato',title:'ばれいしょ',color:'#95693f',category:'crop',overview:'十勝の輪作畑作と、浜松・三方原の春作の産地例があります。出典の時点が異なり、同年の数量順位ではありません。',reason:'同じ作物を同じ畑に続ける代わりに、作物を組み替える輪作を行います。広い耕地と大型機械を使う畑作の仕組みを考える手がかりです。',selectionReason:'重量上位だけでなく、北海道の輪作・加工用途を学べるいも類を採用。',sourceIds:['tokachi','hamamatsu-potato']},
 {id:'cabbage',title:'キャベツ',color:'#427d69',category:'horticulture',overview:'嬬恋の夏秋作、豊橋の秋冬作、三浦半島の早春・春作の産地例を並べます。',reason:'夏も冷涼な高原の気候が、平地と異なる出荷時期を支えます。農地造成と全国への輸送も産地を成り立たせる条件です。',selectionReason:'高冷地と季節的な供給を、気温・標高との関係で読める代表野菜。',sourceIds:['tsumagoi','toyohashi-farming','miura-cabbage']},
 {id:'tomato',title:'トマト',color:'#b45b47',category:'horticulture',overview:'八代周辺の干拓地にGI登録の塩トマト産地があります。日本のトマトは冬春と夏秋で主要産地が異なります。',reason:'温暖な地域の施設栽培と冷涼な地域の夏秋作が出荷時期を補います。塩トマトは干拓地の塩分と細かな栽培管理に関わる局地的な事例です。',selectionReason:'施設栽培・出荷時期・局地的土壌条件を区別できる代表野菜。',sourceIds:['yatsushiro','tomato-season']},
 {id:'apple',title:'りんご',color:'#a44859',category:'horticulture',overview:'津軽の弘前と長野の安曇野に、りんごの産地例があります。点の周囲すべてが果樹園という意味ではありません。',reason:'果樹は植えてから複数年にわたり管理する作物です。冷涼な産地の栽培技術や品種、選別・貯蔵が食卓までの供給を支えます。',selectionReason:'北の果樹産地と、長期の園地管理・都市への流通を学べる。',sourceIds:['hirosaki','azumino-apple']},
 {id:'mandarin',title:'みかん',color:'#c48634',category:'horticulture',overview:'有田川と八幡浜・南予に、沿岸の斜面で温州みかんを作る産地例があります。',reason:'温暖な気候に加え、斜面の日当たりと排水、共同かん水、運搬・選別設備が栽培を支えます。果樹園の存在と自然の森林は別の土地利用です。',selectionReason:'温暖な沿岸・傾斜地の果樹を、りんごや平地の農業と対照できる。',sourceIds:['aridagawa','nanyo-mandarin']},
 {id:'milk',title:'生乳・酪農',color:'#527b9a',category:'livestock',overview:'別海と十勝に酪農の事例があります。乳用牛と肉用牛を一つの牛密度図で代用しません。',reason:'冷涼な気候と広い草地は酪農の条件の一部です。牧草、集乳、加工工場が生乳を牛乳や乳製品に変え、消費地へ届けます。',selectionReason:'草地・飼料・加工・流通と日本の食生活を結ぶ主要畜産品目。',sourceIds:['betsukai','betsukai-land','tokachi']},
 {id:'beef',title:'肉用牛',color:'#765b8a',category:'livestock',overview:'都城と十勝には肉用牛を育てる地域の事例があります。飼養頭数と牛肉の生産重量は別の指標です。',reason:'飼料の供給や繁殖・肥育、食肉加工のつながりが必要です。畜産の立地を、その場所の気候だけで決めることはできません。',selectionReason:'繁殖・肥育と飼料依存を扱い、生乳との用途の違いを明確にする。',sourceIds:['miyakonojo','tokachi']},
 {id:'pork',title:'豚',color:'#ae7072',category:'livestock',overview:'都城には養豚を含む畜産の事例があります。点は農場の位置や豚の密度を示しません。',reason:'豚の飼育には飼料と衛生管理、出荷・食肉加工の仕組みが必要です。地域内で育てることと、飼料まで地域内で賄うことを区別します。',selectionReason:'肉用牛・酪農と異なる飼育と飼料の仕組みを扱う主要畜産品目。',sourceIds:['miyakonojo']},
];

const coordinateMethod='資料に記載された地域の概略位置を編集して設定（WGS84経緯度）。農場・園地の測量位置ではない。';
const point=(site:Omit<JapanAgricultureSite,'geometryKind'|'coordinateMethod'|'extent'|'quantity'>):JapanAgricultureSite=>({...site,geometryKind:'representative-point',coordinateMethod,extent:null,quantity:null});
export const japanAgricultureSites:JapanAgricultureSite[]=[
 point({id:'hamamatsu-potato',name:'ばれいしょ｜浜松・三方原',coordinates:[137.71,34.79],products:['potato'],overview:'2008年の公的産地紹介で確認した三方原台地・白須賀台地のばれいしょ。点は浜松側の概略位置で、両台地の範囲ではありません。',reason:'温暖な地域の春作と台地の排水、野菜を組み合わせる輪作が、北海道とは異なる出荷時期を支えます。古い紹介の数量を現行値へ読み替えません。',sourceIds:['hamamatsu-potato']}),
 point({id:'toyohashi-farming',name:'キャベツ・豚｜豊橋',coordinates:[137.39,34.73],products:['cabbage','pork'],overview:'JA豊橋の2017年の紹介にあるキャベツ産地と地域の養豚。市内の概略位置で、農場の所在や県内数量の分布ではありません。',reason:'キャベツには温暖な気候と豊川用水、東西の市場への輸送が関わります。養豚は別の土地利用で、同じ点で示しても同じ農場という意味ではありません。',sourceIds:['toyohashi-farming']}),
 point({id:'miura-cabbage',name:'キャベツ｜三浦半島',coordinates:[139.65,35.20],products:['cabbage'],overview:'神奈川県の2012年の産地紹介にある、三浦半島の早春・春キャベツ。',reason:'海に囲まれ冬が温暖な条件と、だいこんなどを組み合わせる輪作・共同出荷が供給を支えます。嬬恋の夏秋作と出荷時期を比較できます。',sourceIds:['miura-cabbage']}),
 point({id:'azumino-apple',name:'りんご｜安曇野',coordinates:[137.87,36.30],products:['apple'],overview:'JA長野県が2025年に取材した安曇野市のりんご栽培。点は地域の概略位置で、取材園地の境界ではありません。',reason:'摘花・摘果や葉摘みなどの継続管理が果実の育ちを調整します。自然条件とともに、園地の管理と選果の仕組みを読みます。',sourceIds:['azumino-apple']}),
 point({id:'yawatahama-mandarin',name:'みかん｜八幡浜・南予',coordinates:[132.42,33.46],products:['mandarin'],overview:'農林水産省が2024年に紹介した南予の温州みかん産地。八幡浜側の概略位置で、南予の全園地や全柑橘を示す輪郭ではありません。',reason:'温暖な沿岸と日当たりのよい斜面に加え、段々畑、防風、生産者組織と共同選果が栽培を支えます。',sourceIds:['nanyo-mandarin']}),
 point({id:'nobeyama-milk',name:'酪農｜野辺山高原',coordinates:[138.48,35.96],products:['milk'],overview:'JA長野県が2025年に取材した野辺山の酪農と生乳加工の地域事例。',reason:'冷涼な高原での牧草生産と、野菜農家との農地・堆肥のやり取りを集乳・加工へつなぎます。乳用牛の事例で、肉用牛の分布を代用しません。',sourceIds:['nobeyama-milk']}),
 point({id:'shonai-rice',name:'米｜庄内・鶴岡水沢',coordinates:[139.76,38.65],products:['rice'],overview:'農林水産省が紹介する、庄内平野南端の鶴岡市水沢地区の米づくり。',reason:'平坦な地形と区画整理された水田を、米づくりの基盤として考えます。',sourceIds:['shonai']}),
 point({id:'kochi-tomato',name:'トマト｜高知・徳谷',coordinates:[133.52,33.56],products:['tomato'],overview:'農林水産省が紹介する徳谷トマトの産地事例。高知市周辺の概略位置で、園地の測量位置ではありません。',reason:'水や土壌の条件と栽培管理が品質に関わる事例。生産量・順位や産地境界は未収録です。',sourceIds:['tomato-season']}),
 point({id:'agano-rice',name:'米｜阿賀野',coordinates:[139.225,37.835],products:['rice'],overview:'阿賀野市の米づくりと食品企業が連携する事例。',reason:'農地の管理・生産から加工までの関係を、平野の水田農業と合わせて読みます。',sourceIds:['agano']}),
 point({id:'tokachi-farming',name:'小麦・ばれいしょ・生乳・肉用牛｜十勝',coordinates:[143.0,42.93],products:['wheat','potato','milk','beef'],overview:'十勝の畑作と酪農・肉用牛の地域事例。代表点は十勝平野の概略位置です。',reason:'小麦・ばれいしょ・てんさい・豆類の輪作と大型機械を使う広い耕地が特徴です。家畜の用途は乳用と肉用を区別します。',sourceIds:['tokachi']}),
 point({id:'nakasatsunai-wheat',name:'小麦｜中札内',coordinates:[143.13,42.697],products:['wheat'],overview:'小麦と豆類を組み合わせる農協の生産事例。',reason:'えだまめなどを組み込む輪作と共同の収穫・乾燥調製が安定生産を支えます。資料では日本めん向け品種を扱います。',sourceIds:['nakasatsunai']}),
 point({id:'tsumagoi-cabbage',name:'キャベツ｜嬬恋',coordinates:[138.47,36.48],products:['cabbage'],overview:'浅間山北麓の高原で夏秋キャベツを作る事例。',reason:'冷涼な夏と農地開発の基盤、全国への出荷を合わせて考えます。',sourceIds:['tsumagoi']}),
 point({id:'yatsushiro-tomato',name:'トマト｜八代周辺',coordinates:[130.60,32.50],products:['tomato'],overview:'八代・氷川・宇城の干拓地で栽培される塩トマトのGI事例。',reason:'塩分のある土壌の条件と栽培管理が品質に関わります。登録区域全部の輪郭や一般トマトの数量分布は表していません。',sourceIds:['yatsushiro','tomato-season']}),
 point({id:'hirosaki-apple',name:'りんご｜弘前',coordinates:[140.47,40.6],products:['apple'],overview:'弘前のりんご産地の事例。',reason:'複数年続く果樹の管理と産地で蓄積された技術、消費地へ向けた選別・貯蔵を考えます。',sourceIds:['hirosaki']}),
 point({id:'aridagawa-mandarin',name:'みかん｜有田川',coordinates:[135.27,34.04],products:['mandarin'],overview:'有田川町の段々畑で温州みかんを栽培する事例。',reason:'斜面の日当たりと水はけ、かん水や運搬設備による管理が組み合わさります。',sourceIds:['aridagawa']}),
 point({id:'betsukai-milk',name:'酪農｜別海',coordinates:[145.02,43.395],products:['milk'],overview:'別海町の酪農と町内の生乳加工の事例。',reason:'冷涼な気候・広い牧草地と、集乳・牛乳や乳製品の製造をつなぎます。',sourceIds:['betsukai','betsukai-land']}),
 point({id:'miyakonojo-livestock',name:'肉用牛・豚｜都城',coordinates:[131.062,31.755],products:['beef','pork'],overview:'都城市で肉用牛・豚・鶏が飼育される地域事例。',reason:'飼料、出荷、食肉加工などの産業のつながりを読む地点です。年が不明な産出額順位は採用していません。',sourceIds:['miyakonojo']}),
];

/** Forest raster and wood-use localities are different observations, never an inferred supply link. */
const forestryCoordinateMethod='資料に記載された地域の概略位置を編集して設定（WGS84経緯度）。施設・敷地の正確な位置ではない。';
export const japanForestrySites=[
 {id:'wood-asahikawa',name:'シラカバ材利用｜旭川',coordinates:[142.36,43.77] as [number,number],title:'家具・内装材',overview:'2024年度林野庁白書が紹介する、旭川の白樺プロジェクトによる道産シラカバ材の利用。',reason:'樹種の性質と製品づくり、近隣事業者との連携を読みます。点の周囲が採材林という意味ではありません。',sourceIds:['wood-asahikawa'],coordinateMethod:forestryCoordinateMethod,geometryKind:'wood-use-reference-point',quantity:null,extent:null},
 {id:'wood-nagai',name:'木質熱利用｜長井・置賜',coordinates:[140.04,38.11] as [number,number],title:'木質熱供給',overview:'2024年度林野庁白書が紹介する、長井市の企業が先導する置賜地域の木質バイオマス熱供給。',reason:'地域材の燃料化と、豪雪地の公共・民間施設の熱需要を結び付けます。森林参考画像から燃料の産地や供給経路を推定しません。',sourceIds:['wood-nagai'],coordinateMethod:forestryCoordinateMethod,geometryKind:'wood-use-reference-point',quantity:null,extent:null},
 {id:'wood-nichinan',name:'JAS製材｜日南',coordinates:[131.38,31.60] as [number,number],title:'スギの製材',overview:'2024年度林野庁白書が紹介する、日南・都城・高原で製材を行う高嶺木材の事例。点は日南側の概略位置です。',reason:'大径材の木取り、乾燥と強度の管理が建築用製材を支えます。3工場の敷地や原木調達林の境界は未収録です。',sourceIds:['wood-nichinan'],coordinateMethod:forestryCoordinateMethod,geometryKind:'wood-use-reference-point',quantity:null,extent:null},
];

export const japanAgricultureSelectionCandidates={
 basis:'編集による基本10品目。国内生産量・産出額の上位10という順位ではない。食生活、特徴的な立地、地形・気候・水・飼料・流通との関係を組み合わせた。',
 adopted:japanAgricultureProducts.map(({id,title,selectionReason})=>({id,title,reason:selectionReason})),
 next:[
  {id:'chicken',title:'鶏肉・鶏卵',reason:'主要な畜産品目。肉用と採卵の資料・立地を分けて接続する必要があるため次便候補。豚や牛のデータで代用しない。'},
  {id:'onion',title:'たまねぎ',reason:'北海道と淡路の違い、収穫後の貯蔵が学べる。細地域数量と産地資料を揃えてから追加を検討。'},
  {id:'soybean',title:'大豆',reason:'水田転作と豆腐・油・飼料の輸入の関係が重要。小麦の次に需給を丁寧に整理したい。'},
  {id:'tea',title:'茶',reason:'傾斜地・品質・輸出を学べるが、生葉と荒茶・製茶の単位を分ける原表が必要。'},
  {id:'sweetpotato',title:'かんしょ',reason:'南九州の火山灰土と食品・焼酎・でんぷんの用途を学べる。10品目では北海道いも類との対照候補として次点。'},
  {id:'sugarcane',title:'さとうきび',reason:'南西諸島の重要品目。初期範囲の外もパンで見られる設計を維持し、公的産地資料と需給の確認後に検討。'},
 ],
 forestry:'林業は農畜産品目の順位に混ぜず、森林の広がりと木材需給を区別する別サブタブ。',
};

export const japanAgricultureReading={
 all:{title:'日本の農畜産業を、産地の事例から読む',overview:'北海道の畑作・酪農、津軽のりんご、日本海側の米、高原のキャベツ、暖地の施設野菜とみかん、南九州の畜産を並べます。点は資料で確認した地域の位置で、数量の多寡や農地の輪郭を表しません。',reason:'地形・気候・水とともに、輪作、施設、飼料、加工、都市への輸送が農業を支えます。農畜産物ごとに、その自然条件をどう使い、食卓まで何をつなぐのかを考えます。'},
 forest:{gap:'森林の面はJRC GFC2020 v3の2020年参考画像（約4–6kmの表示画素）です。透明域を非森林と判定せず、細かな林地境界・森林面積・樹種や林齢はこの画像から算定しません。林野庁の森林資源は2022年3月31日、木材需給は2024年の別資料です。点は林野庁白書の製材・家具材・熱利用の3地域事例（2024年度）で、伐採地・森林面積・全国の拠点総数を示しません。詳細な森林原分類と全国の木材拠点の網羅は未整備です。',title:'森林の存在と、木材を使う仕組みを分ける',overview:'2020年のJRC森林参考画像では山地に森林が広がり、主要な平野に切れ目があります。これは約4–6kmの表示画素の参考図で、細かい林地境界や伐採地の調査ではありません。林野庁の森林資源と木材需給は別資料です。',reason:'森林には水源涵養などの働きがあり、すべてが伐採して木材を出す場所とは限りません。木材利用は樹種・林齢、管理、搬出路、製材・加工、需要に左右され、森林の広さだけでは決まりません。'},
 gap:'米・小麦のMapSPAM2020収穫面積とGLW4の豚密度は原5分角（約7–9km）のモデル推計。細かい農地・農場の境界ではありません。2024年の市町村別詳細原表は取得403のため、この便の代表点に数量・順位・園地範囲を付けていません。県の総量から県内を一様に塗りません。',
 method:'面は2020年の粗い推計分布（米・小麦・豚）。濃淡は品目内の6段階で、異なる単位を合計しません。点は公的資料で確認した産地・地域の概略位置。大きさは生産量を表さず、農場・園地の範囲も表しません。選択しても他の産地事例は残ります。',
};

/** Forestry Agency table p. 5; all amounts are thousand m³ roundwood equivalent. */
export const japanForestrySupply={year:2024,period:'2024年1–12月',unit:'千m³（丸太換算）',sourceId:'wood-balance',
 domesticProduction:34809,imports:47065,totalSupply:81874,domesticConsumption:77871,exports:4003,
 domesticUses:[{id:'sawnwood',title:'製材用材',value:22054},{id:'plywood',title:'合板用材',value:7542},{id:'pulp',title:'パルプ・チップ用材',value:25131},{id:'other',title:'その他用材',value:410},{id:'shiitake',title:'しいたけ原木',value:154},{id:'fuel',title:'燃料材',value:22580}],
 selfSufficiency:{total:42.5,construction:52.9,nonConstruction:36.5},partners:null,
 note:'製品重量や森林蓄積ではなく丸太換算材積。総需要に輸出を含む。丸めにより内訳合計が総数と1千m³異なる場合がある。輸入・輸出相手別の数量は未収録。',
} as const;
export const japanAgricultureWheat=japanWheatSupply;
export const japanAgricultureTopics:JapanAgricultureTopic[]=['all',...japanAgricultureProducts.map(p=>p.id),'forest'];
export function getJapanAgricultureReading(topic:string,siteId?:string|null){
 const site=(topic==='forest'?japanForestrySites:japanAgricultureSites).find(s=>s.id===siteId);
 const product=japanAgricultureProducts.find(p=>p.id===topic);
 if(site)return {title:site.name,overview:site.overview,reason:site.reason,sourceIds:site.sourceIds};
 if(product)return {title:product.title,overview:product.overview,reason:product.reason,sourceIds:product.sourceIds};
 return {...japanAgricultureReading[topic==='forest'?'forest':'all'],sourceIds:topic==='forest'?['forest-resources','wood-balance']:['municipal-method']};
}
export function japanAgriculturePointCollection(){return {type:'FeatureCollection' as const,features:japanAgricultureSites.map(s=>({type:'Feature' as const,id:s.id,geometry:{type:'Point' as const,coordinates:s.coordinates},properties:{id:s.id,name:s.name,products:s.products,geometryKind:s.geometryKind,coordinateMethod:s.coordinateMethod,extent:s.extent,quantity:s.quantity,sourceIds:s.sourceIds}}))};}
