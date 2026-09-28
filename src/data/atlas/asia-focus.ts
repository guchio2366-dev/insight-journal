// Focus pages share the verified South/Central Asia datasets and their scope.
// The viewport changes; national statistics are not relabelled as subregional totals.
export const asiaFocusViews = {
 'south-asia': {
  label:'南アジア', bounds:[60.8,5.5,97.6,37.2] as [number,number,number,number],
  title:'季節風の雨と、ヒマラヤから流れる水を読む',
  summary:'インド周辺を中心に、沿岸・平野・山地の違いを比べます。雨温図で雨の季節を確かめ、水資源ではインダス川やガンジス川につながる流域を追えます。',
  questions:['沿岸と内陸で、雨の多い季節はどう違うか。','川に集まる水は、どの山地や平野を通るか。','米の栽培域は、多雨域や河川の流域とどう重なるか。'],
 },
 'central-asia': {
  label:'中央アジア', bounds:[46.4,29.2,87.4,55.5] as [number,number,number,number],
  title:'内陸の乾燥と、山地から届く水を読む',
  summary:'カザフスタン、ウズベキスタン、トルクメニスタン、キルギス、タジキスタンを中心に表示します。都市の雨温図で寒暖差を比べ、流域図で山地と乾燥した低地のつながりを確かめます。',
  questions:['冬と夏の気温差は、都市によってどう違うか。','アムダリヤ川とシルダリヤ川には、どの範囲の水が集まるか。','降水の少ない地域で、農業の分布は川とどう重なるか。'],
 },
};
export type AsiaFocusId = keyof typeof asiaFocusViews;
export const asiaFocusIds = Object.keys(asiaFocusViews) as AsiaFocusId[];

// Editorial selection for uncluttered regional maps; every station keeps a point.
export const majorClimateCities = new Set([
 'tokyo','beijing','shanghai','seoul','taipei','ulaanbaatar',
 'bangkok','yangon','singapore','jakarta','quezon-city',
 'new-delhi','mumbai','karachi','dhaka','colombo','astana','tashkent','almaty',
]);
