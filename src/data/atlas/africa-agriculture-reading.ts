/** Reading guidance for modelled 2020 crop and livestock distributions. */
export type AfricaAgricultureReadingState = {
  topic: string;
  crop: string;
  cropMeasure: string;
  livestock: string;
};

const cropReadings: Record<string, {name: string; condition: string; management: string}> = {
  maize: {name: 'トウモロコシ', condition: '生育期の雨と気温が栽培の条件になります。', management: '品種・施肥・灌漑に加え、貯蔵や市場までの交通が収穫と販売を変えます。'},
  rice: {name: '米', condition: '低地の水田だけでなく雨水に頼る栽培もあり、水と気温が条件になります。', management: '水田整備・水の配分・労働・精米や流通のしくみが収穫と販売を変えます。'},
  wheat: {name: '小麦', condition: '比較的涼しい生育期や高地の気温が栽培の条件になります。', management: '播種時期・品種・灌漑に加え、製粉や市場へのアクセスが収穫と販売を変えます。'},
  cassava: {name: 'キャッサバ', condition: '暖かい地域で育ち、乾燥に耐える性質も栽培の条件になります。', management: '病害対策・加工・収穫後の輸送が利用と販売を変え、気候だけでは分布を説明できません。'},
};
const livestockReadings: Record<string, {name: string; condition: string; management: string}> = {
  cattle: {name: '牛', condition: '草地・飼料・水が飼養の条件になります。', management: '飼料の供給、獣医療、移動の経路、集乳・食肉市場へのアクセスが飼養を変えます。'},
  goats: {name: '山羊', condition: '草や低木を利用できる土地と水が飼養の条件になります。', management: '群れの管理、獣医療、季節移動、土地利用の権利と市場へのアクセスが飼養を変えます。'},
  sheep: {name: '羊', condition: '草地や高地の環境と水が飼養の条件になります。', management: '飼料の確保、獣医療、季節移動、土地利用の権利と市場へのアクセスが飼養を変えます。'},
};

export function africaAgricultureReading(state: AfricaAgricultureReadingState) {
  if(['coffee','tea'].includes(state.crop)&&state.topic!=='livestock')return {title:state.crop==='coffee'?'コーヒーの生産と利用':'茶の生産と利用',takeaway:'確認済みの背景を、加工・流通と合わせて読みます。',reading:'この品目の2020年SPAM原格子は未取得です。図の面分布や地点値を補作していません。',scope:'分布未取得は、生産0や生育不可能を意味しません。',compareMetric:'AG.LND.ARBL.ZS',compareLabel:'国全体の耕地割合と比べる',compareTakeaway:'分布原格子は未取得です。',compareText:'国別の耕地割合から品目の生産量を逆算しません。',sourceLabel:'IFPRI SPAM 2020（未取得格子の原典）',source:'https://doi.org/10.7910/DVN/SWPENT'};
  if (state.topic === 'livestock') {
    const item = livestockReadings[state.livestock] ?? livestockReadings.cattle;
    return {
      title: `${item.name}の密度と、飼養を支えるしくみ`,
      takeaway: '自然は飼養の条件。飼料・水・管理・市場へのアクセスも分布を変えます。',
      reading: `${item.condition}${item.management}GLW4は各地の統計を環境などの情報で空間配分したモデルです。気候図との重なりだけで、自然条件の効果を独立に確かめることはできません。`,
      scope: '2020年の統計総数に整合させた推定密度（頭/km²）。入力統計の調査年は国・種別で異なり、2020年に全頭を一斉調査した分布ではありません。色の広さは総頭数を表しません。0と値なしを区別します。',
      compareMetric: 'NV.AGR.TOTL.ZS',
      compareLabel: '農林水産業のGDP割合と比べる',
      compareTakeaway: '家畜の密度と農林水産業のGDP割合は別の量です。畜産以外や他産業の規模も読みます。',
      compareText: '元の家畜密度と全凡例を残し、選択年の国全体の農林水産業付加価値/GDPを比べます。畜産だけの価値や家畜の頭数ではありません。経済構成の違いを考える手掛かりです。',
      sourceLabel: 'FAO GLW4 2020（モデル推定・CC BY 4.0）',
      source: 'https://data.apps.fao.org/catalog/iso/9d1e149b-d63f-4213-978b-317a8eb42d02',
    };
  }
  const item = cropReadings[state.crop] ?? cropReadings.maize;
  const production = state.cropMeasure === 'production';
  return {
    title: `${item.name}の${production ? '生産量' : '収穫面積'}と、栽培を支えるしくみ`,
    takeaway: '気候と水は栽培の条件。技術・交通・市場・土地の制度も生産を変えます。',
    reading: `${item.condition}${item.management}SPAMは統計と土地利用などから生産を格子に配分したモデルです。自然条件との重なりを、気候だけで生産が決まる証拠としては読めません。`,
    scope: production
      ? '2020年の推定生産量（t/元の5分角セル）。収量（t/ha）や土地の被覆率ではありません。セル面積は緯度で変わり、国別総量とは別の読み方です。0と値なしを区別します。'
      : '2020年の推定収穫面積（ha/元の5分角セル）。多期作は収穫ごとに数えるため、実際の農地面積や土地の被覆率ではありません。セル面積は緯度で変わります。0と値なしを区別します。',
    compareMetric: 'AG.LND.ARBL.ZS',
    compareLabel: '国全体の耕地割合と比べる',
    compareTakeaway: '作物の格子分布と国全体の耕地割合は別の量です。耕地が広くても、この作物の生産が多いとは限りません。',
    compareText: '元の作物分布と全凡例を残し、選択年の国全体の耕地割合を比べます。耕地割合は選んだ作物の面積・生産量・収量ではありません。土地利用と作物の集中が一致するかを考える手掛かりです。',
    sourceLabel: 'IFPRI SPAM 2020 v2r2（モデル推定・CC BY 4.0）',
    source: 'https://doi.org/10.7910/DVN/SWPENT',
  };
}
