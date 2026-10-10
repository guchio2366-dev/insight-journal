/** Historical UN urban agglomerations; not municipalities or GHSL cell totals. */
export const latinUrbanSource={title:'国連 World Urbanization Prospects 2018 Revision, Table III.6',url:'https://population.un.org/wup/assets/WUP2018-Report.pdf',year:2018,unit:'人',license:'CC BY 3.0 IGO',definition:'国連が各国統計の都市集積域を調整した2018年年央推計。市の行政界・2020年密度格子とは異なり、都市域の定義も国によって違う。原表の千人を×1,000。現在人口ではない。'};
export const latinUrbanPopulations=[
 {id:'sao-paulo',name:'サンパウロ',country:'BRA',coordinate:[-46.633,-23.551],population:21650000,dx:32,dy:14,reason:'ブラジル南東部の大都市圏。工業・サービスの仕事、道路と港への交通が人口の集積を支える。'},
 {id:'buenos-aires',name:'ブエノスアイレス',country:'ARG',coordinate:[-58.3816,-34.6037],population:14967000,dx:-34,dy:30,reason:'ラプラタ川沿いの大都市圏。港と交通、政治・経済機能が穀物・牧畜地域と都市の市場を結ぶ。'},
 {id:'rio',name:'リオデジャネイロ',country:'BRA',coordinate:[-43.1729,-22.9068],population:13293000,dx:38,dy:-29,reason:'ブラジル大西洋岸の大都市圏。港とサービスの仕事が沿岸の人口集中を支える。'},
 {id:'bogota',name:'ボゴタ',country:'COL',coordinate:[-74.0721,4.711],population:10574000,dx:35,dy:-27,reason:'アンデスの高原に位置する首都圏。熱帯の低地だけでなく、行政・仕事と交通が高地に大きな集積をつくる。'},
 {id:'lima',name:'リマ',country:'PER',coordinate:[-77.0428,-12.0464],population:10391000,dx:-34,dy:-14,reason:'乾燥した太平洋岸の首都圏。港、行政と雇用の集中が人口を集めるため、降水の多さだけで都市の規模は説明できない。'},
 {id:'santiago',name:'サンティアゴ',country:'CHL',coordinate:[-70.6693,-33.4489],population:6680000,dx:-34,dy:-20,reason:'チリ中央部の盆地の首都圏。行政、仕事、都市間の交通が人口を集める。'},
 {id:'belo-horizonte',name:'ベロオリゾンテ',country:'BRA',coordinate:[-43.9386,-19.9208],population:5972000,dx:38,dy:-57,reason:'ブラジル南東部の内陸都市圏。沿岸だけでなく内陸の産業・サービスの仕事にも人口が集まる。'},
];
