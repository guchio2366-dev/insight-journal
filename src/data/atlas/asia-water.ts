import type {AsiaState,AsiaRegionId} from '../../lib/atlas-asia-state';
export type WaterTopic='precipitation'|'basins'|'groundwater';
export const isWaterTopic=(topic?:string|null):topic is WaterTopic|'water'=>['water','precipitation','basins','groundwater'].includes(topic??'');
export const waterDatasetTopic=(topic:WaterTopic|'water'):WaterTopic=>topic==='water'?'groundwater':topic;
export type WaterRegion={basins:string;groundwater:string;precipitation:{image:string;grid:string;width:number;height:number;bounds3857:number[];bounds4326:number[];imageCoordinates:number[][];nominalPixelMetres3857:number};coverage:Record<string,{displayCells:number;maskCells:number;basins:number;groundwater:number}>;basinCount:number;groundwaterCount:number};
export type WaterRecord={id:string;sourceId:number;countries:string[];point:[number,number];countryPoints:Record<string,[number,number]>;bounds:number[]};
export type BasinRecord=WaterRecord&{name:string;rivers:string[];areaKm2:number;outletUpAreaKm2:number;subBasins:number;endorheic:boolean;coastal:boolean;outsideFrame:boolean;fullBounds:number[];otherTargetCountries:string[];flow:{mean:number;lowestMonth:number;highestMonth:number}|null};
export type GroundwaterRecord=WaterRecord&{class:number;aquifer:string;recharge:string};
export type WaterDataset={records:(BasinRecord|GroundwaterRecord)[];geometry:any;outlines?:any};
export const waterTopics:Record<WaterTopic,{title:string;period:string;unit:string;definition:string;source:string}>={
 precipitation:{title:'等雨量線で年降水量を読む',period:'1981–2010年の推計平年値',unit:'mm/年',definition:'雨と雪などを水の深さに換算した年間降水量です。CHELSAの約1km原本を、投影座標上で約4km間隔の表示格子に平均化しています。雨温図の1991–2020年とは期間・資料が異なります。',source:'https://www.chelsa-climate.org/datasets/chelsa_bioclim'},
 basins:{title:'水が集まる範囲：流域',period:'BasinATLAS v1.0・地形に基づく範囲',unit:'km²',definition:'地表の水が同じ出口へ向かう範囲を示します。内陸で途切れる水系を仮想的に接続せず、元資料の小流域を出口ごとに結合しています。沿岸の小流域群は、複数の川をまとめた区分です。',source:'https://www.hydrosheds.org/hydroatlas'},
 groundwater:{title:'地下水を蓄える地層と涵養',period:'WHYMAP 2008年の概観図・2026年取得',unit:'涵養量の区分（mm/年）',definition:'帯水層は、水を含み、水を通す地層です。涵養は地表から地下水へ補給される水を指します。淡い青は主要な地下水盆地の広がりで、現在の貯水量・水位・安全に取水できる量ではありません。',source:'https://www.bgr.bund.de/whymap/EN/Maps_Data/maps_data_node_en.html'},
};
export const precipitationBreaks=[100,250,500,750,1000,1500,2000,3000];
export const precipitationColors=['#eee4ce','#e4e5c4','#cfdfbd','#a7d7bd','#79c9c5','#4dafc2','#278eaf','#146890','#123e65'];
export const basinColors=['#b5ced9','#d7c5a8','#bbd1ab','#d7babb','#bfc0dc','#e1d2a7','#a9cdca','#c8cbb4','#c0cfeb','#dfc7d2','#c7dfcb','#dbd4c8'];
export const basinColor=(id:string)=>basinColors[[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%basinColors.length];
export const groundwaterClasses:Record<number,{type:string;recharge:string;color:string}>={
 11:{type:'主要な地下水盆地',recharge:'2未満',color:'#ccf2ff'},12:{type:'主要な地下水盆地',recharge:'2–20',color:'#99e3ff'},13:{type:'主要な地下水盆地',recharge:'20–100',color:'#73bff2'},14:{type:'主要な地下水盆地',recharge:'100–300',color:'#4ca6d9'},15:{type:'主要な地下水盆地',recharge:'300超',color:'#1e87cc'},
 22:{type:'複雑な水文地質構造',recharge:'20未満',color:'#ccf2cc'},23:{type:'複雑な水文地質構造',recharge:'20–100',color:'#a6d1a3'},24:{type:'複雑な水文地質構造',recharge:'100–300',color:'#81b38f'},25:{type:'複雑な水文地質構造',recharge:'300超',color:'#5f9b78'},
 33:{type:'局地的・浅い帯水層',recharge:'100未満',color:'#f4e1ad'},34:{type:'局地的・浅い帯水層',recharge:'100超',color:'#baa87d'},
};
export type WaterScene={id:string;region:AsiaRegionId;country:string;name:string;point:[number,number];lead:string;reading:string;source:string};
export const waterScenes:WaterScene[]=[
 {id:'w-japan-sea',region:'east-asia',country:'JPN',name:'日本海側：新潟付近',point:[139.03,37.92],lead:'日本海側の水を、冬の雪と山地から読む。',reading:'気象庁は、冬の北西季節風が日本海側に多い雪を、山地の風下に当たる太平洋側に晴天をもたらすと説明しています。年降水量には雪の水換算量も含みます。年間の色だけで季節を判断せず、気候の雨温図と標高へ切り替えて比べます。',source:'https://www.data.jma.go.jp/cpd/longfcst/en/tourist_japan.html'},
 {id:'w-tokyo',region:'east-asia',country:'JPN',name:'太平洋側：東京付近',point:[139.75,35.69],lead:'同じ日本でも、降水が多い季節は一様ではない。',reading:'気象庁の解説では、初夏の梅雨前線と秋雨前線・熱帯低気圧が季節の降水に関わります。東京付近と日本海側の格子を比較し、年合計が似ていても冬と夏の配分まで同じとは限らないことを雨温図で確かめます。',source:'https://www.data.jma.go.jp/cpd/longfcst/en/tourist_japan.html'},
 {id:'w-tarim',region:'east-asia',country:'CHN',name:'タリム盆地の内陸',point:[83,40],lead:'雨が少ない地点と、水系が集める範囲は別の尺度で読む。',reading:'CHELSAの年降水量とBasinATLASの内陸の集水域を同じ地点で比較します。選択地点の降水量を、山地を含む流域全体の降水量や河川の流量と同一視しないでください。ここでの比較は資料の分布から確かめるもので、特定年の渇水を示しません。',source:'https://www.hydrosheds.org/hydroatlas'},
 {id:'w-mekong',region:'southeast-asia',country:'KHM',name:'メコン川：クラチエ付近',point:[106.02,12.49],lead:'メコン川では、年間の水量だけでなく増水する季節が重要になる。',reading:'メコン川委員会の概説では、6～11月の増水期に年間流量のおよそ70～80%が流れ、湿地や魚の生活史が季節変化と結び付きます。これは長期的な概説です。地図の流域面積やモデル流量から、現在の洪水・取水量・湖面を推定していません。',source:'https://www.mrcmekong.org/hydrology/'},
 {id:'w-singapore',region:'southeast-asia',country:'SGP',name:'赤道に近いシンガポール',point:[103.82,1.35],lead:'年間を通じた多雨にも、季節風による変化がある。',reading:'シンガポール気象当局は、赤道に近い高温多湿の気候と、北東・南西の季節風を説明しています。多い年降水量は、雨が毎日同じ量だけ降ることや、地下水を多量に取水できることを意味しません。雨温図と地下水の地質区分を別々に確認します。',source:'https://www.weather.gov.sg/climate-climate-of-singapore/'},
 {id:'w-western-ghats',region:'south-central-asia',country:'IND',name:'西ガーツ山脈の西側',point:[74.9,13],lead:'海から入る湿った風と山地が、降水の分布を変える。',reading:'UNESCOは、西ガーツ山脈が南西からの水分を含む季節風を受け止め、インドのモンスーンに影響すると説明しています。西側とデカン高原側の年降水量を標高と見比べます。境界は一線で急変するとは限らず、地図は長期平均の格子推計です。',source:'https://whc.unesco.org/en/list/1342/'},
 {id:'w-indus',region:'south-central-asia',country:'PAK',name:'インダス川下流の低地',point:[69,27],lead:'下流の乾燥と、上流の雪氷が供給する水をつなげて読む。',reading:'ICIMODは、カラコルムと西ヒマラヤの雪・氷河の融解水がインダス流域の生活、発電、工業、灌漑を支えると説明しています。低地の年降水量だけで利用できる河川水は決まりません。上流を含む集水域と農業の分布を比較します。',source:'https://www.icimod.org/importance-of-glaciers-for-water-availability-in-pakistan/'},
 {id:'w-aral',region:'south-central-asia',country:'UZB',name:'アムダリヤ川下流',point:[60.6,41.5],lead:'地形が集める水と、人が利用した後に届く水を区別する。',reading:'FAOの中央アジアの概説は、アムダリヤ・シルダリヤ下流の乾燥と灌漑の必要性を説明しています。ここに表示する自然化流量は1971～2000年のモデル値で、取水・貯水施設などの影響を除いた推計です。現在アラル海へ実際に届く水量や湖面の大きさは表しません。',source:'https://www.fao.org/4/w6240e/w6240e03.htm'},
];
export function waterContains(geometry:any,p:[number,number]):boolean{
 const inside=(ring:number[][])=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 return polygons.some((rings:number[][][])=>inside(rings[0])&&!rings.slice(1).some(inside));
}
export function normalizeWaterState(regionId:AsiaRegionId,state:AsiaState,data?:WaterDataset|null):AsiaState{
 if(state.field!=='natural'||!isWaterTopic(state.topic))return state;
 const scene=waterScenes.find(s=>s.region===regionId&&s.id===state.detail&&(!state.place||s.country===state.place));
 if(scene)return {...state,place:scene.country,point:scene.point,city:null};
 const candidate=state.detail&&/^[bg]-\d{1,12}$/.test(state.detail)&&state.detail.startsWith(waterDatasetTopic(state.topic)==='basins'?'b-':waterDatasetTopic(state.topic)==='groundwater'?'g-':'!')?state.detail:null;
 if(!data)return {...state,detail:candidate,city:null};
 const record=data.records.find(r=>r.id===candidate&&(!state.place||r.countries.includes(state.place)));
 return {...state,detail:record?.id??null,place:record?.countries.length===1?record.countries[0]:state.place,point:state.point??(record?(state.place?record.countryPoints[state.place]:record.point):null),city:null};
}
