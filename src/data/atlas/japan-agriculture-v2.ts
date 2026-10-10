import {japanWheatSupply} from './japan-wheat-supply.ts';

/** Locality anchors are editorial locators, never field boundaries or measured production extent. */
export type JapanAgricultureProductId='rice'|'wheat'|'potato'|'cabbage'|'tomato'|'apple'|'mandarin'|'milk'|'beef'|'pork';
export type JapanAgricultureTopic='all'|'forest'|JapanAgricultureProductId;
export type JapanAgricultureSource={id:string;title:string;href:string;period:string;accessed:string;license:string;status:'verified-html'|'verified-pdf'|'existing-checked-in'|'download-blocked';note?:string};
export type JapanAgricultureProduct={id:JapanAgricultureProductId;title:string;color:string;category:'crop'|'horticulture'|'livestock';overview:string;reason:string;selectionReason:string;sourceIds:string[]};
export type JapanAgricultureSite={id:string;name:string;coordinates:[number,number];products:JapanAgricultureProductId[];geometryKind:'representative-point';coordinateMethod:string;extent:null;quantity:null;overview:string;reason:string;sourceIds:string[]};

const maffTerms='PDL1.0（出典表示・加工表示。第三者の写真・動画・ロゴは使用しない）';
export const japanAgricultureSources:JapanAgricultureSource[]=[
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
 {id:'potato',title:'ばれいしょ',color:'#95693f',category:'crop',overview:'十勝の畑作では、ばれいしょが小麦・てんさい・豆類とともに作られます。',reason:'同じ作物を同じ畑に続ける代わりに、作物を組み替える輪作を行います。広い耕地と大型機械を使う畑作の仕組みを考える手がかりです。',selectionReason:'重量上位だけでなく、北海道の輪作・加工用途を学べるいも類を採用。',sourceIds:['tokachi']},
 {id:'cabbage',title:'キャベツ',color:'#427d69',category:'horticulture',overview:'嬬恋の高原には、夏から秋のキャベツ産地の事例があります。',reason:'夏も冷涼な高原の気候が、平地と異なる出荷時期を支えます。農地造成と全国への輸送も産地を成り立たせる条件です。',selectionReason:'高冷地と季節的な供給を、気温・標高との関係で読める代表野菜。',sourceIds:['tsumagoi']},
 {id:'tomato',title:'トマト',color:'#b45b47',category:'horticulture',overview:'八代周辺の干拓地にGI登録の塩トマト産地があります。日本のトマトは冬春と夏秋で主要産地が異なります。',reason:'温暖な地域の施設栽培と冷涼な地域の夏秋作が出荷時期を補います。塩トマトは干拓地の塩分と細かな栽培管理に関わる局地的な事例です。',selectionReason:'施設栽培・出荷時期・局地的土壌条件を区別できる代表野菜。',sourceIds:['yatsushiro','tomato-season']},
 {id:'apple',title:'りんご',color:'#a44859',category:'horticulture',overview:'津軽の弘前に、りんごの生産地の事例があります。点の周囲すべてが果樹園という意味ではありません。',reason:'果樹は植えてから複数年にわたり管理する作物です。冷涼な産地の栽培技術や品種、選別・貯蔵が食卓までの供給を支えます。',selectionReason:'北の果樹産地と、長期の園地管理・都市への流通を学べる。',sourceIds:['hirosaki']},
 {id:'mandarin',title:'みかん',color:'#c48634',category:'horticulture',overview:'有田川町の斜面には、石垣の段々畑で温州みかんを作る事例があります。',reason:'温暖な気候に加え、斜面の日当たりと排水、共同かん水、運搬・選別設備が栽培を支えます。果樹園の存在と自然の森林は別の土地利用です。',selectionReason:'温暖な沿岸・傾斜地の果樹を、りんごや平地の農業と対照できる。',sourceIds:['aridagawa']},
 {id:'milk',title:'生乳・酪農',color:'#527b9a',category:'livestock',overview:'別海と十勝に酪農の事例があります。乳用牛と肉用牛を一つの牛密度図で代用しません。',reason:'冷涼な気候と広い草地は酪農の条件の一部です。牧草、集乳、加工工場が生乳を牛乳や乳製品に変え、消費地へ届けます。',selectionReason:'草地・飼料・加工・流通と日本の食生活を結ぶ主要畜産品目。',sourceIds:['betsukai','betsukai-land','tokachi']},
 {id:'beef',title:'肉用牛',color:'#765b8a',category:'livestock',overview:'都城と十勝には肉用牛を育てる地域の事例があります。飼養頭数と牛肉の生産重量は別の指標です。',reason:'飼料の供給や繁殖・肥育、食肉加工のつながりが必要です。畜産の立地を、その場所の気候だけで決めることはできません。',selectionReason:'繁殖・肥育と飼料依存を扱い、生乳との用途の違いを明確にする。',sourceIds:['miyakonojo','tokachi']},
 {id:'pork',title:'豚',color:'#ae7072',category:'livestock',overview:'都城には養豚を含む畜産の事例があります。点は農場の位置や豚の密度を示しません。',reason:'豚の飼育には飼料と衛生管理、出荷・食肉加工の仕組みが必要です。地域内で育てることと、飼料まで地域内で賄うことを区別します。',selectionReason:'肉用牛・酪農と異なる飼育と飼料の仕組みを扱う主要畜産品目。',sourceIds:['miyakonojo']},
];

