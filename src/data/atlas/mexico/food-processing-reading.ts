export const mexicoFoodProcessingReading = {
  takeaway: '国内外の原料を加工し、ふだんの食事と輸出へつなぐ。',
  products: [
    {input: 'とうもろこし・小麦', output: '製粉、トルティーヤ、パン・ビスケット・麺'},
    {input: '生乳・乳原料', output: '牛乳・チーズ・ヨーグルトなどの乳製品'},
    {input: '肉', output: 'ハム・ソーセージなどの食肉加工品'},
    {input: '果実・野菜', output: '冷凍品・缶詰'},
  ],
  chain: [
    {title: '原料を調達', text: '国内の農畜産物＋輸入原料・添加物'},
    {title: '加工・保存', text: '製粉・加熱・発酵・冷凍・缶詰'},
    {title: '消費・輸出', text: '国内の小売・外食＋加工食品の輸出'},
  ],
  connection: '国内の農畜産物を生かし、量や品質の条件を満たすために輸入原料・添加物も使う。加工から販売までの温度管理や配送が、産地と都市の小売・外食、海外市場をつなぐ。',
  regions: {
    period: '生産の地域例｜2019年経済センサス',
    text: 'DataMexicoの総生産額では、西部のハリスコと首都周辺のメヒコ州が大きい。原料を運ぶ距離と消費市場への接続を、州の位置から考える。',
    note: '2019年経済センサスの例で、現在の順位を示すものではありません。地図の州名は別の指標である2025年公開輸出額の上位例です。',
    places: [{state: '14', name: 'ハリスコ'}, {state: '15', name: 'メヒコ州'}],
  },
  classification: '食品製造311の代表例。生鮮の農産物輸出と加工食品の輸出は区分が異なります。ビール・テキーラなどは飲料製造3121に分け、この食品製造311の値には含めません。',
  sources: [
    {label: 'USDA FAS：原料調達・加工・販売（2026年報告）', url: 'https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Food+Processing+Ingredients+Annual_Mexico+City+ATO_Mexico_MX2026-0022.pdf', report: 'MX2026-0022', published: '2026-04-06', sections: 'II: Market Structure / main sectors / company products; III: Competition'},
    {label: 'DataMexico：食品製造311・2019年経済センサス', url: 'https://www.economia.gob.mx/datamexico/en/profile/industry/food-manufacturing', section: 'Production Indicators by State; total gross production', scope: '2019 Economic Census; the profile GDP chart describes manufacturing as a whole and is not used as food GDP'},
  ],
};
