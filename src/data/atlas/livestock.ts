export const livestockKinds=[{id:'beef',label:'肉牛',symbol:'牛',color:'#8f4f35'},{id:'dairy',label:'酪農',symbol:'乳',color:'#356b7a'},{id:'hogs',label:'養豚',symbol:'豚',color:'#a86272'},{id:'broilers',label:'肉用鶏',symbol:'鶏',color:'#ad742c'},{id:'layers',label:'採卵鶏',symbol:'卵',color:'#7a6430'}] as const;
export type LivestockKindId=typeof livestockKinds[number]['id'];
export const livestockRegions=[
 {id:'northern-plains-beef',kindId:'beef',label:'北部グレートプレーンズ',anchor:[-101.2,46.3],summary:'半乾燥の草地が広がり、放牧を基礎にした肉牛の繁殖・育成が行われます。穀物地帯や肥育・食肉処理の拠点へつながる生産段階の一部です。'},
 {id:'southern-plains-beef',kindId:'beef',label:'南部グレートプレーンズ',anchor:[-101,35.3],summary:'草地と広い牧場を使う繁殖に加え、ハイプレーンズでは飼料穀物、輸送、食肉処理施設に近い肥育が集積します。繁殖地と肥育地は同じとは限りません。'},
 {id:'ozarks-beef',kindId:'beef',label:'オザーク周辺',anchor:[-93.1,36.7],summary:'丘陵の牧草地を利用しやすく、肉牛の繁殖・育成が定着しています。作物栽培に向く平坦地とは異なる土地利用を地図で比べられます。'},
 {id:'california-dairy',kindId:'dairy',label:'カリフォルニア中部',anchor:[-120.4,37],summary:'大規模な飼養、飼料調達、集乳・加工の仕組みが結びつく酪農地域です。乾燥地では用水と暑熱対策も生産条件になります。'},
 {id:'upper-midwest-dairy',kindId:'dairy',label:'上部中西部',anchor:[-89.7,44],summary:'飼料作物を得やすく、比較的冷涼な気候と長く蓄積した集乳・乳製品加工の基盤が酪農を支えます。'},
 {id:'northeast-dairy',kindId:'dairy',label:'北東部',anchor:[-75.4,42.6],summary:'牧草・飼料生産と大消費地への近さを背景に酪農が続いています。地形が細かな地域では農場規模や集乳条件も立地を左右します。'},
 {id:'idaho-dairy',kindId:'dairy',label:'スネーク川平原',anchor:[-114.2,43.2],summary:'灌漑農業による飼料供給と加工施設の集積が、大規模な酪農を支えます。水利用と暑熱管理を含めて読む地域です。'},
 {id:'iowa-hogs',kindId:'hogs',label:'アイオワ周辺',anchor:[-93.6,42],summary:'とうもろこし・大豆の大産地に重なり、飼料調達と食肉処理の近さが養豚の集積を支えます。作物と畜産の結びつきが特に見えやすい地域です。'},
 {id:'east-cornbelt-hogs',kindId:'hogs',label:'東部コーンベルト',anchor:[-85,40.2],summary:'飼料穀物への近さと加工・輸送網が養豚を支えます。都市市場にも接続しやすい一方、立地は気候だけでは説明できません。'},
 {id:'north-carolina-hogs',kindId:'hogs',label:'ノースカロライナ東部',anchor:[-78,35.3],summary:'飼料、繁殖・肥育、処理を結ぶ生産体制の集積が大きい地域です。中西部とは異なり、地元の穀物分布だけで立地を説明できません。'},
 {id:'southeast-broilers',kindId:'broilers',label:'南東部',anchor:[-84.7,33.1],summary:'温暖な南東部に、ふ化場、飼料工場、契約農場、処理施設を結ぶ一貫した生産網が集積します。鶏舎内の環境管理も生産を支えます。'},
 {id:'arklatex-broilers',kindId:'broilers',label:'アーカンソー周辺',anchor:[-92.3,34.8],summary:'飼料調達と加工施設を中心に肉用鶏の生産網が形成されています。自然条件に加え、企業による垂直的な連携が地域化を強めます。'},
 {id:'delmarva-broilers',kindId:'broilers',label:'デルマーバ半島',anchor:[-75.7,38.6],summary:'北東部の消費市場に近く、鶏舎、飼料、処理施設が近接する肉用鶏地域です。沿岸平野の土地利用と物流を合わせて読みます。'},
 {id:'iowa-layers',kindId:'layers',label:'アイオワ周辺',anchor:[-93,42.5],summary:'飼料穀物を得やすく、大規模な鶏卵生産と選別・流通の設備が集積します。同じ地域の養豚と重ねて選べます。'},
 {id:'penn-ohio-layers',kindId:'layers',label:'ペンシルベニア・オハイオ',anchor:[-80.6,40.6],summary:'飼料供給と人口の多い市場へのアクセスが採卵鶏の立地を支えます。肉用鶏とは生産・集荷の仕組みが異なります。'}] as const;
export const livestockReadings=[
 {id:'beef',title:'肉牛',body:'肉牛生産は、草地を使う繁殖・育成と、穀物飼料を多く使う肥育に分かれます。広い半乾燥草原を持つグレートプレーンズは繁殖に向き、中央・南部のハイプレーンズでは飼料、輸送、食肉処理施設への接続が肥育を支えます。このため「牛」の分布は一つの自然条件だけではなく、生産段階の連鎖として捉える必要があります。'},
 {id:'dairy',title:'酪農',body:'乳牛は毎日搾乳し、傷みやすい生乳を継続して集荷・加工します。したがって飼料と水、暑熱管理に加え、加工施設と冷蔵物流が近いことが重要です。上部中西部・北東部では冷涼さと既存の加工基盤、カリフォルニア・アイダホでは大規模飼養、灌漑飼料、加工網が異なる形の酪農地域をつくっています。山地や谷だけで酪農の立地は説明できず、生乳を生産する農場と乳製品を加工する工場も区別して読みます。'},
 {id:'hogs',title:'養豚',body:'豚はとうもろこし・大豆かすなどの濃厚飼料を効率よく肉へ変えるため、飼料費と処理施設への距離が立地に強く関わります。中西部では飼料穀物地帯との近さが優位になり、ノースカロライナでは繁殖・肥育・処理を結ぶ生産体制が集積を支えました。地図では自然条件と産業組織の両方を見ます。'},
 {id:'broilers',title:'肉用鶏',body:'肉用鶏は短い飼養期間で出荷し、温度を管理した鶏舎と安定した飼料供給を必要とします。米国南東部では、ふ化場、飼料工場、契約農場、処理施設を近距離で結ぶ仕組みが発達しました。そのため気候の適合だけでなく、生産工程をまとめる加工・物流網が地域の定着を説明します。'},
 {id:'layers',title:'採卵鶏',body:'採卵鶏は継続して卵を生産するため、飼料供給、鶏舎環境、選別・包装、日々の出荷が一体になります。アイオワ周辺では飼料穀物への近さ、東部では大消費地への接続が生産を支えます。肉用鶏と同じ「鶏」でも、産物と流通の条件が異なります。'}] as const;
export const livestockSources=[{publisher:'USDA ERS：酪農の生乳生産と加工（2026年1月更新）',url:'https://www.ers.usda.gov/topics/animal-products/dairy/background'},{publisher:'USDA NASS',url:'https://www.nass.usda.gov/Publications/AgCensus/2022/Online_Resources/Ag_Census_Web_Maps/Overview/index.php'},{publisher:'USDA ERS',url:'https://www.ers.usda.gov/topics/animal-products'}] as const;
