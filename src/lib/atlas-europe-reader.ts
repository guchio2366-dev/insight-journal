import type { EuropeLayer } from '../data/atlas/europe/layers';

/** Short reading guidance; source/method detail remains with the map legend. */
export function europeReaderCopy(layer:EuropeLayer) {
  if(layer.id==='crops')return {
    title:'欧州の農林業',takeaway:'作物の栽培域と家畜の飼養地域を、同じ地図で見渡します。',
    body:'左上の「作物の分布」「畜産の分布」で、それぞれの表示を切り替えます。地図や地図下の品目名を選ぶと、表示中の分布の輪郭と説明がその品目にそろいます。ほかの品目も残るため、分布の重なりを読み比べられます。1品目だけを見るときは、説明欄の「小麦のみの表示に切り替える」などのボタンを使います。',
    note:'2020年頃のモデル推計から主な分布を取り出した概略図です。色は品目を示し、濃さは数量を示しません。牛の肉用・乳用、鶏の肉用・採卵用は未分離で、ブドウ・オリーブ単独の分布は未収録です。',
  };
  if(layer.id==='water')return {
    title:'河川・湖',takeaway:'国境を越えて続く川をたどり、水のつながりを読みます。',
    body:'青い線は河川、青い面は湖です。ドナウ川やライン川の名前を押すと、流域の国々と水利用の関係を確認できます。',
    note:'線の太さは流量を表しません。小さな河川や湖は省略しています。',
  };
  if(layer.id==='terrain')return {
    title:'地形・標高',takeaway:'山地と低地の位置関係を、標高の色から読みます。',
    body:'アルプスの名前を押すと、国境をまたぐ山地の説明を表示します。地図を押すと、その地点の標高を下部の統計領域に表示します。',
    note:'標高は表示用に平均化しています。細かな峰や谷は省略しています。',
  };
  if(layer.id==='contours')return {
    title:'標高（等高線）',takeaway:'同じ高さの場所を結ぶ線で、山地の起伏を読みます。',
    body:'等高線は500m間隔で、1,000mごとの線を濃くしています。地図を押すと、その地点の標高を下部の統計領域に表示します。',
    note:'表示用に平均化した標高から作った概略図です。',
  };
  if(layer.id==='hubs')return {
    title:'産業の拠点',takeaway:'拠点名を押すと、その場所が担う産業を確認できます。',
    body:'工場、港、研究開発など、出典で確認できる代表地点を掲載しています。地図上の名前から、立地と役割を読み比べます。',
    note:'点の数や大きさは、生産量・雇用の大小を表しません。',
  };
  if(layer.id==='density')return {
    title:'人口分布',takeaway:'色の濃淡で、人が集まる場所と少ない場所を読みます。',
    body:'色は2020年の人口密度を表します。地図を押すと、その地点の人口密度を下部の統計領域に表示します。都市名は位置を確かめる目印です。',
    note:'格子ごとのモデル推計です。現在の人口移動を表すものではありません。',
  };
  if(layer.field==='agriculture'&&layer.grid) {
    const livestock=['cattle','pig','sheep','chicken'].includes(layer.id);
    const definition=layer.id==='cattle'?'牛は肉用・乳用を分けていません。':layer.id==='chicken'?'鶏は肉用・採卵用を分けていません。':'';
    return {title:layer.title+'の分布',takeaway:livestock?`${layer.title}が主に飼養される地域を、分布の面と輪郭から読みます。`:`${layer.title}の主な栽培域を、分布の面と輪郭から読みます。`,
      body:'表示中の品目を選ぶと、その分布の輪郭を濃くし、ほかの品目の分布も残します。表示がOFFのときは説明だけを切り替えます。この品目だけの分布を見たいときは、上の表示ボタンを使ってください。地図を押した地点の元格子の推計値は、下部の統計領域で確認できます。',
      note:(livestock?'2020年の家畜密度のモデル推計から、主な飼養地域を取り出しています。':'2020年頃の収穫面積のモデル推計から、主な栽培域を取り出しています。')+'色の濃さは数量を示しません。色のない場所でも生産がないとは限らず、面の輪郭は農場や農地の実際の境界ではありません。'+definition};
  }
  return {title:layer.title,takeaway:layer.title+'を、国ごとの色で読み比べます。',body:layer.note,note:'国を押すと、その国の数値を表示します。'};
}
