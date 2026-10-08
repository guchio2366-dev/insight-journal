/** Definitions and factual example kept separate from national forest statistics. */
export const europeTreeCoverReading = {
  title: '樹木被覆の分布',
  period: '2021',
  takeaway: '北欧やロシア西部の樹木被覆と、国ごとの丸太・製材生産量を読み比べます。',
  body: '地図下の2024年統計では、スウェーデンとフィンランドに加えてドイツも製材量の上位です。フィンランドのラッペーンランタにあるUPMカウカスは木材加工拠点の一例です。樹木がある場所と加工する場所を示す資料は異なり、この地図から工場の木材調達先や供給量は判断できません。',
  note: 'ESA WorldCover 2021の樹木被覆区分を使った概略図です。区分には植林地やオリーブ等の樹木作物も含まれ、FAOの森林定義や商業林と同じではありません。森林型、伐採量、木材生産量、面積比率は示しません。元資料の10mという解像度は、この表示の位置精度を意味しません。国別の森林面積比率は別の2023年統計です。',
  sources: [
    { label: 'ESA WorldCover：2021年の土地被覆と利用条件', url: 'https://esa-worldcover.org/en/data-access' },
    { label: 'ESA WorldCover：樹木被覆区分の定義（利用者向け資料）', url: 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/docs/WorldCover_PUM_V2.0.pdf' },
    { label: 'UPM：カウカスの木材加工拠点', url: 'https://www.upmpulp.com/pulp-production/kaukas/' },
    { label: 'FAOSTAT Forestry：丸太・製材の国別生産量', url: 'https://www.fao.org/faostat/en/#data/FO' },
  ],
  comparisonQuestions: {
    kaukas: '樹木被覆の分布とカウカスの加工拠点の位置を比べ、資源の分布と加工する場所を区別して確かめます。',
    climate: '北欧とロシア西部の樹木被覆を気候区分と読み比べます。気候だけで樹木の分布や林業の立地を決めつけず、資料の対象年と区分の定義を確かめます。',
    terrain: '樹木被覆と山地・低地の位置を読み比べます。土地被覆と標高は異なる資料で、重なりだけから植生の理由や木材生産量を判断することはできません。',
  },
};
