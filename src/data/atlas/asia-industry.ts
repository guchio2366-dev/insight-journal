import type {AsiaState} from '../../lib/atlas-asia-state';
export type IndustryTopic={id:string;title:string;parent:string;kind:'national'|'admin'|'power'|'steel'|'trade';unit:string;year:string;source:string;note:string;country?:string;fuel?:string};
export type IndustryRegion={data:string;topics:IndustryTopic[];powerCount:number;adminCount:number;countries:string[]};
export type IndustrySeries={year:string;value:number|null;status?:string}[];
export type IndustryAdmin={id:string;country:string;name:string;sourceName:string;point?:[number,number];bounds?:number[];series:Record<string,IndustrySeries>;steelMethods?:Record<string,number>;employment2025?:number};
export type IndustryPlant={id:string;country:string;name:string;point:[number,number];fuel:string;capacity:number|null;capacityYear:string|null;source:string;url:string;locationSource:string;generation:IndustrySeries;generationSource:string};
export type IndustryData={admin:IndustryAdmin[];power:IndustryPlant[];geometry:any;steel:Record<string,Record<string,number>>};
export type IndustryNational={indicators:{id:string;label:string;unit:string;note:string;metadataUrl:string;observations:{countryCode:string;year:number;value:number|null}[]}[];missingNotes:Record<string,string>};
export const industryColors=['#eaf0dc','#c5d5a6','#92b982','#559078','#1d625e'];
export const industryFuelNames:Record<string,string>={Coal:'石炭',Gas:'天然ガス',Oil:'石油',Hydro:'水力',Nuclear:'原子力',Solar:'太陽光',Wind:'風力',Biomass:'バイオマス',Waste:'廃棄物',Geothermal:'地熱','Wave and Tidal':'波力・潮汐'};
export const industryFuelColors:Record<string,string>={Coal:'#4c4846',Gas:'#c07739',Oil:'#84637c',Hydro:'#2076a5',Nuclear:'#ad4c3b',Solar:'#c6a127',Wind:'#638e50',Biomass:'#356e4e',Waste:'#a47f62',Geothermal:'#bf744e','Wave and Tidal':'#346e83'};
export const industryGroups=['製造業','資源・エネルギー','サービス業','工業・建設と経済全体','貿易'];
export function industryTopic(region:IndustryRegion,state:AsiaState){return region.topics.find(t=>t.id===state.topic)??region.topics[0];}
export function isIndustryDetailId(id:string){return /^[A-Za-z0-9_-]{1,64}$/.test(id);}
export function normalizeIndustryState(region:IndustryRegion,state:AsiaState,data?:IndustryData|null):AsiaState{
 if(state.field!=='industry')return state;
 const topic=industryTopic(region,state),candidate=state.detail&&isIndustryDetailId(state.detail)?state.detail:null;
 if(topic.kind==='trade')return {...state,topic:topic.id,city:null};
 // Keep a bounded URL candidate until the lazy dataset can validate it. No
 // facility names, coordinates or selections are displayed from this ID alone.
 if(!data)return {...state,topic:topic.id,detail:(topic.kind==='power'||topic.kind==='admin'&&(!state.place||state.place===topic.country))?candidate:null,place:topic.country??state.place,city:null};
 const detail=topic.kind==='admin'?data.admin.find(d=>d.id===candidate&&d.point&&d.country===topic.country):topic.kind==='power'?data.power.find(d=>d.id===candidate&&(topic.fuel==='all'||topic.fuel===d.fuel)):undefined;
 const valid=detail&&(!state.place||detail.country===state.place);
 return {...state,topic:topic.id,detail:valid?detail.id:null,place:valid?detail.country:topic.country??state.place,city:null};
}
export function industryValues(topic:IndustryTopic,data:IndustryData,national:IndustryNational,countries:string[]):{id:string;value:number|null}[]{
 if(topic.kind==='admin')return data.admin.filter(a=>a.country===topic.country).map(a=>({id:a.id,value:a.series[topic.id]?.find(v=>v.year===topic.year)?.value??null}));
 if(topic.kind==='power')return data.power.filter(p=>topic.fuel==='all'||p.fuel===topic.fuel).map(p=>({id:p.id,value:p.capacity}));
 if(topic.kind==='steel')return countries.map(id=>({id,value:data.steel[id]?.total??null}));
 const observations=national.indicators.find(i=>i.id===topic.id)?.observations??[];
 return countries.map(id=>({id,value:observations.find(o=>o.countryCode===id&&o.year===Number(topic.year))?.value??null}));
}
export function industryScale(topic:IndustryTopic,values:{value:number|null}[]){
 const max=Math.max(0,...values.map(v=>v.value??0));
 const breaks=topic.id==='gdp-growth'?[-5,0,3,6]:topic.unit.includes('%')?[10,20,40,60]:[.05,.2,.4,.7].map(f=>max*f);
 return {breaks,colors:industryColors,color:(value:number|null)=>value===null?'#d2ceca':industryColors[breaks.filter(b=>value>=b).length]};
}
export const industryDomesticNotes:Record<string,string>={
 JPN:'県の製造品出荷額には、最終製品だけでなく他地域へ送る部品・素材も含まれます。輸送用機械、電子部品、食料品などへ切り替えると、同じ県でも産業ごとに順位が変わる様子を確認できます。雇用は2025年6月1日時点、金額は2024年の年間実績です。',
 CHN:'転炉（BOF）は主に高炉などで得た溶けた鉄を鋼にする設備です。電気炉（EAF）とは製法の区分が異なります。省別の能力と製法内訳を比べ、能力の大きさを実際の生産量や排出量と取り違えないように読んでください。',
 MYS:'製造業とサービス業では、州の順位と集中する場所が異なります。州内で生まれた付加価値を同じ2015年価格で比べています。プトラジャヤの独立した製造業系列は2024年からで、それより前は欠測です。クアラルンプールとの過去の境界・集計範囲の違いに注意してください。',
 IND:'製造業とサービス業を同じ年度で比較すると、国内の経済活動がどの州に集まるかを区別できます。2019–20年度より前のジャンムー・カシミールにはラダックが含まれ、その後と範囲が異なります。現在のラダックに過去の合算値を配分していません。',
};
export const industryMalaysiaReading:Record<string,string>={
 'MY-07':'ペナンでは製造業が州経済を主導し、2025年は10.0%成長しました。DOSMは、電気・電子・光学製品の拡大を、半導体とデータセンター機器の世界市場の拡大に結び付けて説明しています。地図の金額は製造業全体であり、半導体だけの売上高ではありません。',
 'MY-01':'ジョホールでは2025年にサービス業が9.9%成長しました。DOSMは、公共サービス・運輸・保管・情報通信や商業・宿泊飲食の伸びを挙げています。製造業の図へ切り替えると、電子製品や食品加工などを含む別の活動の規模を比較できます。',
 'MY-14':'クアラルンプールではサービス業が2025年の地域GDPの91.7%を占めます。DOSMは商業・宿泊飲食と、金融・保険・不動産・事業サービスの伸びを挙げています。この地域の金融だけの数値ではありません。',
 'MY-13':'サラワクでは天然ガスが2025年の鉱業・採石業の72.2%を占めます。DOSMの州経済の説明を、鉱業と製造業の別々の地図で確かめてください。地図の鉱業額をそのまま天然ガスの生産額とは読めません。',
};
