import type { LatinTopic } from './latin-america-types';

// Points identify real places used to read each theme. Extents are navigation
// windows, never the measured boundaries of a biome, basin or population.
export const latinSocietyTopics: LatinTopic[] = [
  {
    id: 'andes', field: 'nature', title: 'アンデス――山脈が雨・水・人の移動を分ける', label: 'アンデス山脈',
    summary: '南米西岸の山脈は、プレートの沈み込みがつくった地形であり、標高と斜面の向きが気候・農業・都市の条件を変える。',
    countries: ['COL', 'ECU', 'PER', 'BOL', 'CHL', 'ARG', 'VEN'], location: [-68.15, -16.5], extent: [-81, -38, -64, 7], placeLabel: 'ラパス付近（ボリビア）',
    sections: [
      { title: '山脈はどうできたか', body: '海側のナスカプレートが南米プレートの下へ沈み込み、地殻を圧縮してアンデスを隆起させた。沈み込みの角度は一様ではなく、火山が連続する区間と途切れる区間がある。山脈全体を一本の火山列として読むと、地域差を見失う。（出典1）' },
      { title: '雨陰とは何か', body: '湿った空気が山を越えるとき、風上で上昇・冷却して雨を落とし、風下では乾燥しやすくなる。アタカマではアンデスが湿気の流入を妨げる。どちら側が湿潤かは緯度や卓越風で変わるため、山脈の東西を一律に分類しない。（出典2）' },
      { title: '高原・谷・海岸を分けて読む', body: '高地のキトのように、赤道に近くても山地に都市が成立する。高原、山間の谷、太平洋岸の低地では生活・交通の条件が異なる。国全体の平均標高より、都市の位置と周囲の起伏を合わせて見るほうが、道路や市街地の形を理解しやすい。（出典3）' },
      { title: '自然条件から社会へ', body: '山脈の形成と地震・火山活動は同じプレート運動に関係する。一方、都市の位置や産業を地形だけで説明することはできない。キトには先住民の都市と植民地行政の歴史が重なっており、山地の自然条件と歴史的な拠点形成を併せて読む。（出典1・3）' },
    ], relatedIds: ['atacama', 'andean-highlands', 'andean-farming', 'andean-copper'],
    sources: [
      { label: '1｜USGS：南米の沈み込み帯とアンデス形成', url: 'https://www.usgs.gov/publications/seismicity-earth-1900-2013-seismotectonics-south-america-nazca-plate-region', period: '2015年刊行' },
      { label: '2｜NASA：アンデスとアタカマの雨陰', url: 'https://science.nasa.gov/earth/earth-observatory/looking-down-on-the-andes-151670/' },
      { label: '3｜UNESCO：キトの地形と都市史', url: 'https://whc.unesco.org/en/list/2' },
    ],
  },
  {
    id: 'amazon', field: 'nature', title: 'アマゾン――雨を受け取り、大気へ戻す森林', label: 'アマゾンの水循環',
    summary: '大河・氾濫原・森林は別々の景観ではない。季節的な水位変化と森林からの蒸発散が、生態系と暮らしをつないでいる。',
    countries: ['BRA', 'PER', 'COL', 'BOL', 'ECU'], location: [-60.02, -3.12], extent: [-79, -16, -48, 5], placeLabel: 'ネグロ川・ソリモンエス川合流点付近',
    sections: [
      { title: '常緑でも季節はある', body: 'アマゾンを「毎日同じ雨が降る森」と考えるのは正確ではない。雨季・乾季の時期は赤道の南北で異なり、乾季の長さにも東西差がある。森林が緑を保つことと、雨量や河川水位が一定であることは別である。（出典1）' },
      { title: '蒸発散が大気へ水を渡す', body: '蒸発散は、地表からの蒸発と植物の葉からの蒸散を合わせた水の移動である。NASAが紹介する研究では、南部アマゾンの乾季末に森林からの水蒸気供給が増え、対流と雨季開始に関係する。森林は雨を受ける側であると同時に、水循環の一部を担う。（出典1）' },
      { title: '氾濫原にも種類がある', body: '中央アマゾンには、季節的に浸水するヴァルゼアやイガポ、浸水しにくい土地の森林が隣り合う。白水河川と黒水河川、湖、水路がつくる環境は均一ではない。陸と水の境目が季節で動くため、一枚の衛星写真だけで恒久的な岸線と判断しない。（出典2）' },
      { title: '水の豊かさと交通の弱さ', body: '川は都市と集落を結ぶ交通路でもある。2023年の渇水では、NASAの衛星画像にも河岸と砂州の露出が現れ、船の運航や住民への物資供給が妨げられた。年間の水量が多い地域でも、特定の季節・場所で利用できる水は不足しうる。（出典3）' },
    ], relatedIds: ['amazon-river-cities', 'cerrado', 'hydropower'],
    sources: [
      { label: '1｜NASA：アマゾンの季節性と森林の蒸発散', url: 'https://science.nasa.gov/earth/earth-observatory/the-amazons-seasonal-secret/', period: '2007年、観測研究の解説' },
      { label: '2｜UNESCO：中央アマゾンの氾濫原・森林', url: 'https://whc.unesco.org/en/list/998' },
      { label: '3｜NASA：2023年アマゾン渇水の衛星観測', url: 'https://science.nasa.gov/photojournal/amazon-drought/', period: '2023年' },
    ],
  },
  {
    id: 'cerrado', field: 'nature', title: 'セラード――草原・林・水源が重なる高原', label: 'セラード',
    summary: 'ブラジル内陸のセラードは、樹木のまばらな土地だけではない。土壌・地下水・地形の差が多様な植生と農業条件を生む。',
    countries: ['BRA'], location: [-47.88, -15.79], extent: [-61, -24, -42, -3], placeLabel: 'ブラジリア周辺の中央高原',
    sections: [
      { title: 'サバナにも多様な景観', body: 'セラードには開けた草原、低木を伴うサバナ、樹木が密なセラドン、川沿いの森林や湿地がある。ブラジリア植物園は、土壌の深さ、酸性度、水分条件によって植生が異なると説明する。衛星画像で樹木が少なく見えても、生態学的に価値の低い土地という意味ではない。（出典1）' },
      { title: '高原は水を分ける場所', body: 'セラードは複数の大河川につながる源流域を含む。高原の尾根が流域を分け、その下の谷や湿地に水が集まる。地図では「森林の濃い場所」だけでなく、源流、川沿いの植生、周辺の土地利用を一緒に追うと、下流との関係が見えてくる。（出典2）' },
      { title: '平坦でも自然に肥沃とは限らない', body: '広い平坦地は機械を使いやすいが、典型的な土壌は強い風化を受け、酸性で利用できる養分が少ない。石灰を入れて酸性を調整する「石灰施用」と施肥によって作物の生育条件を変えてきた。農業の成立は、平坦な地形と土壌改良技術の組合せとして理解する。（出典3）' },
      { title: '農地と自然植生を区別する', body: 'ダイズなどの耕地が広がる一方、残るサバナや川沿いの森林は生物の生息場所と水源域を構成する。作物の面積とセラード全体の面積は別の指標であり、国の生産量だけからどこまで転換されたかは分からない。農業の地図と植生の地図を往復して読む。（出典2・3）' },
    ], relatedIds: ['cerrado-soy', 'brazil-second-maize', 'amazon'],
    sources: [
      { label: '1｜ブラジリア植物園：セラードの植生と土壌', url: 'https://agenciabrasilia.df.gov.br/web/jardim-bot%C3%A2nico-de-bras%C3%ADlia/educacao-ambiental/flora-cerrado' },
      { label: '2｜ICMBio：セラードの自然と源流域', url: 'https://www.gov.br/icmbio/pt-br/assuntos/unidade-de-conservacao/unidades-de-biomas/cerrado' },
      { label: '3｜サンパウロ大学：セラード土壌と石灰施用', url: 'https://web01.ib.usp.br/cerrado/aspectos_solo.htm' },
    ],
  },
  {
    id: 'pampas', field: 'nature', title: 'パンパ――平坦な草原でも、水は均等ではない', label: 'パンパ',
    summary: 'アルゼンチンの温帯草原では、降水の東西差とわずかな高低差が、穀物畑・牧草地・冠水しやすい低地を分ける。',
    countries: ['ARG'], location: [-60.57, -33.89], extent: [-66, -39.5, -56, -30], placeLabel: 'ペルガミーノ周辺（アルゼンチン）',
    sections: [
      { title: '温帯の草原と降水の勾配', body: 'FAOの地域整理では、パンパはおおむね平坦で肥沃な土壌を持ち、東から西へ向かうほど乾燥する。東部では雨が年内に比較的分散するのに対し、西部では暖候期への集中が強い。同じ「パンパ」でも播種期や水不足の条件は一様でない。（出典1）' },
      { title: '平坦さは冠水にもつながる', body: '低平なフラッディング・パンパでは土地の傾きが小さく、水が速く流れ去らない。多雨期の浸水が長引き、畑作に向かない場所でも草地と放牧が重要になる。地形の「機械を使いやすい」という利点と「排水しにくい」という制約は表裏の関係にある。（出典1）' },
      { title: '草地から耕地への転換', body: '水はけや土壌条件のよい地域では、草原がダイズ、トウモロコシ、小麦、ヒマワリなどの耕地へ転換されてきた。家畜と作物を組み合わせる輪作も行われるが、土地利用は価格や技術で変わる。自然植生の区分を、そのまま現在の作物分布として扱わない。（出典1）' },
      { title: '土壌の管理も読み取る', body: 'パンパの土壌研究は、草地、耕地、植林地を比較して、土地利用による酸性度や養分収支の違いを検証している。肥沃な地域という説明だけで、養分の持ち出しや長期管理の必要性が消えるわけではない。農業統計と土壌条件を分けて確かめる。（出典2）' },
    ], relatedIds: ['pampas-farming', 'rio-plata-cities', 'chile-mediterranean'],
    sources: [
      { label: '1｜FAO：パンパの草地・降水・排水条件', url: 'https://www.fao.org/4/y8344e/y8344e0i.htm', period: '2005年刊行、地域の基礎説明。生産量の現況値には不使用' },
      { label: '2｜Álvarezほか：パンパの土地利用と土壌酸性化', url: 'https://doi.org/10.1016/j.still.2019.104434', period: '2020年' },
    ],
  },
  {
    id: 'atacama', field: 'nature', title: 'アタカマ――海に面しているのに、なぜ乾くか', label: 'アタカマ砂漠',
    summary: 'アンデスの雨陰と冷たい海流が重なり、太平洋に近いにもかかわらず極端に乾いた土地が広がる。海岸と高原の天候も異なる。',
    countries: ['CHL', 'PER'], location: [-68.2, -23.0], extent: [-74, -29, -66, -16], placeLabel: 'サンペドロ・デ・アタカマ付近',
    sections: [
      { title: '湿気を遮る山脈', body: '大陸内部からの湿った空気はアンデスを越える際に雨を落とし、西側へ届く水蒸気が少なくなる。山の風下が乾燥する「雨陰」が、チリ北部の少雨を説明する一つの仕組みである。ただし砂漠の乾燥は山だけでなく海の条件にも支えられている。（出典1）' },
      { title: '冷たい海と低い雲', body: '沖合ではフンボルト海流と湧昇によって冷たい海水が現れる。NASAの観測には海上の層積雲が写るが、内陸の砂漠は乾いている。海岸の低い雲や霧があることと、内陸へ十分な雨が降ることは同じではない。（出典2）' },
      { title: '砂漠にも雨や雪は降る', body: '2025年6月には、寒冷な上空の低気圧によって高地で珍しい降雪が起きた。極端な乾燥は長期の気候の特徴であり、「絶対に降水がない」という意味ではない。海岸、低地の砂漠、高原の観測点を混ぜず、平年値と個別の気象現象を分けて読む。（出典3）' },
      { title: '水を入口に鉱業を見る', body: '少雨の土地で産業や居住を考えるときは、資源の位置と同時に水の供給源を確認する必要がある。ここから銅鉱業や塩湖へ移り、鉱山・塩水・生活用水を区別して読むとよい。乾いた地表だけを見て、地下にも水が存在しないとは判断できない。（出典1・2を踏まえた読み方）' },
    ], relatedIds: ['andes', 'andean-copper', 'lithium-salars', 'chile-mediterranean'],
    sources: [
      { label: '1｜NASA：アンデスの雨陰', url: 'https://science.nasa.gov/earth/earth-observatory/looking-down-on-the-andes-151670/' },
      { label: '2｜NASA：南米西岸、湧昇と海上の雲', url: 'https://eol.jsc.nasa.gov/Collections/EarthObservatory/articles/SouthAmericasWestCoastWonders.htm', period: '2022年' },
      { label: '3｜NASA：アタカマの例外的な降雪', url: 'https://ciencia.nasa.gov/uncategorized/una-rara-nevada-en-el-desierto-de-atacama/', period: '2025年6月の現象' },
    ],
  },
  {
    id: 'chile-mediterranean', field: 'nature', title: 'チリ中部――冬の雨と夏の乾燥をつなぐ', label: 'チリ中部の季節',
    summary: 'サンティアゴ周辺では冬に雨が降り、夏は乾く。年雨量だけでなく、必要な季節に水があるかが都市と果樹農業を左右する。',
    countries: ['CHL'], location: [-70.67, -33.45], extent: [-73.8, -38, -69, -29], placeLabel: 'サンティアゴと中央谷',
    sections: [
      { title: '南半球の地中海性気候', body: '地中海性という名称は地中海そのものの位置ではなく、夏が乾燥し冬に降水が多い型を表す。チリ中部では気温が高い季節は主に1～2月、低い季節は6～7月になる。日本の夏の雨と同じ感覚で月別グラフを読むと、農業の水需要を取り違える。（出典1）' },
      { title: '同じ中部でも北ほど長く乾く', body: 'チリ気象局は、乾季がラ・セレナでは長く、南のコンセプシオンでは短くなると整理する。太平洋は海岸の気温を和らげ、内陸の谷は海岸と異なる条件を持つ。南北差と海岸・内陸差を重ねて初めて、一つの国の気候を立体的に読める。（出典1）' },
      { title: '農業へつながる季節のずれ', body: '生育期の夏が乾くという季節の組合せは、果樹園の水管理を考える入口になる。冬の雨量、夏の河川流量、灌漑設備を別々に確かめる必要がある。「日照が多いから果物ができる」だけで説明せず、水を届ける仕組みと産地の位置を合わせて見る。（出典1を踏まえた読み方）' },
      { title: '人口集中と同じ水系', body: '2024年国勢調査では首都圏州が全国の調査人口の40％を占めた。これはサンティアゴ市だけの人口ではなく州全体の値である。農業と都市が近接する中央部では、雨の分布と人口の分布を往復して、水の供給範囲と利用場所を区別して読む。（出典2）' },
    ], relatedIds: ['chile-fruit', 'latin-urbanization', 'atacama'],
    sources: [
      { label: '1｜チリ気象局：中部の気候特性', url: 'https://climatologia.meteochile.gob.cl/application/publicaciones/documentoPdf/climaticoAeronautico/climaticoAeronautico202106001.pdf', period: '2021年' },
      { label: '2｜チリINE：2024年国勢調査初報', url: 'https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2025/03/27/primeros-resultados-del-censo-2024-18.480.432-personas-fueron-censadas-en-chile-manteni%C3%A9ndose-la-tendencia-de-envejecimiento-de-la-poblaci%C3%B3n', period: '2024年調査・2025年公表' },
    ],
  },
  {
    id: 'caribbean', field: 'nature', title: 'カリブ海――貿易風と島ごとの水・災害条件', label: 'カリブ海の気候',
    summary: '暖かい海に囲まれていても、降水や災害の条件は島ごとに異なる。風、地形、海岸の低さと、暮らしの場所を合わせて読む。',
    countries: ['CUB', 'HTI', 'DOM', 'JAM', 'PRI', 'BHS', 'ATG', 'KNA', 'DMA', 'LCA', 'VCT', 'BRB', 'GRD', 'TTO'], location: [-61.0, 14.0], extent: [-85, 9, -58, 27], placeLabel: 'セントルシア周辺の小アンティル諸島',
    sections: [
      { title: '東から吹く貿易風', body: '貿易風は熱帯の東寄りの風で、カリブ海では雲を西へ運ぶ。暖かい海から供給される水蒸気と大気の循環が雨や嵐に関わる。海の上に雲が多いことだけで、すべての島に同じ量の雨が降るとは判断できない。（出典1）' },
      { title: '島を平均しない', body: '米国のカリブ地域向け資料は、山地、沿岸、雨の季節性を含む地域差を扱っている。限られた面積の島では、干ばつが農業・水道に、暴風雨が港・道路・電力に同時に影響しうる。島単位の平均値に加え、施設や居住地が海岸のどこにあるかを見る。（出典2）' },
      { title: 'ハリケーンの経路と被害は別', body: '貿易風は熱帯低気圧の西向き移動に関係するが、個々の進路や強さをそれだけで決めることはできない。また同じ風雨でも、建物、避難経路、水道・電力の状態によって被害が変わる。季節予報を、特定の島への上陸予測として読まない。（出典1・2）' },
      { title: '観光と暮らしを同じ地図で見る', body: '海岸は観光資源であると同時に、住民の生活と交通の場所でもある。観光業へ移るときは、訪問客の数だけでなく水・電力・港湾の供給条件を見る。自然災害を島の恒常的な性格として描かず、時期と場所を持つ出来事として扱う。（出典2を踏まえた読み方）' },
    ], relatedIds: ['caribbean-societies', 'caribbean-tourism', 'central-american-corridor'],
    sources: [
      { label: '1｜NOAA：貿易風と熱帯の雲・嵐', url: 'https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/what-are-trade-winds', period: '2025年' },
      { label: '2｜NOAA Climate Resilience Toolkit：米国カリブ地域の地形・沿岸・気候リスク', url: 'https://prod-01-asg-toolkit-climate.woc.noaa.gov/region/us-caribbean/previous-content', period: '対象は主にプエルトリコ・米領ヴァージン諸島' },
    ],
  },
  {
    id: 'panama-water', field: 'nature', title: 'パナマ――運河の通航能力は流域の雨にも左右される', label: 'パナマの水と運河',
    summary: '二つの海をつなぐ運河は淡水を使って船を上げ下げする。ガトゥン湖などの貯水量は、通航と住民への給水を同時に支える。',
    countries: ['PAN'], location: [-79.92, 9.25], extent: [-80.35, 8.6, -79.35, 9.55], placeLabel: 'ガトゥン湖・運河流域',
    sections: [
      { title: '海水だけで動く水路ではない', body: '運河を動かすのは、流域に降ってガトゥン湖・アルアフエラ湖に蓄えられる淡水である。船を水位の違う区間へ移す閘門では水を使う。水源の地図は船の航路そのものより広く、周辺の川と集水域を含めて読む必要がある。（出典1）' },
      { title: '給水と通航が同じ貯水池に依存', body: '運河庁によると、両湖はパナマ市周辺など全国人口の半数を超える人々への給水も担う。貯水量は商船だけの問題ではなく、生活用水との配分に関わる。「通航を増やせばよい」と考える前に、乾季を越すための水量を確認する必要がある。（出典1・2）' },
      { title: '2023～24年の渇水が示したこと', body: '渇水時には、船が沈み込める深さである喫水や、一日に通せる船の数が調整された。運河庁は節水設備と運用改善を進め、給水を優先した。これは2024会計年度の対応であり、その通航制限を現在も同じ条件で続くものとして表示しない。（出典2）' },
      { title: '水循環から物流へ', body: '雨が少ない→湖へ入る水が減る→使える水量に制約が生じる、という関係を押さえると、運河を自然条件と国際物流が出会う場所として読める。船の予約制度・料金・航路変更までを一つの気候要因だけで説明せず、運用側の対応を分けて確認する。（出典2）' },
    ], relatedIds: ['panama-logistics', 'central-american-corridor', 'caribbean'],
    sources: [
      { label: '1｜パナマ運河庁：水源・流域・生活用水', url: 'https://pancanal.com/agua/' },
      { label: '2｜パナマ運河庁：2024会計年度の渇水対応', url: 'https://pancanal.com/en/the-canals-fy-2024-financial-results-reaffirm-its-focus-on-sustainability-and-vision-for-the-future/', period: '2024会計年度' },
    ],
  },
  {
    id: 'brazil-southeast', field: 'population', title: 'ブラジル南東部――大人口を、都市圏と周辺のつながりで読む', label: 'ブラジル南東部',
    summary: 'サンパウロ・リオデジャネイロを含む南東部に人口が集中する。ただし地域人口、市の人口、都市圏人口はそれぞれ違う。',
    countries: ['BRA'], location: [-46.63, -23.55], extent: [-52, -26, -39, -16], placeLabel: 'サンパウロ（ブラジル）',
    sections: [
      { title: 'どの範囲の人口か', body: '2022年国勢調査初報で南東部の人口は約8,480万人だった。これはサンパウロ、リオデジャネイロ、ミナスジェライス、エスピリトサントの4州を合わせた値であり、サンパウロ都市圏の人口ではない。広域の集中と都市内の密度は別の尺度で見る。（出典1）' },
      { title: '人口集中と集積の利点', body: '大きな都市では雇用、技能、企業や市場が近接し、人や情報が結び付きやすい。世界銀行の地域研究は、人口密度だけで生産性が決まるのではなく、技能・都市形態・市場へのアクセスが重要だと整理する。製造業とサービス業の地図を合わせて読むと、住む場所と働く場所の関係が見える。（出典2）' },
      { title: '近いのに通いにくい問題', body: '都市の人口が増えても、住宅から雇用地までの移動が難しければ、集積の利点を十分に使えない。世界銀行は交通や混雑を都市生産性の課題として挙げる。人口の点や市境だけでなく、都市圏の広がり、通勤、住宅・公共サービスへの到達を考える必要がある。（出典3）' },
      { title: '現在の集中と人口移動を分ける', body: '南東部が最も人口の多い地域であることは、今も全方向から一方的に人口が流入することを意味しない。2022年国勢調査の2017～22年移動表には、南東部から北東部や南部へ移った人々も記録される。ある時点の人口と、一定期間の転入・転出を区別して読む。（出典4）' },
    ], relatedIds: ['brazil-manufacturing', 'brazil-northeast', 'latin-urbanization'],
    sources: [
      { label: '1｜ブラジル計画予算省・IBGE：2022年国勢調査初報', url: 'https://www.gov.br/planejamento/pt-br/assuntos/noticias/2023/junho/de-2010-a-2022-populacao-brasileira-cresce-6-5-e-chega-a-203-1-milhoes', period: '2022年、初報の丸め値' },
      { label: '2｜世界銀行：都市形態・技能・市場へのアクセス', url: 'https://blogs.worldbank.org/en/latinamerica/three-key-factors-boosting-productivity-latin-american-and-caribbean-cities', period: '2018年' },
      { label: '3｜世界銀行：生産性と雇用の地理', url: 'https://www.worldbank.org/en/region/lac/publication/the-evolving-geography-of-productivity-and-employment' },
      { label: '4｜IBGE：出生力・人口移動の標本調査初報', url: 'https://biblioteca.ibge.gov.br/visualizacao/livros/liv102187.pdf', period: '2017～2022年の居住地移動' },
    ],
    stats: [{ label: '南東部4州の人口（丸め値）', value: 84.8, unit: '百万人', year: '2022', scope: 'ブラジル南東部。国勢調査初報、都市圏人口ではない', sourceUrl: 'https://www.gov.br/planejamento/pt-br/assuntos/noticias/2023/junho/de-2010-a-2022-populacao-brasileira-cresce-6-5-e-chega-a-203-1-milhoes' }],
  },
  {
    id: 'brazil-northeast', field: 'population', title: 'ブラジル北東部――沿岸都市と内陸を、移動の両方向から読む', label: 'ブラジル北東部',
    summary: 'レシフェ・サルヴァドールなどの都市と半乾燥の内陸は、同じ条件ではない。北東部を人口が出ていくだけの地域として捉えない。',
    countries: ['BRA'], location: [-34.88, -8.05], extent: [-47, -17.5, -34, -2], placeLabel: 'レシフェ（ブラジル）',
    sections: [
      { title: '北東部と半乾燥地域は別の範囲', body: '行政上の北東部と、降水などの基準で定める半乾燥地域は一致しない。INSAの2024年区分には、北東部だけでなく南東部の一部も含まれる。沿岸の大都市まで一律に乾燥した土地と塗るのではなく、都市、内陸、半乾燥地域の境界を分けて読む。（出典1）' },
      { title: '人口を全国の中で位置づける', body: 'IBGEの2022年国勢調査確定表では、北東部の居住人口は約5,466万人である。これは9州全体の人口で、半乾燥地域の人口でも沿岸都市だけの人口でもない。国の人口集中を考える際は、南東部とともに大きな人口基盤を持つ地域として捉える。（出典2）' },
      { title: '流出と帰還・転入が同時にある', body: '2017～22年の居住地を比べたIBGE表では、北東部から南東部へ約51.7万人、逆方向にも約50.7万人が移動した。出生地の構成や年間移動者数ではなく、5年前と調査時点の居住地比較である。双方向の動きを見ると、単純な一方向の矢印では捉えられないことが分かる。（出典3）' },
      { title: '自然条件だけで移動を説明しない', body: '乾燥は水利用や生計の条件だが、個人の移住理由を気候だけで決めることはできない。就業、学業、家族、住宅などの違いが重なる。移動表が示すのは移った人数と場所であり、動機そのものではない。統計の示す事実と、その理由についての仮説を分ける。（出典3の統計範囲を踏まえた読み方）' },
    ], relatedIds: ['brazil-southeast', 'brazil-sugar', 'latin-urbanization'],
    sources: [
      { label: '1｜INSA：2024年半乾燥地域の区分', url: 'https://www.gov.br/insa/pt-br/assuntos/noticias/insa-mcti-disponibiliza-mapas-do-semiarido-com-a-mais-recente-delimitacao-da-regiao', period: '2024年区分' },
      { label: '2｜IBGE：2022年国勢調査、地域別居住人口', url: 'https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv102170.pdf', period: '2022年、表3' },
      { label: '3｜IBGE：2017年と2022年の居住地域の比較', url: 'https://biblioteca.ibge.gov.br/visualizacao/livros/liv102187.pdf', period: '5歳以上の居住者、標本調査初報・表6' },
    ],
    stats: [{ label: '北東部9州の居住人口', value: 54658515, unit: '人', year: '2022', scope: 'ブラジル北東部、IBGE国勢調査。半乾燥地域とは異なる', sourceUrl: 'https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv102170.pdf' }],
  },
  {
    id: 'amazon-river-cities', field: 'population', title: 'アマゾンの河川都市――森の中にも都市と産業がある', label: 'アマゾンの河川都市',
    summary: 'マナウスの成長は河川交通と産業政策の両方に関わる。人口の少ない広域の平均は、大都市や河岸の暮らしを隠してしまう。',
    countries: ['BRA', 'PER', 'COL'], location: [-60.02, -3.12], extent: [-76, -8, -47, 2], placeLabel: 'マナウス（ブラジル）',
    sections: [
      { title: '合流点は交通の結節点', body: 'マナウスはネグロ川とソリモンエス川が出会う付近にあり、NASAの衛星画像では異なる色の水と市街地の位置を同時に確認できる。森林の広がりだけを見ると都市を見落とすが、川沿いに視線を移すと拠点と交通路の関係が見えてくる。（出典1）' },
      { title: '都市を育てた産業政策', body: 'マナウスの工業地区ではテレビ、二輪車、電子機器などを製造する。SUFRAMAは初期の輸入商業から工業への展開と、1972年の工業地区開設を説明している。都市の集積は「川があるから」だけではなく、制度と企業の立地を含めて理解する必要がある。（出典2）' },
      { title: '低水位は生活の距離を伸ばす', body: '2023年の渇水では水路が浅くなり、物資輸送と集落へのアクセスが妨げられた。地図上の直線距離が変わらなくても、船が通れなくなると実際の移動時間や費用は変わる。河川交通の都市では水位の季節性が、日々の移動条件そのものになる。（出典3）' },
      { title: '流域全体と都市を混同しない', body: '中央アマゾンには大都市、河岸の集落、先住民の暮らし、保護地域が共存する。UNESCOの保全資料も住民との協力を管理の条件に挙げる。森林の面積から人の不在を推定したり、マナウスの産業を流域全体の生計とみなしたりせず、場所ごとの違いを読む。（出典4）' },
    ], relatedIds: ['amazon', 'brazil-manufacturing', 'latin-urbanization'],
    sources: [
      { label: '1｜NASA・ASTER：マナウスの河川合流点', url: 'https://asterweb.jpl.nasa.gov/gallery-detail.asp?name=Manaus' },
      { label: '2｜SUFRAMA：マナウス工業地区の産業と歴史', url: 'https://www.gov.br/suframa/pt-br/assuntos/industria' },
      { label: '3｜NASA：渇水による交通と集落への影響', url: 'https://science.nasa.gov/photojournal/amazon-drought/', period: '2023年' },
      { label: '4｜UNESCO：中央アマゾンの住民参加と保全', url: 'https://whc.unesco.org/en/list/998' },
    ],
  },
  {
    id: 'andean-highlands', field: 'population', title: 'アンデスの高地都市――標高と歴史が重なる居住空間', label: 'アンデスの高地都市',
    summary: 'キトなどの高地都市は、山地の制約の中で先住民の都市、植民地行政、現代の交通や住宅が重なって発達した。',
    countries: ['ECU', 'COL', 'PER', 'BOL'], location: [-78.51, -0.22], extent: [-80.5, -18, -66, 6], placeLabel: 'キト（エクアドル）',
    sections: [
      { title: '熱帯でも高い場所は違う', body: '赤道付近の都市でも、キトはアンデスの高地に位置する。緯度だけで低地の熱帯雨林と同じ生活条件と考えることはできない。都市の場所を標高・地形と重ねると、山に沿って延びる市街地と、周囲の低地との差が分かる。（出典1）' },
      { title: '都市の歴史は近代以前から続く', body: 'UNESCOは、キトが先行するインカの都市の跡に16世紀の植民地都市として建設されたことを説明する。先住民とヨーロッパの技術・表現が都市景観に重なる。現在の国境や言語だけを手掛かりに、地域の歴史を一つにまとめない。（出典1）' },
      { title: '地形が移動の条件をつくる', body: 'キトの歴史地区は火山の斜面や丘に囲まれ、都市計画には交通と歴史的建築の保全の両方が必要になる。地震・火山の危険もあるため、同じ人口数でも平野の都市とは整備の条件が違う。都市の点だけでなく、谷・斜面・移動経路を読む。（出典1）' },
      { title: '山地農業との往復', body: 'アンデス山脈の解説へ戻ると、山の形成と雨の違いを確認できる。農業へ進むと、作物・家畜・市場との関係を別の尺度で見られる。高地に住む人々を一つの民族・職業・生活様式で代表させず、都市の歴史と現在の産業を分けて理解する。（出典1・2を踏まえた読み方）' },
    ], relatedIds: ['andes', 'andean-farming', 'colombia-coffee', 'latin-urbanization'],
    sources: [
      { label: '1｜UNESCO：キトの地形・都市史・保全', url: 'https://whc.unesco.org/en/list/2' },
      { label: '2｜USGS：アンデスとプレート運動', url: 'https://www.usgs.gov/publications/seismicity-earth-1900-2013-seismotectonics-south-america-nazca-plate-region', period: '2015年' },
    ],
  },
  {
    id: 'rio-plata-cities', field: 'population', title: 'ラプラタ沿岸――ブエノスアイレスとモンテビデオを比べる', label: 'ラプラタ沿岸の都市',
    summary: '同じ河口の両岸にある都市でも、国勢調査の範囲は異なる。市、県・州、都市圏を区別すると人口と暮らしの比較が正確になる。',
    countries: ['ARG', 'URY'], location: [-58.38, -34.6], extent: [-61, -36.5, -54, -31], placeLabel: 'ブエノスアイレスとラプラタ川河口',
    sections: [
      { title: '河口の両岸を一緒に見る', body: 'ラプラタ川河口の西岸にブエノスアイレス、東側にモンテビデオが位置する。パンパの農業と沿岸の都市は近接するが、農産物の生産地と人の集まる場所は一致しない。国境を残しながら両岸を見渡すと、内陸と河口の位置関係を読みやすい。（出典1・2を踏まえた地理の読み方）' },
      { title: 'ブエノスアイレスの三つの範囲', body: '市名が同じでも、自治市、その周囲の連続市街地、広い都市圏は別である。INDECの2022年資料で用いる首都圏はブエノスアイレス自治市と周辺39パルティードを合わせる。自治市だけの人口を首都圏人口と比べると、見かけの差が大きく変わってしまう。（出典2）' },
      { title: 'モンテビデオの増減を見る', body: 'ウルグアイINEの県別資料は、2023年5月31日時点のモンテビデオ県の推計人口を約130.3万人と示す。出生と死亡も別に掲載されている。人口の変化は転出入だけではなく出生・死亡によっても起こり、県境の外へ広がる都市圏の変化とは分けて読む。（出典3）' },
      { title: '人口密度から生活条件へ', body: 'INDECの首都圏資料には地区別の人口密度、上下水道、住宅、就業などの地図がある。大都市の人口総数が同じでも、公共サービスへの到達は地区によって異なる。点の大きさだけで都市を比べず、居住と基盤設備の分布を確認する。（出典2）' },
    ], relatedIds: ['pampas', 'pampas-farming', 'latin-urbanization'],
    sources: [
      { label: '1｜FAO：パンパの耕地と都市の位置関係', url: 'https://www.fao.org/4/y8344e/y8344e0i.htm', period: '2005年、基礎説明' },
      { label: '2｜アルゼンチンINDEC：2022年首都圏統計・境界', url: 'https://www.indec.gob.ar/ftp/cuadros/poblacion/censo2022_rmba.pdf', period: '2022年国勢調査' },
      { label: '3｜ウルグアイINE：モンテビデオ県プロフィール', url: 'https://www5.ine.gub.uy/documents/CENSO%202023/Infograf%C3%ADas/Montevideo.pdf', period: '2023年、2025年3月版' },
    ],
    stats: [{ label: 'モンテビデオ県の推計人口', value: 1302950, unit: '人', year: '2023', scope: '2023年5月31日、モンテビデオ県。周辺県を含む都市圏ではない', sourceUrl: 'https://www5.ine.gub.uy/documents/CENSO%202023/Infograf%C3%ADas/Montevideo.pdf' }],
  },
  {
    id: 'central-american-corridor', field: 'population', title: '中米の都市と移動――定住・通勤・越境を分ける', label: '中米の都市と移動',
    summary: '中米は南北を通過する場所であると同時に、都市で暮らし働く人々の地域でもある。交通の接続と住宅・サービスを合わせて読む。',
    countries: ['GTM', 'BLZ', 'HND', 'SLV', 'NIC', 'CRI', 'PAN'], location: [-90.51, 14.63], extent: [-93, 7, -77, 18.5], placeLabel: 'グアテマラ市から中米地峡へ',
    sections: [
      { title: '都市化は機会と整備需要を生む', body: '世界銀行の中米都市化研究は、都市への人口集中が企業や雇用を結びつける一方、土地利用、交通、基盤設備の整備を必要とすると説明する。首都の点だけでなく周辺自治体と中小都市を含め、どこから通い、どこでサービスを受けるかを見る。（出典1）' },
      { title: '国ごとの違いを残す', body: '中米の都市化率や都市の貧困は、各国で同じではない。2017年の研究で示された値を現在の人口として使わず、比較の枠組みとして利用する。都市と農村の定義、基準年、自治体と都市圏の境界を揃えてから比較する必要がある。（出典1）' },
      { title: '移民は通過者だけではない', body: 'IOMは、中米・南米の移動に域内の就労、帰還、第三国からの移動など複数の経路があると整理する。ある国は出発地、通過地、到着地の役割を同時に持つ。国境で数えた通過件数は、その国に暮らす移民人口や同じ人数の定住を意味しない。（出典2）' },
      { title: '地峡の接続を暮らしから見る', body: 'パナマ運河のような国際物流の拠点と、住宅・水道・学校を利用する都市の生活は同じ土地に重なる。人口移動の矢印だけで地域を説明せず、定住者の交通、就業、公共サービスを並べて見る。経路や規模は時期によって変わるため、過去の流れを固定的な性格にしない。（出典1・2）' },
    ], relatedIds: ['panama-water', 'panama-logistics', 'central-coffee', 'caribbean-societies'],
    sources: [
      { label: '1｜世界銀行：中米都市化レビュー', url: 'https://documents.worldbank.org/curated/en/370521489645120053', period: '2017年。歴史的基準であり現在値ではない' },
      { label: '2｜IOM：南北アメリカの移動経路と複数の要因', url: 'https://repository.iom.int/handle/20.500.11788/2352', period: '2021年、報告対象時点の動向' },
    ],
  },
  {
    id: 'caribbean-societies', field: 'population', title: 'カリブの社会――島を越える移動と、多様な歴史', label: 'カリブの人々と移動',
    summary: 'カリブは単一の言語・文化・移住経路を持つ地域ではない。強制移動の歴史と、現在の就労・帰還・域内移動を区別して読む。',
    countries: ['JAM', 'CUB', 'HTI', 'DOM', 'PRI', 'TTO', 'BRB', 'GUY', 'SUR', 'ATG', 'KNA', 'DMA', 'LCA', 'VCT', 'GRD', 'BHS', 'BLZ'], location: [-61.51, 10.66], extent: [-85, 5, -56, 26], placeLabel: 'ポートオブスペイン（トリニダード・トバゴ）',
    sections: [
      { title: '歴史を平板にしない', body: 'UNESCOは、先住民の歴史、植民地支配、奴隷制と強制移動、アジアを含む各地からの移住が、カリブの社会を形づくったと説明する。これらは同じ条件の自由な移住ではなかった。現在の文化を一つの起源や国民性に還元せず、具体的な歴史と地域差を読む。（出典1）' },
      { title: '北米・欧州だけが移住先ではない', body: 'IOMの世界移民報告は、カリブから域外へ向かう移住に加え、島々の間の就労移動が長く続いてきたことを示す。移民を送り出す場所と受け入れる場所は重なりうる。海は島を隔てる一方、家族、雇用、文化を結ぶ経路でもある。（出典2）' },
      { title: '言語・国籍・出生地を区別する', body: '英語圏・オランダ語圏を対象としたIOMの整理でも、出入国、移民人口、就労許可などの統計は異なる対象を数える。出生国だけでは、途中に別の居住国を挟む移動は分からない。国籍や出生地を、言語・民族・宗教の代わりに使わない。（出典3）' },
      { title: '移動と地域の暮らし', body: 'IOMは送金、帰還、労働力の不足、高齢化などを関連する課題として扱う。ただしこれらの影響は家計や国によって異なる。観光業への移動から戻り、住む人々の雇用と家族のつながりを見ることで、島を訪問者向けの風景だけにしない。（出典3）' },
    ], relatedIds: ['caribbean', 'caribbean-tourism', 'central-american-corridor'],
    sources: [
      { label: '1｜UNESCO：小島嶼国の多様な文化と移動の歴史', url: 'https://www.unesco.org/en/articles/cutting-edge-small-island-developing-statescultural-diversity-driver-resilience-and-adaptation', period: '2022年' },
      { label: '2｜IOM：World Migration Report 2024、カリブ地域', url: 'https://publications.iom.int/system/files/pdf/pub2023-047-l-world-migration-report-2024_0.pdf', period: '2024年版' },
      { label: '3｜IOM DTM：英語圏・オランダ語圏カリブのデータ整理', url: 'https://dtm.iom.int/dtm-insights/may-2025-edition/data-update-regular-pathways-latin-america-and-caribbean', period: '2020～2024年の公開資料を整理、2025年公表' },
    ],
  },
  {
    id: 'latin-urbanization', field: 'population', title: '中南米の都市化――都市人口が多いことと、暮らしやすさは別', label: '都市化・住宅・年齢',
    summary: '早くから都市化した地域では、大都市の成長だけでなく郊外化、中小都市、高齢化、公共サービスの格差を合わせて読む必要がある。',
    countries: ['BRA', 'ARG', 'CHL', 'PER', 'COL', 'ECU', 'URY', 'BOL', 'PRY', 'VEN', 'GTM', 'SLV', 'HND', 'NIC', 'CRI', 'PAN', 'CUB', 'DOM', 'HTI'], location: [-77.04, -12.05], extent: [-91, -39, -34, 20], placeLabel: 'リマ（ペルー）を比較の入口に',
    sections: [
      { title: '都市化の段階を読む', body: '世界銀行の2021年整理では、中南米・カリブは1960年までに人口の過半が都市に暮らす地域となった。今日の課題を農村から巨大都市への移動だけで説明すると、中心部から周辺への移動や中小都市の役割を取り落とす。都市化率と都市圏内部の変化は別の指標である。（出典1）' },
      { title: '国と都市の定義を揃える', body: 'IBGEの2022年国勢調査では、ブラジル人口の87.4％が都市地域に居住した。これはブラジルの都市・農村区分による全国値で、中南米全体やサンパウロ都市圏の割合ではない。国際比較には定義の違いがあり、行政市と連続した市街地も区別する。（出典2）' },
      { title: '中心への集中だけではない', body: '年齢構成の変化と都市化は同時に進む。世界銀行は、中南米の都市が高齢化し、一部の中心部から周辺へ人口が移ることや、中小都市の重要性を指摘する。総人口が伸びなくても、高齢者の移動手段、住宅、医療への距離などの需要は変わる。（出典1）' },
      { title: '密度を暮らしの機会へ結びつける', body: '世界銀行の地域研究は、密度の高い都市でも交通の混雑や技能・雇用への接続の弱さが生産性を制約すると分析する。人口密度を豊かさの代用にせず、住宅、水道、交通、働く場所へ到達できるかを見る。自然環境の災害や暑さも、住む地区の条件と重ねて考える。（出典3）' },
    ], relatedIds: ['brazil-southeast', 'rio-plata-cities', 'andean-highlands', 'chile-mediterranean'],
    sources: [
      { label: '1｜世界銀行：人口動向と都市化', url: 'https://www.worldbank.org/en/topic/urbandevelopment/publication/demographic-trends-and-urbanization', period: '2021年' },
      { label: '2｜IBGE：2022年の都市・農村人口', url: 'https://educa.ibge.gov.br/criancas/voce-sabia/22584-populacao-urbana-e-rural.html', period: '2022年国勢調査' },
      { label: '3｜世界銀行：生産性と雇用の地理', url: 'https://www.worldbank.org/en/region/lac/publication/the-evolving-geography-of-productivity-and-employment' },
    ],
    stats: [{ label: 'ブラジルの都市地域居住割合', value: 87.4, unit: '％', year: '2022', scope: 'ブラジル全国、IBGEの都市・農村区分。中南米全体の値ではない', sourceUrl: 'https://educa.ibge.gov.br/criancas/voce-sabia/22584-populacao-urbana-e-rural.html' }],
  },
];
