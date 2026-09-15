
import type {ProductId} from '../../lib/atlas-agriculture-detail-state.ts';

export const productNames:Record<ProductId,string>={corn:'とうもろこし',soybean:'大豆',wheat:'小麦',cotton:'綿花',rice:'稲作',specialty:'果樹・野菜等',beef:'肉牛',dairy:'酪農',hogs:'養豚',broilers:'肉用鶏',layers:'採卵鶏'};
export const productParagraphs:Record<ProductId,readonly string[]>={
corn:[
'とうもろこしは、中央低地を中心とするコーンベルトに広がります。地形と標高を見比べると、内陸に広い農地が続く様子を読み取れます。ただし、平坦であることと標高が低いことは同じではありません。',
'用途は家畜の飼料、燃料用エタノール、食品原料など。大豆との輪作も行われます。西寄りの産地では灌漑も重要で、長い散水装置が支点の周りを回るセンターピボット方式によって、円形の畑が見られます。全産地が同じ灌漑方式というわけではありません。',
'ミシシッピ川と支流は、穀物を下流の輸出拠点へ運ぶ経路の一つです。雨の分布、川の線、流域の面を切り替えると、農地の水条件と輸送のつながりを別々に確かめられます。'],
soybean:[
'大豆はとうもろこしと重なる中西部の産地が多く、両者を組み合わせた輪作が行われます。油を搾った後の大豆ミールは、豚や鶏などの飼料のたんぱく源になります。とうもろこしの飼料利用と合わせて、作物と畜産の結び付きを読むことができます。',
'国内の加工・飼料需要に加え、輸出も重要です。ミシシッピ川水系は輸送経路の一つで、川の位置と広い流域を見比べると、内陸の産地と下流側のつながりが分かります。流域に含まれること自体が、その農地の灌漑を意味するわけではありません。'],
wheat:[
'小麦はグレートプレーンズなどに広がり、北部では春にまく春小麦、中部から南部では秋にまいて越冬する冬小麦が重要です。これは地域的な傾向で、すべての小麦を単純な南北の境界で分けるものではありません。',
'グレートプレーンズの西寄りにはステップ気候が見られます。気候図では乾燥の程度を、地形・標高図では、平原でも中央低地より標高が高い地域があることを確かめられます。小麦の栽培域全体がステップ気候に一致するわけではありません。'],
cotton:[
'綿花は、霜のない暖かい期間を確保できる南部で栽培されます。ただし、西寄りのテキサスと南東部では水の条件が異なり、降水に頼る栽培と灌漑を利用する栽培の両方があります。',
'テキサスのハイプレーンズ帯水層と、南西ジョージアなどで利用されるフロリダン帯水層系を見比べると、離れた産地でも地下水が農業を支える例を読めます。南東部の例をフロリダ半島全体に広げて考えないこと、年降水量だけでなく雨の時期や土壌も関わることが大切です。'],
rice:[
'米国の稲作は、ミシシッピ川下流域を中心とする南部と、カリフォルニアなどに分布します。南部では暖かい気候に加え、ミシシッピ川沿いの沖積帯水層からの地下水利用も重要です。雨の多い気候であっても、必要な時期の灌漑水が自動的に確保されるわけではありません。',
'カリフォルニアの例では、産地の雨だけでなく、上流側の雨や雪、川、貯水池との関係が重要です。サクラメント川とシャスタ湖、サクラメント川流域、降水量図を見比べると、農地の外側にも水源が広がっていることを読み取れます。'],
specialty:[
'果樹・野菜等は種類によって必要な気候や栽培方法が異なります。ここではカリフォルニアのセントラルヴァレーを一つの例として、広い谷底の農地と周囲の山地の関係を見ます。',
'農地の水条件を考えるには、その場所の降水だけでなく、川、貯水、地下水にも目を向ける必要があります。谷と山地の降水量差、サンホアキン川の流域、セントラルヴァレー帯水層系を見比べてみてください。流域の境界は灌漑の供給範囲ではなく、セントラルヴァレー全体の境界でもありません。'],
beef:[
'肉牛の生産は、繁殖・子牛の育成、放牧、肥育などの段階から成り、同じ場所で完結するとは限りません。グレートプレーンズの広がりは放牧や肥育の立地を読む手掛かりになりますが、すべてを一つの生産方式で説明しないことが大切です。',
'肥育には、とうもろこしなどの飼料作物との関係もあります。水の利用を考えるときは牛の飲み水だけでなく、飼料を育てるための灌漑にも注目します。南部グレートプレーンズの例では、ハイプレーンズ帯水層と飼料生産とのつながりを確認できます。'],
dairy:[
'酪農は五大湖周辺や北東部だけでなく、カリフォルニアやアイダホにも分布します。飼料の確保、暑さへの対応、搾った生乳の集荷・冷却・加工などが関わるため、「寒い地域だから」だけでは分布を説明できません。',
'ウィスコンシンでは乳製品加工とのつながりを産業地図で、カリフォルニアでは飼料生産や水資源との関係を自然環境地図で確かめられます。帯水層と河川流域は別の範囲であり、流域内の水がそのまま酪農へ配分されるという意味ではありません。'],
hogs:[
'養豚では、とうもろこしがエネルギー源、大豆ミールがたんぱく源となり、飼料作物との結び付きが重要です。中西部の産地はコーンベルトとの関係で読み取れます。',
'一方、ノースカロライナなどにも生産地域があり、飼料の近さだけでは全体を説明できません。飼料供給、飼育、加工を結び付ける生産の仕組みにも目を向けます。'],
broilers:[
'肉用鶏は南東部などにまとまった生産地域があります。飼料にはとうもろこしや大豆ミールが使われ、作物の生産・供給との関係が重要です。',
'孵化、飼料供給、契約農場での飼育、処理・加工をつなぐ仕組みも特徴です。鶏を育てる場所だけでなく、生産工程が地域内でどう結び付くかという視点で分布を読みます。'],
layers:[
'採卵鶏も、とうもろこしや大豆ミールなどの飼料供給と結び付いています。採卵後は集荷、選別、包装、出荷へ続くため、農場だけでなく流通の仕組みも重要です。',
'殻付き卵の割れやすさは、包装や積み替え、輸送の条件として考えられます。ただし、米国の生産分布を「大消費地の近くにあるから」と一律に説明することは避け、飼料、生産規模、集荷・出荷体制を合わせて読みます。']
};
const ers='https://www.ers.usda.gov/topics/';
const transport='https://www.ams.usda.gov/sites/default/files/media/ReliableWaterwaySystem042025.pdf';
const california='https://water.ca.gov/Water-Basics/The-California-Water-System';
const feedWater='https://agdatacommons.nal.usda.gov/articles/dataset/Data_from_Irrigation_water_used_to_produce_cattle_feeds_throughout_the_United_States/30128560';
export const productSources:Record<ProductId,readonly [string,string][]>={
corn:[['USDA ERS・飼料穀物',ers+'crops/corn-and-other-feed-grains/feed-grains-sector-at-a-glance'],['USGS・灌漑','https://pubs.usgs.gov/publication/sir20225042/full'],['USDA AMS・穀物水運',transport]],
soybean:[['USDA ERS・大豆',ers+'crops/soybeans-and-oil-crops/oil-crops-sector-at-a-glance'],['USDA AMS・穀物水運',transport]],
wheat:[['USDA ERS・小麦',ers+'crops/wheat/wheat-sector-at-a-glance']],
cotton:[['USDA ERS・綿花',ers+'crops/cotton-and-wool/cotton-sector-at-a-glance'],['Florida IFAS・綿花','https://ask.ifas.ufl.edu/publication/AG495'],['Georgia EPD・灌漑','https://epd.georgia.gov/document/document/20241025-response-commentpdf/download']],
rice:[['USDA ERS・米',ers+'crops/rice/rice-sector-at-a-glance'],['USGS・地下水灌漑','https://www.usgs.gov/media/images/irrigation-water-a-groundwater-well-a-rice-crop-field'],['California DWR',california]],
specialty:[['California DWR',california]],
beef:[['USDA ERS・肉牛',ers+'animal-products/cattle-beef/sector-at-a-glance'],['USDA・飼料の灌漑水',feedWater]],
dairy:[['USDA ERS・酪農',ers+'animal-products/dairy/background'],['WEDC・食品産業','https://wedc.org/key-industries/food-and-beverage/'],['USDA・飼料の灌漑水',feedWater]],
hogs:[['USDA ERS・養豚',ers+'animal-products/hogs-pork/sector-at-a-glance']],
broilers:[['USDA ERS・家禽と卵',ers+'animal-products/poultry-eggs/sector-at-a-glance']],
layers:[['USDA ERS・家禽と卵',ers+'animal-products/poultry-eggs/sector-at-a-glance']]
};
export type InsightTarget={page:'nature'|'industry';env?:'climate'|'water'|'landform'|'contour';waterView?:'rivers'|'precipitation'|'basins';features?:readonly string[];basin?:string;sector?:string;subsector?:string;industryRegion?:string};
export type AgricultureInsight={id:string;products:readonly ProductId[];label:string;lead:string;target:InsightTarget;bounds:readonly [number,number,number,number]};
const interior=[-106,30,-80,50] as const,plains=[-109,28,-94,50] as const,ms=[-114,28,-77,50] as const,ca=[-125,32,-115,43] as const;
const water=(...features:string[]):InsightTarget=>({page:'nature',env:'water',waterView:'rivers',features:features.map(id=>'water:'+id)});
const rain:InsightTarget={page:'nature',env:'water',waterView:'precipitation'};
const basin=(id:string):InsightTarget=>({page:'nature',env:'water',waterView:'basins',basin:id});
export const agricultureInsights:readonly AgricultureInsight[]=[
{id:'plains-elevation',products:['corn','wheat'],label:'低地と高原の高さ',lead:'中央低地から西側の平原へ、500m間隔の等高線を見比べます。平坦さと標高の低さは別の条件です。',target:{page:'nature',env:'contour'},bounds:interior},
{id:'central-lowland',products:['corn'],label:'中央低地の広がり',lead:'とうもろこしの栽培域と中央低地の位置関係を見ます。地形区分の境界は、土壌の肥沃さの境界ではありません。',target:{page:'nature',env:'landform',features:['landform:中央低地']},bounds:[-101,33,-80,49]},
{id:'grain-rivers',products:['corn','soybean'],label:'川と穀物輸送',lead:'ミシシッピ川とオハイオ川は、内陸の穀物を下流の輸出拠点へ運ぶ経路の一つです。川の線は輸送量やすべての物流経路を表しません。',target:water('Mississippi','Ohio'),bounds:ms},
{id:'corn-pivot-water',products:['corn'],label:'円形の畑を支える水',lead:'ネブラスカなど西寄りの産地と、ハイプレーンズ帯水層を見比べます。地下水灌漑とセンターピボットの関係を読む例であり、帯水層全域が円形農場という意味ではありません。',target:water('High Plains Aquifer'),bounds:[-105,35,-94,44]},
{id:'interior-rainfall',products:['corn','soybean','wheat'],label:'内陸の雨の分布',lead:'中央低地から西側の平原へ、産地と雨量帯を見比べます。1991–2020年の年降水量平年値であり、1,000mmや1,500mmの線は作物の栽培限界ではありません。',target:rain,bounds:interior},
{id:'grain-basin',products:['corn','soybean'],label:'ミシシッピ川の流域',lead:'支流を含む集水域と産地の位置を見比べます。流域は雨水が河川へ集まる範囲であり、物流網・灌漑の供給範囲・帯水層とは別です。',target:basin('mississippi'),bounds:ms},
{id:'wheat-steppe',products:['wheat'],label:'ステップ気候を確かめる',lead:'グレートプレーンズ西寄りのBSk（低温のステップ気候）と小麦を比べます。小麦の栽培域全体がこの気候区分に一致するわけではありません。',target:{page:'nature',env:'climate',features:['climate:BSk']},bounds:plains},
{id:'great-plains',products:['wheat','beef'],label:'グレートプレーンズ',lead:'産地とグレートプレーンズの広がりを見比べます。同じ平原の中でも、気候や生産方式は一様ではありません。',target:{page:'nature',env:'landform',features:['landform:グレートプレーンズ']},bounds:plains},
{id:'cotton-aquifers',products:['cotton'],label:'二つの産地の地下水',lead:'テキサスのハイプレーンズ帯水層と、南西ジョージアなどで利用されるフロリダン帯水層系を同時に強調しています。南東部の例をフロリダ半島全体に広げないように見比べます。',target:water('High Plains Aquifer','Floridan Aquifer System'),bounds:[-106,24,-79,42]},
{id:'cotton-rainfall',products:['cotton'],label:'綿花産地の雨の違い',lead:'テキサスと南東部の年降水量を比べます。年間の雨量だけでは雨の時期や土壌、天水・灌漑の実態までは判断できません。',target:rain,bounds:[-106,24,-79,42]},
{id:'rice-alluvial',products:['rice'],label:'南部の稲作と地下水',lead:'南部の稲作とミシシッピ川流域沖積帯水層を重ねます。この地下水の範囲は、川へ地表水が集まる流域の面とは異なります。',target:water('Mississippi River Valley Alluvial Aquifer'),bounds:[-97,28,-86,38]},
{id:'rice-humid',products:['rice'],label:'温暖湿潤気候を確かめる',lead:'ミシシッピ川下流域の稲作とCfa（温暖湿潤気候）を見比べます。暖かく雨のある気候でも、必要な時期の灌漑水が自動的に確保されるわけではありません。',target:{page:'nature',env:'climate',features:['climate:Cfa']},bounds:[-97,28,-86,38]},
{id:'rice-sacramento-water',products:['rice'],label:'川と貯水池から見る稲作',lead:'サクラメント川とシャスタ湖を強調しています。農地の外にある上流の水源と貯水を合わせて読みます。',target:water('Sacramento','shasta-lake'),bounds:[-124,37,-119,42.5]},
{id:'sacramento-basin',products:['rice'],label:'サクラメント川の流域',lead:'カリフォルニアの稲作と上流の集水域を比べます。流域境界は灌漑の供給契約や水の配分範囲ではありません。',target:basin('sacramento'),bounds:[-124,37,-119,42.5]},
{id:'california-rainfall',products:['rice','specialty'],label:'谷と山地の雨の違い',lead:'カリフォルニアの谷底、山地、北側の雨雪の分布を見比べます。農地の外にも水源があることを読む図で、年降水量図だけで夏冬の違いを表したものではありません。',target:rain,bounds:ca},
{id:'rice-mississippi-basin',products:['rice'],label:'南部の稲作と河川流域',lead:'南部の稲作とミシシッピ川の集水域を比べます。沖積帯水層の図と切り替え、地表の流域と地下水の範囲の違いを確かめます。',target:basin('mississippi'),bounds:ms},
{id:'valley-landform',products:['specialty'],label:'谷と周囲の山地',lead:'セントラルヴァレーの谷底と、シエラネバダ山脈・太平洋岸山脈を見比べます。果樹・野菜のすべてに同じ生育条件を当てはめないための地域例です。',target:{page:'nature',env:'landform',features:['landform:カリフォルニアセントラルヴァレー','landform:シエラネバダ山脈','landform:太平洋岸山脈']},bounds:ca},
{id:'valley-water',products:['specialty','dairy'],label:'谷の農業を支える水',lead:'セントラルヴァレー帯水層系とサンホアキン川を見比べます。図の近接だけで個別農場の取水源を特定することはできません。',target:water('Central Valley Aquifer System','San Joaquin'),bounds:ca},
{id:'san-joaquin-basin',products:['specialty','dairy'],label:'サンホアキン川の流域',lead:'上流の集水域と産地を比べます。この流域図にはトゥーレア閉鎖流域を含まず、セントラルヴァレー全体や灌漑範囲とは一致しません。',target:basin('san-joaquin'),bounds:ca},
{id:'beef-feed-water',products:['beef'],label:'飼料生産を支える地下水',lead:'南部グレートプレーンズの肉牛とハイプレーンズ帯水層を見比べます。牛の飲み水だけでなく、飼料作物の灌漑を介した関係に注目します。',target:water('High Plains Aquifer'),bounds:[-106,29,-95,42]},
{id:'dairy-processing',products:['dairy'],label:'乳製品加工とのつながり',lead:'ウィスコンシンの食品・乳製品加工と酪農を重ねて見ます。記号は代表地域で、個々の加工場の所在地や生産量を示しません。',target:{page:'industry',sector:'manufacturing',subsector:'food',industryRegion:'wisconsin-food'},bounds:[-96,40,-84,49]}
];
export const productInsightOrder:Record<ProductId,readonly string[]>={
corn:['plains-elevation','central-lowland','grain-rivers','corn-pivot-water','interior-rainfall','grain-basin'],
soybean:['grain-rivers','interior-rainfall','grain-basin'],
wheat:['wheat-steppe','great-plains','plains-elevation','interior-rainfall'],
cotton:['cotton-aquifers','cotton-rainfall'],
rice:['rice-alluvial','rice-humid','rice-sacramento-water','sacramento-basin','california-rainfall','rice-mississippi-basin'],
specialty:['valley-landform','valley-water','california-rainfall','san-joaquin-basin'],
beef:['great-plains','beef-feed-water'],dairy:['dairy-processing','valley-water','san-joaquin-basin'],hogs:[],broilers:[],layers:[]
};
export function insightFor(id:string|null){return agricultureInsights.find(x=>x.id===id);}
export function insightLead(item:AgricultureInsight,product:ProductId){
if(item.id==='valley-water')return (product==='dairy'?'カリフォルニアの酪農地域と、飼料生産を含む水利用の背景を見ます。':'カリフォルニアの栽培域と、谷の地下水・河川の位置関係を見ます。')+item.lead;
return productNames[product]+'の分布を重ねています。'+item.lead;
}
export function targetLabel(t:InsightTarget){return t.page==='industry'?'産業 › 食品・乳製品加工':t.env==='water'?'自然環境 › '+(t.waterView==='precipitation'?'降水量':t.waterView==='basins'?'河川の流域':'河川・地下水'):'自然環境 › '+({climate:'気候区分',landform:'地形',contour:'標高'}[t.env??'climate']);}
