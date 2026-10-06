// Japanese Mexico agriculture reading copy. No UI or controller changes.
export const mexicoAgricultureNationalTakeaway = "メキシコの農業は、北部の灌漑地、中央高原、南部の湿潤な山地・低地で作物が変わり、畜産は飼料と水の確保、加工・流通の仕組みに支えられる。";

export const mexicoAgricultureMapNotes = {
  "crops": "作物の色はMapSPAM 2020 v2r2の推計栽培面積を5分メッシュごとにまとめ、面積が最も大きい作物区分を示します。全作物の推計面積が格子面積の10%以上となる格子を表示しており、色面全体が農地であることや、圃場の実測境界を示すものではありません。",
  "livestock": "畜産の記号はDGSIAP 2025年の品目別生産額を基準に選んだ自治体を、庁所在地の座標で示します。表示数量は自治体全体の年間生産量で、記号位置にある農場の量や飼養頭羽数を示しません。",
  "livestockUnits": "肉と食用卵は重量、牛乳は容量です。頭羽数・森林面積・作物の栽培面積とは別の指標として読みます。",
  "productForms": "統計の米はもみ米、綿花は種子付きの原綿、コーヒーは収穫した果実（コーヒーチェリー）です。精米・綿繊維・生豆の重量とは区別します。",
  "groupedCrops": "コーヒーはアラビカとロブスタ、果実類はバナナ・料理用バナナ・かんきつ・熱帯果実・温帯果実、野菜類はトマト・タマネギ・その他の野菜を合算しています。",
  "years": "作物分布は2020年推計、畜産生産は2025年統計です。重なりは地域の関係を考える手掛かりで、同一年の生産量の相関や飼料の実際の移動量を示すものではありません。",
  "broilerLabel": "内部ID broilerは公式のAve / Carne系列に対応します。表示名は「鶏肉」とし、肉用鶏だけの飼養羽数・生産量を直接測った統計とは表現しません。"
} as const;

