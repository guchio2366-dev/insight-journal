/** Reading contexts for the first Oceania farming/livestock edition.
 * Map years are 2020; these primary readings explain farming systems and
 * processing, rather than supplying values for the raster cells.
 */
import mapspamAttribution from "../../../public/assets/atlas/oceania-crops-v1/attribution.json";

/** Render the complete citation, then the source-derived required adaptation text. */
export const oceaniaMapspamAttribution = mapspamAttribution;

export const oceaniaFarmingReadings = [
  {
    id: "wheat",
    title: "小麦：雨を使い、経営と輸送で産地をつなぐ",
    takeaway: "小麦の帯は水と土壌を手がかりに読める。産地を支えるのは、栽培技術・農業経営・市場へのつながりでもある。",
    explanation:
      "2020年の小麦収穫面積を、オーストラリア南西部・南東部とニュージーランドで見比べよう。オーストラリアでは、雨量や水の利用可能性、土壌に加えて市場への距離が農業の組合せに関わる。小麦と羊を組み合わせる地域もあるが、作物への専門化や経営規模、技術の導入によって組合せは変わる。水をどう確保・管理し、収穫した穀物を貯蔵・集荷して市場へ運ぶかまで考えると、気候だけでは説明できない産地の姿が見える。この図の値は格子ごとの推定収穫面積で、収穫量や土地の広さそのものではない。",
    countryCodes: ["AUS", "NZL"],
    sources: [
      {
        title: "ABARES：Snapshot of Australian Agriculture 2026（農業の立地・技術・輸出）",
        url: "https://www.agriculture.gov.au/abares/products/insights/snapshot-of-australian-agriculture",
      },
      {
        title: 'International Food Policy Research Institute (IFPRI) (2026). Global Spatially-Disaggregated Crop Production Statistics Data for 2020 Version 2.0 Release 2. Harvard Dataverse, V6. doi:10.7910/DVN/SWPENT.',
        url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/SWPENT&version=6.0",
      },
    ],
  },
  {
    id: "livestock",
    title: "羊・牛：密度の違いから牧畜の条件を読む",
    takeaway: "羊と牛の分布を重ねて読むと、草と水だけでなく、飼養管理・加工・市場の違いを考えられる。",
    explanation:
      "羊と牛の2020年推定密度を切り替え、オーストラリアの内陸・周縁部とニュージーランドを比べよう。オーストラリアの調査では、広い放牧地を使う地域、小麦と羊を組み合わせる地域、雨の多い地域を区別している。草や水の条件が変われば必要な土地・飼料・管理も変わるが、干ばつへの備え、販売価格、加工や流通へのつながりも経営に関わる。密度は1km²あたりの頭数のモデル推定であり、広い範囲が淡い色でも総頭数が少ないとは限らない。牛の図だけから乳牛と肉牛を、羊の図だけから羊毛と食肉の経営を分けることはできない。",
    countryCodes: ["AUS", "NZL"],
    sources: [
      {
        title: "ABARES：Farm surveys definitions and methods（牧畜・小麦羊・多雨地域の区分）",
        url: "https://www.agriculture.gov.au/abares/research-topics/surveys/farm-definitions-methods",
      },
      {
        title: "FAO／CGIAR：GLW4 2020（2020年のモデル推定家畜密度）",
        url: "https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/",
      },
    ],
  },
  {
    id: "tropical-crops",
    title: "メラネシア：熱帯作物を加工・集荷まで読む",
    takeaway: "ココナツとカカオの分布は島ごとに違う。栽培の条件に、加工の技術と市場への道をつなげて考えよう。",
    explanation:
      "パプアニューギニア、ソロモン諸島、バヌアツ、フィジーで、2020年のココナツとカカオの推定収穫面積を見比べよう。暖かさや雨の条件を自然の地図で確かめたうえで、島のどこから作物を集め、どの加工施設・道路・港を経て市場へ届けるかを考える。たとえばカカオは収穫後に発酵・乾燥を行い、その管理が風味や品質に関わるため、栽培できる気候だけでは商品づくりを説明できない。この初回図は道路や輸送経路の実測地図ではない。小島では元データが欠けたり格子が粗すぎたりするため、空白を『農業がない』と読まず、確認できる分布とデータ不足を分けて読む。",
    countryCodes: ["PNG", "SLB", "VUT", "FJI"],
    sources: [
      {
        title: 'International Food Policy Research Institute (IFPRI) (2026). Global Spatially-Disaggregated Crop Production Statistics Data for 2020 Version 2.0 Release 2. Harvard Dataverse, V6. doi:10.7910/DVN/SWPENT.',
        url: "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/SWPENT&version=6.0",
      },
      {
        title: "ICCO：Harvesting & Post-harvest（カカオの発酵・乾燥と品質）",
        url: "https://www.icco.org/harvesting-post-harvest-new/",
      },
    ],
  },
] as const;

export type OceaniaFarmingReading = (typeof oceaniaFarmingReadings)[number];
