import {eastPopulation} from './east-asia-approved-reading';
import type { AsiaRegionId } from '../../lib/atlas-asia-state';

export type AsiaPopulationRaster = {width:number;height:number;bounds3857:number[];bounds4326:number[];imageCoordinates:[number,number][];image:string;grid:string;sourceCellKm:number};
export type AsiaUrbanCentre = {id:string;sourceId:number;name:string;sourceName:string;country:string;region:string;coordinates:[number,number];bounds:number[];areaKm2:number;population:number;density:number|null;history:Record<string,number|null>;detail?:AsiaPopulationRaster};
export type AsiaPopulationRegion = AsiaPopulationRaster & {urban:string;geography?:string;cities:AsiaUrbanCentre[];countryCoverage:Record<string,{sourceUrbanCentres:number;listedUrbanCentres:number}>};
export const asiaPopulationTopics=[{id:'density',label:'人口の分布'},{id:'urban',label:'都市の広がりと人口'}];
export const asiaPopulationColors=['#f0f1e8','#dce8df','#b0d2cc','#7ab5bb','#438b9f','#28627f','#173b60'];
export const asiaPopulationLabels=['0超–1未満','1–10未満','10–100未満','100–500未満','500–2,000未満','2,000–10,000未満','10,000以上'];
export const asiaPopulationReading:Record<string,{takeaway:string;reading:string}>={
 'east-asia':eastPopulation,
 'southeast-asia':{takeaway:'ジャワ島や大陸部の大河川の平野などに、人口の集中が見られます。山地・森林域との違いを色の濃淡で確かめられます。',reading:'一つの都市だけでなく、色の濃い格子がどの方向へ続くかを見てください。島や半島の全体が一様に密集しているわけではありません。'},
 'south-central-asia':{takeaway:'南アジアの河川平野では人口が帯状に広がり、中央アジアでは周囲の人口が少ない地域の中に都市や灌漑地域の集まりが見えます。',reading:'ガンジス川流域からベンガルの平野へ続く人口の集中と、乾燥した内陸・高山域の疎らな分布を見比べてください。色は2020年の推計人口密度で、現在の正確な居住者数ではありません。'},
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
