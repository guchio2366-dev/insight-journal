import {oceaniaIndustryReadingThemes} from './oceania-industry-reading';
import type {OceaniaSource, OceaniaState} from './oceania-learning';
import {getOceaniaTheme} from './oceania-learning';

/** Map observations and explanatory readings are recorded separately.
 * The messages do not turn a spatial correspondence into a causal estimate.
 * Source notes belong in the folded source area, not in the map message.
 */
export type OceaniaComparisonReading = {
  message: string;
  sources: OceaniaSource[];
  supportNotes: string[];
};

const wheatRain: OceaniaSource = {
  title: 'DPIRD：西豪州の小麦栽培（雨に頼る栽培・品種と栽培技術）',
  url: 'https://www.dpird.wa.gov.au/businesses/plant-and-crop-farming/grains/wheat/',
};
const southwestRain: OceaniaSource = {
  title: 'DPIRD：豪州南西部の季節別降水（冬の6・7月が多雨）',
  url: 'https://www.dpird.wa.gov.au/environment-and-sustainability/climate/historical-rainfall-frost-and-heat-maps-for-the-south-west-land-division/',
};
const southeastRain: OceaniaSource = {
  title: '豪州気象局：南東部の小麦地帯と冬季降水・農作業の季節',
  url: 'https://www.bom.gov.au/watl/about-weather-and-climate/risk/risk-example-rainfall-2.shtml',
};
const pngCoconut: OceaniaSource = {
  title: 'PNG政府（1995）：FAO提出国別報告、44頁（ココナツの沿岸・内陸低地での栽培）',
  url: 'https://www.fao.org/fileadmin/templates/agphome/documents/PGR/SoW1/asia/PAPUANEW.pdf',
  note: '歴史的な栽培地域の説明に使用。地図の2020年収穫面積や現在の生産量の出典ではありません。',
};
const coconutConditions: OceaniaSource = {
  title: 'FAO Ecocrop：ココナツの気温・降水と標高の生育条件',
  url: 'https://ecocrop.apps.fao.org/ecocrop/srv/en/cropView?id=744',
};
const coconutWater: OceaniaSource = {
  title: 'FAO：Pasture-Cattle-Coconut Systems（ココナツに適する高温と年間を通じた降水）',
  url: 'https://www.fao.org/4/af298e/af298E01.htm',
};
const coconutProcessing: OceaniaSource = {
  title: 'PNG KIK：ココナツの加工・市場につなぐ農業事業',
  url: 'https://www.kik.com.pg/agribusiness',
};
const livestockSystems: OceaniaSource = {
  title: 'ABARES：農場の定義・調査方法（放牧地域、羊・穀物複合経営）',
  url: 'https://www.agriculture.gov.au/abares/research-topics/surveys/farm-definitions-methods',
};
const laePort: OceaniaSource = {
  title: 'PNG Ports：ラエ港の位置と貨物・コンテナの機能',
  url: 'https://www.pngports.com.pg/index.php/port-information/ports-of-png/lae-port',
};
const islandTransport: OceaniaSource = {
  title: '世界銀行（2024）：島々の交通と学校・医療・仕事へのアクセス',
  url: 'https://www.worldbank.org/en/results/2024/04/22/keeping-communities-connected-in-small-island-developing-states',
};
const tauranga: OceaniaSource = {
  title: 'NZ運輸省（2019）：北島の供給網とタウランガ港（2018年の状況）',
  url: 'https://www.transport.govt.nz/assets/Uploads/Report/UNISCS-Interim-progress-report-on-the-Upper-North-Island-Supply-Chain-Strategy_Final.pdf',
};
const mineralMap: OceaniaSource = {
  title: 'Geoscience Australia：Australian Operating Mines Map 2025',
  url: 'https://doi.org/10.26186/150821',
};