export const mexicoAgricultureProductReading = {
  "wheat": {
    "id": "wheat",
    "title": "小麦｜北西部の乾燥地を灌漑で生かす",
    "takeaway": "北西部の小麦は、比較的涼しい秋冬の作期と、必要な時期に水を届ける灌漑に支えられる。",
    "steps": [
      {
        "title": "ソノラの谷に用水を届ける",
        "body": "ソノラ南部のヤキ谷などでは秋冬に小麦を育て、雨の少なさを灌漑で補います。開花や穀粒が育つ時期に水を確保することが、収穫を支える条件です。",
        "source": "https://www.gob.mx/inifap/articulos/requerimientos-hidricos-del-cultivo-de-trigo-en-el-sur-de-sonora"
      },
      {
        "title": "製粉して食品原料へ",
        "body": "収穫した穀粒は製粉へ進み、この地域でも作られるデュラム小麦は、硬い粒の性質を生かして主にパスタの原料になります。",
        "source": "https://numerosdelcampo.agricultura.gob.mx/publicnew/productosAgricolas/cargarPagina/7"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "INIFAP：ソノラ南部の小麦と水（2024）",
        "url": "https://www.gob.mx/inifap/articulos/requerimientos-hidricos-del-cultivo-de-trigo-en-el-sur-de-sonora"
      },
      {
        "title": "INIFAP：ヤキ谷の秋冬小麦と高温（2015）",
        "url": "https://www.gob.mx/inifap/prensa/patronato-de-productores-apoya-proyecto-para-mitigar-cambio-climatico-en-el-trigo"
      },
      {
        "title": "SADER / SIAP：デュラム小麦の特徴・用途（年記載なし（統計欄は2013年等））",
        "url": "https://numerosdelcampo.agricultura.gob.mx/publicnew/productosAgricolas/cargarPagina/7"
      }
    ]
  },
  "beans": {
    "id": "beans",
    "title": "インゲン豆｜高原の雨を生かす食用豆",
    "takeaway": "ここで読むインゲン豆は、成熟した種子を収穫する乾燥豆です。中央北部では雨季の水を生かす栽培と、地域に合う品種・播き方が生産を支えます。",
    "steps": [
      {
        "title": "サカテカスとドゥランゴの天水農業",
        "body": "サカテカスやドゥランゴはインゲン豆の産地で、天水農業とは灌漑をせず雨に頼る栽培です。雨の量と降る時期が収量を左右するため、品種や播種密度を選び、土に水を保つ工夫を重ねます。",
        "source": "https://www.gob.mx/inifap/articulos/variedades-para-incrementar-el-rendimiento-de-frijol-bajo-condiciones-de-temporal-en-zacatecas"
      },
      {
        "title": "乾燥した豆を集めて食卓へ",
        "body": "食用の乾燥豆はメキシコの日常食に使われ、集荷・選別・袋詰めの仕組みが産地と販売先をつなぎます。",
        "source": "https://www.gob.mx/agricultura/articulos/desde-chiapas-para-todo-mexico-frijoles-rancheros-sabor-que-nutre-y-nos-une"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "SADER：メキシコのインゲン豆（2023（2021年統計））",
        "url": "https://www.gob.mx/agricultura/articulos/frijol-alimento-basico-del-mexicano?idiom=es"
      },
      {
        "title": "INIFAP：サカテカスの天水インゲン豆（2024）",
        "url": "https://www.gob.mx/inifap/articulos/variedades-para-incrementar-el-rendimiento-de-frijol-bajo-condiciones-de-temporal-en-zacatecas"
      },
      {
        "title": "SADER：インゲン豆の集荷・袋詰め（2026）",
        "url": "https://www.gob.mx/agricultura/articulos/desde-chiapas-para-todo-mexico-frijoles-rancheros-sabor-que-nutre-y-nos-une"
      }
    ]
  },
  "sorghum": {
    "id": "sorghum",
    "title": "ソルガム｜穀物生産と畜産を結ぶ",
    "takeaway": "高温に適応するソルガムは、タマウリパスや中央部で作られ、家畜の飼料につながる。",
    "steps": [
      {
        "title": "高温への適応と水の確保",
        "body": "ソルガムは飼料に使うイネ科の穀物で、タマウリパスやグアナフアトに産地があります。暑さに適応していても、生育には土の水分が必要で、天水の利用や灌漑、播く時期の選択が収穫を支えます。",
        "source": "https://numerosdelcampo.agricultura.gob.mx/publicnew/productosAgricolas/cargarPagina/6"
      },
      {
        "title": "飼料を運んで畜産へ",
        "body": "収穫した穀粒は集荷されて家畜の飼料となるため、畑の分布と畜産の分布を、飼料の調達・輸送を通じた関係として読めます。",
        "source": "https://numerosdelcampo.agricultura.gob.mx/publicnew/productosAgricolas/cargarPagina/6"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "SADER / SIAP：ソルガムの特徴・用途（年記載なし（統計欄は2013年等））",
        "url": "https://numerosdelcampo.agricultura.gob.mx/publicnew/productosAgricolas/cargarPagina/6"
      },
      {
        "title": "SADER：タマウリパスのソルガムと用水（2022）",
        "url": "https://www.gob.mx/agricultura/prensa/destaca-agricultura-alta-produccion-de-sorgo-en-tamaulipas-pese-a-condiciones-climaticas"
      }
    ]
  },
  "sugarcane": {
    "id": "sugarcane",
    "title": "サトウキビ｜畑と製糖工場が結び付く",
    "takeaway": "温暖な地域のサトウキビは、生育期の水と、刈取り後すばやく製糖する仕組みで支えられる。",
    "steps": [
      {
        "title": "ベラクルスの温暖な産地",
        "body": "メキシコ湾側のベラクルスなどでは、温暖な環境と生育期の水を利用してサトウキビを育てます。茎が育つ時期には水を確保し、成熟期には雨が少なくなることが糖の蓄積に役立ちます。",
        "source": "https://www.gob.mx/firco/articulos/cana-de-azucar-indispensable-en-el-ponche-mexicano?idiom=es"
      },
      {
        "title": "茎の糖を砂糖に変える",
        "body": "刈り取った茎は時間とともに糖分が失われるため、道路で製糖工場へ運ぶ速さと、工場の処理能力も産地を支える条件になります。",
        "source": "https://www.gob.mx/cms/uploads/attachment/file/114371/Nota_T_cnica_Informativa_Diciembre_2015.pdf"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "INIFAP：ベラクルス農業技術集（2017）",
        "url": "https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/4147_4844_Agenda_T%C3%A9cnica_Veracruz_2017.pdf"
      },
      {
        "title": "FIRCO：サトウキビの生育・成熟条件（2017）",
        "url": "https://www.gob.mx/firco/articulos/cana-de-azucar-indispensable-en-el-ponche-mexicano?idiom=es"
      },
      {
        "title": "CONADESUCA：サトウキビの運搬（2015）",
        "url": "https://www.gob.mx/cms/uploads/attachment/file/114371/Nota_T_cnica_Informativa_Diciembre_2015.pdf"
      }
    ]
  },
  "rice": {
    "id": "rice",
    "title": "米｜温暖な産地で水を管理する",
    "takeaway": "ナヤリットやカンペチェの稲作は、温暖な条件に、水を確保して管理する仕組みが組み合わさる。",
    "steps": [
      {
        "title": "生育期の水を確保する",
        "body": "米の産地は太平洋側のナヤリットや南東部のカンペチェなどに分かれます。温暖な環境で、雨水や灌漑を使って生育・開花期の水を確保し、排水も調整して稲を育てます。",
        "source": "https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/4126_4823_Agenda_T%C3%A9cnica_Colima_2017.pdf"
      },
      {
        "title": "もみ米から精米へ",
        "body": "収穫した殻付きの米をもみ米といい、殻を取り除く加工を経て食用になります。",
        "source": "https://www.gob.mx/cms/uploads/attachment/file/559354/NOM-080-SCFI-2016_Arroz_del_Estado_de_Morelos.pdf"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "SADER：ナヤリットのもみ米（2018（2017年資料））",
        "url": "https://www.gob.mx/agricultura%7Cnayarit/articulos/nayarit-uno-de-los-principales-productores-de-arroz-palay"
      },
      {
        "title": "カンペチェ州地理情報局：米の栽培資料（2012）",
        "url": "https://infocam.gob.mx/infocam/pdfjs/web/pdf_infrarural/ARROZ_Oryza_sativa_L.pdf"
      },
      {
        "title": "INIFAP：コリマ農業技術集・米（2017）",
        "url": "https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/4126_4823_Agenda_T%C3%A9cnica_Colima_2017.pdf"
      },
      {
        "title": "メキシコ官報：Arroz del Estado de Morelos（2020公示）",
        "url": "https://www.gob.mx/cms/uploads/attachment/file/559354/NOM-080-SCFI-2016_Arroz_del_Estado_de_Morelos.pdf"
      }
    ]
  },
  "cotton": {
    "id": "cotton",
    "title": "綿花｜乾燥地の灌漑と繊維加工",
    "takeaway": "チワワの綿花は、乾燥地へ計画的に水を届ける栽培と、繊維を取り出す加工につながる。",
    "steps": [
      {
        "title": "チワワの乾燥地で水を配る",
        "body": "北部のチワワでは、綿花の生育段階と土の水分に合わせて灌漑します。乾燥した地域でも、水源の確保と給水管理、病害虫への対策を組み合わせて栽培を続けています。",
        "source": "https://www.gob.mx/inifap/articulos/el-algodonero-en-la-region-chihuahuense-variedades-tecnicas-y-una-app"
      },
      {
        "title": "繊維と種子を分けて使う",
        "body": "収穫後は綿繰りという工程で繊維と種子を分け、繊維は織物などの原料へ、種子は畜産向けなどに送ります。",
        "source": "https://www.gob.mx/inifap/articulos/el-algodonero-en-la-region-chihuahuense-variedades-tecnicas-y-una-app"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "INIFAP：チワワの綿花・灌漑・加工（2022）",
        "url": "https://www.gob.mx/inifap/articulos/el-algodonero-en-la-region-chihuahuense-variedades-tecnicas-y-una-app"
      }
    ]
  },
  "coffee": {
    "id": "coffee",
    "title": "コーヒー｜湿潤な山地と日陰の管理",
    "takeaway": "南部の山地では、雨と標高による温度差に、日陰をつくる栽培管理が重なる。",
    "steps": [
      {
        "title": "チアパスからベラクルスの山地へ",
        "body": "チアパスやベラクルスの山地には、樹木の下で育てる日陰栽培のコーヒー園があります。地図はアラビカとロブスタを合わせており、主に高い場所で育つアラビカと低い場所でも育つロブスタでは温度条件が異なります。",
        "source": "https://www.gob.mx/inifap/articulos/cafe-oro-azteca-variedad-resistente-a-enfermedades-webinar-con-cafe"
      },
      {
        "title": "日陰と収穫後の処理が品質を支える",
        "body": "日陰の樹木は強い日射を和らげて土壌の水分保持に役立ち、収穫後の果肉の除去や乾燥の管理も、出荷する豆の品質を支えます。",
        "source": "https://cienciasagricolas.inifap.gob.mx/index.php/agricolas/article/download/53/49/152"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "CONABIO：チアパスの森林と日陰栽培コーヒー（2015）",
        "url": "https://www.gob.mx/conabio/prensa/bosques-selvas-y-cafes-de-chiapas"
      },
      {
        "title": "INIFAP：コーヒーの種類と栽培高度（2021）",
        "url": "https://www.gob.mx/inifap/articulos/cafe-oro-azteca-variedad-resistente-a-enfermedades-webinar-con-cafe"
      },
      {
        "title": "INIFAP：コーヒーの加工と乾燥（2017）",
        "url": "https://cienciasagricolas.inifap.gob.mx/index.php/agricolas/article/download/53/49/152"
      }
    ]
  },
  "fruit": {
    "id": "fruit",
    "title": "果実類｜品目で異なる水と温度の条件",
    "takeaway": "メキシコ湾岸や南部の果実類は、かんきつやバナナなど、異なる生育条件の作物をまとめた分布として読む。",
    "steps": [
      {
        "title": "ベラクルスのかんきつ、南部のバナナ",
        "body": "ベラクルスのかんきつは熱帯・亜熱帯の条件を生かし、チアパスやタバスコのバナナは温暖さと継続した水分を必要とします。地図の果実類は、これらに温帯の果実なども合わせた区分です。",
        "source": "https://www.gob.mx/agricultura/articulos/platano-lo-que-necesitas-para-su-produccion?idiom=es"
      },
      {
        "title": "水の管理から出荷品質へ",
        "body": "灌漑や病害虫への対策、収穫後の選別・包装などを組み合わせることで、市場に届く果実の品質を保ちます。",
        "source": "https://www.gob.mx/agricultura/articulos/veracruz-dulce-productor-de-citricos"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "SADER：ベラクルスのかんきつ栽培（2016）",
        "url": "https://www.gob.mx/agricultura/articulos/veracruz-dulce-productor-de-citricos"
      },
      {
        "title": "SADER：バナナの生育条件（2023（2021年統計））",
        "url": "https://www.gob.mx/agricultura/articulos/platano-lo-que-necesitas-para-su-produccion?idiom=es"
      }
    ]
  },
  "vegetables": {
    "id": "vegetables",
    "title": "野菜類｜灌漑と施設で出荷を支える",
    "takeaway": "シナロアなどの野菜産地では、灌漑と施設栽培への投資が、水や温度の制約を補う。",
    "steps": [
      {
        "title": "シナロアの畑と施設栽培",
        "body": "太平洋側のシナロアでは、トマトなどの野菜が生産され、点滴灌漑や温室・遮光施設も使われています。点滴灌漑は根元へ少量ずつ水を届ける方法で、施設と組み合わせて水や生育環境を調整します。",
        "source": "https://estadisticas.sinaloa.gob.mx/eBooks/Temas/AGRICULTURA2023.pdf"
      },
      {
        "title": "市場が求める時期と品質に合わせる",
        "body": "地図はトマト・タマネギ・その他の野菜をまとめており、作る品目や栽培方法の選択、品質管理が国内外の市場への出荷を支えます。",
        "source": "https://www.gob.mx/inifap/articulos/mayor-rendimiento-en-cultivo-de-hortalizas-en-invernadero?idiom=es"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "シナロア州：農業統計・生産基盤（2023（2022年統計））",
        "url": "https://estadisticas.sinaloa.gob.mx/eBooks/Temas/AGRICULTURA2023.pdf"
      },
      {
        "title": "INIFAP：温室野菜の給水・施肥（2023）",
        "url": "https://www.gob.mx/inifap/articulos/mayor-rendimiento-en-cultivo-de-hortalizas-en-invernadero?idiom=es"
      }
    ]
  },
  "other": {
    "id": "other",
    "title": "その他の作物｜複数の農業をまとめて見る",
    "takeaway": "大麦・いも類・油料作物など、個別表示していない作物の栽培面積を合わせた区分。",
    "steps": [
      {
        "title": "同じ色の中にも異なる作物がある",
        "body": "その他の作物は、元データのうち個別表示していない作物を合算しています。例えば中央高原の大麦は春夏の雨を使い、中央部のバヒオでは秋冬に灌漑して育てるため、同じ作物でも水の使い方と作期が変わります。",
        "source": "https://www.gob.mx/inifap/prensa/destacan-investigaciones-en-cebada-del-inifap"
      },
      {
        "title": "用途に応じて品種を選ぶ",
        "body": "大麦の一部は、発芽させた穀粒である麦芽に加工してビール原料となり、その用途に合う品種が選ばれます。この例を、その他の色面すべてに当てはめることはできません。",
        "source": "https://www.gob.mx/inifap/prensa/destacan-investigaciones-en-cebada-del-inifap"
      }
    ],
    "sources": [
      {
        "title": "IFPRI / CGIAR MapSPAM 2020 v2r2（2020（版 v2r2））",
        "url": "https://cgiar-climate-data-hub.github.io/catalog/spam2020/"
      },
      {
        "title": "INIFAP：大麦の天水作・灌漑作と用途（2023）",
        "url": "https://www.gob.mx/inifap/prensa/destacan-investigaciones-en-cebada-del-inifap"
      }
    ]
  },
  "beef": {
    "id": "beef",
    "title": "牛肉｜牧草と飼料、肥育と加工",
    "takeaway": "牛肉の生産は、雨で育つ牧草と、飼料を調達する肥育・加工の仕組みの両方に支えられる。",
    "steps": [
      {
        "title": "ベラクルスの牧草と季節差",
        "body": "地図ではベラクルスなどの代表的な生産自治体を示します。沿岸部の牛の飼育では雨季に育つ牧草を利用し、乾季の草不足を見越して飼料を確保することが重要です。",
        "source": "https://www.uv.mx/veracruz/fmvz/files/2020/03/igbook.pdf"
      },
      {
        "title": "肥育と食肉加工へつなぐ",
        "body": "牛を育てる牧場から、体重を増やす肥育、食肉加工へと進むには、水と飼料の確保に加えて輸送と販売先が必要で、それぞれの段階が異なる場所を結びます。",
        "source": "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Livestock+and+Products+Annual_Mexico+City_Mexico_MX2024-0039"
      }
    ],
    "sources": [
      {
        "title": "DGSIAP 畜産年次統計（2025）",
        "url": "https://www.gob.mx/agricultura/dgsiap/acciones-y-programas/produccion-pecuaria"
      },
      {
        "title": "INIFAP / ベラクルス大学：沿岸部の牛と牧草管理（2019）",
        "url": "https://www.uv.mx/veracruz/fmvz/files/2020/03/igbook.pdf"
      },
      {
        "title": "USDA FAS：メキシコ畜産年報（2024）",
        "url": "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Livestock+and+Products+Annual_Mexico+City_Mexico_MX2024-0039"
      }
    ]
  },
  "dairy": {
    "id": "dairy",
    "title": "牛乳｜飼料の水と集乳の仕組み",
    "takeaway": "ハリスコやラグナ地方の酪農は、栄養価の高い飼料と、生乳を冷やして運ぶ仕組みに支えられる。",
    "steps": [
      {
        "title": "乾燥地で飼料を確保する",
        "body": "地図のゴメス・パラシオなどがあるラグナ地方は、コアウイラとドゥランゴにまたがる乾燥地の酪農地域です。乳牛の栄養を支える飼料作物には水が必要なため、利用できる水と飼料の種類・育て方を合わせて考えます。",
        "source": "https://www.gob.mx/inifap/articulos/forrajes-alternativos-para-la-region-lagunera?idiom=es"
      },
      {
        "title": "生乳を冷やして加工場へ",
        "body": "ハリスコの産地では、搾ったままの生乳を集乳所で冷却して工場へ運ぶ設備が整備され、飲用乳や乳製品の生産へつながっています。",
        "source": "https://info.jalisco.gob.mx/sites/default/files/programas/reglas_de_operacion_del_programa_para_el_fomento_a_la_produccion_y_la_tecnificacion_del_campo_de_jalisco_2022.pdf"
      }
    ],
    "sources": [
      {
        "title": "DGSIAP 畜産年次統計（2025）",
        "url": "https://www.gob.mx/agricultura/dgsiap/acciones-y-programas/produccion-pecuaria"
      },
      {
        "title": "INIFAP：ラグナ地方の乳牛と飼料作物（2023）",
        "url": "https://www.gob.mx/inifap/articulos/forrajes-alternativos-para-la-region-lagunera?idiom=es"
      },
      {
        "title": "ハリスコ州：集乳・冷却・加工基盤（2022）",
        "url": "https://info.jalisco.gob.mx/sites/default/files/programas/reglas_de_operacion_del_programa_para_el_fomento_a_la_produccion_y_la_tecnificacion_del_campo_de_jalisco_2022.pdf"
      }
    ]
  },
  "pork": {
    "id": "pork",
    "title": "豚肉｜飼料調達と豚舎の管理",
    "takeaway": "養豚は、飼料を継続して調達し、水・換気・衛生を管理する仕組みとともに集積する。",
    "steps": [
      {
        "title": "ソノラ、ハリスコなどの産地",
        "body": "地図のエルモシージョがあるソノラや、ハリスコなどに豚肉の生産自治体があります。ソノラでは地域の農家からの飼料調達が養豚を支え、農業と畜産を結んでいます。",
        "source": "https://www.sonora.gob.mx/gobierno/acciones/dependencias/gobierno-de-sonora-fortalece-sanidad-y-competitividad-del-sector-porcicola-en-beneficio-de-productores"
      },
      {
        "title": "豚舎で飼育条件を整える",
        "body": "豚舎の換気と継続した給水で飼育環境を整え、衛生管理を行いながら飼育・肥育・食肉加工へつなぎます。",
        "source": "https://www.gob.mx/cms/uploads/attachment/file/554039/CHECKLIST_PORCINOS_2020.pdf"
      }
    ],
    "sources": [
      {
        "title": "DGSIAP 畜産年次統計（2025）",
        "url": "https://www.gob.mx/agricultura/dgsiap/acciones-y-programas/produccion-pecuaria"
      },
      {
        "title": "ソノラ州：養豚業の飼料調達と衛生（2026（2025年活動報告））",
        "url": "https://www.sonora.gob.mx/gobierno/acciones/dependencias/gobierno-de-sonora-fortalece-sanidad-y-competitividad-del-sector-porcicola-en-beneficio-de-productores"
      },
      {
        "title": "SENASICA：養豚場の生産管理チェックリスト（2020）",
        "url": "https://www.gob.mx/cms/uploads/attachment/file/554039/CHECKLIST_PORCINOS_2020.pdf"
      }
    ]
  },
  "broiler": {
    "id": "broiler",
    "title": "鶏肉｜飼育から加工までのつながり",
    "takeaway": "鶏肉生産は、飼料・飼育・加工を結ぶ事業の集積と、給水・温度・衛生の管理に支えられる。",
    "steps": [
      {
        "title": "ベラクルスから中央部の生産地域へ",
        "body": "地図ではベラクルスやハリスコ、ケレタロなどの代表的な生産自治体を示します。肉用鶏の生産では、飼料の供給から飼育・加工までを結ぶ仕組みが、国内の食肉需要に応えています。",
        "source": "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Poultry+and+Products+Annual_Mexico+City_Mexico_MX2025-0045.pdf"
      },
      {
        "title": "鶏舎の環境を管理する",
        "body": "水を切らさず、換気や温度を調整して鶏の生育を支え、病気を持ち込まない衛生管理と輸送・加工の管理を組み合わせます。",
        "source": "https://osiap.senasica.gob.mx/senasica/sites/default/files/Manual_de_Buenas_Pr_cticas_Pecuarias_de_Producci_n_de_Pollo_de_Engorda_4___.pdf"
      }
    ],
    "sources": [
      {
        "title": "DGSIAP 畜産年次統計（2025）",
        "url": "https://www.gob.mx/agricultura/dgsiap/acciones-y-programas/produccion-pecuaria"
      },
      {
        "title": "USDA FAS：メキシコ家禽年報（2025）",
        "url": "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Poultry+and+Products+Annual_Mexico+City_Mexico_MX2025-0045.pdf"
      },
      {
        "title": "SENASICA：肉用鶏の適正生産管理（2016）",
        "url": "https://osiap.senasica.gob.mx/senasica/sites/default/files/Manual_de_Buenas_Pr_cticas_Pecuarias_de_Producci_n_de_Pollo_de_Engorda_4___.pdf"
      }
    ]
  },
  "eggs": {
    "id": "eggs",
    "title": "鶏卵｜日々の産卵を支える飼育と出荷",
    "takeaway": "ハリスコなどの鶏卵産地は、飼料と水の安定供給、鶏舎管理、日々の出荷を組み合わせる。",
    "steps": [
      {
        "title": "テパティトランとテワカンの産地",
        "body": "地図ではハリスコのテパティトランやプエブラのテワカンなど、食用卵を生産する自治体を示します。採卵鶏は卵を採るために育てる鶏で、産卵には配合飼料・カルシウムと継続した給水が必要です。",
        "source": "https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_publicacionespecial/10271_5032_Cartas_Tecnol%C3%B3gicas_hortalizas_huevo_de_gallina_y_carne_de_conejo_en_unidades_de_producci%C3%B3n_familiar.pdf"
      },
      {
        "title": "鶏舎から市場へ毎日つなぐ",
        "body": "高温などによる産卵への影響を抑えるために換気を管理し、集めた卵を販売先へ継続して出荷する仕組みが、ロス・アルトスなどの産地を支えています。",
        "source": "https://ww1.udg.mx/es/noticia/huevo-super-alimento-producido-jalisco-para-todo-mexico-aseguran-especialistas"
      }
    ],
    "sources": [
      {
        "title": "DGSIAP 畜産年次統計（2025）",
        "url": "https://www.gob.mx/agricultura/dgsiap/acciones-y-programas/produccion-pecuaria"
      },
      {
        "title": "INIFAP：採卵鶏の飼料・水・換気（発行年未確認・2026年10月閲覧）",
        "url": "https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_publicacionespecial/10271_5032_Cartas_Tecnol%C3%B3gicas_hortalizas_huevo_de_gallina_y_carne_de_conejo_en_unidades_de_producci%C3%B3n_familiar.pdf"
      },
      {
        "title": "グアダラハラ大学：ロス・アルトスの鶏卵出荷（2018）",
        "url": "https://ww1.udg.mx/es/noticia/huevo-super-alimento-producido-jalisco-para-todo-mexico-aseguran-especialistas"
      }
    ]
  }
} as const;
