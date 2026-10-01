// Focus pages share the verified South/Central Asia datasets and their scope.
// The viewport changes; national statistics are not relabelled as subregional totals.
import type {AsiaField} from '../../lib/atlas-asia-state';
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

export const asiaFocusCountries:Record<AsiaFocusId,readonly string[]>={
 'south-asia':['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK'],
 'central-asia':['KAZ','KGZ','TJK','TKM','UZB'],
};
export function asiaFocusForPath(pathname:string):AsiaFocusId|undefined{
 return asiaFocusIds.find(id=>pathname.includes(`/atlas/asia/${id}/`));
}
export type AsiaFocusFieldReading={title:string;takeaway:string;reading:string;source:{label:string;url:string}};
const centralWaterSource={label:'FAO・中央アジアの灌漑（2013年、本文186–187頁）',url:'https://www.fao.org/4/i3289e/i3289e.pdf#page=202'};
const centralAgricultureSource={label:'FAO・中央アジアの灌漑（2013年、本文107・109–110・186頁）',url:'https://www.fao.org/4/i3289e/i3289e.pdf#page=123'};
const centralTransportSource={label:'世界銀行・Uzbekistan Country Case Study（2020年、3・15–18頁）',url:'https://documents1.worldbank.org/curated/en/688501593501612264/pdf/South-Caucasus-and-Central-Asia-The-Belt-and-Road-Initiative-Uzbekistan-Country-Case-Study.pdf'};
// These are reading guides for a focused viewport, not additional statistics.
// A selected country, city or dataset must retain its own definition and values.
export const asiaFocusFieldReadings:Partial<Record<AsiaFocusId,Record<AsiaField,AsiaFocusFieldReading>>>={
 'central-asia':{
  natural:{title:'乾燥した低地と、水を集める山地をつなぐ',takeaway:'中央アジアの水は、雨の降る場所と使う場所が同じとは限りません。山地から低地へ続く流域を、国境を越えて読みます。',reading:'気候・年降水量・流域を切り替え、アムダリヤ川とシルダリヤ川の上流と下流を追ってください。灌漑や貯水・配分の仕組みも水利用を左右します。雨量や帯水層の色から、現在の取水量や利用可能量は求められません。',source:centralWaterSource},
  agriculture:{title:'北の小麦と、河川沿いの綿花を読み分ける',takeaway:'カザフスタン北部の小麦と、ウズベキスタンなどの綿花は、栽培時期・水・灌漑・市場とのつながりを分けて考えると違いが見えます。',reading:'小麦・綿花・羊を順に選び、同じ地域にどの分布があるかを確かめます。綿花の拡大には灌漑設備と歴史的な生産政策も関わりました。乾燥した土地という条件だけで、作物や人々の営みが決まるわけではありません。',source:centralAgricultureSource},
  industry:{title:'資源や農産物を、加工と市場への道につなぐ',takeaway:'原料があることに加え、加工する技術と人材、国境を越える輸送や取引の仕組みが産業を支えます。',reading:'国別の製造業・サービス業・資源の指標と、穀物や綿製品の輸出を比べてください。内陸国から市場へ届ける条件は、隣国の交通網や国境での手続きにも左右されます。国の付加価値や輸出額を、都市の工場の生産量とは読み替えません。',source:centralTransportSource},
  population:{title:'人の集まりを、仕事と都市の受け皿から読む',takeaway:'都市の人口の集まりは、自然条件に加え、仕事・交通・住宅・公共サービスと合わせて読む必要があります。',reading:'タシケントなどの都市範囲と周辺の人口密度を見比べ、産業と交通を考える入口にします。世界銀行の2020年研究は、輸送の改善とともに労働移動、住宅や都市サービスを整える必要を論じています。人口密度から職業・民族・信仰・政治的意見は推定できません。',source:centralTransportSource},
 },
};

export const indiaPopulationLabels:Record<string,string>={
 'uc-7963':'首都ニューデリーを含む都市のまとまりです。インド北部の平野に続く人口の集中を確かめられます。',
 'uc-7599':'西岸のムンバイです。海岸沿いの大きな人口の集まりを、内陸の分布と比較できます。',
 'uc-11352':'東部のコルカタです。ベンガルの平野へ続く人口の密な分布を確かめられます。',
 'uc-10300':'南東岸のチェンナイです。インド南部の沿岸の人口集中を確かめられます。',
};
// Editorial selection for uncluttered regional maps; every station keeps a point.
export const majorClimateCities = new Set([
 'tokyo','beijing','shanghai','seoul','taipei','ulaanbaatar',
 'bangkok','yangon','singapore','jakarta','quezon-city',
 'new-delhi','mumbai','karachi','dhaka','colombo','astana','tashkent','almaty',
]);