export const oceaniaComparisonReadings = {
  australiaWheatClimate: {
    message: '豪州の小麦産地は、砂漠が広がる中央内陸より南西部・南東部にまとまる。南西部では冬の雨を利用して育てる。半乾燥域も含む産地の帯を、雨の季節と量から読む。',
    sources: [wheatRain, southwestRain, southeastRain],
    supportNotes: [
      '産地の集中と砂漠・半乾燥域との位置関係は、2020年MapSPAM収穫面積と1991–2020年気候区分を照合する地図上の観察。',
      'DPIRDは西豪州の小麦をrain-fed systemと説明し、南西部の最多雨月を6・7月と記載。BOMは南東小麦地帯を主に冬季降水の地域として説明する。',
      '温帯のみで小麦が育つ、雨だけで収穫面積が決まるという意味ではない。半乾燥域にも値があることを本文に明記。',
    ],
  },
  pngCoconutClimate: {
    message: 'PNGのココナツは沿岸側や島々の有効値に多い。冷涼な中央高地の斜線は未収録で、栽培が少ないとは読めない。高温と雨を好む生育条件と照合し、集荷・加工先へつなげて読む。',
    sources: [pngCoconut, coconutConditions, coconutWater, coconutProcessing],
    supportNotes: [
      '沿岸・島への偏りと冷涼な高地との違いは、PNGの2020年ココナツ収穫面積と1km気候区分の地図上の観察。有効な収穫面積が確認できる範囲の比較で、欠測セルを農業ゼロにしない。気候区分図は標高の測定図ではない。',
      'PNG政府1995年報告44頁はココナツを沿岸と内陸低地で栽培すると記載。現在の産地量を示す根拠には使用しない。',
      'FAOは高温と分散した年間降水を説明。Ecocropは良好な収量のため一般に赤道でも標高700–950m以下で栽培され、例外もあると記載。標高の一律閾値を地図に適用していない。',
      'KIKの加工・規格・市場支援は説明資料。地図に加工所の位置や実際の輸送経路を追加する根拠には使用しない。',
    ],
  },
  sheepClimate: {
    message: '羊の密度は豪州の南部・東部やNZで高く、中央の砂漠地帯では低い。乾燥した地域の広い放牧地と、雨の多い地域の密な飼養を比べ、牧草・水・経営に必要な条件の違いを読む。',
    sources: [livestockSystems],
    supportNotes: ['密度の位置関係はGLW4の2020年羊密度と気候区分の地図上の観察。色の濃さは頭/km²で、地域全体の頭数や経営種類の確定を意味しない。'],
  },
  minesDensity: {
    message: '豪州では西部の鉄鉱石鉱山など、人口の薄い地域にも鉱山がある。南東・南西沿岸の集住とのずれを読み、採掘地への人・資材の輸送や生活基盤の役割を考えよう。',
    sources: [mineralMap],
    supportNotes: ['2025年鉱山点と2020年人口密度を照合する観察。鉱山点には生産量や従業員数を割り当てず、輸送線も推定していない。'],
  },
  pngPlacesDensity: {
    message: 'PNGの人口は沿岸都市だけでなく内陸高地にも集まる。ラエ港の位置と内陸の集住を比べ、海運の接点と、そこへ人や物をつなぐ陸上交通の役割を読む。',
    sources: [laePort],
    supportNotes: ['内陸高地の集住は2020年GHS-POPの観察。ラエ港の貨物機能はPNG Portsの説明。地図はラエへの実際の道路経路や貨物量を示していない。'],
  },
  nzPlacesDensity: {
    message: 'NZではタウランガ港と北島の集住地の位置を比べよう。乳製品や木材を出す港と、加工・消費を担う場所を結ぶ供給網を、人口分布からたどる入口になる。',
    sources: [tauranga],
    supportNotes: ['港の取扱品目・供給網はNZ運輸省2019年報告の2018年状況。2020年人口分布と資料年を分け、実際の輸送ルートを地図から断定しない。'],
  },
  placesDensity: {
    message: 'ラエ・タウランガ・スバなど港の代表点を人口分布と照合し、沿岸の集住と海運が接する場所を探そう。内陸や別の島の集住も確かめると、港へつなぐ交通の役割が見える。',
    sources: [laePort, tauranga, islandTransport],
    supportNotes: ['5代表点と2020年人口分布の位置を照合する読み方。港・加工施設の全件分布や個別航路、人口への効果を表す図ではない。'],
  },
  islandPlacesDensity: {
    message: '港の代表点がある島と、ほかの島の集住を比べよう。人が暮らす島々が海で隔てられる分布から、物資を運び、学校・医療へつなぐ船便や交通施設の役割を読む。',
    sources: [islandTransport],
    supportNotes: ['地図上に記録された代表点と人口の位置関係から読む。交通が公共サービスへのアクセスを支えるという説明は世界銀行のサモア・トンガ等の事例。すべての島の便や施設を網羅する意味ではない。'],
  },
} satisfies Record<string, OceaniaComparisonReading>;

const layerNames: Record<string, string> = {
  climate: '気候区分', wheat: '小麦の収穫面積', coconut: 'ココナツの収穫面積', cacao: 'カカオの収穫面積',
  sheep: '羊の密度', cattle: '牛の密度', mines: '豪州の鉱山', places: '港・加工・都市の代表点',
  density: '人口密度', cities: '都市中心の人口',
};
const isPair = (state: OceaniaState, a: string, b: string) =>
  (state.layer === a && state.compareLayer === b) || (state.layer === b && state.compareLayer === a);

