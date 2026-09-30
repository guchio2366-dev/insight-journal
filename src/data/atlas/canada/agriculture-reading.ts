export const canolaSources={
 map:'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-027-eng.htm',
 table:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210035901',
 management:'https://www.gov.mb.ca/agriculture/crops/crop-management/canola.html',
 japan:'https://agriculture.canada.ca/en/international-trade/reports-and-guides/market-overview-japan',
 industry:'https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Oilseeds+and+Products+Annual_Ottawa_Canada_CA2025-0017.pdf',
};
export const canolaReading=[
 {title:'場所から読む：プレーリーの南部に集まる',body:'プレーリーは西からアルバータ、サスカチュワン、マニトバの3州です。図のEdmonton（エドモントン）、Regina（レジャイナ）、Winnipeg（ウィニペグ）を手掛かりに、西から東へ赤い点の広がりを追います。サスカチュワンの南部から周辺州へ続く分布と、北部に広く分布していないことを見比べてください。点は栽培面積の量を表すので、農場の数や個々の農場位置は数えられません。',source:canolaSources.map},
 {title:'育つ条件：夏の熱と、根が使える水・土壌',body:'カノーラは冷涼な季節に適する油料作物です。しかし、寒い場所ならどこでも育つわけではありません。生育・成熟に使える季節が必要で、極端な暑さや水分条件も収量に関わります。種が発芽する土壌の水分、養分、排水、品種、輪作を合わせて考えます。Reginaの平年値で季節を読むことと、ある年・ある畑の土壌水分や収量を知ることは別です。',source:canolaSources.management},
 {title:'生産する条件：地形だけで安さは決まらない',body:'プレーリーの平原は機械作業を考える地形の入口です。実際に大量の作物を収穫するには、播種・防除・コンバインによる収穫、種子を傷めない管理、貯蔵中の水分・温度管理が必要です。機械や設備の費用、労働、輸送も生産条件になります。広い平原や冷涼な気候だけから「安く大量に作れる」と結論づけず、面積と生産量を分けて比較します。',source:canolaSources.management},
 {title:'加工・輸送：種子、油、搾りかすは違う商品',body:'収穫した種子は、そのまま出荷する経路と、搾油して油や飼料用の搾りかすにする経路があります。加工能力、鉄道、港、買い手がつながって初めて作物が市場へ届きます。2025年3月のUSDA報告は、米国向けの油の鉄道輸送やブリティッシュコロンビアの港からの海上出荷を扱っています。Vancouver（バンクーバー）は西岸の位置を読む手掛かりで、ここで特定の港別取扱量を示しているわけではありません。',source:canolaSources.industry},
 {title:'需要と制度が生産地へ戻ってくる',body:'日本はカナダのカノーラ種子の買い手の一つです。AAFCの2023年貿易を扱う資料では、供給州としてプレーリー3州が示されています。また、油の品質に応じた契約や品種選択もあります。2025年3月のUSDA報告では、燃料需要、貿易規制、政策への期待や不確実性が加工投資に関わると分析しています。自然条件が社会活動を一方的に決めるのではなく、需要・技術・制度が栽培や加工の選択へ戻る関係として読みます。報告当時の分析と現在の制度は区別します。',source:canolaSources.japan,extraSource:canolaSources.industry},
];
