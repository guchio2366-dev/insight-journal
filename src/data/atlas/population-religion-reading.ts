export const religionStories=[
 {id:'south-protestant',number:'①',title:'南部のプロテスタント',region:'米国南部',coordinate:[-86.8,33.2] as [number,number],text:'南部では福音派プロテスタントの比重が大きく、バプテスト系をはじめ複数の宗派が重なります。歴史的黒人プロテスタントも地域社会を形づくってきました。プロテスタントは宗教改革に由来するキリスト教の教会群です。南部のダラスとミシシッピ川下流のニューオーリンズを見比べます。',sources:[{label:'Pew：米国南部',url:'https://www.pewresearch.org/religious-landscape-study/region/south/'}]},
 {id:'utah-lds',number:'②',title:'ユタの末日聖徒',region:'ユタ州・ソルトレーク周辺',coordinate:[-111.9,40.75] as [number,number],text:'末日聖徒の開拓者は、敵対や暴力を受けてイリノイ州ノーブーを離れ、19世紀に西方へ移住しました。その共同体形成が、現在もユタで末日聖徒が目立つ歴史的背景です。地図では山岳西部のユタ周辺に注目します。',sources:[{label:'Pew：ユタ州',url:'https://www.pewresearch.org/religious-landscape-study/state/utah/'},{label:'NPS：移住の歴史',url:'https://www.nps.gov/mopi/learn/historyculture/index.htm'}]},
 {id:'northeast-immigration',number:'③',title:'移民が形づくった宗教社会',region:'北東部・ニューヨーク周辺',coordinate:[-75.2,42.3] as [number,number],text:'19世紀以降、アイルランド・イタリアなどからのカトリック移民と、ドイツ・東欧などからのユダヤ系移民が都市に共同体を築きました。同じ宗教でも言語・出身地・慣習は異なります。移民への反発や学校教育をめぐる対立も、宗教組織の形成に影響しました。',sources:[{label:'Pluralism Project：カトリックとユダヤ系移民',url:'https://pluralism.org/catholic-and-jewish-immigrants'}]},
 {id:'southwest-catholic',number:'④',title:'南西部のカトリックと植民の歴史',region:'カリフォルニアから南西部',coordinate:[-106.0,34.5] as [number,number],text:'南西部では、スペインの宣教施設が先住民をカトリックとスペイン式の生活へ改宗・同化させる拠点になりました。現在の文化景観には、その遺産に加えて支配・抵抗の歴史、国境の変化、後の移住が重なっています。',sources:[{label:'NPS：南西部の宣教施設',url:'https://www.nps.gov/subjects/travelspanishmissions/introduction.htm'},{label:'NPS：宣教施設での生活',url:'https://www.nps.gov/articles/life-in-the-missions-between-reality-romance-and-revolt.htm'}]},
 {id:'northwest-unaffiliated',number:'⑤',title:'宗教への所属と信仰は別',region:'太平洋岸北西部・ワシントン州',coordinate:[-120.8,47.2] as [number,number],text:'Pewの「特定の宗教に属さない」は、無神論、不可知論、宗教は特にないという回答を含みます。信仰や精神性が全くない人という意味ではありません。ワシントン州の傾向を確認しつつ、シアトル市民全員の特徴には置き換えません。',sources:[{label:'Pew：ワシントン州',url:'https://www.pewresearch.org/religious-landscape-study/state/washington/'},{label:'Pew：宗教所属の分類',url:'https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/'}]},
 {id:'black-churches',number:'⑥',title:'黒人教会と地域社会',region:'南部から五大湖周辺',coordinate:[-90.0,31.7] as [number,number],text:'「黒人教会」は多様な教会・会衆をまとめた呼び方です。礼拝の場に加え、地域社会や平等を求める運動を支える役割を担ってきました。南部から北部への大移動も踏まえ、南部とシカゴ・デトロイトを結んで読みます。',sources:[{label:'Pew：黒人の宗教生活',url:'https://www.pewresearch.org/religion/2021/02/16/faith-among-black-americans/'},{label:'米国国立公文書館：大移動',url:'https://www.archives.gov/research/african-americans/migrations/great-migration'}]},
] as const;

