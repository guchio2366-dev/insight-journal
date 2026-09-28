export const westFields = [
  {id:'agriculture',label:'農林業',route:'agriculture',first:'wheat'},
  {id:'natural',label:'自然環境',route:'nature',first:'climate'},
  {id:'industry',label:'主要産業',route:'industry',first:'manufacturing'},
  {id:'population',label:'人口',route:'population',first:'density'},
];
const topic = (id,field,label,group,description,options={}) => ({id,field,label,group,description,...options});
export const westTopics = [
  topic('climate','natural','気候区分','気候区分','例えば、沿岸と内陸、低地と山地では、気温と雨の季節変化が異なります。色はケッペン＝ガイガーの気候区分です。場所を選ぶと格子の分類を、都市を選ぶと観測所の月別平年値を読めます。',{layer:'climate'}),
  topic('rivers','natural','河川・湖','水資源','川は水の通り道、流域は雨や雪解け水が集まる範囲です。国の外にある上流まで見ると、水の供給を国境だけで説明できない理由が分かります。線の太さは流量ではありません。',{vector:'rivers'}),
  topic('basins','natural','流域と上下流','水資源','同じ下流の出口につながる小流域をまとめて表示しています。地図で流域を選ぶか一覧を選ぶと、国境の外も含めた流域全体へ移動します。水利用量、飲める水の量、現在の渇水状況を示す図ではありません。',{vector:'basins'}),
  topic('groundwater','natural','地下水を蓄える地層','水資源','地下水は地層のすき間などに蓄えられます。この図は、広い地下水盆、複雑な地質構造、局所的で浅い帯水層を区別します。帯水層とは地下水を含み、水を通しやすい地層です。色が広いほど利用可能な水が多い、という意味ではありません。',{vector:'groundwater'}),
  topic('desalination','natural','淡水化と水の供給','水資源','淡水化は海水などの塩分を取り除いて淡水を得る工程です。河川・地下水などの自然の供給、淡水化、取水、利用後の再利用は別の量です。施設の能力だけでは、実際の供給量や利用可能量は分かりません。この地図は河川・湖を示し、淡水化施設や生産量の分布は示しません。',{vector:'rivers',sourceUrl:'https://www.fao.org/aquastat/en/overview/methodology/'}),
  topic('terrain','natural','地形','地形','標高の連続した色で、低地・高原・山地の位置関係を読みます。国の一覧からトルコやイランを選び、河川・気候と往復すると、山地が地域の中でどこに位置するかを比べられます。',{layer:'elevation'}),
  topic('contours','natural','標高（等高線）','標高（等高線）','等高線は、同じ標高の点を結ぶ線です。ここでは500m間隔で表示します。線が近接する場所ほど、広域の図で見た傾斜が大きいことを示します。登山や災害時の経路判断に使う詳細地形図ではありません。',{layer:'elevation',vector:'contours'}),
  ...[['wheat','小麦'],['barley','大麦']].flatMap(([id,label])=>[
    topic(id,'agriculture',label+'の収穫面積','作物','色は2020年の収穫面積を格子へ配分した推計です。詳説の国別生産量はFAOSTATから取得した別の統計で、地図の画素から算出していません。',{layer:id,faoItem:id==='wheat'?'15':'44',faoElement:'5510',unit:'t',breaks:[1e4,1e5,1e6,1e7]}),
    topic(id+'-irrigated','agriculture',label+'・灌漑栽培','作物','灌漑は、川・貯水池・地下水などから農地に水を供給することです。地図は灌漑栽培の収穫面積の推計で、取水量や水の消費量は示しません。',{layer:id+'-irrigated',faoItem:id==='wheat'?'15':'44',faoElement:'5510',unit:'t'}),
    topic(id+'-rainfed','agriculture',label+'・天水栽培','作物','天水栽培は降水を主な水源とする栽培です。同じ作物の灌漑栽培の図と比べられます。色が薄い場所を、気候だけを理由に栽培できない土地と判断することはできません。',{layer:id+'-rainfed',faoItem:id==='wheat'?'15':'44',faoElement:'5510',unit:'t'}),
  ]),
  topic('dates','agriculture','ナツメヤシの実・国別生産量','作物','ナツメヤシの実（デーツ）の年間生産量を国別に比較します。国全体に色を付ける比較図なので、国内の栽培地の分布は示しません。',{faoItem:'577',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  topic('olives','agriculture','オリーブ・国別生産量','作物','収穫したオリーブの量を比較します。オリーブ油の生産量とは異なります。統計にない国・年は灰色で表示し、0には置き換えません。',{faoItem:'260',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  ...[['sheep','羊','976'],['goat','山羊','1016'],['cattle','牛','866']].map(([id,label,item])=>topic(id,'agriculture',label+'の分布','畜産','地図は家畜の頭数を格子へ配分した密度の推計です。詳説の飼養頭数は国別統計です。家畜のいる場所と、牧草地の範囲、飼料を生産する場所は一致するとは限りません。',{layer:id,faoItem:item,faoElement:'5111',unit:'頭'})),
  topic('pasture','agriculture','永年採草・放牧地','土地・森林','多年にわたり草などの飼料植物に使う土地を、国別の面積で比較します。家畜が年間を通じて放牧される場所の精密な地図ではありません。',{faoItem:'6655',faoDomain:'Inputs_LandUse',faoElement:'5110',unit:'1000 ha',breaks:[10,100,1000,10000]}),
  topic('forest','agriculture','森林の分布と面積率','土地・森林','地図は森林の参考分布、国別統計は陸地面積に対する森林の割合です。国別の割合から国内の位置や樹種、木材の生産量は判断できません。',{layer:'forest',indicator:'AG.LND.FRST.ZS',unit:'%',breaks:[1,5,15,30,50]}),
  topic('oil','industry','石油資源レント','石油・天然ガス','資源レントは、石油の産出価値から採掘費用を差し引いた推計額です。ここではGDPに対する割合を比較します。産油量、輸出額、政府の石油収入とは異なる指標です。',{indicator:'NY.GDP.PETR.RT.ZS',unit:'%（GDP比）',breaks:[1,5,10,20,40]}),
  topic('gas','industry','天然ガス資源レント','石油・天然ガス','天然ガスの産出価値から採掘費用を差し引いた推計額の、GDPに対する割合です。生産量や埋蔵量の順位ではありません。石油と天然ガスを別の系列で確認できます。',{indicator:'NY.GDP.NGAS.RT.ZS',unit:'%（GDP比）',breaks:[.1,1,5,10,20]}),
  topic('manufacturing','industry','製造業の付加価値','製造業','付加価値は、生産額から中間投入の費用を差し引いた額です。GDPに占める製造業の割合を示します。鉱業や建設業を含む「産業全体」の割合とは区別します。工場の位置は示しません。',{indicator:'NV.IND.MANF.ZS',unit:'%（GDP比）',breaks:[5,10,15,20,30]}),
  topic('industrial-total','industry','産業全体の付加価値','製造業','鉱業、製造業、建設業、電気・ガス・水道などを含む産業の付加価値です。製造業だけの値と切り替えることで、両者の集計範囲の違いを確認できます。',{indicator:'NV.IND.TOTL.ZS',unit:'%（GDP比）',breaks:[10,20,30,40,60]}),
  topic('ports','industry','コンテナ港湾取扱量','港湾・物流','各国の港湾で扱ったコンテナの量を、20フィートコンテナ1個を1TEUとして数えた統計です。輸出額や貨物の重量ではなく、積替えを含む場合もあります。国単位の比較で、個々の港の位置や現在の稼働状況は示しません。',{indicator:'IS.SHP.GOOD.TU',unit:'TEU',breaks:[1e5,1e6,5e6,1e7,2e7]}),
  topic('services','industry','サービス業の付加価値','サービス','卸売・小売、運輸、金融、不動産、教育、医療、行政などを含む広い区分です。GDPに対する割合は、観光業だけの規模や雇用者の割合を意味しません。',{indicator:'NV.SRV.TOTL.ZS',unit:'%（GDP比）',breaks:[20,40,50,60,70]}),
  topic('density','population','人口分布','人口分布','人口は国の中でも一様には分布しません。格子ごとの人口密度の推計を表示します。国別人口は詳説に、都市中心部の人口は都市の主題に分けて掲載します。',{layer:'population',indicator:'SP.POP.TOTL',unit:'人'}),
  topic('cities','population','都市中心部','都市','同じ方法で抽出した都市中心部を比較します。選んだ都市の2025年の範囲に対する2000・2010・2020年の人口推計を掲載します。行政市の人口とは範囲が異なります。',{layer:'population',vector:'urban'}),
  topic('age-young','population','0〜14歳の割合','年齢構成','総人口に占める0〜14歳の人口の割合です。年少人口の割合だけで就学状況や生活水準は判断できません。国別の推計値であり、国内の年齢構成の違いは示しません。',{indicator:'SP.POP.0014.TO.ZS',unit:'%',breaks:[10,15,20,25,35]}),
  topic('age-working','population','15〜64歳の割合','年齢構成','総人口に占める15〜64歳の人口の割合です。この年齢層が全員働いているという意味ではなく、就業率や労働力率とは異なります。',{indicator:'SP.POP.1564.TO.ZS',unit:'%',breaks:[50,60,65,70,80]}),
  topic('age-older','population','65歳以上の割合','年齢構成','総人口に占める65歳以上の人口の割合です。同じ年の3つの年齢層を比較します。元の推計の丸めによって、合計が厳密に100%にならない場合があります。',{indicator:'SP.POP.65UP.TO.ZS',unit:'%',breaks:[3,5,10,15,20]}),
  topic('growth','population','人口増加率','増減・移動','1年間の人口変化を示す率です。出生と死亡の差に加えて移動も影響するため、人口増加率を出生率と読み替えないでください。',{indicator:'SP.POP.GROW',unit:'%／年',breaks:[-2,0,1,2,4]}),
  topic('migration','population','純移動数','増減・移動','転入者数から転出者数を引いた推計です。正なら転入超過、負なら転出超過を示します。難民数、外国生まれの人口、外国籍の人口とは異なり、人の移動経路も示しません。',{indicator:'SM.POP.NETM',unit:'人',breaks:[-1e5,-1e4,0,1e4,1e5]}),
];
export const statisticalColors=['#eef1e6','#d6e4c6','#adcbab','#7dad96','#4b8479','#285d65'];
export function observation(data, topic, code, year) {
  if(topic.indicator) {
    const row=data.worldBank.indicators[topic.indicator]?.find(r=>r.code===code&&r.year===year);
    return {value:row?.value??null,year,unit:topic.unit,source:'World Bank WDI',flag:null};
  }
  const rows=data.agriculture.countries[code]?.observations??[];
  const r=rows.find(r=>r.item===topic.faoItem&&r.elementCode===topic.faoElement&&r.year===year&&r.domain===(topic.faoDomain??'Production_Crops_Livestock'));
  const unit=r?.unit==='An'?'頭':r?.unit==='1000 An'?'千頭':r?.unit==='1000 ha'?'千ha':r?.unit??topic.unit??'';
  return {value:r?.value??null,year,unit,source:'FAOSTAT',flag:r?.flag??null};
}
