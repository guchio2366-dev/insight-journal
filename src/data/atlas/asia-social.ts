import type {AsiaState} from '../../lib/atlas-asia-state';
export type SocialGroup={id:string;label:string;kind:'national'|'admin';year:string;source:string;note:string;country?:string};
export type SocialTopic={id:string;group:string;key:string;title:string;breaks:number[]};
export type SocialRegion={data:string;groups:SocialGroup[];topics:SocialTopic[];countries:string[];adminCount:number;coverage:Record<string,{national:boolean;admin:number}>};
export type SocialRecord={id:string;country:string;name:string;sourceName:string;point:[number,number];bounds:number[];series:Record<string,Record<string,number|null>>;counts:Record<string,number>;total:Record<string,number>;notes:string[];nationalities?:{label:string;value:number}[]};
export type SocialData={records:SocialRecord[];national:Record<string,Pick<SocialRecord,'series'|'total'>&Partial<Pick<SocialRecord,'counts'|'nationalities'>>>;geometry:any};
export const socialColors=['#edf1e6','#c7dfc6','#86bba8','#438d8d','#235c73'];
export const taiwanRegistered2025={total:23299132,change:-101088,young:2681890,working:15944087,old:4673155,source:'https://www.ris.gov.tw/info-liferay/app/channel/newsDetail/26007114'};
export const socialDefaults:Record<string,string>={'national-age':'old','national-growth':'rate','jp-age':'old','jp-nationality':'foreign','my-age':'old','my-ethnicity':'bumi_malay','my-citizenship':'noncitizen','my-growth':'change','in-religion':'hindu','in-language':'006000'};
export function socialDefault(group:string){return group+'-'+socialDefaults[group];}
export function socialTopic(region:SocialRegion,s:AsiaState){return s.field==='population'?region.topics.find(t=>t.id===s.topic):undefined;}
export function socialGroup(region:SocialRegion,s:AsiaState){const t=socialTopic(region,s);return region.groups.find(g=>g.id===t?.group);}
export function isSocialDetailId(id:string){return /^s-(?:JP|MY|IN)-\d{2}$/.test(id);}
export function socialValue(record:Pick<SocialRecord,'series'>|undefined,t:SocialTopic,g:SocialGroup){return record?.series[t.id]?.[g.year]??null;}
export function socialColor(value:number|null,t:SocialTopic){if(value===null)return '#d2ceca';return socialColors[t.breaks.filter(b=>value>=b).length];}
export function socialContains(geometry:any,point:[number,number]):boolean{
 const ring=(r:number[][])=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 return (geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[]).some((p:number[][][])=>ring(p[0])&&!p.slice(1).some(ring));
}
export function normalizeSocialState(region:SocialRegion,s:AsiaState,data?:SocialData|null):AsiaState{
 const g=socialGroup(region,s);if(!g)return s.field==='population'&&s.detail&&isSocialDetailId(s.detail)?{...s,detail:null}:s;
 if(g.kind==='national')return {...s,detail:null,city:null};
 if(s.place&&s.place!==g.country)return {...s,place:g.country!,detail:null,point:null,city:null,camera:null};
 let result={...s,place:g.country!,city:null};
 if(!data)return {...result,detail:result.detail&&isSocialDetailId(result.detail)?result.detail:null};
 let record=data.records.find(r=>r.id===result.detail&&r.country===g.country);
 if(!record&&result.point){const f=data.geometry.features.find((f:any)=>f.properties.country===g.country&&socialContains(f.geometry,result.point!));record=data.records.find(r=>r.id===f?.properties.id);}
 if(!record)return {...result,detail:null};
 const geometry=data.geometry.features.find((f:any)=>f.properties.id===record!.id)?.geometry;
 return {...result,detail:record.id,point:result.point&&geometry&&socialContains(geometry,result.point)?result.point:record.point};
}
export function socialDenominator(r:SocialRecord,g:SocialGroup){
 if(g.id==='jp-age')return r.total['2020']-r.counts.ageUnknown;
 if(g.id==='jp-nationality')return r.total['2020']-r.counts.nationalityUnknown;
 if(g.id==='my-ethnicity')return r.counts.citizen;
 if(g.id==='my-growth')return r.total['2020'];
 return r.total[g.year];
}
export const socialReadings:Record<string,{title:string;body:string;source:string}>={
 's-JP-05':{title:'秋田と東京では、年齢構成が異なります',body:'2020年の年齢が分かる人口では、65歳以上の割合は秋田県37.60%、東京都22.82%です。人数の多さと割合の高さを分けて読み、同じ場所の人口密度も比べてください。この1時点の表だけから、出生・死亡・転出入がそれぞれ何人影響したかは分かりません。',source:'https://www.e-stat.go.jp/stat-search/files?cycle=0&tclass=000001125102'},
 's-JP-13':{title:'東京都の行政区域と、東京の都市範囲を区別します',body:'2020年国勢調査の東京都は14,047,594人です。既存の人口分布図にある「東京」はJRCが人口のまとまりとして定めた都市範囲なので、境界も算出方法も異なります。行政区域の年齢構成と都市の推計人口を、一つの分母へ混ぜないでください。',source:'https://www.e-stat.go.jp/stat-search/files?cycle=0&tclass=000001125102'},
 's-JP-23':{title:'愛知では国籍別の内訳まで確認できます',body:'2020年国勢調査の愛知県には外国人231,369人が記録され、そのうちブラジル国籍は52,886人です。表の国籍は出身地や祖先を表す分類ではありません。産業地図で製造業の広がりを比較できますが、この集計だけで国籍と勤務先を結び付けることはできません。',source:'https://www.e-stat.go.jp/stat-search/file-download?fileKind=0&statInfId=000032142723'},
 's-MY-12':{title:'サバ州では、市民権と民族を分けて読みます',body:'2026年推計のサバ州には非市民が1,030.0千人います。民族構成の図は市民だけを分母にするため、非市民割合の図とは読み方が異なります。「その他のブミプトラ」は複数の集団を含む資料上の区分で、一つの民族を意味しません。',source:'https://open.dosm.gov.my/data-catalogue/population_state'},
 's-MY-07':{title:'ペナン州の人口と産業を同じ場所で比べます',body:'マレーシアの人口推計は出生・死亡・移動を組み合わせて更新されています。ここで読むのは州全体の居住人口で、工業地区の従業者数ではありません。産業地図の州全体の製造業付加価値と比べる際は、2026年人口と2025年経済統計の年の違いも確かめてください。',source:'https://storage.dosm.gov.my/technotes/population_state.pdf'},
 's-IN-03':{title:'パンジャーブ州の言語と宗教は別の集計です',body:'2011年のパンジャーブ州では、母語の言語群と宗教を別々の設問で調査しています。パンジャーブ語の割合とシク教の割合を切り替えて読めますが、二つの割合から、同じ人がどちらにも含まれる人数は計算できません。',source:'https://censusindia.gov.in/nada/index.php/catalog/42458/download/46089/C-16_25062018.pdf'},
 's-IN-28':{title:'2011年の旧アーンドラ・プラデーシュ州として読みます',body:'この資料の人数は、テランガナ州分離前のアーンドラ・プラデーシュ州全体です。現在の二つの州の境界を結合して表示し、旧州の人数をそれぞれの州に複写していません。都市や産業の新しい資料へ移る際は、統計の年と区域が変わることに注意してください。',source:'https://censusindia.gov.in/nada/index.php/catalog/10191'},
};
