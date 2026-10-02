import type { OverviewTopicId } from '../country-overview';

export interface CanadaOverviewLink {
  href: string;
  label: string;
}

export interface CanadaOverviewSection {
  heading: string;
  body: string;
}

export interface CanadaOverviewTopic {
  id: OverviewTopicId;
  label: string;
  takeaway: string;
  links: readonly [CanadaOverviewLink, CanadaOverviewLink, CanadaOverviewLink];
  sections: readonly [CanadaOverviewSection, CanadaOverviewSection, CanadaOverviewSection];
  sources: readonly CanadaOverviewLink[];
}

export interface CanadaOverview {
  title: string;
  checkedAt: string;
  topics: readonly CanadaOverviewTopic[];
}

export const canadaOverview: CanadaOverview = {
  "title": "カナダの概要",
  "checkedAt": "2026-10-02",
  "topics": [
    {
      "id": "agriculture",
      "label": "農林業",
      "takeaway": "プレーリーの作物、草地の肉牛、各地の森林は、管理・加工・輸送と買い手の需要によって暮らしにつながります。",
      "links": [
        {
          "href": "/atlas/north-america/canada/agriculture/",
          "label": "カノーラ：産地・生産・加工"
        },
        {
          "href": "/atlas/north-america/canada/agriculture/beef/",
          "label": "肉牛：草地・飼料・管理"
        },
        {
          "href": "/atlas/north-america/canada/agriculture/forestry/",
          "label": "森林：分布・木材加工"
        }
      ],
      "sections": [
        {
          "heading": "農業と主な作物",
          "body": "プレーリー3州はアルバータ・サスカチュワン・マニトバです。小麦とカノーラの産地を確かめ、生育する季節と土壌の水分に、品種・輪作・機械作業・貯蔵の管理を重ねて読みます。"
        },
        {
          "heading": "畜産と林業",
          "body": "肉牛では草が育つ季節を放牧に使い、冬を貯蔵飼料と給餌の管理でつなぎます。森林は分布を確かめた上で、更新・作業道・運搬、木材や紙への加工を追います。"
        },
        {
          "heading": "生産と暮らしのつながり",
          "body": "内陸の穀物は鉄道と港で市場につながります。食品や建設用木材への需要は、品質・加工・伐採の判断へ戻ります。産地の自然条件と、管理・輸送・買い手の条件を合わせて読むことが大切です。"
        }
      ],
      "sources": [
        {
          "href": "/atlas/north-america/canada/agriculture/#canada-agriculture-sources",
          "label": "作物の原典・年・用途と輸送"
        },
        {
          "href": "/atlas/north-america/canada/agriculture/beef/#canada-beef-sources",
          "label": "肉牛・飼料の原典と管理資料"
        },
        {
          "href": "/atlas/north-america/canada/agriculture/forestry/#canada-forestry-sources",
          "label": "森林の原典・加工・需要の過去例"
        }
      ]
    },
    {
      "id": "nature",
      "label": "自然環境",
      "takeaway": "西岸の山地、中央の平原、東部の楯状地、北部の島々を分け、季節と水の違いを確かめます。",
      "links": [
        {
          "href": "/atlas/north-america/canada/nature/?city=ottawa&compare=vancouver&view=climate",
          "label": "オタワと西岸：気候比較"
        },
        {
          "href": "/atlas/north-america/canada/nature/?city=regina&view=landform",
          "label": "山地・平原・楯状地：地形図"
        },
        {
          "href": "/atlas/north-america/canada/nature/?view=water&waterTopic=precipitation",
          "label": "水資源：降水・集水域・地下水"
        }
      ],
      "sections": [
        {
          "heading": "気候と季節の変化",
          "body": "1991–2020年の平年値では、バンクーバーは冬が比較的温和で秋冬の降水が多く、オタワやウィニペグは冬と夏の気温差が大きくなります。海からの距離、山地、高緯度を、地点別の雨温図で比較できます。"
        },
        {
          "heading": "地形と水資源",
          "body": "西部山地の東に内陸平原が広がり、東部には楯状地と周囲の低地があります。水の図では、雨・雪の降水量、水が集まる地域、地下水の地質条件を分けて読みます。"
        },
        {
          "heading": "自然環境と土地の利用",
          "body": "生育期と水・土壌は作物や牧草の条件になり、山地と海への出口は輸送を考える手掛かりになります。栽培や森林の管理、道路・鉄道と市場への接続を、各分野の説明で確かめられます。"
        }
      ],
      "sources": [
        {
          "href": "/atlas/north-america/canada/nature/#canada-nature-sources",
          "label": "気候1991–2020年・地形の原典と利用条件"
        },
        {
          "href": "/atlas/north-america/canada/nature/#canada-water-sources",
          "label": "降水・集水域・地下水の原典と対象年"
        }
      ]
    },
    {
      "id": "industry",
      "label": "主要産業",
      "takeaway": "資源の採取、製造業、サービスの地域差を、加工・輸送と都市の仕事へつなげて読みます。",
      "links": [
        {
          "href": "/atlas/north-america/canada/industry/?year=2023&province=Alberta&metric=mining",
          "label": "アルバータ：資源・加工・輸送"
        },
        {
          "href": "/atlas/north-america/canada/industry/?year=2025&province=Ontario&compare=Quebec&metric=manufacturing",
          "label": "オンタリオとケベック：製造業"
        },
        {
          "href": "/atlas/north-america/canada/industry/?year=2025&province=Ontario&compare=British%20Columbia&metric=services",
          "label": "オンタリオとBC：サービス"
        }
      ],
      "sections": [
        {
          "heading": "産業の構成と主な拠点",
          "body": "産業図は2023・2024・2025年の州・準州内GDP割合を比較します。鉱業等・製造業・サービス生産産業を切り替え、地域ごとの構成を確かめられます。州内割合と生産金額・雇用人数は区別します。"
        },
        {
          "heading": "製造業・資源・エネルギー",
          "body": "アルバータ北部のオイルサンドは、加工・希釈、集荷拠点、パイプラインを経て市場につながります。オンタリオとケベックでは五大湖・セントローレンス沿いの道路・鉄道・水路を、加工業と市場のつながりとして読みます。"
        },
        {
          "heading": "サービス業と貿易",
          "body": "サービスには商業だけでなく運輸・教育・医療・公的活動も含まれます。バンクーバー周辺の港・鉄道・道路と米国との陸上国境は、人や製品を市場へつなぎます。都市圏の人口と合わせ、仕事と暮らしを支える活動を確かめます。"
        }
      ],
      "sources": [
        {
          "href": "/atlas/north-america/canada/industry/#canada-industry-sources",
          "label": "州内GDP割合・資源・輸送の原典と対象年"
        }
      ]
    },
    {
      "id": "population",
      "label": "人口",
      "takeaway": "2021年の南部都市圏への集中を、交通・仕事・住まいと、都市ごとの人口集団・宗教の違いから読みます。",
      "links": [
        {
          "href": "/atlas/north-america/canada/population/?year=2021&cma=535&compare=462&metric=population",
          "label": "トロントとモントリオール：人口"
        },
        {
          "href": "/atlas/north-america/canada/population/?topic=ethnicity&measure=share",
          "label": "人口集団：都市圏ごとの割合"
        },
        {
          "href": "/atlas/north-america/canada/population/?topic=religion&measure=share",
          "label": "宗教：自己申告の所属"
        }
      ],
      "sections": [
        {
          "heading": "人口分布と都市",
          "body": "トロントとモントリオールは五大湖・セントローレンス側、バンクーバーは太平洋側に位置します。都市圏（CMA）は中心部と通勤などで結びつく自治体のまとまりです。同じ境界で人口規模と密度を分けて比べます。"
        },
        {
          "heading": "言語・民族・宗教",
          "body": "人口集団の分類は国籍・出生国・民族的出自とは異なり、宗教は自己申告の所属です。図は2021年の私的世帯人口を対象とする25%標本の加重推計です。同じ集団について、都市圏ごとの割合と人数を比較できます。"
        },
        {
          "heading": "人口の変化と人の移動",
          "body": "2016・2021年の人口を同じ2021年都市圏境界で比べ、集中と増減を確かめます。住宅供給・価格と通勤時間は居住場所に関わり、人口が増えると交通・住宅・サービスの整備が必要になります。都市の広がりを土地利用と合わせて読みます。"
        }
      ],
      "sources": [
        {
          "href": "/atlas/north-america/canada/population/#canada-population-sources",
          "label": "2016・2021年人口・CMA定義・都市成長の原典"
        },
        {
          "href": "/atlas/north-america/canada/population/#canada-demographic-sources",
          "label": "2021年人口集団・宗教の定義・分母・原典"
        }
      ]
    },
    {
      "id": "politics",
      "label": "政治",
      "takeaway": "連邦制の議会民主主義・立憲君主制を、オタワの議会と州の役割分担から読みます。",
      "links": [
        {
          "href": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/how-canadians-govern-themselves.html",
          "label": "公式解説：議会・内閣・権限分担"
        },
        {
          "href": "https://laws-lois.justice.gc.ca/eng/const/page-12.html",
          "label": "1982年憲法：権利の枠組み"
        },
        {
          "href": "/atlas/north-america/canada/industry/",
          "label": "産業：資源と国境を越える輸送"
        }
      ],
      "sections": [
        {
          "heading": "政治制度と意思決定",
          "body": "首都オタワの連邦議会は君主・上院・下院から構成されます。選挙で選ばれる下院が政府を監督し、首相と内閣は下院の信任に支えられて政策を進めます。"
        },
        {
          "heading": "連邦の成立と権利の枠組み",
          "body": "1867年憲法法は連邦と州の役割を定めました。1982年憲法法には権利と自由の憲章があり、先住民及び条約上の既存の権利も確認されています。土地や資源の利用を考えるときにも、この制度と権利の枠組みが関わります。"
        },
        {
          "heading": "外交と周辺地域との関係",
          "body": "外交や州をまたぐ貿易は連邦政府の担当で、自然資源は州の役割、農業と移民は共有権限です。資源の生産、輸送、都市の暮らしのどの段階に、どの政府の制度が関わるかを考えます。"
        }
      ],
      "sources": [
        {
          "href": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/how-canadians-govern-themselves.html",
          "label": "IRCC Discover Canada：制度の公式解説（2017年版の安定事実）"
        },
        {
          "href": "https://laws-lois.justice.gc.ca/eng/const/page-12.html",
          "label": "Justice Canada：1982年憲法法（2026-10-02確認）"
        },
        {
          "href": "https://www.canada.ca/en/transparency/terms.html",
          "label": "Canada.ca利用条件（独自要約・図版転載なし）"
        }
      ]
    }
  ]
};
