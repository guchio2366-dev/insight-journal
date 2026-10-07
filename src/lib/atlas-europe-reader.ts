import type { EuropeLayer } from '../data/atlas/europe/layers';
import { climateFarming, cityFarming } from '../data/atlas/europe/climate-farming.ts';
import { europeReadings } from '../data/atlas/europe/readings.ts';
import { europeTreeCoverReading } from '../data/atlas/europe/tree-cover-reading.ts';
import { europePrecipitationReading } from '../data/atlas/europe/water-reading.ts';
import { drainageReading } from '../data/atlas/europe/drainage-reading.ts';

type ReaderMessage = { takeaway: string; body: string };
type ReaderSource = { url: string; label: string };

function readingSources(...ids: string[]): ReaderSource[] {
  return ids.flatMap(id => {
    const reading = europeReadings.find(item => item.id === id);
    return reading ? [{ url:reading.source, label:reading.sourceLabel }] : [];
  });
}

const factualSources: Record<string, ReaderSource[]> = {
  climate:[...climateFarming.Cfb.sources,...climateFarming.Dfa.sources,...climateFarming.BSk.sources],
  crops:[...climateFarming.Cfb.sources,...climateFarming.Dfa.sources,...climateFarming.BSk.sources],
  wheat:[...climateFarming.Cfb.sources,...climateFarming.Cfa.sources,...climateFarming.Dfa.sources],
  barley:[...climateFarming.Cfb.sources,climateFarming.Dfb.sources[0]],
  maize:[...climateFarming.Cfa.sources,...climateFarming.Dfa.sources],
  rapeseed:climateFarming.Dfa.sources,
  sunflower:[...climateFarming.Dfa.sources,...climateFarming.Cfa.sources],
  rice:readingSources('alps'),
  soybean:climateFarming.Cfa.sources,
  vegetables:climateFarming.Csb.sources,
  temperatefruit:[...climateFarming.Csb.sources,climateFarming.Csa.sources[1]],
  cattle:[...climateFarming.Cfb.sources,climateFarming.Dfb.sources[1]],
  pig:[...climateFarming.Cfa.sources,...climateFarming.Csb.sources],
  chicken:climateFarming.Csb.sources,
  sheep:[...climateFarming.Cfb.sources,...cityFarming.reykjavik.sources,cityFarming.athens.sources[1]],
  water:readingSources('danube','rhine','rotterdam','ludwigshafen'),
  terrain:readingSources('alps'),
  contours:readingSources('alps'),
  hubs:readingSources('rotterdam','ludwigshafen','toulouse'),
  density:readingSources('kiruna','oulu'),
  forest:readingSources('kaukas'),
  manufacturing:readingSources('munich','mlada'),
  industry:readingSources('kiruna','munich'),
  services:readingSources('frankfurt'),
};

/** Sources for the reader's factual examples, separate from the map-data link. */
export function europeReaderSources(layer: EuropeLayer): ReaderSource[] {
  if(layer.id==='treecover')return europeTreeCoverReading.sources;
  if(layer.id==='precipitation')return europePrecipitationReading.sources;
  if(layer.id==='drainage')return drainageReading.sources;
  const sources=factualSources[layer.id]??[];
  const needsDataSource=Boolean(layer.indicator)||['rice','contours','vegetables','temperatefruit','cattle','chicken'].includes(layer.id)||sources.length===0;
  const dataSource:ReaderSource={url:layer.source,label:layer.indicator?'World Bank：'+layer.title+'（'+layer.period+'年）':layer.title+'のデータ原典'};
  const relevant=needsDataSource?[dataSource,...sources]:sources;
  return [...new Map(relevant.map(source=>[source.url,{url:source.url,label:source.label}])).values()];
}

