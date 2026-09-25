import type { AsiaRegionId } from '../../lib/atlas-asia-state';
export const asiaRegionReading: Record<AsiaRegionId,{eyebrow:string;title:string;summary:string;questions:string[];bounds:[number,number,number,number]}> = {
  'east-asia':{
    eyebrow:'海から内陸へ、低地から高地へ',title:'気温と雨の季節差から、東アジアを読む',
    summary:'同じ地域でも、沿岸と内陸、南北、高度によって気候は変わります。気候区分で広がりをつかみ、都市の雨温図で一年の変化を確かめてください。',
    questions:['沿岸と内陸では、冬と夏の気温差はどう違うか。','雨が多い季節と、暖かい季節は重なっているか。','米の分布と重ねると、気候だけでは説明できない場所はどこか。'],bounds:[72,17,155,56]
  },
  'southeast-asia':{
    eyebrow:'大陸部と島々の季節を比べる',title:'一年中暖かい地域にも、雨の季節差がある',
    summary:'気温の年較差だけでなく、降水量の月ごとの違いに注目します。大陸部と島嶼部を行き来して、乾いた季節の長さや、雨のピークを比較してください。',
    questions:['気温が似た都市でも、雨の少ない月は同じか。','赤道の南北で、一年の雨の変化はどう違うか。','島や国の中でも、山地と低地で分布は変わるか。'],bounds:[91,-12,143,30]
  },
  'south-central-asia':{
    eyebrow:'海につながる地域と、広い内陸',title:'雨の季節と乾燥、標高の違いを読み分ける',
    summary:'南アジアと中央アジアを一つの地図で見ながら、都市ごとの気温と雨の変化を比べます。国の平均にまとめず、沿岸・内陸・高地それぞれの条件を確認してください。',
    questions:['雨が特定の月に集中する都市はどこか。','中央アジアの都市では、冬の寒さと夏の暑さはどう違うか。','米の分布と気候を比べると、水の供給も考える必要がある場所はどこか。'],bounds:[45,-2,99,57]
  }
};