const coordinateMethod='資料に記載された地域の概略位置を編集して設定（WGS84経緯度）。農場・園地の測量位置ではない。';
const point=(site:Omit<JapanAgricultureSite,'geometryKind'|'coordinateMethod'|'extent'|'quantity'>):JapanAgricultureSite=>({...site,geometryKind:'representative-point',coordinateMethod,extent:null,quantity:null});
export const japanAgricultureSites:JapanAgricultureSite[]=[
 point({id:'agano-rice',name:'米｜阿賀野',coordinates:[139.225,37.835],products:['rice'],overview:'阿賀野市の米づくりと食品企業が連携する事例。',reason:'農地の管理・生産から加工までの関係を、平野の水田農業と合わせて読みます。',sourceIds:['agano']}),
 point({id:'tokachi-farming',name:'畑作・畜産｜十勝',coordinates:[143.0,42.93],products:['wheat','potato','milk','beef'],overview:'十勝の畑作と酪農・肉用牛の地域事例。代表点は十勝平野の概略位置です。',reason:'小麦・ばれいしょ・てんさい・豆類の輪作と大型機械を使う広い耕地が特徴です。家畜の用途は乳用と肉用を区別します。',sourceIds:['tokachi']}),
 point({id:'nakasatsunai-wheat',name:'小麦｜中札内',coordinates:[143.13,42.697],products:['wheat'],overview:'小麦と豆類を組み合わせる農協の生産事例。',reason:'えだまめなどを組み込む輪作と共同の収穫・乾燥調製が安定生産を支えます。資料では日本めん向け品種を扱います。',sourceIds:['nakasatsunai']}),
 point({id:'tsumagoi-cabbage',name:'キャベツ｜嬬恋',coordinates:[138.47,36.48],products:['cabbage'],overview:'浅間山北麓の高原で夏秋キャベツを作る事例。',reason:'冷涼な夏と農地開発の基盤、全国への出荷を合わせて考えます。',sourceIds:['tsumagoi']}),
 point({id:'yatsushiro-tomato',name:'トマト｜八代周辺',coordinates:[130.55,32.5],products:['tomato'],overview:'八代・氷川・宇城の干拓地で栽培される塩トマトのGI事例。',reason:'塩分のある土壌の条件と栽培管理が品質に関わります。登録区域全部の輪郭や一般トマトの数量分布は表していません。',sourceIds:['yatsushiro','tomato-season']}),
 point({id:'hirosaki-apple',name:'りんご｜弘前',coordinates:[140.47,40.6],products:['apple'],overview:'弘前のりんご産地の事例。',reason:'複数年続く果樹の管理と産地で蓄積された技術、消費地へ向けた選別・貯蔵を考えます。',sourceIds:['hirosaki']}),
 point({id:'aridagawa-mandarin',name:'みかん｜有田川',coordinates:[135.27,34.04],products:['mandarin'],overview:'有田川町の段々畑で温州みかんを栽培する事例。',reason:'斜面の日当たりと水はけ、かん水や運搬設備による管理が組み合わさります。',sourceIds:['aridagawa']}),
 point({id:'betsukai-milk',name:'酪農｜別海',coordinates:[145.02,43.395],products:['milk'],overview:'別海町の酪農と町内の生乳加工の事例。',reason:'冷涼な気候・広い牧草地と、集乳・牛乳や乳製品の製造をつなぎます。',sourceIds:['betsukai','betsukai-land']}),
 point({id:'miyakonojo-livestock',name:'肉用牛・豚｜都城',coordinates:[131.062,31.755],products:['beef','pork'],overview:'都城市で肉用牛・豚・鶏が飼育される地域事例。',reason:'飼料、出荷、食肉加工などの産業のつながりを読む地点です。年が不明な産出額順位は採用していません。',sourceIds:['miyakonojo']}),
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
 forest:{title:'森林の存在と、木材を使う仕組みを分ける',overview:'この便では全国の詳細な森林被覆図を収録していません。地図の緑や県境を森林域として読み替えず、林野庁の森林資源資料と木材需給を別々に読みます。',reason:'森林には水源涵養などの働きがあり、すべてが伐採して木材を出す場所とは限りません。木材利用は樹種・林齢、管理、搬出路、製材・加工、需要に左右され、森林の広さだけでは決まりません。'},
 gap:'国内の細地域数量図は未収録。2024年の市町村別詳細原表は取得403のため、この便の代表点に数量・順位・園地範囲を付けていません。県の総量から県内を一様に塗りません。',
 method:'点は公的資料で確認した産地・地域の概略位置。大きさは生産量を表さず、農場・園地の範囲も表しません。選択しても他の産地事例は残ります。',
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
 const site=japanAgricultureSites.find(s=>s.id===siteId);
 const product=japanAgricultureProducts.find(p=>p.id===topic);
 if(site&&topic!=='forest')return {title:site.name,overview:site.overview,reason:site.reason,sourceIds:site.sourceIds};
 if(product)return {title:product.title,overview:product.overview,reason:product.reason,sourceIds:product.sourceIds};
 return {...japanAgricultureReading[topic==='forest'?'forest':'all'],sourceIds:topic==='forest'?['forest-resources','wood-balance']:['municipal-method']};
}
export function japanAgriculturePointCollection(){return {type:'FeatureCollection' as const,features:japanAgricultureSites.map(s=>({type:'Feature' as const,id:s.id,geometry:{type:'Point' as const,coordinates:s.coordinates},properties:{id:s.id,name:s.name,products:s.products,geometryKind:s.geometryKind,coordinateMethod:s.coordinateMethod,extent:s.extent,quantity:s.quantity,sourceIds:s.sourceIds}}))};}