// Located examples come from europe/climate-farming.ts and europe/readings.ts.
// They explain possible relationships, not computed intersections or causes of
// every distribution polygon. National contrasts use the recorded WDI 2023 data.
const farmingMessages: Record<string, ReaderMessage> = {
  wheat: {
    takeaway:'イングランドでは東部の小麦・大麦と西部の牛・羊が対照をなし、同じ国内でも農業の土地利用が異なります。',
    body:'小麦はセルビアやハンガリーでも栽培されています。ハンガリーの干ばつの例は、栽培できる気候だけでなく、その年の水の確保も収穫に関わることを示します。',
  },
  barley: {
    takeaway:'大麦はイングランドの穀物栽培とフィンランドの農業に見られ、食料以外の用途にも結びついています。',
    body:'フィンランドの大麦は家畜の餌やビールなどの醸造に使われます。作物の分布は、畑の条件とともに畜産や加工との関係を考える手がかりになります。',
  },
  maize: {
    takeaway:'セルビアやハンガリーではトウモロコシと小麦などが栽培され、一つの地域に複数の作物が共存します。',
    body:'ハンガリーでは2024年の降水不足や夏の干ばつが収穫に影響しました。2020年頃の分布面は栽培の主な場所を示し、毎年の収穫の変動まで表すものではありません。',
  },
  rapeseed: {
    takeaway:'ハンガリーの菜種は油の原料として栽培され、同国の穀物・ヒマワリとともに農業を構成します。',
    body:'菜種と他の作物の分布には重なりもあります。気候に加え、水の確保や土地利用をあわせて考える必要があり、分布の重なりだけで作付けの順序は判断できません。',
  },
  sunflower: {
    takeaway:'ハンガリーのヒマワリは油の原料となり、小麦やトウモロコシとは異なる用途を持つ作物です。',
    body:'セルビアでもヒマワリを栽培しています。ハンガリーの干ばつの例は、同じ栽培域でも気象条件によって収穫が変わることを示します。',
  },
  sugarbeet: {
    takeaway:'テンサイの主な栽培域は、国全体の農業統計だけでは見えない国内の地域差を示します。',
    body:'小麦や他の作物との重なりは、同じ地域に複数の土地利用があることを考える手がかりです。この面だけでは、栽培地を選んだ理由や加工施設との結びつきは確定できません。',
  },
  potato: {
    takeaway:'ジャガイモの主な栽培域は、他の作物と重なる場所と離れる場所を持つ地域の分布です。',
    body:'品目ごとの分布を気候や地形と照らすと、農地の条件を考えられます。水管理や土地利用も関わるため、気候区分だけで栽培域の理由を決めることはできません。',
  },
  rice: {
    takeaway:'アルプスと南側のポー平原の対比は、山地・低地と米の栽培域をあわせて読む例です。',
    body:'地形は農地の条件の一つです。河川や湖の位置は水との関係を考える手がかりですが、この水系図は灌漑の範囲や利用できる水量を示していません。',
  },
  soybean: {
    takeaway:'セルビアでは大豆とトウモロコシ・小麦・ヒマワリが栽培され、複数の作物が地域の農業を構成します。',
    body:'これはセルビア国内の農業の例で、ベルグラードの観測所周辺の作付けを示す説明ではありません。分布面と気候の観測地点は、異なる範囲の情報です。',
  },
  vegetables: {
    takeaway:'「その他の野菜」は収録した作物分類の一つで、野菜栽培全体の分布とは異なります。',
    body:'ポルトガルでは野菜・果実と畜産を組み合わせた農業が行われています。この全国の例と品目別の分布面は範囲が異なり、すべての野菜産地がこの面に含まれるわけではありません。',
  },
  temperatefruit: {
    takeaway:'温帯果樹の面は複数の果樹をまとめた栽培域で、ブドウ単独の産地を示すものではありません。',
    body:'ポルトガルのブドウや地中海沿岸のワイン生産は、別に出典を持つ農業の例です。この集約区分から、特定の果樹の栽培域やワイン産地を読み取ることはできません。',
  },
  citrus: {
    takeaway:'柑橘類と温帯果樹を分けた分布は、果樹を一括りにした全国値では見えない地域差を示します。',
    body:'果樹の分布を気候や地形と比べると、農地の条件を考えられます。この図だけでは水管理や販売先の違いは分からず、栽培域の理由を気候だけに結びつけることはできません。',
  },
  cattle: {
    takeaway:'イングランド西部やフィンランドには牛を飼養する農業があり、穀物栽培とは異なる土地利用が見られます。',
    body:'イングランドでは西部に牛や羊、東部に小麦や大麦が目立ちます。フィンランドの酪農は牛乳生産の例ですが、この牛の分布面は乳用と肉用をまとめています。',
  },
  pig: {
    takeaway:'セルビア北部のヴォイヴォディナでは豚の飼養が多く、同国の穀物栽培と並ぶ農業の特徴です。',
    body:'ポルトガルでも豚肉を生産しています。これらは国・地域の農業の例で、分布面の重なりだけから飼料の調達先や販売先を判断することはできません。',
  },
  chicken: {
    takeaway:'ポルトガルの農業には鶏肉生産も含まれ、果樹や野菜の栽培と畜産が共存しています。',
    body:'国全体の農業の例と、鶏が集中する地域を示す分布面は範囲が異なります。この面は肉用と採卵用をまとめており、鶏肉産地だけの分布ではありません。',
  },
  sheep: {
    takeaway:'羊はイングランド西部やアイスランドで飼養され、ギリシャでは乳を使ったチーズづくりにも結びつきます。',
    body:'アイスランドでは羊肉を生産し、ギリシャのフェタは羊乳を主原料にします。気候や草地の条件とともに用途を考える例ですが、この面から肉用と乳用の地域差は分かりません。',
  },
};

