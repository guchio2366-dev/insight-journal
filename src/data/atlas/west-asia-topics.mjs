import {westTopicReasons} from './west-asia-readings.mjs';
export const westFields = [
  {id:'agriculture',label:'農林業',route:'agriculture',first:'farming-overview'},
  {id:'natural',label:'自然環境',route:'nature',first:'climate'},
  {id:'industry',label:'主要産業',route:'industry',first:'manufacturing'},
  {id:'population',label:'人口',route:'population',first:'density'},
];
const topic = (id,field,label,group,description,options={}) => ({id,field,label,group,description,...options});
export const westTopics = [
  topic('farming-overview','agriculture','農畜産の分布','作物・畜産','小麦・大麦・羊・山羊・牛の正値推計格子を全て同時に残します。輪郭は作物の概略域、点は家畜の代表格子の補助表示です。色は品目の区別で、重なる色や面積は生産量・飼養頭数の大小を示しません。2020年の推計で、農地や放牧地の境界ではありません。'),
  topic('climate','natural','気候区分','気候区分','例えば、沿岸と内陸、低地と山地では、気温と雨の季節変化が異なります。色はケッペン＝ガイガーの気候区分です。場所を選ぶと格子の分類を、都市を選ぶと観測所の月別平年値を読めます。',{layer:'climate'}),
  topic('rivers','natural','河川・地下水','水資源','河川・湖と、地下水を蓄える地層の広域区分を同時に示します。ナイル川沿い、チグリス・ユーフラテス川沿いの農地と、河川の少ないアラビア半島の地下水を比べます。線の太さは流量、斜線の広さは貯水量ではありません。',{vector:'rivers'}),
  topic('precipitation','natural','降水量（観測所の平年値）','水資源','気象庁ClimatViewに収録した18観測所の月別降水量を表示します。12か月の値が揃う観測所だけ年合計を求めます。点は観測所の値で、点と点の間や国全体の雨量を塗り分けた図ではありません。平年期間は観測所ごとに確認してください。'),
  topic('annual-precipitation','natural','年降水量の分布','水資源','GPCC／DWD v2025の1991–2020年平年値です。雨量計の観測に基づいて補間された0.25°原格子で、12か月が揃う格子の月別降水量を合計しています。250mm間隔の青い色帯と境界は同じ広域の平滑化格子から作り、地点の数値は保存済み原格子から読みます。拡大しても観測点や谷ごとの雨量は分かりません。年降水量は河川流量・地下水涵養量・現在の利用可能な水量とは異なります。',{layer:'annual-precipitation'}),
  topic('basins','natural','流域と上下流','水資源','同じ下流の出口につながる小流域をまとめて表示しています。地図で流域を選ぶか一覧を選ぶと、国境の外も含めた流域全体へ移動します。水利用量、飲める水の量、現在の渇水状況を示す図ではありません。',{vector:'basins'}),
  topic('groundwater','natural','地下水を蓄える地層','水資源','地下水は地層のすき間などに蓄えられます。この図は、広い地下水盆、複雑な地質構造、局所的で浅い帯水層を区別します。帯水層とは地下水を含み、水を通しやすい地層です。色が広いほど利用可能な水が多い、という意味ではありません。',{vector:'groundwater'}),
  topic('desalination','natural','淡水化と水の供給','水資源','淡水化は海水などの塩分を取り除いて淡水を得る工程です。河川・地下水などの自然の供給、淡水化、取水、利用後の再利用は別の量です。施設の能力だけでは、実際の供給量や利用可能量は分かりません。この地図は河川・湖を示し、淡水化施設や生産量の分布は示しません。',{vector:'rivers',sourceUrl:'https://www.fao.org/aquastat/en/overview/methodology/'}),
  topic('terrain','natural','地形','地形','500m間隔の標高の輪郭だけで、低地・高原・山地の位置関係を読みます。トルコのアナトリア高原、イランの山地と高原、イラクの低地を比べましょう。高さの色面は「標高（等高線）」で確認できます。',{layer:'elevation'}),
  topic('contours','natural','標高（等高線）','標高（等高線）','500m間隔の高さの色面と、その境界に対応する等高線を表示します。標高は海面を基準とし、海面下の陸地も残します。色面と輪郭は同じ広域の平滑化格子から作り、地点の数値は保存済み原格子から読みます。細かな峰や谷の高さを測る詳細地形図ではありません。',{layer:'elevation',vector:'contours'}),
  ...[['wheat','小麦'],['barley','大麦']].flatMap(([id,label])=>[
    topic(id,'agriculture',label+'の収穫面積','作物','色は2020年の収穫面積を格子へ配分した推計です。詳説の国別生産量はFAOSTATから取得した別の統計で、地図の画素から算出していません。',{layer:id,faoItem:id==='wheat'?'15':'44',faoElement:'5510',unit:'t',breaks:[1e4,1e5,1e6,1e7]}),
    topic(id+'-irrigated','agriculture',label+'・灌漑栽培','作物','灌漑は、川・貯水池・地下水などから農地に水を供給することです。地図は灌漑栽培の収穫面積の推計で、取水量や水の消費量は示しません。',{layer:id+'-irrigated',faoItem:id==='wheat'?'15':'44',faoElement:'5510',unit:'t'}),
    topic(id+'-rainfed','agriculture',label+'・天水栽培','作物','天水栽培は降水を主な水源とする栽培です。同じ作物の灌漑栽培の図と比べられます。色が薄い場所を、気候だけを理由に栽培できない土地と判断することはできません。',{layer:id+'-rainfed',faoItem:id==='wheat'?'15':'44',faoElement:'5510',unit:'t'}),
  ]),
  topic('dates','agriculture','ナツメヤシの実・国別生産量','作物','ナツメヤシの実（デーツ）の年間生産量を国別に比較します。国全体に色を付ける比較図なので、国内の栽培地の分布は示しません。',{faoItem:'577',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  topic('olives','agriculture','オリーブ・国別生産量','作物','収穫したオリーブの量を比較します。オリーブ油の生産量とは異なります。統計にない国・年は灰色で表示し、0には置き換えません。',{faoItem:'260',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  topic('cattle-milk','agriculture','牛の生乳・国別生産量','畜産','牛から搾った未加工の生乳の国別生産量です。牛の飼養密度から搾乳地や乳製品工場の位置を推測できません。欠測国は0とせず灰色にします。',{faoItem:'882',faoElement:'5510',unit:'t',breaks:[1e4,1e5,1e6,1e7]}),
  topic('chicken-meat','agriculture','鶏肉・国別生産量','畜産','鶏肉の国別生産量です。飼養農場、飼料の産地、処理施設、輸出先の分布はこの国別統計に含まれません。',{faoItem:'1058',faoElement:'5510',unit:'t',breaks:[1e4,1e5,1e6,1e7]}),
  topic('hen-eggs','agriculture','鶏卵・国別生産量','畜産','殻付き鶏卵の国別生産量です。卵の数ではなく重量で比較し、飼養頭数や消費量と区別します。',{faoItem:'1062',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  topic('rice','agriculture','米・国別生産量','作物','FAOSTATの米の国別生産量です。国を塗る図から水田の位置、灌漑面積、単収は分かりません。未収録国の値を0にしません。',{faoItem:'27',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  topic('cattle-meat','agriculture','牛肉・国別生産量','畜産','骨付き生鮮・冷蔵牛肉の国別生産量です。牛の飼養頭数・密度、輸入牛の処理量、国内消費量と同じ値ではありません。',{faoItem:'867',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
  topic('buffalo-milk','agriculture','水牛の生乳・国別生産量','畜産','水牛から搾った未加工の生乳の国別生産量です。牛の生乳とは別品目で、国全体の値を水牛の飼養地や工場の位置へ配分しません。',{faoItem:'951',faoElement:'5510',unit:'t',breaks:[1e3,1e4,1e5,1e6]}),
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
  topic('ethnicity','population','民族に結びついた掲載居住域','人種・民族','GeoEPRに掲載された政治的に関連する集団の居住域の概略です。全民族の分布、各地点の多数派や人口割合を示しません。居住域は重なり、移動や歴史・制度とともに変わります。地形や気候だけで民族の形成を説明しません。',{vector:'settlements'}),
  topic('religion','population','宗教に結びついた掲載居住域','宗教','EPR-EDの集団内宗教情報をGeoEPRの掲載居住域に結びつけた概略です。その場所の住民全員の宗教、信者割合や信仰実践の強さを表しません。全宗教・全地域を網羅せず、重なりもあります。',{vector:'settlements'}),
  topic('cities','population','都市中心部','都市','同じ方法で抽出した都市中心部を比較します。選んだ都市の2025年の範囲に対する2000・2010・2020年の人口推計を掲載します。行政市の人口とは範囲が異なります。',{layer:'population',vector:'urban'}),
  topic('age-young','population','0〜14歳の割合','年齢構成','総人口に占める0〜14歳の人口の割合です。年少人口の割合だけで就学状況や生活水準は判断できません。国別の推計値であり、国内の年齢構成の違いは示しません。',{indicator:'SP.POP.0014.TO.ZS',unit:'%',breaks:[10,15,20,25,35]}),
  topic('age-working','population','15〜64歳の割合','年齢構成','総人口に占める15〜64歳の人口の割合です。この年齢層が全員働いているという意味ではなく、就業率や労働力率とは異なります。',{indicator:'SP.POP.1564.TO.ZS',unit:'%',breaks:[50,60,65,70,80]}),
  topic('age-older','population','65歳以上の割合','年齢構成','総人口に占める65歳以上の人口の割合です。同じ年の3つの年齢層を比較します。元の推計の丸めによって、合計が厳密に100%にならない場合があります。',{indicator:'SP.POP.65UP.TO.ZS',unit:'%',breaks:[3,5,10,15,20]}),
  topic('growth','population','人口増加率','増減・移動','1年間の人口変化を示す率です。出生と死亡の差に加えて移動も影響するため、人口増加率を出生率と読み替えないでください。',{indicator:'SP.POP.GROW',unit:'%／年',breaks:[-2,0,1,2,4]}),
  topic('migration','population','純移動数','増減・移動','転入者数から転出者数を引いた推計です。正なら転入超過、負なら転出超過を示します。難民数、外国生まれの人口、外国籍の人口とは異なり、人の移動経路も示しません。',{indicator:'SM.POP.NETM',unit:'人',breaks:[-1e5,-1e4,0,1e4,1e5]}),
];
export const statisticalColors=['#eef1e6','#d6e4c6','#adcbab','#7dad96','#4b8479','#285d65'];

// Reading goals use the shipped distributions. They do not infer facilities,
// water availability or migration routes from country-level statistics.
const compare=(topic,label,explanation)=>({topic,label,explanation});
const readings={
  'annual-precipitation':{message:'雨の多い場所と少ない場所を面で読み、農地へ水を届ける方法を比べる。',reason:'トルコの黒海沿岸・内陸、イランの山地、アラビア半島を選び、年降水量の違いを確かめましょう。天水小麦は雨を主な水源とし、灌漑小麦は河川・貯水池・地下水などからの供給も受けます。年合計だけで栽培の可否は決まらず、生育期の雨・土壌・品種・灌漑設備と水の管理も関わります。',comparisons:[compare('wheat-rainfed','年降水量と天水小麦を比べる','1991–2020年の年降水量と2020年の天水小麦を比べます。雨を主な水源とする栽培を探し、生育期の雨・土壌・品種・経営も考えます。年合計は栽培限界や収量を示しません。'),compare('wheat-irrigated','年降水量と灌漑小麦を比べる','1991–2020年の年降水量と2020年の灌漑小麦を比べます。設備・貯水・地下水・水の配分も考えます。図の重なりは実際の水源・取水量・持続可能性を示しません。'),compare('precipitation','年降水量の格子と観測所を比べる','面的なGPCCの0.25°格子と、ClimatViewの18観測所の月別平年値を比較します。観測所の点と補間された格子は別の資料です。両方の期間・単位を確かめ、格子値を観測所の実測値へ読み替えません。'),compare('forest','年降水量と森林を比べる','年降水量の分布と2020年の森林の参考分布を比較します。気温・地形・土地利用・管理も森林の成立に関わります。森林画像から地点の分類や面積は求めず、国別面積率は別の統計として読みます。')]},
  precipitation:{message:'雨の量と季節を観測所で確かめ、水を届ける仕組みと合わせて読む。',reason:'沿岸と内陸の観測所を選び、年合計と月別の雨を比べましょう。作物への水の供給には、雨の季節だけでなく灌漑・貯水・送水や管理も関わります。18地点の初回収録で、国平均や地域を埋める雨量図ではありません。',comparisons:[compare('climate','観測所の雨と気候区分を比べる','観測所の点と気候分類の格子を同じ場所で比較します。点の平年値を格子や国全体の雨量へ読み替えず、原典の期間も確かめます。'),compare('wheat-rainfed','雨と天水小麦を比べる','18観測所の降水量と天水小麦の収穫面積を比較します。離れた畑の雨量や適地を点から推定せず、季節・栽培時期・経営も考えます。')]},
  ethnicity:{message:'掲載居住域の重なりを読み、集団の歴史や政治的な掲載範囲を区別する。',reason:'色は掲載集団の識別で、人数や最多民族の順位ではありません。暮らす場所には移動・都市の仕事・交通・制度も関わり、自然条件だけでは決まりません。掲載されない集団や場所を、集団がいない場所とは扱いません。',comparisons:[compare('density','掲載居住域と人口分布を比べる','掲載集団の居住域の概略と2020年の人口密度を比べます。人口格子は集団別人数ではなく、重なりから民族割合や多数派を求めることはできません。'),compare('religion','民族・宗教の掲載範囲を比べる','同じ掲載集団に結びつく二つの概略図を比べます。民族と宗教は一対一ではなく、地域住民の全構成や信者割合を表すものではありません。')]},
  religion:{message:'宗教に結びつく掲載域と、その場所の全住民の宗教を分けて読む。',reason:'資料は政治的に関連する集団に結びつく宗教情報です。宗教の分布には歴史・移動・都市や制度が関わり、自然環境から信仰を決めることはできません。分類の重なりと未掲載範囲も確かめましょう。',comparisons:[compare('ethnicity','宗教・民族の掲載範囲を比べる','宗教情報を結びつけた域と掲載集団の居住域を比較します。同じ場所でも集団内に多様性があり、当地の住民全体の信者割合は示しません。'),compare('density','掲載域と人口分布を比べる','宗教に結びついた掲載域と人口密度を比較します。人口密度は宗教別人口ではなく、色の重なりから信者数や多数派を求めることはできません。')]},
  climate:{message:'乾燥した内陸と沿岸・山地の違いを読み、水の供給方法まで考える。',reason:'地中海沿岸の冬の雨と内陸の乾燥は、作物が水を得る季節を変えます。雨温図で季節を確かめ、灌漑や水の管理が生産をどう支えるかを比べましょう。',comparisons:[compare('wheat-rainfed','気候と天水小麦を比べる','冬の雨や低温の分布と、降水を主な水源とする小麦の収穫面積を比較します。分類の色だけで栽培の可否を決めず、栽培時期・品種・経営も考えます。'),compare('wheat-irrigated','気候と灌漑小麦を比べる','乾燥帯でも灌漑栽培がある場所を探します。灌漑は自然条件を補いますが、この図から実際の取水量や持続可能性は分かりません。')]},
  rivers:{message:'川の水は国境を越えて届き、農地と都市をつなぐ。',reason:'ナイル川沿いのエジプトや、チグリス・ユーフラテス川沿いのイラクを探しましょう。水路や灌漑設備、水を分ける制度があって初めて、川の水は農業や暮らしに使えます。',comparisons:[compare('wheat-irrigated','川と灌漑小麦を比べる','川沿いの灌漑栽培を探し、川から離れた栽培地も比べます。近接は水源の証明ではなく、地下水・貯水・送水も考える手掛かりです。'),compare('density','川と人口分布を比べる','ナイル川沿いなどで水系と人口の集中を比べます。人口の分布は水だけでなく、仕事・交通・歴史にも支えられます。')]},
  basins:{message:'水を考える単位は、国だけでなく上流と下流を結ぶ流域。',reason:'流域は降水や雪解け水が同じ出口へ集まる範囲です。上流の取水・貯水と下流の農業・都市利用はつながるため、国境を越えた調整が必要になります。',comparisons:[compare('wheat-irrigated','流域と灌漑小麦を比べる','流域のどこに灌漑小麦があるかを読みます。図は地形上のつながりを示し、取水量や国家間の配分を測ったものではありません。')]},
  groundwater:{message:'地下水を含む地層の広がりと、使い続けられる水の量は別。',reason:'雨などが地下に浸透する補給を涵養といいます。揚水設備は地下水を農業や都市へ届けますが、利用を続けるには補給・取水・水質を合わせた管理が必要です。',comparisons:[compare('wheat-irrigated','帯水層と灌漑小麦を比べる','帯水層の広域区分と灌漑小麦を比較します。重なりだけでは地下水の利用や過剰取水を断定できません。')]},
  desalination:{message:'水の少なさへの対応には、淡水化の技術と供給を支える費用・制度が関わる。',reason:'淡水化で得た水を都市へ届けるには、エネルギー・設備・送水網が必要です。自然の水系と人口を見比べ、供給を技術と管理の両面から考えましょう。',comparisons:[compare('density','水系と人口分布を比べる','表示する元図は河川・湖です。人口の集中と水系の位置を比べられますが、淡水化施設・生産量・送水先は今回の図に収録していません。')]},
  terrain:{message:'山地・高原・低地の配置は、水の流れと土地の利用を読む出発点。',reason:'トルコとイランの山地・高原、イラクの低地を探しましょう。地形が水や交通の条件を変える一方、灌漑・道路・市場への接続が土地の使い方を変えます。',comparisons:[compare('wheat','地形と小麦の分布を比べる','低地と高原のどちらに小麦が広がるかを読みます。標高だけで収量や適地を決めず、水・気候・経営条件も考えます。'),compare('density','地形と人口分布を比べる','山地・低地と人口の集中を比べます。交通、都市の仕事、歴史によって同じ地形でも人口分布は変わります。')]},
  contours:{message:'同じ高さを結ぶ等高線から、山地と低地のつながりを読む。',reason:'線が密な場所と疎な場所を比べ、川が低い土地へ続く様子をたどりましょう。道路や灌漑の整備によって、地形の制約への対応は変わります。',comparisons:[compare('wheat','標高と小麦の分布を比べる','500m間隔の等高線と小麦の収穫面積を比較します。広域の地形であり、個々の畑の傾斜は示しません。')]},
  wheat:{message:'小麦の産地は雨と水の確保に支えられ、生産と食料供給は交通・市場へつながる。',reason:'トルコ・イランの高原やイラクの川沿いを探し、天水と灌漑の図を切り替えましょう。小麦は製粉されてパンなどの食料となり、国内生産だけでなく貿易も供給を支えます。',comparisons:[compare('climate','小麦と雨の季節を比べる','小麦の収穫面積を残して気候区分と比較します。雨温図の季節を確かめ、同じ気候区分でも灌漑や栽培時期が異なることを考えます。'),compare('rivers','小麦と河川を比べる','川沿いの産地と川から離れた産地を比べます。地図で近いことだけから水源を特定せず、灌漑・地下水・貯水にも目を向けます。')]},
  barley:{message:'大麦の分布は水の条件と飼料・食料の需要を合わせて読む。',reason:'小麦と大麦の産地を見比べ、天水と灌漑の違いを確かめましょう。家畜の飼料としての需要、栽培時期、技術や経営の選択も作物の分布に関わります。',comparisons:[compare('climate','大麦と気候を比べる','大麦の収穫面積と気候区分を比較します。乾燥帯にも栽培があるかを探し、水の確保方法と栽培時期を考えます。'),compare('sheep','大麦と羊の分布を比べる','飼料作物と羊の密度の近接・違いを見ます。地図は飼料の販売先や輸送を示さないため、重なりを直接の供給関係とは扱いません。')]},
  dates:{message:'デーツの国別生産量から、乾燥地域の農業を水の確保と市場の両面で考える。',reason:'ナツメヤシの実はデーツと呼ばれ、食料として流通します。国ごとの生産量を比べ、水の供給・栽培技術・加工や販売が生産を支えることを考えましょう。',comparisons:[compare('climate','デーツ生産と気候を比べる','国別生産量と国内の気候の違いを比較します。国全体の色は栽培地の位置を示さず、乾燥の強さから生産量を予測する図ではありません。')]},
  olives:{message:'オリーブは気候の季節と、栽培・加工・市場への接続を合わせて読む。',reason:'地中海に近い国々の生産量を比べましょう。果実は食品や油の原料となり、栽培だけでなく加工・販売も生産を支えます。国別の量から畑の位置は分かりません。',comparisons:[compare('climate','オリーブ生産と気候を比べる','地中海沿岸の夏の乾燥・冬の雨と国別生産量を比較します。国内の栽培地や灌漑の利用は、この国別統計には表れていません。')]},
  sheep:{message:'羊の分布は草地だけでなく、飼料・水・市場へのアクセスにも支えられる。',reason:'放牧と飼料を与える飼育では土地の使い方が異なります。家畜密度と放牧地の国別面積を区別し、飼料や畜産物の輸送も考えましょう。',comparisons:[compare('barley','羊と大麦の分布を比べる','羊の密度と飼料にも使われる大麦の収穫面積を比較します。重なりは手掛かりで、実際の飼料調達先は示していません。'),compare('climate','羊と気候を比べる','家畜密度を気候区分と比較します。水・飼料の供給や飼育方法が違うため、気候だけで飼育頭数は決まりません。')]},
  goat:{message:'山羊の分布は地形・植生と、飼育方法や販売先を合わせて読む。',reason:'山羊の密度と山地・高原の配置を見比べましょう。飼料の調達、水の供給、畜産物の需要や交通が飼育を支え、自然条件だけでは密度を説明できません。',comparisons:[compare('terrain','山羊と地形を比べる','山羊の密度と地形の違いを見ます。山地に近いことだけから放牧や飼育方法は特定できません。')]},
  cattle:{message:'牛の密度は飼料・水の供給と、都市や加工の需要へつながる。',reason:'牛のいる場所と飼料を育てる場所は一致するとは限りません。農業と人口の分布を比較し、飼料の輸送や畜産物の販売先を考えましょう。',comparisons:[compare('density','牛と人口分布を比べる','牛の密度と人口の集中の近接・違いを比較します。需要へのアクセスを考える手掛かりですが、販売経路や用途は示しません。')]},
  pasture:{message:'放牧地の面積と家畜の密度を分けて読み、土地の使い方を考える。',reason:'広い放牧地でも水や飼料の条件によって飼育密度は変わります。飼料を運ぶ飼育もあるため、国別面積から放牧の場所や家畜の数は決まりません。',comparisons:[compare('sheep','放牧地面積と羊の分布を比べる','国別の永年採草・放牧地面積と羊の密度を比較します。国の塗りと格子密度は集計の単位が異なり、国内の放牧地分布は未収録です。')]},
  forest:{message:'森林の位置と国別の面積率を分け、気候・地形・土地利用を合わせて読む。',reason:'森林の参考分布を沿岸や山地の配置と比べましょう。森林の広がりには水・気温とともに土地利用や管理が関わり、面積率だけでは樹種や林業の規模は分かりません。',comparisons:[compare('climate','森林と気候を比べる','森林の参考分布と気候区分の位置関係を比較します。参考画像から数値は抽出せず、国別面積率は別の統計として読みます。')]},
  oil:{message:'石油の資源レントの大きさと、経済を支える産業の広がりは別に読む。',reason:'地下資源があっても採掘・輸送・投資が必要です。資源レントのGDP比は価格・採掘費用・他産業の規模で変わるため、産油量や暮らしの豊かさへ直接読み替えません。',comparisons:[compare('manufacturing','石油と製造業のGDP比を比べる','同じ年の資源レントと製造業の付加価値を比較します。分母はGDPですが、資源レントは付加価値全体ではなく、両者を足して産業構成にはできません。'),compare('migration','石油と純移動数を比べる','国別の資源レントと純移動数を比べ、雇用や制度を考えます。移動には家族・教育・紛争なども関わり、この2指標だけで理由は特定できません。')]},
  gas:{message:'天然ガスが経済に占める重みを、生産量や埋蔵量と区別して読む。',reason:'資源を利用するには採掘・輸送設備と市場が必要です。資源レントのGDP比は価格や費用、他産業の規模でも変わるため、資源だけで経済の姿は決まりません。',comparisons:[compare('manufacturing','天然ガスと製造業を比べる','天然ガスの資源レントと製造業のGDP比を同じ年で比較します。設備投資や市場を考える手掛かりで、加工施設の分布は示しません。')]},
  manufacturing:{message:'製造業は資源だけでなく、人材・交通・市場への接続に支えられる。',reason:'国ごとのGDP比を比べ、資源レントや人口分布へ進みましょう。原料を加工して売るには労働力・技術・物流が必要で、政策や投資も立地に関わります。',comparisons:[compare('oil','製造業と石油資源レントを比べる','製造業のGDP比と石油資源レントを比較します。資源レントのGDP比が高いことと製造業の比率が高いことが同じかを問い、投資・人材・市場も考えます。'),compare('density','製造業と人口分布を比べる','国別製造業比率と人口密度を比較します。国内の人口の集中は見えますが、工場の位置や雇用先は収録していません。')]},
  'industrial-total':{message:'産業全体と製造業を分けると、経済の見え方が変わる。',reason:'産業全体には採掘・建設・電気や水道も入ります。製造業へ切り替えて比率の違いを読み、資源・都市整備・加工の役割を混同せず考えましょう。',comparisons:[compare('density','産業全体と人口分布を比べる','産業全体の国別GDP比と人口の集中を比較します。産業区分には多様な活動があり、都市の仕事や個別施設をこの比率で特定はできません。')]},
  ports:{message:'港湾の取扱量は、国内の生産と国際市場を結ぶ物流の手掛かり。',reason:'港は貨物の輸送や積替えを担います。港の設備だけでなく、道路・鉄道や貿易の制度も流通に関わります。国別のTEUは港の場所・輸出額・物流の効率とは別の量です。',comparisons:[compare('manufacturing','港湾取扱量と製造業を比べる','国別のコンテナ取扱量と製造業のGDP比を比較します。積替えや輸入も含むため、コンテナ取扱量を国内工業の生産量とは扱いません。')]},
  services:{message:'サービス業の比率から、都市と経済を支える多様な仕事を考える。',reason:'運輸・商業・金融・教育・医療などは、生産と人々の生活をつなぎます。人口分布との比較では都市の集中を見つつ、政策・投資・需要が仕事を支えることを考えましょう。',comparisons:[compare('density','サービス業と人口分布を比べる','国別のサービス業GDP比と人口の集中を比較します。観光だけを示す指標ではなく、都市ごとの産業や雇用率も示しません。')]},
  density:{message:'人口の集中は水と地形を手掛かりに、仕事・交通・歴史までつなげて読む。',reason:'エジプトのナイル川沿いと内陸の都市の集中を比べましょう。水の供給は暮らしを支えますが、設備・雇用・移動・政策によって乾燥した地域にも都市が発達します。',comparisons:[compare('rivers','人口と河川を比べる','ナイル川沿いなどの集中と川から離れた都市を比較します。河川の少なさを居住の不可能さと読み替えず、送水・地下水・淡水化や仕事も考えます。'),compare('manufacturing','人口と製造業を比べる','格子の人口密度と国別製造業GDP比を比較します。国内の集中と国全体の産業構成は尺度が異なり、個々の都市の雇用は示しません。')]},
  cities:{message:'同じ都市範囲の人口を比べ、増加と都市の広がりを区別する。',reason:'2000・2010・2020年を同じ2025年の範囲で比べます。都市人口の変化には出生・死亡と移動が関わり、住宅・交通・雇用や制度も暮らしの集中を支えます。',comparisons:[compare('terrain','都市の集中と地形を比べる','都市中心部の境界・人口密度と地形を比較します。地形の条件に加え、交通と仕事や歴史が立地に関わることを考えます。')]},
  'age-young':{message:'年少人口の割合は、教育・医療などの需要を考える手掛かり。',reason:'出生・死亡や移動の積み重ねが年齢構成を変えます。同じ年の年齢層を切り替え、人口規模と合わせて公共サービスの必要を考えましょう。',comparisons:[compare('density','年少人口比率と人口分布を比べる','国別の0〜14歳比率と人口密度を比較します。人口の多い場所がそのまま若い場所とは限らず、国内の年齢別分布は未収録です。')]},
  'age-working':{message:'15〜64歳の割合と、実際に働く人の割合を分けて考える。',reason:'年齢構成は労働や教育を考える基礎ですが、雇用には教育・産業・制度が関わります。年齢だけでは就業状況や経済の成果は決まりません。',comparisons:[compare('manufacturing','生産年齢人口比率と製造業を比べる','国別の15〜64歳比率と製造業GDP比を比較します。この年齢層の全員が働くわけではなく、労働力率や雇用者数は別の指標です。')]},
  'age-older':{message:'高齢人口の割合は、暮らしを支える医療・介護や制度を考える手掛かり。',reason:'年齢構成の違いには出生・死亡と移動の歴史が関わります。人口規模と合わせて考え、国別の割合を個人の暮らしの状態と混同しないようにしましょう。',comparisons:[compare('density','高齢人口比率と人口分布を比べる','国別の65歳以上比率と人口密度を比較します。都市と農村の年齢構成の違いは、この国別統計からは分かりません。')]},
  growth:{message:'人口の増減は出生・死亡と移動を合わせて読む。',reason:'増加率が高くても、その理由は一つではありません。純移動数と見比べ、仕事・家族・教育・政策や紛争が移動と人口に関わることを考えましょう。',comparisons:[compare('migration','人口増加率と純移動数を比べる','同じ年の人口増加率と純移動数を比較します。率と人数は別の単位で、純移動数だけを差し引いて自然増加率を求めることはできません。')]},
  migration:{message:'純移動数は移動の差を示し、人が動いた理由や経路は別に調べる。',reason:'仕事・家族・教育・安全など、移動の背景は多様です。資源レントや産業と比較しても、制度・政策・紛争などを含む背景を一つの指標で説明しないことが大切です。',comparisons:[compare('oil','純移動数と石油資源レントを比べる','純移動数と資源レントを比較します。雇用との関係を考える手掛かりですが、外国籍人口・難民数・移動経路はこの統計には示されません。')]},
};
export function westReading(t){
  const base=t.id.replace(/-(irrigated|rainfed)$/,'');
  const original=readings[base];
  const reason=westTopicReasons[t.id]??westTopicReasons[base]??original?.reason??'';
  const r=original?{...original,reason}:null;
  if(!r){
    const foodMessages={
      'cattle-milk':'牛の生乳はトルコ・イランで多く、飼料・水・冷蔵輸送まで合わせて読む。',
      'chicken-meat':'鶏肉はエジプト・トルコ・イランで多く、乾燥地でも飼料と水の供給が生産を支える。',
      'hen-eggs':'鶏卵の生産重量はトルコ・イランで多く、飼養頭数や消費とは分けて読む。',
      rice:'米はエジプト・イランの国別生産が大きく、水田への水の供給を考える。',
      'cattle-meat':'牛肉はトルコの国別生産が大きく、牛の密度と加工後の重量を分けて読む。',
      'buffalo-milk':'水牛の生乳はエジプトの国別値が大きく、ナイル川沿いの農業と比べる。',
    };
    return {message:foodMessages[t.id]??t.description,reason,comparisons:[]};
  }
  const annualComparison=compare('annual-precipitation','年降水量の分布と比べる',t.id.endsWith('-irrigated')?'2020年の灌漑小麦と1991–2020年の年降水量を比べます。水源・設備・水の配分も考えます。年合計は利用可能な水量を、収穫面積は取水量を示しません。':'2020年の天水小麦と1991–2020年の年降水量を比べます。雨を主な水源とする栽培を探し、生育期の雨・土壌・品種・経営も考えます。年合計は栽培限界や収量を示しません。');
  const annualAdditions=base==='wheat'?[annualComparison]:[];
  if(t.id.endsWith('-irrigated'))return {...r,message:'灌漑は降水を補って栽培を支え、水を届ける設備・費用・管理が関わる。',comparisons:[...r.comparisons,...annualAdditions]};
  if(t.id.endsWith('-rainfed'))return {...r,message:'天水栽培は雨の季節に支えられ、栽培時期・品種・経営が生産を左右する。',comparisons:[...r.comparisons,...annualAdditions]};
  const additions=t.id==='density'?[compare('ethnicity','人口分布と掲載民族居住域を比べる','人口密度の元分布を残し、掲載集団の居住域と比較します。人口格子は集団別人数ではなく、重なりから民族割合や多数派を求めることはできません。'),compare('religion','人口分布と宗教の掲載域を比べる','人口密度の元分布と、集団の宗教情報を結びつけた掲載居住域を比べます。当地の住民全体の宗教や信者割合は示しません。')]:['climate','wheat','barley'].includes(base)?[compare('precipitation','観測所の降水量と比べる','元の分布と18観測所の月別平年値の年合計を比較します。観測所間や国全体の雨量へ補間せず、季節と原典期間も確かめます。')]:[];
  return additions.length?{...r,comparisons:[...r.comparisons,...additions]}:r;
}
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

// The 2024 selection is limited to the eleven tonne-denominated series shipped
// with this region. Keep live country coverage beside every partial sum.
export const westProductionCandidates=['wheat','cattle-milk','barley','rice','chicken-meat','olives','dates','hen-eggs','cattle-meat','buffalo-milk','pork-meat'];
export function westProductionSelection(data,year=2024){
  return westProductionCandidates.map(id=>{
    const topic=westTopics.find(t=>t.id===id)??{label:'豚肉・国別生産量',faoItem:'1035',faoElement:'5510',unit:'t'};
    const values=data.countries.map(country=>observation(data,topic,country.code,year).value).filter(value=>Number.isFinite(value));
    return {id,label:topic.label.replace('・国別生産量','').replace('の収穫面積',''),sum:values.reduce((sum,value)=>sum+value,0),reported:values.length,missing:data.countries.length-values.length};
  }).sort((a,b)=>b.sum-a.sum).slice(0,10);
}
