const afsis={label:'AFSIS ACO No.33（2024年12月、2023年需給）',url:'https://www.aptfsis.org/wp-content/uploads/aco-pdfs/ACO%20No.33.pdf'};
const coffee={label:'FAO・東南アジアのコーヒー生産報告（2000年代初め）',url:'https://www.fao.org/4/x6938e/x6938e05.htm'};
const rubber={label:'タイ投資委員会・天然ゴム産業（2018年）',url:'https://www.boi.go.th/upload/content/Rubber_Industry2018_5bb33471b8292.pdf'};
const palm={label:'MPOB・油ヤシとパーム油の水利用研究紹介（2020年公開）',url:'https://opb.mpob.gov.my/consumptive-water-use-assessment-and-life-cycle-assessment-based-water-footprint-for-palm-oil/'};
const poultry={label:'FAO・タイの畜産と飼料・加工の歴史',url:'https://www.fao.org/4/w6437t/w6437t02.htm'};
export const southeastFarmGuide:Record<string,{reading:string;source?:{label:string;url:string}}>={
 rice:{reading:'メコン・紅河などの低地と島々の米を比べ、流域から届く水と、その場所に降る雨を分けて読みます。乾季の灌漑や塩水侵入も関わるため、年降水量だけで水田の条件は決まりません。下の精米需給では、生産の大きい地域にも輸入があることを確かめます。',source:{label:'FAO・世界銀行・メコンデルタと塩水侵入（2016年）',url:'https://www.fao.org/fileadmin/templates/ex_act/pdf/Blue_Carbon_case_studies/Vietnam_Adaptation_to_salinity.pdf'}},
 maize:{reading:'米とトウモロコシの分布を重ね、低地・丘陵での重なりと違いを比べます。トウモロコシの供給は食用だけでなく家畜の飼料や加工とも関わります。タイの養鶏の事例と、ASEAN10か国の生産・輸入・国内利用を異なる範囲として読みます。',source:poultry},
 cassava:{reading:'キャッサバと米を切り替え、同じ場所に分布するかを標高や月ごとの雨と合わせて確かめます。下の需給は生いもの重量で、でん粉や乾燥製品そのものの重さとは異なります。多い生産がそのまま食用消費を意味するわけではありません。',source:afsis},
 sugarcane:{reading:'サトウキビの分布を米・トウモロコシと比べ、栽培と加工の段階を分けて読みます。地図はサトウキビの収穫面積、FAOSTATは茎の生産重量、下の需給は加工後の砂糖です。三つの値を同じ量の内訳には接続しません。',source:afsis},
 oilpalm:{reading:'スマトラ・ボルネオ・マレー半島を比べ、油ヤシの分布を月ごとの雨と重ねます。マレーシアでは雨を利用する栽培が多く、年の合計に加え少雨期も確かめます。油ヤシは樹木作物であり、森林の面積やパーム油の製品重量とは区別します。',source:palm},
 rubber:{reading:'タイ南部やマレー半島、島々のゴム栽培域を比べます。天然ゴムを集荷・加工してタイヤや手袋などへ届ける過程には、生産者と加工拠点のつながりがあります。産地と工場が同じ場所にあるとは限らず、気候と工業立地を別々に確かめます。',source:rubber},
 arabica:{reading:'アラビカとロブスタを別々に選び、高地の標高と雨の季節配分を比べます。FAO掲載の地域報告は、品種によって生育条件が異なることを説明しています。国全体のコーヒー生産統計は両種を含み、種類別の地図へ重複して配分しません。',source:coffee},
 robusta:{reading:'ベトナム中央高地と島々のロブスタを比べます。中央高地では雨季と乾季が明瞭で、開花期の水の確保が栽培に関わります。高温多雨という年単位の特徴だけで説明せず、同じ地点の標高と12か月の雨へ進みます。',source:coffee},
 cattle:{reading:'牛の代表点を米・トウモロコシの分布や人口と重ね、飼料と市場の位置関係を考えます。点の数や大きさは頭数の多さではなく、下の国別飼養頭数が別の数値資料です。飼養頭数を肉・乳の生産量へ直接換算しません。'},
 buffalo:{reading:'水牛と牛を切り替え、河川低地や島々で分布が重なるかを確かめます。水牛の頭数、乳の生産量、農作業への利用は異なる情報です。地図は2020年の密度を基にした概略で、個々の家畜の用途を示しません。'},
 pig:{reading:'豚の分布と都市・耕地を比べ、飼料を得る場所と製品を消費する場所の関係を考えます。飼養密度だけから飼育方式、疾病、住民の食習慣や宗教は判断できません。国別の飼養頭数と豚肉の生産量も分けて読みます。'},
 chicken:{reading:'鶏の分布を人口やトウモロコシと比べます。タイでは飼料供給と食鳥処理・販売を結ぶ仕組みが発達した歴史があります。羽数の集中、鶏肉・卵の生産、加工品の輸出は別の段階なので、同じ地図の密度としては扱いません。',source:poultry},
 forest:{reading:'大陸部の山地とボルネオなどの島々を比べ、森林の土地利用と樹木作物の農園を区別します。森林が広い国、丸太材を生産する国、木材製品を加工・輸出する国は同じ順位とは限りません。下の11か国表で面積、体積、金額をそれぞれ比較します。'},
};