const countryMessages: Record<string, ReaderMessage> = {
  forest: {
    takeaway:'2023年の森林面積比率はフィンランド・スウェーデンで高く、オランダで低いという国全体の違いがあります。',
    body:'フィンランドのラッペーンランタでは木材からパルプやバイオ燃料を生産しています。森林の広さと、木材を加工する拠点の立地は別の情報です。',
  },
  manufacturing: {
    takeaway:'2023年の製造業のGDP比率は、チェコ・ドイツがフランス・英国より高いという国全体の違いがあります。',
    body:'ミュンヘンの自動車工場と研究開発、チェコの自動車生産は異なる拠点の役割を示します。全国の比率だけでは、その工場の生産額や雇用は分かりません。',
  },
  industry: {
    takeaway:'鉱工業・建設業のGDP比率は、製造業に資源採掘や電気・ガス・水道、建設を含めた産業構成を示します。',
    body:'パリ、ミラノ、マドリードの都市周辺をたどり、都市の点の間にも人口の分布が続くかを格子の色で確かめます。ライン川沿いの都市とポー平原、北欧の都市とその周辺を比べると、国の平均だけでは読めない集中と広がりが見えます。国境は人口密度の区分境界ではありません。北部スウェーデンのキルナは鉄鉱石採掘、ドイツのミュンヘンは自動車製造の拠点です。資源の位置と技術開発・生産の集積は、異なる立地の条件です。',
  },
  services: {
    takeaway:'2023年のサービス業のGDP比率は、英国・フランスがチェコより高いという国全体の違いがあります。',
    body:'フランクフルトの中央銀行は、金融・行政も都市の機能を形づくる例です。全国のサービス業比率は、その都市の金融雇用や産業の範囲を示すものではありません。',
  },
  urban: {
    takeaway:'2023年の都市人口比率はオランダがイタリアより高く、国全体で都市に暮らす人の割合が異なります。',
    body:'都市人口比率と人口密度は、都市に住む割合と人が集中する場所という別の情報です。都市の定義が国ごとに異なるため、この比率を市街地の広さには置き換えられません。',
  },
  age: {
    takeaway:'2023年の65歳以上の人口比率はイタリアがアイルランドより高く、国全体の年齢構成に違いがあります。',
    body:'人口密度が示す人の集中と、65歳以上の割合が示す年齢構成は別の比較です。この全国値だけでは、国内のどの都市や地域で高齢化が進むかは分かりません。',
  },
  growth: {
    takeaway:'2023年はアイルランドの人口が増え、イタリアはわずかに減るなど、国全体の人口変化に違いがあります。',
    body:'年間の人口変化には自然増減と移動の両方が含まれます。この全国値から、移動だけの人数や特定の都市へ集まった人数を読み取ることはできません。',
  },
};