export const religionStoryIds=religionStories.map(story=>story.id);

export const religionDominantCategories=[
 ['catholic','カトリック'],
 ['southern_baptist','南部バプテスト'],
 ['mainline_protestant','主流派プロテスタント'],
 ['nondenominational','無教派キリスト教会'],
 ['other_conservative_protestant','その他の保守系プロテスタント'],
 ['latter_day_saints','末日聖徒'],
 ['black_protestant','黒人プロテスタント'],
 ['other','その他の最多グループ'],
] as const;

export const religionDominantReading:Record<string,{region:string;definition:string;history:string;connections:string;source:string;sourceLabel:string}>={
 catholic:{region:'北東部、五大湖周辺、ルイジアナ、南西部など',definition:'USRCで Catholic Church が最多だった郡です。郡人口の過半数や、住民全体の宗教構成を意味しません。',history:'アイルランド・イタリアなどからの移民、フランス・スペインによる植民、メキシコとの国境変化が、地域ごとに異なるカトリック社会の背景になりました。',connections:'港湾・工業都市、農村、国境地域では移住と雇用の歴史が異なります。投票行動は人種・世代・階層などでも分かれるため、カトリックという分類だけでは説明できません。',source:'https://www.usreligioncensus.org/node/1639',sourceLabel:'U.S. Religion Census：2020年データ'},
 southern_baptist:{region:'南部を中心とする広い地域',definition:'Southern Baptist Convention が最多だった郡です。南部にある全教会や全住民を一つの宗派として表すものではありません。',history:'バプテスト系教会は南部の地域社会に長く根付き、奴隷制と人種分離を含む歴史とも関わってきました。黒人教会は別の制度と共同体として発展しました。',connections:'農業、製造、近年の都市成長が重なる南部では、雇用構造も一様ではありません。宗教と共和党支持の地理的重なりは見られても、個人の投票を直接決める因果とは扱いません。',source:'https://www.sbc.net/about/what-we-do/fast-facts/',sourceLabel:'Southern Baptist Convention：概要'},
 mainline_protestant:{region:'中西部と北東部の一部',definition:'United Methodist、ELCA、American Baptist、Reformed、UCC、Episcopal、PCUSAのいずれかが最多だった郡をまとめています。',history:'欧州からの移住、農地への定住、町の形成とともに複数の宗派が広がりました。「主流派」は一つの宗派名ではなく、歴史や教義の異なる教会群です。',connections:'農村部から旧工業都市まで含むため、産業・雇用や投票傾向は地域で異なります。宗派群の名称から住民個人の政治的立場を推定しません。',source:'https://www.usreligioncensus.org/node/1639',sourceLabel:'U.S. Religion Census：2020年データ'},
 nondenominational:{region:'都市近郊や人口流入地域を含む各地',definition:'Non-denominational Christian Churches が最多だった郡です。個々の教会の教義や組織形態が同じという意味ではありません。',history:'特定の歴史的宗派名を掲げない教会が、郊外化や人口移動の進む地域でも成長してきました。USRCは会衆単位の報告を集計しています。',connections:'人口増加、住宅開発、サービス業の拡大と地理的に重なる場合がありますが、地図だけで成長の原因は決められません。投票との関係も別の調査で確かめます。',source:'https://www.usreligioncensus.org/faq',sourceLabel:'U.S. Religion Census：定義と方法'},
 other_conservative_protestant:{region:'中西部、南部、農村部などに点在',definition:'保守系ルター派、Churches of Christ、アーミッシュ、メノナイトなど、最多になった23グループをまとめた表示区分です。',history:'宗派ごとに移住経路、教会組織、都市や農村との関係が異なります。凡例を読みやすくするための地図上の集約であり、単一の共同体ではありません。',connections:'農業地域、製造地域、小都市など異なる産業基盤を含みます。集約色と政党支持の重なりから、一括して価値観や投票を説明しません。',source:'https://www.usreligioncensus.org/node/1639',sourceLabel:'U.S. Religion Census：2020年データ'},
 latter_day_saints:{region:'ユタ州と周辺の山岳西部',definition:'Church of Jesus Christ of Latter-day Saints が最多だった郡です。',history:'19世紀に迫害を受けた末日聖徒の開拓者が西方へ移住し、ユタを中心に灌漑と共同体を築いた歴史が現在の集中の背景です。',connections:'乾燥地の入植、水利用、都市成長を合わせて読むと地域形成が見えます。政治文化との関係は強くても、所属から個人の投票を決めつけません。',source:'https://www.nps.gov/mopi/learn/historyculture/index.htm',sourceLabel:'NPS：Mormon Pioneer National Historic Trail'},
 black_protestant:{region:'南部の一部',definition:'AME、National Missionary Baptist Convention、CMEのいずれかが最多だった郡です。黒人住民全体と同じ母集団ではありません。',history:'奴隷制と人種分離の下で、黒人教会は礼拝に加えて教育、相互扶助、公民権運動を支える共同体の役割を担いました。',connections:'南部の農業史や、工業雇用を求めた大移動とつながります。現在の投票行動との関連は歴史・制度・政策選好も含めて説明し、宗教だけへ還元しません。',source:'https://www.pewresearch.org/religion/2021/02/16/faith-among-black-americans/',sourceLabel:'Pew Research Center：黒人の宗教生活'},
 other:{region:'本土ではコロラド州の2郡',definition:'上の7区分以外のグループが最多だった例です。本土地図ではVajrayana Buddhistが該当します。',history:'少数の例外を消さずに示すための区分です。紫色の郡すべてを同一の宗教文化として扱いません。',connections:'特定施設や小規模共同体の所在が郡の最大分類に影響することがあります。産業や投票との一般的関係は、この2郡だけから推論できません。',source:'https://www.usreligioncensus.org/node/1639',sourceLabel:'U.S. Religion Census：2020年データ'},
};

