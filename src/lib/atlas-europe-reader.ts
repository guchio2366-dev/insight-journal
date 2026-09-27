import type { EuropeLayer } from '../data/atlas/europe/layers';

/** Short reading guidance; source/method detail remains with the map legend. */
export function europeReaderCopy(layer:EuropeLayer) {
  if(layer.id==='crops')return {
    title:'作物の分布',takeaway:'欧州の作物は地域ごとに組み合わさって栽培されています。',
    body:'地図の作物名を押すと、その品目の収穫面積を個別の図で確認できます。この一枚絵は収録済みの12区分を重ねた概況図で、斜線は2品目が目立つ場所です。',
    note:'2020年頃のモデル推計です。ブドウとオリーブの単独分布は元データに含まれず、この図には示していません。',
  };
  if(layer.id==='water')return {
    title:'河川・湖',takeaway:'国境を越えて続く川をたどり、水のつながりを読みます。',
    body:'青い線は河川、青い面は湖です。ドナウ川やライン川の名前を押すと、流域の国々と水利用の関係を確認できます。',
    note:'線の太さは流量を表しません。小さな河川や湖は省略しています。',
  };
  if(layer.id==='terrain')return {
    title:'地形・標高',takeaway:'山地と低地の位置関係を、標高の色から読みます。',
    body:'アルプスの名前を押すと、国境をまたぐ山地の説明を表示します。地図を押すと、その地点の標高を地図の下に表示します。',
    note:'標高は表示用に平均化しています。細かな峰や谷は省略しています。',
  };
  if(layer.id==='contours')return {
    title:'標高（等高線）',takeaway:'同じ高さの場所を結ぶ線で、山地の起伏を読みます。',
    body:'等高線は500m間隔で、1,000mごとの線を濃くしています。地図を押すと、その地点の標高を地図の下に表示します。',
    note:'表示用に平均化した標高から作った概略図です。',
  };
  if(layer.id==='hubs')return {
    title:'産業の拠点',takeaway:'拠点名を押すと、その場所が担う産業を確認できます。',
    body:'工場、港、研究開発など、出典で確認できる代表地点を掲載しています。地図上の名前から、立地と役割を読み比べます。',
    note:'点の数や大きさは、生産量・雇用の大小を表しません。',
  };
  if(layer.id==='density')return {
    title:'人口分布',takeaway:'色の濃淡で、人が集まる場所と少ない場所を読みます。',
    body:'色は2020年の人口密度を表します。地図を押すと、その地点の人口密度を地図の下に表示します。都市名は位置を確かめる目印です。',
    note:'格子ごとのモデル推計です。現在の人口移動を表すものではありません。',
  };
  if(layer.field==='agriculture'&&layer.grid) {
    const livestock=['cattle','pig','sheep','chicken'].includes(layer.id);
    return {title:layer.title+'の分布',takeaway:livestock?'家畜の密度を、色の濃淡で読みます。':'栽培地の広がりを、収穫面積の濃淡で読みます。',
      body:livestock?'色が濃い格子ほど、単位面積あたりの飼養頭羽数が多いと推計されています。':'色が濃い格子ほど、収穫面積が多いと推計されています。地図を押すと、その格子の面積を地図の下に表示します。',
      note:livestock?'2020年のモデル推計です。農場の実測位置や現在の頭羽数ではありません。':'2020年頃のモデル推計です。現在の生産量や作付面積の割合を示す図ではありません。'};
  }
  return {title:layer.title,takeaway:layer.title+'を、国ごとの色で読み比べます。',body:layer.note,note:'国を押すと、その国の数値を表示します。'};
}
