import type { AsiaRegionId } from '../../lib/atlas-asia-state';

export type AsiaPopulationRaster = {width:number;height:number;bounds3857:number[];bounds4326:number[];imageCoordinates:[number,number][];image:string;grid:string;sourceCellKm:number};
export type AsiaUrbanCentre = {id:string;sourceId:number;name:string;sourceName:string;country:string;region:string;coordinates:[number,number];bounds:number[];areaKm2:number;population:number;density:number|null;history:Record<string,number|null>;detail?:AsiaPopulationRaster};
export type AsiaPopulationRegion = AsiaPopulationRaster & {urban:string;geography?:string;cities:AsiaUrbanCentre[];countryCoverage:Record<string,{sourceUrbanCentres:number;listedUrbanCentres:number}>};
export const asiaPopulationTopics=[{id:'density',label:'人口の分布'},{id:'urban',label:'都市の広がりと人口'}];
export const asiaPopulationColors=['#f0f1e8','#dce8df','#b0d2cc','#7ab5bb','#438b9f','#28627f','#173b60'];
export const asiaPopulationLabels=['0超–1未満','1–10未満','10–100未満','100–500未満','500–2,000未満','2,000–10,000未満','10,000以上'];
export const asiaPopulationReading:Record<AsiaRegionId,{takeaway:string;reading:string}>={
 'east-asia':{takeaway:'中国の東部と内陸、日本列島の平野と山地を比べると、同じ国の中でも人口の集中する場所が異なることが分かります。',reading:'まず地域全体の人口分布を見てから、東京・上海・ソウルを順に選んでください。都市の詳細では約1km四方の元データを使うため、広域の表示より細かく分布を読めます。ただし、この格子から建物や世帯の位置までは分かりません。'},
 'southeast-asia':{takeaway:'大都市の周辺、河川沿いの平野、島の内陸部では、人口が集まる範囲と密度が異なります。',reading:'ジャカルタ、マニラ、バンコク、シンガポールの詳細を開き、都市の輪郭と人口の色分けを比べてください。島の海岸では海を含む格子もあります。格子面積当たりの人口を、そのまま陸地だけの人口密度と解釈することはできません。'},
 'south-central-asia':{takeaway:'南アジアの平野と中央アジアの乾燥地域では、人口が連続して分布する範囲と、都市ごとに集中する様子が異なります。',reading:'ニューデリー、ダッカ、タシケントを選び、人口が集中する範囲を比べてください。マレでは、小さな島が広域表示で見えにくくても、都市の詳細図で元の1km格子を確認できます。地形や水系と重ねて読む際も、地形だけが人口分布を決めるとは限りません。'},
};
export const asiaUrbanReading:Record<string,string>={
 Tokyo:'都市の輪郭に接する場所と、輪郭から離れた場所を選び、人口の色の変わり方を比べてください。資料が定めた東京の都市範囲は東京都の行政区域とは異なるため、この人口を東京都の人口として使うことはできません。',
 Shanghai:'沿岸側と内陸側で、人口が集中する範囲を比べてください。海岸付近の格子は海も含むので、低い値がそのまま陸上の居住密度を示すとは限りません。ここでの都市範囲は上海市の行政区域とは異なります。',
 Seoul:'人口の濃い格子がどこまで続くかを見てから、自然環境の地図と比べてください。輪郭は資料が人口のまとまりとして定めた範囲であり、ソウル特別市の行政境界ではありません。',
 Jakarta:'人口の濃い格子が都市の輪郭の内外でどのようにつながるかを確かめてください。表示する人口は資料の都市範囲の値なので、ジャカルタの行政区域や通勤圏の人口とは区別する必要があります。',
 Manila:'都市の輪郭付近の格子と、その周辺の格子を比べてください。海や湖を含む格子もあり、この密度は陸地の面積だけを分母にした値ではありません。都市の輪郭はマニラ市の行政境界とは異なります。',
 Bangkok:'都市の中心付近から周辺へ、人口がどの方向に分布しているかを読んでください。水系の地図で川の位置と見比べられますが、重なって見えることだけで人口集中の原因を判断することはできません。',
 'New Delhi':'色の濃い格子がまとまる範囲と、その周辺の変化を比べてください。名称がニューデリーでも、この数値が表すのは資料が定めた都市の範囲であり、行政上のニューデリー地区の人口ではありません。',
 Dhaka:'都市の輪郭の内側と外側を複数箇所選び、格子ごとの人口密度を比べてください。水系の位置も参照できますが、この人口資料から洪水の危険度や住宅の安全性を判断することはできません。',
 Tashkent:'周辺の人口が少ない格子と、都市内の人口が多い格子の違いを見てください。この資料の都市人口は、タシケント市の行政区域の統計とは範囲が異なります。',
 Singapore:'都市の範囲と国の範囲を区別して読んでください。この都市人口はシンガポール全体の人口ではありません。国全体に近い縮尺でも、海を含む格子の値は陸地だけの密度と異なります。',
 'Malé':'広域表示では小さく見える島も、詳細図では1kmの元格子を確認できます。ただし島より大きい格子が海を含むため、格子の密度は島の陸地面積当たりの人口密度より小さくなる場合があります。',
};