type CityReligion={text:string;source:string;sourceLabel:string;stories:readonly string[]};
export const populationCityReligionProfiles:Record<string,CityReligion>={
 seattle:{text:'シアトルの周辺では、宗教団体が把握する所属者と、人々の自己認識を分けると宗教文化を読みやすくなります。Pewの「特定の宗教に属さない」は無神論・不可知論・宗教は特にないという回答を含み、信仰の不在と同じ意味ではありません。州の調査は市の割合とは区別します。',source:'https://www.pewresearch.org/religious-landscape-study/state/washington/',sourceLabel:'Pew：ワシントン州',stories:['northwest-unaffiliated']},
 'san-francisco':{text:'移民が移住先に教会などを築くことで、宗教は地域社会の支えにもなります。太平洋岸のサンフランシスコを入口に、南西部の植民・宣教と、その後の移住という異なる背景を見比べます。',source:'https://pluralism.org/catholic-and-jewish-immigrants',sourceLabel:'Pluralism Project：移民と宗教',stories:['southwest-catholic']},
 'los-angeles':{text:'ロサンゼルスを含む南西部には、スペイン植民期の宣教施設と、その後の移住の歴史が重なります。宣教施設は宗教を広めると同時に、先住民をスペイン式の生活へ組み込む拠点でした。',source:'https://www.nps.gov/subjects/travelspanishmissions/introduction.htm',sourceLabel:'NPS：南西部の宣教施設',stories:['southwest-catholic']},
 'las-vegas':{text:'ラスベガスと北東のユタ周辺を見比べると、近接する地域でも宗教共同体の歴史が異なることに注目できます。ユタの末日聖徒の集中は19世紀の西方移住と関わり、ネバダ州の都市へそのまま当てはめられるものではありません。',source:'https://www.pewresearch.org/religious-landscape-study/state/nevada/',sourceLabel:'Pew：ネバダ州',stories:['utah-lds']},
 denver:{text:'山地と平原の接点にあるデンバーでは、都市を含む郡と周囲の郡を見比べることが出発点になります。最多の宗教グループの色は、そこに暮らす全員の所属を表すものではありません。州の回答調査も別の尺度として参照できます。',source:'https://www.pewresearch.org/religious-landscape-study/state/colorado/',sourceLabel:'Pew：コロラド州',stories:[]},
 dallas:{text:'ダラスを入口に、南部で教会が地域社会に根付いた歴史を読めます。バプテスト系はプロテスタントの教会群の一つです。南部のまとまりと、大都市の周辺に見られる郡ごとの違いを見比べます。',source:'https://www.pewresearch.org/religious-landscape-study/state/texas/',sourceLabel:'Pew：テキサス州',stories:['south-protestant']},
 chicago:{text:'欧州からの移民と、南部からの大移動が重なった都市です。カトリック・ユダヤ系の共同体と黒人教会を、別々の移動史から読みます。',source:'https://www.archives.gov/research/african-americans/migrations/great-migration',sourceLabel:'米国国立公文書館：大移動',stories:['black-churches','northeast-immigration']},
 detroit:{text:'南部からの大移動と工業都市の雇用が、黒人の宗教共同体の形成にも関わりました。現在の都市圏には多様な信仰があり、黒人住民を一宗派で説明しません。',source:'https://www.archives.gov/research/african-americans/migrations/great-migration',sourceLabel:'米国国立公文書館：大移動',stories:['black-churches']},
 'new-orleans':{text:'ニューオーリンズのあるルイジアナと周辺の南部を比べると、カトリックとプロテスタントの異なる歴史を追えます。南部を一色の宗教文化として見るより、港湾都市と周辺の郡を分けると地域差に気づけます。',source:'https://www.pewresearch.org/religious-landscape-study/state/louisiana/',sourceLabel:'Pew：ルイジアナ州',stories:['south-protestant']},
 miami:{text:'中南米・カリブからの移住が宗教的多様性にも重なる都市です。出身地域やヒスパニックという分類から、個人の宗教所属を推定しません。',source:'https://www.pewresearch.org/religious-landscape-study/state/florida/',sourceLabel:'Pew：フロリダ州',stories:[]},
 'washington-dc':{text:'首都ワシントンでは、黒人教会を礼拝だけでなく地域の相互扶助や平等を求める運動の拠点として読むことができます。首都の行政・専門サービスの仕事と、地域社会を支える共同体は異なる側面から都市を形づくります。',source:'https://www.pewresearch.org/religion/2021/02/16/faith-among-black-americans/',sourceLabel:'Pew：黒人の宗教生活',stories:['black-churches']},
 'new-york':{text:'19世紀以降のカトリック移民とユダヤ系移民が、それぞれの宗教施設や教育・相互扶助の仕組みを築いた歴史を読む都市です。',source:'https://pluralism.org/catholic-and-jewish-immigrants',sourceLabel:'Pluralism Project：カトリックとユダヤ系移民',stories:['northeast-immigration']},
};