/** A geographic takeaway and brief explanation; definitions stay in the note. */
export function europeReaderCopy(layer:EuropeLayer) {
  if(layer.id==='treecover')return {title:europeTreeCoverReading.title,takeaway:europeTreeCoverReading.takeaway,body:europeTreeCoverReading.body,note:europeTreeCoverReading.note};
  if(layer.id==='precipitation')return {title:europePrecipitationReading.title,takeaway:europePrecipitationReading.takeaway,body:europePrecipitationReading.body,note:europePrecipitationReading.note};
  if(layer.id==='drainage')return {title:drainageReading.title,takeaway:drainageReading.takeaway,body:drainageReading.body,note:drainageReading.note};
  if(layer.id==='climate')return {
    title:'気候区分',takeaway:'欧州の気温・降水の違いは農業の条件に関わりますが、同じ気候区分でも土地利用や水管理は異なります。',
    body:'イングランドの穀物と草地、ハンガリーの干ばつ、マドリード州の灌漑は、気候と人の水利用をあわせて考える例です。地域の農業例は、選んだ観測所周辺すべての作付けを表しません。',
    note:layer.note+' 観測地点の平年値は国平均ではありません。未収録の気候区分や降水の欠測は、近隣値や0で補いません。',
  };
  if(layer.id==='crops')return {
    title:'欧州の農林業',takeaway:'気候や地形は農業の条件に関わり、水管理や土地利用も作物と家畜の分布を形づくります。',
    body:'イングランド東部では小麦・大麦、西部では牛・羊が目立ちます。ハンガリーの干ばつやマドリード州の灌漑の例は、気候と水をどう確保するかが農業に関わることを示します。',
    note:'2020年頃のモデル推計から主な分布を取り出した概略図です。色は品目を示し、濃さは数量を示しません。牛の肉用・乳用、鶏の肉用・採卵用は未分離で、ブドウ・オリーブ単独の分布は未収録です。',
  };
  if(layer.id==='water')return {
    title:'河川・湖',takeaway:'国境を越える河川は複数の国をつなぎ、水利用・洪水・生態系の管理にも協力が必要になります。',
    body:'ドナウ川の流域は19か国にまたがります。ライン川では流域の国々が水利用や洪水への対応を協力して進め、海港のロッテルダムと内陸の産業拠点も同じ水系に位置します。',
    note:'線の太さは流量を表しません。小さな河川や湖は省略しています。この河川・湖の図は流域界を表示せず、別の「流域の区画」で確認します。地下水・灌漑の範囲は収録していません。',
  };
  if(layer.id==='terrain')return {
    title:'地形・標高',takeaway:'国境をまたぐアルプスと周辺の低地をあわせて見ると、山地と農地・都市の位置関係を捉えられます。',
    body:'アルプス北側の低地と南側のポー平原は、山地を囲む地域の対比です。アルプス条約は8か国とEUで山岳地域の保全と持続可能な発展を扱っています。',
    note:'標高は表示用に平均化しています。細かな峰や谷は省略しています。',
  };
  if(layer.id==='contours')return {
    title:'標高（等高線）',takeaway:'等高線が示すアルプスの起伏は、周辺の低地との違いを捉える手がかりになります。',
    body:'同じ高さを結ぶ線を500m間隔で示し、1,000mごとの線を濃くしています。山地と平野の対比は農地や都市の位置を考える条件の一つで、立地の理由を標高だけで決めることはできません。',
    note:'表示用に平均化した標高から作った概略図です。等高線の間隔は標高精度を意味しません。',
  };
  if(layer.id==='hubs')return {
    title:'産業の拠点',takeaway:'港湾・資源・研究開発・生産網が、異なる地域の産業拠点の役割を形づくっています。',
    body:'ロッテルダムは原料の搬入・加工・貯蔵が近接する港の集積、ルートヴィヒスハーフェンは工程を結ぶ化学拠点です。航空機はトゥールーズなどへの最終組立と、国をまたぐ部品生産で成り立ちます。',
    note:'点の数や大きさは、生産量・雇用の大小を表しません。工場群や施設全体の境界は描いていません。',
  };
  if(layer.id==='density')return {
    title:'人口分布',takeaway:'パリやミラノの都市周辺と、欧州北部・山地を同じ人口密度の尺度で読み比べます。',
    body:'北部スウェーデンのキルナは鉄鉱石採掘、フィンランドのオウルは無線技術の研究・設計・製造の拠点です。人口の集中は地域の役割を考える手がかりですが、産業の機能まで決めるものではありません。',
    note:'2020年の格子ごとのモデル推計です。現在の人口移動・避難状況を表すものではありません。都市の点は位置のみを示します。',
  };
  if(layer.id==='ethnicity'||layer.id==='religion')return {
    title:layer.title,takeaway:'イングランド・ウェールズの行政区とクロアチアの全国値で、自己申告の回答構成を読む事例です。',
    body:'2021年の国勢調査が公表した分類、人数、表ごとの総人口を使います。地域による回答の違いと、資料の対象範囲を分けて読みます。',
    note:layer.note,
  };
  if(layer.field==='agriculture'&&layer.grid) {
    const livestock=['cattle','pig','sheep','chicken'].includes(layer.id);
    const definition=layer.id==='cattle'?'牛は肉用・乳用を分けていません。':layer.id==='chicken'?'鶏は肉用・採卵用を分けていません。':layer.id==='temperatefruit'?'温帯果樹の集約区分であり、ブドウ単独の分布ではありません。':layer.id==='vegetables'?'SPAMのVEGE区分で、トマト・タマネギ等の別区分を含む「全野菜」ではありません。':'';
    const message=farmingMessages[layer.id]??{
      takeaway:layer.title+'の主な分布は、国全体の統計だけでは見えない地域差を示します。',
      body:'気候や地形とあわせて、土地利用や水管理の違いを考える手がかりです。この分布だけで立地の理由を確定することはできません。',
    };
    return {title:layer.title+'の分布',...message,
      note:(livestock?'2020年の家畜密度のモデル推計から、主な飼養地域を取り出しています。':'2020年頃の収穫面積のモデル推計から、主な栽培域を取り出しています。')+'色の濃さは数量を示しません。色のない場所でも生産がないとは限らず、面の輪郭は農場や農地の実際の境界ではありません。'+definition};
  }
  const countryMessage=countryMessages[layer.id];
  if(countryMessage)return {title:layer.title,...countryMessage,note:layer.note};
  return {title:layer.title,takeaway:layer.title+'は、データの範囲と定義をそろえて比べる必要があります。',body:layer.note,note:'出典が示す対象年と範囲の情報です。'};
}
