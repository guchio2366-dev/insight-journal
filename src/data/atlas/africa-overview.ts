import {getOverviewRegion} from './country-overview';
import {countries as atlasCountries,regionNames,metrics,valueAt,formatValue} from './africa-atlas';
import {reading as fieldReading} from './africa-reading';

export const africaOverviewTopics=[{id:'nature',label:'自然環境'},{id:'agriculture',label:'農林業'},{id:'industry',label:'主要産業'},{id:'population',label:'人口・社会'},{id:'politics',label:'制度・地域協力'}] as const;
export type AfricaOverviewTopic=typeof africaOverviewTopics[number]['id'];
export type AfricaOverviewSource={label:string;url:string};
export type AfricaOverviewReading={id:AfricaOverviewTopic;title:string;paragraphs:string[];sources:AfricaOverviewSource[]};
export type AfricaOverviewEntry={code:string;name:string;takeaway:string;readings:AfricaOverviewReading[]};
const year=2021;
const agreement: AfricaOverviewSource={label:'アフリカ連合：AfCFTA設立協定（2018年採択）',url:'https://au.int/en/treaties/agreement-establishing-african-continental-free-trade-area'};
const cities: AfricaOverviewSource={label:'世界銀行：Africa’s Cities（2017年）',url:'https://www.worldbank.org/en/region/afr/publication/africa-cities-opening-doors-world'};
const dataSource=(id:string):AfricaOverviewSource=>({label:`世界銀行WDI：${metrics.find(metric=>metric.id===id)!.label}の定義・原系列`,url:`https://databank.worldbank.org/metadataglossary/world-development-indicators/series/${id}`});
function stat(id:string,code:string){const metric=metrics.find(item=>item.id===id)!;const value=valueAt(id,code,year);return `${metric.label}：${formatValue(value,metric)}${value===null?'':` ${metric.unit}`}（${metric.timeless?'長期平均。選択年の実測ではありません':`${year}年`}）。`;}
const landscape:Record<string,string>={
 north:'地中海沿岸と乾燥した内陸、河川沿いの低地を比べ、雨の量と実際に届けられる水を分けて読みます。',
 west:'ギニア湾岸とサヘルで、雨の季節、樹木作物と穀物・家畜の組合せを比べます。',
 central:'コンゴ盆地の森林、周辺の高地と沿岸を比べ、土地利用と水・道路への接続を読みます。',
 east:'高地・湖・乾燥した低地・島しょの違いを比べ、標高と雨季を同じ指標と扱わずに読みます。',
 south:'沿岸、内陸の乾燥域、高地を比べ、水の利用と電力・市場への接続を読みます。',
};
const sourceOf=(story:typeof fieldReading.nature[number]):AfricaOverviewSource=>({label:story.sourceLabel,url:story.source});
function storyFor(field:keyof typeof fieldReading,code:string){const story=fieldReading[field].find(item=>item.places.includes(code))??fieldReading[field][0];return {paragraph:`地域内で比較する事例：${story.title}。${story.text}`,source:sourceOf(story)};}

export function getAfricaOverview(){
 const region=getOverviewRegion('africa');
 const countries: AfricaOverviewEntry[]=region.countries.map(country=>{
  const atlas=atlasCountries.find(item=>item.code===country.code)!;
  const nature=storyFor('nature',country.code),agriculture=storyFor('agriculture',country.code),industry=storyFor('industry',country.code),population=storyFor('population',country.code);
  const missing=atlas.statistical?'':'西サハラのWDI系列は未収録です。他国の値を転用していません。境界は概略図の区分で、領有権や実効支配の判断を示しません。';
  return {code:country.code,name:country.name,takeaway:`${country.name}を、自然条件、国別指標、生産を支える水・電力・交通・市場、暮らしと制度の関係から読みます。`,readings:[
   {id:'nature',title:`${country.name}：自然条件と水の利用`,paragraphs:[landscape[atlas.region],stat('AG.LND.PRCP.MM',country.code),stat('ER.H2O.INTR.PC',country.code),'国土平均の雨量は国内の気候分布ではありません。国内の再生可能淡水は国外からの流入・配水へのアクセスを含みません。',nature.paragraph,...(missing?[missing]:[])],sources:[dataSource('AG.LND.PRCP.MM'),dataSource('ER.H2O.INTR.PC'),nature.source]},
   {id:'agriculture',title:`${country.name}：土地利用と生産を分ける`,paragraphs:[stat('AG.LND.ARBL.ZS',country.code),stat('AG.LND.FRST.ZS',country.code),stat('AG.YLD.CREL.KG',country.code),'耕地は永年作物・恒久的牧草地を含みません。森林割合は木材生産量でも保全の良さでもなく、穀物の収量は農家の所得ではありません。',agriculture.paragraph,...(missing?[missing]:[])],sources:[dataSource('AG.LND.ARBL.ZS'),dataSource('AG.LND.FRST.ZS'),dataSource('AG.YLD.CREL.KG'),agriculture.source]},
   {id:'industry',title:`${country.name}：産業構成と市場への接続`,paragraphs:[stat('NV.IND.MANF.ZS',country.code),stat('NV.SRV.TOTL.ZS',country.code),stat('NY.GDP.TOTL.RT.ZS',country.code),'付加価値の割合と生産量・輸出額を区別します。天然資源レントは資源価格と採取費用の差の推計で、鉱山別産出量や政府収入ではありません。',industry.paragraph,...(missing?[missing]:[])],sources:[dataSource('NV.IND.MANF.ZS'),dataSource('NV.SRV.TOTL.ZS'),dataSource('NY.GDP.TOTL.RT.ZS'),industry.source]},
   {id:'population',title:`${country.name}：人口と社会の構成を分ける`,paragraphs:[stat('SP.POP.TOTL',country.code),stat('EN.POP.DNST',country.code),stat('SP.URB.TOTL.IN.ZS',country.code),'国平均の密度から国内の居住範囲は分かりません。都市の定義は国ごとに異なります。人口格子と民族・宗教の掲載集団の面は、母集団も資料年も違います。',population.paragraph,...(missing?[missing]:[])],sources:[dataSource('SP.POP.TOTL'),dataSource('EN.POP.DNST'),dataSource('SP.URB.TOTL.IN.ZS'),population.source]},
   {id:'politics',title:`${country.name}：制度・地域協力を読む視点`,paragraphs:['灌漑の用水配分、土地へのアクセス、資源収入の配分、交通・住宅への投資は、自然条件だけでは説明できない生産と暮らしの背景です。','地域協力の事例として、2018年採択のAfCFTA設立協定を読みます。貿易を支える協定の目的と、各国での参加・実施状況や成果は区別します。この説明は国別の政治制度や現在の加盟状況を示すものではありません。'],sources:[agreement,agriculture.source,industry.source,cities]},
  ]};
 });
 const reading={title:'自然の違いを、水・電力・交通・市場につなぐ',takeaway:'アフリカの地域差を、雨・地形から生産へ、灌漑・加工・電力・物流と市場へ、土地・資源・暮らしを支える制度へとつないで読む。',readings:africaOverviewTopics.map(topic=>({id:topic.id,title:topic.label,paragraphs:topic.id==='politics'?['地域協力の事例にAfCFTA設立協定（2018年）があります。制度の目的と参加・実施の状況を分け、国境を越える生産・交通・市場を読みます。']:fieldReading[topic.id].map(item=>`${item.title}。${item.text}`),sources:topic.id==='politics'?[agreement]:fieldReading[topic.id].map(sourceOf)}))};
 return {region,reading,countries,regionNames,comparisonYear:year};
}
