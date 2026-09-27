import type {AsiaState} from '../../lib/atlas-asia-state';
import type {IndustryTopic} from './asia-industry';
export type TradeRegion={file:string;countries:string[];covered:number};
export type TradeCountry={reporterCode:number;sourceName:string;classifications:string[];products:Record<string,{X?:number|null;M?:number|null}>;partners:Record<string,{world:number;values:[number,number][]}>;topChapters:string[]};
export type TradeData={countries:Record<string,TradeCountry>;partners:Record<string,{name:string;iso2:string;iso3:string}>};
export type FarmTrade={codes:string[];label:string;note:string};
export const tradeTopics:IndustryTopic[]=[['trade-exports','商品輸出額'],['trade-imports','商品輸入額']].map(([id,title])=>({id,title,parent:'貿易',kind:'trade',unit:'百万米ドル',year:'2023',source:'https://comtradeplus.un.org/',note:'国・地域全体の商品貿易を、2023年の名目米ドルで比較します。サービス貿易を含みません。輸出には再輸出が含まれ、国内で生まれた付加価値や生産額とは異なります。'}));
export const isTradeTopic=(topic:string|null|undefined)=>tradeTopics.some(t=>t.id===topic);
export const tradeChapter=(state:AsiaState)=>state.detail?.startsWith('t-')?state.detail.slice(2):'TOTAL';
export function normalizeTradeState(state:AsiaState,chapters:Record<string,string>):AsiaState{
 if(state.field!=='industry'||!isTradeTopic(state.topic))return state;
 const chapter=tradeChapter(state);return {...state,detail:chapter!=='TOTAL'&&Object.hasOwn(chapters,chapter)?'t-'+chapter:null,city:null};
}
export const tradeFlow=(state:AsiaState)=>state.topic==='trade-imports'?'M':'X';
export const tradeValue=(country:TradeCountry|undefined,code:string,flow:'X'|'M')=>country?.products[code]?.[flow]??null;
export function tradeShare(value:number|null,total:number|null){return value===null||total===null||total<=0?null:value/total*100;}
export const tradeColors=['#edf0dc','#cfdfb5','#98c1a6','#56978e','#216475'];
export function tradeScale(values:(number|null)[]){const max=Math.max(0,...values.map(v=>v??0));const breaks=[.01,.1,.3,.6].map(p=>p*max);return {breaks,color:(v:number|null)=>v===null?'#d2ceca':v===0?tradeColors[0]:tradeColors[breaks.filter(b=>v>=b).length]};}
export function formatTradeMoney(value:number|null){if(value===null)return '未掲載';if(value>0&&value<10000)return '0.01未満';return (value/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2});}
export const tradeCoverageNote=(code:string)=>code==='TWN'?'台湾の位置には、国連の「Other Asia, nes」（報告区分490）を参照して表示します。台湾等を含む区分であり、台湾だけの厳密な値とは言い切れません。中国本土156とは合算していません。':code==='CHN'?'中国は本土の報告区分156です。香港・マカオは別の貿易区分です。':['AFG','BGD','NPL','PRK','TKM'].includes(code)?'この国の2023年の商品貿易は、今回の公開データ取得では得られませんでした。取引が0という意味ではなく、別の年や相手国の報告値で埋めていません。':'';
export function partnerName(id:number,record:TradeData['partners'][string]|undefined){
 if(id===490)return 'その他のアジア（台湾等）';if(id===842)return '米国（領域を含む報告区分）';
 if(id===899)return '相手先を特定しない区分';if(id===837)return '船舶・航空機への補給';if(id===839)return '特別分類の相手先';
 if(record?.iso2&&/^[A-Z]{2}$/.test(record.iso2)){try{return new Intl.DisplayNames(['ja'],{type:'region'}).of(record.iso2)??record.name;}catch{}}
 return (record?.name??'相手先区分')+'（資料コード '+id+'）';
}
export const farmTrade:Record<string,FarmTrade>={
 rice:{codes:['1006'],label:'米（籾・精米・砕米など）',note:'米の加工段階を合計した金額です。籾の生産重量と精米の重量は直接比較できません。'},
 wheat:{codes:['1001'],label:'小麦・メスリン',note:'製粉前の小麦等の金額です。小麦粉・パンを含む食品産業全体ではありません。'},
 maize:{codes:['1005'],label:'トウモロコシ',note:'穀粒などの商品貿易額です。飼料全体の調達額や畜産向けの使用割合ではありません。'},
 soybean:{codes:['1201'],label:'大豆',note:'大豆油や大豆かすを含む加工後の製品は別の品目です。'},
 cotton:{codes:['5201'],label:'綿（カード・コーム処理前）',note:'種を取り除いた綿繊維の区分です。国別の種を含む綿花の生産量とは加工段階が異なります。'},
 tea:{codes:['0902'],label:'茶（加工後）',note:'生葉を乾燥・加工した商品の区分です。茶の生葉の生産重量とは直接比較できません。'},
 cassava:{codes:['0714'],label:'キャッサバなどの根・いも類',note:'キャッサバのほか、さつまいもなども含む広い商品区分です。キャッサバだけの輸出入ではありません。'},
 oilpalm:{codes:['1511'],label:'パーム油・その分別物',note:'搾った油の区分です。果実の生産重量や栽培面積とは単位も加工段階も異なります。'},
 rubber:{codes:['4001'],label:'天然ゴムなど（一次形状等）',note:'一次形状などの天然ゴムです。タイヤなどのゴム製品の金額は含めません。'},
 arabica:{codes:['0901'],label:'コーヒー（種類・加工段階の合計）',note:'アラビカ種とロブスタ種を分けず、焙煎したものなども含みます。この地図の品種だけの金額ではありません。'},
 robusta:{codes:['0901'],label:'コーヒー（種類・加工段階の合計）',note:'ロブスタ種とアラビカ種を分けず、焙煎したものなども含みます。この地図の品種だけの金額ではありません。'},
 chickpea:{codes:['0713'],label:'乾燥した豆類',note:'ひよこ豆だけでなく、レンズ豆なども含む商品区分です。'},
 lentil:{codes:['0713'],label:'乾燥した豆類',note:'レンズ豆だけでなく、ひよこ豆なども含む商品区分です。'},
 pearlmillet:{codes:['1008'],label:'雑穀類（そば・キビ類など）',note:'そばや複数の雑穀を含む広い区分で、トウジンビエだけの金額ではありません。'},
 sugarcane:{codes:['1701'],label:'固形の砂糖',note:'サトウキビ・てん菜由来の砂糖などです。原料のサトウキビの生産重量とは異なります。'},
 cattle:{codes:['0201','0202','0401','0402','0406'],label:'牛の類の肉・乳製品',note:'牛の類の肉は水牛などを含み、乳製品も動物種を分けていません。地図の牛だけから生産された量・金額とは読めません。'},
 buffalo:{codes:['0201','0202','0401','0402','0406'],label:'牛の類の肉・乳製品',note:'肉は牛・水牛などの合計で、乳製品も動物種を分けていません。水牛だけの金額ではありません。'},
 sheep:{codes:['0204','5101'],label:'羊・山羊の肉、羊毛',note:'肉は羊と山羊を合計した区分です。羊毛は羊の品目で、肉と分けて読みます。'},
 goat:{codes:['0204'],label:'羊・山羊の肉',note:'羊と山羊を合計した商品区分です。山羊だけの金額ではありません。'},
 pig:{codes:['0203'],label:'豚肉',note:'生鮮・冷蔵・冷凍の豚肉です。生きた豚や調製品を含む豚関連貿易の全体ではありません。'},
 chicken:{codes:['0207','0407'],label:'家きんの肉・卵',note:'肉は鶏以外の家きんも含み、生鮮・冷蔵・冷凍の区分です。加熱調製品は含みません。卵も肉とは別に示します。'},
 forest:{codes:['4403','4407'],label:'丸太・製材',note:'丸太と製材は加工段階が異なります。再輸出も含むため、国内の森林から伐採した量や国内木材自給率へ換算できません。'},
};
export const farmTradeLabels:Record<string,string>={'0201':'牛の類の肉（生鮮・冷蔵）','0202':'牛の類の肉（冷凍）','0203':'豚肉','0204':'羊・山羊の肉','0207':'家きんの肉・くず肉','0401':'乳・クリーム（濃縮等を除く）','0402':'乳・クリーム（濃縮等）','0406':'チーズ・カード','0407':'殻付きの鳥卵','5101':'羊毛（カード・コーム処理前）','4403':'丸太','4407':'製材'};