export const religionTakeaways:Record<string,string>={
 catholic:'同じカトリックの色でも、北東部の移民と南西部の植民では、根付いた経緯が異なります。',
 southern_baptist:'南部バプテストのまとまりは、教会が南部の地域社会に根付いてきた歴史を映しています。',
 mainline_protestant:'中西部・北東部の教会群を、欧州からの移住と農村・町の形成に重ねて読めます。',
 nondenominational:'特定の宗派名を掲げない教会も、郡で最大となる地域があります。',
 other_conservative_protestant:'一つの色に集約された教会群にも、異なる移住経路と共同体の歴史があります。',
 latter_day_saints:'迫害を逃れた西方への移住と共同体づくりが、ユタ周辺の集中につながっています。',
 black_protestant:'黒人教会は礼拝の場に加え、相互扶助と公民権運動を支える拠点になりました。',
 other:'少数の郡で最多のグループも残すことで、大きな宗派のまとまりだけでは見えない分布を示します。',
 'south-protestant':'南部の教会は一様ではなく、バプテスト系と黒人教会などが異なる歴史を担ってきました。',
 'utah-lds':'19世紀の西方移住で築かれた共同体が、ユタの宗教文化の背景にあります。',
 'northeast-immigration':'移民は移住先で礼拝だけでなく、教育や相互扶助を担う共同体も築きました。',
 'southwest-catholic':'南西部の宗教景観には、スペインの宣教・植民と、先住民の抵抗、その後の移住が重なっています。',
 'northwest-unaffiliated':'宗教団体が把握する人数と、人が自分の宗教をどう答えるかは、別の指標です。',
 'black-churches':'南部から工業都市への移動は、雇用とともに教会を支えとする地域社会にもつながりました。',
};