/** Symmetric pairs preserve the same reading when the original/target swaps. */
export function getOceaniaComparisonReading(state: OceaniaState): OceaniaComparisonReading {
  const visibleCountries = state.scope === 'country' ? [state.place] : state.scope === 'theme' ? getOceaniaTheme(state).countryCodes : null;
  const country = visibleCountries?.length === 1 ? visibleCountries[0] : 'all';
  if (isPair(state, 'wheat', 'climate')) {
    const includesAustralia = country === 'AUS' || (country === 'all' &&
      (state.scope === 'all' || ['dryinterior', 'coastaltemperate', 'wheat', 'coasts'].includes(state.theme)));
    if (includesAustralia) return oceaniaComparisonReadings.australiaWheatClimate;
    return {
      message: '小麦の収穫面積がある場所を、気候区分の境界と見比べよう。作物の生育期に雨を得られるかが手がかりになる。薄い色の有効な値と斜線の未記録を分けて読む。',
      sources: [wheatRain, southeastRain],
      supportNotes: ['表示範囲に豪州が含まれない場合、豪州の産地集中を当該国の観察として述べない。'],
    };
  }
  if (isPair(state, 'coconut', 'climate')) {
    if (country === 'PNG' || (country === 'all' && ['altitude', 'tropical-crops'].includes(state.theme))) return oceaniaComparisonReadings.pngCoconutClimate;
    return {
      message: 'ココナツの値がある場所と、熱帯の気候区分の広がりを比べよう。高温と十分な雨は生育の手がかりになる。同じ気候区分の中でも収穫面積に差がある場所を探し、集荷・加工へつなげて読む。',
      sources: [coconutConditions, coconutWater, coconutProcessing],
      supportNotes: ['生育条件の説明を、PNGの沿岸・高地の観察と区別した島々・全体図向けの読み方。'],
    };
  }
  if (isPair(state, 'sheep', 'climate')) {
    if (state.scope === 'all' || (state.scope === 'theme' && ['wheat', 'livestock', 'coasts'].includes(state.theme))) return oceaniaComparisonReadings.sheepClimate;
    return {
      message: country === 'AUS'
        ? '豪州では南部・東部に羊の密度が高い地域があり、砂漠中心の内陸は低い。乾燥した地域の広い放牧地と、雨の多い地域の密な飼養を比べ、牧草・水・経営の条件を読む。'
        : '羊の密度が高い場所と低い場所を、気候区分の違いと比べよう。牧草の育ち方や水の確保、広い放牧地の管理を手がかりに、地域ごとの飼養と経営の条件を読む。',
      sources: [livestockSystems], supportNotes: ['表示範囲内の密度と気候を照合する。羊密度の色から経営種類や地域全体の頭数を確定しない。'],
    };
  }
  if (isPair(state, 'density', 'climate')) {
    if (country === 'PNG') return {
      message: 'PNGでは沿岸の熱帯域と中央高地の冷涼な帯の両方に集住がある。ポートモレスビーとマウントハーゲンを探し、気候が異なる場所の暮らしを交通や生活基盤と結び付けて読む。',
      sources: [laePort], supportNotes: ['2都市と高地の人口はGHS-POP・UCDBの地図上の観察。気候区分が人口集住の原因を確定するという説明ではない。'],
    };
    if (country === 'AUS' || (country === 'all' && ['dryinterior', 'coastaltemperate', 'coasts'].includes(state.theme))) return {
      message: '豪州では砂漠が広がる中央内陸より、南東部・南西部の沿岸に人口が集まる。湿潤な温帯や冬に雨を得る地域との位置関係を読み、都市を支える水の供給や交通へ考えをつなげよう。',
      sources: [southwestRain, southeastRain], supportNotes: ['人口集中と気候区分の位置関係は2020年人口密度と1991–2020年気候区分の観察。人口の因果モデルや水道の位置は示していない。'],
    };
    if (country === 'KIR') return {
      message: 'タラワには人口の集住が見える一方、気候の元データには分類のない部分がある。人口の広がりを確かめたうえで、島の淡水や交通の説明資料から暮らしの条件を読む。',
      sources: [islandTransport], supportNotes: ['局地気候データの未分類を人口ゼロや特定の気候区分に置き換えない。'],
    };
  }
  if (state.layer==='industry-all'||state.compareLayer==='industry-all') return {message:'丸は豪州の鉱種別の稼働鉱山、ひし形は港・加工・サービスの代表地点です。同じ範囲の分布と位置関係を比べます。記号の数や大きさから生産量や埋蔵量を推定せず、鉱山は豪州のみ、代表地点は全数調査ではないという収録範囲を保って読みます。',sources:[mineralMap,...oceaniaIndustryReadingThemes.flatMap(item=>item.sources)],supportNotes:['異なる資料の代表点を数量分布として合算しない。']};
  if (isPair(state, 'mines', 'density')) {
    if (country === 'AUS' || (country === 'all' && (!visibleCountries || visibleCountries.includes('AUS')))) return oceaniaComparisonReadings.minesDensity;
    return {
      message: '鉱山の点は豪州の記録なので、この範囲の人口分布と鉱山の有無は照合できない。豪州へ切り替えると、西部の採掘地と沿岸の集住の位置を比べられる。',
      sources: [mineralMap], supportNotes: ['豪州のみの収録範囲を、他国の鉱山ゼロと取り違えない。'],
    };
  }
  if (isPair(state, 'places', 'cities')) return {
    message: country === 'KIR'
      ? 'キリバスの都市中心と港代表点は本データに未収録。人口密度へ切り替えるとタラワの集住を確認できる。点の不収録と、暮らしがないことを分けて読む。'
      : '港・加工の代表点と都市中心の位置を比べ、重なる場所と離れる場所を探そう。円の面積は都市中心の人口を表す。港や資源地区と都市をつなぐ交通の役割を読む。',
    sources: country === 'PNG' ? [laePort] : country === 'NZL' ? [tauranga] : [islandTransport],
    supportNotes: ['都市中心の点と代表点を照合する比較で、人口密度の面分布を示しているとは説明しない。未収録の点は都市・施設の不存在を意味しない。'],
  };
  if (isPair(state, 'places', 'density')) {
    if (country === 'PNG') return oceaniaComparisonReadings.pngPlacesDensity;
    if (country === 'NZL') return oceaniaComparisonReadings.nzPlacesDensity;
    if (country === 'KIR' || country === 'PYF') return {
      message: `${country === 'KIR' ? 'タラワ' : 'タヒチ'}の集住を確かめよう。この代表点集には当地の港を収録していないため、人口の広がりを読み、島外からの物資や学校・医療への接続を交通の説明資料へつなげる。`,
      sources: [islandTransport], supportNotes: ['国・地域の選択を保持した局地図では、別の島や未収録の港の位置を見えていると説明しない。'],
    };
    if (['WSM', 'TON', 'TUV'].includes(country)) return {
      message: '集住地がある島と、ほかの島の人口の広がりを比べよう。当地の港はこの代表点集に未収録だが、学校・医療・仕事へ通うための道路や船便の役割を、交通の事例資料から考えられる。',
      sources: [islandTransport], supportNotes: ['サモア・トンガ等の交通改善事例を生活の説明に使用。選択国の港・航路を地図で確認したとはしない。'],
    };
    if (['FJI', 'SLB'].includes(country) || state.theme === 'island-society') return oceaniaComparisonReadings.islandPlacesDensity;
    if (country === 'AUS') return {
      message: '豪州の港・加工施設はこの代表点データには収録していない。人口の沿岸への集中を確かめたら、鉱山へ切り替え、西部の資源産地との位置の違いを読む。',
      sources: [mineralMap], supportNotes: ['代表点の不収録と施設がないことを区別する。'],
    };
    if (state.scope === 'all') return oceaniaComparisonReadings.placesDensity;
    const ports = [['PNG', 'ラエ'], ['NZL', 'タウランガ'], ['SLB', 'ノロ'], ['FJI', 'スバ']].filter(([code]) => visibleCountries?.includes(code)).map(([, name]) => name);
    return {
      message: ports.length
        ? `${ports.join('・')}の代表点と人口分布を照合し、海運が接する場所を探そう。内陸や別の島の集住も確かめ、港へ人や物をつなぐ交通の役割を読む。`
        : '当地の港・加工地区はこの代表点集には未収録。人口の広がりを確かめ、物資や生活サービスへつなぐ交通の役割を説明資料から読む。点がないことを施設の不存在とは扱わない。',
      sources: [islandTransport], supportNotes: ['表示範囲に含まれる代表点だけを述べ、別の国・島の点を当地の観察として扱わない。'],
    };
  }
  if (isPair(state, 'density', 'cities')) return {
    message: country === 'KIR'
      ? 'タラワには人口密度の値があるが、キリバスは都市中心のデータに未収録。密度の広がりを見ると、都市の点がない場所にも暮らしがあると分かる。'
      : '人口密度の広がりの上で、都市中心の円がある場所を探そう。円の周囲にも集住が続くかを確かめると、都市の点だけでは拾えない暮らしの分布が見える。円の面積は都市中心の人口を表す。',
    sources: [], supportNotes: ['都市中心の人口と人口密度は集計範囲と単位が異なる。都市中心が未収録の島も人口ゼロとは読まない。'],
  };
  return {
    message: `${layerNames[state.layer] ?? '元の分布'}と${layerNames[state.compareLayer] ?? '比較先の分布'}が重なる場所・離れる場所を探そう。それぞれの凡例で対象を確認し、産地・施設・集住のどの位置が対応するかを読む。`,
    sources: [], supportNotes: ['任意選択の組合せでは、確認していない国別の分布や因果関係を追加しない。'],
  };
}
