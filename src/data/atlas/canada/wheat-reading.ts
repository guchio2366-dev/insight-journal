export const wheatSources={
 map:'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-025-eng.htm',
 table:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210035901',
 management:'https://www.gov.mb.ca/agriculture/crops/crop-management/spring-wheat.html',
 winter:'https://www.gov.mb.ca/agriculture/crops/crop-management/winter-wheat.html',
 classes:'https://www.grainscanada.gc.ca/en/grain-quality/grain-grading/wheat-classes.html',
 japan:'https://agriculture.canada.ca/en/international-trade/reports-and-guides/market-overview-japan',
 industry:'https://tc.canada.ca/en/corporate-services/transparency/corporate-management-reporting/transportation-canada-annual-reports/transportation-canada-2024/role-canada-s-transportation-network',
};
export const wheatReading=[
 {title:'場所から読む：プレーリーと東部を比べる',body:'詳細内の「旧ドット原図」の読み方です。プレーリーは西からアルバータ、サスカチュワン、マニトバの3州です。地図のEdmonton（エドモントン）、Regina（レジャイナ）、Winnipeg（ウィニペグ）を手掛かりに、州境と南部の赤い点の広がりを追います。東部は拡大枠AのToronto（トロント）、Ottawa（オタワ）、Québec（ケベック）を探してください。オンタリオ・ケベックにも小麦の面積があります。図は全小麦の面積量であり、種類別の分布、農場位置、収量の地図ではありません。',source:wheatSources.map},
 {title:'育つ条件：生育期間と、根が使える水・土壌',body:'春小麦では春に播いて収穫まで育つ期間を確保します。マニトバ州の栽培資料は早い播種、排水のよい土壌、発芽に使える水を重視しています。雨が多いほど常によいのではなく、根が使える水と排水の両方を考えます。秋に播く冬小麦は冬を越すため、同じ小麦でも播種時期と越冬条件が異なります。同州の冬小麦資料では、刈株を残して雪を留める越冬管理を重視します。Reginaの気温・降水の季節を読み、畑の土壌水分やその年の天候とは区別しましょう。平年値だけから収量や栽培可能範囲を決めることはできません。',source:wheatSources.management,extraSource:wheatSources.winter},
 {title:'生産と用途：面積だけでは量も品質も決まらない',body:'広い平原は機械で作業する地形の条件ですが、それだけで安い大量生産が成立するわけではありません。播種、輪作、土壌に応じた施肥、病害対策、コンバインによる収穫、乾燥・貯蔵をつなぐ管理が必要です。水分と窒素の管理は量だけでなく粒の品質にも関わります。Canadian Grain Commissionは製粉・加工に使う性質によって小麦を分類しています。パン向けの硬質春小麦、パスタのセモリナに使うデュラム、菓子向けの軟質小麦を同じ用途と考えず、下の表で分けて読みます。',source:wheatSources.management,extraSource:wheatSources.classes},
 {title:'輸送：内陸の穀物を鉄道と港で市場へつなぐ',body:'畑で収穫できても、買い手へ運べなければ輸出商品にはなりません。Transport Canadaの2024年報告では、プレーリーの東西鉄道と支線が農産物を市場へつなぎ、太平洋港へ輸出貨物を運ぶ仕組みを説明しています。西岸のVancouver（バンクーバー）は穀物輸出を担う港の一例で、鉄道網に接続します。これは代表的な経路の説明であり、全小麦がこの港を通るという意味ではありません。自然環境の地図で内陸と西岸の位置を確かめ、距離を越える設備・輸送の条件を考えます。',source:wheatSources.industry},
 {title:'日本などの需要と品質の制度が産地へ戻る',body:'AAFCの2023年貿易を扱う日本市場資料では、小麦はカナダから日本への主要輸出品で、プレーリー3州が主な供給州とされています。どの用途に使うかという需要は、求める粒・タンパク質・製粉特性の違いにつながります。Canadian Grain Commissionの品種指定と等級の仕組みは、品種が各クラスの上位等級に適格かを生産者や取扱業者が確認するためのものです。自然条件だけで作付けを説明せず、買い手の要求と品質制度が品種選択や管理へ戻る関係も読みます。2023年の貿易説明を現在の数量・価格・輸入政策と読み替えないでください。',source:wheatSources.japan,extraSource:wheatSources.classes},
];
export const wheatTypes=[
 {type:'春小麦（春に播く普通小麦）',timing:'春に播いて、その年に収穫',example:'CWRS：硬質赤色春小麦。パンや麺など',note:'「春小麦」とデュラムを別区分にするStatCan表と、春播きという時期の説明を区別する。'},
 {type:'デュラム小麦',timing:'マニトバの春播き栽培資料にも登場',example:'CWAD：セモリナ、パスタ、クスクス',note:'年次表では独立した内訳。全小麦へ追加して二重に数えない。'},
 {type:'冬小麦',timing:'秋に播き、越冬して翌年収穫',example:'硬質冬小麦はパン・麺、軟質冬小麦は菓子など',note:'全小麦の作付面積は秋播き冬小麦を含む。「越冬後に残った面積」と混同しない。'},
];
