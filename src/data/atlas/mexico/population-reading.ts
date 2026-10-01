export const mexicoPopulationReadingSources = {
  geography: 'https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=702825267575',
  manufacturing: 'https://www.trade.gov/country-commercial-guides/mexico-advanced-manufacturing',
  transport: 'https://www.trade.gov/country-commercial-guides/mexico-transportation-infrastructure-equipment-and-services',
  trade: 'https://ustr.gov/countries-regions/americas/mexico',
};

export const mexicoPopulationReading = {
  title: '人口の集積を、地形と仕事・交通から読む',
  takeaway: '中央部の高地に人口が集まり、北部では広い州の中に輸出産業の拠点が育つ。',
  mechanism: '高原・山地・盆地の広がり → 都市と工業の立地 → 国内の市場・港・米国国境への交通 → 人口の集積と生活・物流を支える需要。',
  densityMeaning: '色は州全域の人口密度。メキシコ市とメキシコ州は別の行政区域として読みます。',
  populationMeaning: '円の面積は州の人口。円の中心は州の位置を案内します。',
  scaleExplanation: '同じ2020年の人口規模と密度を比べます。メキシコ州は人口が最多で、面積の小さいメキシコ市は密度が最も高い。北部の大きな州には、州平均密度が低くても人口の多い州があります。',
  industryExplanation: '2020年の州人口と、2025年の輸送機器・電子産業の州別輸出額を比べます。人口の集まりと輸出産業の立地がどう重なるかを、人口は人、輸出額は10億米ドルの別尺度で読みます。',
  natureExplanation: '地形の自然地理地域区分と、2020年の州別人口密度を別図で比べます。中央部の高地・盆地と人口が集まる州の位置関係が分かります。',
  regions: {
    central: {
      states: ['09', '15', '13', '17', '21', '29'],
      heading: '中央部：大きい人口と高い密度を分ける',
      text: 'メキシコ市とメキシコ州は、中央部の首都圏にある別の行政区域です。メキシコ州の人口は約1,699万人、メキシコ市は約921万人。密度はメキシコ市の方が高く、行政区域の面積と人口の両方を読む必要があります。',
      cause: '中央部の都市・産業の集積は、生活の市場と人・物の移動を大きくします。貨物鉄道は工業中心地から港や米国国境へつながり、都市への集積に合わせて住宅・交通・水道などを支える整備が必要になります。',
    },
    northern: {
      states: ['02', '03', '05', '08', '10', '19', '26', '28'],
      heading: '北部：低い州平均密度と輸出産業の拠点',
      text: 'チワワ州は約374万人が暮らす広い州で、州全域の平均密度は15.1人/km²です。州平均の色を都市内部の密度と読み替えず、北部にある工業拠点とあわせて読みます。',
      cause: 'チワワ・ヌエボ・レオン・コアウイラ・ソノラでは、米国への近さを生かした自動車・電子などの製造業が集まります。工業中心地を港や国境へ結ぶ貨物鉄道が市場への輸送を支え、都市と物流を支える需要が生まれます。',
    },
    bajio: {
      states: ['01', '06', '11', '14', '16', '18', '22', '24', '25', '32'],
      heading: '中西部：国内の都市と工業・輸送のつながり',
      text: 'グアナフアト・ケレタロ・アグアスカリエンテス・サン・ルイス・ポトシは、バヒオ地域の製造業の集積を読む州です。ハリスコ州のグアダラハラには電子などの産業が集まります。',
      cause: '内陸にも自動車・航空・電子の拠点があります。人口のある都市、部品を運ぶ交通、国内外の市場をつなげて、人口規模と輸出産業の重なりを比べます。',
    },
    south: {
      states: ['04', '07', '12', '20', '23', '27', '30', '31'],
      heading: '南部・沿岸：州全域の分布を読む',
      text: '沿岸と山地を含む州では、州平均密度と人口規模を一緒に確かめます。平均値は州内部の都市と農村をまとめた値です。人口がどの場所に集まるかは、地形区分との比較で位置関係を読みます。',
      cause: '自然条件と人口分布に、農業・都市の仕事・交通が重なります。農林業のページでは作物の生産分布を、主要産業のページでは輸出額の分布を読み、州の人口とのつながりを考えます。',
    },
  },
};

export function mexicoPopulationRegionReading(stateCode: string) {
  return Object.values(mexicoPopulationReading.regions).find(region => region.states.includes(stateCode))
    ?? mexicoPopulationReading.regions.central;
}
