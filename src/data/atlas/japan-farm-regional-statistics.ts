import tokushima2025 from './japan-farm-tokushima-2025.json' with {type:'json'};
/** Published regional aggregates. A marker locates the reporting area; it is not a field, orchard or herd. */
export type FarmRegionalRow={id:string;name:string;point?:[number,number];prefecture?:string;mapOmitted?:string}&({value:number;status?:'rounded-zero'}|{value:null;status:'suppressed'|'not-reported'|'no-occurrence'});
export type FarmRegionalSeries={id:string;product:string;title:string;year:string;unit:'a'|'ha'|'t'|'頭';measure:string;grain:string;coverage:string;method:string;source:string;sourcePage:string;mapNote?:string;rows:FarmRegionalRow[]};
const pref=(entries:[string,string,number][]):FarmRegionalRow[]=>entries.map(([prefecture,name,value])=>({id:prefecture,name,value,prefecture}));
const tokushimaSeries=(product:'cabbage'|'tomato',name:string):FarmRegionalSeries=>({
 id:product+'-tokushima-2025',product,title:'徳島県・'+name+'作付面積（市町村表）',year:'2025年農林業センサス',unit:'a',measure:'販売目的の'+name+'作付面積',grain:'徳島県計・24市町村',
 coverage:`地図は県計の参照点、市町村別は下の表で確認できます。市町村の面積は14件の数値、${product==='cabbage'?'9件の秘匿・1件':'8件の秘匿・2件'}の該当なし。全国の分布ではありません。`,
 method:'調査期日2025年2月1日までの過去1年間に販売目的で作付けた延べ面積。原単位a（100a＝1ha）を保持。県計は公表値で、掲載市町村の数値合計とは別です。xは秘匿、－は調査したが事実なし。秘匿値の補完はしません。市町村の参照座標は未確認のため数表のみです。',
 source:'https://www.pref.tokushima.lg.jp/file/attachment/1048674.xlsx',sourcePage:'徳島県 2025年農林業センサス・2(11)（県公表2026年8月5日）',
 mapNote:'円は徳島県の公表計のみ。市町村別の数値・秘匿・該当なしは下の表。市町村位置や圃場の分布は示しません。',
 rows:tokushima2025.map((record):FarmRegionalRow=>{
  const token=record[product].area;
  const location=record.id==='JP-36'?{prefecture:'JP-36'}:{mapOmitted:'市町村の参照座標未確認'};
  const row={id:record.id,name:record.name+(record.id==='JP-36'?'計':''),...location};
  return token==='x'?{...row,value:null,status:'suppressed'}:token==='-'?{...row,value:null,status:'no-occurrence'}:{...row,value:Number(token)};
 })
});
export const japanFarmRegionalSeries:FarmRegionalSeries[]=[
 tokushimaSeries('cabbage','キャベツ'),tokushimaSeries('tomato','トマト'),
 {id:'potato-spring-2025',product:'potato',title:'春植えばれいしょ・収穫量',year:'2025年産（概算）',unit:'t',measure:'春植えばれいしょ収穫量',grain:'都道府県',coverage:'主産15県。残る県は未収録で、0ではありません。春植えのみで年間全量ではありません。',method:'農林水産省の公表表から主産15県の収穫量を転記。点は県の位置参照です。',source:'https://www.maff.go.jp/j/seisan/tokusan/imo/attach/pdf/r7shiryo-16.pdf',sourcePage:'PDF 3頁（主産県収穫量）',rows:pref([
 ['JP-01','北海道',1692000],['JP-02','青森県',11700],['JP-07','福島県',10300],['JP-08','茨城県',46800],['JP-12','千葉県',25000],['JP-20','長野県',12900],['JP-22','静岡県',11600],['JP-24','三重県',1420],['JP-33','岡山県',1050],['JP-34','広島県',4450],['JP-41','佐賀県',3030],['JP-42','長崎県',64400],['JP-43','熊本県',15800],['JP-45','宮崎県',8200],['JP-46','鹿児島県',77800]])},
 {id:'cabbage-pref-2024',product:'cabbage',title:'キャベツ・主産県の作付面積',year:'2024年産',unit:'ha',measure:'キャベツ作付面積',grain:'都道府県',coverage:'産出額上位5県に付記された作付面積。全国の県一覧ではありません。順位は産出額によるものです。',method:'同じ資料の付録3に載る作付面積のみを採用。金額や面積から県内分布を推定しません。',source:'https://www.maff.go.jp/j/seisan/ryutu/yasai/attach/pdf/index-118.pdf',sourcePage:'付録3・冊子37頁（PDF 39頁）',rows:pref([['JP-23','愛知県',5570],['JP-10','群馬県',4090],['JP-12','千葉県',2640],['JP-08','茨城県',2380],['JP-46','鹿児島県',1670]])},
 {id:'tomato-pref-2024',product:'tomato',title:'トマト・主産県の作付面積',year:'2024年産',unit:'ha',measure:'トマト作付面積',grain:'都道府県',coverage:'産出額上位5県に付記された作付面積。全国の県一覧ではありません。',method:'付録3の作付面積。熊本県の総計は八代のGI塩トマトの面積ではありません。',source:'https://www.maff.go.jp/j/seisan/ryutu/yasai/attach/pdf/index-118.pdf',sourcePage:'付録3・冊子37頁（PDF 39頁）',rows:pref([['JP-43','熊本県',1210],['JP-01','北海道',781],['JP-23','愛知県',477],['JP-08','茨城県',894],['JP-07','福島県',318]])},
 {id:'tomato-hokkaido-2020',product:'tomato',title:'北海道・振興局別トマト収穫量',year:'2020年産',unit:'t',measure:'トマト収穫量（ミニトマトを含む）',grain:'北海道の振興局',coverage:'公表表で数値がある13振興局。根室はトマトの数値が掲載されず、0とは扱いません。',method:'北海道の聞き取り調査。農林水産統計と連続しません。各点は振興局の位置参照で、生産地や振興局の中心を意味しません。',source:'https://www.pref.hokkaido.lg.jp/fs/5/2/6/4/2/7/8/_/syuyouyasaityousa20220131.pdf',sourcePage:'PDF 2–15頁・令和2年産列',rows:[
  ['sorachi','空知',5332.2,141.85,43.19],['ishikari','石狩',2647,141.35,43.06],['shiribeshi','後志',6959,140.76,42.9],['iburi','胆振',4262.8,141.0,42.32],['hidaka','日高',13734,142.36,42.17],['oshima','渡島',5542.8,140.73,41.77],['hiyama','檜山',1735,140.13,41.87],['kamikawa','上川',10773.1,142.37,43.77],['rumoi','留萌',277.7,141.64,43.94],['soya','宗谷',10,141.67,45.41],['okhotsk','オホーツク',184.6,143.89,43.8],['tokachi','十勝',127.8,143.2,42.92],['kushiro','釧路',6,144.38,42.98]
 ].map(([id,name,value,lng,lat]):FarmRegionalRow=>({id:String(id),name:String(name),value:Number(value),point:[Number(lng),Number(lat)]})).concat([{id:'nemuro',name:'根室',value:null,status:'not-reported'}])},
 {id:'apple-aomori-2025',product:'apple',title:'青森県・地域別りんご栽培面積',year:'2025年',unit:'ha',measure:'りんご栽培面積',grain:'青森県内6地域',coverage:'青森県内の6地域すべて。全国や市町村別の一覧ではありません。下北の公表値0haは丸め値です。',method:'青森県りんご果樹課調べ。丸めた値をそのまま表示。点は地域を読むための市街地側参照位置で、園地ではありません。',source:'https://www.pref.aomori.lg.jp/soshiki/nourin/ringo/R8aomoriringo.pdf',sourcePage:'冊子4頁（PDF 5頁）',rows:[
  {id:'tosei',name:'東青地域',value:1696,point:[140.74,40.82]},{id:'shimokita',name:'下北地域',value:0,status:'rounded-zero',point:[141.22,41.29]},{id:'kamikita',name:'上北地域',value:15,point:[141.21,40.61]},{id:'seihoku',name:'西北地域',value:3784,point:[140.44,40.8]},{id:'chunan',name:'中南地域',value:13189,point:[140.47,40.6]},{id:'sannohe',name:'三八地域',value:1277,point:[141.49,40.51]}
 ]},
 {id:'mandarin-kimino-2020',product:'mandarin',title:'紀美野町・温州みかん栽培面積',year:'2020年',unit:'ha',measure:'販売目的の温州みかん栽培面積',grain:'市町村',coverage:'紀美野町の確認済み1町。隣接市町村や有田川町の値ではありません。',method:'2020年農林業センサスの既存転記値。現在の原表再照合は未了です。点は紀美野町内の位置参照で、果樹園の境界ではありません。',source:'https://www.machimura.maff.go.jp/machi/contents/30/304/details.html',sourcePage:'紀美野町・2020年農林業センサス',rows:[{id:'kimino',name:'紀美野町',value:80,point:[135.31,34.16]}]},
 {id:'milk-ikeda-2020',product:'milk',title:'池田町・乳用牛飼養頭数',year:'2020年',unit:'頭',measure:'乳用牛飼養頭数',grain:'市町村',coverage:'池田町の確認済み1町。別海町や十勝全域の値ではありません。',method:'2020年農林業センサス。生乳生産量（t）ではなく乳用牛の頭数です。',source:'https://www.town.hokkaido-ikeda.lg.jp/sangyo/nouchikusangyo/ikeda-nouchiku/521.html',sourcePage:'本文・令和2年調査',rows:[{id:'ikeda',name:'北海道池田町',value:2931,point:[143.45,42.93]}]},
 {id:'beef-ikeda-2020',product:'beef',title:'池田町・肉用牛飼養頭数',year:'2020年',unit:'頭',measure:'肉用牛飼養頭数',grain:'市町村',coverage:'池田町の確認済み1町。十勝全域の値ではありません。',method:'2020年農林業センサス。肉用牛の頭数で、牛肉生産重量ではありません。',source:'https://www.town.hokkaido-ikeda.lg.jp/sangyo/nouchikusangyo/ikeda-nouchiku/521.html',sourcePage:'本文・令和2年調査',rows:[{id:'ikeda',name:'北海道池田町',value:6151,point:[143.45,42.93]}]}
];
export const japanFarmRegionalSeriesById=(id:string|undefined|null)=>japanFarmRegionalSeries.find(s=>s.id===id);
export const formatFarmRegionalValue=(row:FarmRegionalRow,unit:string)=>row.status==='suppressed'?'秘匿（X）':row.status==='no-occurrence'?'該当なし（－）':row.value===null?'未掲載':row.status==='rounded-zero'?'0（丸め値）'+unit:row.value.toLocaleString('ja-JP',{maximumFractionDigits:2})+unit;
/** Unknown values have no quantitative symbol; all-zero series never divide by zero. */
export function farmRegionalDiameter(row:FarmRegionalRow,rows:FarmRegionalRow[]):number|null{
 if(row.value===null)return null;
 const max=Math.max(0,...rows.map(r=>r.value??0));
 return max===0?7:Math.max(7,30*Math.sqrt(row.value/max));
}
